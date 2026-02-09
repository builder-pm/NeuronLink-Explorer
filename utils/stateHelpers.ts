import { ModelConfiguration, FieldMetadata, SchemaRegistryEntry } from '../types';
import { inferDataType } from './metadataInference';

/**
 * Initializes field metadata for a given model configuration using schema registry data or inference.
 * This ensures consistency between manual and AI-suggested model updates.
 */
export const initializeFieldMetadata = (
    modelConfig: ModelConfiguration,
    existingMetadata: Record<string, FieldMetadata>,
    schemaRegistry: SchemaRegistryEntry | null
): Record<string, FieldMetadata> => {
    const newMetadata = { ...existingMetadata };

    Object.entries(modelConfig).forEach(([tableName, fields]) => {
        const registryTable = schemaRegistry?.tables.find(t => t.name === tableName);
        
        fields.forEach(field => {
            const fieldKey = `${tableName}.${field}`;
            
            // Only initialize if it doesn't already exist
            if (!newMetadata[fieldKey]) {
                const registryCol = registryTable?.columns.find(c => c.name === field);

                newMetadata[fieldKey] = {
                    description: registryCol?.description || '',
                    dataType: registryCol?.semanticType || inferDataType(field),
                    isPrimary: registryCol?.isPrimary,
                    foreignKey: registryCol?.foreignKey
                };
            }
        });
    });

    return newMetadata;
};
