// ========== ALGORITMO BEST-FIRST SEARCH (BFS) ==========

// Nota: Este archivo asume que se cargan AStar2.js antes que BFS.js
// ya que depende de Node, getNeighbors y otras funciones compartidas

// Variables internas para visualización paso a paso de BFS
let bfsOpenSet = new Map();
let bfsClosedSet = new Set();
let bfsCurrentNode = null;
let bfsState = null;
let bfsCallback = null;

// Algoritmo Best-First Search (usa solo heurística h, ignora coste g)
function bestFirstSearchPath(start, end, canvas, CELL_SIZE, obstacles) {
    const openSet = new Map();
    const closedSet = new Set();
    
    // Nodo inicial
    const startNode = new Node(start.x, start.y, 0, calculateHeuristic(start, end));
    startNode.f = startNode.h; // BFS solo usa heurística, no coste acumulado
    openSet.set(startNode.getKey(), startNode);
    
    while (openSet.size > 0) {
        // Encontrar el nodo con menor f (que es igual a h en BFS)
        let currentNode = null;
        let lowestF = Infinity;
        
        for (const node of openSet.values()) {
            if (node.f < lowestF) {
                lowestF = node.f;
                currentNode = node;
            }
        }
        
        // Si llegamos al destino
        if (currentNode.x === end.x && currentNode.y === end.y) {
            // Reconstruir el path
            const path = [];
            let node = currentNode;
            while (node !== null) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }
        
        // Mover del openSet al closedSet
        openSet.delete(currentNode.getKey());
        closedSet.add(currentNode.getKey());
        
        // Explorar vecinos
        const neighbors = getNeighbors(currentNode, canvas, CELL_SIZE, obstacles);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) {
                continue;
            }
            
            // Calcular solo heurística (ignorar coste g)
            const h = calculateHeuristic(neighbor, end);
            const f = h; // BFS usa f = h (solo heurística)
            
            // Verificar si ya está en el openSet
            if (openSet.has(neighborKey)) {
                const existingNode = openSet.get(neighborKey);
                // Si encontramos un camino con mejor heurística, actualizar
                if (h < existingNode.h) {
                    existingNode.h = h;
                    existingNode.f = f;
                    existingNode.parent = currentNode;
                }
            } else {
                const newNode = new Node(neighbor.x, neighbor.y, 0, h, f, currentNode);
                openSet.set(neighborKey, newNode);
            }
        }
    }
    
    // No se encontró path
    return [];
}

// Inicializar búsqueda BFS paso a paso
function initStepByStepBFS(start, end, canvas, CELL_SIZE, obstacles, callback) {
    bfsOpenSet.clear();
    bfsClosedSet.clear();
    bfsCurrentNode = null;
    bfsCallback = callback;
    
    // Inicializar estado
    const startNode = new Node(start.x, start.y, 0, calculateHeuristic(start, end));
    startNode.f = startNode.h; // BFS solo usa heurística
    bfsOpenSet.set(startNode.getKey(), startNode);
    
    bfsState = {
        start: start,
        end: end,
        canvas: canvas,
        CELL_SIZE: CELL_SIZE,
        obstacles: obstacles,
        path: [],
        found: false,
        complete: false
    };
}

// Ejecutar un paso del algoritmo BFS
function stepBFSSearch() {
    if (bfsState.complete) {
        return;
    }
    
    if (bfsOpenSet.size === 0) {
        bfsState.complete = true;
        bfsState.found = false;
        bfsState.path = [];
        if (bfsCallback) {
            bfsCallback(getBFSOpenSetVisualization(), getBFSClosedSetVisualization(), bfsState);
        }
        return;
    }
    
    // Encontrar el nodo con menor f
    let currentNode = null;
    let lowestF = Infinity;
    
    for (const node of bfsOpenSet.values()) {
        if (node.f < lowestF) {
            lowestF = node.f;
            currentNode = node;
        }
    }
    
    // Si llegamos al destino
    if (currentNode.x === bfsState.end.x && currentNode.y === bfsState.end.y) {
        bfsState.complete = true;
        bfsState.found = true;
        
        // Reconstruir el path
        const path = [];
        let node = currentNode;
        while (node !== null) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
        }
        bfsState.path = path;
        
        if (bfsCallback) {
            bfsCallback(getBFSOpenSetVisualization(), getBFSClosedSetVisualization(), bfsState);
        }
        return;
    }
    
    // Mover del openSet al closedSet
    bfsOpenSet.delete(currentNode.getKey());
    bfsClosedSet.add(currentNode.getKey());
    bfsCurrentNode = currentNode;
    
    // Explorar vecinos
    const neighborCoords = getNeighbors(currentNode, bfsState.canvas, bfsState.CELL_SIZE, bfsState.obstacles);
    
    for (const neighbor of neighborCoords) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (bfsClosedSet.has(neighborKey)) {
            continue;
        }
        
        // Calcular solo heurística (ignorar coste)
        const h = calculateHeuristic(neighbor, bfsState.end);
        const f = h; // BFS usa f = h
        
        // Verificar si ya está en el openSet
        if (bfsOpenSet.has(neighborKey)) {
            const existingNode = bfsOpenSet.get(neighborKey);
            // Si encontramos mejor heurística, actualizar
            if (h < existingNode.h) {
                existingNode.h = h;
                existingNode.f = f;
                existingNode.parent = currentNode;
            }
        } else {
            const newNode = new Node(neighbor.x, neighbor.y, 0, h, f, currentNode);
            bfsOpenSet.set(neighborKey, newNode);
        }
    }
    
    // Notificar cambio de estado
    if (bfsCallback) {
        bfsCallback(getBFSOpenSetVisualization(), getBFSClosedSetVisualization(), bfsState);
    }
}

// Obtener visualización del Open Set
function getBFSOpenSetVisualization() {
    const openSet = new Set();
    for (const key of bfsOpenSet.keys()) {
        openSet.add(key);
    }
    return openSet;
}

// Obtener visualización del Closed Set
function getBFSClosedSetVisualization() {
    return new Set(bfsClosedSet);
}

// Verificar si la búsqueda está completa
function isBFSComplete() {
    return bfsState && bfsState.complete;
}

// Verificar si se encontró un path
function isBFSFound() {
    return bfsState && bfsState.found;
}

// Obtener el path encontrado
function getBFSPath() {
    return bfsState ? bfsState.path : [];
}

// Exportar funciones al objeto window para acceso global
if (typeof window !== 'undefined') {
    window.bestFirstSearchPath = bestFirstSearchPath;
    window.initStepByStepBFS = initStepByStepBFS;
    window.stepBFSSearch = stepBFSSearch;
    window.isBFSComplete = isBFSComplete;
    window.isBFSFound = isBFSFound;
    window.getBFSPath = getBFSPath;
    window.getBFSOpenSetVisualization = getBFSOpenSetVisualization;
    window.getBFSClosedSetVisualization = getBFSClosedSetVisualization;
}

