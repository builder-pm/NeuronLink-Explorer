/**
 * @file utils/contextBuilder.ts
 * @description Tiered context builder for AI semantic context generation
 * 
 * Generates a structured string representation of the application state
 * for LLM consumption, with intelligent tier-based trimming.
 * 
 * Tier Priority (highest to lowest):
 * 1. Active Model (Tables, Fields, Joins) - NEVER trimmed
 * 2. Metadata (Descriptions, Semantic Types)
 * 3. Metrics (Definitions, Formulas)
 * 4. Registry Overview (All available tables)
 * 5. Sample Values (Discovery hints)
 */

import type {
    ModelConfiguration,
    Join,
    FieldMetadata,
    Metric,
    RegisteredTable
} from '../types';

export const DEFAULT_MAX_CHARS = 10000;

export interface ContextBuilderInput {
    modelConfiguration: ModelConfiguration;
    joins: Join[];
    fieldMetadata?: Record<string, FieldMetadata>;
    metrics?: Metric[];
    schemaRegistry?: { tables: RegisteredTable[] };
    sampleValues?: Record<string, string[]>;
    maxChars?: number;
}

interface ContextTier {
    priority: number;
    label: string;
    content: string;
}

/**
 * Generates semantic context string from application state
 * Respects character budget by trimming lower-priority tiers first
 */
export function generateSemanticContext(input: ContextBuilderInput): string {
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;

    // Build all tiers
    const tiers: ContextTier[] = [
        buildTier1_ActiveModel(input),
        buildTier2_Metadata(input),
        buildTier3_Metrics(input),
        buildTier4_Registry(input),
        buildTier5_Samples(input)
    ].filter(tier => tier.content.length > 0);

    // Assemble with trimming
    return assembleTiersWithBudget(tiers, maxChars);
}

/**
 * TIER 1: Active Model (Tables, Fields, Joins)
 * Priority: Highest - never trimmed
 */
function buildTier1_ActiveModel(input: ContextBuilderInput): ContextTier {
    const { modelConfiguration, joins } = input;
    const lines: string[] = ['## ACTIVE MODEL'];

    // Tables and Fields
    const tableEntries = Object.entries(modelConfiguration);
    if (tableEntries.length === 0) {
        lines.push('No tables selected.');
    } else {
        lines.push('### Tables & Fields');
        for (const [table, fields] of tableEntries) {
            lines.push(`- **${table}**: ${fields.join(', ')}`);
        }
    }

    // Joins
    if (joins.length > 0) {
        lines.push('');
        lines.push('### Joins');
        for (const join of joins) {
            lines.push(`- ${join.from} ${join.type} ${join.to} ON ${join.on.from} = ${join.on.to}`);
        }
    }

    return {
        priority: 1,
        label: 'Active Model',
        content: lines.join('\n')
    };
}

/**
 * TIER 2: Field Metadata (Descriptions, Semantic Types)
 */
function buildTier2_Metadata(input: ContextBuilderInput): ContextTier {
    const { fieldMetadata, modelConfiguration } = input;

    if (!fieldMetadata || Object.keys(fieldMetadata).length === 0) {
        return { priority: 2, label: 'Metadata', content: '' };
    }

    const lines: string[] = ['', '## FIELD METADATA'];

    // Only include metadata for fields in the current model
    const modelFields = new Set<string>();
    for (const [table, fields] of Object.entries(modelConfiguration)) {
        for (const field of fields) {
            modelFields.add(`${table}.${field}`);
        }
    }

    for (const [fieldKey, meta] of Object.entries(fieldMetadata)) {
        if (!modelFields.has(fieldKey)) continue;

        const parts: string[] = [`- **${fieldKey}**`];
        if (meta.dataType) parts.push(`[${meta.dataType}]`);
        if (meta.description) parts.push(`- ${meta.description}`);

        if (parts.length > 1) {
            lines.push(parts.join(' '));
        }
    }

    if (lines.length <= 1) {
        return { priority: 2, label: 'Metadata', content: '' };
    }

    return {
        priority: 2,
        label: 'Metadata',
        content: lines.join('\n')
    };
}

/**
 * TIER 3: Metrics (Definitions, Formulas)
 */
function buildTier3_Metrics(input: ContextBuilderInput): ContextTier {
    const { metrics } = input;

    if (!metrics || metrics.length === 0) {
        return { priority: 3, label: 'Metrics', content: '' };
    }

    const lines: string[] = ['', '## AVAILABLE METRICS'];

    for (const metric of metrics) {
        let line = `- **${metric.name}**: \`${metric.formula}\``;
        if (metric.description) {
            line += ` - ${metric.description}`;
        }
        lines.push(line);
    }

    return {
        priority: 3,
        label: 'Metrics',
        content: lines.join('\n')
    };
}

/**
 * TIER 4: Registry Overview (Available tables in database)
 * Includes relationship metadata for joining.
 */
function buildTier4_Registry(input: ContextBuilderInput): ContextTier {
    const { schemaRegistry, modelConfiguration } = input;

    if (!schemaRegistry?.tables || schemaRegistry.tables.length === 0) {
        return { priority: 4, label: 'Registry', content: '' };
    }

    // Only show tables NOT in the current model (expansion hints)
    const modelTables = new Set(Object.keys(modelConfiguration));
    const availableTables = schemaRegistry.tables
        .filter(t => !modelTables.has(t.name));

    if (availableTables.length === 0) {
        return { priority: 4, label: 'Registry', content: '' };
    }

    const lines: string[] = [
        '',
        '## OTHER AVAILABLE TABLES (In Registry)',
        'Use these to suggest model expansions via suggest_fields.'
    ];

    for (const table of availableTables) {
        const fks = table.columns
            .filter(c => c.foreignKey)
            .map(c => `${c.name} -> ${c.foreignKey!.table}.${c.foreignKey!.column}`);
        
        let tableLine = `- **${table.name}**`;
        if (fks.length > 0) {
            tableLine += ` (Relationships: ${fks.join('; ')})`;
        }
        lines.push(tableLine);
    }

    return {
        priority: 4,
        label: 'Registry',
        content: lines.join('\n')
    };
}

/**
 * TIER 5: Sample Values (Discovery hints)
 */
function buildTier5_Samples(input: ContextBuilderInput): ContextTier {
    const { sampleValues, modelConfiguration } = input;

    if (!sampleValues || Object.keys(sampleValues).length === 0) {
        return { priority: 5, label: 'Samples', content: '' };
    }

    const lines: string[] = ['', '## SAMPLE VALUES'];

    // Only include samples for fields in the current model
    const modelFields = new Set<string>();
    for (const [table, fields] of Object.entries(modelConfiguration)) {
        for (const field of fields) {
            modelFields.add(`${table}.${field}`);
        }
    }

    for (const [fieldKey, values] of Object.entries(sampleValues)) {
        if (!modelFields.has(fieldKey)) continue;
        if (values.length === 0) continue;

        // Limit displayed samples
        const displayValues = values.slice(0, 5).join(', ');
        lines.push(`- ${fieldKey}: ${displayValues}`);
    }

    if (lines.length <= 1) {
        return { priority: 5, label: 'Samples', content: '' };
    }

    return {
        priority: 5,
        label: 'Samples',
        content: lines.join('\n')
    };
}

/**
 * Assembles tiers into final string, respecting character budget
 * Trims from lowest priority (5) to highest (1)
 */
function assembleTiersWithBudget(tiers: ContextTier[], maxChars: number): string {
    // Sort by priority (1 = highest, kept first)
    const sorted = [...tiers].sort((a, b) => a.priority - b.priority);

    // Calculate total size
    const header = '# SEMANTIC CONTEXT\n';
    let result = header;

    // Add tiers until we exceed budget
    for (const tier of sorted) {
        const candidateResult = result + '\n' + tier.content;

        if (candidateResult.length <= maxChars) {
            result = candidateResult;
        } else {
            // Try to fit partially if it's Tier 1 (always include model)
            if (tier.priority === 1) {
                result = candidateResult.substring(0, maxChars);
            }
            // Otherwise skip this tier (budget exceeded)
            break;
        }
    }

    return result.trim();
}

/**
 * Utility: Estimate token count from character count
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}
