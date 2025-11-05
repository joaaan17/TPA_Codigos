/**
 * Agentes de Aprendizaje por Refuerzo para Mountain Car
 * Implementa Q-Learning y SARSA
 */

class RLAgent {
    constructor(algorithm = 'qlearning', alpha = 0.1, gamma = 0.99, epsilon = 1.0) {
        this.algorithm = algorithm;
        this.alpha = alpha;      // Tasa de aprendizaje
        this.gamma = gamma;      // Factor de descuento
        this.epsilon = epsilon;  // Epsilon para epsilon-greedy
        
        this.epsilonDecay = 0.995;
        this.epsilonMin = 0.01;
        
        // Tabla Q: Map de "estado" -> [Q(s,0), Q(s,1), Q(s,2)]
        this.qTable = new Map();
        
        // Acciones posibles
        this.actions = [0, 1, 2]; // Izquierda, Neutral, Derecha
        
        // Parámetros de discretización
        this.positionBins = 20;
        this.velocityBins = 20;
    }
    
    // Obtener valores Q para un estado
    getQValues(state) {
        if (!this.qTable.has(state)) {
            // Inicializar con valores aleatorios pequeños
            this.qTable.set(state, [
                Math.random() * 0.01,
                Math.random() * 0.01,
                Math.random() * 0.01
            ]);
        }
        return this.qTable.get(state);
    }
    
    // Obtener el valor Q máximo para un estado
    getMaxQ(state) {
        const qValues = this.getQValues(state);
        return Math.max(...qValues);
    }
    
    // Obtener la mejor acción (greedy) para un estado
    getBestAction(state) {
        const qValues = this.getQValues(state);
        let maxQ = qValues[0];
        let bestActions = [0];
        
        for (let i = 1; i < qValues.length; i++) {
            if (qValues[i] > maxQ) {
                maxQ = qValues[i];
                bestActions = [i];
            } else if (qValues[i] === maxQ) {
                bestActions.push(i);
            }
        }
        
        // Si hay múltiples acciones con el mismo valor, elegir aleatoriamente
        return bestActions[Math.floor(Math.random() * bestActions.length)];
    }
    
    // Seleccionar acción usando epsilon-greedy
    selectAction(state, training = true) {
        if (training && Math.random() < this.epsilon) {
            // Exploración: acción aleatoria
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        } else {
            // Explotación: mejor acción conocida
            return this.getBestAction(state);
        }
    }
    
    // Actualizar tabla Q (Q-Learning)
    updateQLearning(state, action, reward, nextState, done) {
        const qValues = this.getQValues(state);
        const currentQ = qValues[action];
        
        let targetQ;
        if (done) {
            targetQ = reward;
        } else {
            const maxNextQ = this.getMaxQ(nextState);
            targetQ = reward + this.gamma * maxNextQ;
        }
        
        // Actualización Q-Learning
        qValues[action] = currentQ + this.alpha * (targetQ - currentQ);
    }
    
    // Actualizar tabla Q (SARSA)
    updateSARSA(state, action, reward, nextState, nextAction, done) {
        const qValues = this.getQValues(state);
        const currentQ = qValues[action];
        
        let targetQ;
        if (done) {
            targetQ = reward;
        } else {
            const nextQValues = this.getQValues(nextState);
            const nextQ = nextQValues[nextAction];
            targetQ = reward + this.gamma * nextQ;
        }
        
        // Actualización SARSA
        qValues[action] = currentQ + this.alpha * (targetQ - currentQ);
    }
    
    // Actualizar (delega al algoritmo correspondiente)
    update(state, action, reward, nextState, nextAction, done) {
        if (this.algorithm === 'qlearning') {
            this.updateQLearning(state, action, reward, nextState, done);
        } else if (this.algorithm === 'sarsa') {
            this.updateSARSA(state, action, reward, nextState, nextAction, done);
        }
    }
    
    // Decaer epsilon
    decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }
    
    // Resetear agente
    reset() {
        this.qTable.clear();
        this.epsilon = 1.0;
    }
    
    // Obtener tamaño de la tabla Q
    getTableSize() {
        return this.qTable.size;
    }
    
    // Obtener estadísticas
    getStats() {
        let totalStates = this.qTable.size;
        let exploredStates = 0;
        
        this.qTable.forEach((qValues) => {
            // Considerar "explorado" si al menos un valor Q cambió significativamente
            const hasLearned = qValues.some(q => Math.abs(q) > 0.1);
            if (hasLearned) exploredStates++;
        });
        
        return {
            totalStates,
            exploredStates,
            epsilon: this.epsilon
        };
    }
}

// Función de utilidad para discretizar estado desde el entorno
function discretizeEnvironmentState(env, positionBins = 20, velocityBins = 20) {
    const position = env.position;
    const velocity = env.velocity;
    
    const positionBin = Math.floor(
        (position - env.minPosition) / (env.maxPosition - env.minPosition) * positionBins
    );
    const velocityBin = Math.floor(
        (velocity + env.maxSpeed) / (2 * env.maxSpeed) * velocityBins
    );
    
    // Asegurar que los bins estén en rango
    const posBin = Math.max(0, Math.min(positionBins - 1, positionBin));
    const velBin = Math.max(0, Math.min(velocityBins - 1, velocityBin));
    
    return `${posBin}_${velBin}`;
}

// Función para ejecutar un episodio de entrenamiento
async function runTrainingEpisode(env, agent, visualize = false, speed = 50) {
    env.reset();
    let state = discretizeEnvironmentState(env);
    let totalReward = 0;
    let steps = 0;
    let maxPosition = env.position;
    
    // Para SARSA, necesitamos seleccionar la primera acción
    let action = agent.selectAction(state, true);
    
    while (!env.done) {
        // Ejecutar acción
        const result = env.step(action);
        const reward = result.reward;
        const nextState = discretizeEnvironmentState(env);
        
        totalReward += reward;
        steps++;
        
        // Rastrear la posición máxima alcanzada
        if (env.position > maxPosition) {
            maxPosition = env.position;
        }
        
        // Seleccionar siguiente acción (para SARSA)
        const nextAction = agent.selectAction(nextState, true);
        
        // Actualizar tabla Q
        agent.update(state, action, reward, nextState, nextAction, env.done);
        
        // Avanzar al siguiente estado
        state = nextState;
        action = nextAction;
        
        // Visualizar si está activado
        if (visualize) {
            await sleep(100 - speed);
        }
    }
    
    return { totalReward, steps, maxPosition };
}

// Función para ejecutar un episodio de prueba (sin exploración)
async function runTestEpisode(env, agent, visualize = true) {
    env.reset();
    let state = discretizeEnvironmentState(env);
    let totalReward = 0;
    let steps = 0;
    
    while (!env.done) {
        // Seleccionar mejor acción (sin exploración)
        const action = agent.selectAction(state, false);
        
        // Ejecutar acción
        const result = env.step(action);
        const reward = result.reward;
        const nextState = discretizeEnvironmentState(env);
        
        totalReward += reward;
        steps++;
        
        // Avanzar al siguiente estado
        state = nextState;
        
        // Visualizar
        if (visualize) {
            await sleep(30);
        }
    }
    
    return { totalReward, steps };
}

// Utilidad para pausar la ejecución
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

