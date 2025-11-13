# Bending Constraint para Position-Based Dynamics

## Descripción

Implementación de la restricción de pliegue (bending constraint) clásica de **Müller et al. 2007** para telas simuladas con Position-Based Dynamics.

Esta restricción mantiene constante el ángulo diedro φ₀ entre dos triángulos adyacentes que comparten una arista, lo que previene el colapso de la tela y le da rigidez al pliegue.

## Arquitectura

La implementación sigue exactamente el mismo patrón que `DistanceConstraint`:

- **Clase**: `BendingConstraint` extiende `Constraint`
- **Constructor**: `BendingConstraint(p1, p2, p3, p4, phi0, stiffness)`
- **Método principal**: `proyecta_restriccion()`
- **Integración**: Compatible con `PBDSystem`

## Fórmulas Implementadas (Müller 2007, Apéndice B)

### 1. Función de restricción

```
C = acos(n1 · n2) - phi0
```

Donde:
- `n1` = normal del triángulo (p1, p3, p2)
- `n2` = normal del triángulo (p1, p2, p4)
- `phi0` = ángulo inicial entre los triángulos

### 2. Cálculo de normales

```
n1 = normalize(cross(p2 - p1, p3 - p1))
n2 = normalize(cross(p2 - p1, p4 - p1))
```

### 3. Gradientes (qi)

Fórmulas explícitas exactas:

```
q3 = cross(p2 - p1, n2) / |p2 - p3|
q4 = cross(p2 - p1, n1) / |p2 - p4|
q2 = -cross(p3 - p1, n2) / |p2 - p3| - cross(p4 - p1, n1) / |p2 - p4|
q1 = -q2 - q3 - q4
```

### 4. Corrección Δpi

```
Δpi = -(4 * wi / sum_w) * ((acos(d) - phi0) / sqrt(1 - d²)) * qi / sum_q2
```

Con rigidez ajustada:
```
k' = 1 - (1 - k)^(1/solverIterations)
Δpi_final = k' * Δpi
```

## Uso

### Opción 1: Uso directo

```javascript
// Crear 4 partículas
let p1 = tela.particles[0];
let p2 = tela.particles[1];
let p3 = tela.particles[2];
let p4 = tela.particles[3];

// Calcular ángulo inicial entre los triángulos
let e1 = p5.Vector.sub(p2.location, p1.location);
let e2 = p5.Vector.sub(p3.location, p1.location);
let e3 = p5.Vector.sub(p4.location, p1.location);

let n1 = p5.Vector.cross(e1, e2).normalize();
let n2 = p5.Vector.cross(e1, e3).normalize();
let phi0 = acos(constrain(n1.dot(n2), -1, 1));

// Crear restricción
let bc = new BendingConstraint(p1, p2, p3, p4, phi0, 0.1);
tela.add_constraint(bc);
```

### Opción 2: Usar la función auxiliar (RECOMENDADO)

```javascript
// Crear tela
let tela = crea_tela(alto_tela, ancho_tela, densidad_tela, 
                     n_alto_tela, n_ancho_tela, stiffness, 
                     sphere_size_tela);

// Añadir restricciones de bending
add_bending_constraints(tela, n_alto_tela, n_ancho_tela, 0.1);
```

### Ejemplo completo en PBD.js

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  vel_viento = createVector(0, 0, 0);
  sphere_size_tela = ancho_tela / n_ancho_tela * 0.4;
  
  // Crear tela con restricciones de distancia
  system = crea_tela(alto_tela, ancho_tela, densidad_tela,
                    n_alto_tela, n_ancho_tela, stiffness,
                    sphere_size_tela);
  
  // AÑADIR RESTRICCIONES DE BENDING
  add_bending_constraints(system, n_alto_tela, n_ancho_tela, 0.1);
  
  system.set_n_iters(5);
}
```

## Parámetros

### Constructor: BendingConstraint(p1, p2, p3, p4, phi0, stiffness)

- **p1, p2, p3, p4**: Referencias a objetos `Particle`
  - `p1`, `p2` forman la arista compartida
  - `(p1, p3, p2)` forman el primer triángulo
  - `(p1, p2, p4)` forman el segundo triángulo

- **phi0**: Ángulo diedro inicial (radianes)
  - Se calcula en la configuración de reposo
  - Típicamente π (tela plana) o calculado de la geometría inicial

- **stiffness**: Rigidez de la restricción (0-1)
  - **0.0**: Sin resistencia al pliegue (muy flexible)
  - **0.1**: Tela suave (algodón ligero)
  - **0.5**: Tela rígida
  - **1.0**: Completamente rígida (no recomendado para estabilidad)

## Validaciones Implementadas

La implementación incluye todas las validaciones necesarias:

1. ✅ **Normales degeneradas**: Si `|n1|` o `|n2|` < epsilon, no se aplica corrección
2. ✅ **Clamp de d**: `d` se restringe a `[-1, 1]` antes de `acos(d)`
3. ✅ **División por cero**: Validación en:
   - Longitudes de aristas (`|p2 - p3|`, `|p2 - p4|`)
   - Suma de gradientes al cuadrado (`sum_q2`)
   - Suma de masas inversas (`sum_w`)
   - Raíz cuadrada (`sqrt(1 - d²)`)
4. ✅ **Constraint pequeño**: Si `|C| < epsilon`, no se aplica corrección

## Comparación: Con y Sin Bending Constraints

| Aspecto | Sin Bending | Con Bending |
|---------|-------------|-------------|
| **Resistencia al pliegue** | Ninguna | Alta |
| **Realismo** | Papel ultra-fino | Tela real |
| **Colapso** | Se colapsa fácilmente | Mantiene forma |
| **Performance** | ~200 constraints | ~400 constraints |
| **Uso de memoria** | Bajo | Moderado |

## Ejemplo de Valores Recomendados

```javascript
// Tela muy flexible (cortina ligera)
add_bending_constraints(tela, n_alto, n_ancho, 0.05);

// Tela normal (algodón)
add_bending_constraints(tela, n_alto, n_ancho, 0.1);

// Tela rígida (jean/denim)
add_bending_constraints(tela, n_alto, n_ancho, 0.3);

// Material muy rígido (lona, plástico)
add_bending_constraints(tela, n_alto, n_ancho, 0.5);
```

## Notas de Performance

Para una malla de **15×15** (225 partículas):
- **Restricciones de distancia**: ~392 constraints
- **Restricciones de bending**: ~392 constraints adicionales
- **Total**: ~784 constraints

Con 5 iteraciones del solver, esto significa ~3920 proyecciones por frame, que es manejable a 60 FPS en hardware moderno.

## Referencias

- Müller, M., Heidelberger, B., Hennix, M., & Ratcliff, J. (2007). 
  *Position based dynamics*. Journal of Visual Communication and Image Representation, 18(2), 109-118.
  - Ver **Apéndice B**: Fórmulas exactas para gradientes de bending constraint

## Troubleshooting

### La tela explota o tiene comportamiento inestable

- **Solución 1**: Reducir `stiffness` (probar con 0.05 - 0.1)
- **Solución 2**: Aumentar `solverIterations` (probar con 8-10)
- **Solución 3**: Reducir `dt` (timestep más pequeño)

### La tela se colapsa aún con bending

- **Verificar**: Que las restricciones se añadieron correctamente
- **Verificar**: Que `phi0` se calculó correctamente (debe ser ~π para tela plana)
- **Aumentar**: `stiffness` del bending (probar 0.2 - 0.5)

### Performance bajo

- **Reducir**: Número de partículas (`n_alto_tela`, `n_ancho_tela`)
- **Reducir**: `solverIterations`
- **Usar**: Bending solo en regiones críticas (no en toda la malla)

