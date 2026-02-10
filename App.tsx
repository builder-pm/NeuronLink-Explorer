import React, { useEffect, useCallback, useMemo, useState, useRef, memo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Header from './components/Header';
import MainContent from './components/MainContent';
import Sidebar from './components/Sidebar';
import PivotConfigPanel from './components/PivotConfigPanel';
import PanelToggle from './components/PanelToggle';
import DbCredentialsModal from './components/DbCredentialsModal';
import TablePreviewModal from './components/TablePreviewModal';
import ModelingSecondaryPanel from './components/ModelingSecondaryPanel';
import ModelingPrimaryPanel from './components/ModelingPrimaryPanel';
import MasterView from './components/views/MasterView';
import { DataRow, PanelType, AIAction, Filter, PivotConfig, DatabaseType, AthenaCredentials, SupabaseCredentials, AppState, AppView, FieldGroups, Join, ModelConfiguration, FieldAliases, AggregationType } from './types';
import { generatePrompts, PromptContext } from './utils/promptSuggestions';
import { useAppState, useAppDispatch } from './state/context';
import { ActionType, AppAction } from './state/actions';
import { generateQuery, generatePreviewQuery } from './utils/dataProcessing';
import * as db from './services/database';
import { chatService } from './services/chatService';
import { getClient } from './services/supabase';
import * as backend from './services/backend';
import { appSupabase } from './services/appSupabase';
import { syncSchemaRegistry } from './services/schemaRegistry';
import { initLogging, logEvent } from './services/logger';
import AuthModal from './components/AuthModal'; // Import Auth Modal
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { validateMetricAvailability } from './utils/metricValidator';

// Error Boundary Fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-card border-4 border-destructive shadow-brutal text-center space-y-4">
    <div className="text-4xl">⚠️</div>
    <h3 className="text-xl font-bold font-mono">Component Crashed</h3>
    <p className="text-muted-foreground text-sm max-w-md font-mono">
      {error instanceof Error ? error.message : String(error)}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-primary text-primary-foreground font-bold border-2 border-foreground shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
    >
      Try Again
    </button>
  </div>
);

// By defining panel components outside of App and memoizing them, we prevent
// them from re-rendering on every state change in the parent App component.
// This is critical for stopping animations from re-triggering on unrelated interactions.

interface SecondaryPanelProps {
  currentView: AppView;
  pivotConfig: PivotConfig;
  filters: Filter[];
  dispatch: React.Dispatch<AppAction>;
  fieldGroups: FieldGroups;
  allAvailableFields: string[];

  state: AppState;
  sqlQuery: string;
  executeQuery: (query: string) => Promise<DataRow[]>;
  onPreviewTable: (tableName: string) => void;
  onBatchUpdate: (config: PivotConfig, filters: Filter[]) => void;
}

const SecondaryPanelComponent: React.FC<SecondaryPanelProps> = ({
  currentView, pivotConfig, filters, dispatch, fieldGroups, allAvailableFields, state,
  sqlQuery, executeQuery, onPreviewTable, onBatchUpdate
}) => {
  if (currentView === 'analysis') {
    return (
      <PivotConfigPanel
        config={pivotConfig}
        filters={filters}
        onPivotChange={(field, targetZone) => dispatch({ type: ActionType.UPDATE_PIVOT, payload: { field, targetZone } })}
        onFilterChange={(field) => {
          const isNumeric = ['total_jobs', 'total_positions', 'source_id'].includes(field);
          dispatch({ type: ActionType.ADD_FILTER, payload: { id: Date.now().toString(), field, operator: 'equals', value: isNumeric ? 0 : '' } });
        }}
        onFilterUpdate={(filter) => dispatch({ type: ActionType.UPDATE_FILTER, payload: filter })}
        onRemovePivotItem={(item, zone) => dispatch({ type: ActionType.REMOVE_PIVOT_ITEM, payload: { item, zone } })}
        onRemoveFilter={(id) => dispatch({ type: ActionType.REMOVE_FILTER, payload: id })}
        onPivotValueRename={(index, newName) => dispatch({ type: ActionType.RENAME_PIVOT_VALUE, payload: { index, newName } })}
        fieldAliases={state.fieldAliases}
        onBatchUpdate={onBatchUpdate}
        dispatch={dispatch}
        availableFields={allAvailableFields}
      />
    );
  }
  return (
    <ModelingSecondaryPanel
      state={state}
      dispatch={dispatch}
      sqlQuery={sqlQuery}
      executeQuery={executeQuery}
      availableFields={allAvailableFields}
      fieldGroups={fieldGroups}
      onPreviewTable={onPreviewTable}
    />
  );
};
const MemoizedSecondaryPanel = memo(SecondaryPanelComponent);

interface PrimaryPanelProps {
  currentView: AppView;
  activePanel: PanelType;
  selectedFields: string[];
  onFieldChange: (field: string, isSelected: boolean) => void;
  onAIAction: (action: AIAction) => void;
  fieldGroups: FieldGroups;
  executeQuery: (query: string) => Promise<DataRow[]>;
  availableFields: string[];
  dispatch: React.Dispatch<AppAction>;
  onSendMessage: (text: string, modelId: string) => void;
  isAiLoading: boolean;
  isDemoMode: boolean;
  fieldAliases: FieldAliases;
  isGuest?: boolean;
  state: AppState;
  // New props for SemanticContext
  modelConfiguration: ModelConfiguration;
  confirmedModelConfiguration: ModelConfiguration;
  joins: Join[];
  onCancelAI?: () => void;
  onCancelAI?: () => void;
  metrics: import('./types').Metric[];
  hiddenFields: Set<string>;
}

const PrimaryPanelComponent: React.FC<PrimaryPanelProps> = ({
  currentView, activePanel, selectedFields, onFieldChange, onAIAction, fieldGroups,
  executeQuery, availableFields, dispatch,
  onSendMessage, isAiLoading,
  isDemoMode, fieldAliases, isGuest,
  modelConfiguration, confirmedModelConfiguration, joins, state, onCancelAI, metrics, hiddenFields
}) => {
  if (currentView === 'analysis') {
    return (
      <Sidebar
        activePanel={activePanel}
        selectedFields={selectedFields} // This receives analysisActiveFields from parent
        onFieldChange={onFieldChange}
        onAIAction={onAIAction}
        fieldGroups={fieldGroups}
        executeQuery={executeQuery}
        availableFields={availableFields}
        fieldAliases={fieldAliases}
        isGuest={isGuest}
        semanticContext={{
          configName: state.configName,
          view: currentView,
          modelConfiguration: confirmedModelConfiguration, // Use confirmed for AI context in Analysis
          joins: joins,
          fieldAliases: fieldAliases,
          metrics: metrics
        }}
        suggestedPrompts={[]}
        chatMessages={state.chatMessages}
        dispatch={dispatch}
        onSendMessage={onSendMessage}
        onCancelAI={onCancelAI}
        isAiLoading={isAiLoading}
        chatThreads={state.chatThreads}
        currentThreadId={state.currentThreadId}
        metrics={metrics}
        hiddenFields={hiddenFields}
      />

    );
  }
  if (currentView === 'modeling') {
    return <ModelingPrimaryPanel state={state as AppState} dispatch={dispatch} />;
  }

  return null;
};
const MemoizedPrimaryPanel = memo(PrimaryPanelComponent);

interface MainAreaProps {
  currentView: AppView;
  paginatedData: DataRow[];
  tableHeaders: string[];
  isLoading: boolean;
  fileName: string;
  dispatch: React.Dispatch<AppAction>;
  currentPage: number;
  rowsPerPage: number;
  totalRows: number;
  onRowsPerPageChange: (value: number) => void;
  onExport: (type?: 'preview' | 'full') => void;
  isDemoMode: boolean;
  state: AppState;
}

const MainAreaComponent: React.FC<MainAreaProps> = ({
  currentView, paginatedData, tableHeaders, isLoading, fileName, dispatch, currentPage,
  rowsPerPage, totalRows, onRowsPerPageChange, onExport, isDemoMode,
  state
}) => {
  if (currentView === 'analysis') {
    return (
      <MainContent
        data={paginatedData}
        tableHeaders={tableHeaders}
        isLoading={isLoading}
        fileName={fileName}
        onFileNameChange={(name) => dispatch({ type: ActionType.SET_FILE_NAME, payload: name })}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={(page) => dispatch({ type: ActionType.SET_CURRENT_PAGE, payload: page })}
        onRowsPerPageChange={onRowsPerPageChange}
        onExport={onExport}
        isDemoMode={isDemoMode}
        isPristine={Object.keys(state.modelConfiguration).length === 0}
      />
    );
  }

  return null;
}
const MemoizedMainArea = memo(MainAreaComponent);


const App: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const {
    currentView, isLoadingData, activePanel, isSecondaryPanelOpen, configName, fileName,
    processedData, selectedFields, analysisActiveFields, currentPage, rowsPerPage,
    pivotConfig, filters, sqlQuery, joins, fieldGroups,
    discoveredTables, modelConfiguration, confirmedModelConfiguration,
    databaseType, athenaCredentials, supabaseCredentials,
    isConnectingToLakehouse, isLakehouseConnected, isDemoMode
  } = state;

  const [dbService, setDbService] = useState<typeof db | null>(null);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ name: string, data: DataRow[] } | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  // Authentication & Session Init
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await appSupabase.auth.getSession();
      const storedGuestMode = localStorage.getItem('neuronlink_guest_mode') === 'true';

      if (session?.user) {
        setUser(session.user);
        dispatch({ type: ActionType.SET_USER, payload: session.user as any });
        setIsGuest(false);
        localStorage.removeItem('neuronlink_guest_mode');
        initLogging();
        // Fetch chat threads for logged-in user
        try {
          const threads = await chatService.getUserThreads();
          dispatch({ type: ActionType.SET_THREADS, payload: threads });
        } catch (error) {
          console.error("Failed to fetch user threads:", error);
        }
      } else if (storedGuestMode) {
        setIsGuest(true);
      }

      setIsAuthChecking(false);
    };
    initAuth();

    const { data: { subscription } } = appSupabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      dispatch({ type: ActionType.SET_USER, payload: (session?.user as any) ?? null });
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem('neuronlink_guest_mode');
        if (_event === 'SIGNED_IN') {
          logEvent('AUTH', 'LOGIN', { provider: session.user.app_metadata.provider });
          // Fetch chat threads on sign-in
          try {
            const threads = await chatService.getUserThreads();
            dispatch({ type: ActionType.SET_THREADS, payload: threads });
          } catch (error) {
            console.error("Failed to fetch user threads on sign-in:", error);
          }
        }
      }
      if (_event === 'SIGNED_OUT') {
        logEvent('AUTH', 'LOGOUT');
        setIsGuest(false);
        dispatch({ type: ActionType.SET_THREADS, payload: [] }); // Clear threads on sign-out
        dispatch({ type: ActionType.SET_CURRENT_THREAD, payload: null }); // Clear current thread
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startWidth = rightPanelWidth;

    const doDrag = (mouseMoveEvent: MouseEvent) => {
      const newWidth = startWidth + (startX - mouseMoveEvent.clientX);
      if (newWidth > 280 && newWidth < 800) {
        setRightPanelWidth(newWidth);
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  const connectToSupabase = useCallback(async (credentials: SupabaseCredentials) => {
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: true });
    // ID 'supabase-connect' allows us to update the toast status (loading -> success/error)
    toast.loading('Connecting to Supabase...', { id: 'supabase-connect' });

    const { success, message } = await backend.testSupabaseConnection(credentials);

    if (success) {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: true });
      // Update toast to indicate connection passed but data is loading
      toast.loading('Connection verified! Loading tables...', { id: 'supabase-connect' });
      logEvent('DATA', 'DB_CONNECT', { type: 'supabase' });

      try {
        const tables = await backend.fetchSupabaseTables(credentials);
        await db.resetAndLoadData(tables);

        const discovered = await db.discoverTables();
        dispatch({ type: ActionType.SET_DISCOVERED_TABLES, payload: discovered });

        // Sync Schema Registry
        try {
          const registry = await syncSchemaRegistry(credentials);
          dispatch({
            type: ActionType.SET_SCHEMA_REGISTRY_DATA,
            payload: { data: registry.data, driftDetected: registry.driftDetected }
          });
          if (registry.driftDetected) {
            toast('Schema drift detected since last sync.', { icon: '⚠️' });
            logEvent('DATA', 'SCHEMA_DRIFT', { db_hash: registry.data.dbUrlHash });
          }
        } catch (registryError) {
          console.error('Schema registry sync failed:', registryError);
        }

        // Final success message
        toast.success('DVD Rental database loaded and ready!', { id: 'supabase-connect' });
      } catch (e: any) {
        toast.error(`Failed to load data: ${e.message}`, { id: 'supabase-connect' });
        dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      }
    } else {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      toast.error(`Connection failed: ${message}`, { id: 'supabase-connect' });
    }
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: false });
  }, [dispatch]);

  useEffect(() => {
    const initDb = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        await db.init(!isDemoMode);
        setDbService(db);

        if (databaseType === 'supabase' && supabaseCredentials && !isDemoMode) {
          await connectToSupabase(supabaseCredentials);
        } else if ((databaseType === 'athena' && !athenaCredentials && !isDemoMode) || (databaseType === 'supabase' && !supabaseCredentials && !isDemoMode)) {
          setIsCredsModalOpen(true);
        } else {
          const tables = await db.discoverTables();
          dispatch({ type: ActionType.SET_DISCOVERED_TABLES, payload: tables });
        }
      } catch (error) {
        console.error("Database initialization failed:", error);
        toast.error("Failed to initialize in-browser database.");
      } finally {
        dispatch({ type: ActionType.SET_LOADING, payload: false });
      }
    }
    initDb();
  }, [dispatch, isDemoMode, connectToSupabase, databaseType, athenaCredentials, supabaseCredentials]);

  // Auto-update SQL query when model changes (Task 7)
  useEffect(() => {
    if (discoveredTables.length === 0) return;

    // We use modelConfiguration (WIP) so the SQL updates live as the user edits the model
    const query = generatePreviewQuery(
      modelConfiguration,
      joins,
      discoveredTables,
      state.fieldAliases
    );

    if (query && query !== sqlQuery) {
      dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query });
    }
  }, [modelConfiguration, joins, discoveredTables, dispatch, state.fieldAliases]);

  // Run Query Effect
  useEffect(() => {
    console.log('[App] RunQuery Effect Triggered', {
      hasDbService: !!dbService,
      discoveredTablesLen: discoveredTables.length,
      isConnected: isLakehouseConnected,
      isDemo: isDemoMode
    });

    if (!dbService || (discoveredTables.length === 0 && !isLakehouseConnected && !isDemoMode)) {
      console.log('[App] RunQuery Aborted: DB Service or Tables missing');
      return;
    }

    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const activeModelConfig = Object.keys(modelConfiguration).length > 0
          ? modelConfiguration
          : confirmedModelConfiguration;

        console.log('[App] Generating query with:', {
          activeTables: Object.keys(activeModelConfig),
          pivotRows: pivotConfig.rows
        });

        const fullQueryRaw = await generateQuery(
          { modelConfig: activeModelConfig, joins },
          pivotConfig,
          filters,
          discoveredTables,
          state.fieldAliases,
          analysisActiveFields,
          state.metrics
        );

        console.log('[App] Generated Query:', fullQueryRaw);

        let queryToRun: string | null = fullQueryRaw;
        if (isGuest && fullQueryRaw) {
          queryToRun = fullQueryRaw.replace(/LIMIT\s+\d+/i, 'LIMIT 10');
          if (!queryToRun.match(/LIMIT 10/i)) {
            queryToRun = `${fullQueryRaw} LIMIT 10`;
          }
        }

        if (queryToRun && queryToRun.length > 0) {
          const startTime = performance.now();
          const results = await dbService.executeQuery(queryToRun);
          console.log('[App] Query Results:', results.length, 'rows');
          dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: results });

          logEvent('DATA', 'QUERY_EXECUTE', {
            query_snippet: queryToRun.substring(0, 50),
            duration_ms: Math.round(performance.now() - startTime),
            row_count: results.length,
            success: true
          });
        } else {
          console.log('[App] No query to run (null or empty)');
          dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: [] });
        }
      } catch (error: any) {
        console.error("Error executing query:", error);
        toast.error(`SQL Error: ${error.message}`);
        dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: [] });
      } finally {
        dispatch({ type: ActionType.SET_LOADING, payload: false });
      }
    };
    runQuery();
  }, [dbService, sqlQuery, pivotConfig, filters, joins, confirmedModelConfiguration, modelConfiguration, discoveredTables, dispatch, isLakehouseConnected, isDemoMode, state.fieldAliases, analysisActiveFields]);

  const handleRefreshData = useCallback(() => {
    if (!dbService) return;
    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const activeModelConfig = Object.keys(modelConfiguration).length > 0
          ? modelConfiguration
          : confirmedModelConfiguration;

        const fullQuery = await generateQuery(
          { modelConfig: activeModelConfig, joins },
          pivotConfig,
          filters,
          discoveredTables,
          state.fieldAliases,
          analysisActiveFields,
          state.metrics
        );
        if (fullQuery) {
          const results = await dbService.executeQuery(fullQuery);
          dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: results });
          toast.success("Data refreshed!");
        }
      } catch (error: any) {
        toast.error(`SQL Error: ${error.message}`);
      } finally {
        dispatch({ type: ActionType.SET_LOADING, payload: false });
      }
    };
    runQuery();
  }, [dbService, dispatch, filters, joins, confirmedModelConfiguration, modelConfiguration, pivotConfig, discoveredTables]);

  const handleExport = useCallback(async (type?: 'preview' | 'full') => {
    if (isGuest) {
      toast.error('Exporting is disabled in Guest Mode.');
      return;
    }
    try {
      let exportData = processedData;
      if (type === 'full') {
        if (!dbService || !sqlQuery) {
          toast.error("Database or query not ready.");
          return;
        }
        const toastId = toast.loading("Fetching full dataset...");
        const fullQuery = sqlQuery.replace(/LIMIT\s+\d+(\s+OFFSET\s+\d+)?/i, '');
        try {
          exportData = await dbService.executeQuery(fullQuery);
          toast.dismiss(toastId);
        } catch (err: any) {
          toast.dismiss(toastId);
          toast.error(`Failed to fetch: ${err.message}`);
          return;
        }
      }
      if (exportData.length === 0) {
        toast.error("No data to export.");
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${fileName || 'data'}.xlsx`);
      toast.success(`Export successful! (${exportData.length} rows)`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed.");
    }
  }, [processedData, fileName, dbService, sqlQuery]);

  const handleRowsPerPageChange = useCallback((value: number) => {
    dispatch({ type: ActionType.SET_ROWS_PER_PAGE, payload: value });
  }, [dispatch]);

  const handleAIAction = useCallback(async (action: AIAction): Promise<boolean> => {
    if (isGuest) { toast.error('Sign in to unlock!'); return false; }
    if (action.action === 'pivot') {
      dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: { ...pivotConfig, ...action.config as Partial<PivotConfig> } });
    } else if (action.action === 'filter') {
      const newFilter = action.config as Filter;
      dispatch({ type: ActionType.ADD_FILTER, payload: { ...newFilter, id: Date.now().toString() } });
    } else if (action.action === 'propose_model' && action.modelProposal) {
      if (currentView !== 'modeling') dispatch({ type: ActionType.SET_VIEW, payload: 'modeling' });
      dispatch({ type: ActionType.SET_JOINS, payload: action.modelProposal.joins });
      dispatch({ type: ActionType.SET_MODEL_CONFIGURATION, payload: action.modelProposal.modelConfiguration });
      // Auto-confirm AI proposals so they take effect in queries immediately
      dispatch({ type: ActionType.CONFIRM_MODEL });
      toast.success("AI Proposal Applied");
    } else if (action.action === 'propose_analysis' && action.analysisProposal) {
      // Build set of all fields in the confirmed model for validation
      const activeModelConfig = Object.keys(modelConfiguration).length > 0
        ? modelConfiguration : confirmedModelConfiguration;

      // Build mapping for normalization (handle table.field and plain field)
      const qualifiedToPlain = new Map<string, string>();
      const plainToTable = new Map<string, string>();
      const validPlainNames = new Set<string>();

      Object.entries(activeModelConfig).forEach(([table, fields]) => {
        fields.forEach(field => {
          qualifiedToPlain.set(`${table}.${field}`, field);
          plainToTable.set(field, table);
          validPlainNames.add(field);
        });
      });

      const normalize = (f: string) => {
        if (validPlainNames.has(f)) return f;
        if (qualifiedToPlain.has(f)) return qualifiedToPlain.get(f)!;
        // Case-insensitive check just in case
        const lowerField = f.toLowerCase();
        for (const [q, p] of qualifiedToPlain.entries()) {
          if (q.toLowerCase() === lowerField) return p;
        }
        for (const p of validPlainNames) {
          if (p.toLowerCase() === lowerField) return p;
        }
        return null;
      };

      // Validate & filter pivot config to only include fields that exist in model
      const p = action.analysisProposal.pivotConfig;
      const f = action.analysisProposal.filters || [];

      const validatedPivot = {
        rows: p.rows.map(normalize).filter((f): f is string => f !== null),
        columns: p.columns.map(normalize).filter((f): f is string => f !== null),
        values: p.values.map(v => ({ ...v, field: normalize(v.field) })).filter((v): v is { field: string; aggregation: AggregationType; displayName?: string } => v.field !== null),
      };

      const validatedFilters = f.map(filt => ({ ...filt, field: normalize(filt.field) })).filter((filt): filt is Filter => filt.field !== null);

      const droppedFields = [
        ...p.rows.filter(field => !normalize(field)),
        ...p.columns.filter(field => !normalize(field)),
        ...p.values.filter(v => !normalize(v.field)).map(v => v.field),
        ...f.filter(filt => !normalize(filt.field)).map(filt => filt.field)
      ];

      if (droppedFields.length > 0) {
        console.warn('[AI] Dropped fields not in model:', droppedFields);
        toast.error(`AI suggested fields not in model: ${droppedFields.join(', ')}`);
      }

      if (validatedPivot.rows.length === 0 && validatedPivot.values.length === 0 && validatedPivot.columns.length === 0) {
        toast.error("AI suggested fields that aren't in your model. Try adding them from the Structure tab first.");
        return false;
      }

      dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: validatedPivot });
      dispatch({ type: ActionType.SET_FILTERS, payload: validatedFilters });

      // Merge new pivot fields with existing analysisActiveFields (don't replace)
      const pivotFields = [
        ...validatedPivot.rows,
        ...validatedPivot.columns,
        ...validatedPivot.values.map(v => v.field),
        ...validatedFilters.map(filt => filt.field)
      ];
      const mergedActiveFields = [...new Set([...analysisActiveFields, ...pivotFields])];
      dispatch({ type: ActionType.SET_ANALYSIS_ACTIVE_FIELDS, payload: mergedActiveFields });

      toast.success("AI Analysis applied!");
    } else if (action.action === 'suggest_fields' && action.suggestedFields) {
      // Phase 7: Handle AI field suggestions
      // Merge suggested fields into current model configuration
      const newModelConfig = { ...modelConfiguration };
      action.suggestedFields.forEach(suggestion => {
        const currentFields = newModelConfig[suggestion.table] || [];
        newModelConfig[suggestion.table] = [...new Set([...currentFields, ...suggestion.fields])];
      });

      // Also merge suggested joins if provided
      if (action.suggestedJoins && action.suggestedJoins.length > 0) {
        const existingJoinKeys = new Set(joins.map(j => `${j.from}-${j.to}-${j.on.from}-${j.on.to}`));
        const newJoins = [...joins];

        action.suggestedJoins.forEach(sj => {
          const key = `${sj.from}-${sj.to}-${sj.on.from}-${sj.on.to}`;
          if (!existingJoinKeys.has(key)) {
            newJoins.push(sj);
            existingJoinKeys.add(key);
          }
        });

        dispatch({ type: ActionType.SET_JOINS, payload: newJoins });
      }

      dispatch({ type: ActionType.SET_MODEL_CONFIGURATION, payload: newModelConfig });
      // Auto-confirm suggested fields so queries can run with them
      dispatch({ type: ActionType.CONFIRM_MODEL });
      toast.success(`Added ${action.suggestedFields.length} table(s) to your model!`, { icon: '✨' });
    }
    return true;
  }, [dispatch, pivotConfig, isGuest, currentView, modelConfiguration, joins, confirmedModelConfiguration, analysisActiveFields]);

  // AbortController for cancelling in-flight AI requests
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const handleCancelAI = useCallback(() => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
  }, []);

  const handleSendChatMessage = useCallback(async (text: string, modelId: string) => {
    if (text.trim() === '' || state.isAiLoading) return;

    const userMessage: import('./types').ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now()
    };

    // Dispatch User Message
    dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: userMessage });
    dispatch({ type: ActionType.SET_AI_LOADING, payload: true });

    // Create AbortController for this request
    const abortController = new AbortController();
    aiAbortControllerRef.current = abortController;

    // Cloud Persistence: Create thread if needed, save message
    let activeThreadId = state.currentThreadId;
    if (state.currentUser && getClient()) { // Check if logged in and client initialized
      if (!activeThreadId) {
        const { data: { user } } = await getClient()!.auth.getUser();
        if (user) {
          const thread = await chatService.createThread(text.trim().substring(0, 50), user.id);
          if (thread) {
            activeThreadId = thread.id;
            dispatch({ type: ActionType.SET_CURRENT_THREAD, payload: activeThreadId });
            dispatch({ type: ActionType.ADD_THREAD, payload: thread });
          }
        }
      }

      if (activeThreadId) {
        await chatService.addMessage(activeThreadId, userMessage);
      }
    }

    try {
      const history = [...state.chatMessages, userMessage];

      // Prepare semantic context
      const context: import('./types').SemanticContext = {
        configName: configName,
        view: currentView,
        modelConfiguration: isDemoMode ? {} : (Object.keys(modelConfiguration).length > 0 ? modelConfiguration : confirmedModelConfiguration),
        joins: joins,
        fieldAliases: state.fieldAliases,
        fieldMetadata: state.fieldMetadata,
        sampleValues: state.sampleValues,
        schemaRegistry: state.schemaRegistry,
        metrics: state.metrics
      };

      const { getAIResponse, getAIResponseWithData } = await import('./services/gemini');
      const { action, textResponse } = await getAIResponse(history, userMessage.text, context, modelId, abortController.signal);

      if (action?.action === 'query' && action.query) {
        const initialModelMessage: import('./types').ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: textResponse,
          isLoading: true,
          timestamp: Date.now()
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: initialModelMessage });
        if (activeThreadId) {
          await chatService.addMessage(activeThreadId, initialModelMessage);
        }

        let queryResult: DataRow[] = [];
        if (dbService) {
          queryResult = await dbService.executeQuery(action.query);
        }

        const finalResponse = await getAIResponseWithData(userMessage.text, action.query, queryResult, modelId);

        const finalModelMessage: import('./types').ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'model',
          text: finalResponse,
          timestamp: Date.now(),
          appliedAction: action
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: finalModelMessage });
        if (activeThreadId) {
          await chatService.addMessage(activeThreadId, finalModelMessage);
        }

      } else if (action?.action === 'suggest_fields') {
        const modelMessage: import('./types').ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: textResponse,
          suggestAction: action,
          timestamp: Date.now()
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: modelMessage });
        if (activeThreadId) {
          await chatService.addMessage(activeThreadId, modelMessage);
        }
      } else {
        let actionApplied = false;
        if (action) {
          actionApplied = await handleAIAction(action);
        }
        const modelMessage: import('./types').ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: textResponse,
          timestamp: Date.now(),
          appliedAction: actionApplied ? action! : undefined
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: modelMessage });

        // Cloud Persistence: Save model message
        if (activeThreadId) {
          await chatService.addMessage(activeThreadId, modelMessage);
        }
      }

    } catch (error: any) {
      if (error?.name === 'AbortError') {
        const cancelMessage: import('./types').ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Request cancelled.',
          timestamp: Date.now()
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: cancelMessage });
      } else {
        console.error("Error fetching AI response:", error);
        const errorMessage: import('./types').ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now()
        };
        dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: errorMessage });
        if (activeThreadId) {
          await chatService.addMessage(activeThreadId, errorMessage);
        }
      }
    } finally {
      aiAbortControllerRef.current = null;
      dispatch({ type: ActionType.SET_AI_LOADING, payload: false });
    }
  }, [dispatch, state.isAiLoading, state.chatMessages, configName, currentView, isDemoMode, modelConfiguration, confirmedModelConfiguration, joins, state.fieldAliases, state.fieldMetadata, state.sampleValues, state.schemaRegistry, state.metrics, dbService, handleAIAction, state.currentUser, state.currentThreadId]);

  const handleDbFieldChange = useCallback((field: string, isSelected: boolean) => {
    const newSelectedFields = isSelected ? [...new Set([...selectedFields, field])] : selectedFields.filter(f => f !== field);
    dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: newSelectedFields });
  }, [dispatch, selectedFields]);

  const handleAnalysisFieldChange = useCallback((field: string, isSelected: boolean) => {
    // 1. Update Active Fields List
    const newFields = isSelected ? [...new Set([...analysisActiveFields, field])] : analysisActiveFields.filter(f => f !== field);
    dispatch({ type: ActionType.SET_ANALYSIS_ACTIVE_FIELDS, payload: newFields });

    // 2. Sync Pivot Config
    if (isSelected) {
      // Check if this is a metric
      const isMetric = state.metrics.some(m => m.id === field);

      if (isMetric) {
        // If selecting a metric, add to values if not already there
        const inVals = pivotConfig.values.some(v => v.field === field);
        if (!inVals) {
          const metric = state.metrics.find(m => m.id === field);
          dispatch({
            type: ActionType.SET_PIVOT_CONFIG,
            payload: {
              ...pivotConfig,
              values: [...pivotConfig.values, { field, aggregation: 'SUM' as AggregationType, displayName: metric?.name || field }]
            }
          });
        }
      } else {
        // If selecting a dimension, add to rows if not present in any zone
        const inRows = pivotConfig.rows.includes(field);
        const inCols = pivotConfig.columns.includes(field);
        const inVals = pivotConfig.values.some(v => v.field === field);

        if (!inRows && !inCols && !inVals) {
          dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: { ...pivotConfig, rows: [...pivotConfig.rows, field] } });
        }
      }
    } else {
      // If unselecting, remove from ALL zones to keep state consistent
      const newRows = pivotConfig.rows.filter(f => f !== field);
      const newCols = pivotConfig.columns.filter(f => f !== field);
      const newVals = pivotConfig.values.filter(v => v.field !== field);

      dispatch({
        type: ActionType.SET_PIVOT_CONFIG,
        payload: {
          ...pivotConfig,
          rows: newRows,
          columns: newCols,
          values: newVals
        }
      });
    }
  }, [dispatch, analysisActiveFields, pivotConfig, state.metrics]);


  const handleTestConnection = useCallback(async (type: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => {
    if (type === 'supabase' && creds) {
      toast.loading('Testing connection...', { id: 'test-conn' });
      const { success, message } = await backend.testSupabaseConnection(creds as SupabaseCredentials);
      if (success) {
        toast.success('Connection verified successfully!', { id: 'test-conn' });
      } else {
        toast.error(`Connection failed: ${message}`, { id: 'test-conn' });
      }
    } else if (type === 'sqlite') {
      toast.success('SQLite (In-Browser) is available.', { id: 'test-conn' });
    }
  }, []);

  const handleSaveCredentialsAndConnect = useCallback(async (type: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => {
    if (type === 'supabase' && creds) {
      if (isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE }); // This will reset state for non-demo mode
      } else {
        // Even if not in demo mode, if we are changing credentials/db, we should clear previous data
        dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: [] });
        dispatch({ type: ActionType.SET_DISCOVERED_TABLES, payload: [] });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: type });
      // Store credentials so they persist
      dispatch({ type: ActionType.SET_SUPABASE_CREDENTIALS, payload: creds as SupabaseCredentials });
      await connectToSupabase(creds as SupabaseCredentials);
    } else {
      if (!isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: 'sqlite' });
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      toast.success("Switched to in-browser SQLite with demo data.");
    }
    setIsCredsModalOpen(false);
  }, [dispatch, connectToSupabase, isDemoMode]);

  const availableFields = useMemo(() => {
    // Priority 1: Use draft modelConfiguration if it has any tables selected
    // Priority 2: Fall back to confirmedModelConfiguration
    const config = Object.keys(modelConfiguration).length > 0
      ? modelConfiguration
      : confirmedModelConfiguration;

    const fields = new Set<string>();

    if (Object.keys(config).length > 0) {
      for (const tableName in config) {
        config[tableName].forEach(f => fields.add(f));
      }
    }

    // Always include metrics as available fields, but only if they are valid for the current config
    state.metrics.forEach(m => {
      const validation = validateMetricAvailability(m, config);
      if (validation.isValid) {
        fields.add(m.id);
      }
    });

    return Array.from(fields);
  }, [modelConfiguration, confirmedModelConfiguration, state.metrics]);

  const dynamicFieldGroups = useMemo(() => {
    const config = Object.keys(modelConfiguration).length > 0
      ? modelConfiguration
      : confirmedModelConfiguration;

    // If no tables are selected in the model and no metrics, fall back to the demo fieldGroups
    if (Object.keys(config).length === 0 && state.metrics.length === 0) {
      return fieldGroups;
    }

    const groups: FieldGroups = {};
    const allFieldsInModel = new Set<string>();

    // 1. Table-based groups
    Object.entries(config).forEach(([tableName, fields]) => {
      const groupName = tableName.toUpperCase();
      groups[groupName] = fields;
      fields.forEach(f => allFieldsInModel.add(f));
    });

    // 2. Metrics Group
    if (state.metrics.length > 0) {
      groups['Metrics'] = state.metrics.map(m => m.id);
    }

    // 3. Semantic Groups
    const semanticGroups: { [key: string]: string[] } = {
      'Dates & Time': [],
      'Location': [],
      'Financials': [],
      'IDs & Keys': [],
      'People & Contact': []
    };

    const patterns = {
      TEMPORAL: /date|time|timestamp|year|month|day|created_at|updated_at/i,
      GEOGRAPHIC: /country|city|state|region|address|postal|zip|lat|long|district/i,
      FINANCIAL: /amount|price|cost|rate|revenue|payment|salary|total/i,
      IDENTIFIERS: /_id$|^id$|uuid|guid/i,
      PEOPLE: /first_name|last_name|full_name|email|phone|mobile|username|password|actor|staff|customer|manager/i
    };

    allFieldsInModel.forEach(field => {
      if (patterns.TEMPORAL.test(field)) semanticGroups['Dates & Time'].push(field);
      if (patterns.GEOGRAPHIC.test(field)) semanticGroups['Location'].push(field);
      if (patterns.FINANCIAL.test(field)) semanticGroups['Financials'].push(field);
      if (patterns.IDENTIFIERS.test(field)) semanticGroups['IDs & Keys'].push(field);
      if (patterns.PEOPLE.test(field)) semanticGroups['People & Contact'].push(field);
    });

    // Add semantic groups if they have fields
    Object.entries(semanticGroups).forEach(([name, fields]) => {
      if (fields.length > 0) {
        groups[name] = [...new Set(fields)]; // Deduplicate just in case
      }
    });

    // Always include Uncategorized
    groups['Uncategorized'] = [];

    return groups;
  }, [modelConfiguration, confirmedModelConfiguration, fieldGroups, state.metrics]);

  const tableHeaders = useMemo(() => {
    if (processedData.length === 0) return [];
    return Object.keys(processedData[0]);
  }, [processedData]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const handlePivotBatchUpdate = useCallback((newConfig: PivotConfig, newFilters: Filter[]) => {
    dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: newConfig });
    dispatch({ type: ActionType.SET_FILTERS, payload: newFilters });

    // Sync Active Fields with the new Config (e.g. if "Clear All" was clicked)
    const uniqueFields = new Set<string>();
    newConfig.rows.forEach(f => uniqueFields.add(f));
    newConfig.columns.forEach(f => uniqueFields.add(f));
    newConfig.values.forEach(v => uniqueFields.add(v.field));

    // Dispatch the new active fields list to keep Sidebar in sync
    dispatch({ type: ActionType.SET_ANALYSIS_ACTIVE_FIELDS, payload: Array.from(uniqueFields) });

    logEvent('ANALYSIS', 'PIVOT_UPDATE', {
      rows: newConfig.rows,
      cols: newConfig.columns,
      values: newConfig.values.length,
      filters: newFilters.length
    });
  }, [dispatch]);

  const handlePreviewTable = useCallback(async (tableName: string) => {
    if (!dbService) return;
    dispatch({ type: ActionType.SET_LOADING, payload: true });
    try {
      // Find metrics that apply to this table (i.e. all their required fields are in this table)
      const tableInfo = discoveredTables.find(t => t.name === tableName);
      const tableColumns = tableInfo?.fields || [];

      // Create a temporary config representing just this table to check metric validity against it
      const singleTableConfig = { [tableName]: tableColumns };

      const applicableMetrics = state.metrics.filter(m => {
        return validateMetricAvailability(m, singleTableConfig).isValid;
      });

      // Use double quotes for identifiers to be compatible with SQLite/standard SQL
      let query = `SELECT * FROM "${tableName}" LIMIT 10`;

      if (applicableMetrics.length > 0) {
        const metricSelections = applicableMetrics.map(m => `(${m.formula}) AS "${m.name}"`).join(', ');
        query = `SELECT *, ${metricSelections} FROM "${tableName}" LIMIT 10`;
      }

      const results = await dbService.executeQuery(query);
      setPreviewData({ name: tableName, data: results });
    } catch (e: any) {
      toast.error(`Failed to preview table: ${e.message}`);
    } finally {
      dispatch({ type: ActionType.SET_LOADING, payload: false });
    }
  }, [dbService, dispatch, state.metrics, discoveredTables]);

  const executeQuery = useCallback(async (query: string) => {
    if (!dbService) return [];
    try {
      const results = await dbService.executeQuery(query);
      return results;
    } catch (e) {
      console.error("Query failed", e);
      throw e; // Rethrow to allow caller UI to handle/show error
    }
  }, [dbService]);



  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col font-sans">
      {!isAuthChecking && !user && !isGuest && (
        <AuthModal onAuthSuccess={(guest) => guest ? setIsGuest(true) : setUser(appSupabase.auth.getUser().then(({ data }) => data.user))} />
      )}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'hsl(0 0% 15%)',
            color: 'hsl(0 0% 100%)',
            border: '2px solid hsl(0 0% 40%)',
            borderRadius: '0',
            fontFamily: '"Space Grotesk", sans-serif',
            boxShadow: '4px 4px 0 0 hsl(0 0% 40%)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'hsl(76 100% 67%)',
              secondary: 'hsl(0 0% 10%)',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: 'hsl(0 100% 50%)',
              secondary: 'hsl(0 0% 100%)',
            },
          }
        }}
      />
      <Header
        activePanel={activePanel}
        onTogglePanel={(panel) => dispatch({ type: ActionType.SET_ACTIVE_PANEL, payload: panel })}
        configName={configName}
        onConfigNameChange={(name) => dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name })}
        isGuest={isGuest}
        onSignIn={() => {
          setIsGuest(false);
          localStorage.removeItem('neuronlink_guest_mode');
        }}
        user={user}
        onSignOut={async () => {
          await appSupabase.auth.signOut();
          setUser(null);
          setIsGuest(false);
        }}
      />

      {/* Define these variables before using them in MasterView or MainArea */}
      {(() => {
        const onConfigureCredentialsClick = () => setIsCredsModalOpen(true);
        const onRefreshData = handleRefreshData;
        const isConnecting = isConnectingToLakehouse;
        const isConnected = isLakehouseConnected;
        const dbType = databaseType;

        return currentView === 'modeling' ? (
          <MasterView
            state={state as AppState}
            dispatch={dispatch}
            sqlQuery={sqlQuery}
            executeQuery={executeQuery}
            onPreviewTable={handlePreviewTable}
            onConfigureCredentialsClick={onConfigureCredentialsClick}
            onRefreshData={onRefreshData}
            isConnecting={isConnecting}
            isConnected={isConnected}
            dbType={dbType}
            previewData={previewData}
            onClearPreview={() => setPreviewData(null)}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col relative min-w-0">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <MemoizedMainArea
                  currentView={currentView}
                  paginatedData={paginatedData}
                  tableHeaders={tableHeaders}
                  isLoading={isLoadingData}
                  fileName={fileName}
                  dispatch={dispatch}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  totalRows={processedData.length}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  onExport={handleExport}
                  isDemoMode={isDemoMode}
                  state={state}
                />
              </ErrorBoundary>
              <PanelToggle
                isOpen={isSecondaryPanelOpen}
                onToggle={() => dispatch({ type: ActionType.TOGGLE_SECONDARY_PANEL })}
              />
            </div>
            <div className="flex flex-shrink-0 shadow-brutal-left z-10 border-l-4 border-border relative">
              <div className={`transition-[width] duration-300 ease-in-out ${isSecondaryPanelOpen ? 'w-80' : 'w-0'} overflow-hidden flex-shrink-0 h-full`}>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <MemoizedSecondaryPanel
                    currentView={currentView}
                    pivotConfig={pivotConfig}
                    filters={filters}
                    dispatch={dispatch}
                    fieldGroups={dynamicFieldGroups}
                    allAvailableFields={availableFields}
                    state={state}
                    sqlQuery={sqlQuery}
                    executeQuery={executeQuery}
                    onPreviewTable={handlePreviewTable}
                    onBatchUpdate={handlePivotBatchUpdate}
                  />
                </ErrorBoundary>
              </div>

              <div
                className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex flex-col justify-center items-center z-50 absolute left-0 top-0 bottom-0 -ml-0.5 hover:w-2"
                onMouseDown={startResizing}
                title="Drag to resize panel"
              />

              <div style={{ width: rightPanelWidth }} className="flex-shrink-0 overflow-hidden bg-card">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <MemoizedPrimaryPanel
                    currentView={currentView}
                    activePanel={activePanel}
                    selectedFields={currentView === 'analysis' ? analysisActiveFields : selectedFields}
                    onFieldChange={currentView === 'analysis' ? handleAnalysisFieldChange : handleDbFieldChange}
                    onAIAction={handleAIAction}
                    fieldGroups={dynamicFieldGroups}
                    executeQuery={executeQuery}
                    availableFields={availableFields}
                    dispatch={dispatch}
                    onSendMessage={handleSendChatMessage}
                    onCancelAI={handleCancelAI}
                    isAiLoading={state.isAiLoading || false}
                    isDemoMode={isDemoMode}
                    fieldAliases={state.fieldAliases}
                    isGuest={isGuest}
                    state={state} modelConfiguration={state.modelConfiguration}
                    confirmedModelConfiguration={state.confirmedModelConfiguration}
                    joins={state.joins}
                    metrics={state.metrics}
                    hiddenFields={state.hiddenFields}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        );
      })()}

      {isCredsModalOpen && <DbCredentialsModal
        onClose={() => setIsCredsModalOpen(false)}
        onSave={handleSaveCredentialsAndConnect}
        onTest={handleTestConnection}
        initialCreds={athenaCredentials}
        initialDbType={databaseType}
      />}

      {previewData && (
        <TablePreviewModal
          tableName={previewData.name}
          data={previewData.data}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
};

export default App;
