import { DataRow, AthenaCredentials, SupabaseCredentials } from '../types';
import { JOBS_DATA, COUNTRIES_DATA, SOURCES_DATA } from '../constants';
import * as supabaseService from './supabase';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simulates testing a connection to Athena.
 * In a real scenario, this would make an API call to verify credentials.
 */
export const testAthenaConnection = async (credentials: AthenaCredentials): Promise<{ success: boolean, message: string }> => {
    await delay(1000); // Simulate network latency

    if (
        !credentials.awsAccessKeyId ||
        !credentials.awsSecretAccessKey ||
        !credentials.awsRegion ||
        !credentials.s3OutputLocation
    ) {
        return { success: false, message: 'All credential fields are required.' };
    }

    if (!credentials.s3OutputLocation.startsWith('s3://')) {
        return { success: false, message: 'S3 Output Location must start with s3://' };
    }

    // Simulate a successful connection
    return { success: true, message: 'Connection successful.' };
};

/**
 * Test Supabase connection
 */
export const testSupabaseConnection = async (credentials: SupabaseCredentials): Promise<{ success: boolean, message: string }> => {
    return supabaseService.testConnection(credentials);
};

/**
 * Fetch tables from Supabase (DVD Rental database)
 */
export const fetchSupabaseTables = async (credentials: SupabaseCredentials): Promise<{ [key: string]: DataRow[] }> => {
    return supabaseService.fetchTables(credentials);
};

/**
 * Discover Supabase table schemas
 */
export const discoverSupabaseTables = async (credentials: SupabaseCredentials): Promise<{ name: string; fields: string[] }[]> => {
    return supabaseService.discoverTables(credentials);
};

/**
 * Simulates fetching tables from the Lakehouse.
 * In a real app, this would trigger Athena queries like 'SELECT * FROM jobs_table'.
 * Here, we just return the constant data.
 */
export const fetchLakehouseTables = async (credentials: AthenaCredentials): Promise<{ [key: string]: DataRow[] }> => {
    await delay(1500); // Simulate data fetching latency

    // Check credentials again as a safeguard
    if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
        throw new Error("Authentication failed");
    }

    // Return the mock data as if it came from the lakehouse
    return {
        jobs: JOBS_DATA,
        countries: COUNTRIES_DATA,
        sources: SOURCES_DATA,
    };
};
