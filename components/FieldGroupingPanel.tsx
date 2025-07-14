import React, { useState, useRef } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { ChevronDownIcon, GripVerticalIcon, PlusIcon, XIcon, MoveIcon } from './icons';
import { FieldGroups, ItemTypes } from '../types';

interface FieldGroupingPanelProps {
    groups: FieldGroups;
    setGroups: React.Dispatch<React.SetStateAction<FieldGroups>>;
    allFields: string[];
}

interface DraggableGroupProps {
    groupName: string;
    fields: string[];
    onFieldDrop: (groupName: string, fieldName: string) => void;
    onRemoveField: (groupName: string, fieldName: string) => void;
    onRemoveGroup: (groupName: string) => void;
}

const DraggableField: React.FC<{ fieldName: string }> = ({ fieldName }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FIELD,
        item: { name: fieldName },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));
    drag(ref);
    return (
        <div ref={ref} className={`flex items-center space-x-2 p-1 pl-2 text-sm rounded cursor-grab ${isDragging ? 'opacity-50' : ''}`}>
            <MoveIcon className="h-4 w-4 text-gray-400" />
            <span>{fieldName}</span>
        </div>
    );
};

const GroupDropZone: React.FC<DraggableGroupProps> = ({ groupName, fields, onFieldDrop, onRemoveField, onRemoveGroup }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.FIELD,
        drop: (item: { name: string }) => onFieldDrop(groupName, item.name),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));
    drop(ref);

    return (
        <details className="group" open>
            <summary className="flex items-center justify-between p-2 text-sm font-semibold bg-gray-50 dark:bg-slate-700/50 border-y border-gray-200 dark:border-slate-700 cursor-pointer list-none">
                <span>{groupName} ({fields.length})</span>
                <div className="flex items-center">
                   {groupName !== 'Uncategorized' && (
                        <button onClick={() => onRemoveGroup(groupName)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 mr-2">
                            <XIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        </button>
                    )}
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open:rotate-180 transition-transform" />
                </div>
            </summary>
            <div ref={ref} className={`p-2 space-y-1 min-h-[4rem] transition-colors ${isOver ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-transparent'}`}>
                {fields.map(field => (
                     <div key={field} className="flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                        <DraggableField fieldName={field} />
                        <button onClick={() => onRemoveField(groupName, field)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600">
                             <XIcon className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>
                ))}
                {fields.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 text-center p-4">Drag fields here</p>}
            </div>
        </details>
    )
}


const FieldGroupingPanel: React.FC<FieldGroupingPanelProps> = ({ groups, setGroups, allFields }) => {
    const [newGroupName, setNewGroupName] = useState('');

    const handleFieldDrop = (targetGroup: string, fieldName: string) => {
        setGroups(prev => {
            const newGroups = { ...prev };
            // Remove field from any other group
            Object.keys(newGroups).forEach(g => {
                newGroups[g] = newGroups[g].filter(f => f !== fieldName);
            });
            // Add field to the target group
            if (!newGroups[targetGroup]) newGroups[targetGroup] = [];
            if (!newGroups[targetGroup].includes(fieldName)) {
                newGroups[targetGroup].push(fieldName);
            }
            return newGroups;
        });
    };

    const handleRemoveField = (groupName: string, fieldName: string) => {
        setGroups(prev => {
            const newGroups = {...prev};
            newGroups[groupName] = newGroups[groupName].filter(f => f !== fieldName);
            // Move to uncategorized
            if(!newGroups['Uncategorized']) newGroups['Uncategorized'] = [];
            newGroups['Uncategorized'].push(fieldName);
            return newGroups;
        })
    }

    const handleAddGroup = () => {
        if(newGroupName.trim() && !groups[newGroupName.trim()]) {
            setGroups(prev => ({...prev, [newGroupName.trim()]: []}));
            setNewGroupName('');
        }
    }
    
    const handleRemoveGroup = (groupName: string) => {
        setGroups(prev => {
            const newGroups = {...prev};
            const fieldsToMove = newGroups[groupName] || [];
            delete newGroups[groupName];
            if (!newGroups['Uncategorized']) newGroups['Uncategorized'] = [];
            newGroups['Uncategorized'] = [...newGroups['Uncategorized'], ...fieldsToMove];
            return newGroups;
        });
    }

    const uncategorizedFields = allFields.filter(field => !Object.values(groups).flat().includes(field));
    const finalGroups = { ...groups };
    if (finalGroups['Uncategorized']) {
        finalGroups['Uncategorized'] = [...new Set([...finalGroups['Uncategorized'], ...uncategorizedFields])];
    } else {
        finalGroups['Uncategorized'] = uncategorizedFields;
    }

    return (
        <aside className="w-72 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col shadow-lg flex-shrink-0">
             <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <h3 className="text-sm font-semibold">Configure Field Groups</h3>
                    <div className="flex space-x-2 mt-2">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                            placeholder="New group name..."
                            className="w-full text-sm px-2 py-1 border-gray-300 dark:border-slate-600 dark:bg-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button onClick={handleAddGroup} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            <PlusIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="text-gray-800 dark:text-slate-200">
                   {Object.entries(finalGroups).map(([groupName, fields]) => (
                       <GroupDropZone
                          key={groupName}
                          groupName={groupName}
                          fields={fields}
                          onFieldDrop={handleFieldDrop}
                          onRemoveField={handleRemoveField}
                          onRemoveGroup={handleRemoveGroup}
                       />
                   ))}
                </div>
            </div>
        </aside>
    );
};

export default FieldGroupingPanel;