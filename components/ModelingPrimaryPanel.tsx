import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDrag } from 'react-dnd';
import FieldGroupingPanel from './FieldGroupingPanel';
import { ActionType, AppAction } from '../state/actions';
import { AppState } from '../types';
import { FieldsIcon, SettingsIcon } from './icons';
import * as db from '../services/database';

interface ModelingPrimaryPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

interface DraggableFieldProps {
    field: string;
    alias: string;
}

const DraggableField: React.FC<DraggableFieldProps> = ({ field, alias }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'field', // Matches ItemTypes.FIELD
        item: { name: field },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [field]);

    return (
        <div ref={drag} className={`flex items-center justify-between p-2 bg-muted/20 border border-border/50 text-xs hover:bg-muted/30 transition-colors rounded-sm cursor-grab ${isDragging ? 'opacity-50' : ''}`}>
            <span className="font-medium">{alias}</span>
            {alias !== field && (
                <span className="text-[8px] text-muted-foreground italic truncate ml-2">({field})</span>
            )}
        </div>
    );
};

const ModelingPrimaryPanel: React.FC<ModelingPrimaryPanelProps> = ({ state, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'fields' | 'groups'>('groups');
    const [isScanningAll, setIsScanningAll] = useState(false);
    const [scanProgress, setScanProgress] = useState<{ current: number; total: number; label: string } | undefined>(undefined);

    const { modelConfiguration, fieldGroups } = state;

    // Get all fields that are currently in the model configuration with tableName.fieldName format
    const availableFields = Object.entries(modelConfiguration).flatMap(([tableName, fields]) =>
        fields.map(field => `${tableName}.${field}`)
    );

    const handleScanAll = async () => {
        alert('Scan All Triggered!');
        console.log('[handleScanAll] Starting...', { availableFieldsCount: availableFields.length });
        if (availableFields.length === 0) {
            toast.error('No fields in model to scan.');
            return;
        }

        setIsScanningAll(true);
        const total = availableFields.length;
        const toastId = 'scanning-all-fields';

        try {
            for (let i = 0; i < total; i++) {
                const fieldKey = availableFields[i];
                console.log(`[handleScanAll] Scanning ${i + 1}/${total}: ${fieldKey}`);
                const [tableName, fieldName] = fieldKey.split('.');

                setScanProgress({ current: i + 1, total, label: `${tableName}.${fieldName}` });
                toast.loading(`Scanning ${i + 1}/${total}: ${fieldName}...`, { id: toastId });

                const values = await db.fetchSampleValues(tableName, fieldName);
                dispatch({
                    type: ActionType.SET_SAMPLE_VALUES,
                    payload: { fieldKey, values }
                });
            }
            toast.success(`Successfully scanned ${total} fields!`, { id: toastId });
        } catch (e) {
            console.error('[handleScanAll] Failed:', e);
            toast.error('Scan interrupted due to an error.', { id: toastId });
        } finally {
            setIsScanningAll(false);
            setScanProgress(undefined);
        }
    };

    return (
        <aside className="w-full h-full bg-card flex flex-col overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b-2 border-border flex-shrink-0">
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'groups'
                        ? 'bg-primary text-black'
                        : 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                >
                    <FieldsIcon className="h-4 w-4" />
                    <span>Groups</span>
                </button>
                <button
                    onClick={() => setActiveTab('fields')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'fields'
                        ? 'bg-primary text-black'
                        : 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                >
                    <SettingsIcon className="h-4 w-4" />
                    <span>Fields</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'groups' && (
                    <FieldGroupingPanel
                        groups={fieldGroups}
                        fieldAliases={state.fieldAliases}
                        fieldMetadata={state.fieldMetadata}
                        hiddenFields={state.hiddenFields}
                        sampleValues={state.sampleValues}
                        onGroupsChange={(newGroups) => {
                            dispatch({ type: ActionType.SET_FIELD_GROUPS, payload: newGroups });
                        }}
                        onFieldRename={(fieldKey, alias) => dispatch({
                            type: ActionType.SET_FIELD_ALIAS,
                            payload: { fieldKey, alias }
                        })}
                        onFieldVisibilityToggle={(fieldKey, isHidden) => dispatch({
                            type: ActionType.SET_FIELD_VISIBILITY,
                            payload: { fieldKey, isHidden }
                        })}
                        onMetadataChange={(fieldKey, metadata) => dispatch({
                            type: ActionType.SET_FIELD_METADATA,
                            payload: { fieldKey, metadata }
                        })}
                        onScanValues={async (fieldKey) => {
                            const [tableName, fieldName] = fieldKey.split('.');
                            const values = await db.fetchSampleValues(tableName, fieldName);
                            dispatch({
                                type: ActionType.SET_SAMPLE_VALUES,
                                payload: { fieldKey, values }
                            });
                        }}
                        onScanAll={handleScanAll}
                        isScanningAll={isScanningAll}
                        scanProgress={scanProgress}
                        allFields={availableFields}
                    />
                )}
                {activeTab === 'fields' && (
                    <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Output Selection</h3>
                            <p className="text-[10px] text-muted-foreground">This list shows all fields currently projected in your data model.</p>
                        </div>
                        <div className="divide-y divide-border">
                            {Object.entries(modelConfiguration).map(([tableName, fields]) => (
                                <div key={tableName} className="py-3 first:pt-0">
                                    <div className="text-[10px] font-bold text-primary font-mono mb-2 uppercase tracking-wide">
                                        {tableName}
                                    </div>
                                    <div className="space-y-1">
                                        {fields.map(field => (
                                            <DraggableField
                                                key={field}
                                                field={field}
                                                alias={state.fieldAliases[`${tableName}.${field}`] || field}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ModelingPrimaryPanel;