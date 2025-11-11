// Variables globales
let env;
let agent;
let isTraining = false;
let shouldStop = false;
let rewardsData = [];
let rewardChart = null;
let goalSelectorEnabled = false;

const canvas = document.getElementById('canvas');
const logContainer = document.getElementById('logContainer');

// Función para agregar log
function addLog(message) {
    if (!logContainer) return;
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logLine);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Función para actualizar el badge de estado
function updateStatusBadge(status, text) {
    const badge = document.getElementById('statusBadge');
    badge.className = 'status-badge';
    badge.classList.add(`status-${status}`);
    badge.textContent = text;
}

// Función para actualizar la barra de progreso
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
}

// Crear entorno goal-conditioned
function createEnvironment() {
    const width = parseInt(document.getElementById('envWidth').value);
    const height = parseInt(document.getElementById('envHeight').value);
    const obstacles = parseInt(document.getElementById('envObstacles').value) / 100;

    env = new Environment2DGoalConditioned(width, height, obstacles);
    env.reset();
    env.render(canvas);

    addLog(`Entorno Goal-Conditioned creado: ${width}x${height}, obstáculos: ${obstacles * 100}%`);
    updateStatusBadge('ready', 'Listo para entrenar');
    
    document.getElementById('agentPos').textContent = `(${env.state[0]}, ${env.state[1]})`;
    document.getElementById('goalPos').textContent = `(${env.goal[0]}, ${env.goal[1]})`;
    document.getElementById('steps').textContent = '0';
    
    // Configurar interactividad del canvas después del entrenamiento
    setupCanvasInteraction();
}

// Configurar click en canvas para cambiar objetivo
function setupCanvasInteraction() {
    canvas.style.cursor = 'default';
    
    canvas.onclick = async (e) => {
        if (!agent || isTraining) {
            addLog('⚠️ Primero entrena el agente');
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const cell = env.getCellFromCoordinates(x, y, canvas);
        
        if (cell && env.setGoal(cell)) {
            addLog(`🎯 Nuevo objetivo: (${cell[0]}, ${cell[1]})`);
            document.getElementById('goalPos').textContent = `(${cell[0]}, ${cell[1]})`;
            
            // Navegar automáticamente al nuevo objetivo
            updateStatusBadge('testing', 'Navegando...');
            
            const onStateChange = async (state, action, reward, done, steps) => {
                env.render(canvas);
                document.getElementById('agentPos').textContent = `(${state[0]}, ${state[1]})`;
                document.getElementById('steps').textContent = steps;
                await new Promise(resolve => setTimeout(resolve, 50));
            };
            
            const result = await agent.navigateToGoal(cell, onStateChange);
            
            if (result.success) {
                addLog(`✅ Llegó al objetivo en ${result.steps} pasos`);
                updateStatusBadge('trained', 'Entrenado ✓');
            } else {
                addLog(`❌ No alcanzó el objetivo`);
                updateStatusBadge('trained', 'Entrenado ✓');
            }
            
            env.render(canvas);
        } else {
            addLog('❌ No se puede colocar objetivo ahí (obstáculo)');
        }
    };
    
    canvas.onmousemove = (e) => {
        if (!agent || isTraining) return;
        canvas.style.cursor = 'pointer';
    };
}

// Iniciar entrenamiento
async function startTraining() {
    if (!env) {
        alert('Primero crea un entorno');
        return;
    }

    document.getElementById('trainBtn').disabled = true;
    document.getElementById('testBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    isTraining = true;
    shouldStop = false;
    rewardsData = [];
    
    const bestRewardElement = document.getElementById('bestReward');
    if (bestRewardElement) {
        bestRewardElement.textContent = '-∞';
    }

    const alpha = parseFloat(document.getElementById('alpha').value);
    const gamma = parseFloat(document.getElementById('gamma').value);
    const epsilon = parseFloat(document.getElementById('epsilon').value);
    const numEpisodes = parseInt(document.getElementById('numEpisodes').value);
    const algorithm = document.getElementById('algorithm').value;
    const renderTrainingElement = document.getElementById('renderTraining');
    const renderTraining = renderTrainingElement ? renderTrainingElement.checked : false;

    // Crear agente goal-conditioned
    agent = new AgentGoalConditioned(env, alpha, gamma, epsilon, renderTraining, 10);
    
    addLog(`Agente Goal-Conditioned creado con α=${alpha}, γ=${gamma}, ε=${epsilon}`);
    addLog(`💡 El agente aprenderá a navegar a CUALQUIER objetivo`);
    addLog(`Iniciando entrenamiento con ${algorithm.toUpperCase()}...`);
    updateStatusBadge('training', 'Entrenando...');

    initChart();

    const onProgress = (episode, total, reward) => {
        updateProgress(episode, total);
        const displayEpisode = episode === total ? episode : episode + 1;
        document.getElementById('episodeValue').textContent = displayEpisode;
        document.getElementById('currentEpisode').textContent = displayEpisode;
    };

    const onEpisodeComplete = (episode, reward, allRewards) => {
        rewardsData = allRewards;
        document.getElementById('lastReward').textContent = reward.toFixed(0);
        document.getElementById('episodeRewardValue').textContent = reward.toFixed(0);
        
        document.getElementById('episodeValue').textContent = episode + 1;
        document.getElementById('currentEpisode').textContent = episode + 1;
        document.getElementById('goalPos').textContent = `(${env.goal[0]}, ${env.goal[1]})`;
        
        const recentRewards = allRewards.slice(-100);
        const avg = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
        document.getElementById('avgReward').textContent = avg.toFixed(1);
        
        const bestRewardElement = document.getElementById('bestReward');
        if (bestRewardElement) {
            const currentBestText = bestRewardElement.textContent;
            const currentBest = currentBestText === '-∞' ? -Infinity : parseFloat(currentBestText);
            if (reward > currentBest) {
                bestRewardElement.textContent = reward.toFixed(0);
            }
        }
        
        if (episode % 10 === 0 || episode === allRewards.length - 1) {
            updateChart(allRewards);
        }

        if (renderTraining) {
            env.render(canvas);
            document.getElementById('agentPos').textContent = `(${env.state[0]}, ${env.state[1]})`;
            document.getElementById('steps').textContent = env.steps;
        }

        if (shouldStop) {
            throw new Error('Training stopped by user');
        }
    };

    try {
        let rewards;
        if (algorithm === 'qlearning') {
            rewards = await agent.trainQLearning(numEpisodes, onProgress, onEpisodeComplete);
        } else {
            rewards = await agent.trainSARSA(numEpisodes, onProgress, onEpisodeComplete);
        }

        updateChart(rewards);
        addLog(`✅ Entrenamiento completado. ${numEpisodes} episodios.`);
        addLog(`🎯 Ahora puedes hacer CLICK en el grid para cambiar el objetivo`);
        addLog(`🤖 El agente navegará al nuevo objetivo sin re-entrenar`);
        updateStatusBadge('trained', 'Entrenado ✓ - Click para cambiar objetivo');
        
        const stats = agent.getQTableStats();
        addLog(`Q-Table (${stats.goalAware ? 'Goal-Aware' : 'Standard'}): Mean=${stats.mean.toFixed(3)}, Min=${stats.min.toFixed(2)}, Max=${stats.max.toFixed(2)}`);
        
        // Habilitar selector de objetivo
        canvas.style.cursor = 'pointer';
        
    } catch (error) {
        if (error.message === 'Training stopped by user') {
            addLog('Entrenamiento detenido por el usuario.');
            updateStatusBadge('ready', 'Detenido');
        } else {
            addLog(`Error: ${error.message}`);
        }
    }

    document.getElementById('trainBtn').disabled = false;
    document.getElementById('testBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    isTraining = false;
}

function stopTraining() {
    shouldStop = true;
    addLog('Deteniendo entrenamiento...');
}

async function testAgent() {
    if (!agent) {
        alert('Primero entrena un agente');
        return;
    }

    document.getElementById('testBtn').disabled = true;
    updateStatusBadge('testing', 'Probando...');

    const numTests = parseInt(document.getElementById('numTests').value);
    addLog(`Iniciando ${numTests} pruebas con objetivos aleatorios...`);

    const onStateChange = async (state, action, reward, done, steps) => {
        env.render(canvas);
        document.getElementById('agentPos').textContent = `(${state[0]}, ${state[1]})`;
        document.getElementById('goalPos').textContent = `(${env.goal[0]}, ${env.goal[1]})`;
        document.getElementById('steps').textContent = steps;
        await new Promise(resolve => setTimeout(resolve, 100));
    };

    const onTestComplete = async (result) => {
        const status = result.success ? '✅' : '❌';
        addLog(`${status} Test ${result.test}: ${result.steps} pasos, objetivo (${result.goal[0]}, ${result.goal[1]})`);
        await new Promise(resolve => setTimeout(resolve, 500));
    };

    try {
        const results = await agent.testAgent(numTests, onStateChange, onTestComplete);
        
        const avgSteps = results.reduce((sum, r) => sum + r.steps, 0) / results.length;
        const avgReward = results.reduce((sum, r) => sum + r.totalReward, 0) / results.length;
        const successRate = results.filter(r => r.success).length / results.length * 100;
        
        addLog(`✅ Pruebas completadas. Promedio: ${avgSteps.toFixed(1)} pasos, ${avgReward.toFixed(1)} recompensa, ${successRate.toFixed(0)}% éxito`);
        addLog(`💡 Ahora haz CLICK en el grid para probar con tu propio objetivo`);
        updateStatusBadge('trained', 'Entrenado ✓ - Click para cambiar objetivo');
        
    } catch (error) {
        addLog(`Error en las pruebas: ${error.message}`);
    }

    document.getElementById('testBtn').disabled = false;
}

// Funciones del gráfico
function initChart() {
    const ctx = document.getElementById('rewardChart').getContext('2d');
    
    rewardChart = {
        ctx: ctx,
        width: ctx.canvas.width,
        height: ctx.canvas.height
    };
    
    ctx.canvas.width = ctx.canvas.offsetWidth;
    ctx.canvas.height = ctx.canvas.offsetHeight;
    rewardChart.width = ctx.canvas.width;
    rewardChart.height = ctx.canvas.height;
}

function updateChart(rewards) {
    if (!rewardChart) return;
    
    const ctx = rewardChart.ctx;
    const width = rewardChart.width;
    const height = rewardChart.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (rewards.length === 0) return;
    
    const windowSize = Math.min(100, Math.floor(rewards.length / 10));
    const smoothed = [];
    for (let i = 0; i < rewards.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = rewards.slice(start, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        smoothed.push(avg);
    }
    
    const minReward = Math.min(...smoothed);
    const maxReward = Math.max(...smoothed);
    const range = maxReward - minReward || 1;
    
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(maxReward.toFixed(0), margin.left - 5, margin.top + 15);
    ctx.fillText(minReward.toFixed(0), margin.left - 5, height - margin.bottom);
    
    // Añadir etiquetas del eje X (episodios)
    ctx.textAlign = 'center';
    const numXLabels = 5;
    for (let i = 0; i <= numXLabels; i++) {
        const episodeNum = Math.round((i / numXLabels) * (rewards.length - 1));
        const x = margin.left + (i / numXLabels) * chartWidth;
        ctx.fillText(episodeNum, x, height - margin.bottom + 20);
    }
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < smoothed.length; i++) {
        const x = margin.left + (i / (smoothed.length - 1)) * chartWidth;
        const y = height - margin.bottom - ((smoothed[i] - minReward) / range) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
}

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch(e.key.toLowerCase()) {
            case 'e':
                e.preventDefault();
                createEnvironment();
                break;
            case 't':
                e.preventDefault();
                if (!isTraining) startTraining();
                break;
            case 's':
                e.preventDefault();
                if (isTraining) stopTraining();
                break;
        }
    }
});

// Inicializar al cargar
window.addEventListener('load', () => {
    createEnvironment();
});

// Redimensionar gráfico
window.addEventListener('resize', () => {
    if (rewardChart) {
        const ctx = rewardChart.ctx;
        ctx.canvas.width = ctx.canvas.offsetWidth;
        ctx.canvas.height = ctx.canvas.offsetHeight;
        rewardChart.width = ctx.canvas.width;
        rewardChart.height = ctx.canvas.height;
        updateChart(rewardsData);
    }
});

