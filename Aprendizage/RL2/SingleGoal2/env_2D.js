// Entorno Frozen Lake (El Lago Congelado)
// Implementación clásica de RL con agujeros y comportamiento slippery opcional
class FrozenLake {
    constructor(width = 8, height = 8, holePercentage = 0.2, slippery = false, useShapedRewards = true) {
        this.width = width;
        this.height = height;
        this.state = [0, 0]; // Estado inicial del agente (esquina superior izquierda)
        this.goal = [height - 1, width - 1]; // Objetivo en la esquina inferior derecha
        this.holePercentage = holePercentage;
        this.slippery = slippery; // Comportamiento no determinista
        this.useShapedRewards = useShapedRewards; // Recompensas con forma para facilitar aprendizaje
        this.grid = Array(height).fill(0).map(() => Array(width).fill(0)); // 0 = hielo seguro, 1 = agujero, 2 = objetivo
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        this.fellInHole = false;
        this.previousDistance = this._distanceToGoal(this.state);
        this._generateHoles();
    }
    
    // Calcular distancia euclidiana al objetivo
    _distanceToGoal(state) {
        const dy = state[0] - this.goal[0];
        const dx = state[1] - this.goal[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calcular distancia Manhattan al objetivo
    _manhattanDistance(state) {
        return Math.abs(state[0] - this.goal[0]) + Math.abs(state[1] - this.goal[1]);
    }

    _generateHoles() {
        const totalCells = this.width * this.height;
        const holeCount = Math.floor(totalCells * this.holePercentage);
        
        // Crear lista de posiciones posibles (evitar inicio y objetivo)
        const possiblePositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this._arraysEqual([y, x], this.state) && !this._arraysEqual([y, x], this.goal)) {
                    possiblePositions.push([y, x]);
                }
            }
        }

        // Seleccionar posiciones aleatorias para agujeros
        const holes = this._randomSample(possiblePositions, holeCount);
        for (const [y, x] of holes) {
            this.grid[y][x] = 1; // Marcar como agujero
        }
        
        // Marcar objetivo
        this.grid[this.goal[0]][this.goal[1]] = 2;
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
        this.fellInHole = false;
        this.previousDistance = this._distanceToGoal(this.state);
        return this.state;
    }

    // Aplicar comportamiento slippery (no determinista)
    _applySlippery(action) {
        if (!this.slippery) {
            return action; // Sin slippery, acción determinista
        }

        // Con slippery: 33% probabilidad de cada acción (intentada, perpendicular izquierda, perpendicular derecha)
        const rand = Math.random();
        
        // Acciones: 0=Arriba, 1=Abajo, 2=Izquierda, 3=Derecha
        if (rand < 0.33) {
            return action; // Acción intentada
        } else if (rand < 0.67) {
            // Acción perpendicular (izquierda)
            if (action === 0) return 2; // Arriba -> Izquierda
            if (action === 1) return 3; // Abajo -> Derecha
            if (action === 2) return 1; // Izquierda -> Abajo
            if (action === 3) return 0; // Derecha -> Arriba
        } else {
            // Acción perpendicular (derecha)
            if (action === 0) return 3; // Arriba -> Derecha
            if (action === 1) return 2; // Abajo -> Izquierda
            if (action === 2) return 0; // Izquierda -> Arriba
            if (action === 3) return 1; // Derecha -> Abajo
        }
    }

    step(action) {
        if (this.done) {
            return {
                state: this.state,
                reward: 0,
                done: true
            };
        }

        // Aplicar comportamiento slippery si está activado
        const actualAction = this._applySlippery(action);
        
        let newState;

        // Mover al agente en función de la acción
        if (actualAction === 0) { // Arriba
            newState = [Math.max(this.state[0] - 1, 0), this.state[1]];
        } else if (actualAction === 1) { // Abajo
            newState = [Math.min(this.state[0] + 1, this.height - 1), this.state[1]];
        } else if (actualAction === 2) { // Izquierda
            newState = [this.state[0], Math.max(this.state[1] - 1, 0)];
        } else if (actualAction === 3) { // Derecha
            newState = [this.state[0], Math.min(this.state[1] + 1, this.width - 1)];
        } else {
            throw new Error("Acción no válida");
        }

        this.state = newState;
        this.steps++;

        // Sistema de recompensas Frozen Lake:
        let reward = 0;
        
        if (this.grid[this.state[0]][this.state[1]] === 1) {
            // Cayó en un agujero
            reward = -1;
            this.done = true;
            this.fellInHole = true;
        } else if (this._arraysEqual(this.state, this.goal)) {
            // Llegó al objetivo
            reward = 1;
            this.done = true;
        } else {
            // Hielo seguro
            if (this.useShapedRewards) {
                // Recompensas con forma: pequeña recompensa por acercarse al objetivo
                const currentDistance = this._distanceToGoal(this.state);
                const maxDistance = this._distanceToGoal([0, 0]); // Distancia máxima (desde inicio)
                
                // Recompensa proporcional a cuánto se acercó (normalizada)
                const distanceImprovement = this.previousDistance - currentDistance;
                const normalizedReward = (distanceImprovement / maxDistance) * 0.1; // Factor pequeño para no dominar
                
                reward = normalizedReward;
                this.previousDistance = currentDistance;
            } else {
                // Recompensa clásica: 0
                reward = 0;
            }
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

        // Fondo oscuro (azul oscuro como en la imagen)
        ctx.fillStyle = '#1a1a3e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar cuadrícula con líneas blancas delgadas
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

        // Dibujar agujeros (círculos negros)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    const centerX = x * cellSize + cellSize / 2;
                    const centerY = y * cellSize + cellSize / 2;
                    const radius = cellSize / 3;
                    
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Dibujar objetivo (círculo rojo-naranja)
        const goalX = this.goal[1] * cellSize + cellSize / 2;
        const goalY = this.goal[0] * cellSize + cellSize / 2;
        const goalRadius = cellSize / 3;
        
        ctx.fillStyle = '#ff6347'; // Rojo-naranja como en la imagen
        ctx.beginPath();
        ctx.arc(goalX, goalY, goalRadius, 0, Math.PI * 2);
        ctx.fill();

        // Dibujar agente (círculo azul claro)
        const agentX = this.state[1] * cellSize + cellSize / 2;
        const agentY = this.state[0] * cellSize + cellSize / 2;
        const agentRadius = cellSize / 3;
        
        ctx.fillStyle = '#87CEEB'; // Azul claro como en la imagen
        ctx.beginPath();
        ctx.arc(agentX, agentY, agentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Dibujar texto "SINGLE-GOAL" en la parte inferior (centro)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, cellSize / 4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('SINGLE-GOAL', canvas.width / 2, canvas.height - 5);
    }
}

// Mantener compatibilidad con el nombre anterior
class Environment2D extends FrozenLake {
    constructor(width, height, obstaclePercentage = 0) {
        // Convertir obstaclePercentage a holePercentage
        super(width, height, obstaclePercentage, false);
    }
}
