import { FieldGroups, ChatMessage, ModelConfiguration, AppView } from '../types';

export interface PromptContext {
    view: AppView;
    fieldGroups: FieldGroups;
    modelConfiguration: ModelConfiguration;
    chatMessages: ChatMessage[];
    sampleValues?: Record<string, string[]>;
}

function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function getTableNames(config: ModelConfiguration): string[] {
    return Object.keys(config).filter(t => config[t]?.length > 0);
}

function getFieldName(qualified: string): string {
    const parts = qualified.split('.');
    return parts.length > 1 ? parts[1] : parts[0];
}

function getTableName(qualified: string): string {
    return qualified.split('.')[0];
}

function generateModelingPrompts(ctx: PromptContext): string[] {
    const tables = getTableNames(ctx.modelConfiguration);
    const prompts: string[] = [];

    if (tables.length === 0) {
        prompts.push(
            'What tables are available?',
            'Help me set up a sales analysis model',
            'Show me the database schema',
            'Which tables should I use for customer analytics?'
        );
    } else {
        const tableList = tables.slice(0, 3).join(', ');
        prompts.push(
            `What joins make sense for ${tableList}?`,
            'Are there other tables I should add?',
            'Confirm this model and start analyzing'
        );
        if (tables.length < 3) {
            prompts.push('Add more tables to this model');
        }
    }

    return pickRandom(prompts, 3);
}

function generateAnalysisPrompts(ctx: PromptContext): string[] {
    const { fieldGroups, modelConfiguration, chatMessages, sampleValues } = ctx;
    const prompts: string[] = [];

    const tables = getTableNames(modelConfiguration);
    const lastAiMessage = [...chatMessages].reverse().find(m => m.role === 'model');
    const hadError = lastAiMessage?.text?.toLowerCase().includes('error') ||
        lastAiMessage?.text?.toLowerCase().includes('trouble');
    const hasConversation = chatMessages.length > 2;

    // Recovery prompts after errors
    if (hadError) {
        prompts.push(
            'Show me which fields are available',
            'Help me fix this query',
            'Start fresh with a simple pivot'
        );
        return pickRandom(prompts, 3);
    }

    // Extract actual field names for dynamic prompts
    const financialFields = (fieldGroups['Financials'] || []).map(getFieldName);
    const timeFields = (fieldGroups['Dates & Time'] || []).map(getFieldName);
    const locationFields = (fieldGroups['Location'] || []).map(getFieldName);
    const peopleFields = (fieldGroups['People & Contact'] || []).map(getFieldName);


    // Financial + Time combos (highest value)
    if (financialFields.length > 0 && timeFields.length > 0) {
        const f = financialFields[0];
        const t = timeFields[0];
        prompts.push(`Show total ${f} by ${t}`);
        prompts.push(`${f} trend over time`);
    }

    // Financial + Location combos
    if (financialFields.length > 0 && locationFields.length > 0) {
        prompts.push(`Total ${financialFields[0]} by ${locationFields[0]}`);
    }

    // Financial standalone
    if (financialFields.length > 0) {
        prompts.push(`Top 10 by ${financialFields[0]}`);
    }

    // Location analysis
    if (locationFields.length > 0) {
        prompts.push(`Distribution by ${locationFields[0]}`);
    }

    // People analysis
    if (peopleFields.length > 0) {
        const table = (fieldGroups['People & Contact'] || [])[0];
        const tName = getTableName(table);
        prompts.push(`How many ${tName}s are there?`);
    }

    // Sample value-powered prompts
    if (sampleValues) {
        const fieldsWithSamples = Object.keys(sampleValues).filter(k => sampleValues[k]?.length > 0);
        if (fieldsWithSamples.length > 0) {
            const field = fieldsWithSamples[0];
            const sample = sampleValues[field][0];
            const fName = getFieldName(field);
            prompts.push(`Filter where ${fName} = '${sample}'`);
        }
    }

    // Drill-down prompts if conversation already has content
    if (hasConversation) {
        prompts.push(
            'Drill down into the top results',
            'Add a filter to narrow this down',
            'Compare across categories'
        );
    }

    // Multi-table prompts
    if (tables.length > 1) {
        prompts.push(`How are ${tables[0]} and ${tables[1]} related?`);
    }

    // Fallback prompts
    if (prompts.length < 3) {
        prompts.push(
            'Help me build a pivot table',
            'Summarize this dataset',
            'What patterns can you find?'
        );
    }

    return pickRandom(prompts, 4);
}

function generateEmptyPrompts(): string[] {
    return [
        'What can you help me with?',
        'Show me available tables',
        'Help me get started'
    ];
}

/**
 * Context-aware prompt suggestion engine.
 * Generates dynamic prompts based on view, model state, field groups, and conversation history.
 */
export function generatePrompts(ctx: PromptContext): string[] {
    // No model at all
    if (!ctx.modelConfiguration || Object.keys(ctx.modelConfiguration).length === 0) {
        if (ctx.view === 'modeling') return generateModelingPrompts(ctx);
        return generateEmptyPrompts();
    }

    if (ctx.view === 'modeling') return generateModelingPrompts(ctx);
    return generateAnalysisPrompts(ctx);
}
