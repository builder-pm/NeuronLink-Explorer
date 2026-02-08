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

const DVD_RENTAL_PK_FK: Record<string, { pk: string[], fk: Record<string, { table: string, column: string }> }> = {
  'actor': { pk: ['actor_id'], fk: {} },
  'address': { pk: ['address_id'], fk: { 'city_id': { table: 'city', column: 'city_id' } } },
  'category': { pk: ['category_id'], fk: {} },
  'city': { pk: ['city_id'], fk: { 'country_id': { table: 'country', column: 'country_id' } } },
  'country': { pk: ['country_id'], fk: {} },
  'customer': { pk: ['customer_id'], fk: { 'address_id': { table: 'address', column: 'address_id' }, 'store_id': { table: 'store', column: 'store_id' } } },
  'film': { pk: ['film_id'], fk: { 'language_id': { table: 'language', column: 'language_id' } } },
  'film_actor': { pk: ['actor_id', 'film_id'], fk: { 'actor_id': { table: 'actor', column: 'actor_id' }, 'film_id': { table: 'film', column: 'film_id' } } },
  'film_category': { pk: ['film_id', 'category_id'], fk: { 'film_id': { table: 'film', column: 'film_id' }, 'category_id': { table: 'category', column: 'category_id' } } },
  'inventory': { pk: ['inventory_id'], fk: { 'film_id': { table: 'film', column: 'film_id' }, 'store_id': { table: 'store', column: 'store_id' } } },
  'language': { pk: ['language_id'], fk: {} },
  'payment': { pk: ['payment_id'], fk: { 'customer_id': { table: 'customer', column: 'customer_id' }, 'staff_id': { table: 'staff', column: 'staff_id' }, 'rental_id': { table: 'rental', column: 'rental_id' } } },
  'rental': { pk: ['rental_id'], fk: { 'inventory_id': { table: 'inventory', column: 'inventory_id' }, 'customer_id': { table: 'customer', column: 'customer_id' }, 'staff_id': { table: 'staff', column: 'staff_id' } } },
  'staff': { pk: ['staff_id'], fk: { 'address_id': { table: 'address', column: 'address_id' }, 'store_id': { table: 'store', column: 'store_id' } } },
  'store': { pk: ['store_id'], fk: { 'manager_staff_id': { table: 'staff', column: 'staff_id' }, 'address_id': { table: 'address', column: 'address_id' } } }
};

/**
 * Extracts schema information from a PostgREST/Supabase OpenAPI endpoint.
 */
export async function extractSchema(url: string, anonKey: string): Promise<RegisteredTable[]> {
  // 1. Try RPC method first (most reliable for metadata)
  try {
    const rpcUrl = `${url.replace(/\/$/, '')}/rest/v1/rpc/get_schema_metadata`;
    const rpcResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (rpcResponse.ok) {
      const data = await rpcResponse.json();
      if (Array.isArray(data)) {
        return data.map((t: any) => ({
          ...t,
          columns: (t.columns || []).map((c: any) => ({
            ...c,
            isPrimary: c.name.toLowerCase().includes('id') // Basic heuristic for RPC fallback
          }))
        }));
      }
    }
  } catch (rpcError) {
    console.warn('RPC metadata extraction failed, falling back to OpenAPI:', rpcError);
  }

  // 2. Fallback to OpenAPI spec
  let restUrl = url;
  if (!url.includes('/rest/v1')) {
    restUrl = url.replace(/\/$/, '') + '/rest/v1/';
  }

  try {
    const response = await fetch(restUrl, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Unauthorized to fetch OpenAPI spec (${response.status}). Falling back to basic discovery.`);
      return getBasicDiscoveryFallback();
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
  } catch (e) {
    console.warn('Extraction failed, using basic discovery fallback.', e);
    return getBasicDiscoveryFallback();
  }
}

/**
 * Basic discovery fallback when API endpoint is restricted.
 * Uses hardcoded DVD rental schema metadata.
 */
function getBasicDiscoveryFallback(): RegisteredTable[] {
  return Object.entries(DVD_RENTAL_PK_FK).map(([name, meta]) => {
    // Generate dummy columns based on keys, others will be filled by app state discovery
    const columns: RegisteredColumn[] = [
      ...meta.pk.map(pkCol => ({ name: pkCol, type: 'integer', isPrimary: true })),
      ...Object.entries(meta.fk).map(([col, fk]) => ({ name: col, type: 'integer', isPrimary: false, foreignKey: fk }))
    ];

    return {
      name,
      columns,
      description: DVD_RENTAL_DESCRIPTIONS[name]
    };
  });
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
    .schema('public')
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
  
  if (currentTables.length === 0) {
    console.warn('Schema Registry: No tables extracted from source. Skipping upsert to avoid overwriting with empty data.');
    return {
      data: existingEntry ? { 
        dbUrlHash, 
        tables: existingEntry.tables_data, 
        schemaHash: existingEntry.schema_hash, 
        lastSyncedAt: existingEntry.last_synced_at 
      } : { dbUrlHash, tables: [], schemaHash: '', lastSyncedAt: '' },
      driftDetected: false
    };
  }

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
    // New registry: Use hardcoded dvdrental descriptions if available, otherwise generate via AI
    finalTables = currentTables.map(t => ({
      ...t,
      description: t.description || DVD_RENTAL_DESCRIPTIONS[t.name.toLowerCase()]
    }));

    const tableNamesWithNoDesc = finalTables
      .filter(t => !t.description)
      .map(t => t.name);

    if (tableNamesWithNoDesc.length > 0) {
      const aiDescriptions = await gemini.generateTableDescriptions(tableNamesWithNoDesc);
      finalTables = finalTables.map(t => ({
        ...t,
        description: t.description || aiDescriptions[t.name]
      }));
    }
  }

  // 3. Persist to App Database
  const registryEntry: SchemaRegistryEntry = {
    dbUrlHash,
    tables: finalTables,
    schemaHash: currentSchemaHash,
    lastSyncedAt: new Date().toISOString()
  };

  const { error: upsertError } = await appSupabase
    .schema('public')
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
    .schema('public')
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
    .schema('public')
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
