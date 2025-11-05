// ========== MÓDULO DE BENCHMARK PARA PATHFINDING ==========

// Función auxiliar para generar obstáculos aleatorios para un tamaño específico de cuadrícula
function generateRandomObstaclesForSize(rows, cols, percentage, startPos, endPos) {
    const totalCells = rows * cols;
    const obstacleCount = Math.floor(totalCells * percentage);
    
    // Generar lista de todas las celdas disponibles
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
    
    // Mezclar aleatoriamente usando Fisher-Yates shuffle
    for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }
    
    // Tomar los primeros obstacleCount elementos
    const obstacles = new Set();
    for (let i = 0; i < obstacleCount && i < availableCells.length; i++) {
        obstacles.add(availableCells[i]);
    }
    
    return obstacles;
}

// Función para ejecutar un algoritmo en una cuadrícula específica
function runSingleAlgorithmBenchmark(algorithmName, gridSize, start, end, obstacles, canvas, heuristic = 'euclidean') {
    const startTime = performance.now();
    
    // Guardar heurística actual y configurar la nueva
    const originalHeuristic = currentHeuristic;
    if (typeof setHeuristic === 'function') {
        setHeuristic(heuristic);
    }
    
    // Funciones auxiliares para contar nodos explorados
    function countExploredNodes(startPos, endPos, obstacles, algorithm, canvasSize, heuristic) {
        const openSet = new Map();
        const closedSet = new Set();
        
        const startNode = new Node(startPos.x, startPos.y, 0, 0);
        
        if (algorithm === 'astar') {
            startNode.h = calculateHeuristic(startPos, endPos);
            startNode.f = startNode.h;
        } else if (algorithm === 'bfs') {
            startNode.h = calculateHeuristic(startPos, endPos);
            startNode.f = startNode.h;
        } else {
            startNode.f = 0;
        }
        
        openSet.set(startNode.getKey(), startNode);
        
        while (openSet.size > 0) {
            let currentNode = null;
            let lowestF = Infinity;
            
            for (const node of openSet.values()) {
                if (node.f < lowestF) {
                    lowestF = node.f;
                    currentNode = node;
                }
            }
            
            if (currentNode.x === endPos.x && currentNode.y === endPos.y) {
                return closedSet.size;
            }
            
            openSet.delete(currentNode.getKey());
            closedSet.add(currentNode.getKey());
            
            const neighbors = getNeighbors(currentNode, canvasSize, CONFIG.CELL_SIZE, obstacles);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) continue;
                
                let g, h, f;
                
                if (algorithm === 'astar') {
                    g = currentNode.g + neighbor.cost;
                    h = calculateHeuristic(neighbor, endPos);
                    f = g + h;
                } else if (algorithm === 'dijkstra') {
                    g = currentNode.g + neighbor.cost;
                    f = g;
                    h = 0;
                } else { // bfs
                    g = 0;
                    h = calculateHeuristic(neighbor, endPos);
                    f = h;
                }
                
                if (openSet.has(neighborKey)) {
                    const existingNode = openSet.get(neighborKey);
                    if (g < existingNode.g || (algorithm === 'bfs' && h < existingNode.h)) {
                        existingNode.g = g;
                        existingNode.h = h;
                        existingNode.f = f;
                        existingNode.parent = currentNode;
                    }
                } else {
                    const newNode = new Node(neighbor.x, neighbor.y, g, h, f, currentNode);
                    openSet.set(neighborKey, newNode);
                }
            }
        }
        
        return closedSet.size;
    }
    
    // Ejecutar pathfinding real para obtener tiempo
    let path = [];
    if (algorithmName === 'astar') {
        path = astarPath(start, end, canvas, CONFIG.CELL_SIZE, obstacles);
    } else if (algorithmName === 'dijkstra') {
        path = dijkstraPath(start, end, canvas, CONFIG.CELL_SIZE, obstacles);
    } else if (algorithmName === 'bfs') {
        path = bestFirstSearchPath(start, end, canvas, CONFIG.CELL_SIZE, obstacles);
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Calcular nodos explorados
    const nodesExplored = countExploredNodes(start, end, obstacles, algorithmName, canvas, heuristic);
    
    // Restaurar heurística original
    if (typeof setHeuristic === 'function') {
        setHeuristic(originalHeuristic);
    }
    
    return {
        path: path,
        nodesExplored: nodesExplored,
        time: executionTime,
        pathLength: path.length
    };
}

// Almacenar todas las series del gráfico
let allSeries = [];

// Función principal de benchmark
async function runBenchmark() {
    console.log('Iniciando benchmark con escenario actual...');
    
    // Obtener configuración del usuario desde los selectores del benchmark
    const benchmarkAlgorithmSelect = document.getElementById('benchmarkAlgorithmSelect');
    const benchmarkHeuristicSelect = document.getElementById('benchmarkHeuristicSelect');
    const chartNameInput = document.getElementById('chartNameInput');
    const gridSizeFromInput = document.getElementById('gridSizeFromInput');
    const gridSizeToInput = document.getElementById('gridSizeToInput');
    const chartColorInput = document.getElementById('chartColorInput');
    
    if (!benchmarkAlgorithmSelect || !chartNameInput || !gridSizeFromInput || !gridSizeToInput) {
        console.error('No se encontraron los elementos necesarios');
        return;
    }
    
    const selectedAlgorithm = benchmarkAlgorithmSelect.value;
    const selectedHeuristic = benchmarkHeuristicSelect ? benchmarkHeuristicSelect.value : 'euclidean';
    const chartName = chartNameInput.value.trim();
    const chartColor = chartColorInput ? chartColorInput.value : '#667eea';
    const gridSizeFrom = parseInt(gridSizeFromInput.value);
    const gridSizeTo = parseInt(gridSizeToInput.value);
    
    if (!chartName) {
        alert('Por favor, ingresa un nombre para el gráfico');
        return;
    }
    
    // Validar rangos
    if (isNaN(gridSizeFrom) || isNaN(gridSizeTo) || gridSizeFrom < 5 || gridSizeTo < 5) {
        alert('Por favor, ingresa valores válidos para los tamaños (mínimo 5)');
        return;
    }
    
    if (gridSizeFrom > gridSizeTo) {
        alert('El tamaño inicial debe ser menor o igual al tamaño final');
        return;
    }
    
    // Generar array de tamaños de cuadrícula (cada 5 unidades por defecto)
    const gridSizes = [];
    for (let size = gridSizeFrom; size <= gridSizeTo; size += 5) {
        gridSizes.push(size);
    }
    
    console.log(`Algoritmo seleccionado: ${selectedAlgorithm}`);
    console.log(`Heurística seleccionada: ${selectedHeuristic}`);
    console.log(`Nombre del gráfico: ${chartName}`);
    console.log(`Tamaños de cuadrícula: ${gridSizes}`);
    
    // Mostrar indicador de carga
    const chartDiv = document.getElementById('performanceChart');
    
    if (!chartDiv) {
        console.error('No se encontró el contenedor de gráfica');
        return;
    }
    
    chartDiv.innerHTML = '<p style="color: #000000; text-align: center; font-family: Montserrat, sans-serif; font-size: 16px;">Ejecutando benchmark...</p>';
    
    // Obtener el escenario actual (obstáculos del usuario)
    const currentStartPos = startPos;
    const currentEndPos = endPos;
    const currentObstacles = obstacles;
    
    // Detectar el tipo de terreno seleccionado
    const terrainSelect = document.getElementById('terrainSelect');
    const terrainType = terrainSelect ? terrainSelect.value : 'empty';
    
    // Calcular el tamaño del canvas actual en celdas
    const currentCanvasWidth = Math.floor(canvas.width / CONFIG.CELL_SIZE);
    const currentCanvasHeight = Math.floor(canvas.height / CONFIG.CELL_SIZE);
    
    const results = {
        gridSizes: [],
        nodes: [],
        time: []
    };
    
    // Ejecutar benchmark para cada tamaño de cuadrícula
    for (const size of gridSizes) {
        console.log(`Probando con cuadrícula de ${size}x${size}...`);
        
        // Escalar inicio y fin proporcionalmente
        const scaleX = size / currentCanvasWidth;
        const scaleY = size / currentCanvasHeight;
        
        const scaledStart = {
            x: Math.floor(currentStartPos.x * scaleX),
            y: Math.floor(currentStartPos.y * scaleY)
        };
        
        const scaledEnd = {
            x: Math.floor(currentEndPos.x * scaleX),
            y: Math.floor(currentEndPos.y * scaleY)
        };
        
        // Generar obstáculos según el tipo de terreno
        // IMPORTANTE: Para terrenos con porcentajes de obstáculos (30% o 50%),
        // se generan obstáculos aleatorios frescos para cada tamaño de cuadrícula
        // para mantener el porcentaje correcto de densidad de obstáculos.
        let scaledObstacles = new Set();
        
        if (terrainType === 'random') {
            // Generar 30% de obstáculos aleatorios para este tamaño específico
            scaledObstacles = generateRandomObstaclesForSize(size, size, 0.3, scaledStart, scaledEnd);
        } else if (terrainType === 'random50') {
            // Generar 50% de obstáculos aleatorios para este tamaño específico
            scaledObstacles = generateRandomObstaclesForSize(size, size, 0.5, scaledStart, scaledEnd);
        } else {
            // Para otros tipos (empty, maze), escalar obstáculos existentes
            for (const obstacleKey of currentObstacles) {
                const [x, y] = obstacleKey.split(',').map(Number);
                const scaledX = Math.floor(x * scaleX);
                const scaledY = Math.floor(y * scaleY);
                if (scaledX < size && scaledY < size) {
                    scaledObstacles.add(`${scaledX},${scaledY}`);
                }
            }
        }
        
        // Crear canvas temporal
        const tempCanvas = {
            width: size * CONFIG.CELL_SIZE,
            height: size * CONFIG.CELL_SIZE
        };
        
        results.gridSizes.push(size);
        
        // Ejecutar algoritmo
        let result;
        if (selectedAlgorithm === 'astar') {
            result = runSingleAlgorithmBenchmark('astar', size, scaledStart, scaledEnd, scaledObstacles, tempCanvas, selectedHeuristic);
        } else if (selectedAlgorithm === 'dijkstra') {
            result = runSingleAlgorithmBenchmark('dijkstra', size, scaledStart, scaledEnd, scaledObstacles, tempCanvas, selectedHeuristic);
        } else if (selectedAlgorithm === 'bfs') {
            result = runSingleAlgorithmBenchmark('bfs', size, scaledStart, scaledEnd, scaledObstacles, tempCanvas, selectedHeuristic);
        } else {
            alert('Algoritmo no reconocido');
            return;
        }
        
        results.nodes.push(result.nodesExplored);
        results.time.push(result.time);
        
        // Pequeña pausa para no sobrecargar el navegador
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('Benchmark completado:', results);
    
    // Agregar nueva serie a la gráfica
    addSeriesToChart(chartName, selectedAlgorithm, results, chartColor);
    
    // Iniciar visualización de los tamaños representativos
    await visualizeBenchmarkResults(selectedAlgorithm, selectedHeuristic, gridSizes, currentStartPos, currentEndPos, currentObstacles, currentCanvasWidth, currentCanvasHeight, terrainType);
}

// Función para visualizar resultados del benchmark
async function visualizeBenchmarkResults(algorithm, heuristic, gridSizes, currentStartPos, currentEndPos, currentObstacles, currentCanvasWidth, currentCanvasHeight, terrainType) {
    // Seleccionar 3 tamaños representativos
    let sizesToVisualize = [];
    if (gridSizes.length <= 3) {
        sizesToVisualize = gridSizes;
    } else {
        // Primero
        sizesToVisualize.push(gridSizes[0]);
        // Medio
        sizesToVisualize.push(gridSizes[Math.floor(gridSizes.length / 2)]);
        // Último
        sizesToVisualize.push(gridSizes[gridSizes.length - 1]);
    }
    
    // Crear contenedor para visualizaciones
    createVisualizationContainer(sizesToVisualize.length);
    
    // Almacenar todos los datos para visualizar
    let allVisualizations = [];
    
    // Preparar datos para cada tamaño (sin visualizar aún)
    for (let i = 0; i < sizesToVisualize.length; i++) {
        const size = sizesToVisualize[i];
        
        // Escalar inicio y fin proporcionalmente
        const scaleX = size / currentCanvasWidth;
        const scaleY = size / currentCanvasHeight;
        
        const scaledStart = {
            x: Math.floor(currentStartPos.x * scaleX),
            y: Math.floor(currentStartPos.y * scaleY)
        };
        
        const scaledEnd = {
            x: Math.floor(currentEndPos.x * scaleX),
            y: Math.floor(currentEndPos.y * scaleY)
        };
        
        // Generar obstáculos según el tipo de terreno
        let scaledObstacles = new Set();
        
        if (terrainType === 'random') {
            // Generar 30% de obstáculos aleatorios para este tamaño específico
            scaledObstacles = generateRandomObstaclesForSize(size, size, 0.3, scaledStart, scaledEnd);
        } else if (terrainType === 'random50') {
            // Generar 50% de obstáculos aleatorios para este tamaño específico
            scaledObstacles = generateRandomObstaclesForSize(size, size, 0.5, scaledStart, scaledEnd);
        } else {
            // Para otros tipos (empty, maze), escalar obstáculos existentes
            for (const obstacleKey of currentObstacles) {
                const [x, y] = obstacleKey.split(',').map(Number);
                const scaledX = Math.floor(x * scaleX);
                const scaledY = Math.floor(y * scaleY);
                if (scaledX < size && scaledY < size) {
                    scaledObstacles.add(`${scaledX},${scaledY}`);
                }
            }
        }
        
        allVisualizations.push({
            size: size,
            canvasId: `benchmarkCanvas${i}`,
            scaledStart: scaledStart,
            scaledEnd: scaledEnd,
            scaledObstacles: scaledObstacles,
            algorithm: algorithm,
            heuristic: heuristic,
            canvas: null, // Se creará cuando se visualice
            isVisualized: false
        });
    }
    
    // Configurar navegación del carrusel
    setupCarouselNavigation(allVisualizations);
    
    // Mostrar la primera visualización (comenzará a visualizar)
    if (allVisualizations.length > 0) {
        await showVisualization(0, allVisualizations);
    }
}

// Función para configurar la navegación del carrusel
function setupCarouselNavigation(allVisualizations) {
    const prevBtn = document.getElementById('prevVisualizationBtn');
    const nextBtn = document.getElementById('nextVisualizationBtn');
    let currentIndex = 0;
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentIndex > 0) {
                currentIndex--;
                await showVisualization(currentIndex, allVisualizations);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (currentIndex < allVisualizations.length - 1) {
                currentIndex++;
                await showVisualization(currentIndex, allVisualizations);
            }
        });
    }
}

// Función para mostrar una visualización específica
async function showVisualization(index, allVisualizations) {
    const canvasWrapper = document.getElementById('benchmarkCanvasWrapper');
    const progress = document.getElementById('benchmarkProgress');
    
    if (!canvasWrapper || index < 0 || index >= allVisualizations.length) {
        return;
    }
    
    // Limpiar wrapper
    canvasWrapper.innerHTML = '';
    
    const viz = allVisualizations[index];
    
    // Mostrar mensaje de carga si no está visualizado
    if (!viz.isVisualized) {
        const loadingMsg = document.createElement('p');
        loadingMsg.style.cssText = 'color: white; font-family: Montserrat, sans-serif; font-size: 1.2rem;';
        loadingMsg.textContent = `Visualizando ${viz.size}x${viz.size}...`;
        canvasWrapper.appendChild(loadingMsg);
    }
    
    // Crear wrapper para el canvas
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
    
    // Agregar etiqueta
    const label = document.createElement('p');
    label.style.cssText = 'color: white; font-family: Montserrat, sans-serif; margin-bottom: 10px; font-size: 1.2rem; font-weight: 600;';
    label.textContent = `${viz.size}x${viz.size}`;
    wrapper.appendChild(label);
    
    // Si no está visualizado, ejecutar la visualización ahora
    if (!viz.isVisualized) {
        const result = await visualizeSearch(viz.canvasId, viz.size, viz.scaledStart, viz.scaledEnd, viz.scaledObstacles, viz.algorithm, viz.heuristic, index);
        viz.canvas = result.canvas;
        viz.path = result.path; // Guardar el path
        viz.closedSet = result.closedSet; // Guardar los nodos explorados
        viz.openSetKeys = result.openSetKeys; // Guardar las claves de los nodos frontera
        viz.animationStates = result.animationStates; // Guardar los estados de animación
        viz.isVisualized = true;
    }
    
    // Agregar canvas
    wrapper.appendChild(viz.canvas);
    
    // Limpiar y agregar el wrapper
    canvasWrapper.innerHTML = '';
    canvasWrapper.appendChild(wrapper);
    
    // Agregar botón de play
    const playBtn = document.getElementById('playBenchmarkBtn');
    if (playBtn && viz.path && viz.path.length > 0) {
        playBtn.onclick = () => animateVehicle(viz, index);
    } else if (playBtn) {
        playBtn.onclick = null;
    }
    
    // Actualizar progreso
    if (progress) {
        progress.textContent = `${index + 1} de ${allVisualizations.length}`;
    }
}

// Función para animar el vehículo sobre el path
async function animateVehicle(viz, index) {
    const canvasWrapper = document.getElementById('benchmarkCanvasWrapper');
    const playBtn = document.getElementById('playBenchmarkBtn');
    
    if (!canvasWrapper || !viz.path || viz.path.length === 0) return;
    
    // Deshabilitar botón durante la animación
    if (playBtn) {
        playBtn.disabled = true;
        playBtn.innerHTML = '⏸';
    }
    
    // Obtener el canvas existente
    const existingCanvas = viz.canvas;
    const ctx = existingCanvas.getContext('2d');
    const CELL_SIZE = CONFIG.CELL_SIZE;
    
    // Mostrar el estado final completo antes de animar
    ctx.clearRect(0, 0, viz.size * CELL_SIZE, viz.size * CELL_SIZE);
    
    // Dibujar grid
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let j = 0; j <= viz.size; j++) {
        ctx.beginPath();
        ctx.moveTo(j * CELL_SIZE, 0);
        ctx.lineTo(j * CELL_SIZE, viz.size * CELL_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, j * CELL_SIZE);
        ctx.lineTo(viz.size * CELL_SIZE, j * CELL_SIZE);
        ctx.stroke();
    }
    
    // Dibujar obstáculos
    ctx.fillStyle = CONFIG.WALL_COLOR;
    for (const obsKey of viz.scaledObstacles) {
        const [x, y] = obsKey.split(',').map(Number);
        ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
    
    // Dibujar nodos explorados
    if (viz.closedSet) {
        ctx.fillStyle = CONFIG.CLOSED_SET_COLOR;
        for (const cellKey of viz.closedSet) {
            const [x, y] = cellKey.split(',').map(Number);
            ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar nodos frontera (open set)
    if (viz.openSetKeys) {
        ctx.fillStyle = CONFIG.OPEN_SET_COLOR;
        for (const cellKey of viz.openSetKeys) {
            const [x, y] = cellKey.split(',').map(Number);
            ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar path completo
    if (viz.path.length > 0) {
        ctx.fillStyle = CONFIG.PATH_COLOR;
        for (const pathNode of viz.path) {
            ctx.fillRect(pathNode.x * CELL_SIZE + 1, pathNode.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar inicio
    ctx.fillStyle = CONFIG.START_COLOR;
    ctx.fillRect(viz.scaledStart.x * CELL_SIZE + 1, viz.scaledStart.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    
    // Dibujar destino
    ctx.fillStyle = CONFIG.END_COLOR;
    ctx.fillRect(viz.scaledEnd.x * CELL_SIZE + 1, viz.scaledEnd.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    
    // Pausa antes de comenzar la animación
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Fase 1: Mostrar exploración de nodos progresivamente usando estados guardados
    if (viz.animationStates && viz.animationStates.length > 0) {
        for (const state of viz.animationStates) {
            ctx.clearRect(0, 0, viz.size * CELL_SIZE, viz.size * CELL_SIZE);
            
            // Dibujar grid
            ctx.strokeStyle = CONFIG.GRID_COLOR;
            ctx.lineWidth = 0.5;
            for (let j = 0; j <= viz.size; j++) {
                ctx.beginPath();
                ctx.moveTo(j * CELL_SIZE, 0);
                ctx.lineTo(j * CELL_SIZE, viz.size * CELL_SIZE);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, j * CELL_SIZE);
                ctx.lineTo(viz.size * CELL_SIZE, j * CELL_SIZE);
                ctx.stroke();
            }
            
            // Dibujar obstáculos
            ctx.fillStyle = CONFIG.WALL_COLOR;
            for (const obsKey of viz.scaledObstacles) {
                const [x, y] = obsKey.split(',').map(Number);
                ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
            
            // Dibujar nodos explorados (closed set)
            ctx.fillStyle = CONFIG.CLOSED_SET_COLOR;
            if (state.closedSet && state.closedSet.length > 0) {
                for (const cellKey of state.closedSet) {
                    const [x, y] = cellKey.split(',').map(Number);
                    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                }
            }
            
            // Dibujar nodos frontera (open set)
            ctx.fillStyle = CONFIG.OPEN_SET_COLOR;
            if (state.openSet && state.openSet.length > 0) {
                for (const cellKey of state.openSet) {
                    const [x, y] = cellKey.split(',').map(Number);
                    ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                }
            }
            
            // Dibujar inicio
            ctx.fillStyle = CONFIG.START_COLOR;
            ctx.fillRect(viz.scaledStart.x * CELL_SIZE + 1, viz.scaledStart.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            
            // Dibujar destino
            ctx.fillStyle = CONFIG.END_COLOR;
            ctx.fillRect(viz.scaledEnd.x * CELL_SIZE + 1, viz.scaledEnd.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Fase 2: Animar el vehículo recorriendo el path
    for (let i = 0; i < viz.path.length; i++) {
        const node = viz.path[i];
        
        // Dibujar todo excepto el vehículo
        ctx.clearRect(0, 0, viz.size * CELL_SIZE, viz.size * CELL_SIZE);
        
        // Dibujar grid
        ctx.strokeStyle = CONFIG.GRID_COLOR;
        ctx.lineWidth = 0.5;
        for (let j = 0; j <= viz.size; j++) {
            ctx.beginPath();
            ctx.moveTo(j * CELL_SIZE, 0);
            ctx.lineTo(j * CELL_SIZE, viz.size * CELL_SIZE);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, j * CELL_SIZE);
            ctx.lineTo(viz.size * CELL_SIZE, j * CELL_SIZE);
            ctx.stroke();
        }
        
        // Dibujar obstáculos
        ctx.fillStyle = CONFIG.WALL_COLOR;
        for (const obsKey of viz.scaledObstacles) {
            const [x, y] = obsKey.split(',').map(Number);
            ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
        
        // Dibujar nodos explorados (cerrados)
        if (viz.closedSet) {
            ctx.fillStyle = CONFIG.CLOSED_SET_COLOR;
            for (const cellKey of viz.closedSet) {
                const [x, y] = cellKey.split(',').map(Number);
                ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
        }
        
        // Dibujar path (hasta la posición actual)
        if (viz.path.length > 0) {
            ctx.fillStyle = CONFIG.PATH_COLOR;
            for (let j = 0; j <= i; j++) {
                const pathNode = viz.path[j];
                ctx.fillRect(pathNode.x * CELL_SIZE + 1, pathNode.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
        }
        
        // Dibujar inicio
        ctx.fillStyle = CONFIG.START_COLOR;
        ctx.fillRect(viz.scaledStart.x * CELL_SIZE + 1, viz.scaledStart.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        
        // Dibujar destino
        ctx.fillStyle = CONFIG.END_COLOR;
        ctx.fillRect(viz.scaledEnd.x * CELL_SIZE + 1, viz.scaledEnd.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        
        // Dibujar vehículo
        drawVehicleOnGrid(ctx, node.x, node.y, CELL_SIZE);
        
        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 80));
    }
    
    // Mostrar estado final con path amarillo y todas las celdas coloreadas
    ctx.clearRect(0, 0, viz.size * CELL_SIZE, viz.size * CELL_SIZE);
    
    // Dibujar grid
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let j = 0; j <= viz.size; j++) {
        ctx.beginPath();
        ctx.moveTo(j * CELL_SIZE, 0);
        ctx.lineTo(j * CELL_SIZE, viz.size * CELL_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, j * CELL_SIZE);
        ctx.lineTo(viz.size * CELL_SIZE, j * CELL_SIZE);
        ctx.stroke();
    }
    
    // Dibujar obstáculos
    ctx.fillStyle = CONFIG.WALL_COLOR;
    for (const obsKey of viz.scaledObstacles) {
        const [x, y] = obsKey.split(',').map(Number);
        ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
    
    // Dibujar nodos explorados (cerrados)
    if (viz.closedSet) {
        ctx.fillStyle = CONFIG.CLOSED_SET_COLOR;
        for (const cellKey of viz.closedSet) {
            const [x, y] = cellKey.split(',').map(Number);
            ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar nodos frontera (open set) - color cyan
    if (viz.openSetKeys) {
        ctx.fillStyle = CONFIG.OPEN_SET_COLOR;
        for (const cellKey of viz.openSetKeys) {
            const [x, y] = cellKey.split(',').map(Number);
            ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar path completo (amarillo)
    if (viz.path.length > 0) {
        ctx.fillStyle = CONFIG.PATH_COLOR;
        for (const pathNode of viz.path) {
            ctx.fillRect(pathNode.x * CELL_SIZE + 1, pathNode.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    // Dibujar inicio
    ctx.fillStyle = CONFIG.START_COLOR;
    ctx.fillRect(viz.scaledStart.x * CELL_SIZE + 1, viz.scaledStart.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    
    // Dibujar destino
    ctx.fillStyle = CONFIG.END_COLOR;
    ctx.fillRect(viz.scaledEnd.x * CELL_SIZE + 1, viz.scaledEnd.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    
    // Re-habilitar botón
    if (playBtn) {
        playBtn.disabled = false;
        playBtn.innerHTML = '▶';
    }
}

// Función para dibujar el vehículo en el grid
function drawVehicleOnGrid(ctx, x, y, CELL_SIZE) {
    const centerX = x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = y * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE * 0.6;
    
    ctx.fillStyle = CONFIG.START_COLOR;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size / 2);
    ctx.lineTo(centerX - size / 2, centerY + size / 2);
    ctx.lineTo(centerX, centerY + size / 4);
    ctx.lineTo(centerX + size / 2, centerY + size / 2);
    ctx.closePath();
    ctx.fill();
}


// Función para crear contenedor de visualizaciones (carrusel)
function createVisualizationContainer(numVisualizations) {
    // Buscar si ya existe un contenedor
    let container = document.getElementById('benchmarkVisualizationContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'benchmarkVisualizationContainer';
        container.style.cssText = 'padding: 20px; background-color: #2a2a3e; margin-top: 20px; border-radius: 12px; position: relative;';
        
        // Crear botones de navegación
        const prevBtn = document.createElement('button');
        prevBtn.id = 'prevVisualizationBtn';
        prevBtn.innerHTML = '◀';
        prevBtn.style.cssText = 'position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background-color: #667eea; color: white; border: none; padding: 10px 15px; border-radius: 50%; cursor: pointer; font-size: 20px; font-weight: bold; z-index: 10;';
        
        const nextBtn = document.createElement('button');
        nextBtn.id = 'nextVisualizationBtn';
        nextBtn.innerHTML = '▶';
        nextBtn.style.cssText = 'position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background-color: #667eea; color: white; border: none; padding: 10px 15px; border-radius: 50%; cursor: pointer; font-size: 20px; font-weight: bold; z-index: 10;';
        
        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
        
        // Botón de play
        const playBtn = document.createElement('button');
        playBtn.id = 'playBenchmarkBtn';
        playBtn.innerHTML = '▶';
        playBtn.style.cssText = 'position: absolute; top: 50px; right: 20px; background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; z-index: 10;';
        container.appendChild(playBtn);
        
        // Título
        const title = document.createElement('h3');
        title.style.cssText = 'width: 100%; color: white; text-align: center; font-family: Montserrat, sans-serif; margin-top: 0;';
        title.textContent = 'Visualizaciones del Benchmark';
        container.appendChild(title);
        
        // Contenedor para el canvas visible
        const canvasWrapper = document.createElement('div');
        canvasWrapper.id = 'benchmarkCanvasWrapper';
        canvasWrapper.style.cssText = 'display: flex; justify-content: center; align-items: center; min-height: 400px; position: relative;';
        container.appendChild(canvasWrapper);
        
        // Indicador de progreso
        const progress = document.createElement('p');
        progress.id = 'benchmarkProgress';
        progress.style.cssText = 'text-align: center; color: white; font-family: Montserrat, sans-serif; margin: 10px 0 0 0;';
        container.appendChild(progress);
    } else {
        // Limpiar visualizaciones anteriores
        const canvasWrapper = document.getElementById('benchmarkCanvasWrapper');
        if (canvasWrapper) {
            canvasWrapper.innerHTML = '';
        }
    }
    
    // Insertar en el contenedor dedicado
    const visualizationsSection = document.getElementById('benchmarkVisualizationsSection');
    if (visualizationsSection) {
        visualizationsSection.appendChild(container);
    } else {
        // Fallback: insertar después de la sección del gráfico
        const chartSection = document.querySelector('.chart-section');
        if (chartSection && chartSection.parentNode) {
            chartSection.parentNode.insertBefore(container, chartSection.nextSibling);
        }
    }
    
    return container;
}

// Función para visualizar una búsqueda
async function visualizeSearch(canvasId, gridSize, start, end, obstacles, algorithm, heuristic, index) {
    // Crear canvas
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.width = gridSize * CONFIG.CELL_SIZE;
    canvas.height = gridSize * CONFIG.CELL_SIZE;
    canvas.style.cssText = 'border: 2px solid #3a3a4e; border-radius: 8px;';
    
    const ctx = canvas.getContext('2d');
    const CELL_SIZE = CONFIG.CELL_SIZE;
    
    // Configurar heurística
    const originalHeuristic = currentHeuristic;
    if (typeof setHeuristic === 'function') {
        setHeuristic(heuristic);
    }
    
    // Realizar búsqueda paso a paso con visualización
    const openSet = new Map();
    const closedSet = new Set();
    const path = [];
    
    // Almacenar cada estado para la animación
    const animationStates = [];
    
    const startNode = new Node(start.x, start.y, 0, 0);
    
    if (algorithm === 'astar') {
        startNode.h = calculateHeuristic(start, end);
        startNode.f = startNode.h;
    } else if (algorithm === 'bfs') {
        startNode.h = calculateHeuristic(start, end);
        startNode.f = startNode.h;
    } else {
        startNode.f = 0;
    }
    
    openSet.set(startNode.getKey(), startNode);
    
    let found = false;
    // Calcular velocidad de visualización según el tamaño
    // Grillas más pequeñas = más nodos por actualización (más lento)
    // Grillas más grandes = menos nodos por actualización (más rápido)
    let nodesToUpdate = Math.max(1, Math.floor(gridSize / 3)); // Ajuste dinámico
    let visualizationDelay = Math.max(5, 50 - gridSize); // Delay menor para grillas grandes
    
    while (openSet.size > 0 && !found) {
        let currentNode = null;
        let lowestF = Infinity;
        
        for (const node of openSet.values()) {
            if (node.f < lowestF) {
                lowestF = node.f;
                currentNode = node;
            }
        }
        
        if (currentNode.x === end.x && currentNode.y === end.y) {
            // Reconstruir path
            let node = currentNode;
            while (node) {
                path.push(node);
                node = node.parent;
            }
            path.reverse();
            found = true;
            break;
        }
        
        openSet.delete(currentNode.getKey());
        closedSet.add(currentNode.getKey());
        
        const neighbors = getNeighbors(currentNode, { width: gridSize * CELL_SIZE, height: gridSize * CELL_SIZE }, CELL_SIZE, obstacles);
        
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;
            
            let g, h, f;
            
            if (algorithm === 'astar') {
                g = currentNode.g + neighbor.cost;
                h = calculateHeuristic(neighbor, end);
                f = g + h;
            } else if (algorithm === 'dijkstra') {
                g = currentNode.g + neighbor.cost;
                f = g;
                h = 0;
            } else { // bfs
                g = 0;
                h = calculateHeuristic(neighbor, end);
                f = h;
            }
            
            if (openSet.has(neighborKey)) {
                const existingNode = openSet.get(neighborKey);
                if (g < existingNode.g || (algorithm === 'bfs' && h < existingNode.h)) {
                    existingNode.g = g;
                    existingNode.h = h;
                    existingNode.f = f;
                    existingNode.parent = currentNode;
                }
            } else {
                const newNode = new Node(neighbor.x, neighbor.y, g, h, f, currentNode);
                openSet.set(neighborKey, newNode);
            }
        }
        
        // Guardar estado para la animación cada pocos nodos
        if (closedSet.size % nodesToUpdate === 0 || openSet.size === 0) {
            await drawGridState(ctx, gridSize, CELL_SIZE, openSet, closedSet, obstacles, start, end, path, visualizationDelay);
            
            // Guardar snapshot del estado actual (convertir Sets a Arrays para serialización)
            animationStates.push({
                closedSet: Array.from(closedSet),
                openSet: Array.from(openSet.keys())
            });
        }
    }
    
    // Guardar el estado final
    animationStates.push({
        closedSet: Array.from(closedSet),
        openSet: Array.from(openSet.keys())
    });
    
    // Dibujar estado final
    await drawGridState(ctx, gridSize, CELL_SIZE, openSet, closedSet, obstacles, start, end, path, visualizationDelay);
    
    // Restaurar heurística
    if (typeof setHeuristic === 'function') {
        setHeuristic(originalHeuristic);
    }
    
    // Retornar el canvas, el path, los nodos explorados, los nodos frontera y los estados de animación
    return { 
        canvas: canvas, 
        path: path, 
        closedSet: closedSet, 
        openSetKeys: Array.from(openSet.keys()), 
        animationStates: animationStates 
    };
}

// Función para dibujar el estado del grid
async function drawGridState(ctx, gridSize, cellSize, openSet, closedSet, obstacles, start, end, path) {
    ctx.clearRect(0, 0, gridSize * cellSize, gridSize * cellSize);
    
    // Dibujar grid
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gridSize * cellSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gridSize * cellSize, i * cellSize);
        ctx.stroke();
    }
    
    // Dibujar obstáculos
    ctx.fillStyle = CONFIG.WALL_COLOR;
    for (const obsKey of obstacles) {
        const [x, y] = obsKey.split(',').map(Number);
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
    
    // Dibujar nodos explorados (closed set)
    ctx.fillStyle = CONFIG.CLOSED_SET_COLOR;
    for (const cellKey of closedSet) {
        const [x, y] = cellKey.split(',').map(Number);
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
    
    // Dibujar frontera (open set)
    ctx.fillStyle = CONFIG.OPEN_SET_COLOR;
    for (const [cellKey] of openSet) {
        const [x, y] = cellKey.split(',').map(Number);
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
    
    // Dibujar path
    if (path.length > 0) {
        ctx.fillStyle = CONFIG.PATH_COLOR;
        for (const node of path) {
            ctx.fillRect(node.x * cellSize + 1, node.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
    }
    
    // Dibujar inicio
    ctx.fillStyle = CONFIG.START_COLOR;
    ctx.fillRect(start.x * cellSize + 1, start.y * cellSize + 1, cellSize - 2, cellSize - 2);
    
    // Dibujar fin
    ctx.fillStyle = CONFIG.END_COLOR;
    ctx.fillRect(end.x * cellSize + 1, end.y * cellSize + 1, cellSize - 2, cellSize - 2);
    
    // Pequeña pausa para que se vea (dinámica según el tamaño)
    const delay = arguments[8] !== undefined ? arguments[8] : 10; // Delay dinámico pasado como argumento
    await new Promise(resolve => setTimeout(resolve, delay));
}

// Función para agregar una nueva serie a la gráfica
function addSeriesToChart(seriesName, algorithmName, results, customColor = null) {
    // Determinar color y nombre según el algoritmo
    let color, displayName;
    
    if (algorithmName === 'astar') {
        const heuristicSelect = document.getElementById('heuristicSelect');
        const heuristic = heuristicSelect ? heuristicSelect.value : 'euclidean';
        displayName = `A* (${heuristic})`;
        color = customColor || '#2E4272'; // Azul oscuro para fondo claro
    } else if (algorithmName === 'dijkstra') {
        displayName = 'Dijkstra';
        color = customColor || '#1B7340'; // Verde oscuro para fondo claro
    } else if (algorithmName === 'bfs') {
        const heuristicSelect = document.getElementById('heuristicSelect');
        const heuristic = heuristicSelect ? heuristicSelect.value : 'euclidean';
        displayName = `BFS (${heuristic})`;
        color = customColor || '#8B2B8B'; // Púrpura oscuro para fondo claro
    } else {
        displayName = 'Unknown';
        color = customColor || '#000000';
    }
    
    // Usar el nombre personalizado si se proporcionó
    const finalName = seriesName || displayName;
    
    // Agregar nueva serie con estilo para fondo claro
    allSeries.push({
        name: finalName,
        x: results.gridSizes,
        y: results.nodes,
        mode: 'lines+markers',
        line: { 
            color: color, 
            width: 2.5 
        },
        marker: { 
            size: 7,
            color: color,
            line: {
                color: '#000000',
                width: 1
            }
        }
    });
    
    // Redibujar gráfica con todas las series
    drawBenchmarkChart();
}

// Función para dibujar la gráfica con Plotly
function drawBenchmarkChart() {
    if (allSeries.length === 0) {
        // Si no hay series, mostrar gráfica vacía
        initializeEmptyChart();
        return;
    }
    
    const layout = {
        title: {
            text: 'Comparación de Algoritmos de Pathfinding',
            font: {
                family: 'Montserrat, sans-serif',
                size: 20,
                color: '#000000',
                weight: 'bold'
            }
        },
        xaxis: {
            title: {
                text: 'Tamaño de Cuadrícula (celdas)',
                font: { 
                    family: 'Montserrat, sans-serif', 
                    color: '#000000',
                    size: 14
                }
            },
            tickfont: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            gridcolor: '#666666',
            gridwidth: 1,
            showline: true,
            linecolor: '#000000',
            linewidth: 1
        },
        yaxis: {
            title: {
                text: 'Nodos Explorados',
                font: { 
                    family: 'Montserrat, sans-serif', 
                    color: '#000000',
                    size: 14
                }
            },
            tickfont: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            gridcolor: '#666666',
            gridwidth: 1,
            showline: true,
            linecolor: '#000000',
            linewidth: 1
        },
        plot_bgcolor: '#f5f0e8',
        paper_bgcolor: '#f5f0e8',
        font: {
            family: 'Montserrat, sans-serif',
            color: '#000000'
        },
        legend: {
            font: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            bordercolor: '#666666',
            borderwidth: 1
        },
        autosize: true
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        autosize: true,
        useResizeHandler: true
    };
    
    Plotly.newPlot('performanceChart', allSeries, layout, config);
    
    // Redimensionar el gráfico cuando cambie el tamaño de la ventana
    window.addEventListener('resize', function() {
        Plotly.Plots.resize('performanceChart');
    });
}

// Función para inicializar gráfica vacía
function initializeEmptyChart() {
    const data = [];
    
    const layout = {
        title: {
            text: 'Comparación de Algoritmos de Pathfinding',
            font: {
                family: 'Montserrat, sans-serif',
                size: 20,
                color: '#000000',
                weight: 'bold'
            }
        },
        xaxis: {
            title: {
                text: 'Tamaño de Cuadrícula (celdas)',
                font: { 
                    family: 'Montserrat, sans-serif', 
                    color: '#000000',
                    size: 14
                }
            },
            tickfont: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            gridcolor: '#666666',
            gridwidth: 1,
            showline: true,
            linecolor: '#000000',
            linewidth: 1
        },
        yaxis: {
            title: {
                text: 'Nodos Explorados',
                font: { 
                    family: 'Montserrat, sans-serif', 
                    color: '#000000',
                    size: 14
                }
            },
            tickfont: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            gridcolor: '#666666',
            gridwidth: 1,
            showline: true,
            linecolor: '#000000',
            linewidth: 1
        },
        plot_bgcolor: '#f5f0e8',
        paper_bgcolor: '#f5f0e8',
        font: {
            family: 'Montserrat, sans-serif',
            color: '#000000'
        },
        legend: {
            font: { 
                color: '#000000',
                family: 'Montserrat, sans-serif',
                size: 12
            },
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            bordercolor: '#666666',
            borderwidth: 1
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        autosize: true,
        useResizeHandler: true
    };
    
    // Asegurar que el layout use autosize
    layout.autosize = true;
    
    Plotly.newPlot('performanceChart', data, layout, config);
    
    // Redimensionar el gráfico cuando cambie el tamaño de la ventana
    window.addEventListener('resize', function() {
        Plotly.Plots.resize('performanceChart');
    });
}

// Exportar funciones al objeto window
if (typeof window !== 'undefined') {
    window.runBenchmark = runBenchmark;
    window.initializeEmptyChart = initializeEmptyChart;
}
