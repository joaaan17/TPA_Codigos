// Configuración de la cuadrícula
const CONFIG = {
    CELL_SIZE: 20,              // Tamaño de cada celda en píxeles
    GRID_COLOR: '#FFFFFF',      // Color de las líneas de la cuadrícula (blanco)
    WALL_COLOR: '#FFFFFF',      // Color de los obstáculos (blanco)
    START_COLOR: '#4CAF50',     // Color del punto de inicio (verde)
    END_COLOR: '#FF5722',       // Color del punto de destino (naranja-rojo)
    OPEN_SET_COLOR: '#40E0D0', // Turquesa para frontera de búsqueda
    CLOSED_SET_COLOR: '#4682B4', // Azul oscuro para nodos explorados
    PATH_COLOR: '#FFFF00',      // Color del path encontrado (amarillo)
    START_POS: { x: 2, y: 2 },  // Posición inicial (esquina superior izquierda)
    END_POS: { x: 35, y: 25 }   // Posición del destino (zona inferior derecha)
};

// Variables globales
let canvas, ctx;
let obstacles = new Set(); // Usar Set para almacenar obstáculos de forma eficiente
let startPos = CONFIG.START_POS;
let endPos = CONFIG.END_POS;
let isDragging = false;
let draggingItem = null; // 'start', 'end' o null
let isMouseDown = false;
let isPainting = false; // true para pintar, false para borrar
let lastCell = null; // Para rastrear la última celda visitada
let currentPath = []; // Almacenar el path encontrado
let vehiclePos = { x: 0, y: 0 }; // Posición actual del vehículo (en coordenadas de celdas)
let pathIndex = 0; // Índice actual en el path
let isMoving = false; // Indica si el vehículo se está moviendo
let animationSpeed = 20; // Velocidad de movimiento (frames por celda) - incrementado para movimiento más suave
let frameCount = 0; // Contador de frames para animación suave
let visualizingSearch = false; // Modo de visualización de búsqueda
let openSetVisualization = new Set(); // Conjunto de celdas en la frontera de búsqueda
let closedSetVisualization = new Set(); // Conjunto de celdas ya exploradas
let visualizationStepDelay = 20; // Delay en ms entre cada paso de visualización (ajustado para mejor visualización)
let lastVizStepTime = Date.now(); // Timestamp del último step de visualización
let keepVisualization = false; // Mantener visualización después de completar la búsqueda
let finalOpenSet = new Set(); // Visualización final del open set
let finalClosedSet = new Set(); // Visualización final del closed set

// Configuración de dimensiones del canvas
const CANVAS_CONFIG = {
    baseWidth: 800,
    baseHeight: 600,
    aspectRatio: 800 / 600
};

// Inicialización
function init() {
    canvas = document.getElementById('gridCanvas');
    ctx = canvas.getContext('2d');
    
    // Redimensionar canvas al cargar y al cambiar el tamaño de la ventana
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners para interacción con mouse
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Deshabilitar menú contextual
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseUp); // Detener al salir del canvas
    
    // Event listeners para interacción táctil
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Event listener para teclado (presionar SPACE para buscar path)
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            startPathfinding();
        }
    });
    
    // Event listener para el botón de búsqueda
    const findPathBtn = document.getElementById('findPathBtn');
    if (findPathBtn) {
        findPathBtn.addEventListener('click', startPathfinding);
    }
    
    // Event listener para el botón de visualización
    const visualizeBtn = document.getElementById('visualizeBtn');
    if (visualizeBtn) {
        visualizeBtn.addEventListener('click', startVisualization);
    }
    
    // Event listener para el selector de algoritmo
    const algorithmSelect = document.getElementById('algorithmSelect');
    const heuristicGroup = document.getElementById('heuristicGroup');
    
    if (algorithmSelect) {
        // Función para mostrar/ocultar el selector de heurística
        const updateHeuristicVisibility = () => {
            const selectedAlgorithm = algorithmSelect.value;
            if (heuristicGroup) {
                if (selectedAlgorithm === 'dijkstra') {
                    heuristicGroup.classList.add('hidden');
                } else {
                    heuristicGroup.classList.remove('hidden');
                }
            }
        };
        
        // Ejecutar inicialmente
        updateHeuristicVisibility();
        
        algorithmSelect.addEventListener('change', (e) => {
            const selectedAlgorithm = e.target.value;
            if (typeof setAlgorithm === 'function') {
                setAlgorithm(selectedAlgorithm);
            }
            updateHeuristicVisibility();
        });
    }
    
    // Event listener para el selector de heurística
    const heuristicSelect = document.getElementById('heuristicSelect');
    if (heuristicSelect) {
        heuristicSelect.addEventListener('change', (e) => {
            const selectedHeuristic = e.target.value;
            if (typeof setHeuristic === 'function') {
                setHeuristic(selectedHeuristic);
            }
        });
    }
    
    // Inicializar posición del vehículo
    vehiclePos = { x: startPos.x, y: startPos.y };
    
    // Iniciar loop de animación
    animationLoop();
    
    render();
}

// Loop de animación para el movimiento del vehículo
function animationLoop(timestamp) {
    // Actualizar visualización de búsqueda si está activa
    if (visualizingSearch) {
        performVisualizationStep(timestamp);
    }
    
    // Actualizar posición del vehículo si está moviendo
    if (isMoving && currentPath.length > 0) {
        updateVehiclePosition();
    }
    
    requestAnimationFrame(animationLoop);
}

// Redimensionar el canvas manteniendo el aspect ratio
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    
    // Calcular el nuevo tamaño manteniendo el aspect ratio
    let newWidth = Math.min(containerWidth, CANVAS_CONFIG.baseWidth);
    let newHeight = newWidth / CANVAS_CONFIG.aspectRatio;
    
    // Asegurar que no exceda la altura disponible
    // En móviles, usar más espacio vertical (60% en móvil vs 70% en desktop)
    const isMobile = window.innerWidth <= 600;
    const maxHeight = window.innerHeight * (isMobile ? 0.6 : 0.7);
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * CANVAS_CONFIG.aspectRatio;
    }
    
    // Aplicar el nuevo tamaño
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    
    render();
}

// Obtener la celda desde coordenadas del mouse
function getCellFromMouse(x, y) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = x - rect.left;
    const mouseY = y - rect.top;
    
    return {
        x: Math.floor(mouseX / CONFIG.CELL_SIZE),
        y: Math.floor(mouseY / CONFIG.CELL_SIZE)
    };
}

// Verificar si una posición es el inicio
function isStart(pos) {
    return pos.x === startPos.x && pos.y === startPos.y;
}

// Verificar si una posición es el destino
function isEnd(pos) {
    return pos.x === endPos.x && pos.y === endPos.y;
}

// Manejar inicio de click presionado
function handleMouseDown(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Click derecho O Ctrl+click izquierdo: seleccionar inicio o destino para mover
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        if (isStart(cell)) {
            isDragging = true;
            draggingItem = 'start';
            return;
        } else if (isEnd(cell)) {
            isDragging = true;
            draggingItem = 'end';
            return;
        }
    }
    
    // Click izquierdo (sin Ctrl): iniciar pintado de obstáculos
    if (e.button === 0 && !e.ctrlKey) {
        isMouseDown = true;
        
        // No permitir obstáculos en las posiciones de inicio o fin
        if (isStart(cell) || isEnd(cell)) {
            return;
        }
        
        // Determinar si estamos pintando o borrando
        isPainting = !obstacles.has(cellKey);
        
        // Toggle la celda inicial
        if (isPainting) {
            obstacles.add(cellKey);
        } else {
            obstacles.delete(cellKey);
        }
        
        lastCell = cellKey;
        render();
    }
}

// Manejar click simple (tap)
function handleClick(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Click derecho: seleccionar inicio o destino para mover
    if (e.button === 2) {
        if (isStart(cell)) {
            isDragging = true;
            draggingItem = 'start';
            return;
        } else if (isEnd(cell)) {
            isDragging = true;
            draggingItem = 'end';
            return;
        }
    }
}

// Manejar liberación del mouse
function handleMouseUp(e) {
    isMouseDown = false;
    isDragging = false;
    lastCell = null;
}

// Función para pintar o borrar una celda
function paintCell(cell, cellKey) {
    // No permitir obstáculos en las posiciones de inicio o fin
    if (isStart(cell) || isEnd(cell)) {
        return;
    }
    
    if (isPainting) {
        obstacles.add(cellKey);
    } else {
        obstacles.delete(cellKey);
    }
}

// Manejar movimiento del mouse
function handleMouseMove(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Si estamos arrastrando inicio o fin
    if (isDragging && draggingItem) {
        // No permitir mover a posiciones con obstáculos u otra celda especial
        if (obstacles.has(cellKey)) return;
        if ((draggingItem === 'start' && isEnd(cell)) || 
            (draggingItem === 'end' && isStart(cell))) {
            return;
        }
        
        // Verificar que no se sale de los límites del grid
        const maxX = Math.ceil(canvas.width / CONFIG.CELL_SIZE);
        const maxY = Math.ceil(canvas.height / CONFIG.CELL_SIZE);
        if (cell.x < 0 || cell.x >= maxX || cell.y < 0 || cell.y >= maxY) {
            return;
        }
        
        if (draggingItem === 'start') {
            startPos = cell;
        } else if (draggingItem === 'end') {
            endPos = cell;
        }
        
        render();
        return;
    }
    
    // Si estamos pintando/borrando con el click izquierdo
    if (isMouseDown) {
        // Evitar pintar la misma celda múltiples veces
        if (lastCell === cellKey) return;
        lastCell = cellKey;
        
        paintCell(cell, cellKey);
        render();
    }
}

// Dibujar la cuadrícula
function drawGrid() {
    const rows = Math.ceil(canvas.height / CONFIG.CELL_SIZE);
    const cols = Math.ceil(canvas.width / CONFIG.CELL_SIZE);
    
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 0.5;
    
    // Dibujar líneas verticales
    for (let i = 0; i <= cols; i++) {
        const x = i * CONFIG.CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Dibujar líneas horizontales
    for (let i = 0; i <= rows; i++) {
        const y = i * CONFIG.CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Dibujar una celda cuadrada rellena
function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
        x * CONFIG.CELL_SIZE + 1,
        y * CONFIG.CELL_SIZE + 1,
        CONFIG.CELL_SIZE - 2,
        CONFIG.CELL_SIZE - 2
    );
}

// ========== ALGORITMO A* (usando módulo externo) ==========
function startPathfinding() {
    // Limpiar estado anterior
    currentPath = [];
    isMoving = false;
    keepVisualization = false; // Limpiar visualización cuando se inicia nuevo pathfinding
    finalOpenSet.clear();
    finalClosedSet.clear();
    
    // Usar el algoritmo A* simple (sin visualización paso a paso)
    currentPath = findPath(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles);
    
    // Si se encontró un path, iniciar el movimiento del vehículo
    if (currentPath.length > 0) {
        vehiclePos = { x: startPos.x, y: startPos.y };
        pathIndex = 0;
        isMoving = true;
        frameCount = 0;
    }
    
    render();
}

// Iniciar visualización de búsqueda paso a paso
function startVisualization() {
    // Limpiar estado anterior
    currentPath = [];
    isMoving = false;
    visualizingSearch = false;
    keepVisualization = false;
    openSetVisualization.clear();
    closedSetVisualization.clear();
    finalOpenSet.clear();
    finalClosedSet.clear();
    
    // Inicializar búsqueda paso a paso según el algoritmo seleccionado
    const algorithmSelect = document.getElementById('algorithmSelect');
    const selectedAlgorithm = algorithmSelect ? algorithmSelect.value : 'astar';
    
    if (selectedAlgorithm === 'dijkstra') {
        // Usar Dijkstra
        if (typeof initStepByStepDijkstra === 'function') {
            initStepByStepDijkstra(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles, updateVisualizationCallback);
            visualizingSearch = true;
            lastVizStepTime = 0;
            
            if (typeof stepDijkstraSearch === 'function') {
                stepDijkstraSearch();
            }
        }
    } else if (selectedAlgorithm === 'bfs') {
        // Usar Best-First Search
        if (typeof initStepByStepBFS === 'function') {
            initStepByStepBFS(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles, updateVisualizationCallback);
            visualizingSearch = true;
            lastVizStepTime = 0;
            
            if (typeof stepBFSSearch === 'function') {
                stepBFSSearch();
            }
        }
    } else {
        // Usar A*
        if (typeof initStepByStepSearch === 'function') {
            initStepByStepSearch(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles, updateVisualizationCallback);
            visualizingSearch = true;
            lastVizStepTime = 0;
            
            if (typeof stepAStarSearch === 'function') {
                stepAStarSearch();
            }
        }
    }
    
    render();
}

// Callback para actualizar la visualización durante la búsqueda
function updateVisualizationCallback(openSet, closedSet, state) {
    // Determinar qué algoritmo está activo
    const algorithmSelect = document.getElementById('algorithmSelect');
    const selectedAlgorithm = algorithmSelect ? algorithmSelect.value : 'astar';
    
    if (selectedAlgorithm === 'dijkstra') {
        // Usar las funciones de visualización de Dijkstra
        openSetVisualization = typeof getDijkstraOpenSetVisualization === 'function' 
            ? getDijkstraOpenSetVisualization() 
            : openSet;
        closedSetVisualization = typeof getDijkstraClosedSetVisualization === 'function' 
            ? getDijkstraClosedSetVisualization() 
            : closedSet;
    } else if (selectedAlgorithm === 'bfs') {
        // Usar las funciones de visualización de BFS
        openSetVisualization = typeof getBFSOpenSetVisualization === 'function' 
            ? getBFSOpenSetVisualization() 
            : openSet;
        closedSetVisualization = typeof getBFSClosedSetVisualization === 'function' 
            ? getBFSClosedSetVisualization() 
            : closedSet;
    } else {
        // Usar las funciones de visualización de A*
        openSetVisualization = openSet;
        closedSetVisualization = closedSet;
    }
    
    // Si la búsqueda está completa, guardar visualización final y mantenerla visible
    if (state.complete) {
        visualizingSearch = false;
        keepVisualization = true; // Mantener visualización visible
        
        // Guardar el estado final de la visualización
        finalOpenSet = new Set(openSetVisualization);
        finalClosedSet = new Set(closedSetVisualization);
        
        if (state.found) {
            currentPath = state.path;
        }
    }
}

// Ejecutar un step de visualización
function performVisualizationStep(timestamp) {
    if (!visualizingSearch) {
        return;
    }
    
    // Controlar velocidad con delay
    const currentTime = timestamp || Date.now();
    const timeSinceLastStep = currentTime - lastVizStepTime;
    
    if (timeSinceLastStep < visualizationStepDelay) {
        return;
    }
    
    lastVizStepTime = currentTime;
    
    // Determinar qué algoritmo usar
    const algorithmSelect = document.getElementById('algorithmSelect');
    const selectedAlgorithm = algorithmSelect ? algorithmSelect.value : 'astar';
    
    if (selectedAlgorithm === 'dijkstra') {
        if (typeof stepDijkstraSearch === 'function') {
            stepDijkstraSearch();
        }
        
        if (typeof isDijkstraComplete === 'function' && isDijkstraComplete()) {
            visualizingSearch = false;
        }
    } else if (selectedAlgorithm === 'bfs') {
        if (typeof stepBFSSearch === 'function') {
            stepBFSSearch();
        }
        
        if (typeof isBFSComplete === 'function' && isBFSComplete()) {
            visualizingSearch = false;
        }
    } else {
        if (typeof stepAStarSearch === 'function') {
            stepAStarSearch();
        }
        
        if (typeof isSearchComplete === 'function' && isSearchComplete()) {
            visualizingSearch = false;
        }
    }
    
    render();
}

// Actualizar posición del vehículo según el path
function updateVehiclePosition() {
    frameCount++;
    
    if (frameCount >= animationSpeed && pathIndex < currentPath.length - 1) {
        pathIndex++;
        vehiclePos = { 
            x: currentPath[pathIndex].x, 
            y: currentPath[pathIndex].y 
        };
        frameCount = 0;
    }
    
    // Si llegó al destino, detener el movimiento
    if (pathIndex >= currentPath.length - 1) {
        isMoving = false;
    }
    
    render();
}

// Obtener posición interpolada del vehículo para animación suave
function getInterpolatedVehiclePosition() {
    if (pathIndex >= currentPath.length - 1) {
        return vehiclePos;
    }
    
    const current = currentPath[pathIndex];
    const next = currentPath[pathIndex + 1];
    const progress = frameCount / animationSpeed;
    
    return {
        x: current.x + (next.x - current.x) * progress,
        y: current.y + (next.y - current.y) * progress
    };
}

// Calcular dirección del vehículo para rotar la flecha
function getVehicleDirection() {
    if (pathIndex < currentPath.length - 1) {
        const current = currentPath[pathIndex];
        const next = currentPath[pathIndex + 1];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        
        // Calcular ángulo en radianes (invertir dy porque el canvas tiene y invertido)
        const angle = Math.atan2(dy, dx);
        return angle;
    }
    return 0; // Por defecto apunta a la derecha
}

// Dibujar el path encontrado
function drawPath() {
    if (currentPath.length === 0) return;
    
    ctx.strokeStyle = '#FFFF00'; // Amarillo para el path
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < currentPath.length; i++) {
        const cell = currentPath[i];
        const centerX = cell.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        const centerY = cell.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        
        if (i === 0) {
            ctx.moveTo(centerX, centerY);
        } else {
            ctx.lineTo(centerX, centerY);
        }
    }
    
    ctx.stroke();
}

// Dibujar una flecha triangular (para el agente vehículo)
function drawArrow(x, y, direction = 0) {
    // Calcular el centro de la celda
    const centerX = x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const centerY = y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const size = CONFIG.CELL_SIZE * 0.5; // 50% del tamaño de la celda para hacerlo más pequeño
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(direction);
    
    // Dibujar triángulo apuntando a la derecha (como la imagen)
    ctx.fillStyle = '#4CAF50'; // Verde
    ctx.beginPath();
    ctx.moveTo(size * 0.7, 0); // Punta de la flecha (más alargada)
    ctx.lineTo(-size * 0.7, size * 0.4); // Esquina inferior izquierda
    ctx.lineTo(-size * 0.7, -size * 0.4); // Esquina superior izquierda
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Renderizar todo el estado actual
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Dibujar la cuadrícula
    drawGrid();
    
    // 2. Si estamos en modo visualización o manteniendo visualización, dibujar celdas exploradas
    if (visualizingSearch) {
        // Dibujar Closed Set (nodos explorados)
        for (const cellKey of closedSetVisualization) {
            const [x, y] = cellKey.split(',').map(Number);
            drawCell(x, y, CONFIG.CLOSED_SET_COLOR);
        }
        
        // Dibujar Open Set (frontera de búsqueda)
        for (const cellKey of openSetVisualization) {
            const [x, y] = cellKey.split(',').map(Number);
            // Solo dibujar si no está en closed set
            if (!closedSetVisualization.has(cellKey)) {
                drawCell(x, y, CONFIG.OPEN_SET_COLOR);
            }
        }
    } else if (keepVisualization) {
        // Mantener visualización final después de completar la búsqueda
        // Dibujar Closed Set (nodos explorados)
        for (const cellKey of finalClosedSet) {
            const [x, y] = cellKey.split(',').map(Number);
            drawCell(x, y, CONFIG.CLOSED_SET_COLOR);
        }
        
        // Dibujar Open Set (frontera de búsqueda)
        for (const cellKey of finalOpenSet) {
            const [x, y] = cellKey.split(',').map(Number);
            // Solo dibujar si no está en closed set
            if (!finalClosedSet.has(cellKey)) {
                drawCell(x, y, CONFIG.OPEN_SET_COLOR);
            }
        }
    }
    
    // 3. Dibujar obstáculos
    for (const cellKey of obstacles) {
        const [x, y] = cellKey.split(',').map(Number);
        drawCell(x, y, CONFIG.WALL_COLOR);
    }
    
    // 4. Dibujar el path si existe
    drawPath();
    
    // 5. Dibujar punto de destino
    drawCell(endPos.x, endPos.y, CONFIG.END_COLOR);
    
    // 6. Dibujar el vehículo en su posición actual con rotación
    if (isMoving && currentPath.length > 0 && !visualizingSearch) {
        // Obtener posición interpolada para animación suave
        const interpolatedPos = getInterpolatedVehiclePosition();
        // Calcular dirección del vehículo
        const direction = getVehicleDirection();
        drawArrow(interpolatedPos.x, interpolatedPos.y, direction);
    } else {
        // Si no está moviendo o está en modo visualización, usar la posición de inicio
        drawArrow(startPos.x, startPos.y, 0);
    }
}

// Handlers para eventos táctiles
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0, // Tratamos todos los toques como click izquierdo
        touches: e.touches
    };
    handleMouseDown(simulatedEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp(e);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        touches: e.touches
    };
    handleMouseMove(simulatedEvent);
}

// Iniciar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', init);


