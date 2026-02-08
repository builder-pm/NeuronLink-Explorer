-- DVD Rental Semantic Metadata + Extraction RPC
-- Run this in Supabase to provide context for the AI Assistant

-- 1. Metadata Comments
COMMENT ON TABLE actor IS 'List of actors involved in the films.';
COMMENT ON COLUMN actor.actor_id IS 'Unique identifier for each actor.';
COMMENT ON COLUMN actor.first_name IS 'First name of the actor.';
COMMENT ON COLUMN actor.last_name IS 'Last name of the actor.';

COMMENT ON TABLE category IS 'Categories or genres of films (e.g., Action, Comedy, Sci-Fi).';
COMMENT ON COLUMN category.name IS 'The name of the category.';

COMMENT ON TABLE film IS 'Comprehensive list of films available for rent.';
COMMENT ON COLUMN film.title IS 'The title of the film.';
COMMENT ON COLUMN film.description IS 'A brief summary of the film plot.';
COMMENT ON COLUMN film.release_year IS 'The year the film was released.';
COMMENT ON COLUMN film.rental_duration IS 'The allowed length of rental in days.';
COMMENT ON COLUMN film.rental_rate IS 'The cost to rent the film for the rental duration.';
COMMENT ON COLUMN film.replacement_cost IS 'The amount charged if the film is lost or damaged.';
COMMENT ON COLUMN film.rating IS 'The MPAA rating of the film (G, PG, PG-13, R, NC-17).';
COMMENT ON COLUMN film.special_features IS 'Extra features available on the DVD (e.g., Deleted Scenes, Trailers).';

COMMENT ON TABLE customer IS 'Registered customers who rent films.';
COMMENT ON COLUMN customer.first_name IS 'First name of the customer.';
COMMENT ON COLUMN customer.last_name IS 'Last name of the customer.';
COMMENT ON COLUMN customer.email IS 'Email address used for communication and receipts.';
COMMENT ON COLUMN customer.activebool IS 'Whether the customer is currently active.';
COMMENT ON COLUMN customer.create_date IS 'The date the customer record was created.';

-- 2. Schema Extraction RPC
-- This bypasses OpenAPI restrictions and fetches metadata directly via SQL
CREATE OR REPLACE FUNCTION get_schema_metadata()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(table_info)
    FROM (
        SELECT 
            t.table_name as name,
            pg_catalog.obj_description(c.oid, 'pg_class') as description,
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', col.column_name,
                        'type', col.data_type,
                        'description', pg_catalog.col_description(c.oid, col.ordinal_position::int)
                    )
                )
                FROM information_schema.columns col
                WHERE col.table_name = t.table_name 
                AND col.table_schema = 'public'
            ) as columns
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    ) table_info INTO result;
    
    RETURN result;
END;
$$;

-- Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_schema_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION get_schema_metadata() TO anon;