# Shear Constraint para Position-Based Dynamics

## Descripción

Implementación de la **restricción de cizalla (shear constraint)** para telas simuladas con Position-Based Dynamics.

Esta restricción mantiene constante el ángulo interno de un triángulo en un vértice específico, previniendo la deformación por cizalla de la malla. A diferencia de las restricciones de distancia que solo preservan longitudes, y las restricciones de bending que preservan ángulos diedros entre triángulos, las restricciones de shear preservan los **ángulos internos dentro de cada triángulo**.

## Diferencia con Otras Restricciones

| Tipo | Partículas | Mantiene | Previene |
|------|-----------|----------|----------|
| **Distance** | 2 | Longitud de arista | Estiramiento |
| **Bending** | 4 | Ángulo diedro | Pliegue excesivo |
| **Shear** | 3 | Ángulo interno | Cizalla/deformación angular |

## Arquitectura

La implementación sigue exactamente el mismo patrón que `DistanceConstraint` y `BendingConstraint`:

- **Clase**: `ShearConstraint` extiende `Constraint`
- **Constructor**: `ShearConstraint(p0, p1, p2, psi0, stiffness)`
- **Método principal**: `proyecta_restriccion()`
- **Integración**: Compatible con `PBDSystem`

## Fórmulas Implementadas

### 1. Función de restricción

```
C(x0, x1, x2) = acos(v1 · v2) - psi0
```

Donde:
- `x0` = vértice donde se mide el ángulo
- `x1`, `x2` = otros dos vértices del triángulo
- `v1 = normalize(x1 - x0)`
- `v2 = normalize(x2 - x0)`
- `psi0` = ángulo inicial guardado al crear la restricción

### 2. Gradientes EXACTOS

Fórmulas explícitas:

```
∇x1 C = -(1 / sqrt(1 - c²)) * ((I - v1v1^T) / |x1 - x0|) * v2
∇x2 C = -(1 / sqrt(1 - c²)) * ((I - v2v2^T) / |x2 - x0|) * v1
∇x0 C = -∇x1 C - ∇x2 C
```

Donde:
- `c = dot(v1, v2)` (con clamp a [-1, 1])
- `I` es la matriz identidad
- `v1v1^T` es el producto exterior de v1 consigo mismo

**Simplificación implementada:**
- `(I - v1v1^T) * v2 = v2 - v1 * (v1 · v2) = v2 - v1 * c`
- `(I - v2v2^T) * v1 = v1 - v2 * (v2 · v1) = v1 - v2 * c`

### 3. Corrección PBD

```
Δpi = -(wi / sum_w) * (C / |∇C|²) * ∇pi C
```

Donde:
- `wi = 1 / masa_i`
- `|∇C|² = |∇x0 C|² + |∇x1 C|² + |∇x2 C|²`
- `sum_w = w0 + w1 + w2`

### 4. Rigidez ajustada

```
k' = 1 - (1 - k)^(1/solverIterations)
Δpi_final = k' * Δpi
```

## Uso

### Opción 1: Uso directo

```javascript
// Crear 3 partículas que forman un triángulo
let p0 = tela.particles[0]; // Vértice donde se mide el ángulo
let p1 = tela.particles[1];
let p2 = tela.particles[2];

// Calcular ángulo inicial
let v1 = p5.Vector.sub(p1.location, p0.location).normalize();
let v2 = p5.Vector.sub(p2.location, p0.location).normalize();
let c = constrain(v1.dot(v2), -1, 1);
let psi0 = acos(c);

// Crear restricción
let sc = new ShearConstraint(p0, p1, p2, psi0, 0.1);
tela.add_constraint(sc);
```

### Opción 2: Usar la función auxiliar (RECOMENDADO)

```javascript
// Crear tela
let tela = crea_tela(alto_tela, ancho_tela, densidad_tela, 
                     n_alto_tela, n_ancho_tela, stiffness, 
                     sphere_size_tela);

// Añadir restricciones de shear
add_shear_constraints(tela, n_alto_tela, n_ancho_tela, 0.1);
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
  
  // AÑADIR RESTRICCIONES DE SHEAR
  add_shear_constraints(system, n_alto_tela, n_ancho_tela, 0.1);
  
  system.set_n_iters(5);
}
```

## Parámetros

### Constructor: ShearConstraint(p0, p1, p2, psi0, stiffness)

- **p0**: Referencia a objeto `Particle` (vértice donde se mide el ángulo)
- **p1, p2**: Referencias a objetos `Particle` (otros dos vértices del triángulo)
- **psi0**: Ángulo inicial en radianes
  - Se calcula en la configuración de reposo
  - Típicamente 90° (π/2) para malla rectangular
  
- **stiffness**: Rigidez de la restricción (0-1)
  - **0.0**: Sin resistencia a la cizalla (muy deformable)
  - **0.1**: Tela suave pero resistente
  - **0.3**: Tela rígida
  - **0.5**: Muy rígida
  - **1.0**: Completamente rígida (no recomendado)

## Cómo se Integran en la Malla

Para una malla rectangular, cada cuadrilátero se divide en 2 triángulos, y se crea una restricción de shear **por cada ángulo interno**:

```
Cuadrilátero:
  p01 ---- p11
   |    /   |
   |  /     |
  p00 ---- p10

Triángulos formados:
1. (p00, p10, p01)
2. (p10, p11, p01)

Restricciones de shear (4 por cuadrilátero):
1. Ángulo en p00: ShearConstraint(p00, p10, p01, ...)
2. Ángulo en p10: ShearConstraint(p10, p00, p11, ...)
3. Ángulo en p01: ShearConstraint(p01, p00, p11, ...)
4. Ángulo en p11: ShearConstraint(p11, p10, p01, ...)
```

## Validaciones Implementadas

La implementación incluye todas las validaciones necesarias:

1. ✅ **Vectores degenerados**: Si `|x1 - x0|` o `|x2 - x0|` < epsilon, no se aplica corrección
2. ✅ **Clamp de c**: `c` se restringe a `[-1, 1]` antes de `acos(c)`
3. ✅ **División por cero**: Validación en:
   - Longitudes de vectores (`|v1|`, `|v2|`)
   - Suma de gradientes al cuadrado (`|∇C|²`)
   - Suma de masas inversas (`sum_w`)
   - Raíz cuadrada (`sqrt(1 - c²)`)
4. ✅ **Constraint pequeño**: Si `|C| < epsilon`, no se aplica corrección

## Efectos Visuales

### Sin Shear Constraints
- La malla se deforma angularmente
- Los rectángulos se convierten en paralelogramos
- Aspecto "escurrido" o "sesgado"
- Pérdida de forma original

### Con Shear Constraints
- Los ángulos se mantienen
- Los rectángulos permanecen rectangulares
- Aspecto más rígido y estructurado
- Forma se preserva mejor

## Ejemplo de Valores Recomendados

```javascript
// Tela muy flexible (seda, satén)
add_shear_constraints(tela, n_alto, n_ancho, 0.05);

// Tela normal (algodón, lino)
add_shear_constraints(tela, n_alto, n_ancho, 0.1);

// Tela rígida (jean, lona)
add_shear_constraints(tela, n_alto, n_ancho, 0.3);

// Material muy rígido (plástico, metal)
add_shear_constraints(tela, n_alto, n_ancho, 0.5);
```

## Combinación con Otras Restricciones

Para una simulación realista de tela, se recomienda usar las tres restricciones:

```javascript
// Restricciones de distancia (estructura básica)
// → Ya incluidas en crea_tela()

// Restricciones de bending (resistencia al pliegue)
add_bending_constraints(system, n_alto, n_ancho, 0.1);

// Restricciones de shear (resistencia a la cizalla)
add_shear_constraints(system, n_alto, n_ancho, 0.1);
```

### Efectos combinados:
- **Solo Distance**: Tela ultra-flexible, se estira y se colapsa
- **Distance + Bending**: Resistente al pliegue pero se deforma angularmente
- **Distance + Shear**: Resistente a cizalla pero se pliega fácilmente
- **Distance + Bending + Shear**: Tela realista con comportamiento completo ✨

## Notas de Performance

Para una malla de **15×15** (225 partículas):
- **Restricciones de distancia**: ~392 constraints
- **Restricciones de bending**: ~392 constraints
- **Restricciones de shear**: ~784 constraints (4 por cuadrilátero)
- **Total con todo activo**: ~1568 constraints

Con 5 iteraciones del solver, esto significa ~7840 proyecciones por frame. Para mantener 60 FPS:
- Considera reducir a 10×10 partículas si el performance es bajo
- O reduce `solverIterations` a 3-4
- O desactiva temporalmente algunas restricciones

## Controles en la Aplicación

- **Tecla H**: Toggle Shear constraints ON/OFF
- **Tecla B**: Toggle Bending constraints ON/OFF
- Compara visualmente el efecto activando/desactivando cada tipo

## Referencias Técnicas

- **Position Based Dynamics** (Müller et al. 2007)
- Fórmula general PBD: `Δpi = -(wi / sum_wj) * (C / |∇C|²) * ∇pi C`
- Gradientes exactos calculados analíticamente para el ángulo interno

## Troubleshooting

### La tela explota o tiene comportamiento inestable

- **Solución 1**: Reducir `shear_stiffness` (probar con 0.05 - 0.1)
- **Solución 2**: Aumentar `solverIterations` (probar con 8-10)
- **Solución 3**: Reducir `dt` (timestep más pequeño)

### La tela se deforma aún con shear

- **Verificar**: Que las restricciones se añadieron correctamente
- **Verificar**: Que `psi0` se calculó correctamente
- **Aumentar**: `stiffness` del shear (probar 0.2 - 0.5)

### Performance muy bajo

- **Reducir**: Número de partículas (`n_alto_tela`, `n_ancho_tela`)
- **Reducir**: `solverIterations`
- **Desactivar temporalmente**: Shear o Bending (teclas H/B)
- **Considerar**: Las shear constraints son las más numerosas (4 por cuadrilátero)

### Los ángulos no se preservan perfectamente

- Esto es normal en PBD - es un método aproximado
- **Aumentar**: `solverIterations` mejora la precisión
- **Aumentar**: `stiffness` hace la restricción más fuerte
- Con `stiffness = 1.0` y muchas iteraciones se aproxima a rígido

## Implementación Técnica

### Cálculo del producto (I - vv^T) * u

En lugar de construir matrices, usamos la identidad:

```javascript
// (I - v1v1^T) * v2 = v2 - v1 * (v1 · v2)
let grad_x1_unnorm = p5.Vector.sub(v2, p5.Vector.mult(v1, c));
```

Esto es más eficiente y evita la construcción explícita de matrices 3×3.

### Orden de los vértices

Es importante que el orden de los vértices sea consistente:
- `p0` siempre es el vértice donde se mide el ángulo
- `p1` y `p2` son los otros dos vértices
- El ángulo medido es entre los vectores `(p1 - p0)` y `(p2 - p0)`

## Conclusión

Las restricciones de shear son fundamentales para simular telas realistas que mantengan su forma bajo deformación. Junto con las restricciones de distancia y bending, forman un sistema completo que puede simular una amplia variedad de materiales textiles.

