
import React, { useState, useRef, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { SearchIcon, ChevronDownIcon } from './icons';
import { ItemTypes, FieldGroups, FieldAliases } from '../types';
import { prettifyFieldName } from '../utils/stringUtils';

interface DataFieldsPanelProps {
    selectedFields: string[];
    onFieldChange: (field: string, isSelected: boolean) => void;
    fieldGroups: FieldGroups;
    allAvailableFields: string[];
    fieldAliases: FieldAliases;
    metrics: import('../types').Metric[];
    hiddenFields: Set<string>;
}

interface DraggableFieldItemProps {
    field: string;
    alias?: string;
    isChecked: boolean;
    onToggle: (field: string, isChecked: boolean) => void;
}

const DraggableFieldItem: React.FC<DraggableFieldItemProps> = ({ field, alias, isChecked, onToggle }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FIELD,
        item: { name: field },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    drag(ref);

    return (
        <div ref={ref} className={`flex items-center space-x-2 p-2 cursor-grab ${isDragging ? 'opacity-50 bg-primary/20' : 'hover:bg-muted'}`}>
            <label className="flex items-center space-x-2 flex-1 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggle(field, e.target.checked)}
                    className="brutal-checkbox cursor-pointer"
                    title={`${isChecked ? 'Remove' : 'Add'} ${field}`}
                />
                <div className="flex flex-col">
                    <span className={`text-sm ${alias ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {alias || prettifyFieldName(field)}
                    </span>
                    {alias && (
                        <span className="text-[10px] text-muted-foreground italic -mt-1">
                            orig: {field}
                        </span>
                    )}
                </div>
            </label>
        </div>
    );
};


const DataFieldsPanel: React.FC<DataFieldsPanelProps> = ({ selectedFields, onFieldChange, fieldGroups, allAvailableFields, fieldAliases, metrics, hiddenFields }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const displayedGroups = useMemo(() => {
        // Filter out hidden fields first
        const visibleAvailableFields = allAvailableFields.filter(f => !hiddenFields.has(f));

        const allGroupedFields = new Set(Object.values(fieldGroups).flat());
        const uncategorized = visibleAvailableFields.filter(f => !allGroupedFields.has(f));

        const fullFieldGroups: FieldGroups = { ...fieldGroups };
        if (uncategorized.length > 0) {
            fullFieldGroups['Uncategorized'] = [...(fullFieldGroups['Uncategorized'] || []), ...uncategorized];
        }

        const seenFields = new Set<string>();

        return Object.entries(fullFieldGroups).map(([groupName, fieldsInGroup]) => {
            const uniqueFields = [...new Set(fieldsInGroup)];
            const visibleFields = uniqueFields
                .filter(field => {
                    // Check if field is hidden or already seen
                    if (hiddenFields.has(field) || seenFields.has(field)) return false;

                    const exists = visibleAvailableFields.includes(field);
                    const matchesSearch = field.toLowerCase().includes(searchTerm.toLowerCase());
                    if (exists && matchesSearch) {
                        seenFields.add(field);
                        return true;
                    }
                    return false;
                });

            return { groupName, fields: visibleFields };
        }).filter(group => group.fields.length > 0);
    }, [fieldGroups, allAvailableFields, searchTerm, hiddenFields]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 flex-shrink-0 border-b-2 border-border">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide font-mono">Fields ({selectedFields.length})</h2>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search fields (e.g. country)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="brutal-input w-full !pl-12 pr-4 py-2 text-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {displayedGroups.length > 0 ? displayedGroups.map(({ groupName, fields }) => (
                    <details key={groupName} className="group/sub" open>
                        <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted list-none">
                            <span className="font-semibold text-sm text-foreground uppercase tracking-wide">{groupName}</span>
                            <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open/sub:rotate-180 transition-transform" />
                        </summary>
                        <div className="pl-4 pt-1 border-l-2 border-border ml-2">
                            {fields.map(field => {
                                const metric = metrics.find(m => m.id === field);
                                const displayName = metric ? metric.name : (fieldAliases[`${groupName.toLowerCase()}.${field}`] || fieldAliases[`${groupName}.${field}`] || prettifyFieldName(field));

                                return (
                                    <DraggableFieldItem
                                        key={field}
                                        field={field}
                                        isChecked={selectedFields.includes(field)}
                                        onToggle={onFieldChange}
                                        alias={metric ? displayName : (fieldAliases[`${groupName.toLowerCase()}.${field}`] || fieldAliases[`${groupName}.${field}`])}
                                    />
                                );
                            })}
                        </div>
                    </details>
                )) : (
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No matching fields found.' : 'No fields available. Select tables in the DB Configuration panel.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default DataFieldsPanel;
