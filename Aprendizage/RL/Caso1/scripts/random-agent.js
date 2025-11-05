// Variables globales
let env;
let isRunning = false;
let intervalId = null;
const canvas = document.getElementById('canvas');

// Actualizar display de velocidad
document.getElementById('speed').addEventListener('input', (e) => {
    document.getElementById('speedValue').textContent = e.target.value;
});

// Crear entorno
function createEnvironment() {
    if (isRunning) pauseSimulation();

    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const obstaclePercentage = parseInt(document.getElementById('obstacles').value) / 100;

    env = new Environment2D(width, height, obstaclePercentage);
    env.reset();
    updateDisplay();
    env.render(canvas);
    
    updateStatus('stopped');
}

// Iniciar simulación automática
function startSimulation() {
    if (!env) {
        alert('Primero crea un entorno');
        return;
    }

    if (env.done) {
        alert('El episodio ha terminado. Reinicia para comenzar de nuevo.');
        return;
    }

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    
    updateStatus('running');

    const speed = parseInt(document.getElementById('speed').value);
    
    intervalId = setInterval(() => {
        if (env.done) {
            pauseSimulation();
            updateStatus('completed');
            setTimeout(() => {
                alert('¡Objetivo alcanzado! 🎉\nPasos: ' + env.steps + '\nRecompensa: ' + env.totalReward);
            }, 100);
            return;
        }

        // Elegir acción aleatoria
        const validActions = env.getValidActions();
        const action = validActions[Math.floor(Math.random() * validActions.length)];
        
        // Realizar acción
        env.step(action);
        
        // Renderizar
        env.render(canvas);
        updateDisplay();
    }, speed);
}

// Pausar simulación
function pauseSimulation() {
    isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    
    if (!env.done) {
        updateStatus('paused');
    }
}

// Ejecutar un paso
function stepSimulation() {
    if (!env) {
        alert('Primero crea un entorno');
        return;
    }

    if (env.done) {
        alert('El episodio ha terminado. Reinicia para comenzar de nuevo.');
        return;
    }

    // Elegir acción aleatoria
    const validActions = env.getValidActions();
    const action = validActions[Math.floor(Math.random() * validActions.length)];
    
    // Realizar acción
    env.step(action);
    
    // Renderizar
    env.render(canvas);
    updateDisplay();

    if (env.done) {
        updateStatus('completed');
        setTimeout(() => {
            alert('¡Objetivo alcanzado! 🎉\nPasos: ' + env.steps + '\nRecompensa: ' + env.totalReward);
        }, 100);
    }
}

// Reiniciar simulación
function resetSimulation() {
    if (!env) {
        alert('Primero crea un entorno');
        return;
    }

    if (isRunning) pauseSimulation();

    env.reset();
    updateDisplay();
    env.render(canvas);
    
    updateStatus('stopped');
}

// Actualizar display
function updateDisplay() {
    if (!env) return;

    document.getElementById('state').textContent = `(${env.state[0]}, ${env.state[1]})`;
    document.getElementById('goal').textContent = `(${env.goal[0]}, ${env.goal[1]})`;
    document.getElementById('steps').textContent = env.steps;
    document.getElementById('reward').textContent = env.totalReward;
}

// Actualizar badge de estado
function updateStatus(status) {
    const badge = document.getElementById('statusBadge');
    badge.className = 'status-badge';
    
    switch(status) {
        case 'running':
            badge.classList.add('status-running');
            badge.textContent = '▶ Ejecutando';
            break;
        case 'paused':
            badge.classList.add('status-paused');
            badge.textContent = '⏸ Pausado';
            break;
        case 'completed':
            badge.classList.add('status-completed');
            badge.textContent = '✓ Completado';
            break;
        case 'stopped':
        default:
            badge.classList.add('status-stopped');
            badge.textContent = '⏹ Detenido';
            break;
    }
}

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            if (isRunning) {
                pauseSimulation();
            } else {
                startSimulation();
            }
            break;
        case 'r':
            resetSimulation();
            break;
        case 'n':
            createEnvironment();
            break;
        case 's':
            stepSimulation();
            break;
    }
});

// Inicializar al cargar
window.addEventListener('load', () => {
    createEnvironment();
});

