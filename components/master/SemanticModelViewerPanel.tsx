import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ActionType, AppAction } from '../../state/actions';
import { AppState } from '../../types';
import { DatabaseIcon, EditIcon, CheckIcon, XIcon, ChevronRightIcon } from '../icons';
import { generateSemanticContext } from '../../utils/contextBuilder';
import { encoding_for_model } from 'js-tiktoken';

interface SemanticModelViewerPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const SemanticModelViewerPanel: React.FC<SemanticModelViewerPanelProps> = ({ state, dispatch }) => {
    const { modelConfiguration, joins, fieldMetadata, metrics, schemaRegistry, sampleValues } = state;

    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingField]);

    // Generate semantic context
    const semanticContext = useMemo(() => {
        return generateSemanticContext({
            modelConfiguration,
            joins,
            fieldMetadata,
            metrics,
            schemaRegistry: schemaRegistry || undefined,
            sampleValues,
        });
    }, [modelConfiguration, joins, fieldMetadata, metrics, schemaRegistry, sampleValues]);

    // Calculate token count
    const tokenCount = useMemo(() => {
        try {
            const encoder = encoding_for_model('gpt-3.5-turbo');
            const tokens = encoder.encode(semanticContext);
            encoder.free();
            return tokens.length;
        } catch (error) {
            console.error('Token encoding error:', error);
            return 0;
        }
    }, [semanticContext]);

    const handleStartEditing = (fieldKey: string, currentDescription: string) => {
        setEditingField(fieldKey);
        setTempValue(currentDescription);
    };

    const handleSaveDescription = () => {
        if (editingField) {
            const [tableName, fieldName] = editingField.split('.');
            const currentMeta = fieldMetadata[editingField] || {};

            dispatch({
                type: ActionType.SET_FIELD_METADATA,
                payload: {
                    fieldKey: editingField,
                    metadata: { ...currentMeta, description: tempValue.trim() }
                }
            });
            setEditingField(null);
        }
    };

    const handleCancelEditing = () => {
        setEditingField(null);
    };

    const tableNames = Object.keys(modelConfiguration);

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Tables Section */}
                <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tables & Fields</h3>

                    {tableNames.length > 0 ? (
                        tableNames.map(tableName => {
                            const fields = modelConfiguration[tableName] || [];
                            const registryTable = schemaRegistry?.tables.find(t =>
                                t.name.toLowerCase() === tableName.toLowerCase()
                            );
                            const tableDescription = registryTable?.description || '';

                            return (
                                <div key={tableName} className="border border-border rounded-md overflow-hidden">
                                    <details className="group" open>
                                        <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 list-none select-none bg-card">
                                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
                                            <DatabaseIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                                <span className="text-sm font-bold uppercase tracking-tight text-primary truncate">
                                                    {tableName}
                                                </span>
                                                {tableDescription && (
                                                    <span className="text-[10px] text-muted-foreground/70 italic truncate">
                                                        {tableDescription}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                {fields.length} fields
                                            </span>
                                        </summary>

                                        {/* Fields List */}
                                        <div className="bg-background border-t border-border">
                                            {fields.map(fieldName => {
                                                const fieldKey = `${tableName}.${fieldName}`;
                                                const meta = fieldMetadata[fieldKey];
                                                const samples = sampleValues[fieldKey] || [];
                                                const isEditing = editingField === fieldKey;
                                                const description = meta?.description || '';
                                                const dataType = meta?.dataType || '';

                                                return (
                                                    <div key={fieldName} className="border-b border-border last:border-b-0 p-3 hover:bg-muted/20 transition-colors">
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <span className="text-xs font-mono text-foreground font-medium">
                                                                {fieldName}
                                                            </span>
                                                            {dataType && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase tracking-wider">
                                                                    {dataType}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Description - Inline Editable */}
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1 bg-background border-2 border-primary p-0.5 mb-2">
                                                                <input
                                                                    ref={inputRef}
                                                                    type="text"
                                                                    value={tempValue}
                                                                    onChange={(e) => setTempValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveDescription();
                                                                        if (e.key === 'Escape') handleCancelEditing();
                                                                    }}
                                                                    onBlur={handleSaveDescription}
                                                                    className="flex-1 bg-transparent border-none text-[10px] focus:ring-0 p-1 font-mono"
                                                                    placeholder="Field description..."
                                                                />
                                                                <button
                                                                    onClick={handleSaveDescription}
                                                                    className="text-green-500 hover:text-green-600 p-1"
                                                                >
                                                                    <CheckIcon className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEditing}
                                                                    className="text-red-500 hover:text-red-600 p-1"
                                                                >
                                                                    <XIcon className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center group/desc mb-2">
                                                                <p className="text-[10px] text-muted-foreground/70 italic flex-1 pr-2">
                                                                    {description || 'No description available'}
                                                                </p>
                                                                <button
                                                                    onClick={() => handleStartEditing(fieldKey, description)}
                                                                    className="opacity-0 group-hover/desc:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity shrink-0"
                                                                >
                                                                    <EditIcon className="h-2.5 w-2.5" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Sample Values */}
                                                        {samples.length > 0 && (
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-bold shrink-0">
                                                                    Samples:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {samples.slice(0, 3).map((sample, idx) => {
                                                                        const displayValue = String(sample).length > 50
                                                                            ? String(sample).substring(0, 50) + '...'
                                                                            : String(sample);
                                                                        return (
                                                                            <span
                                                                                key={idx}
                                                                                className="text-[9px] px-1.5 py-0.5 bg-muted/40 text-muted-foreground font-mono rounded"
                                                                                title={String(sample)}
                                                                            >
                                                                                {displayValue}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                            <DatabaseIcon className="h-8 w-8 opacity-20" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">
                                No tables in model. Add tables from Structure tab.
                            </p>
                        </div>
                    )}
                </div>

                {/* Metrics Section */}
                {metrics && metrics.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Metrics</h3>

                        {metrics.map(metric => (
                            <div key={metric.id} className="border border-border rounded-md overflow-hidden">
                                <details className="group">
                                    <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 list-none select-none bg-card">
                                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
                                        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                            <span className="text-sm font-bold text-primary truncate">
                                                {metric.name}
                                            </span>
                                            {metric.description && (
                                                <span className="text-[10px] text-muted-foreground/70 italic truncate">
                                                    {metric.description}
                                                </span>
                                            )}
                                        </div>
                                    </summary>

                                    <div className="bg-background border-t border-border p-3 space-y-2">
                                        <div>
                                            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-bold">
                                                Formula:
                                            </span>
                                            <pre className="text-[10px] mt-1 p-2 bg-muted/20 rounded font-mono text-foreground overflow-x-auto">
                                                {metric.formula}
                                            </pre>
                                        </div>

                                        {metric.requiredFields && metric.requiredFields.length > 0 && (
                                            <div>
                                                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-bold">
                                                    Required Fields:
                                                </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {metric.requiredFields.map((field, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary font-mono rounded"
                                                        >
                                                            {field}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                )}

                {/* Joins Section */}
                {joins && joins.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Relationships</h3>

                        {joins.map((join, idx) => (
                            <div key={idx} className="border border-border rounded-md p-3 bg-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-mono text-foreground font-medium">
                                        {join.from}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold uppercase tracking-wider">
                                        {join.type}
                                    </span>
                                    <span className="text-xs font-mono text-foreground font-medium">
                                        {join.to}
                                    </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    ON {join.on.from} = {join.on.to}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Generated Context Preview */}
                <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Generated Context</h3>

                    <div className="border border-border rounded-md overflow-hidden">
                        <details className="group">
                            <summary className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-muted/40 list-none select-none bg-card">
                                <div className="flex items-center gap-2">
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                                    <span className="text-xs font-medium text-foreground">
                                        Preview AI Context
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {semanticContext.length} chars
                                </span>
                            </summary>

                            <div className="bg-background border-t border-border p-3">
                                <pre className="text-[9px] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto custom-scrollbar">
                                    {semanticContext}
                                </pre>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            {/* Token Counter Footer */}
            <div className="border-t border-border bg-card p-3 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        Token Count
                    </span>
                    <span className={`text-sm font-mono font-bold ${tokenCount > 2500 ? 'text-amber-500' : 'text-primary'}`}>
                        {tokenCount.toLocaleString()} tokens
                    </span>
                </div>
                {tokenCount > 2500 && (
                    <p className="text-[9px] text-amber-500/80 mt-1 italic">
                        Warning: High token count may affect AI performance
                    </p>
                )}
            </div>
        </div>
    );
};

export default SemanticModelViewerPanel;
