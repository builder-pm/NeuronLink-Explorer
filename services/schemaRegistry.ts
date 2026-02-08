import { RegisteredTable, RegisteredColumn, SupabaseCredentials, SchemaRegistryEntry } from '../types';
import { appSupabase } from './appSupabase';
import * as gemini from './gemini';

/**
 * Extracts schema information from a PostgREST/Supabase OpenAPI endpoint.
 */
export async function extractSchema(url: string, anonKey: string): Promise<RegisteredTable[]> {
  // Ensure the URL points to the REST endpoint
  // If URL is just the base Supabase URL, append /rest/v1/
  let restUrl = url;
  if (!url.includes('/rest/v1')) {
    restUrl = url.replace(/\/$/, '') + '/rest/v1/';
  }

  const response = await fetch(restUrl, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
  }

  const spec = await response.json();
  const definitions = spec.definitions || {};
  const tables: RegisteredTable[] = [];

  for (const [tableName, definition] of Object.entries<any>(definitions)) {
    // Skip internal PostgREST definitions if any
    if (tableName.startsWith('_')) continue;

    const properties = definition.properties || {};
    const columns: RegisteredColumn[] = [];

    for (const [colName, colDef] of Object.entries<any>(properties)) {
      const description = colDef.description || '';
      
      // Parse PK/FK from PostgREST description tags
      const isPrimary = description.includes('<pk/>');
      
      let foreignKey;
      // Handle both single and double quotes, and optional spaces
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
        foreignKey
      });
    }

    tables.push({
      name: tableName,
      columns,
      description: (definition.description || '').split('<')[0].trim() || undefined // Strip tags from description
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

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found"
    console.error('Error fetching schema registry:', fetchError);
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
