import { DataRow } from '../types';
import { JOBS_DATA, COUNTRIES_DATA, SOURCES_DATA } from '../constants';
// @ts-ignore
import initSqlJs from 'sql.js';

let db: any = null;

export const init = async (empty = false) => {
    const SQL = await initSqlJs({
        locateFile: (file: string) => `https://esm.sh/sql.js@1.10.3/dist/${file}`
    });
    
    // If db already exists and we want an empty one, we should probably close/clear it
    if (db && empty) {
        db.close();
        db = new SQL.Database();
    } else if (!db) {
        db = new SQL.Database();
    }
    
    // Create tables with initial data only if not in empty mode
    if (!empty) {
        // Clear any existing tables just in case
        const existingTablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (existingTablesResult.length > 0 && existingTablesResult[0].values.length > 0) {
            existingTablesResult[0].values.forEach((row: any) => {
                db.run(`DROP TABLE IF EXISTS "${row[0]}"`);
            });
        }
        createTable('jobs', JOBS_DATA);
        createTable('countries', COUNTRIES_DATA);
        createTable('sources', SOURCES_DATA);
    } else if (empty) {
        // Ensure it's truly empty
        const existingTablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (existingTablesResult.length > 0 && existingTablesResult[0].values.length > 0) {
            existingTablesResult[0].values.forEach((row: any) => {
                db.run(`DROP TABLE IF EXISTS "${row[0]}"`);
            });
        }
    }
};

export const resetAndLoadData = async (tables: { [tableName: string]: DataRow[] }) => {
    if (!db) {
        // Initialize an empty DB if it doesn't exist
        await init(true);
    }
    // Drop all existing tables
    const existingTablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    if (existingTablesResult.length > 0 && existingTablesResult[0].values.length > 0) {
        existingTablesResult[0].values.forEach((row: any) => {
            db.run(`DROP TABLE IF EXISTS ${row[0]}`);
        });
    }

    // Create new tables from provided data
    for (const tableName in tables) {
        if (tables[tableName].length > 0) {
            createTable(tableName, tables[tableName]);
        }
    }
};


const createTable = (tableName: string, data: DataRow[]) => {
    if (data.length === 0) return;
    const columns = Object.keys(data[0]);
    // Sanitize column names to be safe for SQL
    const sanitizedColumns = columns.map(col => `"${col.replace(/"/g, '""')}"`);
    const columnDefs = sanitizedColumns.map(col => `${col} TEXT`).join(', ');
    
    db.run(`CREATE TABLE "${tableName}" (${columnDefs});`);

    const stmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${columns.map(() => '?').join(',')})`);
    data.forEach(row => {
        const rowValues = columns.map(col => {
            const value = row[col];
            // Handle null/undefined explicitly for SQLite
            return value === null || value === undefined ? null : value;
        });
        stmt.run(rowValues);
    });
    stmt.free();
};

export const executeQuery = async (query: string): Promise<DataRow[]> => {
    if (!db) {
        throw new Error("Database not initialized.");
    }
    if (!query || query.trim() === '') {
        return [];
    }
    try {
        const results = db.exec(query);
        if (results.length === 0) {
            return [];
        }
        
        // Convert SQL.js output to a more usable format
        const { columns, values } = results[0];
        return values.map((row: any) => {
            const rowObject: DataRow = {};
            columns.forEach((col: string, i: number) => {
                rowObject[col] = row[i];
            });
            return rowObject;
        });
    } catch (e) {
        console.error(`Error executing query: ${query}`, e);
        throw e; // re-throw to be caught by the caller
    }
};

export const discoverTables = async (): Promise<{ name: string; fields: string[] }[]> => {
    if (!db) throw new Error("Database not initialized.");

    const tablesResult = await executeQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");

    const schemaPromises = tablesResult.map(async (table: any) => {
        const tableName = table.name as string;
        const fieldsResult = await executeQuery(`PRAGMA table_info("${tableName}");`);
        const fields = fieldsResult.map((field: any) => field.name as string);
        return { name: tableName, fields };
    });

    return Promise.all(schemaPromises);
};

/**
 * Fetches up to 50 distinct non-null sample values for a specific field.
 */
export const fetchSampleValues = async (tableName: string, fieldName: string): Promise<string[]> => {
    if (!db) throw new Error("Database not initialized.");

    const query = `SELECT DISTINCT "${fieldName}" FROM "${tableName}" WHERE "${fieldName}" IS NOT NULL LIMIT 50;`;
    
    try {
        const results = await executeQuery(query);
        return results.map(row => String(row[fieldName]));
    } catch (e) {
        console.error(`Failed to fetch sample values for ${tableName}.${fieldName}:`, e);
        throw e;
    }
};