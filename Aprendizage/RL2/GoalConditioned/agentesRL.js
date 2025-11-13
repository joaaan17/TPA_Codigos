// Agente Goal-Conditioned - Aprende a navegar a CUALQUIER objetivo
class AgentGoalConditioned {
    constructor(env, alpha = 0.1, gamma = 0.9, epsilon = 0.01, renderTraining = false, pauseTime = 100, canvas = null) {
        this.env = env;
        this.alpha = alpha;
        this.gamma = gamma;
        this.epsilon = epsilon;
        this.renderTraining = renderTraining;
        this.pauseTime = pauseTime;
        this.canvas = canvas;
        
        // Q-Table: almacena conocimiento de navegación general
        // La generalización viene de entrenar con múltiples objetivos
        this.Q = this._createQTable(env.height, env.width, 4);
        
        // Q-Table extendida con información del objetivo (opcional)
        // Q[state_y][state_x][relative_goal_direction][action]
        // Dirección relativa: 0=arriba-izq, 1=arriba, 2=arriba-der, 3=izq, 4=centro, 5=der, 6=abajo-izq, 7=abajo, 8=abajo-der
        this.Q_goal_aware = this._createQTableGoalAware(env.height, env.width, 9, 4);
        this.useGoalAware = true; // Usar Q-Table consciente del objetivo
        
        this.maxActionsPerEpisode = env.width * env.height * 2;
        this.currentEpisode = 0;
        this.isTraining = false;
    }

    _createQTable(height, width, numActions) {
        const table = [];
        for (let y = 0; y < height; y++) {
            table[y] = [];
            for (let x = 0; x < width; x++) {
                table[y][x] = new Array(numActions).fill(0);
            }
        }
        return table;
    }

    _createQTableGoalAware(height, width, numDirections, numActions) {
        const table = [];
        for (let y = 0; y < height; y++) {
            table[y] = [];
            for (let x = 0; x < width; x++) {
                table[y][x] = [];
                for (let d = 0; d < numDirections; d++) {
                    table[y][x][d] = new Array(numActions).fill(0);
                }
            }
        }
        return table;
    }

    // Calcular dirección relativa al objetivo (0-8)
    _getGoalDirection(state, goal) {
        const dy = goal[0] - state[0]; // Diferencia en Y
        const dx = goal[1] - state[1]; // Diferencia en X
        
        // Convertir a dirección discreta (9 direcciones)
        const dirY = dy === 0 ? 1 : (dy > 0 ? 2 : 0); // 0=arriba, 1=mismo, 2=abajo
        const dirX = dx === 0 ? 1 : (dx > 0 ? 2 : 0); // 0=izq, 1=mismo, 2=der
        
        return dirY * 3 + dirX; // 0-8
    }

    chooseAction(state, goal = null) {
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * 4);
        } else {
            if (this.useGoalAware && goal) {
                const direction = this._getGoalDirection(state, goal);
                return this._argmax(this.Q_goal_aware[state[0]][state[1]][direction]);
            } else {
                return this._argmax(this.Q[state[0]][state[1]]);
            }
        }
    }

    _argmax(array) {
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
        return Math.max(...array);
    }

    async trainQLearning(numEpisodes, onProgress = null, onEpisodeComplete = null) {
        const rewardsPerEpisode = [];
        this.isTraining = true;

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            
            // CLAVE: Cambiar el objetivo en cada episodio
            let state = this.env.reset(true); // true = randomize goal
            let goal = [...this.env.goal];
            let done = false;
            let totalReward = 0;
            let nActions = 0;
            
            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode} - Goal: (${goal[0]}, ${goal[1]})`);
                if (onProgress) {
                    onProgress(episode, numEpisodes, totalReward);
                }
            }

            while (!done && nActions < this.maxActionsPerEpisode) {
                const action = this.chooseAction(state, goal);
                const result = this.env.step(action);
                const nextState = result.state;
                const reward = result.reward;
                done = result.done;
                
                totalReward += reward;

                // Actualizar Q-Table goal-aware
                if (this.useGoalAware) {
                    const direction = this._getGoalDirection(state, goal);
                    const nextDirection = this._getGoalDirection(nextState, goal);
                    
                    const currentQ = this.Q_goal_aware[state[0]][state[1]][direction][action];
                    const maxNextQ = this._max(this.Q_goal_aware[nextState[0]][nextState[1]][nextDirection]);
                    const tdTarget = reward + this.gamma * maxNextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q_goal_aware[state[0]][state[1]][direction][action] += this.alpha * tdError;
                } else {
                    // Q-Learning estándar
                    const currentQ = this.Q[state[0]][state[1]][action];
                    const maxNextQ = this._max(this.Q[nextState[0]][nextState[1]]);
                    const tdTarget = reward + this.gamma * maxNextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                }

                state = nextState;
                nActions++;

                if (this.renderTraining && this.canvas) {
                    this.env.render(this.canvas);
                    await this._sleep(this.pauseTime);
                }
            }

            rewardsPerEpisode.push(totalReward);
            
            if (onEpisodeComplete) {
                onEpisodeComplete(episode, totalReward, rewardsPerEpisode);
            }
        }

        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        console.log('✅ Entrenamiento Goal-Conditioned completado');
        console.log('💡 Ahora puedes cambiar el objetivo haciendo click en el grid');

        this.isTraining = false;
        return rewardsPerEpisode;
    }

    async trainSARSA(numEpisodes, onProgress = null, onEpisodeComplete = null) {
        const rewardsPerEpisode = [];
        this.isTraining = true;

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            
            let state = this.env.reset(true);
            let goal = [...this.env.goal];
            let action = this.chooseAction(state, goal);
            let done = false;
            let totalReward = 0;

            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode} - Goal: (${goal[0]}, ${goal[1]})`);
                if (onProgress) {
                    onProgress(episode, numEpisodes, totalReward);
                }
            }

            while (!done) {
                const result = this.env.step(action);
                const nextState = result.state;
                const reward = result.reward;
                done = result.done;
                
                totalReward += reward;
                
                const nextAction = this.chooseAction(nextState, goal);

                if (this.useGoalAware) {
                    const direction = this._getGoalDirection(state, goal);
                    const nextDirection = this._getGoalDirection(nextState, goal);
                    
                    const currentQ = this.Q_goal_aware[state[0]][state[1]][direction][action];
                    const nextQ = this.Q_goal_aware[nextState[0]][nextState[1]][nextDirection][nextAction];
                    const tdTarget = reward + this.gamma * nextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q_goal_aware[state[0]][state[1]][direction][action] += this.alpha * tdError;
                } else {
                    const currentQ = this.Q[state[0]][state[1]][action];
                    const nextQ = this.Q[nextState[0]][nextState[1]][nextAction];
                    const tdTarget = reward + this.gamma * nextQ;
                    const tdError = tdTarget - currentQ;
                    this.Q[state[0]][state[1]][action] += this.alpha * tdError;
                }

                state = nextState;
                action = nextAction;

                if (this.renderTraining && this.canvas) {
                    this.env.render(this.canvas);
                    await this._sleep(this.pauseTime);
                }
            }

            rewardsPerEpisode.push(totalReward);
            
            if (onEpisodeComplete) {
                onEpisodeComplete(episode, totalReward, rewardsPerEpisode);
            }
        }

        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        console.log('✅ Entrenamiento Goal-Conditioned completado');

        this.isTraining = false;
        return rewardsPerEpisode;
    }

    // Navegar a un objetivo específico (después del entrenamiento)
    async navigateToGoal(goal, onStateChange = null) {
        console.log(`🎯 Navegando hacia objetivo: (${goal[0]}, ${goal[1]})`);
        
        this.env.setGoal(goal);
        let state = this.env.reset(false); // No randomizar goal
        let done = false;
        let steps = 0;
        let totalReward = 0;
        const path = [[...state]];

        while (!done && steps < this.maxActionsPerEpisode) {
            const action = this.chooseAction(state, goal);
            const result = this.env.step(action);
            const nextState = result.state;
            const reward = result.reward;
            done = result.done;
            
            totalReward += reward;
            steps++;
            path.push([...nextState]);
            
            state = nextState;

            if (onStateChange) {
                await onStateChange(state, action, reward, done, steps);
            }

            await this._sleep(100); // Animación
        }

        const success = done && this.env._arraysEqual(state, goal);
        console.log(`${success ? '✅ Objetivo alcanzado' : '❌ No alcanzó objetivo'} en ${steps} pasos`);

        return {
            success: success,
            steps: steps,
            totalReward: totalReward,
            path: path
        };
    }

    async testAgent(numTests, onStateChange = null, onTestComplete = null) {
        const results = [];

        for (let test = 0; test < numTests; test++) {
            this.env.randomizeGoal(); // Objetivo aleatorio para cada test
            const goal = [...this.env.goal];
            
            const result = await this.navigateToGoal(goal, onStateChange);
            result.test = test + 1;
            result.goal = goal;
            
            results.push(result);

            if (onTestComplete) {
                await onTestComplete(result);
            }
        }

        return results;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Métodos auxiliares
    getQValue(state, goal, action) {
        if (this.useGoalAware) {
            const direction = this._getGoalDirection(state, goal);
            return this.Q_goal_aware[state[0]][state[1]][direction][action];
        }
        return this.Q[state[0]][state[1]][action];
    }

    getBestAction(state, goal) {
        return this.chooseAction(state, goal);
    }

    exportQTable() {
        return {
            Q: this.Q,
            Q_goal_aware: this.Q_goal_aware,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilon: this.epsilon,
            width: this.env.width,
            height: this.env.height,
            useGoalAware: this.useGoalAware
        };
    }

    importQTable(data) {
        if (data.width === this.env.width && data.height === this.env.height) {
            this.Q = data.Q;
            if (data.Q_goal_aware) {
                this.Q_goal_aware = data.Q_goal_aware;
                this.useGoalAware = data.useGoalAware;
            }
            this.alpha = data.alpha;
            this.gamma = data.gamma;
            this.epsilon = data.epsilon;
            return true;
        }
        return false;
    }

    getQTableStats() {
        let totalValues = 0;
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let nonZeroCount = 0;

        const table = this.useGoalAware ? this.Q_goal_aware : this.Q;

        if (this.useGoalAware) {
            for (let i = 0; i < table.length; i++) {
                for (let j = 0; j < table[i].length; j++) {
                    for (let d = 0; d < table[i][j].length; d++) {
                        for (let k = 0; k < table[i][j][d].length; k++) {
                            const value = table[i][j][d][k];
                            sum += value;
                            totalValues++;
                            if (value !== 0) nonZeroCount++;
                            if (value < min) min = value;
                            if (value > max) max = value;
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < table.length; i++) {
                for (let j = 0; j < table[i].length; j++) {
                    for (let k = 0; k < table[i][j].length; k++) {
                        const value = table[i][j][k];
                        sum += value;
                        totalValues++;
                        if (value !== 0) nonZeroCount++;
                        if (value < min) min = value;
                        if (value > max) max = value;
                    }
                }
            }
        }

        return {
            mean: sum / totalValues,
            min: min,
            max: max,
            nonZeroCount: nonZeroCount,
            totalValues: totalValues,
            sparsity: 1 - (nonZeroCount / totalValues),
            goalAware: this.useGoalAware
        };
    }
}

