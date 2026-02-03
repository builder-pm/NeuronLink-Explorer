import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth and Logging will be disabled.');
}

// Create a single supabase client for interacting with the main backend (user_events, auth)
// This is separate from the "Data Source" client which might connect to a user-provided database.
export const appSupabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

// Helper to check if we have a valid configuration
export const isAppSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;
