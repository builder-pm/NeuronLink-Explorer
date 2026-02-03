import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DataRow, SupabaseCredentials } from '../types';

let supabaseClient: SupabaseClient | null = null;

// DVD Rental tables that were uploaded
const DVD_RENTAL_TABLES = [
    'actor',
    'film',
    'customer',
    'rental',
    'payment',
    'store',
    'staff',
    'inventory',
    'address',
    'city',
    'country',
    'category',
    'language',
    'film_actor',
    'film_category'
];

/**
 * Initialize Supabase client with credentials
 */
export const initSupabase = (credentials: SupabaseCredentials): SupabaseClient => {
    supabaseClient = createClient(credentials.url, credentials.anonKey);
    return supabaseClient;
};

/**
 * Get the current Supabase client
 */
export const getClient = (): SupabaseClient | null => supabaseClient;

/**
 * Test Supabase connection by querying a simple table
 */
export const testConnection = async (credentials: SupabaseCredentials): Promise<{ success: boolean; message: string }> => {
    try {
        const client = createClient(credentials.url, credentials.anonKey);

        // Try to query the actor table (should exist from migration)
        const { data, error } = await client
            .from('actor')
            .select('actor_id')
            .limit(1);

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: `Connection successful! Found ${data?.length ?? 0} test records.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Connection failed' };
    }
};

/**
 * Fetch all DVD rental tables and their data
 */
export const fetchTables = async (credentials: SupabaseCredentials): Promise<{ [key: string]: DataRow[] }> => {
    const client = initSupabase(credentials);
    const tables: { [key: string]: DataRow[] } = {};

    for (const tableName of DVD_RENTAL_TABLES) {
        try {
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .limit(1000); // Limit for performance

            if (!error && data) {
                tables[tableName] = data as DataRow[];
            }
        } catch (e) {
            console.warn(`Failed to fetch table ${tableName}:`, e);
        }
    }

    return tables;
};

/**
 * Discover table schemas from Supabase
 */
export const discoverTables = async (credentials: SupabaseCredentials): Promise<{ name: string; fields: string[] }[]> => {
    const client = initSupabase(credentials);
    const discovered: { name: string; fields: string[] }[] = [];

    for (const tableName of DVD_RENTAL_TABLES) {
        try {
            // Get one row to discover columns
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .limit(1);

            if (!error && data && data.length > 0) {
                const fields = Object.keys(data[0]);
                discovered.push({ name: tableName, fields });
            }
        } catch (e) {
            console.warn(`Failed to discover table ${tableName}:`, e);
        }
    }

    return discovered;
};

/**
 * Execute a SQL query via Supabase RPC (requires a custom function)
 * For now, we fetch data directly from tables
 */
export const executeQuery = async (
    credentials: SupabaseCredentials,
    tableName: string,
    options?: {
        select?: string;
        limit?: number;
        offset?: number;
        filters?: { column: string; operator: string; value: any }[];
    }
): Promise<DataRow[]> => {
    const client = initSupabase(credentials);

    let query = client.from(tableName).select(options?.select || '*');

    if (options?.filters) {
        for (const filter of options.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
        }
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data || []) as unknown as DataRow[];
};

/**
 * Get row count for a table
 */
export const getTableCount = async (credentials: SupabaseCredentials, tableName: string): Promise<number> => {
    const client = initSupabase(credentials);

    const { count, error } = await client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

    if (error) {
        throw new Error(error.message);
    }

    return count || 0;
};
