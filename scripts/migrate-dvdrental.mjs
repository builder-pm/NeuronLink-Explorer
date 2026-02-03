/**
 * Migration script to upload dvdrental.sql to Supabase Postgres
 * 
 * This script handles PostgreSQL dump files with COPY commands by:
 * 1. Executing DDL statements (CREATE TYPE, CREATE TABLE, etc.)
 * 2. Converting COPY commands to INSERT statements
 * 3. Executing constraints and indexes after data load
 */

import pg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const { Client } = pg;

async function runMigration() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Connected successfully!');

        const sqlFilePath = path.join(__dirname, '..', 'dvdrental.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

        // Split by statement terminator, handling multi-line statements
        const lines = sqlContent.split('\n');

        let currentStatement = '';
        let inCopy = false;
        let copyTable = '';
        let copyColumns = '';
        let copyData = [];
        let statementCount = 0;
        let copyCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Handle COPY ... FROM stdin
            if (line.startsWith('COPY ') && line.includes('FROM stdin')) {
                inCopy = true;
                // Parse table and columns from COPY statement
                const match = line.match(/COPY\s+(\S+)\s+\(([^)]+)\)/);
                if (match) {
                    copyTable = match[1];
                    copyColumns = match[2];
                }
                copyData = [];
                continue;
            }

            // Handle end of COPY data
            if (inCopy && line === '\\.') {
                inCopy = false;

                // Process COPY data using pg-copy-streams
                if (copyData.length > 0) {
                    try {
                        const copyStatement = `COPY ${copyTable} (${copyColumns}) FROM STDIN`;
                        const stream = client.query(copyFrom(copyStatement));

                        const dataString = copyData.join('\n') + '\n';

                        await new Promise((resolve, reject) => {
                            stream.on('error', reject);
                            stream.on('finish', resolve);
                            stream.write(dataString);
                            stream.end();
                        });

                        copyCount++;
                        if (copyCount % 5 === 0) {
                            console.log(`Processed ${copyCount} COPY operations...`);
                        }
                    } catch (err) {
                        console.error(`Error copying data to ${copyTable}:`, err.message);
                    }
                }
                continue;
            }

            // Collect COPY data lines
            if (inCopy) {
                copyData.push(line);
                continue;
            }

            // Skip comment lines and empty lines
            if (line.startsWith('--') || line.trim() === '') {
                continue;
            }

            // Skip SET commands that might cause issues
            if (line.startsWith('SET ') || line.startsWith('SELECT pg_catalog')) {
                continue;
            }

            // Accumulate statement
            currentStatement += line + '\n';

            // Execute when statement is complete (ends with ;)
            if (line.trim().endsWith(';')) {
                try {
                    await client.query(currentStatement);
                    statementCount++;
                    if (statementCount % 50 === 0) {
                        console.log(`Executed ${statementCount} statements...`);
                    }
                } catch (err) {
                    // Ignore "already exists" errors
                    if (!err.message.includes('already exists') &&
                        !err.message.includes('does not exist') &&
                        !err.message.includes('duplicate key')) {
                        console.error(`Error executing statement:`, err.message);
                        console.error(`Statement preview: ${currentStatement.substring(0, 100)}...`);
                    }
                }
                currentStatement = '';
            }
        }

        console.log(`\nMigration complete!`);
        console.log(`Total statements executed: ${statementCount}`);
        console.log(`Total COPY operations: ${copyCount}`);

        // Verify by counting rows in a few tables
        console.log('\nVerifying data...');
        const tables = ['actor', 'film', 'customer', 'rental', 'payment'];
        for (const table of tables) {
            try {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`  ${table}: ${result.rows[0].count} rows`);
            } catch (err) {
                console.log(`  ${table}: table not found or error`);
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\nConnection closed.');
    }
}

runMigration();
