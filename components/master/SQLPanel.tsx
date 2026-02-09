import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Editor, OnMount } from '@monaco-editor/react';
import { Play, AlignLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'sql-formatter';
import { DataRow } from '../../types';
import { executeQuery } from '../../services/database';
import { prettifyFieldName } from '../../utils/stringUtils';

interface TableSchema {
    name: string;
    fields: string[];
}

interface SQLPanelProps {
    sqlQuery: string;
    onQueryChange: (query: string) => void;
    onExecute: () => void;
    isExecuting: boolean;
    onRowSelect?: (row: DataRow | null, columns: string[]) => void;
    onOpenRowViewer?: () => void;
    tables?: TableSchema[];
}

const ROWS_PER_PAGE = 50;

const SQLPanel: React.FC<SQLPanelProps> = ({
    sqlQuery,
    onQueryChange,
    onExecute,
    isExecuting,
    onRowSelect,
    onOpenRowViewer,
    tables = []
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
    const [isColumnsExpanded, setIsColumnsExpanded] = useState<boolean>(true); // true = show column names, false = use *
    const containerRef = useRef<HTMLDivElement>(null);

    // Build a map of table names to their columns for quick lookup
    const tableSchemaMap = useMemo(() => {
        const map: { [key: string]: string[] } = {};
        tables.forEach(t => {
            map[t.name.toLowerCase()] = t.fields;
        });
        return map;
    }, [tables]);

    // Helper to parse a column reference like "table"."col" or table.col
    const parseColumnRef = (colStr: string): { table: string | null; column: string } => {
        const trimmed = colStr.trim();
        // Match "table"."column" pattern
        const quotedMatch = trimmed.match(/^["']?(\w+)["']?\.["']?(\w+)["']?$/);
        if (quotedMatch) {
            return { table: quotedMatch[1].toLowerCase(), column: quotedMatch[2].toLowerCase() };
        }
        // Match table.column pattern (no quotes)
        const dotMatch = trimmed.match(/^(\w+)\.(\w+)$/);
        if (dotMatch) {
            return { table: dotMatch[1].toLowerCase(), column: dotMatch[2].toLowerCase() };
        }
        // Just a column name
        return { table: null, column: trimmed.replace(/["']/g, '').toLowerCase() };
    };

    // Toggle between SELECT * and expanded column names
    const handleToggleColumns = () => {
        const newExpanded = !isColumnsExpanded;
        setIsColumnsExpanded(newExpanded);

        if (newExpanded) {
            // Expand: Replace "table".* with individual columns
            let newQuery = sqlQuery;

            // Find all "table".* patterns
            const tableStarPattern = /["']?(\w+)["']?\.\*/g;
            let m;
            const tableStars: { match: string; tableName: string }[] = [];

            while ((m = tableStarPattern.exec(sqlQuery)) !== null) {
                tableStars.push({ match: m[0], tableName: m[1].toLowerCase() });
            }

            // Replace each table.* with its columns
            tableStars.forEach(({ match, tableName }) => {
                const columns = tableSchemaMap[tableName];
                if (columns && columns.length > 0) {
                    const columnList = columns.map(c => `"${tableName}"."${c}"`).join(',\n    ');
                    newQuery = newQuery.replace(match, columnList);
                }
            });

            // Also handle simple SELECT * FROM table (single table, no joins)
            const simpleStarPattern = /SELECT\s+\*\s+FROM\s+["']?(\w+)["']?(?!\s*(?:INNER|LEFT|RIGHT|OUTER|CROSS|JOIN))/gi;
            let simpleMatch;
            while ((simpleMatch = simpleStarPattern.exec(newQuery)) !== null) {
                const tableName = simpleMatch[1].toLowerCase();
                const columns = tableSchemaMap[tableName];
                if (columns && columns.length > 0) {
                    const columnList = columns.map(c => `"${simpleMatch[1]}"."${c}"`).join(',\n    ');
                    const replacement = `SELECT\n    ${columnList}\nFROM "${simpleMatch[1]}"`;
                    newQuery = newQuery.replace(simpleMatch[0], replacement);
                }
            }

            onQueryChange(newQuery);
        } else {
            // Collapse: Replace column lists with "table".* for each table
            let newQuery = sqlQuery;

            // Find the SELECT ... FROM part
            const selectMatch = sqlQuery.match(/SELECT\s+([\s\S]*?)\s+FROM\s+/i);
            if (!selectMatch) {
                onQueryChange(newQuery);
                return;
            }

            const columnsPart = selectMatch[1].trim();
            if (columnsPart === '*') {
                onQueryChange(newQuery);
                return;
            }

            // Parse all columns and group by table
            const columns = columnsPart.split(',').map(c => c.trim()).filter(c => c.length > 0);
            const columnsByTable: { [table: string]: string[] } = {};

            columns.forEach(col => {
                const parsed = parseColumnRef(col);
                if (parsed.table) {
                    if (!columnsByTable[parsed.table]) {
                        columnsByTable[parsed.table] = [];
                    }
                    columnsByTable[parsed.table].push(parsed.column);
                }
            });

            // Check each table - if all columns selected, replace with "table".*
            const newColumnParts: string[] = [];
            const processedTables = new Set<string>();

            columns.forEach(col => {
                const parsed = parseColumnRef(col);
                if (parsed.table && !processedTables.has(parsed.table)) {
                    const tableColumns = tableSchemaMap[parsed.table];
                    const selectedCols = columnsByTable[parsed.table] || [];

                    if (tableColumns) {
                        const tableColsLower = tableColumns.map(tc => tc.toLowerCase());
                        const allSelected = tableColsLower.length === selectedCols.length &&
                            tableColsLower.every(tc => selectedCols.includes(tc));

                        if (allSelected) {
                            // All columns selected - use table.*
                            newColumnParts.push(`"${parsed.table}".*`);
                            processedTables.add(parsed.table);
                            return;
                        }
                    }
                    processedTables.add(parsed.table);
                    // Not all columns - keep individual columns for this table
                    columnsByTable[parsed.table].forEach(c => {
                        newColumnParts.push(`"${parsed.table}"."${c}"`);
                    });
                } else if (!parsed.table) {
                    // Column without table prefix - keep as is
                    newColumnParts.push(col);
                }
            });

            // Rebuild the query
            if (newColumnParts.length > 0) {
                const newColumnsStr = newColumnParts.join(',\n    ');
                newQuery = sqlQuery.replace(selectMatch[0], `SELECT\n    ${newColumnsStr}\nFROM `);
            }

            onQueryChange(newQuery);
        }
    };

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

    // Single click: just select/highlight the row visually
    const handleRowClick = (index: number) => {
        const actualIndex = startRow + index;
        if (selectedRowIndex === actualIndex) {
            setSelectedRowIndex(null);
        } else {
            setSelectedRowIndex(actualIndex);
        }
    };

    // Double click: select row AND open row viewer
    const handleRowDoubleClick = (row: DataRow, index: number) => {
        const actualIndex = startRow + index;
        setSelectedRowIndex(actualIndex);
        const columns = queryResults ? Object.keys(queryResults[0]) : [];
        onRowSelect?.(row, columns);
        onOpenRowViewer?.();
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
                    <button
                        onClick={handleToggleColumns}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                            isColumnsExpanded
                                ? 'bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground'
                                : 'bg-primary/20 text-primary border-primary'
                        }`}
                        title={isColumnsExpanded ? "Collapse to SELECT *" : "Expand to column names"}
                    >
                        {isColumnsExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        <span>{isColumnsExpanded ? "Use *" : "Expand"}</span>
                    </button>
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
                {/* Monaco Editor - Expands when results collapsed */}
                <div style={{ height: isResultsCollapsed ? 'calc(100% - 48px)' : `${dividerPosition}%`, minHeight: '150px' }} className="transition-all duration-200">
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
                                                        {prettifyFieldName(header)}
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
                                                        onClick={() => handleRowClick(i)}
                                                        onDoubleClick={() => handleRowDoubleClick(row, i)}
                                                        title="Double-click to view row details"
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
