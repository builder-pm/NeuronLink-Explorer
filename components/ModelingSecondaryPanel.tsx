import React from 'react';
import { AppState, ModelingSecondaryPanelTab, FieldGroups } from '../types';
import { AppAction, ActionType } from '../state/actions';
import FieldGroupingPanel from './FieldGroupingPanel';
import TableFieldSelector from './TableFieldSelector';
import SqlEditorPanel from './SqlEditorPanel';
import { DataRow } from '../types';

interface ModelingSecondaryPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    sqlQuery: string;
    executeQuery: (query: string) => Promise<DataRow[]>;
    availableFields: string[];
    fieldGroups: FieldGroups;
    onPreviewTable: (tableName: string) => void;
}

const ModelingSecondaryPanel: React.FC<ModelingSecondaryPanelProps> = ({
    state, dispatch, sqlQuery, executeQuery, availableFields, fieldGroups, onPreviewTable
}) => {
    const { discoveredTables, modelConfiguration, modelingSecondaryPanelTab } = state;

    const handleTabChange = (tab: ModelingSecondaryPanelTab) => {
        dispatch({ type: ActionType.SET_MODELING_SECONDARY_PANEL_TAB, payload: tab });
    };

    const TabButton = ({ tab, children }: { tab: ModelingSecondaryPanelTab, children: React.ReactNode }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors uppercase tracking-wide ${modelingSecondaryPanelTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            role="tab"
            aria-selected={modelingSecondaryPanelTab === tab}
        >
            {children}
        </button>
    );

    return (
        <aside className="w-80 h-full bg-card border-l-2 border-border flex flex-col shadow-brutal-left flex-shrink-0">
            <div className="flex-shrink-0 border-b-2 border-border">
                <div className="flex" role="tablist">
                    <TabButton tab="data">Data</TabButton>
                    <TabButton tab="groups">Groups</TabButton>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {modelingSecondaryPanelTab === 'data' && (
                    <TableFieldSelector
                        allTables={discoveredTables}
                        modelConfig={modelConfiguration}
                        dispatch={dispatch}
                        onPreviewTable={onPreviewTable}
                        fieldAliases={state.fieldAliases}
                    />
                )}
                {modelingSecondaryPanelTab === 'groups' && (
                    <FieldGroupingPanel
                        groups={fieldGroups}
                        setGroups={(groups) => {
                            const newGroups = typeof groups === 'function' ? groups(state.fieldGroups) : groups;
                            dispatch({ type: ActionType.SET_FIELD_GROUPS, payload: newGroups });
                        }}
                        allFields={availableFields}
                    />
                )}
            </div>
            {modelingSecondaryPanelTab === 'data' && (
                <SqlEditorPanel
                    sqlQuery={sqlQuery}
                    onSqlQueryChange={(query) => dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query })}
                    executeQuery={executeQuery}
                />
            )}
        </aside>
    );
};

export default ModelingSecondaryPanel;
