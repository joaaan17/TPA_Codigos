/**
 * Sistema de Entrenamiento y Visualización
 * Maneja el entrenamiento del agente y la visualización de resultados
 */

let agent = null;
let trainingActive = false;
let rewardHistory = [];
let stepsHistory = [];
let maxPositionHistory = [];
let chart = null;

// Inicializar sistema
window.addEventListener('load', () => {
    initializeAgent();
    setupChart();
    addLog('Sistema de entrenamiento listo');
});

function initializeAgent() {
    const algorithm = document.getElementById('algorithm').value;
    const alpha = parseFloat(document.getElementById('alpha').value);
    const gamma = parseFloat(document.getElementById('gamma').value);
    const epsilon = parseFloat(document.getElementById('epsilon').value);
    
    agent = new RLAgent(algorithm, alpha, gamma, epsilon);
    agent.epsilonDecay = parseFloat(document.getElementById('epsilonDecay').value);
    agent.epsilonMin = parseFloat(document.getElementById('epsilonMin').value);
    
    addLog(`Agente inicializado: ${algorithm.toUpperCase()}`);
}

function setupChart() {
    const canvas = document.getElementById('rewardChart');
    const ctx = canvas.getContext('2d');
    
    // Configurar tamaño del canvas (más grande para el nuevo contenedor)
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth - 40; // Restar padding
    canvas.height = container.offsetHeight - 40;
    
    chart = {
        canvas: canvas,
        ctx: ctx,
        data: [],
        maxPoints: 500
    };
}

function drawChart() {
    if (!chart || maxPositionHistory.length === 0) return;
    
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Limpiar con fondo oscuro
    ctx.fillStyle = 'rgba(20, 20, 35, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Calcular distancia a la meta (0.5 - maxPosition alcanzada)
    const goalPosition = 0.5;
    const distanceData = maxPositionHistory.slice(-chart.maxPoints).map(pos => {
        const distance = goalPosition - pos;
        return distance > 0 ? distance : 0; // Si llegó, distancia = 0
    });
    
    const data = distanceData;
    const minDistance = Math.min(...data);
    const maxDistance = Math.max(...data);
    let range = maxDistance - minDistance;
    
    // Si el rango es muy pequeño, expandir para mejor visualización
    if (range < 0.1) {
        range = 0.2;
    }
    
    // Márgenes
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Dibujar grilla de fondo
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
    ctx.lineWidth = 1;
    
    // Líneas horizontales de grilla
    const yStepsGrid = 10;
    for (let i = 0; i <= yStepsGrid; i++) {
        const y = margin.top + (i / yStepsGrid) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
    }
    
    // Líneas verticales de grilla
    const xStepsGrid = 10;
    for (let i = 0; i <= xStepsGrid; i++) {
        const x = margin.left + (i / xStepsGrid) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, height - margin.bottom);
        ctx.stroke();
    }
    
    // Dibujar ejes con color más brillante
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Etiquetas de ejes
    ctx.fillStyle = '#b0b0c0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Episodio', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Distancia a la Meta', 0, 0);
    ctx.restore();
    
    // Dibujar línea de distancia (INVERTIDA: menos distancia = arriba = mejor)
    if (data.length > 1) {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((distance, index) => {
            const x = margin.left + (index / (data.length - 1)) * plotWidth;
            // Invertir: maxDistance está abajo, minDistance arriba
            const y = margin.top + ((distance - minDistance) / range) * plotHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    // Dibujar promedio móvil de distancia (últimos 100)
    if (data.length > 1) {
        const maxWindowSize = 100;
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        let isFirstPoint = true;
        
        // Dibujar desde el principio, ajustando el tamaño de ventana
        for (let i = 0; i < data.length; i++) {
            // Usar ventana dinámica: crece hasta maxWindowSize
            const windowSize = Math.min(maxWindowSize, i + 1);
            const startIdx = Math.max(0, i - windowSize + 1);
            const window = data.slice(startIdx, i + 1);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            
            const x = margin.left + (i / (data.length - 1)) * plotWidth;
            // Invertir: menos distancia = arriba
            const y = margin.top + ((avg - minDistance) / range) * plotHeight;
            
            if (isFirstPoint) {
                ctx.moveTo(x, y);
                isFirstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    // Leyenda
    ctx.font = '11px Arial';
    ctx.fillStyle = '#667eea';
    ctx.fillText('━ Distancia', width - 100, 30);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('━ Promedio (100)', width - 100, 45);
    
    // Nota: menos distancia es mejor
    ctx.fillStyle = '#90EE90';
    ctx.font = '10px Arial';
    ctx.fillText('↑ Mejor (más cerca)', width - 120, height - margin.bottom + 25);
    
    // Línea de meta (distancia = 0)
    if (minDistance === 0) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const goalY = margin.top + ((0 - minDistance) / range) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin.left, goalY);
        ctx.lineTo(width - margin.right, goalY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('META', margin.left + 5, goalY - 5);
    }
    
    // Valores en los ejes
    ctx.fillStyle = '#b0b0c0';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    
    // Eje Y (invertido: menos distancia arriba)
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        // Invertir los valores: maxDistance arriba, minDistance abajo
        const value = maxDistance - (range * i / ySteps);
        const y = margin.top + (i / ySteps) * plotHeight;
        ctx.fillText(value.toFixed(3), margin.left - 5, y + 3);
    }
    
    // Eje X
    ctx.textAlign = 'center';
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
        const episodeNum = Math.floor((data.length - 1) * i / xSteps);
        const x = margin.left + (i / xSteps) * plotWidth;
        const displayEpisode = Math.max(0, rewardHistory.length - data.length) + episodeNum;
        ctx.fillText(displayEpisode, x, height - margin.bottom + 15);
    }
}

async function startTraining() {
    if (trainingActive) {
        addLog('El entrenamiento ya está en curso');
        return;
    }
    
    // Reinicializar agente
    initializeAgent();
    rewardHistory = [];
    stepsHistory = [];
    maxPositionHistory = [];
    
    const episodes = parseInt(document.getElementById('episodes').value);
    const speed = 100; // Velocidad fija (no se usa durante entrenamiento)
    
    trainingActive = true;
    updateUIState('training');
    
    // Mostrar overlay de carga
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    loadingOverlay.classList.add('active');
    loadingProgress.textContent = '0%';
    
    addLog(`Iniciando entrenamiento: ${episodes} episodios`);
    addLog(`Algoritmo: ${agent.algorithm.toUpperCase()}`);
    addLog(`Parámetros: α=${agent.alpha}, γ=${agent.gamma}, ε=${agent.epsilon}`);
    
    let successCount = 0;
    let totalSteps = 0;
    let bestReward = -Infinity;
    
    try {
        for (let episode = 0; episode < episodes; episode++) {
            if (!trainingActive) {
                addLog('Entrenamiento detenido por el usuario');
                break;
            }
        
        // Ejecutar episodio SIN visualización ni delays
        const result = await runTrainingEpisode(env, agent, false, speed);
        
        rewardHistory.push(result.totalReward);
        stepsHistory.push(result.steps);
        maxPositionHistory.push(result.maxPosition);
        totalSteps += result.steps;
        
        // Verificar si llegó a la meta
        if (env.position >= env.goalPosition) {
            successCount++;
        }
        
        // Actualizar mejor recompensa
        if (result.totalReward > bestReward) {
            bestReward = result.totalReward;
        }
        
        // Decaer epsilon
        agent.decayEpsilon();
        
        // Actualizar progreso solo cada 100 episodios
        if ((episode + 1) % 100 === 0) {
            const progress = ((episode + 1) / episodes * 100).toFixed(0);
            loadingProgress.textContent = `${progress}%`;
            await sleep(0); // Yield al navegador
        }
        }
    
        trainingActive = false;
        
        // Ocultar overlay de carga
        loadingOverlay.classList.remove('active');
    
    // Actualizar UI final con gráfico completo
    updateTrainingUI(episodes, episodes, rewardHistory[rewardHistory.length - 1], bestReward, true);
    updateUIState('completed');
    
    const avgReward = calculateAverageReward(100);
    const successRate = (successCount / episodes * 100).toFixed(1);
    const avgSteps = (totalSteps / episodes).toFixed(1);
    
        addLog('✅ ¡Entrenamiento completado!');
        addLog(`📊 Resultados (${episodes} episodios):`);
        addLog(`   - Promedio últimos 100: ${avgReward.toFixed(1)}`);
        addLog(`   - Mejor recompensa: ${bestReward}`);
        addLog(`   - Tasa de éxito: ${successRate}%`);
        addLog(`   - Pasos promedio: ${avgSteps}`);
        addLog(`   - Estados explorados: ${agent.getTableSize()}`);
        addLog(`💡 Ahora puedes probar el agente con el botón "Probar Agente"`);
    
    } catch (error) {
        // En caso de error, ocultar overlay y mostrar error
        loadingOverlay.classList.remove('active');
        addLog(`❌ Error durante entrenamiento: ${error.message}`);
        updateUIState('stopped');
    }
}

function stopTraining() {
    trainingActive = false;
    
    // Ocultar overlay si está visible
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
    
    updateUIState('stopped');
    addLog('⏹ Entrenamiento detenido por el usuario');
}

async function testAgent() {
    if (!agent || agent.getTableSize() === 0) {
        addLog('Primero debes entrenar el agente');
        return;
    }
    
    updateUIState('testing');
    addLog('Probando agente entrenado...');
    
    const result = await runTestEpisode(env, agent, true);
    
    if (env.position >= env.goalPosition) {
        addLog(`¡Éxito! Meta alcanzada en ${result.steps} pasos (Recompensa: ${result.totalReward})`);
    } else {
        addLog(`No alcanzó la meta en ${result.steps} pasos (Recompensa: ${result.totalReward})`);
    }
    
    updateUIState('stopped');
}

function updateTrainingUI(episode, totalEpisodes, reward, bestReward, updateChart = false) {
    // Actualizar contador de episodios
    document.getElementById('episodeValue').textContent = episode;
    document.getElementById('episodeRewardValue').textContent = reward;
    
    // Actualizar promedio
    const avgReward = calculateAverageReward(100);
    document.getElementById('avgRewardValue').textContent = avgReward.toFixed(1);
    
    // Actualizar mejor recompensa
    document.getElementById('bestRewardValue').textContent = bestReward;
    
    // Actualizar barra de progreso
    const progress = (episode / totalEpisodes) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress.toFixed(1)}%`;
    
    // Actualizar gráfico solo cuando se solicita (al final o cada 100 episodios)
    if (updateChart) {
        drawChart();
    }
}

function calculateAverageReward(window = 100) {
    if (rewardHistory.length === 0) return 0;
    
    const start = Math.max(0, rewardHistory.length - window);
    const slice = rewardHistory.slice(start);
    const sum = slice.reduce((a, b) => a + b, 0);
    
    return sum / slice.length;
}

function updateUIState(state) {
    const statusBadge = document.getElementById('statusBadge');
    const trainBtn = document.getElementById('trainBtn');
    const stopBtn = document.getElementById('stopBtn');
    const testBtn = document.getElementById('testBtn');
    
    // Resetear clases
    statusBadge.className = 'status-badge';
    
    switch(state) {
        case 'training':
            statusBadge.classList.add('status-training');
            statusBadge.textContent = 'Entrenando...';
            trainBtn.disabled = true;
            stopBtn.disabled = false;
            testBtn.disabled = true;
            break;
            
        case 'testing':
            statusBadge.classList.add('status-testing');
            statusBadge.textContent = 'Probando...';
            trainBtn.disabled = true;
            stopBtn.disabled = true;
            testBtn.disabled = true;
            break;
            
        case 'completed':
            statusBadge.classList.add('status-completed');
            statusBadge.textContent = 'Completado';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
            testBtn.disabled = false;
            break;
            
        case 'stopped':
        default:
            statusBadge.classList.add('status-stopped');
            statusBadge.textContent = 'Listo';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
            testBtn.disabled = (agent && agent.getTableSize() > 0) ? false : true;
            break;
    }
}

// Ajustar tamaño del canvas cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    if (chart) {
        const container = chart.canvas.parentElement;
        chart.canvas.width = container.offsetWidth - 40;
        chart.canvas.height = container.offsetHeight - 40;
        drawChart();
    }
});

