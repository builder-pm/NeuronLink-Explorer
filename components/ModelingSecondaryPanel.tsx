import React from 'react';
import { AppState, ModelingSecondaryPanelTab, FieldGroups } from '../types';
import { AppAction, ActionType } from '../state/actions';
import TableFieldSelector from './TableFieldSelector';
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
    state, dispatch, onPreviewTable
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
        <aside className="w-80 h-full bg-card border-r-2 border-border flex flex-col shadow-brutal flex-shrink-0">
            <div className="flex-shrink-0 border-b-2 border-border">
                <div className="flex" role="tablist">
                    <TabButton tab="data">Structure</TabButton>
                    <TabButton tab="metrics">Metrics</TabButton>
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
                {modelingSecondaryPanelTab === 'metrics' && (
                    <div className="h-full flex flex-col p-6 items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-primary border-4 border-primary">
                            <span className="text-2xl font-bold">∑</span>
                        </div>
                        <h3 className="text-lg font-bold font-mono">Calculated Metrics</h3>
                        <p className="text-xs text-muted-foreground">
                            Define cross-table formulas and business KPIs that will grow your analysis power.
                        </p>
                        <button className="brutal-button w-full py-2 bg-primary text-black font-bold">ADD NEW METRIC</button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ModelingSecondaryPanel;
