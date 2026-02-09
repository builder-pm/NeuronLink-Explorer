import React, { useState } from 'react';
import { ChevronRight, Plus, X, Filter as FilterIcon } from 'lucide-react';
import { ActionType, AppAction } from '../../state/actions';
import { AppState, Filter } from '../../types';

interface GlobalFiltersPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const GlobalFiltersPanel: React.FC<GlobalFiltersPanelProps> = ({ state, dispatch }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const { filters } = state;

    const handleRemoveFilter = (filterId: string) => {
        dispatch({ type: ActionType.REMOVE_FILTER, payload: filterId });
    };

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2">
                    <FilterIcon size={16} className="text-primary" />
                    <span className="font-bold text-sm tracking-wide">GLOBAL FILTERS</span>
                </div>
                <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
                <div className="p-4 pt-0 space-y-3 bg-muted/5 animate-in slide-in-from-top-2">
                    {filters.length > 0 ? (
                        <div className="space-y-2">
                            {filters.map((filter: Filter) => (
                                <div key={filter.id} className="flex items-center justify-between p-2 bg-background border border-border rounded text-xs group">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-foreground">{filter.field}</span>
                                        <span className="text-muted-foreground">{filter.operator} {filter.value}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFilter(filter.id)}
                                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded">
                            No active filters.
                        </div>
                    )}

                    <button
                        onClick={() => {
                            // Helper to add a dummy filter for now, or trigger a modal
                            // dispatch({ type: ActionType.ADD_FILTER, payload: { id: Date.now().toString(), field: 'region', operator: 'equals', value: 'North' } })
                            // For now, we don't have a field selector here, so maybe just show a toast or Placeholder
                        }}
                        className="w-full py-2 border border-dashed border-border rounded text-muted-foreground text-xs hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
                        title="Filter adding not fully implemented in this view yet"
                    >
                        <Plus size={12} /> Add Filter
                    </button>
                </div>
            )}
        </div>
    );
};

export default GlobalFiltersPanel;
