import { Metric, ModelConfiguration, SchemaRegistryEntry } from '../types';

export interface ValidationResult {
    isValid: boolean;
    missingFields: string[];
}

/**
 * Validates if a metric's required fields are present in the current model configuration.
 * Handles both simple field names (e.g., "amount") and qualified names (e.g., "payment.amount").
 * Case-insensitive matching.
 */
export function validateMetricAvailability(
    metric: Metric,
    modelConfiguration: ModelConfiguration
): ValidationResult {
    const missingFields: string[] = [];

    // Get all available fields from the configuration as a flat list
    // Format: "table.field" (lower-cased) AND "field" (lower-cased) if unambiguous?
    // Actually, let's just build a set of all available "table.field" and "field"
    const availableFields = new Set<string>();

    Object.entries(modelConfiguration).forEach(([tableName, fields]) => {
        fields.forEach(field => {
            availableFields.add(`${tableName}.${field}`.toLowerCase());
            availableFields.add(field.toLowerCase());
        });
    });

    metric.requiredFields.forEach(requiredField => {
        const lowerField = requiredField.toLowerCase();

        // Check if the field exists in our available set
        if (!availableFields.has(lowerField)) {
            missingFields.push(requiredField);
        }
    });

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}

/**
 * Finds which tables in the Schema Registry contain the missing fields.
 * Returns a map of fieldName -> listOfTableNames.
 */
export function getMissingFieldSuggestions(
    missingFields: string[],
    schemaRegistry: SchemaRegistryEntry | null
): Record<string, string[]> {
    if (!schemaRegistry) {
        return {};
    }

    const suggestions: Record<string, string[]> = {};

    missingFields.forEach(field => {
        const suggestedTables: string[] = [];
        const lowerField = field.toLowerCase();

        // Parse "table.field" if applicable
        const parts = lowerField.split('.');
        const isQualified = parts.length === 2;
        const targetTable = isQualified ? parts[0] : null;
        const targetColumn = isQualified ? parts[1] : lowerField;

        schemaRegistry.tables.forEach(table => {
            // If qualified, only look at the specific table
            if (targetTable && table.name.toLowerCase() !== targetTable) {
                return;
            }

            // Check if table has the column
            const hasColumn = table.columns.some(col => col.name.toLowerCase() === targetColumn);

            if (hasColumn) {
                suggestedTables.push(table.name); // Keep original casing of table name
            }
        });

        if (suggestedTables.length > 0) {
            suggestions[field] = suggestedTables;
        }
    });

    return suggestions;
}
