class Environment2DGoalConditioned {
    constructor(width, height, obstaclePercentage = 0) {
        this.width = width;
        this.height = height;
        this.state = [0, 0]; // Estado inicial
        this.goal = [width - 1, height - 1]; // Objetivo inicial (puede cambiar)
        this.obstaclePercentage = obstaclePercentage;
        this.grid = Array(height).fill(0).map(() => Array(width).fill(0));
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        this._generateObstacles();
    }

    _generateObstacles() {
        const totalCells = this.width * this.height;
        const obstacleCount = Math.floor(totalCells * this.obstaclePercentage);
        
        const possiblePositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this._arraysEqual([y, x], this.state) && !this._arraysEqual([y, x], this.goal)) {
                    possiblePositions.push([y, x]);
                }
            }
        }

        const obstacles = this._randomSample(possiblePositions, obstacleCount);
        for (const [y, x] of obstacles) {
            this.grid[y][x] = 1;
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

    // Cambiar el objetivo dinámicamente (después del entrenamiento)
    setGoal(newGoal) {
        // Verificar que no sea obstáculo
        if (this.grid[newGoal[0]][newGoal[1]] !== 1) {
            this.goal = newGoal;
            console.log(`Nuevo objetivo establecido: (${newGoal[0]}, ${newGoal[1]})`);
            return true;
        }
        return false;
    }

    // Generar un objetivo aleatorio para entrenamiento
    randomizeGoal() {
        const possibleGoals = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // No puede ser obstáculo ni posición inicial
                if (this.grid[y][x] !== 1 && !this._arraysEqual([y, x], this.state)) {
                    possibleGoals.push([y, x]);
                }
            }
        }
        
        if (possibleGoals.length > 0) {
            const randomIndex = Math.floor(Math.random() * possibleGoals.length);
            this.goal = possibleGoals[randomIndex];
            console.log(`Objetivo aleatorio: (${this.goal[0]}, ${this.goal[1]})`);
        }
    }

    reset(randomizeGoal = false) {
        this.state = [0, 0];
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        
        // Opcionalmente cambiar el objetivo en cada reset
        if (randomizeGoal) {
            this.randomizeGoal();
        }
        
        return this.state;
    }

    // Calcular recompensa basada en distancia al objetivo
    _getDistanceReward() {
        const dx = Math.abs(this.state[1] - this.goal[1]);
        const dy = Math.abs(this.state[0] - this.goal[0]);
        const distance = dx + dy; // Manhattan distance
        
        // Recompensa inversa a la distancia (más cerca = mejor)
        return -distance * 0.1;
    }

    step(action) {
        if (this.done) {
            return {
                state: this.state,
                goal: this.goal,
                reward: 0,
                done: true
            };
        }

        let newState;

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

        // Verificar obstáculo
        if (this.grid[newState[0]][newState[1]] === 1) {
            newState = this.state;
        }

        this.state = newState;
        this.steps++;

        // Sistema de recompensas Goal-Conditioned
        let reward;
        if (this._arraysEqual(this.state, this.goal)) {
            reward = 10; // Gran recompensa al llegar al objetivo
            this.done = true;
        } else {
            // Recompensa basada en distancia + penalización por paso
            reward = this._getDistanceReward() - 0.1;
        }

        this.totalReward += reward;

        return {
            state: this.state,
            goal: this.goal,
            reward: reward,
            done: this.done
        };
    }

    getValidActions() {
        return [0, 1, 2, 3];
    }

    render(canvas, showGoalSelector = false) {
        const ctx = canvas.getContext('2d');
        const cellSize = Math.min(600 / Math.max(this.width, this.height), 50);
        
        canvas.width = this.width * cellSize;
        canvas.height = this.height * cellSize;

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

        // Highlight en hover si está en modo selector
        if (showGoalSelector) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid[y][x] !== 1) {
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
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

        // Dibujar camino óptimo estimado (Manhattan)
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(
            this.state[1] * cellSize + cellSize / 2,
            this.state[0] * cellSize + cellSize / 2
        );
        ctx.lineTo(
            this.goal[1] * cellSize + cellSize / 2,
            this.goal[0] * cellSize + cellSize / 2
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Dibujar objetivo (estrella grande dorada)
        ctx.fillStyle = '#FFD700';
        const centerX = this.goal[1] * cellSize + cellSize / 2;
        const centerY = this.goal[0] * cellSize + cellSize / 2;
        const outerRadius = cellSize / 2.5;
        const innerRadius = cellSize / 5;
        const points = 5;
        
        ctx.beginPath();
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
        
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texto "GOAL"
        ctx.fillStyle = '#000';
        ctx.font = `bold ${cellSize / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GOAL', centerX, centerY);

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

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Para que el canvas sea interactivo
    getCellFromCoordinates(x, y, canvas) {
        const cellSize = Math.min(600 / Math.max(this.width, this.height), 50);
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return [gridY, gridX];
        }
        return null;
    }
}

