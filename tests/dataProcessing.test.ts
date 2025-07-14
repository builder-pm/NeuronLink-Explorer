// Mock implementation of a testing environment to allow the file to be parsed.
// In a real environment, you would use a library like Vitest or Jest.
const describe = (name: string, fn: () => void) => { console.log(`DESCRIBE: ${name}`); fn(); };
const it = (name: string, fn: () => void) => { console.log(`IT: ${name}`); fn(); };
const expect = (actual: any) => ({
  toEqual: (expected: any) => {
    const actualStr = actual.replace(/\s+/g, ' ').trim();
    const expectedStr = expected.replace(/\s+/g, ' ').trim();
    if (actualStr !== expectedStr) {
      console.error('Assertion failed:');
      console.error('Expected:', expectedStr);
      console.error('Actual:  ', actualStr);
      throw new Error(`AssertionError: Expected did not match actual.`);
    }
    console.log('Assertion passed.');
  }
});

import { generateQuery } from '../utils/dataProcessing';
import { PivotConfig, Filter, Join, ModelConfiguration } from '../types';

// The generateQuery function takes a ModelInfo object.
interface ModelInfo {
    modelConfig: ModelConfiguration;
    joins: Join[];
}

const mockDiscoveredTables = [
    { name: 'jobs', fields: ['job_id', 'country_code', 'source_id', 'language', 'total_jobs', 'advertiser', 'seniority', 'id'] },
    { name: 'countries', fields: ['country_code', 'country_name'] },
    { name: 'sources', fields: ['source_id', 'source_name', 'id'] } // Ambiguous 'id'
];

const mockModelConfig: ModelConfiguration = {
    'jobs': mockDiscoveredTables.find(t => t.name === 'jobs')!.fields,
    'countries': mockDiscoveredTables.find(t => t.name === 'countries')!.fields,
};

const mockModel: ModelInfo = {
    modelConfig: mockModelConfig,
    joins: [
        { from: "jobs", to: "countries", type: 'LEFT JOIN' as const, on: { from: 'country_code', to: 'country_code' } }
    ]
}

describe('generateQuery with Joins and Schema Awareness', () => {

    it('should generate a simple query with a JOIN and correct aliases', async () => {
        const pivotConfig: PivotConfig = {
            rows: ['country_name'],
            columns: [],
            values: [{ field: 'total_jobs', aggregation: 'SUM', displayName: 'Total Jobs' }],
        };
        const filters: Filter[] = [];

        const result = await generateQuery(mockModel, pivotConfig, filters, mockDiscoveredTables);
        const expected = `
            SELECT \`countries\`.\`country_name\` as \`country_name\`, SUM(\`jobs\`.\`total_jobs\`) as "Total Jobs"
            FROM \`jobs\` LEFT JOIN \`countries\` ON \`jobs\`.\`country_code\` = \`countries\`.\`country_code\`
            GROUP BY \`countries\`.\`country_name\`
        `;
        expect(result).toEqual(expected);
    });

    it('should correctly alias a WHERE clause field', async () => {
        const pivotConfig: PivotConfig = { rows: ['country_name'], columns: [], values: [] };
        const filters: Filter[] = [
            { id: '1', field: 'language', operator: 'equals', value: 'en' },
        ];
        
        const result = await generateQuery(mockModel, pivotConfig, filters, mockDiscoveredTables);
        const expected = `
            SELECT \`countries\`.\`country_name\` as \`country_name\`
            FROM \`jobs\` LEFT JOIN \`countries\` ON \`jobs\`.\`country_code\` = \`countries\`.\`country_code\`
            WHERE \`jobs\`.\`language\` = 'en'
            GROUP BY \`countries\`.\`country_name\`
        `;
        expect(result).toEqual(expected);
    });
    
    it('should ignore column pivoting as it is not supported', async () => {
        const pivotConfig: PivotConfig = {
            rows: ['country_name'],
            columns: ['seniority'], // This should be ignored by the current implementation
            values: [{ field: 'total_jobs', aggregation: 'SUM', displayName: 'Job Sum' }],
        };
        const filters: Filter[] = [];

        const result = await generateQuery(mockModel, pivotConfig, filters, mockDiscoveredTables);
        
        // The test is adjusted to reflect that column pivoting is ignored.
        const expected = `
            SELECT \`countries\`.\`country_name\` as \`country_name\`, SUM(\`jobs\`.\`total_jobs\`) as "Job Sum"
            FROM \`jobs\` 
            LEFT JOIN \`countries\` ON \`jobs\`.\`country_code\` = \`countries\`.\`country_code\`
            GROUP BY \`countries\`.\`country_name\`
        `;
        expect(result).toEqual(expected);
    });

    it('should handle an ambiguous field name by using the field from the first table in the model config', async () => {
        const multiJoinModelConfig: ModelConfiguration = {
            'jobs': mockDiscoveredTables.find(t => t.name === 'jobs')!.fields,
            'sources': mockDiscoveredTables.find(t => t.name === 'sources')!.fields,
        };
        const multiJoinModel: ModelInfo = {
            modelConfig: multiJoinModelConfig,
            joins: [
                { from: "jobs", to: "sources", type: 'INNER JOIN' as const, on: { from: 'source_id', to: 'source_id' } }
            ]
        };

        const pivotConfig: PivotConfig = {
            rows: [],
            columns: [],
            values: [{ field: 'id', aggregation: 'COUNT' }],
        };
        const filters: Filter[] = [];
        const result = await generateQuery(multiJoinModel, pivotConfig, filters, mockDiscoveredTables);
        // It should pick `jobs`.`id` because `jobs` is the first key in the modelConfig object.
        const expected = `
            SELECT COUNT(\`jobs\`.\`id\`) as "COUNT_of_id" FROM \`jobs\` INNER JOIN \`sources\` ON \`jobs\`.\`source_id\` = \`sources\`.\`source_id\`
        `;
        expect(result).toEqual(expected);
    });

     it('should handle multiple joins correctly', async () => {
        const multiJoinModelConfig: ModelConfiguration = {
            'jobs': mockDiscoveredTables.find(t => t.name === 'jobs')!.fields,
            'countries': mockDiscoveredTables.find(t => t.name === 'countries')!.fields,
            'sources': mockDiscoveredTables.find(t => t.name === 'sources')!.fields,
        };
        const multiJoinModel: ModelInfo = {
            modelConfig: multiJoinModelConfig,
            joins: [
                { from: "jobs", to: "countries", type: 'LEFT JOIN' as const, on: {from: 'country_code', to: 'country_code'} },
                { from: "jobs", to: "sources", type: 'INNER JOIN' as const, on: {from: 'source_id', to: 'source_id'} }
            ]
        };
        const pivotConfig: PivotConfig = {
            rows: ['country_name', 'source_name'],
            columns: [],
            values: [{ field: 'total_jobs', aggregation: 'SUM' }],
        };
        const filters: Filter[] = [];
        const result = await generateQuery(multiJoinModel, pivotConfig, filters, mockDiscoveredTables);
        const expected = `
            SELECT \`countries\`.\`country_name\` as \`country_name\`, \`sources\`.\`source_name\` as \`source_name\`, SUM(\`jobs\`.\`total_jobs\`) as "SUM_of_total_jobs"
            FROM \`jobs\` 
            LEFT JOIN \`countries\` ON \`jobs\`.\`country_code\` = \`countries\`.\`country_code\`
            INNER JOIN \`sources\` ON \`jobs\`.\`source_id\` = \`sources\`.\`source_id\`
            GROUP BY \`countries\`.\`country_name\`, \`sources\`.\`source_name\`
        `;
        expect(result).toEqual(expected);
    });
});