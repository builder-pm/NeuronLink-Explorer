import { Join } from '../types';

export interface TablePosition {
    top: number;
    left: number;
}

export interface TablePositions {
    [tableName: string]: TablePosition;
}

/**
 * Automatically calculates positions for tables based on their joins.
 * Uses a simple layered approach (BFS-like) to minimize overlaps.
 */
export const calculateAutoLayout = (
    tables: string[],
    joins: Join[],
    existingPositions: TablePositions = {}
): TablePositions => {
    if (tables.length === 0) return {};

    const positions: TablePositions = { ...existingPositions };
    const visited = new Set<string>();
    const queue: { table: string; layer: number; index: number }[] = [];

    // Group joins by table for easy lookup
    const adjacency: { [key: string]: string[] } = {};
    tables.forEach(t => adjacency[t] = []);
    joins.forEach(j => {
        if (adjacency[j.from] && adjacency[j.to]) {
            adjacency[j.from].push(j.to);
            adjacency[j.to].push(j.from);
        }
    });

    // Start with tables that have the most connections (potential hubs)
    const sortedTables = [...tables].sort((a, b) => 
        (adjacency[b]?.length || 0) - (adjacency[a]?.length || 0)
    );

    let currentLayer = 0;
    let layerCounts: { [layer: number]: number } = {};

    const addToLayer = (table: string, layer: number) => {
        if (visited.has(table)) return;
        visited.add(table);
        const index = layerCounts[layer] || 0;
        queue.push({ table, layer, index });
        layerCounts[layer] = index + 1;
    };

    // BFS to assign layers
    sortedTables.forEach(root => {
        if (!visited.has(root)) {
            addToLayer(root, currentLayer);
            
            let qIndex = 0;
            while (qIndex < queue.length) {
                const { table, layer } = queue[qIndex++];
                (adjacency[table] || []).forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        addToLayer(neighbor, layer + 1);
                    }
                });
            }
            currentLayer = Math.max(...Object.keys(layerCounts).map(Number)) + 1;
        }
    });

    // Constants for layout
    const HORIZONTAL_GAP = 450;
    const VERTICAL_GAP = 350;
    const START_X = 100;
    const START_Y = 100;

    // Apply positions
    queue.forEach(({ table, layer, index }) => {
        // We only overwrite if not already positioned, or if we want a full re-layout.
        // For "automatic" on load, we usually only do it if the stored config is empty.
        positions[table] = {
            left: START_X + layer * HORIZONTAL_GAP,
            top: START_Y + index * VERTICAL_GAP
        };
    });

    return positions;
};
