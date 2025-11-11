class Environment2D {
    constructor(width, height, obstaclePercentage = 0) {
        this.width = width;
        this.height = height;
        this.state = [0, 0]; // Estado inicial del agente (esquina superior izquierda)
        this.goal = [width - 1, height - 1]; // Objetivo en la esquina inferior derecha
        this.obstaclePercentage = obstaclePercentage;
        this.grid = Array(height).fill(0).map(() => Array(width).fill(0)); // Crear una cuadrícula de 0s
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        this._generateObstacles();
    }

    _generateObstacles() {
        const totalCells = this.width * this.height;
        const obstacleCount = Math.floor(totalCells * this.obstaclePercentage);
        
        // Crear lista de posiciones posibles (evitar inicio y objetivo)
        const possiblePositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this._arraysEqual([y, x], this.state) && !this._arraysEqual([y, x], this.goal)) {
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
        return this.state;
    }

    step(action) {
        if (this.done) {
            return {
                state: this.state,
                reward: 0,
                done: true
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

        // Recompensa: +1 si llega al objetivo, -1 por cada paso
        let reward;
        if (this._arraysEqual(this.state, this.goal)) {
            reward = 1;
            this.done = true;
        } else {
            reward = -1;
        }

        this.totalReward += reward;

        return {
            state: this.state,
            reward: reward,
            done: this.done
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

        // Dibujar objetivo
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(
            this.goal[1] * cellSize + cellSize / 2,
            this.goal[0] * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();

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

