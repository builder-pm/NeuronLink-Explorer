-- =====================================================================================
-- 📊 NEURONLINK LAKEHOUSE - SCHEMA INSPECTION QUERY
-- =====================================================================================
-- Run this query in the Supabase SQL Editor to get a complete report of your database schema.
-- It includes:
-- 1. Tables and Columns
-- 2. Data Types and Nullability
-- 3. Primary and Foreign Keys
-- 4. Descriptions (Comments)
-- =====================================================================================

WITH 
-- 1. Get Primary Keys
pk_info AS (
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
),

-- 2. Get Foreign Keys
fk_info AS (
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
),

-- 3. Get Column Descriptions (Comments)
col_descriptions AS (
    SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        pgd.description
    FROM information_schema.columns c
    JOIN pg_catalog.pg_statio_all_tables st
      ON c.table_schema = st.schemaname AND c.table_name = st.relname
    LEFT JOIN pg_catalog.pg_description pgd
      ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
)

-- 4. Combine Everything
SELECT
    t.table_schema as "Schema",
    t.table_name as "Table",
    c.column_name as "Column",
    
    -- Format Type
    CASE 
        WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name 
        WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
        ELSE c.data_type 
    END as "Type",
    
    -- Nullable?
    CASE WHEN c.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as "Nullable",
    
    -- Default Value
    COALESCE(c.column_default, '') as "Default",
    
    -- Constraints
    CASE 
        WHEN pk.column_name IS NOT NULL THEN '🔑 PK' 
        WHEN fk.column_name IS NOT NULL THEN '🔗 FK -> ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE '' 
    END as "Constraints",
    
    -- Description
    COALESCE(cd.description, '') as "Description"

FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
LEFT JOIN pk_info pk 
    ON t.table_schema = pk.table_schema AND t.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN fk_info fk 
    ON t.table_schema = fk.table_schema AND t.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN col_descriptions cd 
    ON t.table_schema = cd.table_schema AND t.table_name = cd.table_name AND c.column_name = cd.column_name

WHERE t.table_schema IN ('public', 'neuronlink_analytics')
AND t.table_type = 'BASE TABLE'

ORDER BY 
    t.table_schema,
    t.table_name, 
    c.ordinal_position;
