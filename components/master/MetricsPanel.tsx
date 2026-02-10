import React, { useState, useEffect } from 'react';
import { AppState, Metric, ModelConfiguration } from '../../types';
import { ActionType, AppAction } from '../../state/actions';
import {
    ChevronRightIcon,
    PlusIcon,
    CalculatorIcon,
    EditIcon,
    TrashIcon,
    AlertTriangleIcon,
    RefreshIcon
} from '../icons';
import { validateMetricAvailability } from '../../utils/metricValidator';
import { MetricBuilderModal } from '../MetricBuilderModal';
import { saveMetric, loadMetrics, deleteMetric } from '../../services/metricsService';
import { toast } from 'react-hot-toast';
import { MetricSuggestionModal } from '../MetricSuggestionModal';

interface MetricsPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

/**
 * Extracts available field names from the current model configuration.
 * Returns qualified field names in format: "table.field"
 */
function getAvailableFieldsFromConfig(config: ModelConfiguration | null): string[] {
    if (!config) return [];
    return Object.entries(config).flatMap(([tableName, fields]) =>
        fields.map(f => `${tableName}.${f}`)
    );
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ state, dispatch }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [loading, setLoading] = useState(false);

    // Suggestion Modal State
    const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
    const [selectedMetricForSuggestion, setSelectedMetricForSuggestion] = useState<any | null>(null);

    const configId = (state.confirmedModelConfiguration as any)?.id || state.schemaRegistry?.dbUrlHash || '';

    useEffect(() => {
        if (configId) {
            loadMetricsForConfig(configId);
        }
    }, [configId]);

    async function loadMetricsForConfig(id: string) {
        setLoading(true);
        try {
            const loaded = await loadMetrics(id);
            dispatch({ type: ActionType.SET_METRICS, payload: { metrics: loaded } });
        } catch (error) {
            console.error('Failed to load metrics:', error);
            toast.error('Failed to load metrics');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveMetric(metric: Partial<Metric>) {
        if (!configId) {
            toast.error('No configuration context found');
            return;
        }

        try {
            const saved = await saveMetric(metric, configId, false);

            if (editingMetric) {
                dispatch({
                    type: ActionType.UPDATE_METRIC,
                    payload: { metricId: saved.id, updates: saved }
                });
                toast.success('Metric updated');
            } else {
                dispatch({
                    type: ActionType.ADD_METRIC,
                    payload: { metric: saved }
                });
                toast.success('Metric created');
            }

            setIsBuilderOpen(false);
            setEditingMetric(null);
        } catch (error) {
            console.error('Failed to save metric:', error);
            toast.error('Failed to save metric');
        }
    }

    async function handleDeleteMetric(metricId: string, isGlobal: boolean) {
        if (!confirm('Are you sure you want to delete this metric?')) return;

        try {
            await deleteMetric(metricId, isGlobal);
            dispatch({ type: ActionType.DELETE_METRIC, payload: { metricId } });
            toast.success('Metric deleted');
        } catch (error) {
            console.error('Failed to delete metric:', error);
            toast.error('Failed to delete metric');
        }
    }

    const activeConfig = React.useMemo(() => {
        return Object.keys(state.modelConfiguration).length > 0
            ? state.modelConfiguration
            : state.confirmedModelConfiguration;
    }, [state.modelConfiguration, state.confirmedModelConfiguration]);

    const availableFields = getAvailableFieldsFromConfig(activeConfig);

    const validatedMetrics = React.useMemo(() => {
        return state.metrics.map(metric => ({
            ...metric,
            validation: validateMetricAvailability(metric, activeConfig || {})
        }));
    }, [state.metrics, activeConfig]);

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2">
                    <CalculatorIcon className="h-4 w-4 text-primary" />
                    <span className="font-black text-xs uppercase tracking-widest">CALCULATED METRICS</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (configId) loadMetricsForConfig(configId);
                        }}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Refresh Metrics"
                    >
                        <RefreshIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <ChevronRightIcon className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 pt-0 space-y-3 bg-muted/5 animate-in slide-in-from-top-2">
                    {loading ? (
                        <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground text-center py-6">
                            Loading metrics...
                        </div>
                    ) : state.metrics.length === 0 ? (
                        <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground text-center py-6 border-2 border-dashed border-border">
                            No metrics defined yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {validatedMetrics.map(metric => (
                                <div
                                    key={metric.id}
                                    className={`p-3 border border-border rounded bg-card group relative transition-colors ${!metric.validation.isValid ? 'opacity-70 grayscale-[0.5] border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10' : ''}`}
                                    onClick={() => {
                                        if (!metric.validation.isValid) {
                                            setSelectedMetricForSuggestion(metric);
                                            setSuggestionModalOpen(true);
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-xs truncate ${!metric.validation.isValid ? 'text-destructive line-through decoration-2' : ''}`}>
                                                    {metric.name}
                                                </span>
                                                {metric.isGlobal && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-primary/10 text-primary rounded shrink-0">
                                                        Global
                                                    </span>
                                                )}
                                                {!metric.validation.isValid && (
                                                    <div className="group/alert relative">
                                                        <AlertTriangleIcon className="h-3.5 w-3.5 text-destructive" />
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border whitespace-nowrap z-50 invisible group-hover/alert:visible">
                                                            Missing: {metric.validation.missingFields.join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate" title={metric.formula}>
                                                {metric.formula}
                                            </div>
                                            {metric.description && (
                                                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                                    {metric.description}
                                                </div>
                                            )}
                                            {metric.requiredFields.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {metric.requiredFields.map(field => (
                                                        <span key={field} className="px-1.5 py-0.5 text-[9px] bg-muted rounded font-mono">
                                                            {field}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!metric.isGlobal && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingMetric(metric);
                                                            setIsBuilderOpen(true);
                                                        }}
                                                        className="p-1 hover:bg-muted/50 rounded transition-colors"
                                                        title="Edit metric"
                                                    >
                                                        <EditIcon className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMetric(metric.id, metric.isGlobal || false);
                                                        }}
                                                        className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                                                        title="Delete metric"
                                                    >
                                                        <TrashIcon className="h-3 w-3" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setEditingMetric(null);
                            setIsBuilderOpen(true);
                        }}
                        className="w-full py-2 border-2 border-dashed border-border text-muted-foreground text-[10px] font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="h-3.5 w-3.5" /> Add Metric
                    </button>
                </div>
            )}

            <MetricBuilderModal
                isOpen={isBuilderOpen}
                metric={editingMetric || undefined}
                availableFields={availableFields}
                onSave={handleSaveMetric}
                onClose={() => {
                    setIsBuilderOpen(false);
                    setEditingMetric(null);
                }}
            />

            {selectedMetricForSuggestion && (
                <MetricSuggestionModal
                    isOpen={suggestionModalOpen}
                    onClose={() => {
                        setSuggestionModalOpen(false);
                        setSelectedMetricForSuggestion(null);
                    }}
                    metric={selectedMetricForSuggestion}
                    missingFields={selectedMetricForSuggestion.validation.missingFields}
                    modelConfiguration={state.confirmedModelConfiguration}
                    schemaRegistry={state.schemaRegistry}
                    dispatch={dispatch}
                />
            )}
        </div>
    );
};

export default MetricsPanel;