import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SearchIcon, EyeIcon, EditIcon, CheckIcon, XIcon } from './icons';
import { ModelConfiguration, FieldAliases } from '../types';
import { ActionType, AppAction } from '../state/actions';

interface TableFieldSelectorProps {
    allTables: { name: string, fields: string[] }[];
    modelConfig: ModelConfiguration;
    dispatch: React.Dispatch<AppAction>;
    onPreviewTable?: (tableName: string) => void;
    fieldAliases: FieldAliases;
}

const TableFieldSelector: React.FC<TableFieldSelectorProps> = ({ allTables, modelConfig, dispatch, onPreviewTable, fieldAliases }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempAlias, setTempAlias] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingField]);

    const handleTableSelection = (tableName: string, isSelected: boolean) => {
        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, isSelected }
        });
    };

    const handleFieldSelection = (tableName: string, fieldName: string, isSelected: boolean) => {
        const currentFields = modelConfig[tableName] || [];
        const newFields = isSelected
            ? [...currentFields, fieldName]
            : currentFields.filter(f => f !== fieldName);

        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, fields: newFields }
        });
    };

    const handleStartEditing = (tableName: string, fieldName: string) => {
        const fieldKey = `${tableName}.${fieldName}`;
        setEditingField(fieldKey);
        setTempAlias(fieldAliases[fieldKey] || '');
    };

    const handleSaveAlias = () => {
        if (editingField) {
            dispatch({
                type: ActionType.SET_FIELD_ALIAS,
                payload: { fieldKey: editingField, alias: tempAlias.trim() }
            });
            setEditingField(null);
        }
    };

    const handleCancelEditing = () => {
        setEditingField(null);
    };

    const filteredTables = allTables.filter(table =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 flex-shrink-0 border-b-2 border-border">
                <h3 className="text-base font-semibold text-foreground mb-2 uppercase tracking-wide font-mono">Select Tables & Fields</h3>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="brutal-input w-full !pl-12 pr-4 py-2 text-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredTables.length > 0 ? filteredTables.map(table => {
                    const isTableSelected = modelConfig[table.name] !== undefined;
                    const selectedFields = modelConfig[table.name] || [];

                    return (
                        <details key={table.name} className="group/table" open={isTableSelected}>
                            <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted list-none select-none">
                                <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isTableSelected}
                                            onChange={(e) => handleTableSelection(table.name, e.target.checked)}
                                            className="brutal-checkbox"
                                        />
                                    </div>
                                    <span className="font-semibold text-sm text-foreground truncate">{table.name}</span>
                                    {onPreviewTable && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPreviewTable(table.name); }}
                                            className="p-1 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                            title="Preview Table Content"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open/table:rotate-180 transition-transform flex-shrink-0" />
                            </summary>
                            <div className="pl-6 pt-1 border-l-2 border-border ml-4 space-y-1">
                                {isTableSelected && table.fields.map(field => {
                                    const fieldKey = `${table.name}.${field}`;
                                    const isEditing = editingField === fieldKey;
                                    const alias = fieldAliases[fieldKey];

                                    return (
                                        <div key={field} className="flex items-center justify-between group/field hover:bg-muted p-1 rounded-sm">
                                            {isEditing ? (
                                                <div className="flex items-center space-x-2 w-full p-0.5">
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={tempAlias}
                                                        onChange={(e) => setTempAlias(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveAlias();
                                                            if (e.key === 'Escape') handleCancelEditing();
                                                        }}
                                                        className="brutal-input flex-1 !py-1 !px-2 text-xs"
                                                        placeholder="Alias..."
                                                    />
                                                    <button onClick={handleSaveAlias} className="text-primary hover:text-primary/80">
                                                        <CheckIcon className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={handleCancelEditing} className="text-muted-foreground hover:text-foreground">
                                                        <XIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <label className="flex items-center space-x-3 cursor-pointer flex-1 overflow-hidden">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.includes(field)}
                                                            onChange={(e) => handleFieldSelection(table.name, field, e.target.checked)}
                                                            className="brutal-checkbox"
                                                        />
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className={`text-sm ${alias ? 'text-primary font-medium' : 'text-foreground'} truncate`}>
                                                                {alias || field}
                                                            </span>
                                                            {alias && (
                                                                <span className="text-[10px] text-muted-foreground truncate italic">
                                                                    orig: {field}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                    {selectedFields.includes(field) && (
                                                        <button
                                                            onClick={() => handleStartEditing(table.name, field)}
                                                            className={`p-1 ${alias ? 'opacity-100' : 'opacity-0 group-hover/field:opacity-100'} text-muted-foreground hover:text-primary transition-all flex-shrink-0`}
                                                            title="Rename / Alias Field"
                                                        >
                                                            <EditIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    )
                }) : (
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No matching tables found.' : 'No tables discovered from the data source.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TableFieldSelector;
