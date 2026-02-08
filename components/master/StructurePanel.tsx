import React, { useState, useRef, useEffect } from 'react';
import { ActionType, AppAction } from '../../state/actions';
import { AppState } from '../../types';
import { ChevronRightIcon, SearchIcon, EyeIcon, EditIcon, CheckIcon, XIcon, DatabaseIcon, KeyIcon, LinkIcon, AlertTriangleIcon, RefreshIcon } from '../icons';
import { updateTableDescription, syncSchemaRegistry } from '../../services/schemaRegistry';

interface StructurePanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    onPreviewTable: (tableName: string) => void;
}

const StructurePanel: React.FC<StructurePanelProps> = ({ state, dispatch, onPreviewTable }) => {
    const { discoveredTables, modelConfiguration, fieldAliases, schemaRegistry, isDriftDetected, supabaseCredentials } = state;
    const [searchTerm, setSearchTerm] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempAlias, setTempAlias] = useState('');
    
    // Table description editing state
    const [editingTableDesc, setEditingTableDesc] = useState<string | null>(null);
    const [tempTableDesc, setTempTableDesc] = useState('');
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const descInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingField]);

    useEffect(() => {
        if (editingTableDesc && descInputRef.current) {
            descInputRef.current.focus();
        }
    }, [editingTableDesc]);

    const handleTableSelection = (tableName: string, isSelected: boolean) => {
        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, isSelected }
        });
    };

    const handleFieldSelection = (tableName: string, fieldName: string, isSelected: boolean) => {
        const currentFields = modelConfiguration[tableName] || [];
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

    const handleStartEditingDesc = (tableName: string, currentDesc: string) => {
        setEditingTableDesc(tableName);
        setTempTableDesc(currentDesc);
    };

    const handleSaveTableDesc = async () => {
        if (!editingTableDesc || !schemaRegistry) return;
        
        setIsSavingDesc(true);
        try {
            await updateTableDescription(schemaRegistry.dbUrlHash, editingTableDesc, tempTableDesc.trim());
            
            // Update local state
            const updatedTables = schemaRegistry.tables.map(t => 
                t.name === editingTableDesc ? { ...t, description: tempTableDesc.trim() } : t
            );
            dispatch({
                type: ActionType.SET_SCHEMA_REGISTRY_DATA,
                payload: { data: { ...schemaRegistry, tables: updatedTables }, driftDetected: isDriftDetected }
            });
            setEditingTableDesc(null);
        } catch (error) {
            console.error('Failed to update description:', error);
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleSyncRegistry = async () => {
        if (!supabaseCredentials) return;
        
        setIsSyncing(true);
        try {
            const result = await syncSchemaRegistry(supabaseCredentials);
            dispatch({
                type: ActionType.SET_SCHEMA_REGISTRY_DATA,
                payload: result
            });
        } catch (error) {
            console.error('Failed to sync registry:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredTables = discoveredTables.filter(table =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Drift Warning */}
            {isDriftDetected && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-tight">Schema Drift Detected</span>
                            <span className="text-[10px] text-amber-500/80 leading-tight">Registry is out of sync with DB.</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleSyncRegistry}
                        disabled={isSyncing}
                        className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                        <RefreshIcon className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
                <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="brutal-input w-full !pl-10 !py-2"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredTables.length > 0 ? (
                    filteredTables.map(table => {
                        const isTableSelected = modelConfiguration[table.name] !== undefined;
                        const selectedFields = modelConfiguration[table.name] || [];
                        
                        // Metadata from registry
                        const registryTable = schemaRegistry?.tables.find(t => t.name === table.name);
                        const tableDescription = registryTable?.description || '';
                        const isEditingDesc = editingTableDesc === table.name;

                        return (
                            <div key={table.name} className="border border-transparent hover:border-border transition-colors">
                                <details className="group" open={isTableSelected}>
                                    <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted/40 rounded-md list-none select-none">
                                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isTableSelected}
                                                    onChange={(e) => handleTableSelection(table.name, e.target.checked)}
                                                    className="brutal-checkbox"
                                                />
                                            </div>
                                            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                                <div className="flex items-center gap-2 truncate">
                                                    <DatabaseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className={`text-sm font-bold uppercase tracking-tight truncate ${isTableSelected ? 'text-primary' : 'text-foreground'}`}>
                                                        {table.name}
                                                    </span>
                                                </div>
                                                
                                                {/* Table Description */}
                                                {isEditingDesc ? (
                                                    <div className="flex items-center gap-1 mt-1 bg-background border-2 border-primary p-0.5" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            ref={descInputRef}
                                                            type="text"
                                                            value={tempTableDesc}
                                                            onChange={(e) => setTempTableDesc(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveTableDesc();
                                                                if (e.key === 'Escape') setEditingTableDesc(null);
                                                            }}
                                                            className="flex-1 bg-transparent border-none text-[10px] focus:ring-0 p-1 font-mono"
                                                            placeholder="Table description..."
                                                        />
                                                        <button onClick={handleSaveTableDesc} disabled={isSavingDesc} className="text-green-500 hover:text-green-600 p-1">
                                                            <CheckIcon className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => setEditingTableDesc(null)} className="text-red-500 hover:text-red-600 p-1">
                                                            <XIcon className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center group/desc mt-0.5">
                                                        <p className="text-[10px] text-muted-foreground/70 truncate italic pr-4">
                                                            {tableDescription || 'No description available'}
                                                        </p>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleStartEditingDesc(table.name, tableDescription); }}
                                                            className="opacity-0 group-hover/desc:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
                                                        >
                                                            <EditIcon className="h-2.5 w-2.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {onPreviewTable && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onPreviewTable(table.name); }}
                                                    className="p-1 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-muted"
                                                    title="Preview Table"
                                                >
                                                    <EyeIcon className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                                        </div>
                                    </summary>

                                    {/* Fields List */}
                                    <div className="pl-9 pr-2 pb-2 pt-1 animate-in slide-in-from-top-1 border-l-2 border-border ml-3.5 space-y-0.5">
                                        {isTableSelected && table.fields.map(field => {
                                            const fieldKey = `${table.name}.${field}`;
                                            const isEditing = editingField === fieldKey;
                                            const alias = fieldAliases[fieldKey];
                                            const isFieldSelected = selectedFields.includes(field);
                                            
                                            // Field metadata from registry
                                            const regCol = registryTable?.columns.find(c => c.name === field);
                                            const isPK = regCol?.isPrimary;
                                            const foreignKey = regCol?.foreignKey;

                                            return (
                                                <div key={field} className="flex items-center justify-between group/field hover:bg-muted/40 p-1.5 rounded-sm transition-colors">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1 w-full bg-background border-2 border-primary p-0.5">
                                                            <input
                                                                ref={inputRef}
                                                                type="text"
                                                                value={tempAlias}
                                                                onChange={(e) => setTempAlias(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveAlias();
                                                                    if (e.key === 'Escape') handleCancelEditing();
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-xs focus:ring-0 p-1 font-mono"
                                                                placeholder="Alias..."
                                                            />
                                                            <button onClick={handleSaveAlias} className="text-green-500 hover:text-green-600 p-1">
                                                                <CheckIcon className="h-3 w-3" />
                                                            </button>
                                                            <button onClick={handleCancelEditing} className="text-red-500 hover:text-red-600 p-1">
                                                                <XIcon className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <label className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isFieldSelected}
                                                                    onChange={(e) => handleFieldSelection(table.name, field, e.target.checked)}
                                                                    className="brutal-checkbox scale-75"
                                                                />
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <div className="flex flex-col truncate flex-1 min-w-0">
                                                                        <span className={`text-[11px] truncate font-mono ${alias ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                                                            {alias || field}
                                                                        </span>
                                                                        {alias && (
                                                                            <span className="text-[9px] text-muted-foreground/60 italic truncate">
                                                                                {field}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* PK/FK Indicators */}
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {isPK && (
                                                                            <span className="text-primary" title="Primary Key">
                                                                                <KeyIcon className="h-2.5 w-2.5" />
                                                                            </span>
                                                                        )}
                                                                        {foreignKey && (
                                                                            <span className="text-muted-foreground/60" title={`Foreign Key: ${foreignKey.table}.${foreignKey.column}`}>
                                                                                <LinkIcon className="h-2.5 w-2.5" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </label>

                                                            {isFieldSelected && (
                                                                <button
                                                                    onClick={() => handleStartEditing(table.name, field)}
                                                                    className={`p-1 ${alias ? 'opacity-100' : 'opacity-0 group-hover/field:opacity-100'} text-muted-foreground hover:text-primary transition-all rounded hover:bg-muted`}
                                                                    title="Rename Field"
                                                                >
                                                                    <EditIcon className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </>
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
                            {searchTerm ? 'No matching tables.' : 'No tables found. Connect a database to get started.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StructurePanel;
