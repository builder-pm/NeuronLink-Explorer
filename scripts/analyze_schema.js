// Schema Analyzer for Supabase PostgreSQL
// Run with: node scripts/analyze_schema.js

const { Client } = require('pg');

const connectionString = "postgresql://postgres:Pr0@Supabase@db.eeagdzfpdgteuujdcfwu.supabase.co:5432/postgres";

async function analyzeSchema() {
    const client = new Client({ connectionString });

    try {
        console.log('🔌 Connecting to Supabase PostgreSQL...');
        await client.connect();
        console.log('✅ Connected!\n');

        // 1. Get all tables in public schema
        console.log('📋 TABLES IN PUBLIC SCHEMA:\n');
        console.log('='.repeat(80));

        const tablesQuery = `
      SELECT 
        table_name,
        (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
        const tablesResult = await client.query(tablesQuery);

        console.log(`Found ${tablesResult.rows.length} tables:\n`);
        tablesResult.rows.forEach(row => {
            console.log(`  📁 ${row.table_name} (${row.column_count} columns)`);
        });

        // 2. Get detailed column info for each table
        console.log('\n\n📊 DETAILED TABLE STRUCTURES:\n');
        console.log('='.repeat(80));

        for (const table of tablesResult.rows) {
            console.log(`\n\n📁 TABLE: ${table.table_name}`);
            console.log('-'.repeat(60));

            const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `;
            const columnsResult = await client.query(columnsQuery, [table.table_name]);

            columnsResult.rows.forEach(col => {
                let typeStr = col.data_type;
                if (col.character_maximum_length) {
                    typeStr += `(${col.character_maximum_length})`;
                }
                if (col.udt_name && col.udt_name !== col.data_type) {
                    typeStr = col.udt_name;
                }

                const nullable = col.is_nullable === 'YES' ? '?' : '!';
                const defaultVal = col.column_default ? ` = ${col.column_default.substring(0, 30)}...` : '';

                console.log(`    ${col.column_name.padEnd(30)} ${typeStr.padEnd(20)} ${nullable}${defaultVal}`);
            });

            // Get primary keys
            const pkQuery = `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass
        AND i.indisprimary;
      `;
            try {
                const pkResult = await client.query(pkQuery, [`public.${table.table_name}`]);
                if (pkResult.rows.length > 0) {
                    console.log(`    🔑 PRIMARY KEY: ${pkResult.rows.map(r => r.attname).join(', ')}`);
                }
            } catch (e) {
                // Skip PK info if error
            }

            // Get foreign keys
            const fkQuery = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public';
      `;
            const fkResult = await client.query(fkQuery, [table.table_name]);
            if (fkResult.rows.length > 0) {
                console.log(`    🔗 FOREIGN KEYS:`);
                fkResult.rows.forEach(fk => {
                    console.log(`       ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
                });
            }

            // Get row count estimate
            const countQuery = `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1;`;
            try {
                const countResult = await client.query(countQuery, [table.table_name]);
                if (countResult.rows[0]) {
                    console.log(`    📈 ESTIMATED ROWS: ~${countResult.rows[0].estimate}`);
                }
            } catch (e) {
                // Skip count if error
            }
        }

        // 3. Get views
        console.log('\n\n👁️ VIEWS IN PUBLIC SCHEMA:\n');
        console.log('='.repeat(80));

        const viewsQuery = `
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
        const viewsResult = await client.query(viewsQuery);

        if (viewsResult.rows.length === 0) {
            console.log('  No views found.');
        } else {
            viewsResult.rows.forEach(view => {
                console.log(`\n  👁️ ${view.table_name}`);
            });
        }

        // 4. Get indexes
        console.log('\n\n🔍 INDEXES:\n');
        console.log('='.repeat(80));

        const indexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
        const indexResult = await client.query(indexQuery);

        let currentTable = '';
        indexResult.rows.forEach(idx => {
            if (idx.tablename !== currentTable) {
                currentTable = idx.tablename;
                console.log(`\n  📁 ${currentTable}`);
            }
            console.log(`     - ${idx.indexname}`);
        });

        // 5. Check for RLS policies
        console.log('\n\n🔒 ROW LEVEL SECURITY (RLS) STATUS:\n');
        console.log('='.repeat(80));

        const rlsQuery = `
      SELECT 
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      ORDER BY c.relname;
    `;
        const rlsResult = await client.query(rlsQuery);

        rlsResult.rows.forEach(row => {
            const status = row.rls_enabled ? '🔒 RLS ENABLED' : '🔓 RLS DISABLED';
            console.log(`  ${row.table_name.padEnd(30)} ${status}`);
        });

        console.log('\n\n✅ Schema analysis complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

analyzeSchema();
