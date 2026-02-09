import { describe, test, expect } from 'vitest';
import { validateMetricAvailability, getMissingFieldSuggestions } from '../utils/metricValidator';
import { Metric, ModelConfiguration, SchemaRegistryEntry } from '../types';

describe('Metric Validator', () => {
    const mockModel: ModelConfiguration = {
        'orders': ['id', 'amount', 'customer_id'],
        'customers': ['id', 'name']
    };

    const mockRegistry: SchemaRegistryEntry = {
        dbUrlHash: 'hash',
        schemaHash: 'schema_hash',
        lastSyncedAt: '2023-01-01',
        tables: [
            {
                name: 'orders',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true },
                    { name: 'amount', type: 'decimal', isPrimary: false },
                    { name: 'customer_id', type: 'int', isPrimary: false }
                ]
            },
            {
                name: 'customers',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true },
                    { name: 'name', type: 'text', isPrimary: false },
                    { name: 'email', type: 'text', isPrimary: false } // 'email' is in registry but not in model
                ]
            },
            {
                name: 'products',
                columns: [
                    { name: 'id', type: 'int', isPrimary: true },
                    { name: 'name', type: 'text', isPrimary: false }
                ]
            }
        ]
    };

    test('validates metric with all fields present', () => {
        const metric: Metric = {
            id: '1',
            name: 'Total Amount',
            formula: 'SUM(amount)',
            requiredFields: ['amount']
        };
        const result = validateMetricAvailability(metric, mockModel);
        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
    });

    test('validates metric with qualified fields', () => {
        const metric: Metric = {
            id: '2',
            name: 'Order Amount',
            formula: 'SUM(orders.amount)',
            requiredFields: ['orders.amount']
        };
        const result = validateMetricAvailability(metric, mockModel);
        expect(result.isValid).toBe(true);
    });

    // New test case for case-insensitivity
    test('validates metric with case-insensitive fields', () => {
        const metric: Metric = {
            id: '2',
            name: 'Order Amount',
            formula: 'SUM(ORDERS.AMOUNT)',
            requiredFields: ['ORDERS.AMOUNT']
        };
        const result = validateMetricAvailability(metric, mockModel);
        expect(result.isValid).toBe(true);
    });

    test('identifies missing fields', () => {
        const metric: Metric = {
            id: '3',
            name: 'Invalid Metric',
            formula: 'SUM(profit)',
            requiredFields: ['profit']
        };
        const result = validateMetricAvailability(metric, mockModel);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('profit');
    });

    test('suggests tables for missing fields', () => {
        const missingFields = ['email'];
        const suggestions = getMissingFieldSuggestions(missingFields, mockRegistry);
        expect(suggestions['email']).toBeDefined();
        expect(suggestions['email']).toContain('customers');
    });

    test('suggests tables for qualified missing fields', () => {
        const missingFields = ['customers.email'];
        const suggestions = getMissingFieldSuggestions(missingFields, mockRegistry);
        expect(suggestions['customers.email']).toBeDefined();
        expect(suggestions['customers.email']).toContain('customers');
    });

    test('does not suggest correct table if qualified name points to wrong table', () => {
        const missingFields = ['orders.email']; // email is in customers, not orders
        const suggestions = getMissingFieldSuggestions(missingFields, mockRegistry);
        expect(suggestions['orders.email']).toBeUndefined();
    });
});
