// Clase Agente para Reinforcement Learning Multi-Goal
class AgentMultiGoal {
    constructor(env, alpha = 0.1, gamma = 0.9, epsilon = 0.01, renderTraining = false, pauseTime = 100, canvas = null) {
        this.env = env;
        this.alpha = alpha;           // Learning rate
        this.gamma = gamma;           // Discount factor
        this.epsilon = epsilon;       // Exploration rate
        this.renderTraining = renderTraining;
        this.pauseTime = pauseTime;
        this.canvas = canvas;
        
        // Tabla Q (altura, ancho, 4 acciones)
        this.Q = this._createQTable(env.height, env.width, 4);
        
        this.maxActionsPerEpisode = env.width * env.height * 2;
        
        // Estadísticas multi-goal
        this.goalsReached = new Array(env.numGoals).fill(0);
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
        let nActions = 0;
        this.isTraining = true;
        this.goalsReached = new Array(this.env.numGoals).fill(0);

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            let state = this.env.reset();
            let done = false;
            let totalReward = 0;
            
            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode}, actions: ${nActions}`);
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
                
                // Registrar qué meta se alcanzó
                if (done && result.goalIndex !== null) {
                    this.goalsReached[result.goalIndex]++;
                    console.log(` ... Meta ${result.goalIndex + 1} alcanzada!`);
                }

                // Actualizar la tabla Q (Q-Learning)
                const currentQ = this.Q[state[0]][state[1]][action];
                const maxNextQ = this._max(this.Q[nextState[0]][nextState[1]]);
                const tdTarget = reward + this.gamma * maxNextQ;
                const tdError = tdTarget - currentQ;
                this.Q[state[0]][state[1]][action] += this.alpha * tdError;

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

        // Llamar a onProgress una última vez con el total para mostrar 100%
        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        console.log('Distribución de metas alcanzadas:', this.goalsReached);

        this.isTraining = false;
        return rewardsPerEpisode;
    }

    async trainSARSA(numEpisodes, onProgress = null, onEpisodeComplete = null) {
        const rewardsPerEpisode = [];
        this.isTraining = true;
        this.goalsReached = new Array(this.env.numGoals).fill(0);

        for (let episode = 0; episode < numEpisodes; episode++) {
            this.currentEpisode = episode;
            let state = this.env.reset();
            let action = this.chooseAction(state);
            let done = false;
            let totalReward = 0;

            if (episode % 100 === 0) {
                console.log(`Training episode: ${episode}`);
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
                
                // Registrar qué meta se alcanzó
                if (done && result.goalIndex !== null) {
                    this.goalsReached[result.goalIndex]++;
                }
                
                const nextAction = this.chooseAction(nextState);

                // Actualizar la tabla Q (SARSA)
                const currentQ = this.Q[state[0]][state[1]][action];
                const nextQ = this.Q[nextState[0]][nextState[1]][nextAction];
                const tdTarget = reward + this.gamma * nextQ;
                const tdError = tdTarget - currentQ;
                this.Q[state[0]][state[1]][action] += this.alpha * tdError;

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

        // Llamar a onProgress una última vez con el total para mostrar 100%
        if (onProgress) {
            onProgress(numEpisodes, numEpisodes, rewardsPerEpisode[rewardsPerEpisode.length - 1]);
        }

        console.log('Distribución de metas alcanzadas:', this.goalsReached);

        this.isTraining = false;
        return rewardsPerEpisode;
    }

    async testAgent(numTests, onStateChange = null, onTestComplete = null) {
        const results = [];
        const testGoalsReached = new Array(this.env.numGoals).fill(0);

        for (let test = 0; test < numTests; test++) {
            let state = this.env.reset();
            let done = false;
            let steps = 0;
            let totalReward = 0;
            const path = [[...state]];

            console.log(`Prueba ${test + 1}:`);

            while (!done && steps < this.maxActionsPerEpisode) {
                const action = this.chooseAction(state);
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

                if (this.renderTraining) {
                    await this._sleep(this.pauseTime);
                }
                
                // Registrar qué meta se alcanzó en test
                if (done && result.goalIndex !== null) {
                    testGoalsReached[result.goalIndex]++;
                }
            }

            const testResult = {
                test: test + 1,
                steps: steps,
                totalReward: totalReward,
                path: path,
                success: done,
                goalReached: this.env.reachedGoal
            };

            results.push(testResult);
            console.log(`Test ${test + 1} completed: ${steps} pasos, meta ${testResult.goalReached !== null ? testResult.goalReached + 1 : 'ninguna'}`);

            if (onTestComplete) {
                await onTestComplete(testResult);
            }
        }

        console.log('Metas alcanzadas en pruebas:', testGoalsReached);
        return results;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Métodos auxiliares
    getQValue(state, action) {
        return this.Q[state[0]][state[1]][action];
    }

    getBestAction(state) {
        return this._argmax(this.Q[state[0]][state[1]]);
    }

    getBestQValue(state) {
        return this._max(this.Q[state[0]][state[1]]);
    }

    // Estadísticas de metas alcanzadas
    getGoalStats() {
        const total = this.goalsReached.reduce((a, b) => a + b, 0);
        const distribution = this.goalsReached.map(count => 
            total > 0 ? (count / total * 100).toFixed(1) + '%' : '0%'
        );
        
        return {
            counts: this.goalsReached,
            distribution: distribution,
            total: total
        };
    }

    // Exportar/Importar Q-table
    exportQTable() {
        return {
            Q: this.Q,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilon: this.epsilon,
            width: this.env.width,
            height: this.env.height,
            goalsReached: this.goalsReached
        };
    }

    importQTable(data) {
        if (data.width === this.env.width && data.height === this.env.height) {
            this.Q = data.Q;
            this.alpha = data.alpha;
            this.gamma = data.gamma;
            this.epsilon = data.epsilon;
            if (data.goalsReached) {
                this.goalsReached = data.goalsReached;
            }
            return true;
        }
        return false;
    }

    // Visualización de política
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

    // Estadísticas de la Q-table
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

