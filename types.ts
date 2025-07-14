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
    action: 'pivot' | 'filter' | 'query';
    config?: Partial<PivotConfig> | Filter;
    query?: string;
    thought?: string;
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

export type DatabaseType = 'sqlite' | 'athena';

export interface AthenaCredentials {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    s3OutputLocation: string;
}

export type ModelConfiguration = {
    [tableName: string]: string[]; // Map of table name to array of selected field names
};

export type ModelingSecondaryPanelTab = 'data' | 'groups';


export interface AppState {
    theme: 'light' | 'dark';
    currentView: AppView;
    isLoadingData: boolean;
    activePanel: PanelType;
    isSecondaryPanelOpen: boolean;
    configName: string;
    fileName: string;
    processedData: DataRow[];
    selectedFields: string[];
    currentPage: number;
    rowsPerPage: number;
    pivotConfig: PivotConfig;
    filters: Filter[];
    sqlQuery: string;
    joins: Join[];
    tablePositions: { [key: string]: { top: number; left: number } };
    fieldGroups: FieldGroups;
    discoveredTables: { name: string, fields: string[] }[];
    
    // New model state
    modelConfiguration: ModelConfiguration; // Unconfirmed model being edited
    confirmedModelConfiguration: ModelConfiguration; // The model used for generating 'availableFields'
    isModelDirty: boolean; // True if modelConfiguration has unconfirmed changes
    modelingSecondaryPanelTab: ModelingSecondaryPanelTab;

    // DB Connection
    databaseType: DatabaseType;
    athenaCredentials: AthenaCredentials | null;
    isLakehouseConnected: boolean;
    isConnectingToLakehouse: boolean;
    isDemoMode: boolean;
}