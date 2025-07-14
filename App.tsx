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
import ModelingSecondaryPanel from './components/ModelingSecondaryPanel';
import { DataRow, PanelType, AIAction, Filter, PivotConfig, DatabaseType, AthenaCredentials, AppState, AppView, FieldGroups, Join, ModelConfiguration } from './types';
import { useAppState, useAppDispatch } from './state/context';
import { ActionType, AppAction } from './state/actions';
import { generateQuery } from './utils/dataProcessing';
import * as db from './services/database';
import * as backend from './services/backend';

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
}

const SecondaryPanelComponent: React.FC<SecondaryPanelProps> = ({
  currentView, pivotConfig, filters, dispatch, fieldGroups, allAvailableFields, state
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
      />
    );
  }
  return (
    <ModelingSecondaryPanel
      state={state}
      dispatch={dispatch}
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
  sqlQuery: string;
  dispatch: React.Dispatch<AppAction>;
  onApplySqlQuery: (query: string) => void;
  onConfigureCredentialsClick: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  dbType: DatabaseType;
  isDemoMode: boolean;
}

const PrimaryPanelComponent: React.FC<PrimaryPanelProps> = ({
  currentView, activePanel, selectedFields, onFieldChange, onAIAction, fieldGroups,
  executeQuery, availableFields, sqlQuery, dispatch, onApplySqlQuery,
  onConfigureCredentialsClick, isConnecting, isConnected, dbType, isDemoMode
}) => {
  if (currentView === 'analysis') {
    return (
      <Sidebar
        activePanel={activePanel}
        selectedFields={selectedFields}
        onFieldChange={onFieldChange}
        onAIAction={onAIAction}
        fieldGroups={fieldGroups}
        executeQuery={executeQuery}
        availableFields={availableFields}
      />
    );
  }
  if (currentView === 'modeling') {
    return (
      <DbConfigPanel
        sqlQuery={sqlQuery}
        onSqlQueryChange={(query) => dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query })}
        onApplySqlQuery={onApplySqlQuery}
        selectedFields={selectedFields}
        onFieldChange={onFieldChange}
        availableFields={availableFields}
        executeQuery={executeQuery}
        onConfigureCredentialsClick={onConfigureCredentialsClick}
        isConnecting={isConnecting}
        isConnected={isConnected}
        dbType={dbType}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => dispatch({ type: ActionType.TOGGLE_DEMO_MODE })}
        dispatch={dispatch}
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
  onExport: () => void;
  isDemoMode: boolean;
  joins: Join[];
  tablePositions: { [key: string]: { top: number; left: number; } };
  state: AppState;
  tablesForCanvas: { name: string; fields: string[]; }[];
  isModelDirty: boolean;
}

const MainAreaComponent: React.FC<MainAreaProps> = ({
  currentView, paginatedData, tableHeaders, isLoading, fileName, dispatch, currentPage,
  rowsPerPage, totalRows, onRowsPerPageChange, onExport, isDemoMode,
  joins, tablePositions, state, tablesForCanvas, isModelDirty
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
    theme, currentView, isLoadingData, activePanel, isSecondaryPanelOpen, configName, fileName,
    processedData, selectedFields, currentPage, rowsPerPage,
    pivotConfig, filters, sqlQuery, joins, tablePositions, fieldGroups,
    discoveredTables, modelConfiguration, confirmedModelConfiguration, isModelDirty,
    databaseType, athenaCredentials,
    isConnectingToLakehouse, isLakehouseConnected, isDemoMode
  } = state;

  const [dbService, setDbService] = useState<typeof db | null>(null);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);

  const connectToLakehouse = useCallback(async (credentials: AthenaCredentials) => {
    dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS, payload: true });
    toast.loading('Connecting to Lakehouse...', { id: 'lakehouse-connect' });

    const { success, message } = await backend.testAthenaConnection(credentials);

    if (success) {
      dispatch({ type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS, payload: true });
      toast.success('Connection successful! Fetching tables...', { id: 'lakehouse-connect' });

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

  useEffect(() => {
    const initDb = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        await db.init(!isDemoMode);
        setDbService(db);

        if (databaseType === 'athena' && athenaCredentials && !isDemoMode) {
          await connectToLakehouse(athenaCredentials);
        } else if (databaseType === 'athena' && !athenaCredentials && !isDemoMode) {
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
  }, [dispatch, isDemoMode, connectToLakehouse, databaseType, athenaCredentials]);

  useEffect(() => {
    if (!dbService || (discoveredTables.length === 0 && !isLakehouseConnected && !isDemoMode)) return;

    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const fullQuery = await generateQuery(
          { modelConfig: confirmedModelConfiguration, joins },
          pivotConfig,
          filters,
          discoveredTables
        );
        if (fullQuery) {
          const results = await dbService.executeQuery(fullQuery);
          dispatch({ type: ActionType.SET_PROCESSED_DATA, payload: results });
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
  }, [dbService, sqlQuery, pivotConfig, filters, joins, confirmedModelConfiguration, discoveredTables, dispatch, isLakehouseConnected, isDemoMode]);

  const handleRefreshData = useCallback(() => {
    if (!dbService) return;

    const runQuery = async () => {
      dispatch({ type: ActionType.SET_LOADING, payload: true });
      try {
        const fullQuery = await generateQuery(
          { modelConfig: confirmedModelConfiguration, joins },
          pivotConfig,
          filters,
          discoveredTables
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

  const handleExport = useCallback(() => {
    if (processedData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    try {
      const worksheet = XLSX.utils.json_to_sheet(processedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${fileName || 'data'}.xlsx`);
      toast.success("Export successful!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("An error occurred during export.");
    }
  }, [processedData, fileName]);

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
      databaseType, athenaCredentials, isDemoMode,
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
  }, [pivotConfig, filters, selectedFields, joins, tablePositions, fieldGroups, configName, fileName, sqlQuery, modelConfiguration, confirmedModelConfiguration, databaseType, athenaCredentials, isDemoMode]);

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
  }, [dispatch, connectToLakehouse]);

  const handleAIAction = useCallback(async (action: AIAction) => {
    if (action.action === 'pivot') {
      const pivotUpdate = action.config as Partial<PivotConfig>;
      dispatch({ type: ActionType.SET_PIVOT_CONFIG, payload: { ...pivotConfig, ...pivotUpdate } });
    } else if (action.action === 'filter') {
      const newFilter = action.config as Filter;
      dispatch({ type: ActionType.ADD_FILTER, payload: { ...newFilter, id: Date.now().toString() } });
    }
  }, [dispatch, pivotConfig]);

  const handleDbFieldChange = useCallback((field: string, isSelected: boolean) => {
    const newSelectedFields = isSelected
      ? [...new Set([...selectedFields, field])]
      : selectedFields.filter(f => f !== field);
    dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: newSelectedFields });
  }, [dispatch, selectedFields]);

  const handleApplySqlQuery = useCallback((query: string) => {
    dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query });
  }, [dispatch]);

  const handleSaveCredentialsAndConnect = useCallback(async (type: DatabaseType, creds: AthenaCredentials | null) => {
    if (type === 'athena' && creds) {
      if (isDemoMode) {
        dispatch({ type: ActionType.TOGGLE_DEMO_MODE });
      }
      dispatch({ type: ActionType.SET_DATABASE_TYPE, payload: type });
      dispatch({ type: ActionType.SET_ATHENA_CREDENTIALS, payload: creds });
      await connectToLakehouse(creds);
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
  }, [dispatch, connectToLakehouse, isDemoMode]);

  const availableFields = useMemo(() => {
      if (Object.keys(confirmedModelConfiguration).length === 0 || isModelDirty) {
          return [];
      }
      
      const tablesInJoins = new Set(joins.flatMap(j => [j.from, j.to]));
      // If there are no joins, but only one table is selected in the model, allow its fields.
      const modelTables = Object.keys(confirmedModelConfiguration);
      if (joins.length === 0 && modelTables.length > 1) {
          return []; // Multiple disconnected tables are not allowed.
      }

      const fields = new Set<string>();
      for (const tableName in confirmedModelConfiguration) {
          // If joins exist, only include tables participating in them.
          // If no joins exist, any (single) table is fine.
          if (joins.length === 0 || tablesInJoins.has(tableName)) {
              confirmedModelConfiguration[tableName].forEach(field => fields.add(field));
          }
      }

      return Array.from(fields);
  }, [confirmedModelConfiguration, joins, isModelDirty]);


  const executeQuery = useCallback(async (query: string) => {
    if (!dbService) return [];
    try {
      const results = await dbService.executeQuery(query);
      return results;
    } catch (e) {
      console.error("AI Query failed", e);
      return [];
    }
  }, [dbService]);
  
  const tablesForCanvas = useMemo(() => {
    return discoveredTables
        .filter(t => modelConfiguration[t.name]) // Only tables selected in the model
        .map(t => ({
            name: t.name,
            fields: modelConfiguration[t.name] // Only the fields selected for that table
        }));
  }, [discoveredTables, modelConfiguration]);

  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-slate-900 flex flex-col font-sans">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1e293b' : '#fff', // slate-800
            color: theme === 'dark' ? '#f8fafc' : '#1e293b', // slate-50, slate-800
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          }
        }}
      />
      <Header
        onRefreshData={handleRefreshData}
        onSaveConfig={handleSaveConfig}
        activePanel={activePanel}
        onTogglePanel={(panel) => dispatch({ type: ActionType.SET_ACTIVE_PANEL, payload: panel })}
        onLoadConfig={handleLoadConfig}
        onToggleTheme={() => dispatch({ type: ActionType.TOGGLE_THEME })}
        theme={theme}
        configName={configName}
        onConfigNameChange={(name) => dispatch({ type: ActionType.SET_CONFIG_NAME, payload: name })}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative">
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
          />
           <PanelToggle
              isOpen={isSecondaryPanelOpen}
              onToggle={() => dispatch({ type: ActionType.TOGGLE_SECONDARY_PANEL })}
            />
        </div>
        <div className="flex flex-shrink-0 shadow-2xl z-10">
          <div className={`transition-[width] duration-300 ease-in-out ${isSecondaryPanelOpen ? 'w-80' : 'w-0'} overflow-hidden flex-shrink-0`}>
             <MemoizedSecondaryPanel
                currentView={currentView}
                pivotConfig={pivotConfig}
                filters={filters}
                dispatch={dispatch}
                fieldGroups={fieldGroups}
                allAvailableFields={availableFields}
                state={state}
             />
          </div>
          <MemoizedPrimaryPanel
            currentView={currentView}
            activePanel={activePanel}
            selectedFields={selectedFields}
            onFieldChange={handleDbFieldChange}
            onAIAction={handleAIAction}
            fieldGroups={fieldGroups}
            executeQuery={executeQuery}
            availableFields={availableFields}
            sqlQuery={sqlQuery}
            dispatch={dispatch}
            onApplySqlQuery={handleApplySqlQuery}
            onConfigureCredentialsClick={() => setIsCredsModalOpen(true)}
            isConnecting={isConnectingToLakehouse}
            isConnected={isLakehouseConnected}
            dbType={databaseType}
            isDemoMode={isDemoMode}
          />
        </div>
      </div>
      {isCredsModalOpen && <DbCredentialsModal
        onClose={() => setIsCredsModalOpen(false)}
        onSave={handleSaveCredentialsAndConnect}
        initialCreds={athenaCredentials}
        initialDbTpe={databaseType}
      />}
    </div>
  );
};

export default App;