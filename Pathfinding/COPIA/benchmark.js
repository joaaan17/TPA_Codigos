// ========== MÓDULO DE BENCHMARK PARA PATHFINDING ==========

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
    
    if (!benchmarkAlgorithmSelect || !chartNameInput || !gridSizeFromInput || !gridSizeToInput) {
        console.error('No se encontraron los elementos necesarios');
        return;
    }
    
    const selectedAlgorithm = benchmarkAlgorithmSelect.value;
    const selectedHeuristic = benchmarkHeuristicSelect ? benchmarkHeuristicSelect.value : 'euclidean';
    const chartName = chartNameInput.value.trim();
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
    
    chartDiv.innerHTML = '<p style="color: white; text-align: center;">Ejecutando benchmark...</p>';
    
    // Obtener el escenario actual (obstáculos del usuario)
    const currentStartPos = startPos;
    const currentEndPos = endPos;
    const currentObstacles = obstacles;
    
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
        
        // Escalar los obstáculos, inicio y fin proporcionalmente
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
        
        const scaledObstacles = new Set();
        for (const obstacleKey of currentObstacles) {
            const [x, y] = obstacleKey.split(',').map(Number);
            const scaledX = Math.floor(x * scaleX);
            const scaledY = Math.floor(y * scaleY);
            if (scaledX < size && scaledY < size) {
                scaledObstacles.add(`${scaledX},${scaledY}`);
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
    addSeriesToChart(chartName, selectedAlgorithm, results);
}

// Función para agregar una nueva serie a la gráfica
function addSeriesToChart(seriesName, algorithmName, results) {
    // Determinar color y nombre según el algoritmo
    let color, displayName;
    
    if (algorithmName === 'astar') {
        const heuristicSelect = document.getElementById('heuristicSelect');
        const heuristic = heuristicSelect ? heuristicSelect.value : 'euclidean';
        displayName = `A* (${heuristic})`;
        color = '#667eea';
    } else if (algorithmName === 'dijkstra') {
        displayName = 'Dijkstra';
        color = '#4CAF50';
    } else if (algorithmName === 'bfs') {
        const heuristicSelect = document.getElementById('heuristicSelect');
        const heuristic = heuristicSelect ? heuristicSelect.value : 'euclidean';
        displayName = `BFS (${heuristic})`;
        color = '#f093fb';
    } else {
        displayName = 'Unknown';
        color = '#888';
    }
    
    // Usar el nombre personalizado si se proporcionó
    const finalName = seriesName || displayName;
    
    // Agregar nueva serie
    allSeries.push({
        name: finalName,
        x: results.gridSizes,
        y: results.nodes,
        mode: 'lines+markers',
        line: { color: color, width: 3 },
        marker: { size: 8 }
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
                size: 18,
                color: '#ffffff'
            }
        },
        xaxis: {
            title: {
                text: 'Tamaño de Cuadrícula (celdas)',
                font: { family: 'Montserrat, sans-serif', color: '#e0e0e0' }
            },
            tickfont: { color: '#e0e0e0' },
            gridcolor: '#3a3a4e'
        },
        yaxis: {
            title: {
                text: 'Nodos Explorados',
                font: { family: 'Montserrat, sans-serif', color: '#e0e0e0' }
            },
            tickfont: { color: '#e0e0e0' },
            gridcolor: '#3a3a4e'
        },
        plot_bgcolor: '#2a2a3e',
        paper_bgcolor: '#2a2a3e',
        font: {
            family: 'Montserrat, sans-serif',
            color: '#e0e0e0'
        },
        legend: {
            font: { color: '#e0e0e0' },
            bgcolor: 'transparent'
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot('performanceChart', allSeries, layout, config);
}

// Función para inicializar gráfica vacía
function initializeEmptyChart() {
    const data = [];
    
    const layout = {
        title: {
            text: 'Comparación de Algoritmos de Pathfinding',
            font: {
                family: 'Montserrat, sans-serif',
                size: 18,
                color: '#ffffff'
            }
        },
        xaxis: {
            title: {
                text: 'Tamaño de Cuadrícula (celdas)',
                font: { family: 'Montserrat, sans-serif', color: '#e0e0e0' }
            },
            tickfont: { color: '#e0e0e0' },
            gridcolor: '#3a3a4e'
        },
        yaxis: {
            title: {
                text: 'Nodos Explorados',
                font: { family: 'Montserrat, sans-serif', color: '#e0e0e0' }
            },
            tickfont: { color: '#e0e0e0' },
            gridcolor: '#3a3a4e'
        },
        plot_bgcolor: '#2a2a3e',
        paper_bgcolor: '#2a2a3e',
        font: {
            family: 'Montserrat, sans-serif',
            color: '#e0e0e0'
        },
        legend: {
            font: { color: '#e0e0e0' },
            bgcolor: 'transparent'
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot('performanceChart', data, layout, config);
}

// Exportar funciones al objeto window
if (typeof window !== 'undefined') {
    window.runBenchmark = runBenchmark;
    window.initializeEmptyChart = initializeEmptyChart;
}
