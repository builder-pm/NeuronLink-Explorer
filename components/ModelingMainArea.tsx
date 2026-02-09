import React, { useState } from 'react';
import DataModelCanvas from './DataModelCanvas';
import SqlEditorPanel from './SqlEditorPanel';
import { ActionType, AppAction } from '../state/actions';
import { AppState } from '../types';
import { CogIcon, SqlIcon, TableIcon } from './icons';

interface ModelingMainAreaProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    onPreviewTable: (tableName: string) => void;
}

const ModelingMainArea: React.FC<ModelingMainAreaProps> = ({ state, dispatch, onPreviewTable }) => {
    const [viewMode, setViewMode] = useState<'graph' | 'sql' | 'context'>('graph');

    return (
        <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-background">
            {/* Top Toggle Bar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-0 p-1 bg-muted/80 backdrop-blur-sm rounded-lg border border-border">
                <button
                    onClick={() => setViewMode('graph')}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'graph'
                        ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <TableIcon className="h-4 w-4" />
                    VISUAL GRAPH
                </button>
                <button
                    onClick={() => setViewMode('sql')}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'sql'
                        ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <SqlIcon className="h-4 w-4" />
                    SQL EDITOR
                </button>
                <button
                    onClick={() => setViewMode('context')}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'context'
                        ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <CogIcon className="h-4 w-4" />
                    CONTEXT
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative mt-[72px]">
                {viewMode === 'graph' && (
                    <DataModelCanvas
                        joins={state.joins}
                        onJoinsChange={(j) => dispatch({ type: ActionType.SET_JOINS, payload: j })}
                        tablePositions={state.tablePositions}
                        onTablePositionsChange={(tp) => {
                            const nextPositions = typeof tp === 'function' ? tp(state.tablePositions) : tp;
                            dispatch({ type: ActionType.SET_TABLE_POSITIONS, payload: nextPositions });
                        }}
                        tables={state.discoveredTables.map(t => ({
                            name: t.name,
                            fields: state.modelConfiguration[t.name] || []
                        }))}
                        isModelDirty={state.isModelDirty}
                        onConfirmModel={() => dispatch({ type: ActionType.CONFIRM_MODEL })}
                        onPreviewTable={onPreviewTable}
                        fieldAliases={state.fieldAliases}
                    />
                )}
                {viewMode === 'sql' && (
                    <div className="h-full w-full p-4 overflow-hidden">
                        <SqlEditorPanel
                            sqlQuery={state.sqlQuery}
                            onSqlQueryChange={(query) => dispatch({ type: ActionType.UPDATE_SQL_QUERY, payload: query })}
                            executeQuery={async (q) => {
                                // This is a bridge but results aren't needed here for now
                                return [];
                            }}
                        />
                    </div>
                )}
                {viewMode === 'context' && (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground p-8">
                        <div className="max-w-2xl text-center space-y-4">
                            <h2 className="text-xl font-bold text-foreground font-mono">Semantic Context Manager</h2>
                            <p className="text-sm text-muted-foreground font-mono bg-muted/20 p-4 border border-border">
                                Define business rules, field aliases, and grouping logic that persists across your analysis.
                                This context helps the AI understand the meaning behind your raw data columns.
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="p-4 border border-border rounded bg-card/50 text-left hover:border-primary transition-colors cursor-pointer group">
                                    <h3 className="font-bold text-primary text-xs uppercase mb-2 group-hover:underline">Field Aliases</h3>
                                    <p className="text-[10px] text-muted-foreground mb-4">Map technical names like "cust_id" to "Customer Loyalty ID"</p>
                                    <button className="text-[10px] px-3 py-1 bg-muted border border-border group-hover:bg-primary group-hover:text-black transition-colors">Manage Aliases</button>
                                </div>
                                <div className="p-4 border border-border rounded bg-card/50 text-left hover:border-primary transition-colors cursor-pointer group">
                                    <h3 className="font-bold text-primary text-xs uppercase mb-2 group-hover:underline">Metric Definitions</h3>
                                    <p className="text-[10px] text-muted-foreground mb-4">Create calculated fields like "Profit Margin" = (Revenue - Cost) / Revenue</p>
                                    <button className="text-[10px] px-3 py-1 bg-muted border border-border group-hover:bg-primary group-hover:text-black transition-colors">Define Metrics</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelingMainArea;
