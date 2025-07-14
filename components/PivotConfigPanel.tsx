import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { ChevronDownIcon, GripVerticalIcon, XIcon } from './icons';
import { PivotConfig, ItemTypes, Filter, FilterOperator, PivotValue } from '../types';

interface PivotConfigPanelProps {
    config: PivotConfig;
    filters: Filter[];
    onPivotChange: (field: string, targetZone: 'rows' | 'columns' | 'values') => void;
    onFilterChange: (field: string) => void;
    onFilterUpdate: (filter: Filter) => void;
    onRemovePivotItem: (item: string | number, zone: 'rows' | 'columns' | 'values') => void;
    onRemoveFilter: (id: string) => void;
    onPivotValueRename: (index: number, newName: string) => void;
}

const DropZone: React.FC<{title: 'Rows' | 'Columns' | 'Values' | 'Filters', count: number, onDrop: (item: {name: string}) => void, children: React.ReactNode}> = ({ title, count, onDrop, children }) => {
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
                <summary className="flex items-center justify-between p-2 text-sm font-semibold bg-gray-50 dark:bg-slate-700/50 border-y border-gray-200 dark:border-slate-700 cursor-pointer list-none">
                    <span>{title} ({count})</span>
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className={`p-2 space-y-1 min-h-[4rem] transition-colors rounded-md ${isActive ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-transparent'}`}>
                    {children}
                </div>
            </details>
        </div>
    )
};

const ConfigItem: React.FC<{label: string, onRemove: () => void}> = ({label, onRemove}) => (
    <div className="flex items-center space-x-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm shadow-sm">
        <GripVerticalIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
        <span className="flex-1">{label}</span>
        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600" aria-label={`Remove ${label}`}>
          <XIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
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
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm shadow-sm">
            <GripVerticalIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent dark:bg-slate-600 p-0 m-0 border-none focus:ring-0 w-full"
                    aria-label="Rename pivot value"
                />
            ) : (
                <span className="flex-1 truncate" onDoubleClick={handleDoubleClick} title="Double-click to rename">{name}</span>
            )}
            <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600" aria-label={`Remove ${name}`}>
                <XIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
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
        <div className="flex items-center space-x-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm shadow-sm">
             <span className="font-medium pr-1" id={`filter-label-${filter.id}`}>{filter.field}</span>
             <select 
                value={filter.operator} 
                onChange={e => onUpdate({ ...filter, operator: e.target.value as FilterOperator })}
                className="text-xs border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-200 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                aria-label={`Operator for ${filter.field} filter`}
             >
                {availableOperators.map(op => <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>)}
             </select>
             <input 
                type={isNumeric ? 'number' : 'text'}
                value={filter.value}
                onChange={e => onUpdate({ ...filter, value: e.target.value })}
                className="w-full text-xs p-1 border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-200 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                aria-labelledby={`filter-label-${filter.id}`}
             />
             <button onClick={onRemove} className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600" aria-label={`Remove ${filter.field} filter`}>
                <XIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            </button>
        </div>
    );
};

const PivotConfigPanel: React.FC<PivotConfigPanelProps> = ({ config, filters, onPivotChange, onFilterChange, onFilterUpdate, onRemovePivotItem, onRemoveFilter, onPivotValueRename }) => {

    return (
        <aside className="w-72 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col shadow-lg flex-shrink-0">
             <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Create Pivot / Filter</span>
                    </div>
                </div>

                <div className="text-gray-800 dark:text-slate-200">
                    <DropZone title="Filters" count={filters.length} onDrop={(item) => onFilterChange(item.name)}>
                        {filters.map(filter => <FilterControl key={filter.id} filter={filter} onUpdate={onFilterUpdate} onRemove={() => onRemoveFilter(filter.id)} />)}
                        {filters.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 text-center p-4">Drop fields here to create filters</p>}
                    </DropZone>
                    <DropZone title="Rows" count={config.rows.length} onDrop={(item) => onPivotChange(item.name, 'rows')}>
                        {config.rows.map(field => <ConfigItem key={field} label={field} onRemove={() => onRemovePivotItem(field, 'rows')} />)}
                        {config.rows.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 text-center p-4">Drop fields here</p>}
                    </DropZone>
                    <DropZone title="Columns" count={config.columns.length} onDrop={(item) => onPivotChange(item.name, 'columns')}>
                        {config.columns.map(field => <ConfigItem key={field} label={field} onRemove={() => onRemovePivotItem(field, 'columns')} />)}
                         {config.columns.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 text-center p-4">Drop fields here</p>}
                    </DropZone>
                    <DropZone title="Values" count={config.values.length} onDrop={(item) => onPivotChange(item.name, 'values')}>
                        {config.values.map((val, index) => (
                            <EditableConfigItem
                                key={`${val.field}-${index}`}
                                value={val}
                                onRename={(newName) => onPivotValueRename(index, newName)}
                                onRemove={() => onRemovePivotItem(index, 'values')}
                            />
                        ))}
                         {config.values.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 text-center p-4">Drop fields here</p>}
                    </DropZone>
                </div>
            </div>
        </aside>
    );
};

export default PivotConfigPanel;