import {
    PanelType,
    PivotConfig,
    Filter,
    AppView,
    Join,
    FieldGroups,
    DataRow,
    DatabaseType,
    AthenaCredentials,
    SupabaseCredentials,
    ModelConfiguration,
    ModelingSecondaryPanelTab,
    User,
    FieldMetadata
} from '../types';

export enum ActionType {
    // Global
    TOGGLE_THEME = 'TOGGLE_THEME',
    SET_VIEW = 'SET_VIEW',
    SET_LOADING = 'SET_LOADING',
    SET_ACTIVE_PANEL = 'SET_ACTIVE_PANEL',
    TOGGLE_SECONDARY_PANEL = 'TOGGLE_SECONDARY_PANEL',
    SET_CONFIG_NAME = 'SET_CONFIG_NAME',
    SET_FILE_NAME = 'SET_FILE_NAME',
    LOAD_CONFIG = 'LOAD_CONFIG',
    LOAD_ANALYSIS_CONFIG = 'LOAD_ANALYSIS_CONFIG',
    RESET_STATE = 'RESET_STATE',

    // Data
    SET_PROCESSED_DATA = 'SET_PROCESSED_DATA',
    SET_SELECTED_FIELDS = 'SET_SELECTED_FIELDS',
    SET_ANALYSIS_ACTIVE_FIELDS = 'SET_ANALYSIS_ACTIVE_FIELDS',
    UPDATE_SQL_QUERY = 'UPDATE_SQL_QUERY',
    SET_FIELD_METADATA = 'SET_FIELD_METADATA',
    SET_SAMPLE_VALUES = 'SET_SAMPLE_VALUES',

    // Pagination
    SET_CURRENT_PAGE = 'SET_CURRENT_page',
    SET_ROWS_PER_PAGE = 'SET_ROWS_PER_PAGE',

    // Analysis
    SET_PIVOT_CONFIG = 'SET_PIVOT_CONFIG',
    SET_FILTERS = 'SET_FILTERS',
    ADD_FILTER = 'ADD_FILTER',
    UPDATE_FILTER = 'UPDATE_FILTER',
    REMOVE_FILTER = 'REMOVE_FILTER',
    UPDATE_PIVOT = 'UPDATE_PIVOT',
    REMOVE_PIVOT_ITEM = 'REMOVE_PIVOT_ITEM',
    RENAME_PIVOT_VALUE = 'RENAME_PIVOT_VALUE',

    // Modeling
    SET_JOINS = 'SET_JOINS',
    SET_TABLE_POSITIONS = 'SET_TABLE_POSITIONS',
    SET_FIELD_GROUPS = 'SET_FIELD_GROUPS',
    SET_DISCOVERED_TABLES = 'SET_DISCOVERED_TABLES',
    UPDATE_MODEL_CONFIG = 'UPDATE_MODEL_CONFIG',
    CONFIRM_MODEL = 'CONFIRM_MODEL',
    SET_MODEL_CONFIGURATION = 'SET_MODEL_CONFIGURATION',
    SET_MODELING_SECONDARY_PANEL_TAB = 'SET_MODELING_SECONDARY_PANEL_TAB',


    // DB Connection
    SET_DATABASE_TYPE = 'SET_DATABASE_TYPE',
    SET_ATHENA_CREDENTIALS = 'SET_ATHENA_CREDENTIALS',
    SET_LAKEHOUSE_CONNECTION_STATUS = 'SET_LAKEHOUSE_CONNECTION_STATUS',
    SET_LAKEHOUSE_CONNECTING_STATUS = 'SET_LAKEHOUSE_CONNECTING_STATUS',
    SET_SUPABASE_CREDENTIALS = 'SET_SUPABASE_CREDENTIALS',
    TOGGLE_DEMO_MODE = 'TOGGLE_DEMO_MODE',
    SET_FIELD_ALIAS = 'SET_FIELD_ALIAS',
    SET_FIELD_VISIBILITY = 'SET_FIELD_VISIBILITY',

    // User
    SET_USER = 'SET_USER',
}


// Action interfaces
export type AppAction =
    | { type: ActionType.TOGGLE_THEME }
    | { type: ActionType.SET_VIEW; payload: AppView }
    | { type: ActionType.SET_LOADING; payload: boolean }
    | { type: ActionType.SET_ACTIVE_PANEL; payload: PanelType }
    | { type: ActionType.TOGGLE_SECONDARY_PANEL }
    | { type: ActionType.SET_CONFIG_NAME; payload: string }
    | { type: ActionType.SET_FILE_NAME; payload: string }
    | { type: ActionType.SET_PROCESSED_DATA; payload: DataRow[] }
    | { type: ActionType.SET_SELECTED_FIELDS; payload: string[] }
    | { type: ActionType.SET_ANALYSIS_ACTIVE_FIELDS; payload: string[] }
    | { type: ActionType.UPDATE_SQL_QUERY; payload: string }
    | { type: ActionType.SET_FIELD_METADATA; payload: { fieldKey: string; metadata: FieldMetadata } }
    | { type: ActionType.SET_SAMPLE_VALUES; payload: { fieldKey: string; values: string[] } }
    | { type: ActionType.SET_CURRENT_PAGE; payload: number }
    | { type: ActionType.SET_ROWS_PER_PAGE; payload: number }
    | { type: ActionType.SET_PIVOT_CONFIG; payload: PivotConfig }
    | { type: ActionType.SET_FILTERS; payload: Filter[] }
    | { type: ActionType.ADD_FILTER; payload: Filter }
    | { type: ActionType.UPDATE_FILTER, payload: Filter }
    | { type: ActionType.REMOVE_FILTER, payload: string }
    | { type: ActionType.SET_JOINS; payload: Join[] }
    | { type: ActionType.SET_TABLE_POSITIONS; payload: { [key: string]: { top: number; left: number } } }
    | { type: ActionType.SET_FIELD_GROUPS; payload: FieldGroups }
    | { type: ActionType.SET_DISCOVERED_TABLES; payload: { name: string; fields: string[] }[] }
    | { type: ActionType.LOAD_CONFIG; payload: any }
    | { type: ActionType.LOAD_ANALYSIS_CONFIG; payload: any }
    | { type: ActionType.RESET_STATE; }
    | { type: ActionType.UPDATE_PIVOT; payload: { field: string; targetZone: 'rows' | 'columns' | 'values' } }
    | { type: ActionType.REMOVE_PIVOT_ITEM; payload: { item: string | number; zone: 'rows' | 'columns' | 'values' } }
    | { type: ActionType.RENAME_PIVOT_VALUE; payload: { index: number; newName: string } }
    | { type: ActionType.SET_DATABASE_TYPE; payload: DatabaseType }
    | { type: ActionType.SET_ATHENA_CREDENTIALS; payload: AthenaCredentials | null }
    | { type: ActionType.SET_LAKEHOUSE_CONNECTION_STATUS; payload: boolean }
    | { type: ActionType.SET_LAKEHOUSE_CONNECTING_STATUS; payload: boolean }
    | { type: ActionType.SET_SUPABASE_CREDENTIALS; payload: SupabaseCredentials | null }
    | { type: ActionType.TOGGLE_DEMO_MODE }
    // New modeling actions
    | { type: ActionType.UPDATE_MODEL_CONFIG; payload: { tableName: string; fields?: string[]; isSelected?: boolean } }
    | { type: ActionType.SET_MODEL_CONFIGURATION; payload: ModelConfiguration }
    | { type: ActionType.CONFIRM_MODEL; }
    | { type: ActionType.SET_MODELING_SECONDARY_PANEL_TAB; payload: ModelingSecondaryPanelTab }
    | { type: ActionType.SET_FIELD_ALIAS; payload: { fieldKey: string; alias: string } }
    | { type: ActionType.SET_FIELD_VISIBILITY; payload: { fieldKey: string; isHidden: boolean } }
    | { type: ActionType.SET_USER; payload: User | null };
