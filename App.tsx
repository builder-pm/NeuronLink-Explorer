import React, { useEffect, useCallback, useMemo, useState, memo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Header from './components/Header';
import MainContent from './components/MainContent';
import Sidebar from './components/Sidebar';
import PivotConfigPanel from './components/PivotConfigPanel';
import DataModelCanvas from './components/DataModelCanvas';
import DbConfigPanel from './components/DbConfigPanel';
import PanelToggle from './components/PanelToggle';
import DbCredentialsModal from './components/DbCredentialsModal';
import TablePreviewModal from './components/TablePreviewModal';
import ModelingSecondaryPanel from './components/ModelingSecondaryPanel';
import { DataRow, PanelType, AIAction, Filter, PivotConfig, DatabaseType, AthenaCredentials, SupabaseCredentials, AppState, AppView, FieldGroups, Join, ModelConfiguration, FieldAliases } from './types';
import { useAppState, useAppDispatch } from './state/context';
import { ActionType, AppAction } from './state/actions';
import { generateQuery, generatePreviewQuery } from './utils/dataProcessing';
import * as db from './services/database';
import * as backend from './services/backend';
import { appSupabase } from './services/appSupabase';
import { initLogging, logEvent } from './services/logger';
import AuthModal from './components/AuthModal'; // Import Auth Modal

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
  onConfigureCredentialsClick: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  dbType: DatabaseType;
  isDemoMode: boolean;
  onRefreshData: () => void;
  fieldAliases: FieldAliases;
  isGuest?: boolean;
}

const PrimaryPanelComponent: React.FC<PrimaryPanelProps> = ({
  currentView, activePanel, selectedFields, onFieldChange, onAIAction, fieldGroups,
  executeQuery, availableFields, dispatch,
  onConfigureCredentialsClick, isConnecting, isConnected, dbType, isDemoMode, onRefreshData, fieldAliases, isGuest
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
        availableFields={availableFields} // This receives state.selectedFields from parent
        fieldAliases={fieldAliases}
        isGuest={isGuest}
      />
    );
  }
  if (currentView === 'modeling') {
    return (
      <DbConfigPanel
        selectedFields={selectedFields}
        onFieldChange={onFieldChange}
        availableFields={availableFields}
        onConfigureCredentialsClick={onConfigureCredentialsClick}
        isConnecting={isConnecting}
        isConnected={isConnected}
        dbType={dbType}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => dispatch({ type: ActionType.TOGGLE_DEMO_MODE })}
        dispatch={dispatch}
        onRefreshData={onRefreshData}
        fieldAliases={fieldAliases}
      />
    );
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
  joins: Join[];
  tablePositions: { [key: string]: { top: number; left: number; } };
  state: AppState;
  tablesForCanvas: { name: string; fields: string[]; }[];
  isModelDirty: boolean;
  onPreviewTable: (table: string) => void;
}

const MainAreaComponent: React.FC<MainAreaProps> = ({
  currentView, paginatedData, tableHeaders, isLoading, fileName, dispatch, currentPage,
  rowsPerPage, totalRows, onRowsPerPageChange, onExport, isDemoMode,
  joins, tablePositions, state, tablesForCanvas, isModelDirty, onPreviewTable
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
  if (currentView === 'modeling') {
    return (
      <DataModelCanvas
        onBack={() => dispatch({ type: ActionType.SET_VIEW, payload: 'analysis' })}
        joins={joins}
        onJoinsChange={(newJoins) => dispatch({ type: ActionType.SET_JOINS, payload: newJoins })}
        tablePositions={tablePositions}
        onTablePositionsChange={(positions) => {
          const newPositions = typeof positions === 'function' ? positions(state.tablePositions) : positions;
          dispatch({ type: ActionType.SET_TABLE_POSITIONS, payload: newPositions });
        }}
        tables={tablesForCanvas}
        isModelDirty={isModelDirty}
        onConfirmModel={() => dispatch({ type: ActionType.CONFIRM_MODEL })}
        onPreviewTable={onPreviewTable}
        fieldAliases={state.fieldAliases}
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
    pivotConfig, filters, sqlQuery, joins, tablePositions, fieldGroups,
    discoveredTables, modelConfiguration, confirmedModelConfiguration, isModelDirty,
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
        setIsGuest(false);
        localStorage.removeItem('neuronlink_guest_mode');
        initLogging();
      } else if (storedGuestMode) {
        setIsGuest(true);
      }

      setIsAuthChecking(false);
    };
    initAuth();

    const { data: { subscription } } = appSupabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem('neuronlink_guest_mode');
        if (_event === 'SIGNED_IN') {
          logEvent('AUTH', 'LOGIN', { provider: session.user.app_metadata.provider });
        }
      }
      if (_event === 'SIGNED_OUT') {
        logEvent('AUTH', 'LOGOUT');
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const connectToLakehouse = useCallback(async (credentials: AthenaCredentials) => {
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: true });
    toast.loading('Connecting to Lakehouse...', { id: 'lakehouse-connect' });

    const { success, message } = await backend.testAthenaConnection(credentials);

    if (success) {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: true });
      toast.success('Connection successful! Fetching tables...', { id: 'lakehouse-connect' });
      logEvent('DATA', 'DB_CONNECT', { type: 'athena', region: credentials.awsRegion });

      try {
        const tables = await backend.fetchLakehouseTables(credentials);
        await db.resetAndLoadData(tables);

        const discovered = await db.discoverTables();
        dispatch({ type: ActionType.SET_DISCOVERED_TABLES, payload: discovered });

        toast.success('Lakehouse data loaded!', { id: 'lakehouse-connect' });
      } catch (e: any) {
        toast.error(`Failed to load data: ${e.message}`, { id: 'lakehouse-connect' });
        dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      }
    } else {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      toast.error(`Connection failed: ${message}`, { id: 'lakehouse-connect' });
    }
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: false });
  }, [dispatch]);

  const connectToSupabase = useCallback(async (credentials: SupabaseCredentials) => {
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: true });
    toast.loading('Connecting to Supabase...', { id: 'supabase-connect' });

    const { success, message } = await backend.testSupabaseConnection(credentials);

    if (success) {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: true });
      toast.success('Connection successful! Fetching tables...', { id: 'supabase-connect' });
      logEvent('DATA', 'DB_CONNECT', { type: 'supabase' });

      try {
        const tables = await backend.fetchSupabaseTables(credentials);
        await db.resetAndLoadData(tables);

        const discovered = await db.discoverTables();
        dispatch({ type: ActionType.SET_DISCOVERED_TABLES, payload: discovered });

        toast.success('DVD Rental database loaded!', { id: 'supabase-connect' });
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

        if (databaseType === 'athena' && athenaCredentials && !isDemoMode) {
          await connectToLakehouse(athenaCredentials);
        } else if (databaseType === 'supabase' && supabaseCredentials && !isDemoMode) {
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
  }, [dispatch, isDemoMode, connectToLakehouse, connectToSupabase, databaseType, athenaCredentials, supabaseCredentials]);



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

    // Only update if query is different to avoid cursor jumps if possible, 
    // though replacing value usually resets cursor. 
    // Ideally we'd only do this if the *semantics* changed.
    // For now, simple update.
    if (query && query !== sqlQuery) {
      dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query });
    }
  }, [modelConfiguration, joins, discoveredTables, dispatch, state.fieldAliases]); // sqlQuery intentionally omitted to avoid loops

  useEffect(() => {
    if (!dbService || (discoveredTables.length === 0 && !isLakehouseConnected && !isDemoMode)) return;

    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const fullQueryRaw = await generateQuery(
          { modelConfig: confirmedModelConfiguration, joins },
          pivotConfig,
          filters,
          discoveredTables,
          state.fieldAliases,
          analysisActiveFields
        );

        const fullQuery: string | null = fullQueryRaw;

        let queryToRun: string | null = fullQuery;
        if (isGuest && fullQuery) {
          // Force 10 row limit for guests
          queryToRun = fullQuery.replace(/LIMIT\s+\d+/i, 'LIMIT 10');
          if (!queryToRun.match(/LIMIT 10/i)) {
            queryToRun = `${fullQuery} LIMIT 10`;
          }
        }

        if (queryToRun && typeof queryToRun === 'string' && queryToRun.length > 0) {
          const startTime = performance.now();
          const results = await dbService.executeQuery(queryToRun);
          dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: results });

          logEvent('DATA', 'QUERY_EXECUTE', {
            query_snippet: fullQuery.substring(0, 50),
            duration_ms: Math.round(performance.now() - startTime),
            row_count: results.length,
            success: true
          });
        } else {
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
  }, [dbService, sqlQuery, pivotConfig, filters, joins, confirmedModelConfiguration, discoveredTables, dispatch, isLakehouseConnected, isDemoMode, state.fieldAliases, analysisActiveFields]);

  const handleRefreshData = useCallback(() => {
    if (!dbService) return;

    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const fullQuery = await generateQuery(
          { modelConfig: confirmedModelConfiguration, joins },
          pivotConfig,
          filters,
          discoveredTables,
          state.fieldAliases,
          analysisActiveFields
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
  }, [dbService, dispatch, filters, joins, confirmedModelConfiguration, pivotConfig, discoveredTables]);

  const handleExport = useCallback(async (type?: 'preview' | 'full') => {
    if (isGuest) {
      toast.error('Exporting is disabled in Guest Mode. Please sign in to download data.');
      return;
    }
    try {
      let exportData = processedData;

      if (type === 'full') {
        if (!dbService || !sqlQuery) {
          toast.error("Cannot export full data: Database or query not ready.");
          return;
        }
        const toastId = toast.loading("Fetching full dataset (this may take a moment)...");

        // Remove any LIMIT clause to get full results
        // Regex handles "LIMIT 100" or "LIMIT 100 OFFSET 0" case insensitive
        const fullQuery = sqlQuery.replace(/LIMIT\s+\d+(\s+OFFSET\s+\d+)?/i, '');

        try {
          const results = await dbService.executeQuery(fullQuery);
          exportData = results;
          toast.dismiss(toastId);
        } catch (err: any) {
          toast.dismiss(toastId);
          toast.error(`Failed to fetch full data: ${err.message}`);
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
      const filename = `${fileName || 'data'}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(`Export successful! (${exportData.length} rows)`);

      logEvent('DATA', 'EXPORT', { format: 'xlsx', rows: exportData.length, filename });

    } catch (error) {
      console.error("Export failed:", error);
      toast.error("An error occurred during export.");
    }
  }, [processedData, fileName, dbService, sqlQuery]);

  const tableHeaders = useMemo(() => {
    if (processedData.length > 0) {
      return Object.keys(processedData[0]);
    }
    return [];
  }, [processedData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIndex, startIndex + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const handleRowsPerPageChange = useCallback((value: number) => {
    dispatch({ type: ActionType.SET_ROWS_PER_PAGE, payload: value });
  }, [dispatch]);

  const handleSaveConfig = useCallback(() => {
    const config = {
      pivotConfig, filters, selectedFields, joins, tablePositions,
      fieldGroups, configName, fileName, sqlQuery, modelConfiguration,
      confirmedModelConfiguration,
      databaseType, athenaCredentials, supabaseCredentials, isDemoMode,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configName.replace(/\s+/g, '_') || 'config'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Configuration saved successfully!');
    logEvent('CONFIG', 'CONFIG_SAVE', { name: configName, fileName });
  }, [pivotConfig, filters, selectedFields, joins, tablePositions, fieldGroups, configName, fileName, sqlQuery, modelConfiguration, confirmedModelConfiguration, databaseType, athenaCredentials, supabaseCredentials, isDemoMode]);

  const handleLoadConfig = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const config = JSON.parse(event.target?.result as string);
            dispatch({ type: ActionType.LOAD_CONFIG, payload: config });
            toast.success(`Configuration '${file.name}' loaded.`);
            if (config.databaseType === 'athena' && config.athenaCredentials) {
              await connectToLakehouse(config.athenaCredentials);
            } else if (config.databaseType === 'supabase' && config.supabaseCredentials) {
              await connectToSupabase(config.supabaseCredentials);
            }
          } catch (error) {
            console.error("Error loading config:", error);
            toast.error("Failed to load or parse configuration file.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [dispatch, connectToLakehouse, connectToSupabase]);

  const handleAIAction = useCallback(async (action: AIAction) => {
    if (isGuest) {
      toast.error('AI features require an account. Sign in to unlock!');
      return;
    }
    if (action.action === 'pivot') {
      const pivotUpdate = action.config as Partial<PivotConfig>;
      dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: { ...pivotConfig, ...pivotUpdate } });
    } else if (action.action === 'filter') {
      const newFilter = action.config as Filter;
      dispatch({ type: ActionType.ADD_FILTER, payload: { ...newFilter, id: Date.now().toString() } });
      logEvent('ANALYSIS', 'FILTER_ADD', { field: newFilter.field, operator: newFilter.operator });
    }
  }, [dispatch, pivotConfig]);

  const handleDbFieldChange = useCallback((field: string, isSelected: boolean) => {
    const newSelectedFields = isSelected
      ? [...new Set([...selectedFields, field])]
      : selectedFields.filter(f => f !== field);
    dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: newSelectedFields });
  }, [dispatch, selectedFields]);

  const handleAnalysisFieldChange = useCallback((field: string, isSelected: boolean) => {
    const newFields = isSelected
      ? [...new Set([...analysisActiveFields, field])]
      : analysisActiveFields.filter(f => f !== field);
    dispatch({ type: ActionType.SET_ANALYSIS_ACTIVE_FIELDS, payload: newFields });

    // Sync to Pivot Rows (Requirement: "added in the rows part... indicating table being created")
    if (isSelected) {
      if (!pivotConfig.rows.includes(field)) {
        const newPivotConfig = { ...pivotConfig, rows: [...pivotConfig.rows, field] };
        dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: newPivotConfig });
      }
    } else {
      // Optional: Remove from rows if deselected to keep in sync
      if (pivotConfig.rows.includes(field)) {
        const newPivotConfig = { ...pivotConfig, rows: pivotConfig.rows.filter(f => f !== field) };
        dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: newPivotConfig });
      }
    }
  }, [dispatch, analysisActiveFields, pivotConfig]);

  const handlePivotBatchUpdate = useCallback((newConfig: PivotConfig, newFilters: Filter[]) => {
    dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: newConfig });
    dispatch({ type: ActionType.SET_FILTERS, payload: newFilters });
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
      // Use double quotes for identifiers to be compatible with SQLite/standard SQL
      const results = await dbService.executeQuery(`SELECT * FROM "${tableName}" LIMIT 10`);
      setPreviewData({ name: tableName, data: results });
    } catch (e: any) {
      toast.error(`Failed to preview table: ${e.message}`);
    } finally {
      dispatch({ type: ActionType.SET_LOADING, payload: false });
    }
  }, [dbService, dispatch]);



  const handleSaveCredentialsAndConnect = useCallback(async (type: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => {
    if (type === 'supabase' && creds) {
      if (isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: type });
      // Store credentials so they persist
      dispatch({ type: ActionType.SET_SUPABASE_CREDENTIALS, payload: creds as SupabaseCredentials });
      await connectToSupabase(creds as SupabaseCredentials);
    } else if (type === 'athena' && creds) {
      if (isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: type });
      dispatch({ type: ActionType.SET_ATHENA_CREDENTIALS, payload: creds as AthenaCredentials });
      await connectToLakehouse(creds as AthenaCredentials);
    } else {
      if (!isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: 'sqlite' });
      dispatch({ type: ActionType.SET_ATHENA_CREDENTIALS, payload: null });
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: false });
      toast.success("Switched to in-browser SQLite with demo data.");
    }
    setIsCredsModalOpen(false);
  }, [dispatch, connectToLakehouse, connectToSupabase, isDemoMode]);

  const availableFields = useMemo(() => {
    // Priority 1: Use draft modelConfiguration if it has any tables selected
    // Priority 2: Fall back to confirmedModelConfiguration
    const config = Object.keys(modelConfiguration).length > 0
      ? modelConfiguration
      : confirmedModelConfiguration;

    if (Object.keys(config).length === 0) {
      return [];
    }

    const fields = new Set<string>();
    for (const tableName in config) {
      config[tableName].forEach(f => fields.add(f));
    }
    return Array.from(fields);
  }, [modelConfiguration, confirmedModelConfiguration, joins]);

  const dynamicFieldGroups = useMemo(() => {
    const config = Object.keys(modelConfiguration).length > 0
      ? modelConfiguration
      : confirmedModelConfiguration;

    // If no tables are selected in the model, fall back to the demo fieldGroups
    if (Object.keys(config).length === 0) {
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

    // 2. Semantic Groups
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
  }, [modelConfiguration, confirmedModelConfiguration, fieldGroups]);


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

  const tablesForCanvas = useMemo(() => {
    return discoveredTables
      .filter(t => modelConfiguration[t.name])
      .map(t => ({
        name: t.name,
        fields: modelConfiguration[t.name]
      }));
  }, [discoveredTables, modelConfiguration]);

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
        onSaveConfig={handleSaveConfig}
        activePanel={activePanel}
        onTogglePanel={(panel) => dispatch({ type: ActionType.SET_ACTIVE_PANEL, payload: panel })}
        onLoadConfig={handleLoadConfig}
        configName={configName}
        onConfigNameChange={(name) => dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name })}
        isGuest={isGuest}
        onSignIn={() => {
          setIsGuest(false);
          localStorage.removeItem('neuronlink_guest_mode');
        }}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative min-w-0">
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
            joins={joins}
            tablePositions={tablePositions}
            state={state}
            tablesForCanvas={tablesForCanvas}
            isModelDirty={isModelDirty}
            onPreviewTable={handlePreviewTable}
          />
          <PanelToggle
            isOpen={isSecondaryPanelOpen}
            onToggle={() => dispatch({ type: ActionType.TOGGLE_SECONDARY_PANEL })}
          />
        </div>
        <div className="flex flex-shrink-0 shadow-brutal-left z-10 border-l-4 border-border relative">
          <div className={`transition-[width] duration-300 ease-in-out ${isSecondaryPanelOpen ? 'w-80' : 'w-0'} overflow-hidden flex-shrink-0 h-full`}>
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
          </div>

          <div
            className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex flex-col justify-center items-center z-50 absolute left-0 top-0 bottom-0 -ml-0.5 hover:w-2"
            onMouseDown={startResizing}
            title="Drag to resize panel"
          />

          <div style={{ width: rightPanelWidth }} className="flex-shrink-0 overflow-hidden bg-card">
            <MemoizedPrimaryPanel
              currentView={currentView}
              activePanel={activePanel}
              selectedFields={currentView === 'analysis' ? analysisActiveFields : selectedFields}
              onFieldChange={currentView === 'analysis' ? handleAnalysisFieldChange : handleDbFieldChange}
              onAIAction={handleAIAction}
              fieldGroups={dynamicFieldGroups}
              executeQuery={executeQuery}
              availableFields={currentView === 'analysis' ? selectedFields : availableFields}
              dispatch={dispatch}
              onConfigureCredentialsClick={() => setIsCredsModalOpen(true)}
              isConnecting={isConnectingToLakehouse}
              isConnected={isLakehouseConnected}
              dbType={databaseType}
              isDemoMode={isDemoMode}
              onRefreshData={handleRefreshData}
              fieldAliases={state.fieldAliases}
              isGuest={isGuest}
            />
          </div>
        </div>
      </div>
      {isCredsModalOpen && <DbCredentialsModal
        onClose={() => setIsCredsModalOpen(false)}
        onSave={handleSaveCredentialsAndConnect}
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
