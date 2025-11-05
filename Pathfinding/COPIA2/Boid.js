// ========== CLASE BOID (Comportamiento de Bandada) ==========

class Boid {
    constructor(x, y, path) {
        this.position = { x, y }; // Posición en píxeles
        this.velocity = { x: 0, y: 0 }; // Velocidad
        this.acceleration = { x: 0, y: 0 }; // Aceleración
        
        this.maxSpeed = 0.8; // Velocidad máxima (reducida para movimiento más lento y suave)
        this.maxForce = 0.06; // Fuerza máxima de steering (reducida para movimientos más suaves)
        
        this.angle = 0; // Ángulo actual de orientación
        this.targetAngle = 0; // Ángulo objetivo
        this.angleVelocity = 0; // Velocidad de cambio de ángulo (para suavidad)
        this.smoothedVelocity = { x: 0, y: 0 }; // Velocidad suavizada para cálculo de ángulo
        
        this.isActive = true; // Indica si el boid está activo (visible)
        
        this.path = path; // Path encontrado por el pathfinding
        this.pathIndex = 0; // Índice actual en el path
        this.pathTarget = null; // Punto objetivo actual en el path
        
        this.size = 8; // Tamaño del boid
        this.neighborDistance = 50; // Distancia para considerar vecinos
        
        this.updatePathTarget();
    }
    
    // Actualizar el objetivo en el path
    updatePathTarget() {
        // Si no hay path, no hacer nada
        if (!this.path || this.path.length === 0) {
            this.pathTarget = null;
            return;
        }
        
        // Validar pathIndex
        if (this.pathIndex < 0 || this.pathIndex >= this.path.length) {
            this.pathIndex = 0; // Resetear si está fuera de rango
        }
        
        // LOOKAHEAD MEJORADO: Mirar más adelante en el path para anticipar cambios
        // Esto suaviza las transiciones cuando el boid pasa de un nodo a otro
        const lookAheadDistance = 1; // Número de nodos hacia adelante a mirar
        let targetIndex = this.pathIndex + 1;
        
        // Buscar un nodo varios pasos adelante si es posible
        if (targetIndex < this.path.length - 1) {
            // Calcular la distancia acumulada desde el nodo actual
            let accumulatedDistance = 0;
            const minLookAheadDistance = CONFIG.CELL_SIZE * 2.5; // Distancia mínima para look-ahead
            
            for (let i = this.pathIndex; i < this.path.length - 1 && i < this.pathIndex + lookAheadDistance; i++) {
                const current = this.path[i];
                const next = this.path[i + 1];
                const dx = (next.x - current.x) * CONFIG.CELL_SIZE;
                const dy = (next.y - current.y) * CONFIG.CELL_SIZE;
                accumulatedDistance += Math.sqrt(dx * dx + dy * dy);
                
                if (accumulatedDistance >= minLookAheadDistance) {
                    targetIndex = i + 1;
                    break;
                }
                targetIndex = i + 1;
            }
        }
        
        // Si llegamos al final del path, usar el último nodo
        if (targetIndex >= this.path.length) {
            targetIndex = this.path.length - 1;
        }
        
        const target = this.path[targetIndex];
        this.pathTarget = {
            x: target.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            y: target.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
        };
        
        // Log para debug (ocasional)
        if (Math.random() < 0.05) { // 5% de probabilidad
            const lastNode = this.path[this.path.length - 1];
            console.log(`[Boid updatePathTarget] pathIndex: ${this.pathIndex}/${this.path.length - 1}, lookahead: ${targetIndex}, pathTarget: (${this.pathTarget.x.toFixed(1)}, ${this.pathTarget.y.toFixed(1)}), último nodo path: (${lastNode.x}, ${lastNode.y})`);
        }
    }
    
    // Calcular la distancia hasta el punto objetivo
    distanceToTarget() {
        if (!this.pathTarget) return Infinity;
        const dx = this.pathTarget.x - this.position.x;
        const dy = this.pathTarget.y - this.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Verificar si llegó al punto objetivo (TOLERANCIA REDUCIDA)
    hasReachedTarget() {
        return this.distanceToTarget() < CONFIG.CELL_SIZE * 0.8; // Tolerancia más estricta
    }
    
    // Avanzar en el path si ha llegado al objetivo
    advanceInPath() {
        // Siempre verificar si debemos avanzar en el path
        if (this.hasReachedTarget() && this.pathIndex < this.path.length - 1) {
            this.pathIndex++;
            this.updatePathTarget();
        }
    }
    
    // Calcular fuerza de seguimiento con "ARRIVAL" behavior (más natural)
    seek(target) {
        const desired = {
            x: target.x - this.position.x,
            y: target.y - this.position.y
        };
        
        const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        
        let desiredSpeed = this.maxSpeed;
        
        // ARRIVAL BEHAVIOR: Reducir velocidad gradualmente al acercarse al objetivo
        // Esto previene frenadas bruscas y oscilaciones
        const arrivalRadius = CONFIG.CELL_SIZE * 1.5; // Radio donde empieza a frenar
        if (distance < arrivalRadius && distance > 0) {
            // Escalar velocidad proporcionalmente a la distancia
            // Más cerca = más lento
            desiredSpeed = (distance / arrivalRadius) * this.maxSpeed;
            // Velocidad mínima para evitar detenerse completamente antes de llegar
            desiredSpeed = Math.max(desiredSpeed, this.maxSpeed * 0.3);
        }
        
        // Normalizar y escalar con velocidad deseada
        if (distance > 0) {
            desired.x = (desired.x / distance) * desiredSpeed;
            desired.y = (desired.y / distance) * desiredSpeed;
        }
        
        // Calcular steering force
        const steer = {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
        
        // Limitar la fuerza de steering
        const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (steerMag > this.maxForce) {
            steer.x = (steer.x / steerMag) * this.maxForce;
            steer.y = (steer.y / steerMag) * this.maxForce;
        }
        
        return steer;
    }
    
    // Comportamiento de separación MEJORADO (más natural y suave)
    separation(boids, weight = 1.0) {
        const desiredSeparation = 35.0; // Distancia deseada de separación (reducida ligeramente)
        const separationRadius = 50.0; // Radio máximo de detección de separación
        
        let steer = { x: 0, y: 0 };
        let count = 0;
        
        // Normalizar la velocidad actual para obtener la dirección de movimiento
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        const dirX = speed > 0 ? this.velocity.x / speed : 0;
        const dirY = speed > 0 ? this.velocity.y / speed : 0;
        
        for (let boid of boids) {
            // IGNORAR boids inactivos y a sí mismo
            if (!boid.isActive || boid === this) continue;
            
            const d = this.distanceTo(boid);
            
            // Solo considerar boids dentro del radio de separación
            if (d > 0 && d < separationRadius) {
                const diff = {
                    x: this.position.x - boid.position.x,
                    y: this.position.y - boid.position.y
                };
                
                const mag = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
                if (mag > 0) {
                    // DECAIMIENTO SUAVE POR DISTANCIA (exponencial inverso)
                    // Cuando más cerca está, más fuerte es la repulsión
                    const normalizedDistance = d / desiredSeparation;
                    
                    // Usar una función que genera más fuerza cuando están muy cerca
                    // Esto permite que el slider tenga efecto real
                    let strength;
                    if (normalizedDistance < 1.0) {
                        // Muy cerca: fuerza inversa cuadrática más fuerte
                        // Aumentar el multiplicador para más fuerza
                        strength = (1.0 / (normalizedDistance * normalizedDistance)) - 1.0;
                        strength = Math.min(strength, 8.0); // Aumentado de 3.0 a 8.0 para más separación
                    } else {
                        // Más lejos: fuerza suave que decae gradualmente
                        const excess = normalizedDistance - 1.0;
                        strength = 1.0 / (1.0 + excess * 3.0); // Decaimiento más suave
                    }
                    
                    // Calcular si el vecino está a los lados (perpendicular al movimiento)
                    // Esto ayuda a formar filas en lugar de grupos
                    const dotProduct = (diff.x * dirX + diff.y * dirY) / mag;
                    const perpendicular = Math.abs(Math.sqrt(Math.max(0, 1 - dotProduct * dotProduct)));
                    
                    // Aplicar más fuerza lateral, menos fuerza frontal/trasera
                    // Pero más suave que antes
                    let sideWeight = 0.5 + (perpendicular * 0.5); // Entre 0.5 y 1.0
                    
                    // Aplicar fuerza con suavizado direccional
                    const finalStrength = strength * sideWeight;
                    steer.x += (diff.x / mag) * finalStrength;
                    steer.y += (diff.y / mag) * finalStrength;
                    count++;
                }
            }
        }
        
        // PROMEDIAR Y APLICAR PESO
        if (count > 0) {
            steer.x = (steer.x / count) * weight;
            steer.y = (steer.y / count) * weight;
            
            // ESCALADO DINÁMICO basado en número de vecinos
            // Con muchos vecinos, la fuerza ya está promediada, pero podemos ajustar ligeramente
            // Sin embargo, NO limitamos demasiado para que el peso del slider tenga efecto
            if (count > 8) {
                // Solo reducimos ligeramente cuando hay MUCHOS vecinos (más de 8)
                const neighborScale = Math.max(0.7, 1.0 - (count - 8) * 0.05);
                steer.x *= neighborScale;
                steer.y *= neighborScale;
            }
            
            // LÍMITE más generoso para permitir que el slider tenga efecto real
            // El límite ahora escala con el peso del slider
            const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            // Permitir más fuerza cuando el peso es alto
            const maxSeparationForce = this.maxForce * (2.0 + weight * 0.5);
            
            if (steerMag > maxSeparationForce) {
                steer.x = (steer.x / steerMag) * maxSeparationForce;
                steer.y = (steer.y / steerMag) * maxSeparationForce;
            }
        }
        
        return steer;
    }
    
    // Comportamiento de alineación (MEJORADO)
    align(boids, weight = 1.0) {
        const neighborDist = 60; // Rango aumentado para mejor alineación
        let sum = { x: 0, y: 0 };
        let count = 0;
        
        for (let boid of boids) {
            // IGNORAR boids inactivos (ya llegaron al destino)
            if (!boid.isActive) continue;
            
            const d = this.distanceTo(boid);
            if (d > 0 && d < neighborDist) {
                // Normalizar la velocidad para que solo importe la dirección
                const speed = Math.sqrt(boid.velocity.x * boid.velocity.x + boid.velocity.y * boid.velocity.y);
                if (speed > 0) {
                    sum.x += boid.velocity.x / speed; // Dirección normalizada
                    sum.y += boid.velocity.y / speed;
                }
                count++;
            }
        }
        
        if (count > 0) {
            // Normalizar la suma
            const magnitude = Math.sqrt(sum.x * sum.x + sum.y * sum.y);
            if (magnitude > 0) {
                sum.x = (sum.x / magnitude) * this.maxForce * weight;
                sum.y = (sum.y / magnitude) * this.maxForce * weight;
            }
        }
        
        return sum;
    }
    
    // Comportamiento de cohesión
    cohesion(boids, weight = 1.0) {
        const neighborDist = 50;
        let sum = { x: 0, y: 0 };
        let count = 0;
        
        for (let boid of boids) {
            // IGNORAR boids inactivos (ya llegaron al destino)
            if (!boid.isActive) continue;
            
            const d = this.distanceTo(boid);
            if (d > 0 && d < neighborDist) {
                sum.x += boid.position.x;
                sum.y += boid.position.y;
                count++;
            }
        }
        
        if (count > 0) {
            sum.x = sum.x / count;
            sum.y = sum.y / count;
            
            // Buscar hacia el centro
            const seekForce = this.seek(sum, Infinity);
            return {
                x: seekForce.x * weight,
                y: seekForce.y * weight
            };
        }
        
        return { x: 0, y: 0 };
    }
    
    // Calcular distancia a otro boid
    distanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Actualizar el boid (ULTRA SIMPLIFICADO)
    update(boids, fSeparacion, fAlineacion, fCohesion, obstacles) {
        // Si ya llegó al destino, desactivar y no actualizar
        if (this.hasReachedDestination()) {
            this.isActive = false;
            return; // No actualizar más este boid
        }
        
        // AVANZAR EN EL PATH PRIMERO (antes de calcular fuerzas)
        this.advanceInPath();
        
        // Contar vecinos cercanos para ajuste dinámico de alineación
        // SOLO contar boids activos (no los que ya llegaron)
        let neighborCount = 0;
        const neighborDetectionDist = 60;
        for (let boid of boids) {
            if (!boid.isActive) continue; // Saltar boids inactivos
            const d = this.distanceTo(boid);
            if (d > 0 && d < neighborDetectionDist) {
                neighborCount++;
            }
        }
        
        // ALINEACIÓN DINÁMICA: aumenta cuando hay más vecinos cerca
        // Si hay 3 o más vecinos, alineación es más fuerte
        const baseAlignment = 0.3;
        const dynamicAlignment = baseAlignment + (neighborCount * 0.2); // +0.2 por cada vecino
        const w_Alineacion = Math.min(dynamicAlignment, 2.0); // Máximo 2.0
        
        // PRIORIDAD ABSOLUTA AL PATH - flocking como ajuste mínimo
        const w_Path = 50.0;       // Path following es 50x más importante
        
        // AJUSTE DINÁMICO DE SEPARACIÓN basado en densidad y distancia al objetivo
        const distanceToGoal = this.hasReachedDestination() ? 0 : this.distanceToTarget();
        const goalRadius = 100; // Radio donde se reduce la separación
        
        // Reducir separación cerca del destino
        const separationReduction = distanceToGoal < goalRadius ? (distanceToGoal / goalRadius) * 1.5 : 0;
        
        // USAR DIRECTAMENTE EL PESO DEL SLIDER (fSeparacion) como base
        // Escalarlo para que tenga efecto real, pero permitir que el slider controle el comportamiento
        let w_Separacion = fSeparacion * 0.8; // Escalar ligeramente para mejor balance
        
        // Reducir solo ligeramente cuando hay MUY MUCHOS vecinos (más de 15)
        if (neighborCount > 15) {
            w_Separacion *= (1.0 - (neighborCount - 15) * 0.02);
            w_Separacion = Math.max(w_Separacion, fSeparacion * 0.4); // Mínimo 40% del valor del slider
        }
        
        // Reducir cerca del destino, pero mantener al menos 30% del valor del slider
        w_Separacion = Math.max(fSeparacion * 0.3, w_Separacion - separationReduction);
        
        const w_Cohesion = 0.1;   // Cohesión muy reducida (queremos fila única, no agrupamiento)
        
        // 1. Fuerza de seguimiento del path
        let pathForce = { x: 0, y: 0 };
        if (this.pathTarget && this.path) {
            pathForce = this.seek(this.pathTarget);
        }
        
        // 2. Fuerzas de flocking (MUY REDUCIDAS)
        const sep = this.separation(boids, fSeparacion);
        const ali = this.align(boids, fAlineacion);
        const coh = this.cohesion(boids, fCohesion);
        
        // Aplicar fuerzas (path es dominante)
        this.acceleration.x = 
            w_Path * pathForce.x + 
            w_Separacion * sep.x + 
            w_Alineacion * ali.x + 
            w_Cohesion * coh.x;
            
        this.acceleration.y = 
            w_Path * pathForce.y + 
            w_Separacion * sep.y + 
            w_Alineacion * ali.y + 
            w_Cohesion * coh.y;
        
        // CRÍTICO: Limitar la aceleración total para evitar comportamientos erráticos
        // Esto es especialmente importante cuando hay muchas fuerzas actuando
        const accelMag = Math.sqrt(this.acceleration.x ** 2 + this.acceleration.y ** 2);
        const maxAcceleration = this.maxForce * 3.0; // Límite razonable de aceleración
        
        if (accelMag > maxAcceleration) {
            this.acceleration.x = (this.acceleration.x / accelMag) * maxAcceleration;
            this.acceleration.y = (this.acceleration.y / accelMag) * maxAcceleration;
        }
        
        // Actualizar velocidad
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        
        // Limitar velocidad
        let speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
            speed = this.maxSpeed; // Actualizar speed después de limitar
        }
        
        // Actualizar posición
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Actualizar ángulo con suavidad mejorada
        if (speed > 0.1) {
            // SUAVIZAR LA VELOCIDAD antes de calcular el ángulo
            // Esto previene cambios bruscos en la orientación cuando la velocidad cambia rápidamente
            const velocitySmoothing = 0.3; // Factor de suavizado para la velocidad (0.0-1.0)
            this.smoothedVelocity.x += (this.velocity.x - this.smoothedVelocity.x) * velocitySmoothing;
            this.smoothedVelocity.y += (this.velocity.y - this.smoothedVelocity.y) * velocitySmoothing;
            
            // Calcular el ángulo objetivo basado en la VELOCIDAD SUAVIZADA
            // Esto hace que el ángulo cambie más gradualmente
            const smoothedSpeed = Math.sqrt(this.smoothedVelocity.x ** 2 + this.smoothedVelocity.y ** 2);
            if (smoothedSpeed > 0.05) {
                this.targetAngle = Math.atan2(this.smoothedVelocity.y, this.smoothedVelocity.x);
            }
            
            // Calcular la diferencia angular más corta
            let angleDiff = this.targetAngle - this.angle;
            
            // Normalizar el ángulo a [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // APLICAR INTERPOLACIÓN MÁS SUAVE
            // Aumentar el smoothing y mejorar el damping para rotaciones más fluidas
            const smoothing = 0.08; // Reducido de 0.15 para cambios más graduales
            const maxAngleVelocity = 0.15; // Limitar la velocidad máxima de rotación (rad/frame)
            
            this.angleVelocity += angleDiff * smoothing;
            
            // Limitar la velocidad angular máxima para evitar rotaciones bruscas
            if (this.angleVelocity > maxAngleVelocity) this.angleVelocity = maxAngleVelocity;
            if (this.angleVelocity < -maxAngleVelocity) this.angleVelocity = -maxAngleVelocity;
            
            // Damping más fuerte para evitar oscilaciones
            this.angleVelocity *= 0.85; // Aumentado de 0.8 para más amortiguación
            
            this.angle += this.angleVelocity;
        } else {
            // Si la velocidad es muy baja, no actualizar el ángulo para evitar temblores
            this.smoothedVelocity.x *= 0.9;
            this.smoothedVelocity.y *= 0.9;
        }
        
        // Limpiar aceleración
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        
        // Envolver en los bordes del canvas
        this.wrap();
    }
    
    // Evitar los bordes de la cuadrícula
    avoidBoundaries() {
        const steerForce = { x: 0, y: 0 };
        const margin = 30; // Distancia desde el borde antes de aplicar fuerza
        const maxForce = this.maxForce * 2;
        
        // Borde izquierdo
        if (this.position.x < margin) {
            const strength = (margin - this.position.x) / margin;
            steerForce.x += strength * maxForce;
        }
        
        // Borde derecho
        if (this.position.x > canvas.width - margin) {
            const strength = (this.position.x - (canvas.width - margin)) / margin;
            steerForce.x -= strength * maxForce;
        }
        
        // Borde superior
        if (this.position.y < margin) {
            const strength = (margin - this.position.y) / margin;
            steerForce.y += strength * maxForce;
        }
        
        // Borde inferior
        if (this.position.y > canvas.height - margin) {
            const strength = (this.position.y - (canvas.height - margin)) / margin;
            steerForce.y -= strength * maxForce;
        }
        
        return steerForce;
    }
    
    // Envolver en los bordes (desactivado para evitar salir)
    wrap() {
        // Mantener dentro de los límites del canvas
        const margin = 5;
        if (this.position.x > canvas.width - margin) {
            this.position.x = canvas.width - margin;
            this.velocity.x *= -0.5;
        }
        if (this.position.x < margin) {
            this.position.x = margin;
            this.velocity.x *= -0.5;
        }
        if (this.position.y > canvas.height - margin) {
            this.position.y = canvas.height - margin;
            this.velocity.y *= -0.5;
        }
        if (this.position.y < margin) {
            this.position.y = margin;
            this.velocity.y *= -0.5;
        }
    }
    
    // Dibujar el boid
    draw(ctx) {
        // Solo dibujar si está activo
        if (!this.isActive) {
            return;
        }
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Usar el ángulo suavizado (no el ángulo directo de la velocidad)
        ctx.rotate(this.angle);
        
        // Dibujar el triángulo del boid
        ctx.fillStyle = CONFIG.START_COLOR;
        ctx.beginPath();
        ctx.moveTo(this.size, 0); // Punta del triángulo
        ctx.lineTo(-this.size, -this.size / 2);
        ctx.lineTo(-this.size, this.size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Dibujar un pequeño punto en el centro
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Evitar obstáculos (versión mejorada)
    avoidObstacles(obstacles) {
        let steerForce = { x: 0, y: 0 };
        const lookAhead = 50; // Distancia de anticipación aumentada
        const obstacleRadius = CONFIG.CELL_SIZE * 0.6; // Radio más grande para detectar antes
        
        // Calcular velocidad normalizada con mínima de seguridad
        let normalizedVelocity = {
            x: this.velocity.x,
            y: this.velocity.y
        };
        const speed = Math.sqrt(normalizedVelocity.x ** 2 + normalizedVelocity.y ** 2);
        
        // Si no hay velocidad, usar la dirección hacia el objetivo
        if (speed === 0 && this.pathTarget) {
            const targetDx = this.pathTarget.x - this.position.x;
            const targetDy = this.pathTarget.y - this.position.y;
            const targetDist = Math.sqrt(targetDx ** 2 + targetDy ** 2);
            if (targetDist > 0) {
                normalizedVelocity.x = (targetDx / targetDist) * lookAhead;
                normalizedVelocity.y = (targetDy / targetDist) * lookAhead;
            }
        } else if (speed > 0) {
            normalizedVelocity.x = (normalizedVelocity.x / speed) * lookAhead;
            normalizedVelocity.y = (normalizedVelocity.y / speed) * lookAhead;
        }
        
        // Punto futuro donde estará el boid
        const futurePos = {
            x: this.position.x + normalizedVelocity.x,
            y: this.position.y + normalizedVelocity.y
        };
        
        // Punto medio entre actual y futuro para mejor detección
        const midPos = {
            x: this.position.x + normalizedVelocity.x * 0.5,
            y: this.position.y + normalizedVelocity.y * 0.5
        };
        
        // Verificar colisión con obstáculos
        for (const obsKey of obstacles) {
            const [obsX, obsY] = obsKey.split(',').map(Number);
            const obsPixelX = obsX * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            const obsPixelY = obsY * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            
            // Calcular distancia desde múltiples puntos
            const toFutureDx = futurePos.x - obsPixelX;
            const toFutureDy = futurePos.y - obsPixelY;
            const futureDistance = Math.sqrt(toFutureDx ** 2 + toFutureDy ** 2);
            
            const toMidDx = midPos.x - obsPixelX;
            const toMidDy = midPos.y - obsPixelY;
            const midDistance = Math.sqrt(toMidDx ** 2 + toMidDy ** 2);
            
            const currentDx = this.position.x - obsPixelX;
            const currentDy = this.position.y - obsPixelY;
            const currentDistance = Math.sqrt(currentDx ** 2 + currentDy ** 2);
            
            // Usar la distancia mínima de los tres puntos
            const minDistance = Math.min(futureDistance, midDistance, currentDistance);
            
            // Aplicar fuerza si está demasiado cerca
            if (minDistance < obstacleRadius + lookAhead) {
                let forceX, forceY;
                
                // Determinar vector de repulsión basado en la posición más cercana
                if (minDistance === currentDistance) {
                    forceX = -currentDx / currentDistance;
                    forceY = -currentDy / currentDistance;
                } else if (minDistance === midDistance) {
                    forceX = -toMidDx / midDistance;
                    forceY = -toMidDy / midDistance;
                } else {
                    forceX = -toFutureDx / futureDistance;
                    forceY = -toFutureDy / futureDistance;
                }
                
                // Calcular fuerza suave pero efectiva
                const safeDistance = obstacleRadius + lookAhead;
                const strength = Math.max(0, (safeDistance - minDistance) / safeDistance);
                
                // Aplicar fuerza más suave para comportamiento natural
                steerForce.x += forceX * strength * 8;
                steerForce.y += forceY * strength * 8;
            }
        }
        
        // Limitar la fuerza de evitación
        const forceMag = Math.sqrt(steerForce.x ** 2 + steerForce.y ** 2);
        if (forceMag > this.maxForce * 4) {
            steerForce.x = (steerForce.x / forceMag) * this.maxForce * 4;
            steerForce.y = (steerForce.y / forceMag) * this.maxForce * 4;
        }
        
        return steerForce;
    }
    
    // Verificar si el boid está siguiendo el path
    isFollowingPath() {
        return this.path && this.pathIndex < this.path.length - 1;
    }
    
    // Verificar si el boid ha llegado al destino final
    hasReachedDestination() {
        if (!this.path || this.path.length === 0) return false;
        const finalDest = this.path[this.path.length - 1];
        const destX = finalDest.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        const destY = finalDest.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        
        const dx = destX - this.position.x;
        const dy = destY - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const reached = distance < 30; // Tolerancia de 30 píxeles
        
        // Log ocasional para debug (solo cada 60 frames para no saturar)
        if (Math.random() < 0.017) { // ~1/60 probabilidad
            console.log(`[Boid] Verificando destino - posición: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}), destino final: (${destX.toFixed(1)}, ${destY.toFixed(1)}), distancia: ${distance.toFixed(1)}, reached: ${reached}`);
            if (this.path && this.path.length > 0) {
                console.log(`  Último nodo del path: (${this.path[this.path.length - 1].x}, ${this.path[this.path.length - 1].y})`);
            }
        }
        
        return reached;
    }
}

