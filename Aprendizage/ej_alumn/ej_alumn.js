// Variables globales
let env;
let isRunning = false;
let intervalId = null;
const canvas = document.getElementById('canvas');

// Actualizar display de velocidad
document.getElementById('speed').addEventListener('input', (e) => {
    document.getElementById('speedValue').textContent = e.target.value;
});

// Crear nuevo entorno
function createNewEnvironment() {
    // Detener simulación si está corriendo
    if (isRunning) {
        pauseSimulation();
    }

    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const obstaclePercentage = parseInt(document.getElementById('obstacles').value) / 100;

    // Crear entorno (como en el código Python: env = Environment2D(15, 15))
    env = new Environment2D(width, height, obstaclePercentage);
    
    // Reset y render inicial
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
    
    // Ejecutar la simulación (equivalente al while not done en Python)
    intervalId = setInterval(() => {
        if (env.done) {
            pauseSimulation();
            updateStatus('completed');
            setTimeout(() => {
                alert('¡Objetivo alcanzado! 🎉\nPasos totales: ' + env.steps + '\nRecompensa total: ' + env.totalReward);
            }, 100);
            return;
        }

        // Elegir acción aleatoria (como en Python: action = random.choice(env.get_valid_actions()))
        const validActions = env.getValidActions();
        const action = validActions[Math.floor(Math.random() * validActions.length)];
        
        // Realizar acción (como en Python: next_state, reward, done = env.step(action))
        const result = env.step(action);
        
        // Renderizar el entorno (como en Python: env.render())
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

// Ejecutar un paso (para debugging o control manual)
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
    const result = env.step(action);
    
    // Renderizar
    env.render(canvas);
    updateDisplay();

    if (result.done) {
        updateStatus('completed');
        setTimeout(() => {
            alert('¡Objetivo alcanzado! 🎉\nPasos totales: ' + env.steps + '\nRecompensa total: ' + env.totalReward);
        }, 100);
    }
}

// Reiniciar simulación
function resetSimulation() {
    if (!env) {
        alert('Primero crea un entorno');
        return;
    }

    // Detener si está corriendo
    if (isRunning) {
        pauseSimulation();
    }

    // Reset del entorno (como en Python: state = env.reset())
    env.reset();
    updateDisplay();
    env.render(canvas);
    
    updateStatus('stopped');
}

// Actualizar display de información
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
            createNewEnvironment();
            break;
        case 's':
            stepSimulation();
            break;
    }
});

// Inicializar al cargar la página
window.addEventListener('load', () => {
    createNewEnvironment();
});

