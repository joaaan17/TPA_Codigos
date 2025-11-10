/**
 * Mountain Car Environment
 * Implementación del clásico problema de RL
 */

class MountainCarEnvironment {
    constructor() {
        // Parámetros del entorno
        this.minPosition = -1.2;
        this.maxPosition = 0.6;
        this.maxSpeed = 0.07;
        this.goalPosition = 0.5;
        this.goalVelocity = 0.0;
        
        // Parámetros de física
        this.power = 0.001;
        this.gravity = 0.0025;
        
        // Estado actual
        this.position = 0;
        this.velocity = 0;
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        
        // Límites del episodio
        this.maxSteps = 400;
        
        // Canvas y renderizado
        this.canvas = document.getElementById('mountainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Inicializar
        this.reset();
    }
    
    setupCanvas() {
        // Tamaño del canvas (más grande, sin fondo)
        this.canvas.width = 1400;
        this.canvas.height = 600;
    }
    
    reset() {
        // Posición inicial aleatoria entre -0.6 y -0.4
        this.position = -0.6 + Math.random() * 0.2;
        this.velocity = 0;
        this.steps = 0;
        this.totalReward = 0;
        this.done = false;
        
        this.render();
        this.updateDisplay();
        
        return this.getState();
    }
    
    getState() {
        return {
            position: this.position,
            velocity: this.velocity,
            steps: this.steps,
            totalReward: this.totalReward,
            done: this.done
        };
    }
    
    // Función de altura de la montaña (curva sinusoidal)
    heightFunction(x) {
        return Math.sin(3 * x) * 0.45 + 0.55;
    }
    
    step(action) {
        // Validar acción
        if (![0, 1, 2].includes(action)) {
            throw new Error('Acción inválida. Debe ser 0, 1 o 2');
        }
        
        if (this.done) {
            console.warn('El episodio ya terminó. Llama a reset() primero.');
            return this.getState();
        }
        
        // Calcular fuerza según la acción
        // 0: acelerar izquierda (-1), 1: no acelerar (0), 2: acelerar derecha (1)
        const force = action - 1;
        
        // Actualizar velocidad
        this.velocity += force * this.power - Math.cos(3 * this.position) * this.gravity;
        
        // Limitar velocidad
        this.velocity = Math.max(-this.maxSpeed, Math.min(this.velocity, this.maxSpeed));
        
        // Actualizar posición
        this.position += this.velocity;
        
        // Limitar posición (colisiones inelásticas)
        if (this.position < this.minPosition) {
            this.position = this.minPosition;
            this.velocity = 0;
        }
        if (this.position > this.maxPosition) {
            this.position = this.maxPosition;
            this.velocity = 0;
        }
        
        // Incrementar pasos
        this.steps++;
        
        // Sistema de recompensas mejorado pero más simple
        let reward = -1; // Penalización base por tiempo
        
        // REWARD SHAPING: Bonus por estar más cerca de la meta
        // Solo basado en posición, NO en velocidad (que causaba problemas)
        const distanceToGoal = this.goalPosition - this.position;
        const maxDistance = this.goalPosition - this.minPosition;
        
        // Pequeño bonus proporcional a qué tan cerca está (0 a 0.5)
        const progressBonus = (1 - distanceToGoal / maxDistance) * 0.5;
        reward += progressBonus;
        
        // Verificar si llegó a la meta
        if (this.position >= this.goalPosition) {
            this.done = true;
            reward += 100; // Gran recompensa por éxito
        }
        
        // Verificar si se acabó el tiempo
        if (this.steps >= this.maxSteps) {
            this.done = true;
        }
        
        this.totalReward += reward;
        
        // Renderizar
        this.render();
        this.updateDisplay();
        
        return {
            state: this.getState(),
            reward: reward,
            done: this.done
        };
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Limpiar canvas con fondo oscuro tipo atardecer/noche
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a3e'); // Azul oscuro arriba
        gradient.addColorStop(1, '#2d1b3d'); // Púrpura oscuro abajo
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Dibujar estrellas en el fondo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
            const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height * 0.4;
            const size = Math.abs(Math.sin(i * 456.789)) * 2 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Dibujar montaña con colores oscuros
        ctx.fillStyle = '#3d3d5c'; // Color tierra oscuro/gris-púrpura
        ctx.strokeStyle = '#5a5a7a'; // Contorno gris-azulado
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        
        // Escala para mapear posiciones a canvas
        const scaleX = width / (this.maxPosition - this.minPosition);
        const scaleY = height * 0.6;
        
        // Dibujar curva de la montaña
        for (let x = this.minPosition; x <= this.maxPosition; x += 0.01) {
            const canvasX = (x - this.minPosition) * scaleX;
            const y = this.heightFunction(x);
            const canvasY = height - y * scaleY - 50;
            
            if (x === this.minPosition) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        
        // Completar el polígono (cerrar por abajo)
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Dibujar línea decorativa en la montaña (estilo neón)
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = this.minPosition; x <= this.maxPosition; x += 0.01) {
            const canvasX = (x - this.minPosition) * scaleX;
            const y = this.heightFunction(x);
            const canvasY = height - y * scaleY - 50;
            
            if (x === this.minPosition) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        ctx.stroke();
        
        // Dibujar bandera en la meta
        const goalCanvasX = (this.goalPosition - this.minPosition) * scaleX;
        const goalY = this.heightFunction(this.goalPosition);
        const goalCanvasY = height - goalY * scaleY - 50;
        
        // Poste de la bandera
        ctx.strokeStyle = '#764ba2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(goalCanvasX, goalCanvasY);
        ctx.lineTo(goalCanvasX, goalCanvasY - 40);
        ctx.stroke();
        
        // Bandera (triángulo) con efecto neón
        const flagGradient = ctx.createLinearGradient(goalCanvasX, goalCanvasY - 40, goalCanvasX + 30, goalCanvasY - 30);
        flagGradient.addColorStop(0, '#FFD700');
        flagGradient.addColorStop(1, '#FFA500');
        ctx.fillStyle = flagGradient;
        ctx.beginPath();
        ctx.moveTo(goalCanvasX, goalCanvasY - 40);
        ctx.lineTo(goalCanvasX + 30, goalCanvasY - 30);
        ctx.lineTo(goalCanvasX, goalCanvasY - 20);
        ctx.closePath();
        ctx.fill();
        
        // Brillo en la bandera
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD700';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Dibujar el coche
        const carCanvasX = (this.position - this.minPosition) * scaleX;
        const carY = this.heightFunction(this.position);
        const carCanvasY = height - carY * scaleY - 50;
        
        // Calcular ángulo de la pendiente usando la derivada analítica
        // heightFunction(x) = sin(3*x) * 0.45 + 0.55
        // derivada: 3 * cos(3*x) * 0.45
        const slope = 3 * Math.cos(3 * this.position) * 0.45;
        const angle = -Math.atan(slope); // Negamos porque Y está invertido en canvas
        
        ctx.save();
        ctx.translate(carCanvasX, carCanvasY);
        ctx.rotate(angle);
        
        // Cuerpo del coche con gradiente
        const carWidth = 30;
        const carHeight = 15;
        const wheelRadius = 5;
        const carBottomOffset = -wheelRadius; // El cuerpo empieza justo sobre las ruedas
        
        const carGradient = ctx.createLinearGradient(-carWidth/2, carBottomOffset - carHeight, carWidth/2, carBottomOffset - carHeight);
        carGradient.addColorStop(0, '#667eea');
        carGradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = carGradient;
        ctx.fillRect(-carWidth/2, carBottomOffset - carHeight, carWidth, carHeight);
        
        // Ventanas oscuras
        ctx.fillStyle = 'rgba(20, 20, 35, 0.8)';
        ctx.fillRect(-carWidth/2 + 3, carBottomOffset - carHeight + 2, 10, 8);
        ctx.fillRect(carWidth/2 - 13, carBottomOffset - carHeight + 2, 10, 8);
        
        // Ruedas (centradas en y=0 para que toquen la superficie)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-carWidth/2 + 6, 0, wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(carWidth/2 - 6, 0, wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Dibujar indicador de velocidad (flecha)
        if (Math.abs(this.velocity) > 0.001) {
            const arrowLength = Math.abs(this.velocity) * 500;
            const arrowDirection = this.velocity > 0 ? 1 : -1;
            
            ctx.strokeStyle = this.velocity > 0 ? '#00FF00' : '#FF00FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(carCanvasX, carCanvasY - 40);
            ctx.lineTo(carCanvasX + arrowDirection * arrowLength, carCanvasY - 40);
            ctx.stroke();
            
            // Punta de flecha
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(carCanvasX + arrowDirection * arrowLength, carCanvasY - 40);
            ctx.lineTo(carCanvasX + arrowDirection * (arrowLength - 10), carCanvasY - 45);
            ctx.lineTo(carCanvasX + arrowDirection * (arrowLength - 10), carCanvasY - 35);
            ctx.closePath();
            ctx.fill();
        }
        
        // Texto de estado con colores claros
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Posición: ${this.position.toFixed(3)}`, 10, 30);
        ctx.fillText(`Velocidad: ${this.velocity.toFixed(4)}`, 10, 50);
        ctx.fillText(`Pasos: ${this.steps}`, 10, 70);
        
        // Si llegó a la meta
        if (this.done && this.position >= this.goalPosition) {
            ctx.fillStyle = 'rgba(102, 126, 234, 0.6)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFD700';
            ctx.fillText('¡META ALCANZADA!', width/2, height/2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`En ${this.steps} pasos`, width/2, height/2 + 40);
        } else if (this.done) {
            ctx.fillStyle = 'rgba(118, 75, 162, 0.4)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff6b6b';
            ctx.fillText('Tiempo agotado', width/2, height/2);
            ctx.shadowBlur = 0;
        }
        
        ctx.textAlign = 'left';
    }
    
    updateDisplay() {
        document.getElementById('positionValue').textContent = this.position.toFixed(3);
        document.getElementById('velocityValue').textContent = this.velocity.toFixed(4);
        document.getElementById('stepsValue').textContent = this.steps;
        document.getElementById('rewardValue').textContent = this.totalReward;
    }
    
    // Método para discretizar el estado (útil para Q-learning)
    discretizeState(positionBins = 20, velocityBins = 20) {
        const positionBin = Math.floor(
            (this.position - this.minPosition) / (this.maxPosition - this.minPosition) * positionBins
        );
        const velocityBin = Math.floor(
            (this.velocity + this.maxSpeed) / (2 * this.maxSpeed) * velocityBins
        );
        
        // Asegurar que los bins estén en rango
        const posBin = Math.max(0, Math.min(positionBins - 1, positionBin));
        const velBin = Math.max(0, Math.min(velocityBins - 1, velocityBin));
        
        return `${posBin}_${velBin}`;
    }
}

// Variables globales
let env = null;
let manualMode = true;
let currentAction = 1; // Neutral por defecto

// Inicializar el entorno al cargar la página
window.addEventListener('load', () => {
    env = new MountainCarEnvironment();
    addLog('Entorno Mountain Car inicializado correctamente');
});

// Control manual
function manualAction(action) {
    if (!env) return;
    
    if (env.done) {
        addLog('Episodio terminado. Reinicia el entorno para continuar.');
        return;
    }
    
    const result = env.step(action);
    
    if (result.done) {
        if (env.position >= env.goalPosition) {
            addLog(`¡META ALCANZADA! en ${env.steps} pasos (Recompensa: ${env.totalReward})`);
        } else {
            addLog(`Tiempo agotado en ${env.steps} pasos (Recompensa: ${env.totalReward})`);
        }
    }
}

function releaseAction() {
    // No hacer nada en modo manual
}

function resetEnvironment() {
    if (!env) {
        env = new MountainCarEnvironment();
    } else {
        env.reset();
    }
    addLog('Entorno reiniciado');
}

// Función de utilidad para agregar logs
function addLog(message) {
    const logContainer = document.getElementById('logContainer');
    
    // Si no existe el contenedor de logs, simplemente no hacer nada
    if (!logContainer) {
        console.log(`[Mountain Car] ${message}`);
        return;
    }
    
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    const timestamp = new Date().toLocaleTimeString();
    logLine.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(logLine);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Limitar a 100 líneas
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

