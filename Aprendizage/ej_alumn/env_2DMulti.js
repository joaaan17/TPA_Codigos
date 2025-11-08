class Environment2DMultiGoal {
    constructor(width, height, obstaclePercentage = 0, numGoals = 3) {
        this.width = width;
        this.height = height;
        this.state = [0, 0]; // Estado inicial del agente (esquina superior izquierda)
        this.numGoals = numGoals;
        this.goals = []; // Array de múltiples objetivos
        this.obstaclePercentage = obstaclePercentage;
        this.grid = Array(height).fill(0).map(() => Array(width).fill(0));
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        this.reachedGoal = null; // Índice de la meta alcanzada
        this._generateGoals();
        this._generateObstacles();
    }

    _generateGoals() {
        // Generar múltiples metas en posiciones aleatorias
        this.goals = [];
        const possiblePositions = [];
        
        // Crear lista de todas las posiciones excepto el inicio
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this._arraysEqual([y, x], this.state)) {
                    possiblePositions.push([y, x]);
                }
            }
        }
        
        // Seleccionar numGoals posiciones aleatorias
        const goalCount = Math.min(this.numGoals, possiblePositions.length);
        const selectedGoals = this._randomSample(possiblePositions, goalCount);
        
        for (const goal of selectedGoals) {
            this.goals.push(goal);
            // Marcar en el grid como meta (valor 2)
            this.grid[goal[0]][goal[1]] = 2;
        }
        
        console.log(`Metas generadas: ${this.goals.length}`, this.goals);
    }

    _generateObstacles() {
        const totalCells = this.width * this.height;
        const obstacleCount = Math.floor(totalCells * this.obstaclePercentage);
        
        // Crear lista de posiciones posibles (evitar inicio y metas)
        const possiblePositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const isStart = this._arraysEqual([y, x], this.state);
                const isGoal = this.goals.some(goal => this._arraysEqual([y, x], goal));
                
                if (!isStart && !isGoal) {
                    possiblePositions.push([y, x]);
                }
            }
        }

        // Seleccionar posiciones aleatorias para obstáculos
        const obstacles = this._randomSample(possiblePositions, obstacleCount);
        for (const [y, x] of obstacles) {
            this.grid[y][x] = 1; // Marcar como obstáculo
        }
    }

    _randomSample(array, count) {
        const result = [];
        const copy = [...array];
        count = Math.min(count, copy.length);
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * copy.length);
            result.push(copy.splice(randomIndex, 1)[0]);
        }
        
        return result;
    }

    _arraysEqual(arr1, arr2) {
        return arr1[0] === arr2[0] && arr1[1] === arr2[1];
    }

    reset() {
        this.state = [0, 0]; // Reiniciar el estado
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        this.reachedGoal = null;
        return this.state;
    }

    step(action) {
        if (this.done) {
            return {
                state: this.state,
                reward: 0,
                done: true,
                goalIndex: this.reachedGoal
            };
        }

        let newState;

        // Mover al agente en función de la acción
        if (action === 0) { // Arriba
            newState = [Math.max(this.state[0] - 1, 0), this.state[1]];
        } else if (action === 1) { // Abajo
            newState = [Math.min(this.state[0] + 1, this.height - 1), this.state[1]];
        } else if (action === 2) { // Izquierda
            newState = [this.state[0], Math.max(this.state[1] - 1, 0)];
        } else if (action === 3) { // Derecha
            newState = [this.state[0], Math.min(this.state[1] + 1, this.width - 1)];
        } else {
            throw new Error("Acción no válida");
        }

        // Verificar si la nueva posición es un obstáculo
        if (this.grid[newState[0]][newState[1]] === 1) {
            newState = this.state; // Si es un obstáculo, el agente no se mueve
        }

        this.state = newState;
        this.steps++;

        // Recompensa: +10 si llega a cualquier objetivo, -1 por cada paso
        let reward = -1;
        
        // Verificar si alcanzó alguna meta
        for (let i = 0; i < this.goals.length; i++) {
            if (this._arraysEqual(this.state, this.goals[i])) {
                reward = 10; // Recompensa mayor para multi-goal
                this.done = true;
                this.reachedGoal = i;
                console.log(`Meta ${i} alcanzada en posición (${this.state[0]}, ${this.state[1]})`);
                break;
            }
        }

        this.totalReward += reward;

        return {
            state: this.state,
            reward: reward,
            done: this.done,
            goalIndex: this.reachedGoal
        };
    }

    getValidActions() {
        return [0, 1, 2, 3]; // Las acciones posibles: Arriba, Abajo, Izquierda, Derecha
    }

    render(canvas) {
        const ctx = canvas.getContext('2d');
        const cellSize = Math.min(600 / Math.max(this.width, this.height), 50);
        
        // Ajustar tamaño del canvas
        canvas.width = this.width * cellSize;
        canvas.height = this.height * cellSize;

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar cuadrícula
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.width * cellSize, y * cellSize);
            ctx.stroke();
        }
        
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.height * cellSize);
            ctx.stroke();
        }

        // Dibujar obstáculos
        ctx.fillStyle = '#000';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.beginPath();
                    ctx.arc(
                        x * cellSize + cellSize / 2,
                        y * cellSize + cellSize / 2,
                        cellSize / 3,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }

        // Dibujar múltiples objetivos con colores diferentes
        const goalColors = ['#FFD700', '#FF6347', '#32CD32', '#FF69B4', '#00CED1', '#FFA500'];
        
        for (let i = 0; i < this.goals.length; i++) {
            const goal = this.goals[i];
            ctx.fillStyle = goalColors[i % goalColors.length];
            
            // Dibujar estrella para cada meta
            ctx.beginPath();
            const centerX = goal[1] * cellSize + cellSize / 2;
            const centerY = goal[0] * cellSize + cellSize / 2;
            const outerRadius = cellSize / 3;
            const innerRadius = cellSize / 6;
            const points = 5;
            
            for (let p = 0; p < points * 2; p++) {
                const radius = p % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / points) * p - Math.PI / 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                
                if (p === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
            // Agregar borde a la estrella
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Número de la meta
            ctx.fillStyle = '#000';
            ctx.font = `bold ${cellSize / 3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(), centerX, centerY);
        }

        // Dibujar agente
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(
            this.state[1] * cellSize + cellSize / 2,
            this.state[0] * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Añadir borde al agente
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

