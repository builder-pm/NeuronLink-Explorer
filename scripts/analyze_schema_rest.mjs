// Schema Analyzer using Supabase REST API with Service Role Key
// Run with: node scripts/analyze_schema_rest.mjs

const SUPABASE_URL = 'https://eeagdzfpdgteuujdcfwu.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_L_hFcHlFzwso-Vxj8XwrxQ_D7zE4YaT';

async function analyzeSchema() {
    console.log('🔌 Connecting to Supabase via REST API...');
    console.log(`   URL: ${SUPABASE_URL}\n`);

    // Known tables from the DVD Rental sample dataset + app tables
    const knownTables = [
        // DVD Rental Dataset tables
        'actor', 'address', 'category', 'city', 'country',
        'customer', 'film', 'film_actor', 'film_category',
        'inventory', 'language', 'payment', 'rental', 'staff', 'store',
        // App-specific tables
        'users', 'profiles', 'configurations', 'user_logs',
        'analysis_sessions', 'query_history', 'saved_queries',
        // Metrics tables (from migrations)
        'query_metrics', 'session_metrics', 'performance_logs',
        'user_activity', 'feature_usage'
    ];

    console.log('📊 Checking tables via REST API...\n');
    console.log('='.repeat(80));

    const foundTables = [];

    for (const table of knownTables) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });

            if (response.ok) {
                const count = response.headers.get('content-range');
                const data = await response.json();
                const columns = data.length > 0 ? Object.keys(data[0]) : [];
                foundTables.push({ name: table, count, columns, sample: data[0] });
                console.log(`  ✅ ${table.padEnd(25)} ${count || 'exists'}`);
            } else if (response.status === 404) {
                // Table doesn't exist - skip silently
            } else if (response.status === 401) {
                console.log(`  🔒 ${table.padEnd(25)} Auth required`);
            } else {
                console.log(`  ⚠️  ${table.padEnd(25)} Status: ${response.status}`);
            }
        } catch (e) {
            console.log(`  ❌ ${table.padEnd(25)} Error: ${e.message}`);
        }
    }

    // Now get detailed schema for found tables
    console.log('\n\n📋 DETAILED TABLE STRUCTURES:\n');
    console.log('='.repeat(80));

    for (const table of foundTables) {
        console.log(`\n📁 TABLE: ${table.name}`);
        console.log(`   Row Count: ${table.count || 'unknown'}`);
        console.log('-'.repeat(60));

        if (table.columns.length > 0) {
            console.log('   Columns:');
            table.columns.forEach(col => {
                const sampleValue = table.sample ? table.sample[col] : null;
                const type = sampleValue === null ? 'unknown' : typeof sampleValue;
                console.log(`     - ${col.padEnd(30)} (${type})`);
            });
        }

        // Try to get more rows to infer types
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?limit=5`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                }
            });

            if (response.ok) {
                const rows = await response.json();
                if (rows.length > 0) {
                    // Infer column types from multiple rows
                    const columnTypes = {};
                    for (const col of Object.keys(rows[0])) {
                        const values = rows.map(r => r[col]).filter(v => v !== null);
                        if (values.length > 0) {
                            const sample = values[0];
                            if (typeof sample === 'number') {
                                columnTypes[col] = Number.isInteger(sample) ? 'integer' : 'numeric';
                            } else if (typeof sample === 'boolean') {
                                columnTypes[col] = 'boolean';
                            } else if (typeof sample === 'string') {
                                if (/^\d{4}-\d{2}-\d{2}/.test(sample)) {
                                    columnTypes[col] = 'timestamp';
                                } else if (sample.length > 100) {
                                    columnTypes[col] = 'text';
                                } else {
                                    columnTypes[col] = 'varchar';
                                }
                            } else if (Array.isArray(sample)) {
                                columnTypes[col] = 'array';
                            } else if (typeof sample === 'object') {
                                columnTypes[col] = 'jsonb';
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Skip detailed analysis
        }
    }

    console.log('\n\n✅ Schema analysis complete!');
    console.log(`   Found ${foundTables.length} accessible tables.`);
}

analyzeSchema();
