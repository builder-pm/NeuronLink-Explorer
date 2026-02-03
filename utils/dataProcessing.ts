import { PivotConfig, Filter, Join, ModelConfiguration, FieldAliases } from '../types';
import { executeQuery as executeDbQuery } from '../services/database';

interface ModelInfo {
    modelConfig: ModelConfiguration;
    joins: Join[];
}
type DiscoveredTable = { name: string; fields: string[] };

/**
 * Helper to quote identifiers based on database type.
 * SQLite uses "" or [], Athena/MySQL use ``.
 * We'll default to "" for maximum compatibility or detect if it's SQLite.
 */
const quote = (ident: string): string => {
    return `"${ident.replace(/"/g, '""')}"`;
};

/**
 * Finds the table a specific field belongs to.
 */
const findTableForField = (field: string, modelConfig: ModelConfiguration, allDiscoveredTables: DiscoveredTable[]): string => {
    for (const tableName in modelConfig) {
        if (modelConfig[tableName].includes(field)) {
            return tableName;
        }
    }

    for (const table of allDiscoveredTables) {
        if (table.fields.includes(field)) {
            return table.name;
        }
    }

    return Object.keys(modelConfig)[0] || '';
};


/**
 * Builds the FROM and JOIN clauses of the SQL query based on the data model.
 */
const buildFromClause = (modelConfig: ModelConfiguration, joins: Join[]): string => {
    const selectedTables = Object.keys(modelConfig);
    if (selectedTables.length === 0) return '';

    const baseTable = selectedTables[0];
    let from = `FROM ${quote(baseTable)}`;
    const joinedTables = new Set([baseTable]);

    const tablesToProcess = [baseTable];

    while (tablesToProcess.length > 0) {
        const currentTable = tablesToProcess.shift()!;

        for (const join of joins) {
            const isFrom = join.from === currentTable;
            const isTo = join.to === currentTable;
            const otherTable = isFrom ? join.to : join.from;

            if ((isFrom || isTo) && selectedTables.includes(otherTable) && !joinedTables.has(otherTable)) {
                from += ` ${join.type} ${quote(otherTable)} ON ${quote(join.from)}.${quote(join.on.from)} = ${quote(join.to)}.${quote(join.on.to)}`;
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
    if (filters.length === 0) return '';

    const conditions = filters.map(filter => {
        const table = findTableForField(filter.field, modelConfig, allDiscoveredTables);
        if (!table) return '';

        const fieldName = `${quote(table)}.${quote(filter.field)}`;
        const value = typeof filter.value === 'string' ? `'${filter.value.replace(/'/g, "''")}'` : filter.value;

        switch (filter.operator) {
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
    allDiscoveredTables: DiscoveredTable[],
    fieldAliases: FieldAliases = {},
    selectedFields?: string[]
): Promise<string | null> => {
    const { modelConfig, joins } = model;
    const selectedTables = Object.keys(modelConfig);

    if (selectedTables.length === 0) {
        return null;
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
        // ... (pivot logic remains the same) ...
        const pivotColumn = columns[0];
        const tableForPivotColumn = findTableForField(pivotColumn, modelConfig, allDiscoveredTables);

        const whereForDistinct = whereClause ? `${whereClause} AND` : 'WHERE';
        const distinctQuery = `
            SELECT DISTINCT ${quote(tableForPivotColumn)}.${quote(pivotColumn)}
            ${fromClause}
            ${whereForDistinct} ${quote(tableForPivotColumn)}.${quote(pivotColumn)} IS NOT NULL
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
                const alias = quote(`${pivotValue} - ${valueAlias}`);

                return `${agg.aggregation}(CASE WHEN ${quote(tableForPivotColumn)}.${quote(pivotColumn)} = ${safePivotValue} THEN ${quote(valueTable)}.${quote(agg.field)} END) AS ${alias}`;
            });
        });

        const rowFields = rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            const alias = fieldAliases[`${table}.${f}`];
            return `${quote(table)}.${quote(f)} as ${quote(alias || f)}`;
        });

        const allSelects = [...rowFields, ...pivotSelects];
        if (allSelects.length === 0) return null;

        const groupByFields = rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            return `${quote(table)}.${quote(f)}`;
        });
        const groupByClause = groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : '';

        return `SELECT ${allSelects.join(', ')} ${fromClause} ${whereClause} ${groupByClause}`.trim();

    } else {
        if (rows.length === 0 && columns.length === 0 && values.length === 0) {
            // Standard Table View
            // If selectedFields is provided, we ONLY select those.
            // If it's provided but empty, we return null (no query).
            // If it's undefined, we fallback to all fields (legacy behavior, though we should likely strive to always be explicit).

            if (selectedFields !== undefined && selectedFields.length === 0) {
                return null;
            }

            const rawFieldsToSelect = selectedFields
                ? selectedFields.filter(f => allAvailableFieldsInModel.has(f))
                : Array.from(allAvailableFieldsInModel);

            if (rawFieldsToSelect.length === 0) {
                return null;
            }

            const fieldsToSelect = rawFieldsToSelect
                .map(field => {
                    const table = findTableForField(field, modelConfig, allDiscoveredTables);
                    const alias = fieldAliases[`${table}.${field}`];
                    return `${quote(table)}.${quote(field)} as ${quote(alias || field)}`;
                })
                .join(', ');

            return `SELECT ${fieldsToSelect} ${fromClause} ${whereClause}`.trim();
        }

        const groupByClause = rows.length > 0 ? `GROUP BY ${rows.map(f => {
            const table = findTableForField(f, modelConfig, allDiscoveredTables);
            return `${quote(table)}.${quote(f)}`;
        }).join(', ')}` : '';

        const selectFieldsList = [
            ...rows.map(f => {
                const table = findTableForField(f, modelConfig, allDiscoveredTables);
                const alias = fieldAliases[`${table}.${f}`];
                return `${quote(table)}.${quote(f)} as ${quote(alias || f)}`;
            }),
            ...values.map(v => {
                const table = findTableForField(v.field, modelConfig, allDiscoveredTables);
                return `${v.aggregation}(${quote(table)}.${quote(v.field)}) as ${quote(v.displayName || `${v.aggregation}_of_${v.field}`)}`;
            })
        ];

        return `SELECT ${selectFieldsList.length > 0 ? selectFieldsList.join(', ') : '1'} ${fromClause} ${whereClause} ${groupByClause}`.trim();
    }
};

/**
 * Generates a simple preview query showing the raw data defined by the model components.
 */
export const generatePreviewQuery = (
    modelConfig: ModelConfiguration,
    joins: Join[],
    _allDiscoveredTables: DiscoveredTable[],
    fieldAliases: FieldAliases = {}
): string => {
    const fromClause = buildFromClause(modelConfig, joins);
    if (!fromClause) return '-- Select tables from the Data tab to build your query.';

    const selectedFieldsList: string[] = [];
    for (const tableName in modelConfig) {
        modelConfig[tableName].forEach(field => {
            const alias = fieldAliases[`${tableName}.${field}`];
            if (alias) {
                selectedFieldsList.push(`${quote(tableName)}.${quote(field)} AS ${quote(alias)}`);
            } else {
                selectedFieldsList.push(`${quote(tableName)}.${quote(field)}`);
            }
        });
    }

    if (selectedFieldsList.length === 0) {
        return `SELECT * ${fromClause}`;
    }

    const fieldsToSelect = selectedFieldsList.join(',\n    ');

    return `SELECT\n    ${fieldsToSelect}\n${fromClause}`;
};
