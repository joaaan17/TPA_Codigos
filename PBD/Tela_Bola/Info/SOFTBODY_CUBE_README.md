# Cubo Deformable (Soft-Body Cube) - PBD

## Descripción

Implementación de un **cubo deformable (soft-body cube)** utilizando Position-Based Dynamics, reutilizando completamente las restricciones existentes del proyecto (Distance, Bending, Shear).

El cubo es **estructuralmente estable**, se mantiene unido, puede deformarse bajo fuerzas externas y volver a su forma original.

## Arquitectura

### Función Principal

```javascript
function createSoftBodyCube(center, size, resolution, mass, stiffness)
```

**Parámetros:**
- `center`: Posición 3D del centro `[x, y, z]` o `createVector(x, y, z)`
- `size`: Tamaño de las aristas del cubo (en metros)
- `resolution`: Subdivisiones por eje (mínimo 2, recomendado 3-4)
- `mass`: Masa por partícula
- `stiffness`: Rigidez base para todas las constraints (0-1)

**Retorna:**
```javascript
{
  particles: Array<Particle>,  // Array de partículas
  constraints: Array<Constraint> // Array de restricciones
}
```

## Estructura del Cubo

### 1. Rejilla 3D de Partículas

- **Total de partículas**: `resolution³`
- **Ejemplo**: `resolution = 3` → 3×3×3 = 27 partículas
- **Distribución**: Uniforme dentro del volumen del cubo
- **Centrado**: El cubo se genera centrado en la posición especificada

### 2. Tres Familias de Constraints

#### A. Distance Constraints (Estructura)

Mantienen las longitudes entre partículas:

1. **Aristas principales** (edges):
   - Conexiones entre vecinos directos en X, Y, Z
   - Equivalente a las aristas del cubo
   
2. **Diagonales de caras** (face diagonals):
   - Conexiones diagonales en cada plano (XY, XZ, YZ)
   - Proporcionan estabilidad 2D a cada cara
   
3. **Diagonales volumétricas** (body diagonals):
   - Conexiones diagonales dentro del volumen
   - Proporcionan estabilidad 3D
   - Evitan que el cubo colapse

**Rigidez**: Usa el `stiffness` base

#### B. Bending Constraints

Mantienen ángulos diedros entre caras adyacentes:

- Aplicadas entre pares de caras que comparten una arista
- Funcionan igual que en la tela, pero en 3D
- Previenen pliegues excesivos

**Rigidez**: `stiffness * 0.3` (más suave que distance)

#### C. Shear Constraints

Mantienen ángulos internos en cada cara del cubo:

- Aplicadas dentro de cada cuadrado (caras del cubo)
- También en cuadrados internos (si resolution > 2)
- Previenen deformación por cizalla

**Rigidez**: `stiffness * 0.3` (más suave que distance)

## Ejemplo de Uso

### Uso Básico

```javascript
// Crear cubo deformable
let softCube = createSoftBodyCube(
  [1.0, 1.0, 0.0],  // Centro en (1, 1, 0)
  1.0,              // Tamaño: 1 metro
  3,                // Resolución: 3x3x3 = 27 partículas
  0.1,              // Masa: 0.1 kg por partícula
  0.8               // Rigidez: 0.8 (rígido)
);

// Añadir al solver
for (let p of softCube.particles) {
  system.particles.push(p);
}
for (let c of softCube.constraints) {
  system.add_constraint(c);
}
```

### Integración Completa (PBD.js)

```javascript
function createCubeMode() {
  // Crear sistema vacío
  system = new PBDSystem(0, 1.0);
  
  // Generar cubo
  let softCube = createSoftBodyCube(
    createVector(1.0, 1.0, 0.0),
    1.0,
    3,
    0.1,
    0.8
  );
  
  // Añadir partículas
  for (let i = 0; i < softCube.particles.length; i++) {
    system.particles.push(softCube.particles[i]);
  }
  
  // Añadir constraints
  for (let i = 0; i < softCube.constraints.length; i++) {
    system.add_constraint(softCube.constraints[i]);
  }
  
  // Configurar iteraciones
  system.set_n_iters(5);
}
```

## Parámetros Recomendados

### Resolution

| Valor | Partículas | Uso | Performance |
|-------|-----------|-----|-------------|
| 2 | 8 | Prueba rápida | Muy alta |
| 3 | 27 | **Recomendado** | Alta |
| 4 | 64 | Detalle medio | Media |
| 5 | 125 | Alta calidad | Baja |

### Stiffness

| Valor | Comportamiento | Aplicación |
|-------|----------------|------------|
| 0.5 | Muy suave, gelatinoso | Gel, goma blanda |
| 0.8 | **Recomendado**, equilibrado | Material elástico |
| 0.95 | Rígido, casi sólido | Madera, plástico |

### Mass

| Valor | Comportamiento |
|-------|----------------|
| 0.05 | Ligero, flota fácilmente |
| 0.1 | **Recomendado**, equilibrado |
| 0.2 | Pesado, cae rápido |

## Estadísticas de Constraints

Para un cubo de **resolution = 3** (27 partículas):

- **Distance constraints**: ~156
  - Aristas: 54
  - Diagonales de caras: 54
  - Diagonales volumétricas: 48
  
- **Bending constraints**: ~54
  
- **Shear constraints**: ~216

**Total**: ~426 constraints

## Validaciones Implementadas

1. ✅ Resolution mínima de 2
2. ✅ Cálculo correcto de longitudes para distance constraints
3. ✅ Ángulos iniciales calculados correctamente
4. ✅ Protección contra triángulos degenerados
5. ✅ Índices bien calculados (función `getIndex(i, j, k)`)
6. ✅ Suficientes constraints para mantener la forma

## Controles en la Aplicación

### Cambiar entre Tela y Cubo

- **Tecla M**: Alterna entre modo Tela y modo Cubo
- El sistema se reinicia con la nueva configuración

### Modificar el Código

Para cambiar el modo inicial, edita en `PBD.js`:

```javascript
// Variables para el cubo deformable
let use_cube_mode = true; // ← Cambiar a true para empezar con cubo
```

## Propiedades del Cubo Generado

### Estabilidad Estructural

El cubo es estable gracias a:
- ✅ Múltiples constraints por partícula
- ✅ Diagonales volumétricas (evitan colapso 3D)
- ✅ Bending constraints (mantienen forma)
- ✅ Shear constraints (previenen deformación angular)

### Comportamiento Físico

- **Deformación**: Se deforma bajo fuerzas externas
- **Recuperación**: Vuelve a su forma original
- **Colisiones**: Responde correctamente a colisiones con esferas
- **Gravedad**: Cae y se deforma al impactar

## Comparación: Tela vs Cubo

| Aspecto | Tela | Cubo |
|---------|------|------|
| **Dimensión** | 2D | 3D |
| **Partículas (15/3)** | 225 | 27 |
| **Constraints** | ~1568 | ~426 |
| **Estabilidad** | Alta (2D) | Alta (3D) |
| **Uso** | Ropa, banderas | Objetos sólidos deformables |

## Troubleshooting

### El cubo colapsa

- **Causa**: Stiffness muy bajo o pocas iteraciones
- **Solución**: Aumenta `stiffness` a 0.8-0.95 o `solverIterations` a 8-10

### El cubo explota

- **Causa**: Stiffness muy alto o dt muy grande
- **Solución**: Reduce `stiffness` o reduce `dt`

### Performance bajo

- **Causa**: Resolution muy alta
- **Solución**: Reduce `resolution` a 3 o 2

### El cubo se estira mucho

- **Causa**: Faltan constraints volumétricas
- **Solución**: Verifica que se estén generando todas las body diagonals

## Extensiones Posibles (No Implementadas)

### 1. Constraint de Volumen

Mantiene el volumen del cubo constante:

```javascript
C = Volume_actual - Volume_inicial
```

### 2. Presión Interna

Simula presión de aire dentro del cubo (balloon effect).

### 3. Anclaje de Vértices

Fijar algunos vértices del cubo:

```javascript
// Fijar vértice inferior
softCube.particles[0].set_bloqueada(true);
```

### 4. Múltiples Cubos

Crear varios cubos que colisionen entre sí:

```javascript
let cube1 = createSoftBodyCube([0, 1, 0], 0.5, 3, 0.1, 0.8);
let cube2 = createSoftBodyCube([1, 1, 0], 0.5, 3, 0.1, 0.8);
// Añadir ambos al sistema
```

## Filosofía del Soft-Body

Este cubo sigue la filosofía PBD de soft-body:
- **No es rígido**: Se deforma bajo fuerzas
- **Recupera forma**: Las constraints lo restauran
- **Estable**: Múltiples constraints previenen colapso
- **Eficiente**: Usa método PBD (sin matrices, sin fuerzas de restitución)

## Console Output

Al crear el cubo, verás en la consola:

```
========================================
🟥 GENERANDO CUBO DEFORMABLE
========================================
Generando cubo: 3x3x3 = 27 partículas
✓ 156 distance constraints creadas
✓ 54 bending constraints creadas
✓ 216 shear constraints creadas
========================================
CUBO SOFT-BODY GENERADO EXITOSAMENTE
Partículas: 27
Constraints totales: 426
  - Distance: 156
  - Bending: 54
  - Shear: 216
========================================
🟥 MODO CUBO - Listo para simular
```

## Conclusión

El generador de cubos deformables proporciona una base sólida para simular objetos 3D deformables usando PBD. Reutiliza completamente las restricciones existentes y proporciona estabilidad estructural excelente. Es fácil de integrar y modificar según las necesidades del proyecto.

