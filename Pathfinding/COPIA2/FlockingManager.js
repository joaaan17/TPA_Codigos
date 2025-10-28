// ========== GESTOR DE COMPORTAMIENTO DE BANDADA ==========

class FlockingManager {
    constructor() {
        this.boids = []; // Array de boids
        this.isRunning = false; // Estado de la simulación
        this.animationId = null; // ID del loop de animación
        this.isFlockingMode = false; // Modo bandada activo
        
        this.numVehicles = 5;
        this.fSeparacion = 1.0;
        this.fAlineacion = 1.0;
        this.fCohesion = 1.0;
    }
    
    // Iniciar simulación de bandada
    start(numVehicles, fSeparacion, fAlineacion, fCohesion, path) {
        this.stop(); // Detener cualquier simulación previa
        
        this.numVehicles = numVehicles;
        this.fSeparacion = fSeparacion;
        this.fAlineacion = fAlineacion;
        this.fCohesion = fCohesion;
        
        // Crear los boids
        this.boids = [];
        
        if (path && path.length > 0) {
            // Crear boids distribuidos en el inicio del path
            const startNode = path[0];
            const startX = startNode.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            const startY = startNode.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            
            for (let i = 0; i < numVehicles; i++) {
                // Distribuir boids en un pequeño círculo alrededor del punto inicial
                const angle = (Math.PI * 2 / numVehicles) * i;
                const radius = 15;
                const boid = new Boid(
                    startX + Math.cos(angle) * radius,
                    startY + Math.sin(angle) * radius,
                    [...path] // Copiar el path
                );
                this.boids.push(boid);
            }
        }
        
        this.isRunning = true;
        this.animate();
    }
    
    // Detener la simulación
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.boids = [];
    }
    
    // Pausar/Continuar la simulación
    pause() {
        this.isRunning = !this.isRunning;
        if (this.isRunning) {
            this.animate();
        }
    }
    
    // Loop de animación
    animate() {
        if (!this.isRunning) return;
        
        // Obtener obstáculos del scope global (variable obstacles de pathfinding2.js)
        const currentObstacles = typeof obstacles !== 'undefined' ? obstacles : new Set();
        
        // Actualizar cada boid con evitación de obstáculos
        this.boids.forEach(boid => {
            boid.update(this.boids, this.fSeparacion, this.fAlineacion, this.fCohesion, currentObstacles);
        });
        
        // Verificar si todos los boids han llegado al destino final
        // Solo contar boids activos
        const activeBoids = this.boids.filter(boid => boid.isActive);
        const allCompleted = activeBoids.every(boid => !boid.isFollowingPath());
        const allReached = activeBoids.every(boid => boid.hasReachedDestination());
        
        // Si todos los boids activos han llegado, detener la simulación
        if (activeBoids.length > 0 && (allCompleted || allReached)) {
            this.stop();
        }
        
        // Continuar el loop
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // Dibujar todos los boids
    draw(ctx) {
        this.boids.forEach(boid => {
            boid.draw(ctx);
        });
    }
    
    // Actualizar parámetros de la simulación
    updateParameters(fSeparacion, fAlineacion, fCohesion) {
        this.fSeparacion = fSeparacion;
        this.fAlineacion = fAlineacion;
        this.fCohesion = fCohesion;
    }
    
    // Crear boids en una posición específica sin path
    createBoidsAtStart(numVehicles, startX = null, startY = null) {
        console.log('createBoidsAtStart llamado con:', numVehicles, startX, startY);
        this.boids = [];
        
        // Si no se proporcionan coordenadas, usar la posición actual del vehículo
        if (startX === null || startY === null) {
            // Usar la posición de inicio del grid por defecto
            startX = CONFIG.START_POS.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            startY = CONFIG.START_POS.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            console.log('Usando posición por defecto:', startX, startY);
        }
        
        for (let i = 0; i < numVehicles; i++) {
            // Distribuir boids en un pequeño círculo alrededor del punto inicial
            const angle = (Math.PI * 2 / numVehicles) * i;
            const radius = 15;
            const boid = new Boid(
                startX + Math.cos(angle) * radius,
                startY + Math.sin(angle) * radius,
                null // Sin path todavía
            );
            this.boids.push(boid);
        }
        
        console.log('Boids creados:', this.boids.length);
        
        // No iniciar animación aún
        this.isRunning = false;
    }
    
    // Asignar path a los boids existentes
    assignPathToBoids(path) {
        if (this.boids.length === 0) return;
        
        console.log('=== assignPathToBoids llamado ===');
        console.log('Número de boids antes de asignar path:', this.boids.length);
        console.log('Boids activos antes:', this.boids.filter(b => b.isActive).length);
        console.log('Nuevo path recibido, longitud:', path.length);
        console.log('Último nodo del nuevo path:', path[path.length - 1]);
        
        for (let boid of this.boids) {
            const wasActive = boid.isActive;
            
            // CREAR UNA COPIA DEL PATH PARA CADA BOID
            boid.path = [...path];
            boid.pathIndex = 0;
            
            // REACTIVAR EL BOID SI ESTABA DESACTIVADO
            // Esto es crucial: si el boid llegó al destino anterior y se desactivó,
            // necesitamos reactivarlo para que siga el nuevo path
            boid.isActive = true;
            
            boid.updatePathTarget();
            
            if (!wasActive && boid.isActive) {
                console.log(`Boid reactivado en posición (${boid.position.x.toFixed(1)}, ${boid.position.y.toFixed(1)})`);
            }
            
            // Verificar el path asignado
            console.log(`Boid path asignado - path.length: ${boid.path.length}, pathIndex: ${boid.pathIndex}`);
            if (boid.path && boid.path.length > 0) {
                console.log(`  Último nodo del path del boid: (${boid.path[boid.path.length - 1].x}, ${boid.path[boid.path.length - 1].y})`);
            }
        }
        
        console.log('Boids activos después de asignar path:', this.boids.filter(b => b.isActive).length);
        console.log('=== FIN assignPathToBoids ===\n');
        
        // Asegurarse de que la animación esté corriendo
        if (!this.isRunning && this.boids.length > 0) {
            this.isRunning = true;
            this.animate();
        }
    }
    
    // Reiniciar la simulación
    reset() {
        this.stop();
        this.boids = [];
        this.isRunning = false;
        this.isFlockingMode = false;
    }
}

// Instancia global del gestor
let flockingManager = new FlockingManager();

