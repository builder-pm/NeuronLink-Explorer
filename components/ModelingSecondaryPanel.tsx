import React from 'react';
import { AppState, ModelingSecondaryPanelTab } from '../types';
import { AppAction, ActionType } from '../state/actions';
import FieldGroupingPanel from './FieldGroupingPanel';
import TableFieldSelector from './TableFieldSelector';

interface ModelingSecondaryPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const ModelingSecondaryPanel: React.FC<ModelingSecondaryPanelProps> = ({ state, dispatch }) => {
    const { discoveredTables, modelConfiguration, fieldGroups, modelingSecondaryPanelTab } = state;

    const availableFieldsForGrouping = Object.values(state.confirmedModelConfiguration).flat();

    const handleTabChange = (tab: ModelingSecondaryPanelTab) => {
        dispatch({ type: ActionType.SET_MODELING_SECONDARY_PANEL_TAB, payload: tab });
    };

    const TabButton = ({ tab, children }: { tab: ModelingSecondaryPanelTab, children: React.ReactNode }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${modelingSecondaryPanelTab === tab
                    ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            role="tab"
            aria-selected={modelingSecondaryPanelTab === tab}
        >
            {children}
        </button>
    );

    return (
        <aside className="w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col shadow-lg flex-shrink-0">
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700">
                <div className="flex" role="tablist">
                    <TabButton tab="data">Data</TabButton>
                    <TabButton tab="groups">Groups</TabButton>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {modelingSecondaryPanelTab === 'data' && (
                    <TableFieldSelector
                        allTables={discoveredTables}
                        modelConfig={modelConfiguration}
                        dispatch={dispatch}
                    />
                )}
                {modelingSecondaryPanelTab === 'groups' && (
                    <FieldGroupingPanel
                        groups={fieldGroups}
                        setGroups={(groups) => {
                            const newGroups = typeof groups === 'function' ? groups(state.fieldGroups) : groups;
                            dispatch({ type: ActionType.SET_FIELD_GROUPS, payload: newGroups });
                        }}
                        allFields={availableFieldsForGrouping}
                    />
                )}
            </div>
        </aside>
    );
};

export default ModelingSecondaryPanel;