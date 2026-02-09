import React, { useMemo } from 'react';
import { Metric, SchemaRegistryEntry, ModelConfiguration } from '../types';
import { getMissingFieldSuggestions } from '../utils/metricValidator';
import { ActionType, AppAction } from '../state/actions';
import { XIcon, CheckIcon, AlertTriangleIcon, TableIcon } from './icons';
import { toast } from 'react-hot-toast';

interface MetricSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    metric: Metric;
    missingFields: string[];
    modelConfiguration: ModelConfiguration | null;
    schemaRegistry: SchemaRegistryEntry | null;
    dispatch: React.Dispatch<AppAction>;
}

export const MetricSuggestionModal: React.FC<MetricSuggestionModalProps> = ({
    isOpen,
    onClose,
    metric,
    missingFields,
    modelConfiguration,
    schemaRegistry,
    dispatch
}) => {
    if (!isOpen) return null;

    const suggestions = useMemo(() =>
        getMissingFieldSuggestions(missingFields, schemaRegistry),
        [missingFields, schemaRegistry]
    );

    // Group fields by table
    // If a field is available in multiple tables, we group it under ALL of them for display,
    // but for the "Auto-fix" action, we need a strategy.
    // Strategy: 
    // 1. If qualified (table.field), it goes to that table.
    // 2. If simple (field), and exists in multiple tables, we pick the first one that is ALREADY in the model (heuristic).
    // 3. Defaults to first available table.

    const tableGroups = useMemo(() => {
        const groups: Record<string, string[]> = {};

        Object.entries(suggestions).forEach(([field, tables]) => {
            if (tables.length === 0) return;

            // Decision logic for which table to attribute this field to
            let targetTable = tables[0];

            // If qualified, force that table
            if (field.includes('.')) {
                const [t] = field.split('.');
                const found = tables.find(tbl => tbl.toLowerCase() === t.toLowerCase());
                if (found) targetTable = found;
            } else {
                // Prefer table already in configuration
                const existingTable = tables.find(t => modelConfiguration && modelConfiguration[t]);
                if (existingTable) targetTable = existingTable;
            }

            if (!groups[targetTable]) {
                groups[targetTable] = [];
            }
            groups[targetTable].push(field);
        });

        return groups;
    }, [suggestions, modelConfiguration]);

    const handleApplySuggestions = () => {
        if (!modelConfiguration) return;

        let appliedCount = 0;

        Object.entries(tableGroups).forEach(([tableName, fieldsToAdd]) => {
            const currentFields = modelConfiguration[tableName] || [];

            // Clean field names (remove table prefix if present)
            const cleanFieldsToAdd = fieldsToAdd.map(f => f.includes('.') ? f.split('.')[1] : f);

            // Merge and deduplicate
            const uniqueFields = Array.from(new Set([
                ...currentFields,
                ...cleanFieldsToAdd
            ]));

            if (uniqueFields.length > currentFields.length) {
                dispatch({
                    type: ActionType.UPDATE_MODEL_CONFIG,
                    payload: {
                        tableName,
                        fields: uniqueFields,
                        isSelected: true
                    }
                });
                appliedCount++;
            }
        });

        if (appliedCount > 0) {
            toast.success(`Updated ${appliedCount} tables with missing fields`);
            onClose();
        } else {
            toast('No changes needed - fields might already be present.');
            onClose();
        }
    };

    const hasSuggestions = Object.keys(tableGroups).length > 0;
    const unresolvableFields = missingFields.filter(f => !suggestions[f] || suggestions[f].length === 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0">
            <div className="w-[500px] border border-border bg-card shadow-lg rounded-lg flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="h-5 w-5 text-destructive" />
                        <h2 className="font-bold text-lg">Fix Metric Dependencies</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        The metric <span className="font-bold text-foreground">{metric.name}</span> refers to fields that are not currently in your Data Model.
                    </p>

                    {hasSuggestions && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Proposed Changes</h3>
                            {Object.entries(tableGroups).map(([table, fields]) => (
                                <div key={table} className="border border-border rounded p-3 bg-muted/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TableIcon className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-sm">{table}</span>
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">
                                            Add {fields.length} Field{fields.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {fields.map(f => (
                                            <span key={f} className="text-xs font-mono bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {unresolvableFields.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-destructive">Unresolvable Fields</h3>
                            <div className="p-3 border border-destructive/20 bg-destructive/5 rounded text-sm text-destructive">
                                <p className="mb-2">Could not find these fields in the Schema Registry:</p>
                                <ul className="list-disc list-inside font-mono text-xs">
                                    {unresolvableFields.map(f => (
                                        <li key={f}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium hover:underline text-muted-foreground"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplySuggestions}
                        disabled={!hasSuggestions}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {hasSuggestions ? <CheckIcon className="h-4 w-4" /> : <AlertTriangleIcon className="h-4 w-4" />}
                        {hasSuggestions ? 'Apply Fixes' : 'Cannot Fix Automatically'}
                    </button>
                </div>
            </div>
        </div>
    );
};
