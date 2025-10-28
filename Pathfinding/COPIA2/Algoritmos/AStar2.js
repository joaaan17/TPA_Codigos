// ========== ALGORITMO A* ==========

// Variables internas para visualización paso a paso
let internalOpenSet = new Map();
let internalClosedSet = new Set();
let currentNodeVis = null;
let searchState = null;
let callbackVisualization = null;

// Variable para seleccionar qué heurística usar
let currentHeuristic = 'euclidean'; // 'euclidean' o 'manhattan'

// Variable para seleccionar qué algoritmo usar
let currentAlgorithm = 'astar'; // 'astar' o 'dijkstra'

// Función para cambiar el algoritmo
function setAlgorithm(algorithmType) {
    currentAlgorithm = algorithmType;
}

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

// Calcular distancia Manhattan entre dos puntos (en enteros, multiplicado por 10)
function manhattanDistance(a, b) {
    return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * 10;
}

// Calcular distancia Octile en enteros (optimizada para movimiento diagonal)
// La distancia octil favorece movimientos diagonales sobre ortogonales
// Para una diagonal, el costo es √2, para ortogonal es 1
function euclideanDistance(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    
    // Distancia octil: permite usar el mejor costo (diagonal u ortogonal)
    // Si dx > dy, prioriza movimientos horizontales (costo 10)
    // Si dy > dx, prioriza movimientos verticales (costo 10)
    // Si dx == dy, prioriza diagonales (costo 14)
    const diagonal = Math.min(dx, dy);
    const straight = Math.abs(dx - dy);
    
    // Costo total = diagonal * 14 + straight * 10
    return diagonal * 14 + straight * 10;
}

// Función que calcula la heurística según la selección actual
function calculateHeuristic(a, b) {
    if (currentHeuristic === 'manhattan') {
        return manhattanDistance(a, b);
    } else {
        // 'euclidean' es el valor por defecto
        return euclideanDistance(a, b);
    }
}

// Función para cambiar la heurística
function setHeuristic(heuristicType) {
    currentHeuristic = heuristicType;
}

// Exportar función para cambiar heurística
if (typeof window !== 'undefined') {
    window.setHeuristic = setHeuristic;
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

// Obtener vecinos de una celda (8 direcciones: 4 ortogonales + 4 diagonales)
function getNeighbors(node, canvas, CELL_SIZE, obstacles) {
    const directions = [
        // Movimientos ortogonales (costo 10 - representando 1.0)
        { x: 1, y: 0, cost: 10 },   // Derecha
        { x: -1, y: 0, cost: 10 },  // Izquierda
        { x: 0, y: 1, cost: 10 },   // Abajo
        { x: 0, y: -1, cost: 10 },  // Arriba
        // Movimientos diagonales (costo 14 - representando 1.414, redondeado a 14 para evitar floats)
        { x: 1, y: 1, cost: 14 },   // Diagonal inferior derecha
        { x: -1, y: 1, cost: 14 },  // Diagonal inferior izquierda
        { x: 1, y: -1, cost: 14 },  // Diagonal superior derecha
        { x: -1, y: -1, cost: 14 }  // Diagonal superior izquierda
    ];
    
    const neighbors = [];
    for (const dir of directions) {
        const nx = node.x + dir.x;
        const ny = node.y + dir.y;
        
        if (isValidPosition(nx, ny, canvas, CELL_SIZE, obstacles)) {
            neighbors.push({ x: nx, y: ny, cost: dir.cost });
        }
    }
    
    return neighbors;
}

// Algoritmo A* original (instantáneo)
function astarPath(start, end, canvas, CELL_SIZE, obstacles) {
    const openSet = new Map();
    const closedSet = new Set();
    
    // Nodo inicial
    const startNode = new Node(start.x, start.y, 0, calculateHeuristic(start, end));
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
        
        // Si no hay currentNode válido, no hay path
        if (!currentNode) {
            return [];
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
            
            // Calcular coste (usando el costo del movimiento)
            const g = currentNode.g + neighbor.cost; // Coste variable según el tipo de movimiento
            const h = calculateHeuristic(neighbor, end); // Usar heurística seleccionada
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
    const startNode = new Node(start.x, start.y, 0, calculateHeuristic(start, end));
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
        
        // Calcular coste (usando el costo del movimiento)
        const g = currentNode.g + neighbor.cost; // Coste variable según el tipo de movimiento
        const h = calculateHeuristic(neighbor, searchState.end); // Usar heurística seleccionada
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

// Función principal de búsqueda que selecciona entre A*, Dijkstra y BFS
function findPathMain(start, end, canvas, CELL_SIZE, obstacles) {
    if (currentAlgorithm === 'dijkstra' && typeof dijkstraPath === 'function') {
        return dijkstraPath(start, end, canvas, CELL_SIZE, obstacles);
    } else if (currentAlgorithm === 'bfs' && typeof bestFirstSearchPath === 'function') {
        return bestFirstSearchPath(start, end, canvas, CELL_SIZE, obstacles);
    } else {
        // 'astar' es el valor por defecto
        return astarPath(start, end, canvas, CELL_SIZE, obstacles);
    }
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
    window.findPath = findPathMain; // Exportar función principal
    window.setAlgorithm = setAlgorithm;
}
