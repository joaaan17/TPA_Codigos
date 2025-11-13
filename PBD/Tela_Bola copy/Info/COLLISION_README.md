# Colisiones con Esfera para Position-Based Dynamics

## Descripción

Implementación de **colisiones entre partículas y esferas** para telas simuladas con Position-Based Dynamics (PBD).

Esta es una **restricción de desigualdad** que solo se activa cuando una partícula penetra dentro de la esfera, empujándola hacia afuera hasta la superficie. A diferencia de las restricciones internas (distance, bending, shear) que siempre se aplican, las colisiones solo actúan cuando hay penetración.

## Diferencia con Restricciones Internas

| Aspecto | Restricciones Internas | Colisiones |
|---------|----------------------|------------|
| **Tipo** | Igualdad (C = 0) | Desigualdad (C ≥ 0) |
| **Aplicación** | Siempre activas | Solo cuando C < 0 |
| **Partículas** | 2-4 partículas | 1 partícula + objeto externo |
| **Objetivo** | Mantener forma | Prevenir penetración |

## Arquitectura

- **Clase**: `SphereCollision` (NO extiende `Constraint`)
- **Constructor**: `SphereCollision(center, radius)`
- **Método principal**: `project(particles)`
- **Integración**: A través de `PBDSystem.collisionObjects[]`

## Formalización Matemática

### Función de Restricción (Desigualdad)

```
C(p) = (p - center) · n - radius ≥ 0
```

Donde:
- `p` = posición de la partícula
- `center` = centro de la esfera
- `n = normalize(p - center)` = vector normal (dirección desde centro a partícula)
- `radius` = radio de la esfera

**Interpretación:**
- Si `C ≥ 0` → No hay colisión (partícula fuera de la esfera)
- Si `C < 0` → Hay colisión (partícula dentro de la esfera)

### Evaluación de la Colisión

```javascript
// 1. Calcular dirección y distancia
dir = p - center
dist = length(dir)

// 2. Evaluar condición
if (dist >= radius) {
  // No colisión → continue
} else {
  // Colisión → aplicar corrección
}
```

### Cálculo del Vector Normal

```javascript
n = normalize(dir)
```

**Caso límite**: Si `dist == 0` (partícula exactamente en el centro), usar un vector fijo como `(0, 1, 0)` para evitar NaN.

### Cálculo de C(p)

```javascript
C = dist - radius  // Será negativo si hay penetración
```

### Corrección PBD

Para una restricción con un solo punto, la corrección es simple:

```
Δp = -(w / w) * C * n = -C * n
```

Como `w` se cancela, es equivalente a:

```
Δp = (radius - dist) * n
```

Esta fórmula mueve la partícula hacia afuera justo hasta la superficie de la esfera.

## Implementación en Javascript

### Clase Completa

```javascript
class SphereCollision {
  constructor(center, radius) {
    this.center = center.copy(); // p5.Vector
    this.radius = radius; // number
    this.epsilon = 0.0001;
  }
  
  project(particles) {
    for (let i = 0; i < particles.length; i++) {
      let part = particles[i];
      
      if (part.bloqueada) continue;
      
      // 1. Obtener posición
      let p = part.location;
      
      // 2. Calcular dirección y distancia
      let dir = p5.Vector.sub(p, this.center);
      let dist = dir.mag();
      
      // 3. Evaluar colisión
      if (dist >= this.radius) continue;
      
      // 4. Calcular normal (proteger contra dist == 0)
      let n;
      if (dist < this.epsilon) {
        n = createVector(0, 1, 0);
      } else {
        n = dir.normalize();
      }
      
      // 5. Calcular C
      let C = dist - this.radius;
      
      // 6. Aplicar corrección
      let correction = p5.Vector.mult(n, -C);
      part.location.add(correction);
    }
  }
  
  display(scale_px) {
    push();
    translate(scale_px * this.center.x, 
              -scale_px * this.center.y, 
              scale_px * this.center.z);
    fill(255, 100, 100, 150); // Rojo semitransparente
    noStroke();
    sphere(scale_px * this.radius, 16, 16);
    pop();
  }
}
```

## Integración en el Solver

### 1. Añadir `collisionObjects` a PBDSystem

```javascript
class PBDSystem {
  constructor(n, mass) {
    this.particles = [];
    this.constraints = [];
    this.collisionObjects = []; // ← NUEVO
    // ...
  }
  
  add_collision_object(obj) {
    this.collisionObjects.push(obj);
  }
}
```

### 2. Resolver Colisiones en el Loop del Solver

Según Müller et al., las colisiones se resuelven **después** de las restricciones internas en cada iteración:

```javascript
run(dt) {
  // 1. Predicción de posiciones
  for (let i = 0; i < this.particles.length; i++) {
    this.particles[i].update(dt);
  }

  // 2. Bucle de solver
  for (let it = 0; it < this.niters; it++) {
    // 2a. Resolver restricciones internas
    for (let i = 0; i < this.constraints.length; i++) {
      this.constraints[i].proyecta_restriccion();
    }
    
    // 2b. Resolver colisiones ← NUEVO
    for (let i = 0; i < this.collisionObjects.length; i++) {
      this.collisionObjects[i].project(this.particles);
    }
  }
   
  // 3. Actualizar velocidades
  for (let i = 0; i < this.particles.length; i++) {
    this.particles[i].update_pbd_vel(dt);
  }
}
```

### 3. Crear y Añadir Esfera

```javascript
// En setup()
let sphere_center = createVector(1.0, 0.0, 0.0);
let sphere_radius = 0.3;
let sphere = new SphereCollision(sphere_center, sphere_radius);
system.add_collision_object(sphere);
```

## Casos Límite Manejados

### 1. Partícula exactamente en el centro (`dist == 0`)

```javascript
if (dist < this.epsilon) {
  n = createVector(0, 1, 0); // Vector fijo para evitar NaN
}
```

**Por qué ocurre**: Muy raro, pero puede pasar si la esfera se mueve exactamente sobre una partícula.

**Solución**: Usar un vector fijo (empujar hacia arriba por defecto).

### 2. Partículas bloqueadas

```javascript
if (part.bloqueada) continue;
```

Las partículas fijas (como las esquinas de la tela) no deben moverse por colisiones.

### 3. No hay colisión

```javascript
if (dist >= this.radius) continue;
```

Saltar partículas que están fuera de la esfera para mejor performance.

## Controles Interactivos

La esfera se puede mover con el teclado para colisionar con la tela:

```javascript
// Controles implementados en PBD.js
// Eje Y (vertical)
I/K - Mover arriba/abajo

// Eje X (horizontal)
J/L - Mover izquierda/derecha

// Eje Z (profundidad)
U/O - Mover adelante/atrás
```

### Implementación de Controles

```javascript
let sphere_velocity = 0.05; // m/frame

function keyPressed() {
  // Mover esfera - Eje Y
  if (key === 'I' || key === 'i') {
    collisionSphere.center.y += sphere_velocity;
  } else if (key === 'K' || key === 'k') {
    collisionSphere.center.y -= sphere_velocity;
  }
  
  // Mover esfera - Eje X
  if (key === 'J' || key === 'j') {
    collisionSphere.center.x -= sphere_velocity;
  } else if (key === 'L' || key === 'l') {
    collisionSphere.center.x += sphere_velocity;
  }
  
  // Mover esfera - Eje Z
  if (key === 'U' || key === 'u') {
    collisionSphere.center.z -= sphere_velocity;
  } else if (key === 'O' || key === 'o') {
    collisionSphere.center.z += sphere_velocity;
  }
}
```

## Ejemplo de Uso Completo

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Crear tela con restricciones
  system = crea_tela(2.0, 2.0, 0.1, 15, 15, 0.98, 0.05);
  add_bending_constraints(system, 15, 15, 0.1);
  add_shear_constraints(system, 15, 15, 0.1);
  
  // Crear esfera de colisión
  let sphere_center = createVector(1.0, -0.5, 0.0);
  let sphere_radius = 0.3;
  collisionSphere = new SphereCollision(sphere_center, sphere_radius);
  system.add_collision_object(collisionSphere);
  
  system.set_n_iters(5);
}

function draw() {
  background(20, 20, 55);
  orbitControl();
  
  system.apply_gravity(createVector(0.0, -9.81, 0.0));
  system.run(dt);
  
  // Dibujar tela
  display();
  
  // Dibujar esfera (ya incluido en display())
}

function display() {
  // ... dibujar tela ...
  
  // Dibujar objetos de colisión
  for (let i = 0; i < system.collisionObjects.length; i++) {
    system.collisionObjects[i].display(scale_px);
  }
}
```

## Visualización

La esfera se dibuja como:
- **Color**: Rojo semitransparente (255, 100, 100, 150)
- **Geometría**: Esfera con 16 segmentos
- **Propósito**: Visualizar el volumen de colisión

## Performance

Las colisiones con esfera son muy eficientes:
- **Costo por partícula**: O(1) - solo distancia y corrección
- **Costo total**: O(n * k) donde n = partículas, k = objetos de colisión
- Para 225 partículas y 1 esfera: ~225 evaluaciones por iteración
- Con 5 iteraciones: ~1125 evaluaciones por frame (muy rápido)

## Extensiones Opcionales (No Implementadas)

### 1. Fricción y Restitución

```javascript
// Después del update final de posiciones
v = (newPos - oldPos) / dt

// Proyectar velocidad fuera de la esfera
v_normal = dot(v, n) * n
v_tangent = v - v_normal

// Aplicar fricción y restitución
v_normal = -restitution * v_normal
v_tangent = friction * v_tangent

v_final = v_normal + v_tangent
```

### 2. Colisión con Plano

```javascript
class PlaneCollision {
  constructor(point, normal) {
    this.point = point;
    this.normal = normal.normalize();
  }
  
  project(particles) {
    for (let part of particles) {
      let dist = dot(part.location - this.point, this.normal);
      if (dist < 0) {
        part.location.add(p5.Vector.mult(this.normal, -dist));
      }
    }
  }
}
```

### 3. Múltiples Esferas

```javascript
// En setup()
let sphere1 = new SphereCollision(createVector(0.5, 0, 0), 0.3);
let sphere2 = new SphereCollision(createVector(1.5, 0, 0), 0.3);
system.add_collision_object(sphere1);
system.add_collision_object(sphere2);
```

## Troubleshooting

### La partícula atraviesa la esfera

- **Causa 1**: `dt` muy grande → Reduce `dt` o aumenta `solverIterations`
- **Causa 2**: Velocidad muy alta → Aumenta `solverIterations`
- **Causa 3**: Radio muy pequeño → Aumenta el radio de la esfera

### La tela explota al tocar la esfera

- **Causa**: Corrección demasiado grande
- **Solución**: Aumenta `solverIterations` (más iteraciones = correcciones más suaves)

### La esfera no se ve

- **Verificar**: Que `display()` llama a `collisionObjects[i].display(scale_px)`
- **Verificar**: Posición de la esfera (puede estar fuera de la cámara)
- **Ajustar**: Usa `orbitControl()` con el mouse para rotar la vista

### Performance bajo con colisiones

- **Reducir**: Número de partículas
- **Reducir**: Número de objetos de colisión
- **Optimizar**: Usar spatial hashing si hay muchos objetos

## Comparación: Con y Sin Colisiones

| Aspecto | Sin Colisiones | Con Colisiones |
|---------|----------------|----------------|
| **Realismo** | Tela atraviesa objetos | Tela interactúa físicamente |
| **Interactividad** | Estática | Dinámica |
| **Complejidad** | Simple | Moderada |
| **Performance** | Alta | Muy alta (colisiones baratas) |

## Referencias

- **Müller et al. 2007**: Position Based Dynamics
  - Sección sobre collision handling
  - Orden de resolución: constraints internos → colisiones
- **Restricción de desigualdad**: C ≥ 0 (solo activa cuando se viola)

## Conclusión

Las colisiones con esfera son una extensión fundamental del sistema PBD que permite interacciones realistas entre la tela y objetos externos. La implementación es eficiente, robusta y sigue fielmente el método propuesto por Müller, integrándose perfectamente con las restricciones internas existentes.

