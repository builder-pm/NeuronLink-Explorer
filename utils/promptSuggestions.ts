import { FieldGroups } from '../types';

/**
 * Generates dynamic prompt suggestions based on the available semantic field groups.
 * This helps guide the user to ask relevant questions based on the data they have selected.
 */
export function generatePrompts(fieldGroups: FieldGroups): string[] {
    const prompts: string[] = [];

    const groups = Object.keys(fieldGroups);
    const hasFinancials = groups.includes('Financials') && fieldGroups['Financials'].length > 0;
    const hasTime = groups.includes('Dates & Time') && fieldGroups['Dates & Time'].length > 0;
    const hasLocation = groups.includes('Location') && fieldGroups['Location'].length > 0;
    const hasPeople = groups.includes('People & Contact') && fieldGroups['People & Contact'].length > 0;

    // 1. Financial Prompts (High Value)
    if (hasFinancials) {
        const financialField = fieldGroups['Financials'][0].split('.')[1] || fieldGroups['Financials'][0]; // simple extraction
        prompts.push(`Start with: Total ${financialField} by...`);

        if (hasTime) {
            prompts.push(`Show ${financialField} trends over time`);
        }
    }

    // 2. Location Prompts
    if (hasLocation) {
        const locField = fieldGroups['Location'][0].split('.')[1] || fieldGroups['Location'][0];
        prompts.push(`Map distribution by ${locField}`);
    }

    // 3. Time-based Prompts (if not covered by financials)
    if (hasTime && !hasFinancials) {
        prompts.push("Show activity trends by month");
    }

    // 4. People/Count Prompts
    if (hasPeople) {
        const peopleField = fieldGroups['People & Contact'][0].split('.')[1] || fieldGroups['People & Contact'][0];
        // Try to find the table name for context like "customer"
        const table = fieldGroups['People & Contact'][0].split('.')[0];
        prompts.push(`Count of ${table}s by status`);
    }

    // 5. Fallbacks if specific groups aren't found or to ensure variety
    if (prompts.length < 3) {
        const randomTable = groups.find(g => !['Uncategorized', 'Financials', 'Dates & Time', 'Location', 'People & Contact'].includes(g));
        if (randomTable) {
            prompts.push(`Analyze ${randomTable} data`);
        }
        prompts.push("Help me build a pivot table");
        prompts.push("Find patterns in this dataset");
    }

    // Return top 3-4 unique prompts
    return [...new Set(prompts)].slice(0, 4);
}
