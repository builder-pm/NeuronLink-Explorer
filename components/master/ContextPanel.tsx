import React, { useState } from 'react';
import { ChevronRight, Plus, Box } from 'lucide-react';
import { ActionType, AppAction } from '../../state/actions';
import { AppState } from '../../types';

interface ContextPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ state, dispatch }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2">
                    <Box size={16} className="text-primary" />
                    <span className="font-bold text-sm tracking-wide">SEMANTIC CONTEXTS</span>
                </div>
                <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
                <div className="p-4 pt-0 space-y-3 bg-muted/5 animate-in slide-in-from-top-2">
                    <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded">
                        No semantic contexts defined.
                    </div>

                    <button
                        className="w-full py-2 border border-dashed border-border rounded text-muted-foreground text-xs hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
                        title="Context creation coming soon"
                    >
                        <Plus size={12} /> Add Context
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContextPanel;
