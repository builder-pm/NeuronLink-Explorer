-- Create schema_registry table
CREATE TABLE IF NOT EXISTS public.schema_registry (
    db_url_hash TEXT PRIMARY KEY,
    tables_data JSONB NOT NULL,
    schema_hash TEXT NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.schema_registry ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read schema registry"
ON public.schema_registry
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert/update schema registry"
ON public.schema_registry
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.schema_registry IS 'Stores database metadata and descriptions indexed by DB URL hash.';
COMMENT ON COLUMN public.schema_registry.db_url_hash IS 'SHA-256 hash of the normalized database URL.';
COMMENT ON COLUMN public.schema_registry.tables_data IS 'JSONB array of RegisteredTable objects containing columns, PK/FK, and descriptions.';
COMMENT ON COLUMN public.schema_registry.schema_hash IS 'Hash of the tables structure to detect schema drift.';
