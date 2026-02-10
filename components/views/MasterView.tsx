import React, { useState, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import DataModelCanvas from '../DataModelCanvas';
import SQLPanel from '../master/SQLPanel';
import MetricsPanel from '../master/MetricsPanel';
import StructurePanel from '../master/StructurePanel';
import SemanticModelViewerPanel from '../master/SemanticModelViewerPanel';
import FieldGroupingPanel from '../FieldGroupingPanel';
import GlobalFiltersPanel from '../master/GlobalFiltersPanel';
import ConfigManagerModal from '../ConfigManagerModal';
import SaveConfigModal from '../SaveConfigModal';
import { AppState, DataRow, DatabaseType } from '../../types';
import { AppAction, ActionType } from '../../state/actions';
import { SettingsIcon, EyeIcon, RotateCcwIcon, XIcon, SqlIcon, TableIcon, FolderIcon, PlusIcon, BrainCircuitIcon } from '../icons';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';
import * as db from '../../services/database';

// 1. Central Area: New Structure with Header and Overlay Support
interface CentralAreaProps {
    children: React.ReactNode;
    sqlEditor: React.ReactNode;
    showSql: boolean;
    // Header Props
    onToggleSql: () => void;
    isConnecting: boolean;
    isConnected: boolean;
    dbType: string;
    onRefreshData: () => void;
    onConfigureCredentialsClick: () => void;
    isModelDirty: boolean;
    onConfirmModel: () => void;
    onLoadClick: () => void;
    onSaveClick: () => void;
}

const CentralArea: React.FC<CentralAreaProps> = ({
    children, sqlEditor, showSql,
    onToggleSql, isConnecting, isConnected, dbType, onRefreshData, onConfigureCredentialsClick,
    isModelDirty, onConfirmModel, onLoadClick, onSaveClick
}) => {
    return (
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-background min-w-0">
            {/* Unified Top Header Bar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 z-20 relative">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-mono">Data Model</h2>

                    <div className="flex items-center gap-2 border-l border-border pl-4">
                        <button
                            onClick={onLoadClick}
                            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-muted transition-all border border-transparent hover:border-border rounded"
                            title="Load Configuration"
                        >
                            <FolderIcon className="h-3.5 w-3.5" />
                            <span>Load</span>
                        </button>
                        <button
                            onClick={onSaveClick}
                            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-muted transition-all border border-transparent hover:border-border rounded"
                            title="Save Configuration"
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                            <span>Save</span>
                        </button>
                    </div>

                    {isModelDirty && (
                        <button
                            onClick={onConfirmModel}
                            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest border-2 border-primary-foreground shadow-[4px_4px_0_0_rgba(202,255,88,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(202,255,88,0.4)] transition-all animate-in fade-in slide-in-from-left-4"
                        >
                            Confirm Changes
                        </button>
                    )}
                </div>

                {/* Integrated Controls */}
                <div className="flex items-center gap-2">
                    {/* DB Controls */}
                    <div className="flex items-center gap-2 pr-3 border-r border-border mr-1">
                        <button
                            onClick={onRefreshData}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded"
                            title="Refresh Data"
                        >
                            <RotateCcwIcon className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onConfigureCredentialsClick}
                            className={`badge-brutal ${isConnected ? 'badge-brutal-success' : 'badge-brutal-error'} hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all`}
                            title="Configure Connection"
                        >
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-black">{isConnected ? 'ONLINE' : 'OFFLINE'} • {dbType}</span>
                        </button>
                    </div>

                    {/* Editor Toggles */}
                    <button
                        onClick={onToggleSql}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all border ${showSql ? 'bg-primary text-black border-primary' : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                        title="SQL Editor"
                    >
                        <SqlIcon className="h-4 w-4" />
                        <span className="text-xs font-bold">SQL</span>
                    </button>
                </div>
            </div>

            {/* Main Canvas Layer */}
            <div className="flex-1 relative z-0 overflow-hidden">
                {children}

                {/* SQL Editor Overlay (Full height coverage) */}
                {showSql && (
                    <div className="absolute inset-0 bg-card z-10 flex flex-col animate-in fade-in duration-200">
                        <div className="flex-1 overflow-hidden relative">
                            {sqlEditor}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Row Viewer Component - Vertical display of a single row
const RowViewer = ({ row, columns, onClose }: {
    row: DataRow;
    columns: string[];
    onClose: () => void;
}) => {
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filter columns based on search query
    const filteredColumns = useMemo(() => {
        if (!searchQuery.trim()) return columns;

        const query = searchQuery.toLowerCase();
        return columns.filter(col => {
            // Match column name
            if (col.toLowerCase().includes(query)) return true;

            // Match value (stringified)
            const value = row[col];
            const valueStr = value !== null && value !== undefined ? String(value).toLowerCase() : '';
            return valueStr.includes(query);
        });
    }, [columns, row, searchQuery]);

    // Keyboard shortcut: Ctrl/Cmd+F to focus search, Escape to clear
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('row-viewer-search')?.focus();
            }
            if (e.key === 'Escape' && searchQuery) {
                setSearchQuery('');
                document.getElementById('row-viewer-search')?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    return (
        <div className="flex flex-col h-full">
            <div className="h-12 border-b-2 border-primary bg-primary/10 flex items-center justify-between px-4 shrink-0">
                <span className="text-xs font-black uppercase tracking-widest text-primary">Row Viewer</span>
                <button
                    onClick={onClose}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Close Row Viewer"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
                <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center pointer-events-none">
                        <Search size={14} className="text-muted-foreground" />
                    </div>
                    <input
                        id="row-viewer-search"
                        type="text"
                        placeholder="Search columns or values..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs bg-card border border-border focus:border-primary focus:outline-none font-mono transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filtered Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredColumns.length > 0 ? (
                    filteredColumns.map((col) => (
                        <div key={col} className="border-b border-border">
                            <div className="px-4 py-2 bg-muted/30">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{col}</span>
                            </div>
                            <div className="px-4 py-3 font-mono text-sm text-foreground break-all">
                                {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : <span className="text-muted-foreground italic">null</span>
                                }
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-xs text-muted-foreground text-center font-mono">
                            <div className="mb-2">No matches found</div>
                            <div className="text-[10px] text-muted-foreground/60">
                                Try a different search term
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

import { validateMetricAvailability } from '../../utils/metricValidator';

// 2. Fixed Right Panel: Tables & Preview
const FixedRightPanel = ({ state, dispatch, onPreviewTable, previewData, onClearPreview, selectedRow, selectedRowColumns, isRowViewerActive, onCloseRowViewer }: {
    state: AppState,
    dispatch: React.Dispatch<AppAction>,
    onPreviewTable: (tableName: string) => void,
    previewData: { name: string, data: any[] } | null,
    onClearPreview?: () => void,
    selectedRow?: DataRow | null,
    selectedRowColumns?: string[],
    isRowViewerActive?: boolean,
    onCloseRowViewer?: () => void
}) => {
    const [activeTab, setActiveTab] = useState<'structure' | 'preview' | 'metrics' | 'semantic'>('structure');
    const [isScanningAll, setIsScanningAll] = useState(false);
    const [scanProgress, setScanProgress] = useState<{ current: number; total: number; label: string } | undefined>(undefined);

    // Compute eligible metrics based on active model configuration
    const eligibleMetrics = useMemo(() => {
        const activeConfig = Object.keys(state.modelConfiguration).length > 0
            ? state.modelConfiguration
            : state.confirmedModelConfiguration;

        return state.metrics.filter(m =>
            validateMetricAvailability(m, activeConfig).isValid
        );
    }, [state.metrics, state.modelConfiguration, state.confirmedModelConfiguration]);

    const allFields = useMemo(() => {
        const fields = Object.entries(state.modelConfiguration).flatMap(([tableName, fields]) =>
            fields.map(field => `${tableName}.${field}`)
        );
        // Include eligible metrics in allFields so they appear in FieldGroupingPanel
        return [...fields, ...eligibleMetrics.map(m => m.id)];
    }, [state.modelConfiguration, eligibleMetrics]);

    const handleScanAll = async () => {
        // Filter out metrics from scan list - only scan physical fields
        const fieldsToScan = allFields.filter(field => !eligibleMetrics.some(m => m.id === field));

        if (fieldsToScan.length === 0) {
            toast.error('No physical fields in model to scan.');
            return;
        }

        setIsScanningAll(true);
        const total = fieldsToScan.length;
        const toastId = 'scanning-all-fields-master';

        try {
            for (let i = 0; i < total; i++) {
                const fieldKey = fieldsToScan[i];
                const [tableName, fieldName] = fieldKey.split('.');

                setScanProgress({ current: i + 1, total, label: `${tableName}.${fieldName}` });
                toast.loading(`Scanning ${i + 1}/${total}: ${fieldName}...`, { id: toastId });

                const values = await db.fetchSampleValues(tableName, fieldName);
                dispatch({
                    type: ActionType.SET_SAMPLE_VALUES,
                    payload: { fieldKey, values }
                });
            }
            toast.success(`Successfully scanned ${total} fields!`, { id: toastId });
        } catch (e) {
            console.error('Scan all failed:', e);
            toast.error('Scan interrupted due to an error.', { id: toastId });
        } finally {
            setIsScanningAll(false);
            setScanProgress(undefined);
        }
    };

    // Show Row Viewer when active and row is selected
    if (isRowViewerActive && selectedRow && selectedRowColumns && selectedRowColumns.length > 0) {
        return (
            <div className="w-[320px] bg-card border-l border-border flex flex-col h-full z-30 shadow-xl relative">
                <RowViewer
                    row={selectedRow}
                    columns={selectedRowColumns}
                    onClose={onCloseRowViewer || (() => { })}
                />
            </div>
        );
    }

    return (
        <div className="w-[320px] bg-card border-l border-border flex flex-col h-full z-30 shadow-xl relative">
            {/* Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'structure' ? 'bg-muted/50 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/20'}`}
                >
                    <TableIcon className="h-4 w-4" />
                    <span>Structure</span>
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'preview' ? 'bg-muted/50 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/20'}`}
                >
                    <EyeIcon className="h-4 w-4" />
                    <span>Preview</span>
                </button>
                <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'metrics' ? 'bg-muted/50 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/20'}`}
                >
                    <div className="h-4 w-4 flex items-center justify-center font-bold">#</div>
                    <span>Metrics</span>
                </button>
                <button
                    onClick={() => setActiveTab('semantic')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'semantic' ? 'bg-muted/50 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/20'}`}
                >
                    <BrainCircuitIcon className="h-4 w-4" />
                    <span>Semantic</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-background">
                {activeTab === 'structure' && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <StructurePanel
                            state={state}
                            dispatch={dispatch}
                            onPreviewTable={onPreviewTable}
                        />
                    </div>
                )}
                {activeTab === 'preview' && (
                    <div className="h-full overflow-hidden flex flex-col">
                        <FieldGroupingPanel
                            groups={state.fieldGroups}
                            fieldAliases={state.fieldAliases}
                            fieldMetadata={state.fieldMetadata}
                            hiddenFields={state.hiddenFields}
                            sampleValues={state.sampleValues}
                            allFields={allFields}
                            metrics={eligibleMetrics}
                            onGroupsChange={(newGroups) => dispatch({ type: ActionType.SET_FIELD_GROUPS, payload: newGroups })}
                            onFieldRename={(fieldKey, alias) => dispatch({
                                type: ActionType.SET_FIELD_ALIAS,
                                payload: { fieldKey, alias }
                            })}
                            onFieldVisibilityToggle={(fieldKey, isHidden) => dispatch({
                                type: ActionType.SET_FIELD_VISIBILITY,
                                payload: { fieldKey, isHidden }
                            })}
                            onMetadataChange={(fieldKey, metadata) => dispatch({
                                type: ActionType.SET_FIELD_METADATA,
                                payload: { fieldKey, metadata }
                            })}
                            onScanValues={async (fieldKey) => {
                                const [tableName, fieldName] = fieldKey.split('.');
                                const values = await db.fetchSampleValues(tableName, fieldName);
                                dispatch({
                                    type: ActionType.SET_SAMPLE_VALUES,
                                    payload: { fieldKey, values }
                                });
                            }}
                            onScanAll={handleScanAll}
                            isScanningAll={isScanningAll}
                            scanProgress={scanProgress}
                        />
                    </div>
                )}
                {activeTab === 'metrics' && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <MetricsPanel
                            state={state}
                            dispatch={dispatch}
                        />
                    </div>
                )}
                {activeTab === 'semantic' && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <SemanticModelViewerPanel
                            state={state}
                            dispatch={dispatch}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Collapsible Drawer: Slides OUT from the LEFT of the Fixed Panel
const CollapsibleDrawer = ({ isOpen, onClose, state, dispatch }: { isOpen: boolean, onClose: () => void, state: AppState, dispatch: React.Dispatch<AppAction> }) => {
    return (
        <div
            className={`
                absolute top-14 bottom-0 w-[350px] z-20 
                bg-card border-r border-border shadow-2xl
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
            style={{
                right: '320px',
            }}
        >
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <h2 className="font-bold text-primary uppercase tracking-widest text-sm">Builder</h2>
                <button onClick={onClose} className="hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border-l border-primary/20">
                {/* Global Filters Section */}
                <GlobalFiltersPanel state={state} dispatch={dispatch} />

                {/* Metrics Section */}
                <MetricsPanel state={state} dispatch={dispatch} />
            </div>
        </div>
    );
};


interface MasterViewProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    sqlQuery: string;
    executeQuery: (query: string) => Promise<DataRow[]>;
    onPreviewTable: (tableName: string) => void;
    // DB Connection Props
    onConfigureCredentialsClick: () => void;
    onRefreshData: () => void;
    isConnecting: boolean;
    isConnected: boolean;
    dbType: DatabaseType;
    previewData?: { name: string, data: any[] } | null;
    onClearPreview?: () => void;
}

export const MasterView: React.FC<MasterViewProps> = ({
    state, dispatch, sqlQuery, executeQuery, onPreviewTable,
    onConfigureCredentialsClick, onRefreshData, isConnecting, isConnected, dbType,
    previewData, onClearPreview
}) => {
    const [showSqlEditor, setShowSqlEditor] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    // Modal States
    const [isConfigManagerOpen, setIsConfigManagerOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Row Viewer State
    const [isRowViewerActive, setIsRowViewerActive] = useState(false);
    const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);
    const [selectedRowColumns, setSelectedRowColumns] = useState<string[]>([]);

    const handleExecuteQuery = async () => {
        setIsExecuting(true);
        try {
            await executeQuery(sqlQuery);
            toast.success("Query Executed Successfully");
        } catch (e) {
            toast.error("Execution Failed");
        } finally {
            setIsExecuting(false);
        }
    };

    const handleRowSelect = (row: DataRow | null, columns: string[]) => {
        setSelectedRow(row);
        setSelectedRowColumns(columns);
    };

    // Open row viewer (called on double-click)
    const handleOpenRowViewer = () => {
        setIsRowViewerActive(true);
    };

    const handleCloseRowViewer = () => {
        setIsRowViewerActive(false);
        setSelectedRow(null);
        setSelectedRowColumns([]);
    };

    const handleRemoveTable = (tableName: string) => {
        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, isSelected: false }
        });
        toast.success(`Removed ${tableName} from model`);
    };

    // Auto-close row viewer when SQL panel closes
    useEffect(() => {
        if (!showSqlEditor && isRowViewerActive) {
            handleCloseRowViewer();
        }
    }, [showSqlEditor]);

    const tablesForCanvas = useMemo(() => {
        return state.discoveredTables
            .filter(t => state.modelConfiguration[t.name])
            .map(t => ({
                name: t.name,
                fields: state.modelConfiguration[t.name] || []
            }));
    }, [state.discoveredTables, state.modelConfiguration]);

    return (
        <div className="flex flex-1 w-full h-full overflow-hidden bg-background relative">

            {/* 1. Central Canvas Area & Layout */}
            <CentralArea
                showSql={showSqlEditor}
                onToggleSql={() => setShowSqlEditor(!showSqlEditor)}
                sqlEditor={
                    <SQLPanel
                        sqlQuery={sqlQuery}
                        onQueryChange={(q) => dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: q })}
                        onExecute={handleExecuteQuery}
                        isExecuting={isExecuting}
                        onRowSelect={handleRowSelect}
                        onOpenRowViewer={handleOpenRowViewer}
                        tables={state.discoveredTables}
                    />
                }
                isConnecting={isConnecting}
                isConnected={isConnected}
                dbType={dbType}
                onRefreshData={onRefreshData}
                onConfigureCredentialsClick={onConfigureCredentialsClick}
                isModelDirty={state.isModelDirty}
                onConfirmModel={() => {
                    toast.success("Model Confirmed (Mock)");
                    dispatch({ type: ActionType.CONFIRM_MODEL });
                }}
                onLoadClick={() => setIsConfigManagerOpen(true)}
                onSaveClick={() => setIsSaveModalOpen(true)}
            >
                {/* Visual Graph Component */}
                <ReactFlowProvider>
                    <DataModelCanvas
                        joins={state.joins}
                        onJoinsChange={(j) => dispatch({ type: ActionType.SET_JOINS, payload: j })}
                        tablePositions={state.tablePositions}
                        onTablePositionsChange={(positions) => {
                            const newPositions = typeof positions === 'function' ? positions(state.tablePositions) : positions;
                            dispatch({ type: ActionType.SET_TABLE_POSITIONS, payload: newPositions });
                        }}
                        tables={tablesForCanvas}
                        onPreviewTable={onPreviewTable}
                        onRemoveTable={handleRemoveTable}
                        fieldAliases={state.fieldAliases}
                        isModelDirty={state.isModelDirty}
                        onConfirmModel={() => dispatch({ type: ActionType.CONFIRM_MODEL })}
                    />
                </ReactFlowProvider>
            </CentralArea>

            {/* 2. Collapsible Drawer */}
            <CollapsibleDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                state={state}
                dispatch={dispatch}
            />

            {/* 3. Fixed Right Panel (Tables/Preview) */}
            <div className="relative flex h-full z-30">
                <FixedRightPanel
                    state={state}
                    dispatch={dispatch}
                    onPreviewTable={onPreviewTable}
                    previewData={previewData || null}
                    onClearPreview={onClearPreview}
                    selectedRow={selectedRow}
                    selectedRowColumns={selectedRowColumns}
                    isRowViewerActive={isRowViewerActive}
                    onCloseRowViewer={handleCloseRowViewer}
                />
            </div>

            {/* Modals */}
            <ConfigManagerModal
                isOpen={isConfigManagerOpen}
                onClose={() => setIsConfigManagerOpen(false)}
                type="db_config"
                onLoad={(config, name) => {
                    dispatch({ type: ActionType.LOAD_CONFIG, payload: config });
                    dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name });
                    setIsConfigManagerOpen(false);
                }}
                userId={state.currentUser?.id}
            />

            <SaveConfigModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                type="db_config"
                configData={{
                    selectedFields: state.selectedFields,
                    modelConfiguration: state.modelConfiguration,
                    confirmedModelConfiguration: state.confirmedModelConfiguration,
                    joins: state.joins,
                    tablePositions: state.tablePositions,
                    fieldGroups: state.fieldGroups,
                    fieldAliases: state.fieldAliases
                }}
                onSaveSuccess={(name) => {
                    dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name });
                    setIsSaveModalOpen(false);
                }}
            />

        </div>
    );
};
export default MasterView;
