// ========== ALGORITMO DE DIJKSTRA ==========

// Nota: Este archivo asume que se cargan AStar2.js antes que Dijkstra.js
// ya que depende de Node, getNeighbors y otras funciones compartidas

// Variables internas para visualización paso a paso de Dijkstra
let dijkstraOpenSet = new Map();
let dijkstraClosedSet = new Set();
let dijkstraCurrentNode = null;
let dijkstraState = null;
let dijkstraCallback = null;

// Algoritmo de Dijkstra (sin heurística, solo usa coste g)
function dijkstraPath(start, end, canvas, CELL_SIZE, obstacles) {
    const openSet = new Map();
    const closedSet = new Set();
    
    // Nodo inicial
    const startNode = new Node(start.x, start.y, 0, 0); // h = 0 porque Dijkstra no usa heurística
    startNode.f = startNode.g; // f = g (sin heurística)
    openSet.set(startNode.getKey(), startNode);
    
    while (openSet.size > 0) {
        // Encontrar el nodo con menor f (que es igual a g en Dijkstra)
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
            
            // Calcular coste (solo g, sin heurística)
            const g = currentNode.g + neighbor.cost;
            const f = g; // Dijkstra usa f = g (sin heurística)
            
            // Verificar si ya está en el openSet
            if (openSet.has(neighborKey)) {
                const existingNode = openSet.get(neighborKey);
                if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = currentNode;
                }
            } else {
                const newNode = new Node(neighbor.x, neighbor.y, g, 0, f, currentNode);
                openSet.set(neighborKey, newNode);
            }
        }
    }
    
    // No se encontró path
    return [];
}

// Inicializar búsqueda Dijkstra paso a paso
function initStepByStepDijkstra(start, end, canvas, CELL_SIZE, obstacles, callback) {
    dijkstraOpenSet.clear();
    dijkstraClosedSet.clear();
    dijkstraCurrentNode = null;
    dijkstraCallback = callback;
    
    // Inicializar estado
    const startNode = new Node(start.x, start.y, 0, 0); // Dijkstra no usa heurística
    startNode.f = startNode.g;
    dijkstraOpenSet.set(startNode.getKey(), startNode);
    
    dijkstraState = {
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

// Ejecutar un paso del algoritmo Dijkstra
function stepDijkstraSearch() {
    if (dijkstraState.complete) {
        return;
    }
    
    if (dijkstraOpenSet.size === 0) {
        dijkstraState.complete = true;
        dijkstraState.found = false;
        dijkstraState.path = [];
        if (dijkstraCallback) {
            dijkstraCallback(getDijkstraOpenSetVisualization(), getDijkstraClosedSetVisualization(), dijkstraState);
        }
        return;
    }
    
    // Encontrar el nodo con menor f
    let currentNode = null;
    let lowestF = Infinity;
    
    for (const node of dijkstraOpenSet.values()) {
        if (node.f < lowestF) {
            lowestF = node.f;
            currentNode = node;
        }
    }
    
    // Si llegamos al destino
    if (currentNode.x === dijkstraState.end.x && currentNode.y === dijkstraState.end.y) {
        dijkstraState.complete = true;
        dijkstraState.found = true;
        
        // Reconstruir el path
        const path = [];
        let node = currentNode;
        while (node !== null) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
        }
        dijkstraState.path = path;
        
        if (dijkstraCallback) {
            dijkstraCallback(getDijkstraOpenSetVisualization(), getDijkstraClosedSetVisualization(), dijkstraState);
        }
        return;
    }
    
    // Mover del openSet al closedSet
    dijkstraOpenSet.delete(currentNode.getKey());
    dijkstraClosedSet.add(currentNode.getKey());
    dijkstraCurrentNode = currentNode;
    
    // Explorar vecinos
    const neighborCoords = getNeighbors(currentNode, dijkstraState.canvas, dijkstraState.CELL_SIZE, dijkstraState.obstacles);
    
    for (const neighbor of neighborCoords) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (dijkstraClosedSet.has(neighborKey)) {
            continue;
        }
        
        // Calcular coste (solo g, sin heurística)
        const g = currentNode.g + neighbor.cost;
        const f = g; // Dijkstra usa f = g
        
        // Verificar si ya está en el openSet
        if (dijkstraOpenSet.has(neighborKey)) {
            const existingNode = dijkstraOpenSet.get(neighborKey);
            if (g < existingNode.g) {
                existingNode.g = g;
                existingNode.f = f;
                existingNode.parent = currentNode;
            }
        } else {
            const newNode = new Node(neighbor.x, neighbor.y, g, 0, f, currentNode);
            dijkstraOpenSet.set(neighborKey, newNode);
        }
    }
    
    // Notificar cambio de estado
    if (dijkstraCallback) {
        dijkstraCallback(getDijkstraOpenSetVisualization(), getDijkstraClosedSetVisualization(), dijkstraState);
    }
}

// Obtener visualización del Open Set
function getDijkstraOpenSetVisualization() {
    const openSet = new Set();
    for (const key of dijkstraOpenSet.keys()) {
        openSet.add(key);
    }
    return openSet;
}

// Obtener visualización del Closed Set
function getDijkstraClosedSetVisualization() {
    return new Set(dijkstraClosedSet);
}

// Verificar si la búsqueda está completa
function isDijkstraComplete() {
    return dijkstraState && dijkstraState.complete;
}

// Verificar si se encontró un path
function isDijkstraFound() {
    return dijkstraState && dijkstraState.found;
}

// Obtener el path encontrado
function getDijkstraPath() {
    return dijkstraState ? dijkstraState.path : [];
}

// Exportar funciones al objeto window para acceso global
if (typeof window !== 'undefined') {
    window.dijkstraPath = dijkstraPath;
    window.initStepByStepDijkstra = initStepByStepDijkstra;
    window.stepDijkstraSearch = stepDijkstraSearch;
    window.isDijkstraComplete = isDijkstraComplete;
    window.isDijkstraFound = isDijkstraFound;
    window.getDijkstraPath = getDijkstraPath;
    window.getDijkstraOpenSetVisualization = getDijkstraOpenSetVisualization;
    window.getDijkstraClosedSetVisualization = getDijkstraClosedSetVisualization;
}

