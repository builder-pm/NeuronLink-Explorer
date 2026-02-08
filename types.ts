export interface DataRow {
    [key: string]: string | number | null;
}

export type AppView = 'analysis' | 'modeling';

export type PanelType = 'fields' | 'db-config' | 'chat';

export type AggregationType = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';

export interface PivotValue {
    field: string;
    aggregation: AggregationType;
    displayName?: string;
}

export interface PivotConfig {
    rows: string[];
    columns: string[];
    values: PivotValue[];
}

export type FilterOperator = 'equals' | 'contains' | 'greater_than' | 'less_than';

export interface Filter {
    id: string;
    field: string;
    operator: FilterOperator;
    value: string | number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

export interface AIAction {
    action: 'pivot' | 'filter' | 'query' | 'propose_model' | 'propose_analysis';
    config?: Partial<PivotConfig> | Filter;
    query?: string;
    thought?: string;
    // New Proposal Payloads
    modelProposal?: {
        modelConfiguration: ModelConfiguration;
        joins: Join[];
    };
    analysisProposal?: {
        pivotConfig: PivotConfig;
        filters: Filter[];
    };
}

export interface SemanticContext {
    configName: string;
    view: AppView;
    modelConfiguration: ModelConfiguration;
    joins: Join[];
    fieldAliases: FieldAliases;
    // We can compute available fields from modelConfiguration on the fly
}

export interface Join {
    from: string;
    to: string;
    type: 'LEFT JOIN' | 'INNER JOIN' | 'RIGHT JOIN';
    on: {
        from: string;
        to: string;
    };
}

export interface Table {
    name: string;
    fields: string[];
}

export interface Transform {
    scale: number;
    x: number;
    y: number;
}

export type ConnectionPoint = 'left' | 'right';

export type ConnectionState = {
    fromTable: string;
    fromPoint: ConnectionPoint;
    toMouse: { x: number; y: number };
} | null;

export const ItemTypes = {
    FIELD: 'field',
    TABLE: 'table',
    GROUP: 'group',
};

export interface FieldGroups {
    [groupName: string]: string[];
}

export type DatabaseType = 'sqlite' | 'athena' | 'supabase';

export interface AthenaCredentials {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    s3OutputLocation: string;
}

export interface SupabaseCredentials {
    url: string;
    anonKey: string;
}

export type ModelConfiguration = {
    [tableName: string]: string[]; // Map of table name to array of selected field names
};

export type ModelingSecondaryPanelTab = 'data' | 'metrics';


export interface FieldAliases {
    [fieldKey: string]: string; // Key format: "tableName.fieldName"
}

export type SemanticDataType = 'dimension' | 'measure' | 'date' | 'identifier' | 'text' | 'boolean';

export interface FieldMetadata {
    description?: string;
    dataType?: SemanticDataType;
}

export interface AppState {
    theme: 'light' | 'dark';
    currentView: AppView;
    isLoadingData: boolean;
    activePanel: PanelType;
    isSecondaryPanelOpen: boolean;
    configName: string;
    fileName: string;
    processedData: DataRow[];
    selectedFields: string[]; // Fields selected in DB Config (the "Universe" for analysis)
    analysisActiveFields: string[]; // Fields selected in Table View (what is shown in the grid)
    currentPage: number;
    rowsPerPage: number;
    pivotConfig: PivotConfig;
    filters: Filter[];
    sqlQuery: string;
    joins: Join[];
    tablePositions: { [key: string]: { top: number; left: number } };
    fieldGroups: FieldGroups;
    fieldAliases: FieldAliases;
    fieldMetadata: Record<string, FieldMetadata>; // key: "tableName.fieldName"
    sampleValues: Record<string, string[]>; // key: "tableName.fieldName"
    hiddenFields: Set<string>;
    discoveredTables: { name: string, fields: string[] }[];

    // New model state
    modelConfiguration: ModelConfiguration; // Unconfirmed model being edited
    confirmedModelConfiguration: ModelConfiguration; // The model used for generating 'availableFields'
    isModelDirty: boolean; // True if modelConfiguration has unconfirmed changes
    modelingSecondaryPanelTab: ModelingSecondaryPanelTab;

    // DB Connection
    databaseType: DatabaseType;
    athenaCredentials: AthenaCredentials | null;
    supabaseCredentials: SupabaseCredentials | null;
    isLakehouseConnected: boolean;
    isConnectingToLakehouse: boolean;
    isDemoMode: boolean;

    // Schema Registry
    schemaRegistry: SchemaRegistryEntry | null;
    isDriftDetected: boolean;

    // User/Auth
    currentUser: User | null;
}

export interface User {
    id: string;
    aud: string;
    role?: string;
    email?: string;
    email_confirmed_at?: string;
    phone?: string;
    confirmation_sent_at?: string;
    confirmed_at?: string;
    last_sign_in_at?: string;
    app_metadata: {
        provider?: string;
        [key: string]: any;
    };
    user_metadata: {
        [key: string]: any;
    };
    identities?: {
        id: string;
        user_id: string;
        identity_data: {
            [key: string]: any;
        };
        provider: string;
        last_sign_in_at?: string;
        created_at?: string;
        updated_at?: string;
    }[];
    created_at: string;
    updated_at: string;
}

export interface SemanticContextV2 {
    configurations: ModelConfiguration[];
    // Deprecated? Or used for runtime?
    tables: Table[];
}

// --- New Phase 1 Types ---

export interface Metric {
    id: string;
    name: string;
    formula: string; // e.g., "SUM(sales) - SUM(cost)"
    description?: string;
    format?: 'currency' | 'percent' | 'number';
}

export interface ModelContextField {
    tableName: string;
    fieldName: string;
    distinctValues: string[];
    lastScannedAt?: string;
}

export interface UserAnalysis {
    id: string;
    configId: string;
    name: string;
    pivotConfig: PivotConfig;
    filterState: Filter[];
}

// Updated Model Config to include the new "Inputs"
export interface ModelConfigurationV2 {
    id: string;
    name: string;
    tables: Table[]; // The Source Tables
    joins: Join[];   // The Graph

    // The "Right Panel" Outputs
    aliases: Record<string, string>; // { "t1.col": "Friendly" }
    groups: Record<string, string[]>; // { "Folder": ["t1.col"] }

    // The "Collapsible Panel" Inputs
    metrics: Metric[];
    contextFields: ModelContextField[]; // Fields explicitly scanned for AI

        globalFilters: Filter[]; // Pre-cooked filters

    }

    

    export interface Configuration {

        id: string;

        user_id?: string;

        name: string;

        description?: string;

        type: 'db_config' | 'analysis_config';

        config: any; // Using any for flexibility to store Partial<AppState> keys

        is_public: boolean;

        created_at?: string;

        updated_at?: string;

    }

    

    // --- Schema Registry Types ---

    

    export interface RegisteredColumn {

        name: string;

        type: string;

        isPrimary: boolean;

        foreignKey?: {

            table: string;

            column: string;

        };

    }

    

    export interface RegisteredTable {

        name: string;

        columns: RegisteredColumn[];

        description?: string;

    }

    

    export interface SchemaRegistryEntry {

        dbUrlHash: string;

        tables: RegisteredTable[];

        schemaHash: string;

        lastSyncedAt: string;

    }

    