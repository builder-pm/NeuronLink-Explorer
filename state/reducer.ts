import { AppState, PivotConfig, ModelConfiguration } from '../types';
import { AppAction, ActionType } from './actions';
import { inferDataType } from '../utils/metadataInference';
import { initializeFieldMetadata } from '../utils/stateHelpers';
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
    metrics: [],

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
    schemaRegistry: null,
    isDriftDetected: false,
    currentUser: null,
    isAiLoading: false,
    chatMessages: [{
        id: 'welcome',
        role: 'model',
        text: "Hello! I'm your AI data assistant. I can help you query your data, build models, and analyze metrics. Try asking 'Show me the revenue by month' or 'Analyze the customer churn'."
    }],
    currentThreadId: null,
    chatThreads: []
};

/**
 * Helper to clean up state when model configuration changes.
 * Removes fields from pivot, filters, and active lists if they are no longer in the model.
 */
const cleanupModelState = (state: AppState, newModelConfig: ModelConfiguration): Partial<AppState> => {
    const allowedFields = new Set<string>();
    Object.values(newModelConfig).forEach(fields => {
        fields.forEach(f => allowedFields.add(f));
    });

    const newPivotConfig = {
        rows: state.pivotConfig.rows.filter(f => allowedFields.has(f)),
        columns: state.pivotConfig.columns.filter(f => allowedFields.has(f)),
        values: state.pivotConfig.values.filter(v => allowedFields.has(v.field))
    };

    const newAnalysisActiveFields = state.analysisActiveFields.filter(f => allowedFields.has(f));
    const newSelectedFields = state.selectedFields.filter(f => allowedFields.has(f));
    const newFilters = state.filters.filter(f => allowedFields.has(f.field));

    // Also update field groups to remove invalid fields? 
    // Maybe too aggressive, but let's stick to the core query-breaking state.

    return {
        pivotConfig: newPivotConfig,
        analysisActiveFields: newAnalysisActiveFields,
        selectedFields: newSelectedFields,
        filters: newFilters
    };
};

/**
 * Helper to ensure joins are in the correct format for the UI.
 * Handles legacy or malformed join objects from saved configs.
 */
const normalizeJoins = (joins: any[] = []): Join[] => {
    return joins.filter(j => !!j).map(j => {
        const type = (j.type || 'INNER JOIN').toUpperCase();
        const normalizedType = type === 'INNER' ? 'INNER JOIN' : (type === 'LEFT' ? 'LEFT JOIN' : (type === 'RIGHT' ? 'RIGHT JOIN' : type));

        // If 'on' is missing, try to infer it from top-level from/to if they contain dots (tableName.columnName)
        let on = j.on || { from: '', to: '' };

        if ((!j.on || !j.on.from || !j.on.to) && j.from && j.to) {
            const fromParts = j.from.split('.');
            const toParts = j.to.split('.');
            if (fromParts.length > 1 && toParts.length > 1) {
                on = {
                    from: fromParts[1],
                    to: toParts[1]
                };
            }
        }

        // Final fallback to prevent crashes in DataModelCanvas.tsx accessing join.on.from
        if (!on.from) on.from = 'id';
        if (!on.to) on.to = 'id';

        // Clean up table names in from/to (remove column part if present)
        const from = j.from ? j.from.split('.')[0] : '';
        const to = j.to ? j.to.split('.')[0] : '';

        return {
            ...j,
            from,
            to,
            type: normalizedType as 'LEFT JOIN' | 'INNER JOIN' | 'RIGHT JOIN',
            on
        };
    });
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

            // Synthesize discoveredTables from loaded modelConfiguration if not already present
            let synthesizedTables = state.discoveredTables;
            if (config.modelConfiguration && Object.keys(config.modelConfiguration).length > 0) {
                const existingTableNames = new Set(state.discoveredTables.map(t => t.name));
                const configTableNames = Object.keys(config.modelConfiguration);

                const missingTables = configTableNames.filter(name => !existingTableNames.has(name));
                if (missingTables.length > 0) {
                    const newTables = missingTables.map(tableName => ({
                        name: tableName,
                        fields: config.modelConfiguration[tableName] || []
                    }));
                    synthesizedTables = [...state.discoveredTables, ...newTables];
                }
            }

            const pendingState = {
                ...state,
                discoveredTables: synthesizedTables,
                pivotConfig: config.pivotConfig || state.pivotConfig,
                filters: config.filters || state.filters,
                selectedFields: config.selectedFields || state.selectedFields,
                analysisActiveFields: config.analysisActiveFields || state.analysisActiveFields || [],
                joins: normalizeJoins(config.joins || state.joins),
                tablePositions: config.tablePositions || state.tablePositions,
                fieldGroups: config.fieldGroups || state.fieldGroups,
                fieldAliases: config.fieldAliases || state.fieldAliases,
                fieldMetadata: config.fieldMetadata || state.fieldMetadata,
                sampleValues: config.sampleValues || state.sampleValues,
                hiddenFields: config.hiddenFields ? new Set(config.hiddenFields as string[]) : state.hiddenFields,
                configName: config.configName || state.configName,
                fileName: config.fileName || state.fileName,
                sqlQuery: config.sqlQuery || state.sqlQuery,
                modelConfiguration: config.modelConfiguration || state.modelConfiguration,
                confirmedModelConfiguration: config.confirmedModelConfiguration || state.confirmedModelConfiguration,
                isModelDirty: false,
                databaseType: config.databaseType || state.databaseType,
                athenaCredentials: config.athenaCredentials || state.athenaCredentials,
                supabaseCredentials: config.supabaseCredentials || state.supabaseCredentials,
                isDemoMode: config.isDemoMode !== undefined ? config.isDemoMode : state.isDemoMode,
            };

            // Enforce cleanup on the loaded state to ensure consistency
            const cleanedUpdates = cleanupModelState(pendingState, pendingState.modelConfiguration);

            return {
                ...pendingState,
                ...cleanedUpdates
            };

        case ActionType.LOAD_ANALYSIS_CONFIG:
            const analysisConfig = action.payload;
            return {
                ...state,
                pivotConfig: analysisConfig.pivotConfig || state.pivotConfig,
                filters: analysisConfig.filters || state.filters,
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
            const newAnalysisActiveFields = state.analysisActiveFields.includes(field)
                ? state.analysisActiveFields
                : [...state.analysisActiveFields, field];

            return { ...state, pivotConfig: newConfig, analysisActiveFields: newAnalysisActiveFields };
        }
        case ActionType.REMOVE_PIVOT_ITEM: {
            const { item, zone } = action.payload;
            const newConfig = { ...state.pivotConfig };
            if (zone === 'values') {
                newConfig.values = state.pivotConfig.values.filter((_, index) => index !== item);
            } else {
                newConfig[zone] = (newConfig[zone] as string[]).filter(field => field !== item);
            }

            const usedFields = new Set<string>();
            newConfig.rows.forEach(f => usedFields.add(f));
            newConfig.columns.forEach(f => usedFields.add(f));
            newConfig.values.forEach(v => usedFields.add(v.field));

            const newActiveFields = Array.from(usedFields);

            return { ...state, pivotConfig: newConfig, analysisActiveFields: newActiveFields };
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
            if (newDemoMode) {
                const demoModelConfig: ModelConfiguration = {
                    "jobs": ["job_id", "country_code", "position_month", "source_id", "language", "total_jobs", "total_positions", "data_source", "advertiser", "activity_status", "seniority"],
                    "countries": ["country_code", "country_name"],
                    "sources": ["source_id", "source_name"]
                };
                const demoState: AppState = {
                    ...initialState,
                    theme: state.theme,
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
                return {
                    ...state,
                    processedData: [],
                    discoveredTables: [],
                    modelConfiguration: {},
                    confirmedModelConfiguration: {},
                    isModelDirty: false,
                    selectedFields: [],
                    analysisActiveFields: [],
                    sqlQuery: 'SELECT "Please connect to a data source to begin" as message;',
                    currentPage: 1,
                    fieldGroups: { "Uncategorized": [] },
                    fieldAliases: {},
                    fieldMetadata: {},
                    sampleValues: {},
                    joins: [],
                    pivotConfig: { rows: [], columns: [], values: [] },
                    filters: [],
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

            if (isSelected === false) {
                delete newModelConfig[tableName];
                newJoins = state.joins.filter(j => j.from !== tableName && j.to !== tableName);
            } else if (isSelected === true) {
                const allFieldsForTable = state.discoveredTables.find(t => t.name === tableName)?.fields || [];
                newModelConfig[tableName] = allFieldsForTable;
            } else if (fields) {
                newModelConfig[tableName] = fields;
            }

            const newFieldMetadata = initializeFieldMetadata(
                newModelConfig,
                state.fieldMetadata,
                state.schemaRegistry
            );

            const updates = cleanupModelState({ ...state, pivotConfig: state.pivotConfig }, newModelConfig);

            return {
                ...state,
                modelConfiguration: newModelConfig,
                confirmedModelConfiguration: newModelConfig,
                joins: newJoins,
                fieldMetadata: newFieldMetadata,
                isModelDirty: false,
                ...updates
            };
        }
        case ActionType.SET_MODEL_CONFIGURATION: {
            const newModelConfig = action.payload;
            const newFieldMetadata = initializeFieldMetadata(
                newModelConfig,
                state.fieldMetadata,
                state.schemaRegistry
            );

            const updates = cleanupModelState({ ...state, pivotConfig: state.pivotConfig }, newModelConfig);

            return {
                ...state,
                modelConfiguration: newModelConfig,
                confirmedModelConfiguration: newModelConfig,
                fieldMetadata: newFieldMetadata,
                isModelDirty: false,
                ...updates
            };
        }
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


        case ActionType.SET_SCHEMA_REGISTRY_DATA: {
            const { data } = action.payload;
            const newFieldMetadata = { ...state.fieldMetadata };

            // Propagate all metadata from registry to fieldMetadata (unified source)
            if (data && data.tables) {
                data.tables.forEach(table => {
                    table.columns.forEach(col => {
                        const fieldKey = `${table.name}.${col.name}`;
                        const existing = newFieldMetadata[fieldKey] || {};

                        // Always sync structural metadata (PK/FK) from registry
                        // Use semanticType from registry if available, otherwise infer
                        // Only sync description/dataType if user hasn't set a custom one
                        newFieldMetadata[fieldKey] = {
                            ...existing,
                            description: existing.description || col.description || '',
                            dataType: existing.dataType || col.semanticType || inferDataType(col.name),
                            isPrimary: col.isPrimary,
                            foreignKey: col.foreignKey
                        };
                    });
                });
            }

            return {
                ...state,
                schemaRegistry: action.payload.data,
                fieldMetadata: newFieldMetadata,
                isDriftDetected: action.payload.driftDetected
            };
        }

        case ActionType.SET_USER:
            return { ...state, currentUser: action.payload };

        case ActionType.ADD_CHAT_MESSAGE:
            return {
                ...state,
                chatMessages: [...state.chatMessages, action.payload]
            };

        case ActionType.SET_CHAT_MESSAGES:
            return {
                ...state,
                chatMessages: action.payload
            };

        case ActionType.SET_AI_LOADING:
            return {
                ...state,
                isAiLoading: action.payload
            };
        case ActionType.SET_CURRENT_THREAD:
            return {
                ...state,
                currentThreadId: action.payload
            };
        case ActionType.SET_THREADS:
            return {
                ...state,
                chatThreads: action.payload
            };
        case ActionType.ADD_THREAD:
            return {
                ...state,
                chatThreads: [action.payload, ...state.chatThreads]
            };

        case ActionType.SET_METRICS:
            return {
                ...state,
                metrics: action.payload.metrics
            };

        case ActionType.ADD_METRIC:
            return {
                ...state,
                metrics: [...state.metrics, action.payload.metric]
            };

        case ActionType.UPDATE_METRIC:
            return {
                ...state,
                metrics: state.metrics.map(m =>
                    m.id === action.payload.metricId
                        ? { ...m, ...action.payload.updates }
                        : m
                )
            };

        case ActionType.DELETE_METRIC:
            return {
                ...state,
                metrics: state.metrics.filter(m => m.id !== action.payload.metricId)
            };

        default:
            return state;
    }
};