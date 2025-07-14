
import React, { useState, useRef, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { SearchIcon, ChevronDownIcon } from './icons';
import { ItemTypes, FieldGroups } from '../types';

interface DataFieldsPanelProps {
    selectedFields: string[];
    onFieldChange: (field: string, isSelected: boolean) => void;
    fieldGroups: FieldGroups;
    allAvailableFields: string[];
}

interface DraggableFieldItemProps {
    field: string;
    isChecked: boolean;
    onToggle: (field: string, isChecked: boolean) => void;
}

const DraggableFieldItem: React.FC<DraggableFieldItemProps> = ({field, isChecked, onToggle}) => {
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
        <div ref={ref} className={`flex items-center space-x-2 p-2 rounded-md cursor-grab ${isDragging ? 'opacity-50 bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <label className="flex items-center space-x-2 flex-1 cursor-pointer">
                 <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggle(field, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title={`${isChecked ? 'Remove' : 'Add'} ${field}`}
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">{field.replace(/_/g, ' ')}</span>
            </label>
        </div>
    );
};


const DataFieldsPanel: React.FC<DataFieldsPanelProps> = ({ selectedFields, onFieldChange, fieldGroups, allAvailableFields }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const displayedGroups = useMemo(() => {
    // Create a new fieldGroups object that includes all available fields, not just selected ones.
    const allGroupedFields = new Set(Object.values(fieldGroups).flat());
    const uncategorized = allAvailableFields.filter(f => !allGroupedFields.has(f));

    const fullFieldGroups: FieldGroups = { ...fieldGroups };
    if (uncategorized.length > 0) {
        fullFieldGroups['Uncategorized'] = [...(fullFieldGroups['Uncategorized'] || []), ...uncategorized];
    }

    return Object.entries(fullFieldGroups).map(([groupName, fieldsInGroup]) => {
        const visibleFields = [...new Set(fieldsInGroup)] // Ensure unique fields
            .filter(field => allAvailableFields.includes(field)) // Only show fields actually available from source
            .filter(field => field.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return { groupName, fields: visibleFields };
    }).filter(group => group.fields.length > 0);
  }, [fieldGroups, allAvailableFields, searchTerm]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Available Fields ({selectedFields.length})</h2>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            </div>
            <input 
            type="text" 
            placeholder="Search fields (e.g. country)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
            />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {displayedGroups.length > 0 ? displayedGroups.map(({ groupName, fields }) => (
            <details key={groupName} className="group/sub" open>
                <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md list-none">
                    <span className="font-semibold text-sm">{groupName}</span>
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open/sub:rotate-180 transition-transform" />
                </summary>
                <div className="pl-4 pt-1 border-l-2 border-gray-200 dark:border-slate-600 ml-2">
                    {fields.map(field => (
                        <DraggableFieldItem
                            key={field}
                            field={field}
                            isChecked={selectedFields.includes(field)}
                            onToggle={onFieldChange}
                        />
                    ))}
                </div>
            </details>
        )) : (
            <p className="px-4 py-2 text-sm text-gray-400 dark:text-slate-500">
                {searchTerm ? 'No matching fields found.' : 'No fields available. Select tables in the DB Configuration panel.'}
            </p>
        )}
      </div>
    </div>
  );
};

export default DataFieldsPanel;