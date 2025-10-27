// ========== ALGORITMO A* ==========

// Variables internas para visualización paso a paso
let internalOpenSet = new Map();
let internalClosedSet = new Set();
let currentNodeVis = null;
let searchState = null;
let callbackVisualization = null;

// Clase para representar cada nodo en el grafo
class Node {
    constructor(x, y, g = Infinity, h = 0, f = Infinity, parent = null) {
        this.x = x;
        this.y = y;
        this.g = g; // Coste desde el inicio
        this.h = h; // Heurística (distancia al destino)
        this.f = f; // Coste total (g + h)
        this.parent = parent;
    }
    
    getKey() {
        return `${this.x},${this.y}`;
    }
}

// Calcular distancia Manhattan entre dos puntos
function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Verificar si una posición es válida (dentro de límites y sin obstáculos)
function isValidPosition(x, y, canvas, CELL_SIZE, obstacles) {
    // Verificar límites del grid
    const maxX = Math.ceil(canvas.width / CELL_SIZE);
    const maxY = Math.ceil(canvas.height / CELL_SIZE);
    
    if (x < 0 || x >= maxX || y < 0 || y >= maxY) {
        return false;
    }
    
    // Verificar si hay un obstáculo
    const cellKey = `${x},${y}`;
    return !obstacles.has(cellKey);
}

// Obtener vecinos de una celda (4 direcciones)
function getNeighbors(node, canvas, CELL_SIZE, obstacles) {
    const directions = [
        { x: 1, y: 0 },   // Derecha
        { x: -1, y: 0 },  // Izquierda
        { x: 0, y: 1 },   // Abajo
        { x: 0, y: -1 }   // Arriba
    ];
    
    const neighbors = [];
    for (const dir of directions) {
        const nx = node.x + dir.x;
        const ny = node.y + dir.y;
        
        if (isValidPosition(nx, ny, canvas, CELL_SIZE, obstacles)) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    
    return neighbors;
}

// Algoritmo A* original (instantáneo)
function findPath(start, end, canvas, CELL_SIZE, obstacles) {
    const openSet = new Map();
    const closedSet = new Set();
    
    // Nodo inicial
    const startNode = new Node(start.x, start.y, 0, manhattanDistance(start, end));
    startNode.f = startNode.g + startNode.h;
    openSet.set(startNode.getKey(), startNode);
    
    while (openSet.size > 0) {
        // Encontrar el nodo con menor f
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
            
            // Calcular coste
            const g = currentNode.g + 1; // Coste uniforme de 1 por paso
            const h = manhattanDistance(neighbor, end);
            const f = g + h;
            
            // Verificar si ya está en el openSet
            if (openSet.has(neighborKey)) {
                const existingNode = openSet.get(neighborKey);
                if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = currentNode;
                }
            } else {
                const newNode = new Node(neighbor.x, neighbor.y, g, h, f, currentNode);
                openSet.set(neighborKey, newNode);
            }
        }
    }
    
    // No se encontró path
    return [];
}

// Inicializar búsqueda A* paso a paso
function initStepByStepSearch(start, end, canvas, CELL_SIZE, obstacles, callback) {
    internalOpenSet.clear();
    internalClosedSet.clear();
    currentNodeVis = null;
    callbackVisualization = callback;
    
    // Inicializar estado
    const startNode = new Node(start.x, start.y, 0, manhattanDistance(start, end));
    startNode.f = startNode.g + startNode.h;
    internalOpenSet.set(startNode.getKey(), startNode);
    
    searchState = {
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

// Ejecutar un paso del algoritmo A*
function stepAStarSearch() {
    if (searchState.complete) {
        return;
    }
    
    if (internalOpenSet.size === 0) {
        searchState.complete = true;
        searchState.found = false;
        searchState.path = [];
        if (callbackVisualization) {
            callbackVisualization(getOpenSetVisualization(), getClosedSetVisualization(), searchState);
        }
        return;
    }
    
    // Encontrar el nodo con menor f
    let currentNode = null;
    let lowestF = Infinity;
    
    for (const node of internalOpenSet.values()) {
        if (node.f < lowestF) {
            lowestF = node.f;
            currentNode = node;
        }
    }
    
    // Si llegamos al destino
    if (currentNode.x === searchState.end.x && currentNode.y === searchState.end.y) {
        searchState.complete = true;
        searchState.found = true;
        
        // Reconstruir el path
        const path = [];
        let node = currentNode;
        while (node !== null) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
        }
        searchState.path = path;
        
        if (callbackVisualization) {
            callbackVisualization(getOpenSetVisualization(), getClosedSetVisualization(), searchState);
        }
        return;
    }
    
    // Mover del openSet al closedSet
    internalOpenSet.delete(currentNode.getKey());
    internalClosedSet.add(currentNode.getKey());
    currentNodeVis = currentNode;
    
    // Explorar vecinos usando getNeighbors con el formato correcto
    const neighborCoords = getNeighbors(currentNode, searchState.canvas, searchState.CELL_SIZE, searchState.obstacles);
    
    for (const neighbor of neighborCoords) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (internalClosedSet.has(neighborKey)) {
            continue;
        }
        
        // Calcular coste
        const g = currentNode.g + 1;
        const h = manhattanDistance(neighbor, searchState.end);
        const f = g + h;
        
        // Verificar si ya está en el openSet
        if (internalOpenSet.has(neighborKey)) {
            const existingNode = internalOpenSet.get(neighborKey);
            if (g < existingNode.g) {
                existingNode.g = g;
                existingNode.f = f;
                existingNode.parent = currentNode;
            }
        } else {
            const newNode = new Node(neighbor.x, neighbor.y, g, h, f, currentNode);
            internalOpenSet.set(neighborKey, newNode);
        }
    }
    
    // Notificar cambio de estado
    if (callbackVisualization) {
        callbackVisualization(getOpenSetVisualization(), getClosedSetVisualization(), searchState);
    }
}

// Obtener visualización del Open Set
function getOpenSetVisualization() {
    const openSet = new Set();
    for (const key of internalOpenSet.keys()) {
        openSet.add(key);
    }
    return openSet;
}

// Obtener visualización del Closed Set
function getClosedSetVisualization() {
    return new Set(internalClosedSet);
}

// Verificar si la búsqueda está completa
function isSearchComplete() {
    return searchState && searchState.complete;
}

// Verificar si se encontró un path
function isPathFound() {
    return searchState && searchState.found;
}

// Obtener el path encontrado
function getPath() {
    return searchState ? searchState.path : [];
}

// Exportar funciones al objeto window para acceso global
if (typeof window !== 'undefined') {
    window.initStepByStepSearch = initStepByStepSearch;
    window.stepAStarSearch = stepAStarSearch;
    window.isSearchComplete = isSearchComplete;
    window.isPathFound = isPathFound;
    window.getPath = getPath;
    window.getOpenSetVisualization = getOpenSetVisualization;
    window.getClosedSetVisualization = getClosedSetVisualization;
}
