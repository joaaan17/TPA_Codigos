// Clase Agente para Reinforcement Learning
class Agent {
    constructor(env, alpha = 0.1, gamma = 0.9, epsilon = 0.01, renderTraining = false, pauseTime = 100, canvas = null) {
        this.env = env;
        this.alpha = alpha;           // Learning rate
        this.gamma = gamma;           // Discount factor
        this.epsilon = epsilon;       // Exploration rate
        this.renderTraining = renderTraining;  // Flag para renderizar el entrenamiento
        this.pauseTime = pauseTime;   // Tiempo de pausa para el renderizado (en ms)
        this.canvas = canvas;         // Canvas para renderizar durante el entrenamiento
        
        // Tabla Q (altura, ancho, 4 acciones)
        // Estructura correcta: Q[y][x][action]
        this.Q = this._createQTable(env.height, env.width, 4);
        
        // Frozen Lake puede necesitar más pasos (especialmente con slippery)
        this.maxActionsPerEpisode = env.width * env.height * 2;
        
        // Para tracking
        this.currentEpisode = 0;
        this.isTraining = false;
    }

    _createQTable(height, width, numActions) {
        const table = [];
        // Optimistic initialization: valores pequeños positivos para fomentar exploración
        // Esto ayuda especialmente en Frozen Lake donde las recompensas son escasas
        const initialValue = 0.01;
        for (let y = 0; y < height; y++) {
            table[y] = [];
            for (let x = 0; x < width; x++) {
                table[y][x] = new Array(numActions).fill(initialValue);
            }
        }
        return table;
    }

    chooseAction(state) {
        // Epsilon-greedy: exploración vs explotación
        if (Math.random() < this.epsilon) {
            // Exploración: acción aleatoria
            return Math.floor(Math.random() * 4);
        } else {
            // Explotación: mejor acción según Q-table
            return this._argmax(this.Q[state[0]][state[1]]);
        }
    }

    _argmax(array) {
        // Encuentra el índice del valor máximo en el array
        let maxIndex = 0;
        let maxValue = array[0];
        for (let i = 1; i < array.length; i++) {
            if (array[i] > maxValue) {
                maxValue = array[i];
                maxIndex = i;
            }
        }
        return maxIndex;
    }

    _max(array) {
        // Encuentra el valor máximo en el array
        return Math.max(...array);
    }

    async trainQLearning(numEpisodes, onProgress = null, onEpisodeComplete = null) {
        const rewardsPerEpisode = [];
        let nActions = 0;
        this.isTraining = true;
        
        // Epsilon decay: reducir exploración con el tiempo
        const initialEpsilon = this.epsilon;
        const minEpsilon = 0.01;
        const decayRate = (initialEpsilon - minEpsilon) / numEpisodes;

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            
            // Decay epsilon linealmente
            this.epsilon = Math.max(minEpsilon, initialEpsilon - (decayRate * episode));
            
            let state = this.env.reset();
            let done = false;
            let totalReward = 0;
            
            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode}, epsilon: ${this.epsilon.toFixed(3)}, actions: ${nActions}`);
                if (onProgress) {
                    onProgress(episode, numEpisodes, totalReward);
                }
            }
            
            nActions = 0;

            while (!done && nActions < this.maxActionsPerEpisode) {
                const action = this.chooseAction(state);
                const result = this.env.step(action);
                const nextState = result.state;
                const reward = result.reward;
                done = result.done;
                
                totalReward += reward;
                
                if (done) {
                    console.log(" ... Done!");
                }

                // Actualizar la tabla Q (Q-Learning)
                const currentQ = this.Q[state[0]][state[1]][action];
                
                if (done) {
                    // Si el episodio terminó, no hay siguiente estado
                    // El reward ya es +1 (objetivo) o -1 (agujero)
                    const tdTarget = reward;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                    
                    // Log para debugging
                    if (reward === 1) {
                        console.log(`  ✓ Objetivo alcanzado en episodio ${episode}!`);
                    } else if (reward === -1) {
                        console.log(`  ✗ Cayó en agujero en episodio ${episode}`);
                    }
                } else {
                    // Estado intermedio: usar el siguiente estado
                    const maxNextQ = this._max(this.Q[nextState[0]][nextState[1]]);
                    const tdTarget = reward + this.gamma * maxNextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                }

                state = nextState;
                nActions++;

                // Renderizar si el flag está activado
                if (this.renderTraining && this.canvas) {
                    // Renderizar el entorno en cada paso
                    this.env.render(this.canvas);
                    // Esperar para que se pueda ver la animación
                    await this._sleep(this.pauseTime);
                }
            }

            rewardsPerEpisode.push(totalReward);
            
            if (onEpisodeComplete) {
                onEpisodeComplete(episode, totalReward, rewardsPerEpisode);
            }
        }

        // Llamar a onProgress una última vez con el total para mostrar 100%
        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        // Restaurar epsilon original
        this.epsilon = initialEpsilon;
        
        // Estadísticas finales
        const successCount = rewardsPerEpisode.filter(r => r === 1).length;
        const failureCount = rewardsPerEpisode.filter(r => r === -1).length;
        const avgReward = rewardsPerEpisode.reduce((a, b) => a + b, 0) / rewardsPerEpisode.length;
        console.log(`\n=== Estadísticas Finales Q-Learning ===`);
        console.log(`Éxitos (objetivo alcanzado): ${successCount} (${(successCount/numEpisodes*100).toFixed(1)}%)`);
        console.log(`Fallos (agujero): ${failureCount} (${(failureCount/numEpisodes*100).toFixed(1)}%)`);
        console.log(`Recompensa promedio: ${avgReward.toFixed(3)}`);
        
        this.isTraining = false;
        return rewardsPerEpisode;
    }

    async trainSARSA(numEpisodes, onProgress = null, onEpisodeComplete = null) {
        const rewardsPerEpisode = [];
        this.isTraining = true;
        
        // Epsilon decay: reducir exploración con el tiempo
        const initialEpsilon = this.epsilon;
        const minEpsilon = 0.01;
        const decayRate = (initialEpsilon - minEpsilon) / numEpisodes;

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            
            // Decay epsilon linealmente
            this.epsilon = Math.max(minEpsilon, initialEpsilon - (decayRate * episode));
            
            let state = this.env.reset();
            let action = this.chooseAction(state);
            let done = false;
            let totalReward = 0;

            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode}, epsilon: ${this.epsilon.toFixed(3)}`);
                if (onProgress) {
                    onProgress(episode, numEpisodes, totalReward);
                }
            }

            let nActions = 0;
            while (!done && nActions < this.maxActionsPerEpisode) {
                const result = this.env.step(action);
                const nextState = result.state;
                const reward = result.reward;
                done = result.done;
                
                totalReward += reward;
                
                // Actualizar la tabla Q (SARSA)
                const currentQ = this.Q[state[0]][state[1]][action];
                
                if (done) {
                    // Si el episodio terminó, no hay siguiente estado
                    // El reward ya es +1 (objetivo) o -1 (agujero)
                    const tdTarget = reward;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                    
                    // Log para debugging
                    if (reward === 1) {
                        console.log(`  ✓ Objetivo alcanzado en episodio ${episode}!`);
                    } else if (reward === -1) {
                        console.log(`  ✗ Cayó en agujero en episodio ${episode}`);
                    }
                } else {
                    const nextAction = this.chooseAction(nextState);
                    const nextQ = this.Q[nextState[0]][nextState[1]][nextAction];
                    const tdTarget = reward + this.gamma * nextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                    state = nextState;
                    action = nextAction;
                }
                
                nActions++;

                // Renderizar si el flag está activado
                if (this.renderTraining && this.canvas) {
                    // Renderizar el entorno en cada paso
                    this.env.render(this.canvas);
                    await this._sleep(this.pauseTime);
                }
            }

            rewardsPerEpisode.push(totalReward);
            
            if (onEpisodeComplete) {
                onEpisodeComplete(episode, totalReward, rewardsPerEpisode);
            }
        }

        // Llamar a onProgress una última vez con el total para mostrar 100%
        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        // Restaurar epsilon original
        this.epsilon = initialEpsilon;
        
        // Estadísticas finales
        const successCount = rewardsPerEpisode.filter(r => r === 1).length;
        const failureCount = rewardsPerEpisode.filter(r => r === -1).length;
        const avgReward = rewardsPerEpisode.reduce((a, b) => a + b, 0) / rewardsPerEpisode.length;
        console.log(`\n=== Estadísticas Finales SARSA ===`);
        console.log(`Éxitos (objetivo alcanzado): ${successCount} (${(successCount/numEpisodes*100).toFixed(1)}%)`);
        console.log(`Fallos (agujero): ${failureCount} (${(failureCount/numEpisodes*100).toFixed(1)}%)`);
        console.log(`Recompensa promedio: ${avgReward.toFixed(3)}`);

        this.isTraining = false;
        return rewardsPerEpisode;
    }

    async testAgent(numTests, onStateChange = null, onTestComplete = null) {
        const results = [];

        for (let test = 0; test < numTests; test++) {
            let state = this.env.reset();
            let done = false;
            let steps = 0;
            let totalReward = 0;
            const path = [[...state]];

            console.log(`Prueba ${test + 1}:`);

            while (!done && steps < this.maxActionsPerEpisode) {
                // Política congelada: usar solo la mejor acción (sin exploración)
                const action = this.getBestAction(state);
                const result = this.env.step(action);
                const nextState = result.state;
                const reward = result.reward;
                done = result.done;
                
                totalReward += reward;
                steps++;
                path.push([...nextState]);
                
                state = nextState;

                // Callback para actualizar la visualización
                if (onStateChange) {
                    await onStateChange(state, action, reward, done, steps);
                }

                // Renderizar el entorno después de cada acción
                if (this.renderTraining) {
                    await this._sleep(this.pauseTime);
                }
            }

            const testResult = {
                test: test + 1,
                steps: steps,
                totalReward: totalReward,
                path: path,
                success: done
            };

            results.push(testResult);
            console.log(`Test ${test + 1} completed: ${steps} steps, reward: ${totalReward}`);

            if (onTestComplete) {
                await onTestComplete(testResult);
            }
        }

        return results;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Métodos auxiliares para análisis
    getQValue(state, action) {
        return this.Q[state[0]][state[1]][action];
    }

    getBestAction(state) {
        return this._argmax(this.Q[state[0]][state[1]]);
    }

    getBestQValue(state) {
        return this._max(this.Q[state[0]][state[1]]);
    }

    // Exportar/Importar Q-table (para guardar progreso)
    exportQTable() {
        return {
            Q: this.Q,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilon: this.epsilon,
            width: this.env.width,
            height: this.env.height
        };
    }

    importQTable(data) {
        if (data.width === this.env.width && data.height === this.env.height) {
            this.Q = data.Q;
            this.alpha = data.alpha;
            this.gamma = data.gamma;
            this.epsilon = data.epsilon;
            return true;
        }
        return false;
    }

    // Visualización de política (para debugging)
    getPolicy() {
        const policy = [];
        const actionNames = ['↑', '↓', '←', '→'];
        
        for (let y = 0; y < this.env.height; y++) {
            const row = [];
            for (let x = 0; x < this.env.width; x++) {
                const bestAction = this.getBestAction([y, x]);
                row.push(actionNames[bestAction]);
            }
            policy.push(row);
        }
        
        return policy;
    }

    printPolicy() {
        const policy = this.getPolicy();
        console.log('Policy (best action for each state):');
        for (let row of policy) {
            console.log(row.join(' '));
        }
    }

    // Obtener estadísticas de la Q-table
    getQTableStats() {
        let totalValues = 0;
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let nonZeroCount = 0;

        for (let i = 0; i < this.Q.length; i++) {
            for (let j = 0; j < this.Q[i].length; j++) {
                for (let k = 0; k < this.Q[i][j].length; k++) {
                    const value = this.Q[i][j][k];
                    sum += value;
                    totalValues++;
                    if (value !== 0) nonZeroCount++;
                    if (value < min) min = value;
                    if (value > max) max = value;
                }
            }
        }

        return {
            mean: sum / totalValues,
            min: min,
            max: max,
            nonZeroCount: nonZeroCount,
            totalValues: totalValues,
            sparsity: 1 - (nonZeroCount / totalValues)
        };
    }
}

