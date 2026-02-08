import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Editor, OnMount } from '@monaco-editor/react';
import { Play, AlignLeft, PanelRightOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'sql-formatter';
import { DataRow } from '../../types';
import { executeQuery } from '../../services/database';

interface SQLPanelProps {
    sqlQuery: string;
    onQueryChange: (query: string) => void;
    onExecute: () => void;
    isExecuting: boolean;
    onRowSelect?: (row: DataRow | null, columns: string[]) => void;
    isRowViewerActive?: boolean;
    onToggleRowViewer?: () => void;
}

const ROWS_PER_PAGE = 50;

const SQLPanel: React.FC<SQLPanelProps> = ({
    sqlQuery,
    onQueryChange,
    onExecute,
    isExecuting,
    onRowSelect,
    isRowViewerActive = false,
    onToggleRowViewer
}) => {
    const [queryResults, setQueryResults] = useState<DataRow[] | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [isExecutingQuery, setIsExecutingQuery] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
    const [editorRef, setEditorRef] = useState<any>(null);
    const [dividerPosition, setDividerPosition] = useState<number>(40); // percentage for editor height
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isResultsCollapsed, setIsResultsCollapsed] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalPages = queryResults ? Math.ceil(queryResults.length / ROWS_PER_PAGE) : 0;
    const startRow = (currentPage - 1) * ROWS_PER_PAGE;
    const endRow = startRow + ROWS_PER_PAGE;
    const paginatedResults = queryResults?.slice(startRow, endRow) || [];

    const handleFormat = () => {
        try {
            const formatted = format(sqlQuery, { language: 'postgresql' });
            onQueryChange(formatted);
            toast.success('SQL formatted');
        } catch (e) {
            toast.error('Failed to format SQL');
        }
    };

    const handleExecute = useCallback(async () => {
        if (!sqlQuery.trim()) return;

        setIsExecutingQuery(true);
        setSelectedRowIndex(null);
        onRowSelect?.(null, []);
        setCurrentPage(1);

        try {
            const results = await executeQuery(sqlQuery);
            setQueryResults(results);
            setExecutionError(null);
            toast.success(`${results.length} rows returned`);
        } catch (error: any) {
            console.error("Query execution failed:", error);
            const errorMessage = error.message || "An unknown error occurred during query execution.";
            setExecutionError(errorMessage);
            setQueryResults(null);
            toast.error("Query failed");
        } finally {
            setIsExecutingQuery(false);
        }

        onExecute();
    }, [sqlQuery, onExecute, onRowSelect]);

    // Ctrl+Enter keyboard shortcut
    const handleEditorMount: OnMount = (editor, monaco) => {
        setEditorRef(editor);

        editor.addAction({
            id: 'execute-query',
            label: 'Execute Query',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => {
                handleExecute();
            }
        });
    };

    // Update effect when handleExecute changes
    useEffect(() => {
        if (editorRef) {
            // Re-bind the action with updated handleExecute
            const disposable = editorRef.addAction({
                id: 'execute-query-updated',
                label: 'Execute Query',
                keybindings: [],
                run: () => handleExecute()
            });
            return () => disposable?.dispose();
        }
    }, [handleExecute, editorRef]);

    const handleRowClick = (row: DataRow, index: number) => {
        const actualIndex = startRow + index;
        if (selectedRowIndex === actualIndex) {
            setSelectedRowIndex(null);
            onRowSelect?.(null, []);
        } else {
            setSelectedRowIndex(actualIndex);
            const columns = queryResults ? Object.keys(queryResults[0]) : [];
            onRowSelect?.(row, columns);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedRowIndex(null);
            onRowSelect?.(null, []);
        }
    };

    // Divider drag handlers
    const handleDividerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const container = containerRef.current;
            const rect = container.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;
            const percentage = (mouseY / rect.height) * 100;

            // Constrain between 20% and 80%
            const constrained = Math.min(Math.max(percentage, 20), 80);
            setDividerPosition(constrained);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Toolbar */}
            <div className="h-12 border-b-2 border-border bg-card flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">SQL Editor</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-2">Ctrl+Enter to run</span>
                </div>
                <div className="flex items-center gap-2">
                    {onToggleRowViewer && (
                        <button
                            onClick={onToggleRowViewer}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                                isRowViewerActive
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'
                            }`}
                            title="View selected row details in side panel"
                        >
                            <PanelRightOpen size={14} />
                            <span>Row View</span>
                        </button>
                    )}
                    <button
                        onClick={handleFormat}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card text-muted-foreground text-xs font-bold uppercase tracking-wide border-2 border-border hover:border-primary hover:text-foreground transition-all"
                        title="Format SQL (Alt+Shift+F)"
                    >
                        <AlignLeft size={14} />
                        <span>Format</span>
                    </button>
                    <button
                        onClick={handleExecute}
                        disabled={isExecutingQuery || !sqlQuery.trim()}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-black uppercase tracking-wide border-2 border-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
                        title="Run Query (Ctrl+Enter)"
                    >
                        <Play size={14} className={isExecutingQuery ? 'animate-spin' : ''} />
                        <span>{isExecutingQuery ? 'Running...' : 'Run Query'}</span>
                    </button>
                </div>
            </div>

            {/* Editor Section - Takes remaining height */}
            <div ref={containerRef} className="flex-1 min-h-0 flex flex-col">
                {/* Monaco Editor - Dynamic height based on divider */}
                <div style={{ height: `${dividerPosition}%`, minHeight: '150px' }}>
                    <Editor
                        height="100%"
                        language="sql"
                        value={sqlQuery}
                        onChange={(val) => onQueryChange(val || '')}
                        theme="vs-dark"
                        onMount={handleEditorMount}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 16, bottom: 16 },
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            folding: true,
                            wordWrap: 'on',
                        }}
                    />
                </div>

                {/* Resizable Divider - Hide when results are collapsed */}
                {!isResultsCollapsed && (
                    <div
                        onMouseDown={handleDividerMouseDown}
                        className={`h-1.5 bg-border hover:bg-primary/50 cursor-ns-resize relative transition-colors flex items-center justify-center ${isDragging ? 'bg-primary' : ''}`}
                        title="Drag to resize"
                    >
                        <div className="w-12 h-0.5 bg-muted-foreground/30 rounded-full" />
                    </div>
                )}

                {/* Results Section - Dynamic height based on divider and collapse state */}
                <div
                    style={{ height: isResultsCollapsed ? '48px' : `${100 - dividerPosition}%` }}
                    className="min-h-0 flex flex-col bg-background transition-all duration-200"
                >
                    {isExecutingQuery ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-muted-foreground text-center animate-pulse">
                                <div className="text-lg font-mono">Executing query...</div>
                            </div>
                        </div>
                    ) : executionError ? (
                        <div className="flex-1 overflow-auto p-4">
                            <div className="p-4 border-2 border-destructive bg-destructive/10 text-destructive font-mono text-sm whitespace-pre-wrap">
                                <div className="font-black mb-2 uppercase tracking-wide text-base">SQL Execution Error</div>
                                {executionError}
                            </div>
                        </div>
                    ) : queryResults ? (
                        queryResults.length > 0 ? (
                            <>
                                {/* Results Table - Hide when collapsed */}
                                {!isResultsCollapsed && (
                                    <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-muted sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 font-mono text-[10px] text-muted-foreground border-b-2 border-r border-border w-12 text-center">#</th>
                                                {Object.keys(queryResults[0]).map(header => (
                                                    <th key={header} className="px-4 py-2 font-semibold text-foreground whitespace-nowrap uppercase tracking-wide text-xs font-mono border-b-2 border-r border-border last:border-r-0">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {paginatedResults.map((row, i) => {
                                                const actualIndex = startRow + i;
                                                const isSelected = selectedRowIndex === actualIndex;
                                                return (
                                                    <tr
                                                        key={actualIndex}
                                                        onClick={() => handleRowClick(row, i)}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-primary/20 hover:bg-primary/30'
                                                                : 'hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground border-r border-border text-center">
                                                            {actualIndex + 1}
                                                        </td>
                                                        {Object.values(row).map((cell, j) => (
                                                            <td key={j} className="px-4 py-2 whitespace-nowrap text-foreground max-w-xs truncate border-r border-border last:border-r-0 font-mono text-xs">
                                                                {cell !== null && cell !== undefined
                                                                    ? String(cell)
                                                                    : <span className="text-muted-foreground italic">null</span>
                                                                }
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                )}

                                {/* Pagination Footer */}
                                <div className="h-12 border-t-2 border-border bg-card flex items-center justify-between px-4 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsResultsCollapsed(!isResultsCollapsed)}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            title={isResultsCollapsed ? "Expand Results" : "Collapse Results"}
                                        >
                                            {isResultsCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            <span className="font-mono">{isResultsCollapsed ? "Expand" : "Collapse"}</span>
                                        </button>
                                        <div className="text-xs text-muted-foreground font-mono">
                                            {isResultsCollapsed
                                                ? `${queryResults.length} rows`
                                                : `Showing ${startRow + 1}-${Math.min(endRow, queryResults.length)} of ${queryResults.length} rows`
                                            }
                                        </div>
                                    </div>

                                    {!isResultsCollapsed && totalPages > 1 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => goToPage(1)}
                                                disabled={currentPage === 1}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="First page"
                                            >
                                                <ChevronsLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Previous page"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            <div className="flex items-center gap-1 px-2">
                                                <input
                                                    type="number"
                                                    value={currentPage}
                                                    onChange={(e) => {
                                                        const page = parseInt(e.target.value);
                                                        if (!isNaN(page)) goToPage(page);
                                                    }}
                                                    className="w-12 px-2 py-1 text-center text-xs font-mono bg-background border border-border focus:border-primary focus:outline-none"
                                                    min={1}
                                                    max={totalPages}
                                                />
                                                <span className="text-xs text-muted-foreground font-mono">/ {totalPages}</span>
                                            </div>

                                            <button
                                                onClick={() => goToPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Next page"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => goToPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Last page"
                                            >
                                                <ChevronsRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-muted-foreground text-center font-mono">No rows returned.</div>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-muted-foreground text-center">
                                <div className="text-sm font-mono uppercase tracking-widest mb-2">Ready</div>
                                <div className="text-xs">Write a query and press <kbd className="px-2 py-0.5 bg-muted border border-border font-mono">Ctrl+Enter</kbd> to execute</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SQLPanel;
