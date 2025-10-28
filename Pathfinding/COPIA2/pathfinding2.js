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

// Variables para objetivo móvil
let objectiveType = 'fixed'; // 'fixed' o 'moving'
let isTrackingMouse = false; // Indica si estamos siguiendo el mouse para objetivo móvil
let mouseCell = null; // Celda actual bajo el mouse (para objetivo móvil)

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
    
    // Event listener para teclado (presionar SPACE para buscar path, flechas para mover cursor rojo)
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            startPathfinding();
        }
        
        // Si el objetivo es móvil, permitir mover el cursor rojo con las flechas
        if (objectiveType === 'moving') {
            let moved = false;
            let newX = endPos.x;
            let newY = endPos.y;
            
            // Calcular límites del grid
            const maxX = Math.ceil(canvas.width / CONFIG.CELL_SIZE) - 1;
            const maxY = Math.ceil(canvas.height / CONFIG.CELL_SIZE) - 1;
            
            if (e.code === 'ArrowUp' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (newY > 0) {
                    newY--;
                    moved = true;
                }
            } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (newY < maxY) {
                    newY++;
                    moved = true;
                }
            } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
                e.preventDefault();
                if (newX > 0) {
                    newX--;
                    moved = true;
                }
            } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (newX < maxX) {
                    newX++;
                    moved = true;
                }
            }
            
            // Si se movió y la nueva posición no es un obstáculo, actualizar
            if (moved) {
                const newCellKey = `${newX},${newY}`;
                if (!obstacles.has(newCellKey)) {
                    const oldEndPos = { ...endPos };
                    endPos = { x: newX, y: newY };
                    mouseCell = { x: newX, y: newY };
                    
                    console.log('=== MOVIMIENTO CURSOR ROJO CON FLECHAS ===');
                    console.log('Posición anterior del cursor:', oldEndPos);
                    console.log('Nueva posición del cursor:', endPos);
                    console.log('isTrackingMouse:', isTrackingMouse);
                    
                    // Activar seguimiento si no estaba activo
                    isTrackingMouse = true;
                    
                    render();
                    
                    // Si hay un agente activo (flocking o vehículo), recalcular el path
                    if (typeof flockingManager !== 'undefined' && flockingManager.isFlockingMode && flockingManager.boids.length > 0 && flockingManager.isRunning) {
                        console.log('Bandada activa detectada, recalculando path...');
                        console.log('Número de boids activos:', flockingManager.boids.filter(b => b.isActive).length);
                        
                        // Encontrar el boid más adelante en el path actual para usar su posición como punto de partida
                        let bestStartCell = null;
                        let maxPathProgress = -1;
                        let bestBoid = null;
                        
                        for (let boid of flockingManager.boids) {
                            if (!boid.isActive) continue;
                            
                            // Convertir posición en píxeles a celda
                            const boidCellX = Math.floor(boid.position.x / CONFIG.CELL_SIZE);
                            const boidCellY = Math.floor(boid.position.y / CONFIG.CELL_SIZE);
                            
                            console.log(`Boid en celda (${boidCellX}, ${boidCellY}), pathIndex: ${boid.pathIndex}, posición pixel: (${boid.position.x.toFixed(1)}, ${boid.position.y.toFixed(1)})`);
                            
                            // Usar la posición actual en píxeles si el boid no tiene path o si su posición actual es más avanzada
                            if (boid.path && boid.path.length > 0) {
                                if (boid.pathIndex > maxPathProgress) {
                                    maxPathProgress = boid.pathIndex;
                                    bestStartCell = { x: boidCellX, y: boidCellY };
                                    bestBoid = boid;
                                }
                            } else {
                                // Si no tiene path, usar su posición actual
                                if (!bestStartCell) {
                                    bestStartCell = { x: boidCellX, y: boidCellY };
                                    bestBoid = boid;
                                }
                            }
                        }
                        
                        // Si no hay boids con path, usar el primer boid activo
                        if (!bestStartCell && flockingManager.boids.length > 0) {
                            const firstActiveBoid = flockingManager.boids.find(b => b.isActive);
                            if (firstActiveBoid) {
                                bestStartCell = {
                                    x: Math.floor(firstActiveBoid.position.x / CONFIG.CELL_SIZE),
                                    y: Math.floor(firstActiveBoid.position.y / CONFIG.CELL_SIZE)
                                };
                                bestBoid = firstActiveBoid;
                            }
                        }
                        
                        console.log('Mejor celda de inicio seleccionada:', bestStartCell);
                        console.log('Objetivo final (endPos):', endPos);
                        
                        // Recalcular path desde la mejor posición
                        if (bestStartCell) {
                            console.log(`Calculando nuevo path desde (${bestStartCell.x}, ${bestStartCell.y}) hacia (${endPos.x}, ${endPos.y})`);
                            const newPath = window.findPath(
                                { x: bestStartCell.x, y: bestStartCell.y },
                                { x: endPos.x, y: endPos.y },
                                canvas,
                                CONFIG.CELL_SIZE,
                                obstacles
                            );
                            
                            if (newPath && newPath.length > 0) {
                                console.log('✅ Path encontrado! Longitud:', newPath.length);
                                console.log('Primeros 3 nodos del path:', newPath.slice(0, 3));
                                console.log('Últimos 3 nodos del path:', newPath.slice(-3));
                                console.log('Último nodo del path (debería ser endPos):', newPath[newPath.length - 1]);
                                
                                // Verificar si el último nodo es realmente el endPos
                                const lastNode = newPath[newPath.length - 1];
                                if (lastNode.x !== endPos.x || lastNode.y !== endPos.y) {
                                    console.warn('⚠️ ADVERTENCIA: El último nodo del path NO coincide con endPos!');
                                    console.warn('  Último nodo:', lastNode);
                                    console.warn('  endPos:', endPos);
                                }
                                
                                // Guardar el path anterior para comparación
                                if (bestBoid && bestBoid.path) {
                                    console.log('Path anterior tenía longitud:', bestBoid.path.length);
                                    console.log('Último nodo del path anterior:', bestBoid.path[bestBoid.path.length - 1]);
                                }
                                
                                // ACTUALIZAR PARÁMETROS DE FUERZAS antes de asignar el nuevo path
                                // Esto asegura que los valores del slider se apliquen correctamente
                                const currentFSeparacion = parseFloat(document.getElementById('fSeparacionInput').value) || 1.0;
                                const currentFAlineacion = parseFloat(document.getElementById('fAlineacionInput').value) || 1.0;
                                const currentFCohesion = parseFloat(document.getElementById('fCohesionInput').value) || 1.0;
                                
                                flockingManager.fSeparacion = currentFSeparacion;
                                flockingManager.fAlineacion = currentFAlineacion;
                                flockingManager.fCohesion = currentFCohesion;
                                
                                console.log('Parámetros de fuerzas actualizados:', currentFSeparacion, currentFAlineacion, currentFCohesion);
                                
                                flockingManager.assignPathToBoids(newPath);
                                console.log('Path asignado a todos los boids');
                                
                                // Verificar que el boid recibió el nuevo path
                                if (bestBoid) {
                                    console.log('Verificando path del boid después de asignación:');
                                    console.log('  path.length:', bestBoid.path ? bestBoid.path.length : 'null');
                                    console.log('  pathIndex reset:', bestBoid.pathIndex);
                                    if (bestBoid.path && bestBoid.path.length > 0) {
                                        console.log('  Último nodo del path del boid:', bestBoid.path[bestBoid.path.length - 1]);
                                    }
                                }
                            } else {
                                console.error('❌ No se encontró path desde', bestStartCell, 'hacia', endPos);
                            }
                        } else {
                            console.error('❌ No se pudo determinar la mejor celda de inicio');
                        }
                    } else if (isMoving || currentPath.length > 0) {
                        console.log('Vehículo individual activo, recalculando path...');
                        const vehicleCellX = Math.floor(vehiclePos.x);
                        const vehicleCellY = Math.floor(vehiclePos.y);
                        console.log(`Vehículo en celda (${vehicleCellX}, ${vehicleCellY}), objetivo: (${endPos.x}, ${endPos.y})`);
                        
                        const newPath = window.findPath(
                            { x: vehicleCellX, y: vehicleCellY },
                            { x: endPos.x, y: endPos.y },
                            canvas,
                            CONFIG.CELL_SIZE,
                            obstacles
                        );
                        if (newPath && newPath.length > 0) {
                            console.log('✅ Path individual encontrado, longitud:', newPath.length);
                            currentPath = newPath;
                            pathIndex = 0;
                        } else {
                            console.error('❌ No se encontró path para vehículo individual');
                        }
                    } else {
                        console.log('No hay agentes activos');
                    }
                    
                    console.log('=== FIN MOVIMIENTO CURSOR ROJO ===\n');
                } else {
                    console.log('⚠️ No se puede mover cursor a obstáculo en:', { x: newX, y: newY });
                }
            }
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
    
    // Event listener para el botón de benchmark
    const benchmarkBtn = document.getElementById('benchmarkBtn');
    if (benchmarkBtn) {
        benchmarkBtn.addEventListener('click', () => {
            if (typeof runBenchmark === 'function') {
                runBenchmark();
            } else {
                console.error('Función runBenchmark no encontrada');
            }
        });
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
    
    // Event listener para el selector de algoritmo del benchmark
    const benchmarkAlgorithmSelect = document.getElementById('benchmarkAlgorithmSelect');
    const benchmarkHeuristicGroup = document.getElementById('benchmarkHeuristicGroup');
    
    if (benchmarkAlgorithmSelect) {
        // Función para mostrar/ocultar el selector de heurística del benchmark
        const updateBenchmarkHeuristicVisibility = () => {
            const selectedAlgorithm = benchmarkAlgorithmSelect.value;
            if (benchmarkHeuristicGroup) {
                if (selectedAlgorithm === 'dijkstra') {
                    benchmarkHeuristicGroup.classList.add('hidden');
                } else {
                    benchmarkHeuristicGroup.classList.remove('hidden');
                }
            }
        };
        
        // Ejecutar inicialmente
        updateBenchmarkHeuristicVisibility();
        
        benchmarkAlgorithmSelect.addEventListener('change', updateBenchmarkHeuristicVisibility);
    }
    
    // Inicializar posición del vehículo
    vehiclePos = { x: startPos.x, y: startPos.y };
    
    // Inicializar gráfica vacía
    if (typeof initializeEmptyChart === 'function') {
        initializeEmptyChart();
    }
    
    // Event listener para el botón de aplicar objetivo móvil
    const generateObjectiveBtn = document.getElementById('generateObjectiveBtn');
    if (generateObjectiveBtn) {
        generateObjectiveBtn.addEventListener('click', function() {
            const objectiveTypeSelect = document.getElementById('objectiveTypeSelect');
            if (objectiveTypeSelect) {
                objectiveType = objectiveTypeSelect.value;
                console.log('Tipo de objetivo cambiado a:', objectiveType);
                
                // Si cambia a fijo, desactivar seguimiento
                if (objectiveType === 'fixed') {
                    isTrackingMouse = false;
                }
            }
        });
    }
    
    // Event listener para el botón de generar terreno
    const generateTerrainBtn = document.getElementById('generateTerrainBtn');
    if (generateTerrainBtn) {
        generateTerrainBtn.addEventListener('click', generateTerrain);
    }
    
    // Event listener para el botón de iniciar bandada
    const startFlockingBtn = document.getElementById('startFlockingBtn');
    console.log('startFlockingBtn encontrado:', startFlockingBtn);
    if (startFlockingBtn) {
        startFlockingBtn.addEventListener('click', function(e) {
            console.log('Botón clicado - Event listener funcionando');
            startFlocking();
        });
        console.log('Event listener agregado a startFlockingBtn');
    } else {
        console.error('No se encontró el botón startFlockingBtn');
    }
    
    // Iniciar loop de animación
    animationLoop();
    
    render();
}

// Función para iniciar el comportamiento de bandada
function startFlocking() {
    console.log('startFlocking llamada');
    
    // Detener cualquier bandada que esté corriendo
    if (typeof flockingManager !== 'undefined' && flockingManager.isRunning) {
        flockingManager.stop();
    }
    
    // Obtener parámetros de la interfaz
    const numVehicles = parseInt(document.getElementById('numVehiclesInput').value) || 5;
    const fSeparacion = parseFloat(document.getElementById('fSeparacionInput').value) || 1.0;
    const fAlineacion = parseFloat(document.getElementById('fAlineacionInput').value) || 1.0;
    const fCohesion = parseFloat(document.getElementById('fCohesionInput').value) || 1.0;
    
    console.log('Parámetros:', numVehicles, fSeparacion, fAlineacion, fCohesion);
    
    // Guardar parámetros para cuando se busque el path
    flockingManager.numVehicles = numVehicles;
    flockingManager.fSeparacion = fSeparacion;
    flockingManager.fAlineacion = fAlineacion;
    flockingManager.fCohesion = fCohesion;
    flockingManager.isFlockingMode = true;
    
    // Obtener la posición actual del vehículo verde
    let vehicleX, vehicleY;
    if (isMoving && currentPath.length > 0 && !visualizingSearch) {
        // Si el vehículo está moviéndose, usar su posición interpolada
        const pos = getInterpolatedVehiclePosition();
        vehicleX = pos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        vehicleY = pos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        console.log('Vehículo en movimiento, posición:', vehicleX, vehicleY);
    } else {
        // Si no está moviendo, usar la posición del punto de inicio
        vehicleX = startPos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        vehicleY = startPos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        console.log('Vehículo en inicio, posición:', vehicleX, vehicleY);
    }
    
    // Crear boids en la posición actual del vehículo verde
    flockingManager.createBoidsAtStart(numVehicles, vehicleX, vehicleY);
    
    console.log('Boids después de crear:', flockingManager.boids.length);
    console.log('isRunning después de crear:', flockingManager.isRunning);
    
    // Forzar render para mostrar los boids inmediatamente
    render();
    
    // No desactivar el botón, permitir reiniciar la bandada cambiando el número
    const startFlockingBtn = document.getElementById('startFlockingBtn');
    if (startFlockingBtn) {
        startFlockingBtn.disabled = false;
        startFlockingBtn.textContent = 'Bandada Iniciada';
    }
}

// Función para generar terreno
function generateTerrain() {
    const terrainSelect = document.getElementById('terrainSelect');
    const terrainType = terrainSelect ? terrainSelect.value : 'empty';
    
    // Limpiar estado anterior
    obstacles.clear();
    currentPath = [];
    isMoving = false;
    keepVisualization = false;
    finalOpenSet.clear();
    finalClosedSet.clear();
    
    // Calcular dimensiones de la grilla
    const rows = Math.ceil(canvas.height / CONFIG.CELL_SIZE);
    const cols = Math.ceil(canvas.width / CONFIG.CELL_SIZE);
    
    if (terrainType === 'random') {
        // 30% de obstáculos aleatorios
        generateRandomObstacles(rows, cols, 0.3);
    } else if (terrainType === 'random50') {
        // 50% de obstáculos aleatorios
        generateRandomObstacles(rows, cols, 0.5);
    } else if (terrainType === 'maze') {
        // Laberinto complejo
        generateComplexMaze(rows, cols);
    }
    // Si el terreno es 'empty', los obstáculos ya están limpios
    
    // Renderizar
    render();
}

// Función auxiliar para generar obstáculos aleatorios
function generateRandomObstacles(rows, cols, percentage) {
    const totalCells = rows * cols;
    const obstacleCount = Math.floor(totalCells * percentage);
    
    // Generar obstáculos aleatorios
    const availableCells = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Evitar inicio y destino
            if ((x === startPos.x && y === startPos.y) || 
                (x === endPos.x && y === endPos.y)) {
                continue;
            }
            availableCells.push(`${x},${y}`);
        }
    }
    
    // Mezclar y tomar los primeros obstacleCount
    for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }
    
    for (let i = 0; i < obstacleCount && i < availableCells.length; i++) {
        obstacles.add(availableCells[i]);
    }
}

// Función para generar un laberinto complejo
function generateComplexMaze(rows, cols) {
    // Crear un laberinto con múltiples caminos estrechos y patrones complicados
    
    // 1. Crear paredes verticales y horizontales estratégicas
    // Columnas cada 4 celdas verticalmente
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x += 4) {
            for (let offset = 0; offset < 3 && x + offset < cols; offset++) {
                const cellKey = `${x + offset},${y}`;
                if ((x + offset !== startPos.x || y !== startPos.y) && 
                    (x + offset !== endPos.x || y !== endPos.y)) {
                    obstacles.add(cellKey);
                }
            }
            // Dejar un hueco cada cierto espacio
            if (Math.floor(y / 2) % 2 === 0 && Math.floor(x / 4) % 3 !== 0) {
                obstacles.delete(`${x},${y}`);
                obstacles.delete(`${x + 1},${y}`);
            }
        }
    }
    
    // 2. Filas cada 3-4 celdas horizontalmente
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y += 4) {
            for (let offset = 0; offset < 2 && y + offset < rows; offset++) {
                const cellKey = `${x},${y + offset}`;
                if ((x !== startPos.x || y + offset !== startPos.y) && 
                    (x !== endPos.x || y + offset !== endPos.y)) {
                    obstacles.add(cellKey);
                }
            }
            // Dejar un hueco cada cierto espacio
            if (Math.floor(x / 3) % 3 !== 0 && Math.floor(y / 4) % 2 !== 0) {
                obstacles.delete(`${x},${y}`);
                obstacles.delete(`${x},${y + 1}`);
            }
        }
    }
    
    // 3. Agregar obstáculos en diagonal para crear rutas en zigzag
    for (let y = 2; y < rows; y += 6) {
        for (let x = 2; x < cols; x += 5) {
            const cellKey = `${x},${y}`;
            if ((x !== startPos.x || y !== startPos.y) && 
                (x !== endPos.x || y !== endPos.y)) {
                obstacles.add(cellKey);
            }
        }
    }
    
    // 4. Crear pasillos estrechos y sinuosos
    for (let y = 5; y < rows - 5; y++) {
        for (let x = 5; x < cols - 5; x++) {
            // Crear un patrón de damero parcialmente obstruido
            if ((x + y) % 8 === 0 || (x * y) % 11 === 0) {
                const cellKey = `${x},${y}`;
                if ((x !== startPos.x || y !== startPos.y) && 
                    (x !== endPos.x || y !== endPos.y)) {
                    obstacles.add(cellKey);
                }
            }
        }
    }
    
    // 5. Crear áreas parcialmente bloqueadas cerca de inicio y destino
    const startRadius = 8;
    const endRadius = 8;
    
    for (let y = Math.max(0, startPos.y - startRadius); y < Math.min(rows, startPos.y + startRadius); y++) {
        for (let x = Math.max(0, startPos.x - startRadius); x < Math.min(cols, startPos.x + startRadius); x++) {
            const dist = Math.abs(x - startPos.x) + Math.abs(y - startPos.y);
            if (dist > 2 && dist < startRadius && Math.random() > 0.3) {
                const cellKey = `${x},${y}`;
                if ((x !== startPos.x || y !== startPos.y)) {
                    obstacles.add(cellKey);
                }
            }
        }
    }
    
    for (let y = Math.max(0, endPos.y - endRadius); y < Math.min(rows, endPos.y + endRadius); y++) {
        for (let x = Math.max(0, endPos.x - endRadius); x < Math.min(cols, endPos.x + endRadius); x++) {
            const dist = Math.abs(x - endPos.x) + Math.abs(y - endPos.y);
            if (dist > 2 && dist < endRadius && Math.random() > 0.3) {
                const cellKey = `${x},${y}`;
                if ((x !== endPos.x || y !== endPos.y)) {
                    obstacles.add(cellKey);
                }
            }
        }
    }
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
    
    // Actualizar render para dibujar boids
    render();
    
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
    
    // Si estamos en modo objetivo móvil, activar seguimiento del mouse
    if (objectiveType === 'moving') {
        // Solo activar si no es un obstáculo
        if (!obstacles.has(cellKey)) {
            isTrackingMouse = true;
            mouseCell = cell;
            endPos = cell;
            render();
        }
        return;
    }
    
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
    
    // Si estamos en modo objetivo móvil, desactivar el seguimiento al soltar
    if (objectiveType === 'moving' && isTrackingMouse) {
        isTrackingMouse = false;
    }
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
    
    // Si el objetivo es móvil y estamos en modo objetivo móvil, actualizar la posición del objetivo
    if (objectiveType === 'moving' && isTrackingMouse) {
        console.log('=== MOUSE MOVE - Objetivo móvil ===');
        console.log('Celda detectada:', cell);
        console.log('ObjectiveType:', objectiveType);
        console.log('isTrackingMouse:', isTrackingMouse);
        console.log('EndPos ANTES:', JSON.stringify(endPos));
        
        // No permitir que el objetivo sea un obstáculo
        if (!obstacles.has(cellKey)) {
            // Comprobar si la celda es diferente del endPos actual
            if (endPos.x !== cell.x || endPos.y !== cell.y) {
                mouseCell = cell;
                endPos = { x: cell.x, y: cell.y }; // Asegurar que es un nuevo objeto
                console.log('EndPos DESPUÉS:', JSON.stringify(endPos));
                console.log('Canvas endPos debería actualizarse a:', cell);
                render();
                
                // Si hay un agente activo (flocking o vehículo), recalcular el path
                if (typeof flockingManager !== 'undefined' && flockingManager.isFlockingMode && flockingManager.boids.length > 0 && flockingManager.isRunning) {
                    console.log('Bandada activa, recalculando path...');
                    
                    // Encontrar el boid más adelante en el path actual para usar su posición como punto de partida
                    let bestStartCell = null;
                    let maxPathProgress = -1;
                    
                    for (let boid of flockingManager.boids) {
                        if (boid.pathIndex > maxPathProgress) {
                            maxPathProgress = boid.pathIndex;
                            // Convertir posición en píxeles a celda
                            const boidCellX = Math.floor(boid.position.x / CONFIG.CELL_SIZE);
                            const boidCellY = Math.floor(boid.position.y / CONFIG.CELL_SIZE);
                            bestStartCell = { x: boidCellX, y: boidCellY };
                        }
                    }
                    
                    // Si no hay boids con path, usar el primer boid
                    if (!bestStartCell && flockingManager.boids.length > 0) {
                        const firstBoid = flockingManager.boids[0];
                        bestStartCell = {
                            x: Math.floor(firstBoid.position.x / CONFIG.CELL_SIZE),
                            y: Math.floor(firstBoid.position.y / CONFIG.CELL_SIZE)
                        };
                    }
                    
                    console.log('Best start cell:', bestStartCell);
                    console.log('End pos:', endPos);
                    
                    // Recalcular path desde la mejor posición
                    if (bestStartCell) {
                        console.log('Recalculando path desde', bestStartCell, 'hacia', endPos);
                        const newPath = window.findPath(
                            { x: bestStartCell.x, y: bestStartCell.y },
                            { x: endPos.x, y: endPos.y },
                            canvas,
                            CONFIG.CELL_SIZE,
                            obstacles
                        );
                        if (newPath && newPath.length > 0) {
                            console.log('Path recalculado, asignando a boids. Nuevo path length:', newPath.length);
                            
                            // ACTUALIZAR PARÁMETROS DE FUERZAS
                            const currentFSeparacion = parseFloat(document.getElementById('fSeparacionInput').value) || 1.0;
                            const currentFAlineacion = parseFloat(document.getElementById('fAlineacionInput').value) || 1.0;
                            const currentFCohesion = parseFloat(document.getElementById('fCohesionInput').value) || 1.0;
                            
                            flockingManager.fSeparacion = currentFSeparacion;
                            flockingManager.fAlineacion = currentFAlineacion;
                            flockingManager.fCohesion = currentFCohesion;
                            
                            flockingManager.assignPathToBoids(newPath);
                        } else {
                            console.log('No se encontró path desde', bestStartCell, 'hacia', endPos);
                        }
                    }
                } else if (isMoving || currentPath.length > 0) {
                    console.log('Vehículo individual activo, recalculando path...');
                    // Recalcular path para el vehículo individual desde su posición actual
                    const vehicleCellX = Math.floor(vehiclePos.x);
                    const vehicleCellY = Math.floor(vehiclePos.y);
                    const newPath = window.findPath(
                        { x: vehicleCellX, y: vehicleCellY },
                        { x: endPos.x, y: endPos.y },
                        canvas,
                        CONFIG.CELL_SIZE,
                        obstacles
                    );
                    if (newPath && newPath.length > 0) {
                        currentPath = newPath;
                        pathIndex = 0;
                        console.log('Path individual recalculado');
                    }
                }
            }
        } else {
            console.log('Celda es un obstáculo, ignorando actualización');
        }
        console.log('=== FIN MOUSE MOVE (objetivo móvil) ===');
        return;
    }
    
    // Debug: Verificar por qué no entra en el if
    if (objectiveType === 'moving' && !isTrackingMouse) {
        console.log('DEBUG: objectiveType es moving pero isTrackingMouse es false');
    } else if (objectiveType === 'fixed') {
        // Silencioso
    } else {
        console.log('DEBUG: objectiveType:', objectiveType, 'isTrackingMouse:', isTrackingMouse);
    }
    
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
    
    // Detener bandada anterior si existe (solo si no es objetivo móvil)
    if (objectiveType === 'fixed' && typeof flockingManager !== 'undefined' && flockingManager.isRunning) {
        flockingManager.stop();
    }
    
    // Si es objetivo móvil y ya hay una bandada activa, no reiniciar
    if (objectiveType === 'moving' && typeof flockingManager !== 'undefined' && flockingManager.isFlockingMode && flockingManager.isRunning) {
        console.log('Objetivo móvil: bandada ya está corriendo, actualizando path');
        // Solo actualizar el path para que siga el objetivo
        const newPath = findPath(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles);
        if (newPath && newPath.length > 0) {
            flockingManager.assignPathToBoids(newPath);
        }
        render();
        return;
    }
    
    // Usar el algoritmo A* simple (sin visualización paso a paso)
    currentPath = findPath(startPos, endPos, canvas, CONFIG.CELL_SIZE, obstacles);
    
    // Si se encontró un path, iniciar el movimiento según el modo
    if (currentPath.length > 0) {
        // Verificar si hay modo bandada activo
        if (typeof flockingManager !== 'undefined' && flockingManager.isFlockingMode) {
            // Asignar el path a los boids existentes y empezar animación
            if (flockingManager.boids.length > 0) {
                flockingManager.assignPathToBoids(currentPath);
                flockingManager.isRunning = true;
                flockingManager.animate();
            } else {
                // Si no hay boids, crearlos con el path
                flockingManager.start(
                    flockingManager.numVehicles,
                    flockingManager.fSeparacion,
                    flockingManager.fAlineacion,
                    flockingManager.fCohesion,
                    currentPath
                );
            }
            // No iniciar movimiento individual
            isMoving = false;
        } else {
            // Iniciar movimiento individual
            vehiclePos = { x: startPos.x, y: startPos.y };
            pathIndex = 0;
            isMoving = true;
            frameCount = 0;
        }
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
    
    // 6. Dibujar el vehículo individual en su posición actual con rotación
    const hasBoids = typeof flockingManager !== 'undefined' && flockingManager.boids.length > 0;
    
    if (!hasBoids) {
        // Solo mostrar vehículo individual si no hay boids
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
    
    // 7. Dibujar boids si existen (tanto si están corriendo como si están esperando en posición inicial)
    if (typeof flockingManager !== 'undefined' && flockingManager.boids.length > 0) {
        flockingManager.draw(ctx);
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


