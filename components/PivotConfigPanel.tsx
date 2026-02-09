import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { ChevronDownIcon, GripVerticalIcon, XIcon, FolderIcon, PlusIcon } from './icons';
import ConfigManagerModal from './ConfigManagerModal';
import SaveConfigModal from './SaveConfigModal';
import { useAppState } from '../state/context';
import { ActionType } from '../state/actions';
import { PivotConfig, ItemTypes, Filter, FilterOperator, PivotValue, FieldAliases } from '../types';
import { prettifyFieldName } from '../utils/stringUtils';
import { inferDataType } from '../utils/metadataInference';

interface PivotConfigPanelProps {
    config: PivotConfig;
    filters: Filter[];
    onPivotChange: (field: string, targetZone: 'rows' | 'columns' | 'values') => void;
    onFilterChange: (field: string) => void;
    onFilterUpdate: (filter: Filter) => void;
    onRemovePivotItem: (item: string | number, zone: 'rows' | 'columns' | 'values') => void;
    onRemoveFilter: (id: string) => void;
    onPivotValueRename: (index: number, newName: string) => void;
    fieldAliases: FieldAliases;
    availableFields: string[];
}

const DropZone: React.FC<{ title: 'Rows' | 'Columns' | 'Values' | 'Filters', count: number, onDrop: (item: { name: string }) => void, children: React.ReactNode }> = ({ title, count, onDrop, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.FIELD,
        drop: onDrop,
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [onDrop]);

    drop(ref);

    const isActive = isOver && canDrop;

    return (
        <div ref={ref}>
            <details className="group" open>
                <summary className="flex items-center justify-between p-2 text-sm font-semibold bg-muted/30 border-y-2 border-border cursor-pointer list-none uppercase tracking-wide font-mono">
                    <span>{title} ({count})</span>
                    <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className={`p-2 space-y-1 min-h-[4rem] transition-colors ${isActive ? 'bg-primary/20' : 'bg-transparent'}`}>
                    {children}
                </div>
            </details>
        </div>
    )
};

const ConfigItem: React.FC<{ label: string, onRemove: () => void }> = ({ label, onRemove }) => (
    <div className="flex items-center space-x-2 bg-input border-2 border-border p-2 text-sm shadow-brutal">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-foreground">{prettifyFieldName(label)}</span>
        <button onClick={onRemove} className="p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors" aria-label={`Remove ${label}`}>
            <XIcon className="h-4 w-4 text-muted-foreground" />
        </button>
    </div>
);

const EditableConfigItem: React.FC<{
    value: PivotValue;
    onRemove: () => void;
    onRename: (newName: string) => void;
}> = ({ value, onRemove, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(value.displayName || `${value.aggregation.toUpperCase()} of ${prettifyFieldName(value.field)}`);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDoubleClick = () => setIsEditing(true);

    const handleBlur = () => {
        setIsEditing(false);
        onRename(name);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') inputRef.current?.blur();
    };

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setName(value.displayName || `${value.aggregation.toUpperCase()} of ${prettifyFieldName(value.field)}`);
    }, [value]);

    return (
        <div className="flex items-center space-x-2 bg-input border-2 border-border p-2 text-sm shadow-brutal">
            <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent p-0 m-0 border-none text-foreground focus:ring-0 w-full"
                    aria-label="Rename pivot value"
                />
            ) : (
                <span className="flex-1 truncate text-foreground" onDoubleClick={handleDoubleClick} title="Double-click to rename">{name}</span>
            )}
            <button onClick={onRemove} className="p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors" aria-label={`Remove ${name}`}>
                <XIcon className="h-4 w-4 text-muted-foreground" />
            </button>
        </div>
    );
};

const FilterControl: React.FC<{ filter: Filter; onUpdate: (filter: Filter) => void; onRemove: () => void; }> = ({ filter, onUpdate, onRemove }) => {
    const dataType = inferDataType(filter.field);
    const isNumeric = dataType === 'measure' || dataType === 'identifier';

    const stringOperators: FilterOperator[] = ['equals', 'contains'];
    const numericOperators: FilterOperator[] = ['equals', 'greater_than', 'less_than'];
    const availableOperators = isNumeric ? numericOperators : stringOperators;

    return (
        <div className="flex items-center space-x-1 bg-input border-2 border-border p-2 text-sm shadow-brutal">
            <span className="font-medium font-mono pr-1 text-primary" id={`filter-label-${filter.id}`}>{prettifyFieldName(filter.field)}</span>
            <select
                value={filter.operator}
                onChange={e => onUpdate({ ...filter, operator: e.target.value as FilterOperator })}
                className="brutal-select text-xs py-1"
                aria-label={`Operator for ${filter.field} filter`}
            >
                {availableOperators.map(op => <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>)}
            </select>
            <input
                type={isNumeric ? 'number' : 'text'}
                value={filter.value}
                onChange={e => onUpdate({ ...filter, value: e.target.value })}
                className="brutal-input w-full text-xs p-1"
                aria-labelledby={`filter-label-${filter.id}`}
            />
            <button onClick={onRemove} className="ml-1 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors" aria-label={`Remove ${filter.field} filter`}>
                <XIcon className="h-4 w-4 text-muted-foreground" />
            </button>
        </div>
    );
};

const PivotConfigPanel: React.FC<PivotConfigPanelProps & { onBatchUpdate: (config: PivotConfig, filters: Filter[]) => void, dispatch: React.Dispatch<any> }> = ({ config, filters, onPivotChange, onFilterChange, onFilterUpdate, onRemovePivotItem, onRemoveFilter, onPivotValueRename, fieldAliases, onBatchUpdate, dispatch, availableFields }) => {
    const [draftConfig, setDraftConfig] = useState<PivotConfig>(config);
    const [draftFilters, setDraftFilters] = useState<Filter[]>(filters);
    const [isDirty, setIsDirty] = useState(false);
    const [isConfigManagerOpen, setIsConfigManagerOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Sync drafts when props change externally (e.g. loading config), but ONLY if we haven't touched them or if we force it.
    // Actually, simple strategy: If props change, we update draft. This might overwrite local changes if global state updates elsewhere,
    // but in this specific "Apply" workflow, global state shouldn't change unless WE apply.
    // Exception: Analysis Sidebar field selection updates 'rows' in global state directly (per Requirement 3).
    // So we MUST sync props to draft to catch those sidebar changes.
    // Track previous config to calculate deltas
    const prevConfigRef = useRef<PivotConfig>(config);
    const prevFiltersRef = useRef<Filter[]>(filters);

    useEffect(() => {
        // If not dirty, simple sync
        if (!isDirty) {
            setDraftConfig(config);
            setDraftFilters(filters);
            prevConfigRef.current = config;
            prevFiltersRef.current = filters;
            return;
        }

        // --- Smart Merge Logic for Config ---
        const prevConfig = prevConfigRef.current;
        const newConfig = config;

        // Calculate fields added/removed in Global Config vs Previous Global
        // Helper to get all fields in a config
        const getAllFields = (c: PivotConfig) => new Set([...c.rows, ...c.columns, ...c.values.map(v => v.field)]);

        const prevFields = getAllFields(prevConfig);
        const nextFields = getAllFields(newConfig);

        const addedFields = [...nextFields].filter(f => !prevFields.has(f));
        const removedFields = [...prevFields].filter(f => !nextFields.has(f));

        if (addedFields.length > 0 || removedFields.length > 0) {
            console.log('Smart Merge Triggered', { addedFields, removedFields });
            setDraftConfig(currentDraft => {
                const nextDraft = { ...currentDraft };

                // Add new fields (default to Rows if not specified, or just let user add them? 
                // Requirement 3 says "selecting adds to rows". So we should respect that.)
                // We check where they were added in the NEW config.
                addedFields.forEach(field => {
                    // Check zone in newConfig
                    if (newConfig.rows.includes(field)) nextDraft.rows = [...nextDraft.rows, field];
                    if (newConfig.columns.includes(field)) nextDraft.columns = [...nextDraft.columns, field];
                    if (newConfig.values.some(v => v.field === field)) {
                        const val = newConfig.values.find(v => v.field === field);
                        if (val) nextDraft.values = [...nextDraft.values, val];
                    }
                });

                // Remove fields
                removedFields.forEach(field => {
                    nextDraft.rows = nextDraft.rows.filter(f => f !== field);
                    nextDraft.columns = nextDraft.columns.filter(f => f !== field);
                    nextDraft.values = nextDraft.values.filter(v => v.field !== field);
                });

                return nextDraft;
            });
        }

        // Update refs
        prevConfigRef.current = newConfig;

        // --- Smart Merge for Filters (Simple append/remove) ---
        // For filters, it's safer to just append new ones and remove missing ones? 
        // Or just let local overrides win? 
        // Let's apply similar delta logic if needed, but for now strict sync on filters might be annoying if typing.
        // But filters are usually added explicitly.
        // If global filters change (e.g. LOAD), we probably want to load them.
        // But we are in "Dirty" state.
        // Let's stick to Config merge for now as that was the main pain point.

    }, [config, filters, isDirty]);

    const handlePivotChange = (field: string, targetZone: 'rows' | 'columns' | 'values') => {
        console.log('handlePivotChange', { field, targetZone, prevConfig: draftConfig });
        const newConfig = {
            rows: [...draftConfig.rows],
            columns: [...draftConfig.columns],
            values: [...draftConfig.values]
        };
        const dataType = inferDataType(field);

        if (targetZone === 'values') {
            const aggregation = dataType === 'measure' ? 'SUM' : 'COUNT';
            newConfig.values = [...newConfig.values, { field, aggregation }];
        } else {
            // Remove from other zones if it's already there (moving behavior)
            newConfig.rows = newConfig.rows.filter(f => f !== field);
            newConfig.columns = newConfig.columns.filter(f => f !== field);
            newConfig.values = newConfig.values.filter(v => v.field !== field);
            newConfig[targetZone] = [...newConfig[targetZone], field];
        }
        console.log('handlePivotChange Result:', newConfig);
        setDraftConfig(newConfig);
        setIsDirty(true);
    };

    const handleFilterAdd = (field: string) => {
        // Prevent Adding duplicate if field already filtered? Or allow multiple? Assuming one per field for now or unique ID.
        const newFilter: Filter = {
            id: crypto.randomUUID(),
            field: field,
            operator: 'equals',
            value: ''
        };
        setDraftFilters([...draftFilters, newFilter]);
        setIsDirty(true);
    };

    const handleFilterUpdateLocal = (updatedFilter: Filter) => {
        setDraftFilters(draftFilters.map(f => f.id === updatedFilter.id ? updatedFilter : f));
        setIsDirty(true);
    };

    const handleRemoveFilterLocal = (id: string) => {
        setDraftFilters(draftFilters.filter(f => f.id !== id));
        setIsDirty(true);
    };

    const handleRemovePivotItemLocal = (item: string | number, zone: 'rows' | 'columns' | 'values') => {
        const newConfig = { ...draftConfig };
        if (zone === 'values') {
            newConfig.values = draftConfig.values.filter((_, index) => index !== item);
        } else {
            newConfig[zone] = (newConfig[zone] as string[]).filter(field => field !== item);
        }
        setDraftConfig(newConfig);
        setIsDirty(true);
    };

    const handlePivotValueRenameLocal = (index: number, newName: string) => {
        const newValues = [...draftConfig.values];
        newValues[index] = { ...newValues[index], displayName: newName };
        setDraftConfig({ ...draftConfig, values: newValues });
        setIsDirty(true);
    };

    const handleApply = () => {
        onBatchUpdate(draftConfig, draftFilters);
        setIsDirty(false);
    };

    const handleClear = () => {
        setDraftConfig({ rows: [], columns: [], values: [] });
        setDraftFilters([]);
        setIsDirty(true);
    };

    return (
        <aside className="w-72 h-full bg-card border-l-2 border-border flex flex-col shadow-brutal-left flex-shrink-0 relative">
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="p-4 border-b-2 border-border bg-card">
                    <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide font-mono mb-2">
                        <span>Create Pivot / Filter</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsConfigManagerOpen(true)}
                            className="flex-1 brutal-button-secondary py-1 px-2 text-[10px] flex items-center justify-center gap-1"
                        >
                            <FolderIcon className="h-3 w-3" /> Load
                        </button>
                        <button
                            onClick={() => setIsSaveModalOpen(true)}
                            className="flex-1 brutal-button-secondary py-1 px-2 text-[10px] flex items-center justify-center gap-1"
                        >
                            <PlusIcon className="h-3 w-3" /> Save
                        </button>
                    </div>
                </div>

                <div className="text-foreground">
                    <DropZone title="Filters" count={draftFilters.length} onDrop={(item) => handleFilterAdd(item.name)}>
                        {draftFilters.map(filter => {
                            const alias = Object.values(fieldAliases).find((_, i) => Object.keys(fieldAliases)[i].endsWith(`.${filter.field}`));
                            return (
                                <FilterControl
                                    key={filter.id}
                                    filter={{ ...filter, field: alias || filter.field }}
                                    onUpdate={handleFilterUpdateLocal}
                                    onRemove={() => handleRemoveFilterLocal(filter.id)}
                                />
                            );
                        })}
                        {draftFilters.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Drop fields here to create filters</p>}
                    </DropZone>
                    <DropZone title="Rows" count={draftConfig.rows.length} onDrop={(item) => handlePivotChange(item.name, 'rows')}>
                        {draftConfig.rows.map(field => {
                            const alias = Object.values(fieldAliases).find((_, i) => Object.keys(fieldAliases)[i].endsWith(`.${field}`));
                            return (
                                <ConfigItem
                                    key={field}
                                    label={alias || field}
                                    onRemove={() => handleRemovePivotItemLocal(field, 'rows')}
                                />
                            );
                        })}
                        {draftConfig.rows.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Drop fields here</p>}
                    </DropZone>
                    <DropZone title="Columns" count={draftConfig.columns.length} onDrop={(item) => handlePivotChange(item.name, 'columns')}>
                        {draftConfig.columns.map(field => {
                            const alias = Object.values(fieldAliases).find((_, i) => Object.keys(fieldAliases)[i].endsWith(`.${field}`));
                            return (
                                <ConfigItem
                                    key={field}
                                    label={alias || field}
                                    onRemove={() => handleRemovePivotItemLocal(field, 'columns')}
                                />
                            );
                        })}
                        {draftConfig.columns.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Drop fields here</p>}
                    </DropZone>
                    <DropZone title="Values" count={draftConfig.values.length} onDrop={(item) => handlePivotChange(item.name, 'values')}>
                        {draftConfig.values.map((val, index) => (
                            <EditableConfigItem
                                key={`${val.field}-${index}`}
                                value={val}
                                onRename={(newName) => handlePivotValueRenameLocal(index, newName)}
                                onRemove={() => handleRemovePivotItemLocal(index, 'values')}
                            />
                        ))}
                        {draftConfig.values.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Drop fields here</p>}
                    </DropZone>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t-2 border-border shadow-brutal-up flex space-x-2">
                <button
                    onClick={handleClear}
                    disabled={draftConfig.rows.length === 0 && draftConfig.columns.length === 0 && draftConfig.values.length === 0 && draftFilters.length === 0}
                    className="brutal-button-secondary flex-1 text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear All
                </button>
                <button
                    onClick={handleApply}
                    disabled={!isDirty}
                    className="brutal-button-primary flex-1 text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDirty ? 'Apply' : 'No Changes'}
                </button>
            </div>

            <ConfigManagerModal
                isOpen={isConfigManagerOpen}
                onClose={() => setIsConfigManagerOpen(false)}
                type="analysis_config"
                availableFields={availableFields}
                onLoad={(config, name) => {
                    // When loading config, we update the Global State essentially via dispatch, 
                    // BUT PivotConfigPanel is controlled by App, so we dispatch to App 
                    // and let App flow props back down.
                    dispatch({ type: ActionType.LOAD_ANALYSIS_CONFIG, payload: config });
                    dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name });
                    setIsConfigManagerOpen(false);
                }}
                userId={useAppState().currentUser?.id}
            />

            <SaveConfigModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                type="analysis_config"
                configData={{
                    pivotConfig: draftConfig,
                    filters: draftFilters
                }}
                onSaveSuccess={(name) => {
                    dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name });
                    setIsSaveModalOpen(false);
                }}
            />
        </aside >
    );
};

export default PivotConfigPanel;
