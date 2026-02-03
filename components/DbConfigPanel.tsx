import React, { useState } from 'react';
import { ChevronDownIcon, DatabaseIcon, SearchIcon, SpinnerIcon, RefreshIcon } from './icons';
import { useAppState } from '../state/context';
import { DatabaseType, FieldAliases } from '../types';
import { ActionType, AppAction } from '../state/actions';

interface DbConfigPanelProps {
    selectedFields: string[];
    onFieldChange: (field: string, isSelected: boolean) => void;
    availableFields: string[];
    fieldAliases: FieldAliases;
    onConfigureCredentialsClick: () => void;
    isConnecting: boolean;
    isConnected: boolean;
    dbType: DatabaseType;
    isDemoMode: boolean;
    onToggleDemoMode: () => void;
    dispatch: React.Dispatch<AppAction>;
    onRefreshData: () => void;
}

const ConnectionButton: React.FC<{
    isConnecting: boolean;
    isConnected: boolean;
    onConnect: () => void;
    dbType: DatabaseType;
}> = ({ isConnecting, isConnected, onConnect, dbType }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (dbType === 'sqlite') return null;

    if (isConnecting) {
        return (
            <button
                disabled
                className="flex items-center space-x-2 px-4 py-2 bg-muted border-2 border-border text-muted-foreground opacity-70 cursor-not-allowed uppercase tracking-wider font-bold text-xs"
            >
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
            </button>
        );
    }

    if (isConnected) {
        return (
            <button
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onConnect}
                className={`flex items-center space-x-2 px-4 py-2 border-2 border-border transition-all uppercase tracking-wider font-bold text-xs ${isHovered
                    ? 'bg-destructive text-destructive-foreground shadow-brutal-sm'
                    : 'bg-primary text-primary-foreground shadow-brutal-sm'
                    }`}
            >
                <span className="whitespace-nowrap">{isHovered ? 'Disconnect' : 'Connected ✓'}</span>
            </button>
        );
    }

    return (
        <button
            onClick={onConnect}
            className="px-4 py-2 bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase tracking-wider font-bold text-xs"
        >
            Connect DB
        </button>
    );
};

const ConnectionStatusIndicator: React.FC<{ dbType: DatabaseType; isConnecting: boolean; isConnected: boolean }> = ({ dbType, isConnecting, isConnected }) => {
    let statusClass = 'bg-muted-foreground';
    let statusTitle = 'Disconnected';
    if (dbType === 'sqlite') {
        statusTitle = 'Using In-Browser SQLite';
        statusClass = 'bg-primary';
    } else if (isConnecting) {
        return <SpinnerIcon className="h-4 w-4 text-primary animate-spin" />;
    } else if (isConnected) {
        statusClass = 'bg-primary';
        statusTitle = 'Connected to Lakehouse';
    }

    return <div className={`h-3 w-3 rounded-full ${statusClass}`} title={statusTitle} />;
};

const DemoModeToggle: React.FC<{ dbType: DatabaseType; isDemoMode: boolean; onToggle: () => void }> = ({ dbType, isDemoMode, onToggle }) => {
    if (dbType !== 'sqlite') return null;

    return (
        <div className="flex items-center justify-between mt-4 p-3 border-2 border-border bg-muted">
            <label htmlFor="demo-mode-toggle" className="text-sm font-medium text-foreground uppercase tracking-wide">
                Demo Mode
            </label>
            <div
                onClick={onToggle}
                className="relative inline-flex items-center h-6 w-11 cursor-pointer border-2 border-border"
                role="switch"
                aria-checked={isDemoMode}
                id="demo-mode-toggle"
            >
                <span className={`${isDemoMode ? 'bg-primary' : 'bg-muted'} absolute h-full w-full`}></span>
                <span className={`${isDemoMode ? 'translate-x-6' : 'translate-x-1'} absolute w-4 h-4 transform bg-foreground transition-transform`}></span>
            </div>
        </div>
    );
};

const FieldsList: React.FC<{
    isModelDirty: boolean;
    availableFields: string[];
    filteredFields: string[];
    selectedFields: string[];
    onFieldChange: (field: string, isSelected: boolean) => void;
    isDemoMode: boolean;
    isConnected: boolean;
    fieldAliases: FieldAliases;
}> = ({ isModelDirty, availableFields, filteredFields, selectedFields, onFieldChange, isDemoMode, isConnected, fieldAliases }) => {
    // We now show fields immediately even if model is dirty
    if (availableFields.length === 0) {
        if (!isDemoMode && !isConnected && !isModelDirty) {
            return <p className="text-xs text-center text-muted-foreground p-4">Connect to a data source to begin.</p>;
        }
        return <p className="text-xs text-center text-muted-foreground p-4">No fields selected. Select tables on the canvas to populate this list.</p>;
    }
    if (filteredFields.length === 0) {
        return <p className="text-xs text-center text-muted-foreground p-4">No matching fields found.</p>;
    }
    return (
        <div className="pl-2 space-y-1 mt-1 max-h-64 overflow-y-auto">
            {isModelDirty && availableFields.length > 0 && (
                <div className="px-2 py-1 mb-2 bg-yellow-500/10 border-l-2 border-yellow-500">
                    <p className="text-[10px] text-yellow-500 uppercase font-bold">Unconfirmed Changes</p>
                </div>
            )}
            {filteredFields.map(field => {
                const alias = Object.values(fieldAliases).find((_, i) => Object.keys(fieldAliases)[i].endsWith(`.${field}`));
                return (
                    <label key={field} className="flex items-start space-x-2 p-2 hover:bg-muted cursor-pointer transition-colors group">
                        <input
                            type="checkbox"
                            checked={selectedFields.includes(field)}
                            onChange={(e) => onFieldChange(field, e.target.checked)}
                            className="brutal-checkbox mt-0.5"
                        />
                        <div className="flex flex-col">
                            <span className={`text-sm ${alias ? 'text-primary font-bold' : 'text-foreground'} group-hover:text-primary transition-colors`}>
                                {(alias || field).replace(/_/g, ' ')}
                            </span>
                            {alias && (
                                <span className="text-[10px] text-muted-foreground italic leading-tight">
                                    orig: {field}
                                </span>
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
};

const DbConfigPanel: React.FC<DbConfigPanelProps> = ({
    selectedFields,
    onFieldChange,
    availableFields,
    onConfigureCredentialsClick,
    isConnecting,
    isConnected,
    dbType,
    isDemoMode,
    onToggleDemoMode,
    dispatch,
    onRefreshData,
    fieldAliases
}) => {
    const { isModelDirty } = useAppState();
    const [searchTerm, setSearchTerm] = useState('');

    const [localSelectedFields, setLocalSelectedFields] = useState<string[]>(selectedFields);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Sync local state when global state changes (e.g. loaded from config)
    // We only sync if we don't have unsaved changes to avoid overwriting user work, 
    // or if we decide that global source of truth always wins on external updates.
    // For simplicity, let's sync but only if the user hasn't explicitly started editing, 
    // or just assume global update wins (like loading a config).
    React.useEffect(() => {
        setLocalSelectedFields(selectedFields);
        setHasUnsavedChanges(false);
    }, [selectedFields]);

    const filteredFields = availableFields.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleLocalFieldChange = (field: string, isSelected: boolean) => {
        const newFields = isSelected
            ? [...localSelectedFields, field]
            : localSelectedFields.filter(f => f !== field);
        setLocalSelectedFields(newFields);
        setHasUnsavedChanges(true);
    };

    const handleLocalSelectAll = () => {
        setLocalSelectedFields(availableFields);
        setHasUnsavedChanges(true);
    };

    const handleLocalClearAll = () => {
        setLocalSelectedFields([]);
        setHasUnsavedChanges(true);
    };

    const handleApplyChanges = () => {
        dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: localSelectedFields });
        setHasUnsavedChanges(false);
        // Optional: Trigger a data refresh if needed, but SET_SELECTED_FIELDS usually handles the view update.
    };

    return (
        <aside className="h-full flex flex-col bg-background relative overflow-hidden">
            <div className="p-4 border-b-2 border-border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <ConnectionStatusIndicator dbType={dbType} isConnecting={isConnecting} isConnected={isConnected} />
                        <h2 className="text-xl font-black uppercase tracking-tight">Database</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <ConnectionButton
                            dbType={dbType}
                            isConnected={isConnected}
                            isConnecting={isConnecting}
                            onConnect={onConfigureCredentialsClick}
                        />
                        {isConnected && (
                            <button
                                onClick={onRefreshData}
                                title="Refresh Connection"
                                className="p-1 text-muted-foreground hover:text-primary transition-colors border-2 border-border bg-muted/20"
                            >
                                <RefreshIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Define your data model and view the resulting fields.</p>
                    <DemoModeToggle dbType={dbType} isDemoMode={isDemoMode} onToggle={onToggleDemoMode} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Field Selection */}
                <details className="group" open>
                    <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted list-none font-semibold text-base text-foreground uppercase tracking-wide">
                        <span>Fields ({localSelectedFields.length} / {availableFields.length})</span>
                        <ChevronDownIcon className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                            <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search fields..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="brutal-input w-full !pl-12 pr-4 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button onClick={handleLocalSelectAll} disabled={availableFields.length === 0} className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline uppercase tracking-wide">Select All</button>
                                <span className="text-border">|</span>
                                <button onClick={handleLocalClearAll} disabled={localSelectedFields.length === 0} className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline uppercase tracking-wide">Clear All</button>
                            </div>
                            {hasUnsavedChanges && (
                                <button
                                    onClick={handleApplyChanges}
                                    className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground animate-pulse shadow-sm hover:shadow-md transition-all"
                                >
                                    Update View
                                </button>
                            )}
                        </div>
                    </div>
                    <FieldsList
                        isModelDirty={isModelDirty}
                        availableFields={availableFields}
                        filteredFields={filteredFields}
                        selectedFields={localSelectedFields}
                        onFieldChange={handleLocalFieldChange}
                        isDemoMode={isDemoMode}
                        isConnected={isConnected}
                        fieldAliases={fieldAliases}
                    />
                </details>
            </div>
        </aside>
    );
};

export default DbConfigPanel;
