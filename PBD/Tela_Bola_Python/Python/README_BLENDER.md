# Migración de PBD a Blender - Guía Paso a Paso

Este documento explica cómo usar el código migrado de JavaScript a Python para simular una tela con Position-Based Dynamics en Blender.

## Estructura del Proyecto

```
Tela_Bola_Python/
├── Particle.py              # Clase Particle (partículas del sistema)
├── Constraint.py            # Clase base abstracta para restricciones
├── DistanceConstraint.py   # Restricción de distancia entre partículas
├── BendingConstraint.py     # Restricción de pliegue (bending)
├── ShearConstraint.py       # Restricción de cizalla (shear)
├── PBDSystem.py             # Sistema principal de simulación PBD
├── Tela.py                  # Funciones para crear y configurar la tela
├── blender_tela.py          # Script principal para Blender
└── README_BLENDER.md        # Este archivo
```

## Paso 1: Preparar Blender

1. Abre Blender (versión 2.8 o superior)
2. Ve al workspace **Scripting** (pestaña superior)
3. Asegúrate de que todos los archivos `.py` estén en la misma carpeta

## Paso 2: Ejecutar el Script

1. En Blender, abre el archivo `blender_tela.py`
2. Haz clic en **Run Script** (o presiona `Alt + P`)
3. La tela aparecerá en la escena 3D

## Paso 3: Ver la Simulación

1. Asegúrate de estar en el workspace **Layout** o **Shading**
2. Presiona **SPACE** para reproducir la animación
3. La tela se simulará automáticamente en cada frame

## Configuración

Puedes ajustar los parámetros en la sección **CONFIGURACIÓN** de `blender_tela.py`:

```python
# Propiedades de la tela
ANCHO_TELA = 2.0      # Ancho en metros
ALTO_TELA = 2.0       # Alto en metros
N_ANCHO_TELA = 10     # Número de partículas en X
N_ALTO_TELA = 10      # Número de partículas en Y
DENSIDAD_TELA = 0.1  # Densidad en kg/m²

# Rigidez de las restricciones (0-1)
STIFFNESS = 0.5           # Restricciones de distancia
BENDING_STIFFNESS = 0.1   # Restricciones de bending
SHEAR_STIFFNESS = 0.1     # Restricciones de shear

# Activar/desactivar restricciones
USE_BENDING = True
USE_SHEAR = True
```

## Tipos de Restricciones

### 1. DistanceConstraint (Distancia)
- **Qué hace**: Mantiene constante la distancia entre dos partículas adyacentes
- **Efecto**: Previene el estiramiento de la tela
- **Siempre activa**: Sí (estructura básica de la tela)

### 2. BendingConstraint (Pliegue)
- **Qué hace**: Mantiene constante el ángulo diedro entre dos triángulos adyacentes
- **Efecto**: Previene el colapso y da rigidez al pliegue
- **Activar**: `USE_BENDING = True`

### 3. ShearConstraint (Cizalla)
- **Qué hace**: Mantiene constante el ángulo interno de un triángulo
- **Efecto**: Previene la deformación angular (cizalla)
- **Activar**: `USE_SHEAR = True`

## Iteración Paso a Paso

### Fase 1: Tela Básica (Solo Distance)
1. Ejecuta el script con `USE_BENDING = False` y `USE_SHEAR = False`
2. Observa que la tela se estira y se colapsa fácilmente
3. Esta es la estructura básica

### Fase 2: Añadir Bending
1. Cambia `USE_BENDING = True`
2. Ejecuta el script de nuevo
3. Observa que la tela tiene más resistencia al pliegue
4. Compara con la Fase 1

### Fase 3: Añadir Shear
1. Cambia `USE_SHEAR = True`
2. Ejecuta el script de nuevo
3. Observa que la tela mantiene mejor su forma
4. Esta es la configuración completa con las 3 restricciones

### Fase 4: Ajustar Parámetros
1. Experimenta con diferentes valores de `STIFFNESS`, `BENDING_STIFFNESS`, `SHEAR_STIFFNESS`
2. Prueba diferentes resoluciones (`N_ANCHO_TELA`, `N_ALTO_TELA`)
3. Observa cómo afectan al comportamiento de la tela

## Troubleshooting

### Error: "No module named 'Particle'"
- **Solución**: Asegúrate de que todos los archivos `.py` estén en la misma carpeta
- Verifica que el path esté correcto en `blender_tela.py`

### La tela no se mueve
- **Solución**: Asegúrate de que el handler esté registrado
- Verifica que estés reproduciendo la animación (SPACE)

### La tela explota o se comporta de forma extraña
- **Solución**: Reduce `STIFFNESS` (prueba con 0.3)
- Aumenta `SOLVER_ITERATIONS` (prueba con 10)
- Reduce `DT` (timestep más pequeño)

### Performance bajo
- **Solución**: Reduce `N_ANCHO_TELA` y `N_ALTO_TELA` (prueba con 8x8)
- Reduce `SOLVER_ITERATIONS` (prueba con 3)

## Próximos Pasos

Una vez que tengas la tela funcionando con las 3 restricciones, puedes:

1. **Añadir colisiones**: Implementar colisiones con el suelo u otros objetos
2. **Añadir viento**: Aplicar fuerzas de viento a las partículas
3. **Mejorar visualización**: Añadir materiales más realistas, iluminación, etc.
4. **Exportar animación**: Renderizar la simulación como video

## Referencias

- **Müller et al. 2007**: "Position Based Dynamics" - Paper original sobre PBD
- **Müller et al. 2005**: "Meshless Deformations Based on Shape Matching" - Shape Matching
- **Blender Python API**: https://docs.blender.org/api/current/

## Notas Técnicas

- El código usa `mathutils.Vector` de Blender en lugar de `p5.Vector` de p5.js
- Las operaciones vectoriales son similares pero con sintaxis de Python
- El solver PBD se ejecuta en cada frame de Blender usando handlers
- La visualización se actualiza automáticamente después de cada paso de simulación

