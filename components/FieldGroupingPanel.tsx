import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDrop, useDrag } from 'react-dnd';
import { 
    ChevronDownIcon, 
    PlusIcon, 
    XIcon, 
    MoveIcon, 
    EyeIcon, 
    EyeSlashIcon,
    WandIcon,
    CalculatorIcon,
    FolderIcon,
    CalendarIcon,
    KeyIcon,
    SettingsIcon,
    EditIcon
} from './icons';
import { FieldGroups, ItemTypes, FieldAliases, FieldMetadata, SemanticDataType } from '../types';

interface FieldGroupingPanelProps {
    groups: FieldGroups;
    fieldAliases: FieldAliases;
    fieldMetadata: Record<string, FieldMetadata>;
    hiddenFields: Set<string>;
    sampleValues: Record<string, string[]>;
    setGroups?: React.Dispatch<React.SetStateAction<FieldGroups>>;
    onGroupsChange?: (newGroups: FieldGroups) => void;
    onFieldRename: (fieldKey: string, alias: string) => void;
    onFieldVisibilityToggle: (fieldKey: string, isHidden: boolean) => void;
    onMetadataChange: (fieldKey: string, metadata: Partial<FieldMetadata>) => void;
    onScanValues: (fieldKey: string) => Promise<void>;
    allFields: string[];
}

interface DraggableFieldProps {
    fieldName: string;
    groupName: string;
    fieldIndex: number;
    displayName: string;
    isHidden: boolean;
    metadata?: FieldMetadata;
    sampleValues?: string[];
    onRename: (newName: string) => void;
    onToggleVisibility: () => void;
    onMetadataChange: (metadata: Partial<FieldMetadata>) => void;
    onScanValues: () => Promise<void>;
}

const DraggableField: React.FC<DraggableFieldProps> = ({
    fieldName,
    groupName,
    fieldIndex,
    displayName,
    isHidden,
    metadata,
    sampleValues,
    onRename,
    onToggleVisibility,
    onMetadataChange,
    onScanValues
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editValue, setEditValue] = useState(displayName);
    const [description, setDescription] = useState(metadata?.description || '');
    const [isScanning, setIsScanning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dragRef = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FIELD,
        item: { name: fieldName, sourceGroup: groupName, sourceIndex: fieldIndex },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [fieldName, groupName, fieldIndex]);

    drag(dragRef);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Sync description with metadata changes
    useEffect(() => {
        setDescription(metadata?.description || '');
    }, [metadata?.description]);

    const handleSave = () => {
        if (editValue.trim() && editValue !== displayName) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditValue(displayName);
            setIsEditing(false);
        }
    };

    const handleDescriptionBlur = () => {
        // We now use the Save button for descriptions, but keep blur for auto-save if desired
        // For now, let's stick to the explicit button as per user request
    };

    const handleSaveMetadata = () => {
        onMetadataChange({ description });
        toast.success(`Metadata updated for ${fieldName.split('.').pop()}`);
        setShowSettings(false);
    };

    const handleScanValues = async () => {
        setIsScanning(true);
        try {
            await onScanValues();
            toast.success(`Scanned values for ${fieldName.split('.').pop()}`);
        } catch (e) {
            toast.error('Failed to scan values');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div ref={dragRef} className={`flex flex-col group/field ${isDragging ? 'opacity-50' : ''}`}>
            <div className="flex items-center p-1 pl-2 text-sm cursor-grab">
                <MoveIcon className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                <div className="flex-1 min-w-0 mr-2">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1 py-0.5 text-sm bg-background border border-primary outline-none text-foreground"
                        />
                    ) : (
                        <span
                            className={`truncate block ${isHidden ? 'line-through text-muted-foreground opacity-60' : 'text-foreground'}`}
                        >
                            {displayName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                    {!isEditing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditValue(displayName);
                                setIsEditing(true);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            title="Rename field"
                        >
                            <EditIcon className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSettings(!showSettings);
                        }}
                        className={`p-1 rounded transition-colors ${showSettings ? 'text-primary bg-primary/10 opacity-100' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        title="Edit metadata"
                    >
                        <SettingsIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility();
                        }}
                        className={`p-1 rounded transition-colors ${isHidden ? 'text-destructive hover:bg-destructive/20 opacity-100' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        title={isHidden ? 'Field is hidden' : 'Hide this field'}
                    >
                        {isHidden ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="mx-2 mb-2 p-3 bg-muted/40 border border-border space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full text-[11px] bg-background border border-border p-2 focus:border-primary focus:outline-none min-h-[60px] resize-none"
                            placeholder="Add semantic meaning..."
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Data Type</label>
                        <select
                            value={metadata?.dataType || 'dimension'}
                            onChange={(e) => {
                                const newType = e.target.value as SemanticDataType;
                                onMetadataChange({ dataType: newType });
                                toast.success(`Data type set to ${newType}`);
                            }}
                            className="w-full text-[11px] bg-background border border-border p-1.5 focus:border-primary focus:outline-none uppercase font-bold"
                        >
                            <option value="dimension">Dimension (Categorical)</option>
                            <option value="measure">Measure (Numeric)</option>
                            <option value="date">Date / Time</option>
                            <option value="identifier">Identifier (ID/Key)</option>
                            <option value="text">Text (Description)</option>
                            <option value="boolean">Boolean (True/False)</option>
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sample Values</label>
                            <button
                                onClick={handleScanValues}
                                disabled={isScanning}
                                className="px-2 py-0.5 text-[9px] font-bold uppercase bg-muted hover:bg-muted/80 border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isScanning ? 'Scanning...' : 'Scan'}
                            </button>
                        </div>
                        {sampleValues && sampleValues.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-background border border-border">
                                {sampleValues.slice(0, 10).map((val, i) => (
                                    <span key={i} className="px-1.5 py-0.5 text-[10px] bg-muted border border-border truncate max-w-[100px]" title={val}>
                                        {val}
                                    </span>
                                ))}
                                {sampleValues.length > 10 && (
                                    <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                        +{sampleValues.length - 10} more
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-[10px] text-muted-foreground italic p-2 bg-background border border-border">
                                Not scanned yet
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveMetadata}
                            className="px-3 py-1 bg-primary text-black text-[10px] font-black uppercase border border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const FIELD_TEMPLATES: Record<string, (fields: string[]) => string[]> = {
    'Dimensions': (fields) =>
        fields.filter(f => !/(sum|count|total|amount|revenue|avg|min|max|_id|id)/i.test(f)),

    'Measures': (fields) =>
        fields.filter(f => /(sum|count|total|amount|revenue|sales|cost|avg|min|max|price|quantity)/i.test(f)),

    'Dates': (fields) =>
        fields.filter(f => /(date|time|_at|created|updated|posted|year|month|day|timestamp)/i.test(f)),

    'Identifiers': (fields) =>
        fields.filter(f => /(id|_id|uid|key|uuid|code)/i.test(f)),
};

interface DraggableGroupProps {
    groupName: string;
    fields: string[];
    fieldAliases: FieldAliases;
    fieldMetadata: Record<string, FieldMetadata>;
    hiddenFields: Set<string>;
    sampleValues: Record<string, string[]>;
    onFieldDrop: (targetGroup: string, fieldName: string, sourceGroup: string, sourceIndex: number) => void;
    onRemoveField: (groupName: string, fieldName: string) => void;
    onRemoveGroup: (groupName: string) => void;
    onFieldRename: (fieldKey: string, alias: string) => void;
    onFieldVisibilityToggle: (fieldKey: string, isHidden: boolean) => void;
    onMetadataChange: (fieldKey: string, metadata: Partial<FieldMetadata>) => void;
    onScanValues: (fieldKey: string) => Promise<void>;
}

const GroupDropZone: React.FC<DraggableGroupProps> = ({
    groupName,
    fields,
    fieldAliases,
    fieldMetadata,
    hiddenFields,
    sampleValues,
    onFieldDrop,
    onRemoveField,
    onRemoveGroup,
    onFieldRename,
    onFieldVisibilityToggle,
    onMetadataChange,
    onScanValues
}) => {
    const dropRef = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.FIELD,
        drop: (item: { name: string; sourceGroup: string; sourceIndex: number }, monitor) => {
            if (!monitor.didDrop()) {
                onFieldDrop(groupName, item.name, item.sourceGroup, item.sourceIndex);
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [groupName, onFieldDrop]);

    drop(dropRef);

    return (
        <details className="group" open>
            <summary className="flex items-center justify-between p-2 text-sm font-semibold bg-muted/30 border-y border-border cursor-pointer list-none uppercase tracking-wide">
                <span className="text-foreground">{groupName} ({fields.length})</span>
                <div className="flex items-center">
                    {groupName !== 'Uncategorized' && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onRemoveGroup(groupName);
                            }}
                            className="p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors mr-2"
                        >
                            <XIcon className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                    <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </div>
            </summary>
            <div ref={dropRef} className={`p-1 space-y-0.5 min-h-[2rem] transition-colors ${isOver ? 'bg-primary/10' : 'bg-transparent'}`}>
                {fields.map((field, index) => (
                    <div key={field} className="flex items-start justify-between hover:bg-muted group/row">
                        <div className="flex-1">
                            <DraggableField
                                fieldName={field}
                                groupName={groupName}
                                fieldIndex={index}
                                displayName={fieldAliases[field] || field}
                                isHidden={hiddenFields.has(field)}
                                metadata={fieldMetadata[field]}
                                sampleValues={sampleValues[field]}
                                onRename={(newName) => onFieldRename(field, newName)}
                                onToggleVisibility={() => onFieldVisibilityToggle(field, !hiddenFields.has(field))}
                                onMetadataChange={(metadata) => onMetadataChange(field, metadata)}
                                onScanValues={() => onScanValues(field)}
                            />
                        </div>
                        <button
                            onClick={() => onRemoveField(groupName, field)}
                            className="p-1 mt-1 opacity-0 group-hover/row:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all shrink-0 mr-1"
                        >
                            <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    </div>
                ))}
                {fields.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4 italic">Empty group</p>}
            </div>
        </details>
    );
};

const FieldGroupingPanel: React.FC<FieldGroupingPanelProps> = ({
    groups,
    fieldAliases,
    fieldMetadata,
    hiddenFields,
    sampleValues,
    setGroups,
    onGroupsChange,
    onFieldRename,
    onFieldVisibilityToggle,
    onMetadataChange,
    onScanValues,
    allFields
}) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const templateMenuRef = useRef<HTMLDivElement>(null);

    const updateGroups = (newGroups: FieldGroups) => {
        if (onGroupsChange) {
            onGroupsChange(newGroups);
        } else if (setGroups) {
            setGroups(newGroups);
        }
    };

    // Close template menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
                setShowTemplates(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFieldDrop = (targetGroup: string, fieldName: string, sourceGroup: string, sourceIndex: number) => {
        const newGroups = { ...groups };

        // Remove from source (in all groups to be safe)
        Object.keys(newGroups).forEach(g => {
            newGroups[g] = (newGroups[g] || []).filter(f => f !== fieldName);
        });

        // Add to target
        if (!newGroups[targetGroup]) newGroups[targetGroup] = [];

        // Simple reorder: if same group, we just filtered it out, now push to end
        // For cross-group: also push to end
        newGroups[targetGroup].push(fieldName);

        updateGroups(newGroups);
    };

    const handleRemoveField = (groupName: string, fieldName: string) => {
        const newGroups = { ...groups };
        newGroups[groupName] = (newGroups[groupName] || []).filter(f => f !== fieldName);
        if (!newGroups['Uncategorized']) newGroups['Uncategorized'] = [];
        if (!newGroups['Uncategorized'].includes(fieldName)) {
            newGroups['Uncategorized'].push(fieldName);
        }
        updateGroups(newGroups);
    }

    const applyTemplate = (templateName: string) => {
        const matcher = FIELD_TEMPLATES[templateName];
        if (!matcher) return;

        // Get all available fields (not already in other groups)
        const assignedFields = new Set(Object.values(groups).flat());
        const availableFields = allFields.filter(f => !assignedFields.has(f));

        // Match fields using template pattern
        const matchingFields = matcher(availableFields);

        if (matchingFields.length === 0) {
            toast.error(`No fields match ${templateName} pattern`);
            return;
        }

        if (groups[templateName]) {
            toast.error(`Group "${templateName}" already exists`);
            return;
        }

        // Create group with matched fields
        const newGroups = {
            ...groups,
            [templateName]: matchingFields
        };
        updateGroups(newGroups);

        toast.success(`${templateName}: ${matchingFields.length} fields added`);
        setShowTemplates(false);
    };

    const handleAddGroup = () => {
        if (!newGroupName.trim() || groups[newGroupName.trim()]) return;

        const newGroups = { ...groups, [newGroupName.trim()]: [] };
        updateGroups(newGroups);
        setNewGroupName('');
    };

    const handleRemoveGroup = (groupName: string) => {
        const newGroups = { ...groups };
        const fieldsToMove = newGroups[groupName] || [];
        delete newGroups[groupName];
        if (!newGroups['Uncategorized']) newGroups['Uncategorized'] = [];
        newGroups['Uncategorized'] = [...new Set([...newGroups['Uncategorized'], ...fieldsToMove])];
        updateGroups(newGroups);
    }

    const uncategorizedFields = allFields.filter(field => !Object.values(groups).flat().includes(field));
    const finalGroups = { ...groups };
    if (finalGroups['Uncategorized']) {
        finalGroups['Uncategorized'] = [...new Set([...finalGroups['Uncategorized'], ...uncategorizedFields])];
    } else {
        finalGroups['Uncategorized'] = uncategorizedFields;
    }

    const templates = [
        { name: 'Dimensions', icon: <FolderIcon className="h-4 w-4" /> },
        { name: 'Measures', icon: <CalculatorIcon className="h-4 w-4" /> },
        { name: 'Dates', icon: <CalendarIcon className="h-4 w-4" /> },
        { name: 'Identifiers', icon: <KeyIcon className="h-4 w-4" /> },
    ];

    return (
        <div className="w-full h-full flex flex-col bg-card">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 border-b-2 border-border bg-card">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Field Groups</h3>

                    <div className="flex items-center gap-2 relative">
                        {/* Template Trigger */}
                        <div className="relative" ref={templateMenuRef}>
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className={`p-2 border-2 border-border transition-all hover:shadow-brutal ${showTemplates ? 'bg-primary text-black' : 'bg-card text-muted-foreground hover:text-primary'}`}
                                title="Auto-populate from templates"
                            >
                                <WandIcon className="h-4 w-4" />
                            </button>

                            {showTemplates && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-card border-2 border-border shadow-brutal z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-border bg-muted/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Apply Template</span>
                                    </div>
                                    <div className="py-1">
                                        {templates.map((t) => (
                                            <button
                                                key={t.name}
                                                onClick={() => applyTemplate(t.name)}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-primary hover:text-black transition-colors"
                                            >
                                                <span className="opacity-70">{t.icon}</span>
                                                <span>{t.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Group Input */}
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                                placeholder="New group name..."
                                className="brutal-input flex-1 text-sm bg-background h-9"
                            />
                            <button
                                onClick={handleAddGroup}
                                className="px-3 bg-primary text-black border-2 border-border hover:shadow-brutal transition-all flex items-center justify-center"
                                title="Create custom group"
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-foreground">
                    {Object.entries(finalGroups).map(([groupName, fields]) => (
                        <GroupDropZone
                            key={groupName}
                            groupName={groupName}
                            fields={fields}
                            fieldAliases={fieldAliases}
                            fieldMetadata={fieldMetadata}
                            hiddenFields={hiddenFields}
                            sampleValues={sampleValues}
                            onFieldDrop={handleFieldDrop}
                            onRemoveField={handleRemoveField}
                            onRemoveGroup={handleRemoveGroup}
                            onFieldRename={onFieldRename}
                            onFieldVisibilityToggle={onFieldVisibilityToggle}
                            onMetadataChange={onMetadataChange}
                            onScanValues={onScanValues}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FieldGroupingPanel;
