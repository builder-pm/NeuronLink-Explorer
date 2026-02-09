/**
 * Prettifies a technical field name into a human-readable label.
 * Example: 'first_name' -> 'First Name', 'customer.last_name' -> 'Last Name'
 */
export const prettifyFieldName = (field: string): string => {
    // 1. Remove table prefix if present (e.g., 'customer.first_name' -> 'first_name')
    const parts = field.split('.');
    const name = parts.length > 1 ? parts[1] : parts[0];
    
    // 2. Handle underscores and camelCase
    return name
        .replace(/_/g, ' ')                        // first_name -> first name
        .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase -> camel Case
        .replace(/\b\w/g, l => l.toUpperCase())    // first name -> First Name
        .trim();
};

/**
 * Extracts the table name from a field key.
 */
export const getTableName = (field: string): string | null => {
    const parts = field.split('.');
    return parts.length > 1 ? parts[0] : null;
};
