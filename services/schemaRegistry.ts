import { RegisteredTable, RegisteredColumn, SupabaseCredentials, SchemaRegistryEntry } from '../types';
import { appSupabase } from './appSupabase';
import * as gemini from './gemini';

const DVD_RENTAL_DESCRIPTIONS: Record<string, string> = {
  'actor': 'Information about film actors including first and last names.',
  'address': 'Physical addresses for customers, staff, and stores.',
  'category': 'Genres for films (e.g., Action, Animation, etc.).',
  'city': 'List of cities linked to countries for address localization.',
  'country': 'List of countries.',
  'customer': 'Customer profiles including contact info and active status.',
  'film': 'Detailed movie data including title, release year, and rates.',
  'film_actor': 'Mapping table connecting films to the actors that appear in them.',
  'film_category': 'Mapping table connecting films to their genres/categories.',
  'inventory': 'Tracks which films are available at which store.',
  'language': 'Languages available for film audio and subtitles.',
  'payment': 'Records of customer transactions for rentals.',
  'rental': 'Records of individual rental transactions, tracking return dates.',
  'staff': 'Employee information for the rental stores.',
  'store': 'Physical rental store locations and management.'
};

/**
 * Extracts schema information from a PostgREST/Supabase OpenAPI endpoint.
 */
export async function extractSchema(url: string, anonKey: string): Promise<RegisteredTable[]> {
  // ... existing code ...
  let restUrl = url;
  if (!url.includes('/rest/v1')) {
    restUrl = url.replace(/\/$/, '') + '/rest/v1/';
  }

  const response = await fetch(restUrl, {
    headers: {
      'apikey': anonKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.warn('Unauthorized to fetch OpenAPI spec. Falling back to basic discovery.');
      // If unauthorized, return empty array rather than throwing
      // This allows the app to continue with just table names
      return [];
    }
    if (response.status === 406) {
      throw new Error(`Not Acceptable (406): Ensure the database schema is correctly configured and the registry table exists.`);
    }
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText} (${response.status})`);
  }

  const spec = await response.json();
  const definitions = spec.definitions || {};
  const tables: RegisteredTable[] = [];

  for (const [tableName, definition] of Object.entries<any>(definitions)) {
    if (tableName.startsWith('_')) continue;

    const properties = definition.properties || {};
    const columns: RegisteredColumn[] = [];

    for (const [colName, colDef] of Object.entries<any>(properties)) {
      const description = colDef.description || '';
      
      const isPrimary = description.includes('<pk/>') || 
                        colName.toLowerCase() === 'id' || 
                        colName.toLowerCase() === `${tableName.toLowerCase()}_id` ||
                        (tableName.toLowerCase().endsWith('s') && colName.toLowerCase() === `${tableName.toLowerCase().slice(0, -1)}_id`);
      
      let foreignKey;
      const fkMatch = description.match(/<fk table=['"]([^'"]+)['"] column=['"]([^'"]+)['"]\s*\/>/i);
      
      if (fkMatch) {
        foreignKey = {
          table: fkMatch[1],
          column: fkMatch[2]
        };
      }

      columns.push({
        name: colName,
        type: colDef.format || colDef.type || 'text',
        isPrimary,
        description: description.split('<')[0].trim(),
        foreignKey
      });
    }

    tables.push({
      name: tableName,
      columns,
      description: (definition.description || '').split('<')[0].trim() || DVD_RENTAL_DESCRIPTIONS[tableName.toLowerCase()]
    });
  }

  return tables;
}

/**
 * Generates a SHA-256 hash of the normalized DB URL.
 */
export async function hashDbUrl(url: string): Promise<string> {
  const normalized = url.replace(/\/$/, '').toLowerCase();
  const msgUint8 = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a hash of the schema structure for drift detection.
 */
export function hashSchema(tables: RegisteredTable[]): string {
  // Create a stable representation for hashing
  const schemaStr = JSON.stringify(tables.map(t => ({
    n: t.name,
    c: t.columns.map(c => ({ n: c.name, t: c.type, p: c.isPrimary, f: c.foreignKey }))
  })).sort((a, b) => a.n.localeCompare(b.n)));
  
  // Simple hash for drift detection
  let hash = 0;
  for (let i = 0; i < schemaStr.length; i++) {
    const char = schemaStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(16);
}

/**
 * Syncs the schema registry for a database connection.
 * Detects drift, generates missing descriptions via AI, and persists metadata.
 */
export async function syncSchemaRegistry(credentials: SupabaseCredentials): Promise<{ 
  data: SchemaRegistryEntry; 
  driftDetected: boolean;
}> {
  const dbUrlHash = await hashDbUrl(credentials.url);
  
  // 1. Fetch current registry from App Database
  const { data: existingEntry, error: fetchError } = await appSupabase
    .from('schema_registry')
    .select('*')
    .eq('db_url_hash', dbUrlHash)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST205' || fetchError.code === '42P01' || fetchError.status === 404) {
      console.warn('Schema registry table not found or inaccessible. Please run the migration SQL and Reload PostgREST in Supabase settings.');
      // Return early with extracted schema but no persistence
      const tables = await extractSchema(credentials.url, credentials.anonKey);
      return {
        data: { dbUrlHash, tables, schemaHash: '', lastSyncedAt: '' },
        driftDetected: false
      };
    }
    if (fetchError.code !== 'PGRST116') {
      console.error('Error fetching schema registry:', fetchError);
    }
  }

  // 2. Extract current schema from Data Source
  const currentTables = await extractSchema(credentials.url, credentials.anonKey);
  const currentSchemaHash = hashSchema(currentTables);

  let finalTables = currentTables;
  let driftDetected = false;

  if (existingEntry) {
    const previousSchemaHash = existingEntry.schema_hash;
    driftDetected = previousSchemaHash !== currentSchemaHash;

    // Merge logic: Preserve existing descriptions from DB
    const existingTables: RegisteredTable[] = existingEntry.tables_data;
    const descriptionMap = new Map<string, string>();
    existingTables.forEach(t => {
      if (t.description) descriptionMap.set(t.name, t.description);
    });

    finalTables = currentTables.map(t => ({
      ...t,
      description: t.description || descriptionMap.get(t.name)
    }));
  } else {
    // New registry: Generate AI descriptions
    const tableNames = currentTables.map(t => t.name);
    const aiDescriptions = await gemini.generateTableDescriptions(tableNames);
    
    finalTables = currentTables.map(t => ({
      ...t,
      description: t.description || aiDescriptions[t.name]
    }));
  }

  // 3. Persist to App Database
  const registryEntry: SchemaRegistryEntry = {
    dbUrlHash,
    tables: finalTables,
    schemaHash: currentSchemaHash,
    lastSyncedAt: new Date().toISOString()
  };

  const { error: upsertError } = await appSupabase
    .from('schema_registry')
    .upsert({
      db_url_hash: dbUrlHash,
      tables_data: finalTables,
      schema_hash: currentSchemaHash,
      last_synced_at: registryEntry.lastSyncedAt
    });

  if (upsertError) {
    console.error('Error upserting schema registry:', upsertError);
  }

  return {
    data: registryEntry,
    driftDetected
  };
}

/**
 * Updates a table description in the schema registry.
 */
export async function updateTableDescription(
  dbUrlHash: string,
  tableName: string,
  newDescription: string
): Promise<void> {
  // 1. Fetch current registry
  const { data: existingEntry, error: fetchError } = await appSupabase
    .from('schema_registry')
    .select('*')
    .eq('db_url_hash', dbUrlHash)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch schema registry: ${fetchError.message}`);
  }

  const tables: RegisteredTable[] = existingEntry.tables_data;
  const updatedTables = tables.map(t => 
    t.name === tableName ? { ...t, description: newDescription } : t
  );

  // 2. Update in App Database
  const { error: updateError } = await appSupabase
    .from('schema_registry')
    .update({ 
      tables_data: updatedTables,
      last_synced_at: new Date().toISOString()
    })
    .eq('db_url_hash', dbUrlHash);

  if (updateError) {
    throw new Error(`Failed to update table description: ${updateError.message}`);
  }
}
