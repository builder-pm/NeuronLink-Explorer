import { AppState, PivotConfig, ModelConfiguration } from '../types';
import { AppAction, ActionType } from './actions';
import {
    initialSql,
    INITIAL_FIELD_GROUPS,
    JOINS as initialJoins,
} from '../constants';

export const initialPivotConfig: PivotConfig = {
    rows: ['language'],
    columns: [],
    values: [{ field: 'total_jobs', aggregation: 'SUM', displayName: 'SUM of Total Jobs' }],
};

const initialTablePositions = {
    "jobs": { top: 250, left: 250 },
    "countries": { top: 100, left: 600 },
    "sources": { top: 400, left: 600 },
};

export const initialState: AppState = {
    theme: 'dark',
    currentView: 'modeling',
    isLoadingData: true,
    activePanel: 'db-config',
    isSecondaryPanelOpen: false,
    configName: 'Untitled Configuration',
    fileName: 'FileName_for_the_link',
    processedData: [],
    selectedFields: [],
    analysisActiveFields: [], // Initialize new state
    currentPage: 1,
    rowsPerPage: 100,
    pivotConfig: { rows: [], columns: [], values: [] },
    filters: [],
    sqlQuery: 'SELECT "Please connect to a data source to begin" as message;',
    joins: [],
    tablePositions: {},
    fieldGroups: { "Uncategorized": [] },
    fieldAliases: {},
    fieldMetadata: {},
    sampleValues: {},
    hiddenFields: new Set<string>(),
    discoveredTables: [],

    // New model state
    modelConfiguration: {},
    confirmedModelConfiguration: {},
    isModelDirty: false,
    modelingSecondaryPanelTab: 'data',

    // DB Connection
    databaseType: 'athena',
    athenaCredentials: null,
    supabaseCredentials: null,
    isLakehouseConnected: false,
    isConnectingToLakehouse: false,
    isDemoMode: false,
    currentUser: null,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case ActionType.TOGGLE_THEME:
            const newTheme = state.theme === 'light' ? 'dark' : 'light';
            return { ...state, theme: newTheme };
        case ActionType.SET_VIEW:
            return { ...state, currentView: action.payload };
        case ActionType.SET_LOADING:
            return { ...state, isLoadingData: action.payload };
        case ActionType.SET_ACTIVE_PANEL:
            const view = action.payload === 'db-config' ? 'modeling' : 'analysis';
            return { ...state, activePanel: action.payload, currentView: view };
        case ActionType.TOGGLE_SECONDARY_PANEL:
            return { ...state, isSecondaryPanelOpen: !state.isSecondaryPanelOpen };
        case ActionType.SET_CONFIG_NAME:
            return { ...state, configName: action.payload };
        case ActionType.SET_FILE_NAME:
            return { ...state, fileName: action.payload };
        case ActionType.SET_PROCESSED_DATA:
            return { ...state, processedData: action.payload, currentPage: 1, isLoadingData: false };
        case ActionType.SET_SELECTED_FIELDS:
            return { ...state, selectedFields: action.payload };
        case ActionType.SET_ANALYSIS_ACTIVE_FIELDS:
            return { ...state, analysisActiveFields: action.payload };
        case ActionType.UPDATE_SQL_QUERY:
            return { ...state, sqlQuery: action.payload };
        case ActionType.SET_FIELD_METADATA: {
            const { fieldKey, metadata } = action.payload;
            return {
                ...state,
                fieldMetadata: {
                    ...state.fieldMetadata,
                    [fieldKey]: {
                        ...(state.fieldMetadata[fieldKey] || {}),
                        ...metadata
                    }
                }
            };
        }
        case ActionType.SET_SAMPLE_VALUES: {
            const { fieldKey, values } = action.payload;
            return {
                ...state,
                sampleValues: {
                    ...state.sampleValues,
                    [fieldKey]: values
                }
            };
        }
        case ActionType.SET_CURRENT_PAGE:
            return { ...state, currentPage: action.payload };
        case ActionType.SET_ROWS_PER_PAGE:
            return { ...state, rowsPerPage: action.payload, currentPage: 1 };
        case ActionType.SET_PIVOT_CONFIG:
            return { ...state, pivotConfig: action.payload };
        case ActionType.SET_FILTERS:
            return { ...state, filters: action.payload };
        case ActionType.ADD_FILTER:
            const existing = state.filters.find(f => f.field === action.payload.field);
            if (existing) {
                return { ...state, filters: state.filters.map(f => f.field === action.payload.field ? { ...f, ...action.payload, id: f.id } : f) };
            }
            return { ...state, filters: [...state.filters, action.payload] };
        case ActionType.UPDATE_FILTER:
            return { ...state, filters: state.filters.map(f => f.id === action.payload.id ? action.payload : f) };
        case ActionType.REMOVE_FILTER:
            return { ...state, filters: state.filters.filter(f => f.id !== action.payload) };
        case ActionType.SET_JOINS:
            return { ...state, joins: action.payload, isModelDirty: true };
        case ActionType.SET_TABLE_POSITIONS:
            return { ...state, tablePositions: action.payload };
        case ActionType.SET_FIELD_GROUPS:
            return { ...state, fieldGroups: action.payload };
        case ActionType.SET_DISCOVERED_TABLES: {
            return { ...state, discoveredTables: action.payload };
        }
        case ActionType.RESET_STATE:
            return { ...initialState };
        case ActionType.LOAD_CONFIG:
            const config = action.payload;
            return {
                ...state,
                pivotConfig: config.pivotConfig || state.pivotConfig,
                filters: config.filters || state.filters,
                selectedFields: config.selectedFields || state.selectedFields,
                analysisActiveFields: config.analysisActiveFields || state.analysisActiveFields || [],
                joins: config.joins || state.joins,
                tablePositions: config.tablePositions || state.tablePositions,
                fieldGroups: config.fieldGroups || state.fieldGroups,
                fieldAliases: config.fieldAliases || state.fieldAliases,
                fieldMetadata: config.fieldMetadata || state.fieldMetadata,
                sampleValues: config.sampleValues || state.sampleValues,
                hiddenFields: config.hiddenFields ? new Set(config.hiddenFields) : state.hiddenFields,
                configName: config.configName || state.configName,
                fileName: config.fileName || state.fileName,
                sqlQuery: config.sqlQuery || state.sqlQuery,
                modelConfiguration: config.modelConfiguration || state.modelConfiguration,
                confirmedModelConfiguration: config.confirmedModelConfiguration || state.confirmedModelConfiguration,
                isModelDirty: false, // Always start clean on load
                databaseType: config.databaseType || state.databaseType,
                athenaCredentials: config.athenaCredentials || state.athenaCredentials,
                supabaseCredentials: config.supabaseCredentials || state.supabaseCredentials,
                isDemoMode: config.isDemoMode !== undefined ? config.isDemoMode : state.isDemoMode,
            };
        case ActionType.LOAD_ANALYSIS_CONFIG:
            const analysisConfig = action.payload;
            return {
                ...state,
                pivotConfig: analysisConfig.pivotConfig || state.pivotConfig,
                filters: analysisConfig.filters || state.filters,
                // We might want to switch view to analysis if loading this config
                currentView: 'analysis',
                activePanel: 'fields',
            };
        case ActionType.UPDATE_PIVOT: {
            const { field, targetZone } = action.payload;
            const newConfig = { ...state.pivotConfig };
            const numericFields = ['total_jobs', 'total_positions', 'source_id'];

            if (targetZone === 'values') {
                const aggregation = numericFields.includes(field) ? 'SUM' : 'COUNT';
                newConfig.values = [...newConfig.values, { field, aggregation }];
            } else {
                newConfig.rows = newConfig.rows.filter(f => f !== field);
                newConfig.columns = newConfig.columns.filter(f => f !== field);
                newConfig.values = newConfig.values.filter(v => v.field !== field);
                newConfig[targetZone] = [...newConfig[targetZone], field];
            }
            // Automatically select the field if it's not already
            const newSelectedFields = state.selectedFields.includes(field)
                ? state.selectedFields
                : [...state.selectedFields, field];

            return { ...state, pivotConfig: newConfig, selectedFields: newSelectedFields };
        }
        case ActionType.REMOVE_PIVOT_ITEM: {
            const { item, zone } = action.payload;
            const newConfig = { ...state.pivotConfig };
            if (zone === 'values') {
                newConfig.values = state.pivotConfig.values.filter((_, index) => index !== item);
            } else {
                newConfig[zone] = (newConfig[zone] as string[]).filter(field => field !== item);
            }
            return { ...state, pivotConfig: newConfig };
        }
        case ActionType.RENAME_PIVOT_VALUE: {
            const { index, newName } = action.payload;
            const newValues = [...state.pivotConfig.values];
            newValues[index] = { ...newValues[index], displayName: newName };
            return { ...state, pivotConfig: { ...state.pivotConfig, values: newValues } };
        }
        // DB Connection actions
        case ActionType.SET_DATABASE_TYPE:
            return { ...state, databaseType: action.payload };
        case ActionType.SET_ATHENA_CREDENTIALS:
            return { ...state, athenaCredentials: action.payload };
        case ActionType.SET_SUPABASE_CREDENTIALS:
            return { ...state, supabaseCredentials: action.payload };
        case ActionType.SET_LAKEHOUSE_CONNECTION_STATUS:
            return { ...state, isLakehouseConnected: action.payload };
        case ActionType.SET_LAKEHOUSE_CONNECTING_STATUS:
            return { ...state, isConnectingToLakehouse: action.payload };
        case ActionType.TOGGLE_DEMO_MODE:
            const newDemoMode = !state.isDemoMode;
            // Switching TO demo mode: reset to a fresh demo state
            if (newDemoMode) {
                const demoModelConfig: ModelConfiguration = {
                    "jobs": ["job_id", "country_code", "position_month", "source_id", "language", "total_jobs", "total_positions", "data_source", "advertiser", "activity_status", "seniority"],
                    "countries": ["country_code", "country_name"],
                    "sources": ["source_id", "source_name"]
                };
                const demoState: AppState = {
                    ...initialState,
                    theme: state.theme, // preserve theme
                    databaseType: 'sqlite',
                    isDemoMode: true,
                    currentView: 'analysis',
                    activePanel: 'fields',
                    isSecondaryPanelOpen: true,
                    selectedFields: ['language', 'total_jobs', 'country_name', 'position_month'],
                    analysisActiveFields: ['language', 'total_jobs', 'country_name', 'position_month'],
                    pivotConfig: initialPivotConfig,
                    sqlQuery: initialSql,
                    joins: initialJoins,
                    tablePositions: initialTablePositions,
                    fieldGroups: INITIAL_FIELD_GROUPS,
                    modelConfiguration: demoModelConfig,
                    confirmedModelConfiguration: demoModelConfig,
                    isModelDirty: false,
                };
                return demoState;
            } else {
                // Switching OFF demo mode: reset data, keep config
                return {
                    ...state,
                    // Reset data-specific state
                    processedData: [],
                    discoveredTables: [],
                    modelConfiguration: {},
                    confirmedModelConfiguration: {},
                    isModelDirty: false,
                    selectedFields: [],
                    analysisActiveFields: [],
                    sqlQuery: 'SELECT "Please connect to a data source to begin" as message;',
                    currentPage: 1,
                    // Keep UI config like pivot, filters, joins, positions, groups, names
                    // Set mode and view for lakehouse connection
                    isDemoMode: false,
                    databaseType: 'athena',
                    currentView: 'modeling',
                    activePanel: 'db-config',
                };
            }
        // New modeling actions
        case ActionType.UPDATE_MODEL_CONFIG: {
            const { tableName, fields, isSelected } = action.payload;
            const newModelConfig = { ...state.modelConfiguration };
            let newJoins = state.joins;

            if (isSelected === false) { // Table is being deselected
                delete newModelConfig[tableName];
                // Also remove any joins associated with this table
                newJoins = state.joins.filter(j => j.from !== tableName && j.to !== tableName);
            } else if (isSelected === true) { // Table is being selected
                const allFieldsForTable = state.discoveredTables.find(t => t.name === tableName)?.fields || [];
                newModelConfig[tableName] = allFieldsForTable;
            } else if (fields) { // Fields for an existing table are being updated
                newModelConfig[tableName] = fields;
            }

            return {
                ...state,
                modelConfiguration: newModelConfig,
                joins: newJoins,
                isModelDirty: true
            };
        }
        case ActionType.SET_MODEL_CONFIGURATION:
            return {
                ...state,
                modelConfiguration: action.payload,
                isModelDirty: true
            };
        case ActionType.CONFIRM_MODEL: {
            return {
                ...state,
                confirmedModelConfiguration: state.modelConfiguration,
                isModelDirty: false,
            };
        }
        case ActionType.SET_MODELING_SECONDARY_PANEL_TAB:
            return { ...state, modelingSecondaryPanelTab: action.payload };

        case ActionType.SET_FIELD_ALIAS: {
            const { fieldKey, alias } = action.payload;
            return {
                ...state,
                fieldAliases: {
                    ...state.fieldAliases,
                    [fieldKey]: alias
                },
                isModelDirty: true
            };
        }

        case ActionType.SET_FIELD_VISIBILITY: {
            const { fieldKey, isHidden } = action.payload;
            const newHiddenFields = new Set(state.hiddenFields);
            if (isHidden) {
                newHiddenFields.add(fieldKey);
            } else {
                newHiddenFields.delete(fieldKey);
            }
            return { ...state, hiddenFields: newHiddenFields, isModelDirty: true };
        }


        case ActionType.SET_USER:
            return { ...state, currentUser: action.payload };

        default:
            return state;
    }
};