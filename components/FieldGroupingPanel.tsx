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
        <div ref={ref} className={`flex items-center space-x-2 p-1 pl-2 text-sm cursor-grab ${isDragging ? 'opacity-50' : ''}`}>
            <MoveIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{fieldName}</span>
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
            <summary className="flex items-center justify-between p-2 text-sm font-semibold bg-muted/30 border-y-2 border-border cursor-pointer list-none uppercase tracking-wide">
                <span className="text-foreground">{groupName} ({fields.length})</span>
                <div className="flex items-center">
                    {groupName !== 'Uncategorized' && (
                        <button onClick={() => onRemoveGroup(groupName)} className="p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors mr-2">
                            <XIcon className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                    <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </div>
            </summary>
            <div ref={ref} className={`p-2 space-y-1 min-h-[4rem] transition-colors ${isOver ? 'bg-primary/20' : 'bg-transparent'}`}>
                {fields.map(field => (
                    <div key={field} className="flex items-center justify-between hover:bg-muted">
                        <DraggableField fieldName={field} />
                        <button onClick={() => onRemoveField(groupName, field)} className="p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                            <XIcon className="h-3 w-3 text-muted-foreground" />
                        </button>
                    </div>
                ))}
                {fields.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Drag fields here</p>}
            </div>
        </details>
    )
}


const FieldGroupingPanel: React.FC<FieldGroupingPanelProps> = ({ groups, setGroups, allFields }) => {
    const [newGroupName, setNewGroupName] = useState('');

    const handleFieldDrop = (targetGroup: string, fieldName: string) => {
        setGroups(prev => {
            const newGroups = { ...prev };
            Object.keys(newGroups).forEach(g => {
                newGroups[g] = newGroups[g].filter(f => f !== fieldName);
            });
            if (!newGroups[targetGroup]) newGroups[targetGroup] = [];
            if (!newGroups[targetGroup].includes(fieldName)) {
                newGroups[targetGroup].push(fieldName);
            }
            return newGroups;
        });
    };

    const handleRemoveField = (groupName: string, fieldName: string) => {
        setGroups(prev => {
            const newGroups = { ...prev };
            newGroups[groupName] = newGroups[groupName].filter(f => f !== fieldName);
            if (!newGroups['Uncategorized']) newGroups['Uncategorized'] = [];
            newGroups['Uncategorized'].push(fieldName);
            return newGroups;
        })
    }

    const handleAddGroup = () => {
        if (newGroupName.trim() && !groups[newGroupName.trim()]) {
            setGroups(prev => ({ ...prev, [newGroupName.trim()]: [] }));
            setNewGroupName('');
        }
    }

    const handleRemoveGroup = (groupName: string) => {
        setGroups(prev => {
            const newGroups = { ...prev };
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
        <div className="w-full h-full flex flex-col bg-card">
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b-2 border-border bg-card">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Configure Field Groups</h3>
                    <div className="flex space-x-2 mt-2">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                            placeholder="New group name..."
                            className="brutal-input w-full text-sm"
                        />
                        <button onClick={handleAddGroup} className="p-2 bg-primary text-primary-foreground border-2 border-border hover:shadow-brutal transition-all">
                            <PlusIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="text-foreground">
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
        </div>
    );
};

export default FieldGroupingPanel;
