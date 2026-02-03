import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { ChevronDownIcon, GripVerticalIcon, XIcon } from './icons';
import { PivotConfig, ItemTypes, Filter, FilterOperator, PivotValue, FieldAliases } from '../types';

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
    }));

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
        <span className="flex-1 text-foreground">{label}</span>
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
    const [name, setName] = useState(value.displayName || `${value.aggregation.toUpperCase()} of ${value.field}`);
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
        setName(value.displayName || `${value.aggregation.toUpperCase()} of ${value.field}`);
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
    const isNumeric = ['total_jobs', 'total_positions', 'source_id', 'job_id'].includes(filter.field);

    const stringOperators: FilterOperator[] = ['equals', 'contains'];
    const numericOperators: FilterOperator[] = ['equals', 'greater_than', 'less_than'];
    const availableOperators = isNumeric ? numericOperators : stringOperators;

    return (
        <div className="flex items-center space-x-1 bg-input border-2 border-border p-2 text-sm shadow-brutal">
            <span className="font-medium font-mono pr-1 text-primary" id={`filter-label-${filter.id}`}>{filter.field}</span>
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

const PivotConfigPanel: React.FC<PivotConfigPanelProps & { onBatchUpdate: (config: PivotConfig, filters: Filter[]) => void }> = ({ config, filters, onPivotChange, onFilterChange, onFilterUpdate, onRemovePivotItem, onRemoveFilter, onPivotValueRename, fieldAliases, onBatchUpdate }) => {
    const [draftConfig, setDraftConfig] = useState<PivotConfig>(config);
    const [draftFilters, setDraftFilters] = useState<Filter[]>(filters);
    const [isDirty, setIsDirty] = useState(false);

    // Sync drafts when props change externally (e.g. loading config), but ONLY if we haven't touched them or if we force it.
    // Actually, simple strategy: If props change, we update draft. This might overwrite local changes if global state updates elsewhere,
    // but in this specific "Apply" workflow, global state shouldn't change unless WE apply.
    // Exception: Analysis Sidebar field selection updates 'rows' in global state directly (per Requirement 3).
    // So we MUST sync props to draft to catch those sidebar changes.
    useEffect(() => {
        setDraftConfig(config);
        setDraftFilters(filters);
        setIsDirty(false);
    }, [config, filters]);

    const handlePivotChange = (field: string, targetZone: 'rows' | 'columns' | 'values') => {
        const newConfig = { ...draftConfig };
        const numericFields = ['total_jobs', 'total_positions', 'source_id'];

        if (targetZone === 'values') {
            const aggregation = numericFields.includes(field) ? 'SUM' : 'COUNT';
            newConfig.values = [...newConfig.values, { field, aggregation }];
        } else {
            // Remove from other zones if needed (standard pivot behavior usually moves items)
            newConfig.rows = newConfig.rows.filter(f => f !== field);
            newConfig.columns = newConfig.columns.filter(f => f !== field);
            newConfig.values = newConfig.values.filter(v => v.field !== field);
            newConfig[targetZone] = [...newConfig[targetZone], field];
        }
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

    return (
        <aside className="w-72 bg-card border-l-2 border-border flex flex-col shadow-brutal-left flex-shrink-0 relative">
            <div className="flex-1 overflow-y-auto pb-16">
                <div className="p-4 border-b-2 border-border bg-card">
                    <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide font-mono">
                        <span>Create Pivot / Filter</span>
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
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t-2 border-border shadow-brutal-up">
                <button
                    onClick={handleApply}
                    disabled={!isDirty}
                    className="brutal-button-primary w-full text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDirty ? 'Apply Changes' : 'No Changes'}
                </button>
            </div>
        </aside>
    );
};

export default PivotConfigPanel;
