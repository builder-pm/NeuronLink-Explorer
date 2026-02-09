import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Connection,
    Edge,
    Node,
    NodeProps,
    Handle,
    Position,
    MarkerType,
    BackgroundVariant,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Join, FieldAliases } from '../types';
import JoinEditorModal from './JoinEditorModal';
import { DatabaseIcon, EyeIcon, XIcon, AISparklesIcon } from './icons';
import { calculateAutoLayout } from '../utils/layout';

interface DataModelCanvasProps {
    joins: Join[];
    tablePositions: { [key: string]: { top: number; left: number; } };
    onJoinsChange: (joins: Join[]) => void;
    onTablePositionsChange: (positions: React.SetStateAction<{ [key: string]: { top: number; left: number; } }>) => void;
    tables: { name: string; fields: string[]; }[];
    onPreviewTable: (table: string) => void;
    onRemoveTable: (table: string) => void;
    fieldAliases: FieldAliases;
    isModelDirty: boolean;
    onConfirmModel: () => void;
}

// Custom Table Node Component
interface TableNodeData extends Record<string, unknown> {
    label: string;
    fields: string[];
    onPreviewTable: (table: string) => void;
    onRemoveTable: (table: string) => void;
    fieldAliases: FieldAliases;
}

const TableNodeComponent: React.FC<NodeProps<Node<TableNodeData>>> = memo(({ data, selected }) => {
    const { label, fields, onPreviewTable, onRemoveTable, fieldAliases } = data;
    return (
        <div
            className={`bg-card border-2 ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'} shadow-brutal min-w-[200px] transition-shadow`}
        >
            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="target-left"
                className="!w-3 !h-3 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary !-left-1.5 z-50"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="source-left"
                className="!w-3 !h-3 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary !-left-1.5 z-50 visibility-hidden"
                style={{ top: '25%' }}
            />
            <Handle
                type="target"
                position={Position.Right}
                id="target-right"
                className="!w-3 !h-3 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary !-right-1.5 z-50 visibility-hidden"
                style={{ top: '75%' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                className="!w-3 !h-3 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary !-right-1.5 z-50"
            />
            <Handle type="source" position={Position.Right} id="source-right" className="opacity-0 pointer-events-none" />
            <Handle type="target" position={Position.Top} id="target-top" className="opacity-0 pointer-events-none" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" className="opacity-0 pointer-events-none" />

            {/* Header */}
            <div className="p-3 bg-primary border-b-2 border-border flex justify-between items-center group">
                <span className="font-bold text-primary-foreground uppercase tracking-wide font-mono truncate mr-2" title={label}>
                    {label}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreviewTable(label);
                        }}
                        className="p-1 text-primary-foreground hover:bg-black/20 rounded transition-colors"
                        title="Preview Table Data"
                    >
                        <EyeIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTable(label);
                        }}
                        className="p-1 text-primary-foreground hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                        title="Remove Table from Model"
                    >
                        <XIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Fields */}
            <div className="max-h-48 overflow-y-auto">
                {fields.length > 0 ? fields.map(field => {
                    const alias = fieldAliases[`${label}.${field}`];
                    return (
                        <div key={field} className="p-2 text-sm border-t border-border text-foreground font-mono flex flex-col">
                            <span className={alias ? 'text-primary font-bold' : ''}>
                                {alias || field}
                            </span>
                            {alias && (
                                <span className="text-[9px] text-muted-foreground italic">
                                    orig: {field}
                                </span>
                            )}
                        </div>
                    );
                }) : (
                    <div className="p-2 text-sm text-center text-muted-foreground border-t border-border">
                        No fields selected.
                    </div>
                )}
            </div>
        </div>
    );
});

TableNodeComponent.displayName = 'TableNodeComponent';

const nodeTypes = {
    tableNode: TableNodeComponent,
};

const EmptyCanvas: React.FC = memo(() => (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="text-center p-10 flex flex-col items-center">
            <DatabaseIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2 uppercase tracking-wide font-mono">Data Model Canvas</h3>
            <p className="text-muted-foreground max-w-md">
                Select tables & fields from the 'Data' tab in the side panel to build your model.
            </p>
        </div>
    </div>
));

const DataModelCanvas: React.FC<DataModelCanvasProps> = ({
    joins,
    tablePositions,
    onJoinsChange,
    onTablePositionsChange,
    tables,
    onPreviewTable,
    onRemoveTable,
    fieldAliases,
    isModelDirty,
    onConfirmModel
}) => {
    const { fitView } = useReactFlow();
    const [editingJoin, setEditingJoin] = useState<Join | null>(null);

    const onPreviewTableRef = useRef(onPreviewTable);
    useEffect(() => {
        onPreviewTableRef.current = onPreviewTable;
    }, [onPreviewTable]);

    const onRemoveTableRef = useRef(onRemoveTable);
    useEffect(() => {
        onRemoveTableRef.current = onRemoveTable;
    }, [onRemoveTable]);

    const createInitialNodes = useCallback(() => {
        return tables.map((table, index) => {
            const position = tablePositions[table.name] || {
                left: 100 + (index % 3) * 300,
                top: 100 + Math.floor(index / 3) * 250
            };
            return {
                id: table.name,
                type: 'tableNode',
                position: { x: position.left, y: position.top },
                data: {
                    label: table.name,
                    fields: table.fields,
                    onPreviewTable: (t: string) => onPreviewTableRef.current(t),
                    onRemoveTable: (t: string) => onRemoveTableRef.current(t),
                    fieldAliases: fieldAliases,
                },
            };
        });
    }, [tables, tablePositions, fieldAliases]);

    const initialEdges: Edge[] = useMemo(() => {
        return joins.map((join, index) => {
            const fromPos = tablePositions[join.from];
            const toPos = tablePositions[join.to];

            let sourceHandle = 'right';
            let targetHandle = 'target-left';

            if (fromPos && toPos) {
                if (fromPos.left > toPos.left + 150) {
                    sourceHandle = 'source-left';
                    targetHandle = 'target-right';
                }
            }

            return {
                id: `${join.from}-${join.to}-${index}`,
                source: join.from,
                target: join.to,
                sourceHandle,
                targetHandle,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'var(--color-primary)', strokeWidth: 3 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--color-primary)',
                },
                label: `${join.on.from} = ${join.on.to}`,
                labelStyle: {
                    fill: 'var(--color-foreground)',
                    fontFamily: 'monospace',
                    fontSize: 11,
                },
                labelBgStyle: {
                    fill: 'var(--color-card)',
                    stroke: 'var(--color-primary)',
                    strokeWidth: 2,
                },
                labelBgPadding: [8, 4] as [number, number],
                labelBgBorderRadius: 0,
                data: { join },
            };
        });
    }, [joins, tablePositions]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(createInitialNodes());
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Initial fit view
    useEffect(() => {
        if (tables.length > 0) {
            setTimeout(() => {
                fitView({ padding: 0.2 });
            }, 100);
        }
    }, []); // Only on mount

    useEffect(() => {
        setNodes((currentNodes) => {
            const currentNodesMap = new Map(currentNodes.map(n => [n.id, n]));
            const newNodes: Node<TableNodeData>[] = [];

            tables.forEach((table, index) => {
                const existingNode = currentNodesMap.get(table.name);
                if (existingNode) {
                    newNodes.push({
                        ...existingNode,
                        data: {
                            ...existingNode.data,
                            fields: table.fields,
                            onPreviewTable: (t: string) => onPreviewTableRef.current(t),
                            onRemoveTable: (t: string) => onRemoveTableRef.current(t),
                            fieldAliases: fieldAliases,
                        }
                    });
                } else {
                    const position = tablePositions[table.name] || {
                        left: 100 + (index % 3) * 300,
                        top: 100 + Math.floor(index / 3) * 250
                    };
                    newNodes.push({
                        id: table.name,
                        type: 'tableNode',
                        position: { x: position.left, y: position.top },
                        data: {
                            label: table.name,
                            fields: table.fields,
                            onPreviewTable: (t: string) => onPreviewTableRef.current(t),
                            onRemoveTable: (t: string) => onRemoveTableRef.current(t),
                            fieldAliases: fieldAliases,
                        },
                    });
                }
            });

            return newNodes;
        });
    }, [tables, fieldAliases, setNodes, tablePositions]);

    useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    const onNodeDragStop = useCallback(() => {
        setNodes(currentNodes => {
            const newPositions: { [key: string]: { top: number; left: number } } = {};
            currentNodes.forEach(n => {
                newPositions[n.id] = {
                    left: n.position.x,
                    top: n.position.y,
                };
            });
            onTablePositionsChange(prev => ({ ...prev, ...newPositions }));
            return currentNodes;
        });
    }, [onTablePositionsChange, setNodes]);

    const onConnect = useCallback((connection: Connection) => {
        if (connection.source && connection.target && connection.source !== connection.target) {
            const newJoin: Join = {
                from: connection.source,
                to: connection.target,
                type: 'INNER JOIN',
                on: { from: '', to: '' }
            };
            setEditingJoin(newJoin);
        }
    }, []);

    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        const join = joins.find(j =>
            (j.from === edge.source && j.to === edge.target) ||
            (j.from === edge.target && j.to === edge.source)
        );
        if (join) {
            setEditingJoin(join);
        }
    }, [joins]);

    const handleSaveJoin = useCallback((updatedJoin: Join) => {
        const existingJoinIndex = joins.findIndex(j => j.from === updatedJoin.from && j.to === updatedJoin.to);
        let newJoins;
        if (existingJoinIndex > -1) {
            newJoins = [...joins];
            newJoins[existingJoinIndex] = updatedJoin;
        } else {
            newJoins = [...joins, updatedJoin];
        }
        onJoinsChange(newJoins);
        setEditingJoin(null);
    }, [joins, onJoinsChange]);

    const handleDeleteJoin = useCallback((joinToDelete: Join) => {
        const newJoins = joins.filter(j => !(
            (j.from === joinToDelete.from && j.to === joinToDelete.to) ||
            (j.from === joinToDelete.to && j.to === joinToDelete.from)
        ));
        onJoinsChange(newJoins);
        setEditingJoin(null);
    }, [joins, onJoinsChange]);

    const handleCloseModal = useCallback(() => {
        setEditingJoin(null);
    }, []);

    const handleAutoLayout = useCallback(() => {
        const tableNames = tables.map(t => t.name);
        const newPositions = calculateAutoLayout(tableNames, joins);
        onTablePositionsChange(newPositions);
        
        // Update nodes immediately for better UX
        setNodes(currentNodes => 
            currentNodes.map(node => ({
                ...node,
                position: { 
                    x: newPositions[node.id]?.left || node.position.x, 
                    y: newPositions[node.id]?.top || node.position.y 
                }
            }))
        );

        // Fit view after layout with a slight delay to allow nodes to move
        setTimeout(() => {
            fitView({ duration: 800, padding: 0.2 });
        }, 50);
    }, [tables, joins, onTablePositionsChange, setNodes, fitView]);

    return (
        <div className="flex-1 h-full flex flex-col p-4 bg-background overflow-hidden relative z-10">
            <div className="flex-1 h-full relative border-2 border-border" style={{ boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.4)' }}>
                {tables.length === 0 ? <EmptyCanvas /> : null}

                {/* Magic Layout Button */}
                {tables.length > 0 && (
                    <button
                        onClick={handleAutoLayout}
                        className="absolute top-4 right-14 z-50 p-2 bg-primary text-primary-foreground border-2 border-border shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group flex items-center gap-2"
                        title="Auto-arrange Tables"
                    >
                        <AISparklesIcon className="h-5 w-5 group-hover:animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Magic Layout</span>
                    </button>
                )}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgeClick={onEdgeClick}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    maxZoom={2}
                    defaultViewport={{ x: 50, y: 50, zoom: 0.8 }}
                    connectionLineStyle={{ stroke: 'var(--color-primary)', strokeWidth: 2, strokeDasharray: '5,5' }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="var(--color-border)" />
                    <Controls className="react-flow-controls" showFitView />
                </ReactFlow>
            </div>

            {editingJoin && (
                <JoinEditorModal
                    join={editingJoin}
                    onClose={handleCloseModal}
                    onSave={handleSaveJoin}
                    onDelete={handleDeleteJoin}
                    allTables={tables}
                />
            )}
        </div>
    );
};

export default DataModelCanvas;
