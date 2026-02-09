/**
 * @file tests/contextBuilder.test.ts
 * @description TDD tests for the tiered context builder (Phase 07-01)
 * 
 * Tier Priority:
 * 1. Active Model (Tables, Fields, Joins)
 * 2. Metadata (Descriptions, Semantic Types)
 * 3. Metrics (Definitions, Formulas)
 * 4. Registry Overview (All table names)
 * 5. Sample Values (Discovery)
 */

import { describe, test, expect } from 'vitest';
import {
    generateSemanticContext,
    ContextBuilderInput,
    DEFAULT_MAX_CHARS
} from '../utils/contextBuilder';

// --- Test Fixtures ---

const mockModelConfiguration = {
    'film': ['film_id', 'title', 'rating'],
    'rental': ['rental_id', 'rental_date', 'customer_id']
};

const mockJoins = [
    {
        from: 'rental',
        to: 'film',
        type: 'LEFT JOIN' as const,
        on: { from: 'inventory_id', to: 'film_id' }
    }
];

const mockFieldMetadata: Record<string, { description?: string; dataType?: string }> = {
    'film.title': { description: 'The title of the movie', dataType: 'dimension' },
    'film.rating': { description: 'MPAA rating (PG, R, etc.)', dataType: 'dimension' },
    'rental.rental_date': { description: 'When the rental occurred', dataType: 'date' }
};

const mockMetrics = [
    {
        id: 'm1',
        name: 'Total Rentals',
        formula: 'COUNT(rental_id)',
        description: 'Count of all rental transactions',
        requiredFields: ['rental.rental_id']
    },
    {
        id: 'm2',
        name: 'Revenue',
        formula: 'SUM(amount)',
        requiredFields: ['payment.amount']
    }
];

const mockRegistryTables = [
    { name: 'film', columns: [] },
    { name: 'rental', columns: [] },
    { name: 'customer', columns: [] },
    { name: 'inventory', columns: [] },
    { name: 'payment', columns: [] },
    { name: 'category', columns: [] }
];

const mockSampleValues: Record<string, string[]> = {
    'film.rating': ['PG', 'R', 'PG-13', 'G', 'NC-17'],
    'film.title': ['Ace Goldfinger', 'Academy Dinosaur', 'African Egg']
};

// --- Test Suite ---

describe('generateSemanticContext', () => {

    // ==========================================
    // TIER 1: Basic Model & Joins
    // ==========================================

    describe('Tier 1: Active Model', () => {
        test('should include table and field names from modelConfiguration', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: []
            };

            const result = generateSemanticContext(input);

            // Should contain table names
            expect(result).toContain('film');
            expect(result).toContain('rental');

            // Should contain field names
            expect(result).toContain('title');
            expect(result).toContain('rental_id');
        });

        test('should include join relationships', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: mockJoins
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('rental');
            expect(result).toContain('film');
            expect(result).toContain('LEFT JOIN');
        });

        test('should handle empty model gracefully', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: {},
                joins: []
            };

            const result = generateSemanticContext(input);

            // Should not throw, should return some structure
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    // ==========================================
    // TIER 2: Field Metadata (Descriptions)
    // ==========================================

    describe('Tier 2: Field Metadata', () => {
        test('should include field descriptions when provided', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                fieldMetadata: mockFieldMetadata
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('The title of the movie');
            expect(result).toContain('MPAA rating');
        });

        test('should include semantic data types', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                fieldMetadata: mockFieldMetadata
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('dimension');
            expect(result).toContain('date');
        });
    });

    // ==========================================
    // TIER 3: Metrics
    // ==========================================

    describe('Tier 3: Metrics', () => {
        test('should include metric names and formulas', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                metrics: mockMetrics
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('Total Rentals');
            expect(result).toContain('COUNT(rental_id)');
            expect(result).toContain('Revenue');
        });

        test('should include metric descriptions when available', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                metrics: mockMetrics
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('Count of all rental transactions');
        });
    });

    // ==========================================
    // TIER 4: Schema Registry Overview
    // ==========================================

    describe('Tier 4: Registry Overview', () => {
        test('should include available tables from registry', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                schemaRegistry: { tables: mockRegistryTables }
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('customer');
            expect(result).toContain('payment');
            expect(result).toContain('category');
        });
    });

    // ==========================================
    // TIER 5: Sample Values
    // ==========================================

    describe('Tier 5: Sample Values', () => {
        test('should include sample values when provided', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: [],
                sampleValues: mockSampleValues
            };

            const result = generateSemanticContext(input);

            expect(result).toContain('PG');
            expect(result).toContain('R');
            expect(result).toContain('PG-13');
        });
    });

    // ==========================================
    // Trimming Logic
    // ==========================================

    describe('Character Budget Enforcement', () => {
        test('should respect maxChars limit', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: mockJoins,
                fieldMetadata: mockFieldMetadata,
                metrics: mockMetrics,
                schemaRegistry: { tables: mockRegistryTables },
                sampleValues: mockSampleValues,
                maxChars: 500 // Very small budget
            };

            const result = generateSemanticContext(input);

            expect(result.length).toBeLessThanOrEqual(500);
        });

        test('should prioritize Tier 1 (Model) over lower tiers when trimming', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: mockJoins,
                fieldMetadata: mockFieldMetadata,
                sampleValues: mockSampleValues,
                maxChars: 300 // Force trimming
            };

            const result = generateSemanticContext(input);

            // Model info (Tier 1) should be present
            expect(result).toContain('film');
            expect(result).toContain('rental');

            // Sample values (Tier 5) should be trimmed first
            // Note: Depending on implementation, samples may or may not be present
        });

        test('should use DEFAULT_MAX_CHARS when maxChars not specified', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: []
            };

            const result = generateSemanticContext(input);

            expect(result.length).toBeLessThanOrEqual(DEFAULT_MAX_CHARS);
        });
    });

    // ==========================================
    // Edge Cases
    // ==========================================

    describe('Edge Cases', () => {
        test('should handle all optional fields being undefined', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: mockModelConfiguration,
                joins: []
            };

            const result = generateSemanticContext(input);

            expect(result).toBeDefined();
            expect(result).toContain('film');
        });

        test('should handle empty arrays gracefully', () => {
            const input: ContextBuilderInput = {
                modelConfiguration: {},
                joins: [],
                metrics: [],
                schemaRegistry: { tables: [] },
                sampleValues: {}
            };

            const result = generateSemanticContext(input);

            expect(result).toBeDefined();
        });
    });
});
