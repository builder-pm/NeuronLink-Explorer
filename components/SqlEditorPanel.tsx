import React, { useState, useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { SqlIcon, ExpandIcon, XIcon, PlayIcon, ChevronDownIcon } from './icons';
import { format } from 'sql-formatter';
import { toast } from 'react-hot-toast';
import { DataRow } from '../types';

interface SqlEditorPanelProps {
    sqlQuery: string;
    onSqlQueryChange: (query: string) => void;
    executeQuery: (query: string) => Promise<DataRow[]>;
}

const SqlEditorPanel: React.FC<SqlEditorPanelProps> = ({
    sqlQuery,
    onSqlQueryChange,
    executeQuery
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [panelHeight, setPanelHeight] = useState(256); // Default h-64 = 256px
    const [queryResults, setQueryResults] = useState<DataRow[] | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);

    const handleFormatSql = () => {
        try {
            const formattedQuery = format(sqlQuery, { language: 'sql' });
            onSqlQueryChange(formattedQuery);
            toast.success('SQL formatted successfully!');
        } catch (error) {
            console.error("Failed to format SQL:", error);
            toast.error('Could not format SQL. Check for syntax errors.');
        }
    };

    const handleRunQuery = async () => {
        if (!sqlQuery.trim()) return;

        setIsExecuting(true);
        // If not already expanded, expand it now
        if (!isExpanded) {
            setIsExpanded(true);
        }

        try {
            const results = await executeQuery(sqlQuery);
            setQueryResults(results);
            setExecutionError(null);
            toast.success(`Query executed. ${results.length} rows returned.`);
        } catch (error: any) {
            console.error("Query execution failed:", error);
            const errorMessage = error.message || "An unknown error occurred during query execution.";
            setExecutionError(errorMessage);
            toast.error("Failed to execute query.");
            setQueryResults(null);
        } finally {
            setIsExecuting(false);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Handle resize drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = panelHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY;
            const newHeight = Math.min(500, Math.max(100, startHeight + deltaY));
            setPanelHeight(newHeight);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [panelHeight]);

    // Render the Expanded Modal
    if (isExpanded) {
        return (
            <>
                {/* Placeholder in the panel to show it's expanded elsewhere, or we can keep the minimized view visible but inactive? 
                    Let's keep the minimized view functional but maybe show state is expanded. 
                    Actually, if it's a modal, the panel underneath is distinct. 
                    Let's render the modal via Portal or just fixed overlay.
                */}
                <div className="brutal-overlay">
                    <div className="bg-card border-2 border-border shadow-brutal-xl w-[90vw] h-[90vh] flex flex-col m-4">
                        <div className="flex justify-between items-center p-4 border-b-2 border-border flex-shrink-0 bg-muted">
                            <div className="flex items-center space-x-2">
                                <SqlIcon className="h-6 w-6 text-primary" />
                                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide font-mono">SQL Editor</h2>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={toggleExpand}
                                    className="p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    title="Close Expanded View"
                                >
                                    <XIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Editor */}
                            <div className="flex-1 flex flex-col border-r-2 border-border min-w-[300px]">
                                <div
                                    className="flex-1 overflow-hidden relative"
                                    onKeyDown={(e) => {
                                        // Stop propagation for space key to prevent parents/ReactFlow from eating it
                                        if (e.key === ' ') {
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    <Editor
                                        height="100%"
                                        language="sql"
                                        value={sqlQuery}
                                        onChange={(value) => onSqlQueryChange(value || '')}
                                        theme="vs-dark"
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: 'on',
                                            automaticLayout: true,
                                            padding: { top: 16 },
                                            suggestOnTriggerCharacters: true,
                                            quickSuggestions: true,
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </div>
                                <div className="p-2 border-t-2 border-border flex justify-between bg-card">
                                    <button
                                        onClick={handleFormatSql}
                                        className="brutal-button-secondary text-xs"
                                    >
                                        Format SQL
                                    </button>
                                    <button
                                        onClick={handleRunQuery}
                                        disabled={isExecuting}
                                        className="brutal-button-primary text-xs flex items-center space-x-2"
                                    >
                                        {isExecuting ? (
                                            <span>Running...</span>
                                        ) : (
                                            <>
                                                <PlayIcon className="h-4 w-4" />
                                                <span>Run Query</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Results */}
                            <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-[300px]">
                                <div className="p-2 border-b-2 border-border bg-muted/50 font-mono text-xs font-semibold uppercase text-muted-foreground">
                                    Query Results
                                </div>
                                <div className="flex-1 overflow-auto p-4">
                                    {isExecuting ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
                                            Executing query...
                                        </div>
                                    ) : executionError ? (
                                        <div className="p-4 border-2 border-destructive bg-destructive/10 text-destructive font-mono text-sm whitespace-pre-wrap overflow-auto max-h-full">
                                            <div className="font-bold mb-2 uppercase tracking-wide">SQL Execution Error</div>
                                            {executionError}
                                        </div>
                                    ) : queryResults ? (
                                        queryResults.length > 0 ? (
                                            <div className="overflow-auto max-w-full">
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead className="bg-muted sticky top-0 z-10">
                                                        <tr>
                                                            {Object.keys(queryResults[0]).map(header => (
                                                                <th key={header} className="px-4 py-2 font-semibold text-foreground whitespace-nowrap uppercase tracking-wide text-xs font-mono border-b-2 border-border">
                                                                    {header}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {queryResults.map((row, i) => (
                                                            <tr key={i} className="hover:bg-muted/50">
                                                                {Object.values(row).map((cell, j) => (
                                                                    <td key={j} className="px-4 py-2 whitespace-nowrap text-foreground max-w-xs truncate border-r border-border last:border-r-0">
                                                                        {cell !== null && cell !== undefined ? String(cell) : <span className="text-muted-foreground italic">null</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground text-center mt-10">No results returned.</div>
                                        )
                                    ) : (
                                        <div className="text-muted-foreground text-center mt-10">Run a query to see results here.</div>
                                    )}
                                </div>
                                {queryResults && (
                                    <div className="p-2 border-t-2 border-border bg-card text-xs text-muted-foreground font-mono">
                                        {queryResults.length} rows found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* We still render the collapsed view so it doesn't disappear from the UI flow underneath the modal */}
                <div className="flex flex-col h-full opacity-50 pointer-events-none">
                    <div className="p-4 border-b-2 border-border flex justify-between items-center">
                        <h3 className="text-base font-semibold text-foreground uppercase tracking-wide font-mono flex items-center gap-2">
                            <SqlIcon className="h-5 w-5" />
                            SQL Editor
                        </h3>
                    </div>
                    <div className="flex-1 p-2">
                        <div className="border-2 border-border h-48 bg-muted"></div>
                    </div>
                </div>
            </>
        );
    }

    // Minimized View
    return (
        <div
            ref={resizeRef}
            className="flex flex-col flex-shrink-0 border-t-2 border-border"
            style={{ height: isCollapsed ? 'auto' : `${panelHeight}px` }}
        >
            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    className="h-2 bg-muted hover:bg-primary cursor-ns-resize flex items-center justify-center group transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-12 h-1 bg-border group-hover:bg-primary-foreground rounded-full transition-colors" />
                </div>
            )}

            {/* Header with accordion toggle */}
            <div
                className="p-3 border-b-2 border-border flex justify-between items-center bg-card cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <h3 className="text-base font-semibold text-foreground uppercase tracking-wide font-mono flex items-center gap-2">
                    <SqlIcon className="h-5 w-5" />
                    SQL Editor
                    <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </h3>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                    className="p-1 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors"
                    title="Expand SQL Editor"
                >
                    <ExpandIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Collapsible content */}
            {!isCollapsed && (
                <div className="flex-1 flex flex-col p-2 bg-card overflow-hidden">
                    <div
                        className="flex-1 border-2 border-border overflow-hidden relative"
                        onKeyDown={(e) => {
                            // Stop propagation for space key to prevent parents/ReactFlow from eating it
                            if (e.key === ' ') {
                                e.stopPropagation();
                            }
                        }}
                    >
                        <Editor
                            height="100%"
                            language="sql"
                            value={sqlQuery}
                            onChange={(value) => onSqlQueryChange(value || '')}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 12,
                                wordWrap: 'on',
                                lineNumbers: 'off',
                                folding: false,
                                automaticLayout: true,
                                suggestOnTriggerCharacters: true,
                                quickSuggestions: true,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <button
                            onClick={handleRunQuery}
                            disabled={isExecuting}
                            className="brutal-button-primary flex-1 text-xs flex justify-center items-center gap-2"
                        >
                            {isExecuting ? <span className="animate-pulse">...</span> : <PlayIcon className="h-3 w-3" />}
                            <span>Run</span>
                        </button>
                        <button
                            onClick={handleFormatSql}
                            className="brutal-button-secondary text-xs"
                            title="Format SQL Query"
                        >
                            Format
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SqlEditorPanel;
