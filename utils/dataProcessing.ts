import { DataRow, PivotConfig, Filter, Join, ModelConfiguration } from '../types';
import { executeQuery as executeDbQuery } from '../services/database';

interface ModelInfo {
    modelConfig: ModelConfiguration;
    joins: Join[];
}
type DiscoveredTable = { name: string; fields: string[] };

/**
 * Finds the table a specific field belongs to.
 */
const findTableForField = (field: string, modelConfig: ModelConfiguration, allDiscoveredTables: DiscoveredTable[]): string => {
    // Search within the tables selected for the current model.
    for (const tableName in modelConfig) {
        if (modelConfig[tableName].includes(field)) {
            return tableName;
        }
    }

    // Fallback: If not found (e.g., from an old filter), search all tables.
    for (const table of allDiscoveredTables) {
         if (table.fields.includes(field)) {
            return table.name;
        }
    }
    
    // This should ideally not happen if the model is clean.
    console.warn(`Could not find a table for field: ${field}`);
    return Object.keys(modelConfig)[0] || '';
};


/**
 * Builds the FROM and JOIN clauses of the SQL query based on the data model.
 */
const buildFromClause = (modelConfig: ModelConfiguration, joins: Join[]): string => {
    const selectedTables = Object.keys(modelConfig);
    if (selectedTables.length === 0) return '';
    
    const baseTable = selectedTables[0];
    let from = `FROM \`${baseTable}\``;
    const joinedTables = new Set([baseTable]);

    const tablesToProcess = [baseTable];

    while (tablesToProcess.length > 0) {
        const currentTable = tablesToProcess.shift()!;
        
        for (const join of joins) {
            const isFrom = join.from === currentTable;
            const isTo = join.to === currentTable;
            const otherTable = isFrom ? join.to : join.from;

            if ((isFrom || isTo) && selectedTables.includes(otherTable) && !joinedTables.has(otherTable)) {
                from += ` ${join.type} \`${otherTable}\` ON \`${join.from}\`.\`${join.on.from}\` = \`${join.to}\`.\`${join.on.to}\``;
                joinedTables.add(otherTable);
                tablesToProcess.push(otherTable);
            }
        }
    }
    
    return from;
}

/**
 * Builds the WHERE clause of the SQL query based on active filters.
 */
const buildWhereClause = (filters: Filter[], modelConfig: ModelConfiguration, allDiscoveredTables: DiscoveredTable[]): string => {
    if(filters.length === 0) return '';

    const conditions = filters.map(filter => {
        const table = findTableForField(filter.field, modelConfig, allDiscoveredTables);
        if (!table) return ''; 
        
        const fieldName = `\`${table}\`.\`${filter.field}\``;
        const value = typeof filter.value === 'string' ? `'${filter.value.replace(/'/g, "''")}'` : filter.value;
        
        switch(filter.operator) {
            case 'equals': return `${fieldName} = ${value}`;
            case 'contains': return `${fieldName} LIKE '%${filter.value}%'`;
            case 'greater_than': return `${fieldName} > ${value}`;
            case 'less_than': return `${fieldName} < ${value}`;
            default: return '';
        }
    }).filter(Boolean);

    if (conditions.length === 0) return '';
    return `WHERE ${conditions.join(' AND ')}`;
}

/**
 * Generates the complete SQL query based on the user's configuration.
 */
export const generateQuery = async (
    model: ModelInfo, 
    pivotConfig: PivotConfig, 
    filters: Filter[],
    allDiscoveredTables: DiscoveredTable[]
): Promise<string> => {
    const { modelConfig, joins } = model;
    const selectedTables = Object.keys(modelConfig);
    
    if (selectedTables.length === 0) {
        return "";
    }
    
    const allAvailableFieldsInModel = new Set<string>(Object.values(modelConfig).flat());

    const cleanPivotConfig: PivotConfig = {
        rows: pivotConfig.rows.filter(f => allAvailableFieldsInModel.has(f)),
        columns: pivotConfig.columns.filter(f => allAvailableFieldsInModel.has(f)),
        values: pivotConfig.values.filter(v => allAvailableFieldsInModel.has(v.field)),
    };
    const cleanFilters = filters.filter(f => allAvailableFieldsInModel.has(f.field));

    const { rows, columns, values } = cleanPivotConfig;
    const fromClause = buildFromClause(modelConfig, joins);
    const whereClause = buildWhereClause(cleanFilters, modelConfig, allDiscoveredTables);

    if (columns.length > 0 && values.length > 0) {
        // Handle column pivoting
        const pivotColumn = columns[0]; // Support one pivot column for now
        const tableForPivotColumn = findTableForField(pivotColumn, modelConfig, allDiscoveredTables);
        
        const whereForDistinct = whereClause ? `${whereClause} AND` : 'WHERE';
        const distinctQuery = `
            SELECT DISTINCT \`${tableForPivotColumn}\`.\`${pivotColumn}\`
            ${fromClause}
            ${whereForDistinct} \`${tableForPivotColumn}\`.\`${pivotColumn}\` IS NOT NULL
            ORDER BY 1
            LIMIT 25
        `;

        const distinctValuesResult = await executeDbQuery(distinctQuery);
        const distinctPivotValues = distinctValuesResult.map(row => row[pivotColumn]);
        
        const pivotSelects = distinctPivotValues.flatMap(pivotValue => {
            return values.map(agg => {
                const valueTable = findTableForField(agg.field, modelConfig, allDiscoveredTables);
                const safePivotValue = typeof pivotValue === 'string' ? `'${String(pivotValue).replace(/'/g, "''")}'` : pivotValue;
                const valueAlias = agg.displayName || `${agg.aggregation} of ${agg.field}`;
                const alias = `"${pivotValue} - ${valueAlias}"`;

                return `${agg.aggregation}(CASE WHEN \`${tableForPivotColumn}\`.\`${pivotColumn}\` = ${safePivotValue} THEN \`${valueTable}\`.\`${agg.field}\` END) AS ${alias}`;
            });
        });

        const rowFields = rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            return `\`${table}\`.\`${f}\` as \`${f}\``;
        });

        const allSelects = [...rowFields, ...pivotSelects];
        if (allSelects.length === 0) return '';
        
        const groupByFields = rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            return `\`${table}\`.\`${f}\``;
        });
        const groupByClause = groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : '';
        
        return `SELECT ${allSelects.join(', ')} ${fromClause} ${whereClause} ${groupByClause}`.trim();

    } else {
        // Default behavior: no columns or no values, treat as a simple aggregate query
        if (rows.length === 0 && columns.length === 0 && values.length === 0) {
            const fieldsToSelect = Array.from(allAvailableFieldsInModel)
                .map(field => {
                    const table = findTableForField(field, modelConfig, allDiscoveredTables);
                    return `\`${table}\`.\`${field}\` as \`${field}\``;
                })
                .join(', ');
            return `SELECT ${fieldsToSelect || '*'} ${fromClause} ${whereClause}`.trim();
        }
        
        const groupByClause = rows.length > 0 ? `GROUP BY ${rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            return `\`${table}\`.\`${f}\``;
        }).join(', ')}` : '';

        const selectFieldsList = [
            ...rows.map(f => {
                const table = findTableForField(f, modelConfig, allDiscoveredTables);
                return `\`${table}\`.\`${f}\` as \`${f}\``;
            }),
            ...values.map(v => {
                const table = findTableForField(v.field, modelConfig, allDiscoveredTables);
                return `${v.aggregation}(\`${table}\`.\`${v.field}\`) as "${v.displayName || `${v.aggregation}_of_${v.field}`}"`;
            })
        ];

        return `SELECT ${selectFieldsList.length > 0 ? selectFieldsList.join(', ') : '1'} ${fromClause} ${whereClause} ${groupByClause}`.trim();
    }
};
