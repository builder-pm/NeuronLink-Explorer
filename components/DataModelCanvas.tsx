import React, { useState, useCallback, useRef, MouseEvent, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypes, Transform, Join, ConnectionPoint, ConnectionState } from '../types';
import JoinEditorModal from './JoinEditorModal';
import { PlusIcon, MinusIcon, RefreshIcon, DatabaseIcon } from './icons';

interface DataModelCanvasProps {
    onBack: () => void;
    joins: Join[];
    tablePositions: { [key: string]: { top: number; left: number; } };
    onJoinsChange: (joins: Join[]) => void;
    onTablePositionsChange: (positions: React.SetStateAction<{ [key: string]: { top: number; left: number; } }>) => void;
    tables: { name: string; fields: string[]; }[];
    isModelDirty: boolean;
    onConfirmModel: () => void;
}

const NODE_WIDTH = 256;
const NODE_HEADER_HEIGHT = 48;

interface TableNodeProps {
    table: string;
    fields: string[];
    left: number;
    top: number;
    onConnectionStart: (table: string, point: ConnectionPoint, e: MouseEvent) => void;
    onConnectionEnd: (table: string) => void;
}

const TableNode: React.FC<TableNodeProps> = ({ table, fields, left, top, onConnectionStart, onConnectionEnd }) => {
    const id = table;
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TABLE,
        item: { id: table, left, top, type: ItemTypes.TABLE },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [table, left, top]);

    drag(ref);
    
    const sourceColor = 'bg-blue-600';

    return (
        <div 
            ref={ref}
            id={id}
            className={`absolute bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 w-64 group/table cursor-grab ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
            style={{ top, left, willChange: 'transform' }}
            onMouseUp={() => onConnectionEnd(table)}
        >
            <div className={`p-3 rounded-t-lg font-bold text-white ${sourceColor}`}>
                {table}
            </div>
            <div className="max-h-48 overflow-y-auto relative">
                {fields.length > 0 ? fields.map(field => (
                    <div key={field} id={`${id}-${field}`} className="p-2 text-sm border-t border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                        {field}
                    </div>
                )) : (
                     <div className="p-2 text-sm text-center text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800">
                        No fields selected.
                    </div>
                )}
            </div>
             {['left', 'right'].map(point => (
                <div 
                    key={point}
                    className={`absolute top-1/2 -translate-y-1/2 ${point === 'left' ? '-left-2.5' : '-right-2.5'} h-5 w-5 bg-gray-300 dark:bg-slate-600 rounded-full cursor-crosshair invisible group-hover/table:visible hover:!visible hover:bg-blue-500 transition-all flex items-center justify-center`}
                    onMouseDown={(e) => onConnectionStart(table, point as ConnectionPoint, e)}
                >
                  <PlusIcon className="h-3 w-3 text-white" />
                </div>
            ))}
        </div>
    );
};

const getCurvePath = (x1: number, y1: number, x2: number, y2: number, fromIsLeft: boolean) => {
    const offset = 60;
    const c1x = fromIsLeft ? x1 + offset : x1 - offset;
    const c2x = fromIsLeft ? x2 - offset : x2 + offset;
    return `M ${x1},${y1} C ${c1x},${y1} ${c2x},${y2} ${x2},${y2}`;
};

const getJoinPoints = (join: Join, positions: { [key: string]: { top: number; left: number; }}) => {
    const fromPos = positions[join.from];
    const toPos = positions[join.to];

    if (!fromPos || !toPos) return null;
    
    const fromIsLeft = fromPos.left + NODE_WIDTH / 2 < toPos.left + NODE_WIDTH / 2;
    
    const x1 = fromIsLeft ? fromPos.left + NODE_WIDTH : fromPos.left;
    const y1 = fromPos.top + NODE_HEADER_HEIGHT / 2;
    
    const x2 = fromIsLeft ? toPos.left : toPos.left + NODE_WIDTH;
    const y2 = toPos.top + NODE_HEADER_HEIGHT / 2;

    return { x1, y1, x2, y2, fromIsLeft };
}

const JoinLine: React.FC<{ join: Join; positions: { [key: string]: { top: number; left: number; }; }; onJoinClick: (join: Join) => void; }> = ({ join, positions, onJoinClick }) => {
    
    const points = getJoinPoints(join, positions);
    if (!points) return null;
    const {x1, y1, x2, y2, fromIsLeft} = points;

    const path = getCurvePath(x1, y1, x2, y2, fromIsLeft);
    const midX = (x1 + x2) / 2;
    const midY = y1 + (y2 - y1) / 2;

    const onClauseText = `${join.on.from} = ${join.on.to}`;

    return (
        <g className="cursor-pointer group" onClick={() => onJoinClick(join)} style={{ pointerEvents: 'all' }}>
            <path d={path} className="stroke-gray-300 dark:stroke-slate-600 group-hover:stroke-blue-500 transition-all" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            <path d={path} stroke="transparent" strokeWidth="20" fill="none" />
            <rect x={midX - 55} y={midY - 12} width="110" height="24" rx="12" className="fill-gray-50 dark:fill-slate-800 group-hover:fill-blue-500 transition-colors stroke-gray-200 dark:stroke-slate-700" />
            <text x={midX} y={midY + 4} textAnchor="middle" className="text-xs font-mono fill-gray-600 dark:fill-slate-300 group-hover:fill-white transition-colors">
                {onClauseText}
            </text>
        </g>
    );
};

const DataModelCanvas: React.FC<DataModelCanvasProps> = ({ onBack, joins, tablePositions, onJoinsChange, onTablePositionsChange, tables, isModelDirty, onConfirmModel }) => {
    const [editingJoin, setEditingJoin] = useState<Join | null>(null);
    const [transform, setTransform] = useState<Transform>({ scale: 0.8, x: 50, y: 50 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [connectionState, setConnectionState] = useState<ConnectionState>(null);
    
    const canvasRef = useRef<HTMLDivElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    // Effect to center new tables when they are added
    useEffect(() => {
        if (!canvasRef.current) return;

        const newTables = tables.filter(t => !tablePositions[t.name]);
        if (newTables.length > 0) {
            const viewportWidth = canvasRef.current.clientWidth;
            const viewportHeight = canvasRef.current.clientHeight;
            const newPositions: { [key: string]: { top: number; left: number; } } = {};

            newTables.forEach((table, index) => {
                const left = ((viewportWidth / 2) - transform.x) / transform.scale - (NODE_WIDTH / 2) + (index * 40);
                const top = ((viewportHeight / 2) - transform.y) / transform.scale - (100) + (index * 40);
                newPositions[table.name] = { top, left };
            });

            onTablePositionsChange(prev => ({ ...prev, ...newPositions }));
        }
    }, [tables, tablePositions, onTablePositionsChange, transform.scale, transform.x, transform.y]);

    const [, drop] = useDrop(() => ({
        accept: ItemTypes.TABLE,
        drop: (item: { id: string; left: number; top: number }, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (!delta) {
                return;
            }
            const left = Math.round(item.left + delta.x / transform.scale);
            const top = Math.round(item.top + delta.y / transform.scale);
            
            onTablePositionsChange(prev => ({
                ...prev,
                [item.id]: { left, top },
            }));
            return undefined;
        },
    }), [onTablePositionsChange, transform.scale]);

    drop(dropRef);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        setTransform(prev => {
            const newScale = Math.min(Math.max(0.2, prev.scale + scaleAmount), 2);
            return { ...prev, scale: newScale };
        });
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.group\\/table') || (e.target as HTMLElement).closest('g')) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (isPanning) {
           e.currentTarget.style.cursor = 'grabbing';
           setTransform({ ...transform, x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }
        if (connectionState && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - transform.x) / transform.scale;
            const y = (e.clientY - rect.top - transform.y) / transform.scale;
            setConnectionState(prev => prev ? ({ ...prev, toMouse: { x, y } }) : null);
        }
    };

    const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
        if (isPanning) e.currentTarget.style.cursor = 'grab';
        setIsPanning(false);
        if (connectionState) {
            setConnectionState(null);
        }
    };

    const handleConnectionStart = (fromTable: string, fromPoint: ConnectionPoint, e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setConnectionState({fromTable, fromPoint, toMouse: {x: 0, y: 0}});
    };
    
    const handleConnectionEnd = (toTable: string) => {
        if (connectionState && connectionState.fromTable !== toTable) {
            const newJoin: Join = {
                from: connectionState.fromTable,
                to: toTable,
                type: 'INNER JOIN',
                on: { from: '', to: '' }
            };
            setEditingJoin(newJoin);
        }
        setConnectionState(null);
    }
    
    const handleSaveJoin = (updatedJoin: Join) => {
       const existingJoinIndex = joins.findIndex(j => j.from === updatedJoin.from && j.to === updatedJoin.to);
       let newJoins;
       if(existingJoinIndex > -1) {
            newJoins = [...joins];
            newJoins[existingJoinIndex] = updatedJoin;
       } else {
            newJoins = [...joins, updatedJoin];
       }
       onJoinsChange(newJoins);
       setEditingJoin(null);
    }
    
    const handleDeleteJoin = (joinToDelete: Join) => {
        const newJoins = joins.filter(j => !(
            (j.from === joinToDelete.from && j.to === joinToDelete.to) ||
            (j.from === joinToDelete.to && j.to === joinToDelete.from)
        ));
        onJoinsChange(newJoins);
        setEditingJoin(null);
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const scaleAmount = direction === 'in' ? 0.1 : -0.1;
        setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale + scaleAmount), 2) }));
    };

    const resetView = () => setTransform({ scale: 0.8, x: 50, y: 50 });

    const getDynamicLinePoints = () => {
        if (!connectionState) return null;
        const { fromTable, fromPoint } = connectionState;
        const fromPos = tablePositions[fromTable];
        if (!fromPos) return null;

        const x1 = fromPos.left + (fromPoint === 'right' ? NODE_WIDTH : 0);
        const y1 = fromPos.top + NODE_HEADER_HEIGHT/2;
        const { x: x2, y: y2 } = connectionState.toMouse;

        const fromIsLeft = fromPoint === 'right'; // Heuristic for live drawing
        return { x1, y1, x2, y2, fromIsLeft };
    }

    const dynamicLinePoints = getDynamicLinePoints();

    const CanvasContent = () => {
        if (tables.length === 0) {
             return (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-10 flex flex-col items-center">
                        <DatabaseIcon className="h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">Data Model Canvas</h3>
                        <p className="text-gray-500 dark:text-slate-400 max-w-md">
                           Select tables & fields from the 'Data' tab in the side panel to build your model.
                        </p>
                    </div>
                </div>
            );
        }

        return (
             <div 
                ref={dropRef} 
                className="absolute"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', willChange: 'transform' }}
            >
                <div className="absolute inset-0 bg-grid-gray-200/50 dark:bg-grid-slate-700/50 [background-size:32px_32px]" style={{width: 2000, height: 1500}}></div>
                
                <svg width="2000" height="1500" className="absolute inset-0 pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" className="fill-gray-400 dark:fill-slate-500">
                            <polygon points="0 0, 10 3.5, 0 7" />
                        </marker>
                    </defs>
                    {joins.map((join, i) => <JoinLine key={`${join.from}-${join.to}-${i}`} join={join} positions={tablePositions} onJoinClick={setEditingJoin} />)}
                    {dynamicLinePoints && (
                       <path d={getCurvePath(dynamicLinePoints.x1, dynamicLinePoints.y1, dynamicLinePoints.x2, dynamicLinePoints.y2, dynamicLinePoints.fromIsLeft)} className="stroke-blue-500" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                    )}
                </svg>

                {tables.map(({ name, fields }) => (
                        <TableNode 
                            key={name} 
                            table={name} 
                            fields={fields} 
                            left={tablePositions[name]?.left || 50}
                            top={tablePositions[name]?.top || 50}
                            onConnectionStart={handleConnectionStart}
                            onConnectionEnd={handleConnectionEnd}
                        />
                    ))
                }
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col p-4 bg-gray-50 dark:bg-slate-900/80 overflow-hidden">
             <div className="flex-shrink-0 flex justify-between items-center mb-4">
                 <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Data Model Relationships</h2>
                     <button
                        onClick={onConfirmModel}
                        disabled={!isModelDirty}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed"
                    >
                        Confirm Model
                    </button>
                 </div>

                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                    &larr; Back to Analysis
                </button>
            </div>
            <div 
                ref={canvasRef}
                className={`flex-1 relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-inner overflow-hidden ${isPanning ? 'cursor-grabbing' : 'grab'}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
               <CanvasContent />

                <div className="absolute bottom-4 right-4 flex items-center bg-white dark:bg-slate-700 p-1 rounded-lg shadow-md border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center space-x-1">
                        <button onClick={() => handleZoom('out')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-600" aria-label="Zoom out"><MinusIcon className="h-5 w-5"/></button>
                        <span className="text-sm font-medium w-12 text-center" aria-label={`Current zoom level ${Math.round(transform.scale * 100)}%`}>{Math.round(transform.scale * 100)}%</span>
                        <button onClick={() => handleZoom('in')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-600" aria-label="Zoom in"><PlusIcon className="h-5 w-5"/></button>
                        <button onClick={resetView} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-600" title="Reset View" aria-label="Reset view"><RefreshIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
            {editingJoin && (
                <JoinEditorModal 
                    join={editingJoin}
                    onClose={() => setEditingJoin(null)}
                    onSave={handleSaveJoin}
                    onDelete={handleDeleteJoin}
                    allTables={tables}
                />
            )}
        </div>
    );
};

export default DataModelCanvas;