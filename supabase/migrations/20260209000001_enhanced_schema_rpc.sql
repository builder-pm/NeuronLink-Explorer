-- =============================================================================
-- Enhanced Schema Metadata RPC Function
-- =============================================================================
-- This function extracts comprehensive schema metadata including:
-- - Table descriptions
-- - Column descriptions with semantic type parsing
-- - Primary key detection
-- - Foreign key relationships
--
-- Execute this in your Supabase SQL Editor.
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_schema_metadata();

-- Create enhanced function
CREATE OR REPLACE FUNCTION get_schema_metadata()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(table_info ORDER BY table_info->>'name')
    FROM (
        SELECT jsonb_build_object(
            'name', t.table_name,
            'description', COALESCE(
                -- Extract description without semantic tags
                regexp_replace(
                    pg_catalog.obj_description(c.oid, 'pg_class'),
                    '\[semantic:[^\]]+\]',
                    '',
                    'g'
                ),
                ''
            ),
            'columns', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', col.column_name,
                        'type', col.data_type,
                        'description', COALESCE(
                            -- Extract description without tags
                            regexp_replace(
                                regexp_replace(
                                    pg_catalog.col_description(c.oid, col.ordinal_position::int),
                                    '\[semantic:[^\]]+\]',
                                    '',
                                    'g'
                                ),
                                '\[fk:[^\]]+\]',
                                '',
                                'g'
                            ),
                            ''
                        ),
                        'semanticType', (
                            -- Extract semantic type from [semantic:XXX] tag
                            SELECT (regexp_matches(
                                pg_catalog.col_description(c.oid, col.ordinal_position::int),
                                '\[semantic:([^\]]+)\]'
                            ))[1]
                        ),
                        'isPrimary', (
                            -- Check if column is part of primary key
                            EXISTS (
                                SELECT 1
                                FROM information_schema.table_constraints tc
                                JOIN information_schema.key_column_usage kcu
                                    ON tc.constraint_name = kcu.constraint_name
                                    AND tc.table_schema = kcu.table_schema
                                WHERE tc.constraint_type = 'PRIMARY KEY'
                                AND tc.table_schema = 'public'
                                AND tc.table_name = t.table_name
                                AND kcu.column_name = col.column_name
                            )
                        ),
                        'foreignKey', (
                            -- Get foreign key relationship if exists
                            SELECT jsonb_build_object(
                                'table', ccu.table_name,
                                'column', ccu.column_name
                            )
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            JOIN information_schema.constraint_column_usage ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                            AND tc.table_schema = 'public'
                            AND tc.table_name = t.table_name
                            AND kcu.column_name = col.column_name
                            LIMIT 1
                        )
                    )
                    ORDER BY col.ordinal_position
                )
                FROM information_schema.columns col
                WHERE col.table_name = t.table_name
                AND col.table_schema = 'public'
            )
        ) as table_info
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        -- Exclude internal/system tables
        AND t.table_name NOT LIKE 'pg_%'
        AND t.table_name NOT LIKE '_prisma%'
        AND t.table_name NOT IN ('schema_migrations', 'schema_registry', 'configurations')
    ) sub INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_schema_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION get_schema_metadata() TO anon;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this to test the function:
-- SELECT get_schema_metadata();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
