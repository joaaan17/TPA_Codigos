# ❄️ Frozen Lake (El Lago Congelado)

## 📋 Descripción

Implementación clásica del entorno **Frozen Lake** para demostrar Aprendizaje por Refuerzo, especialmente los algoritmos SARSA y Q-Learning.

### Características:
- ✅ **Agujeros (Holes)**: Terminan el episodio con recompensa -1
- ✅ **Comportamiento Slippery (Resbaladizo)**: Opcional, movimiento no determinista
- ✅ **Sistema de recompensas clásico**: +1 objetivo, -1 agujero, 0 otro caso
- ✅ **Q-Learning y SARSA**: Ambos algoritmos implementados
- ✅ **Visualización clara**: Hielo azul, agujeros negros, objetivo verde

---

## 📂 Archivos

- `index.html` - Interfaz web principal
- `training.js` - Lógica de entrenamiento
- `env_2D.js` - Entorno Frozen Lake
- `agentesRL.js` - Agente RL (Q-Learning y SARSA)

---

## 🚀 Cómo Usar

### 1. Abrir la interfaz
```
Abre: index.html en tu navegador
```

### 2. Configurar parámetros
- **Alpha (α)**: 0.1 (tasa de aprendizaje)
- **Gamma (γ)**: 0.9 (factor de descuento)
- **Epsilon (ε)**: 0.1 (exploración)
- **Episodios**: 1000-2000 (Frozen Lake necesita más episodios)
- **Agujeros (%)**: 15-25% (recomendado)
- **Slippery**: Activar para comportamiento no determinista

### 3. Crear entorno
- Click en "Crear Entorno"
- Se generará un grid con hielo, agujeros y objetivo

### 4. Entrenar
- Selecciona algoritmo (Q-Learning o SARSA)
- Click en "Entrenar"
- Observa cómo el agente aprende a evitar agujeros

### 5. Probar
- Click en "Probar Agente"
- Observa cómo navega evitando agujeros hacia el objetivo

---

## 🎨 Visualización

- 🟦 **Azul claro**: Hielo seguro (celdas normales)
- 🔵 **Azul oscuro con "S"**: Posición inicial (Start)
- ⚫ **Negro con borde rojo**: Agujeros (Holes) - terminan el episodio
- 🟢 **Verde con "G"**: Objetivo (Goal)
- 🟡 **Círculo dorado**: Agente

---

## 📊 Resultados Esperados

### Grid 8x8, Agujeros 20%, Determinista:
- **Episodios para converger**: ~500-1000
- **Tasa de éxito**: 60-80% (depende de configuración de agujeros)
- **Recompensa promedio**: -0.5 a +0.5 (muchos episodios terminan en agujero)

### Grid 8x8, Agujeros 20%, Slippery:
- **Episodios para converger**: ~1000-2000
- **Tasa de éxito**: 40-60% (más difícil con slippery)
- **Recompensa promedio**: -0.8 a +0.2

---

## 💡 Conceptos Implementados

### Algoritmos:
1. **Q-Learning** (Off-Policy)
   - Aprende política óptima
   - Mejor para entornos deterministas
   - Más agresivo en la exploración

2. **SARSA** (On-Policy)
   - Aprende política que sigue
   - Mejor para entornos no deterministas (slippery)
   - Más conservador, evita riesgos

### Sistema de Recompensas (Frozen Lake):
- **+1**: Al alcanzar el objetivo (Goal)
- **-1**: Si cae en un agujero (Hole)
- **0**: En cualquier otro caso (hielo seguro)
- **Objetivo**: Maximizar recompensa aprendiendo a evitar agujeros

### Comportamiento Slippery (Resbaladizo):
Cuando está activado, el movimiento es **no determinista**:
- 33% probabilidad: Acción intentada
- 33% probabilidad: Acción perpendicular izquierda
- 33% probabilidad: Acción perpendicular derecha

Ejemplo: Si intentas moverte a la derecha (→), puedes terminar:
- → (33%): Derecha (intentada)
- ↑ (33%): Arriba (perpendicular izquierda)
- ↓ (33%): Abajo (perpendicular derecha)

### Política:
- **Epsilon-Greedy**: Balance exploración/explotación
- **Frozen después del entrenamiento**: Usa política aprendida sin exploración

---

## 🆚 Comparación: Determinista vs Slippery

| Aspecto | Determinista | Slippery |
|--------|--------------|----------|
| **Dificultad** | 🟡 Media | 🔴 Alta |
| **Episodios necesarios** | ~500-1000 | ~1000-2000 |
| **Tasa de éxito** | 60-80% | 40-60% |
| **Mejor algoritmo** | Q-Learning | SARSA |
| **Comportamiento** | Predecible | No determinista |

---

## 🎯 Características del Entorno Frozen Lake

### Elementos:
1. **Estados (S)**: Posiciones del agente en la cuadrícula (grid)
2. **Acciones (A)**: 4 direcciones (↑ ↓ ← →)
3. **Desafío**: Entorno no determinista (slippery opcional)
4. **Recompensas**:
   - +1: Alcanzar objetivo
   - -1: Caer en agujero
   - 0: Hielo seguro

### Diferencia con otros entornos:
- **No hay obstáculos que bloqueen**: Los agujeros terminan el episodio
- **Recompensas escasas**: Solo al final del episodio (+1 o -1)
- **Comportamiento no determinista**: Con slippery activado

---

## 🔬 Experimentos Sugeridos

1. **Comparar Q-Learning vs SARSA**:
   - Entrena ambos con slippery activado
   - SARSA debería rendir mejor (más conservador)

2. **Efecto del porcentaje de agujeros**:
   - Prueba 10%, 20%, 30%
   - Observa cómo cambia la tasa de éxito

3. **Determinista vs Slippery**:
   - Mismo grid, primero determinista, luego slippery
   - Compara tasas de éxito y tiempo de convergencia

4. **Tamaño del grid**:
   - Prueba 4x4, 8x8, 12x12
   - Observa cómo aumenta la dificultad

---

## 🐛 Debugging

### Si el agente no aprende:
1. Aumenta episodios (Frozen Lake necesita más)
2. Reduce porcentaje de agujeros (empieza con 10-15%)
3. Aumenta epsilon (más exploración)
4. Prueba con grid más pequeño (4x4 o 6x6)

### Si siempre cae en agujeros:
- ✅ Normal al principio del entrenamiento
- El agente debe explorar para aprender
- Aumenta episodios de entrenamiento

### Si con slippery no converge:
- ✅ Slippery es más difícil
- Aumenta significativamente los episodios (2000+)
- SARSA funciona mejor que Q-Learning con slippery

---

## 📚 Referencias Teóricas

### Q-Learning (Frozen Lake):
```
Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
```
Donde `r = +1` si alcanza objetivo, `r = -1` si cae en agujero, `r = 0` otro caso

### SARSA (Frozen Lake):
```
Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a') - Q(s,a)]
```
Más conservador, aprende política real (importante con slippery)

---

## ✅ Estado del Proyecto

- [x] Entorno Frozen Lake completo
- [x] Agujeros que terminan episodio con -1
- [x] Comportamiento slippery (no determinista)
- [x] Sistema de recompensas clásico (+1, -1, 0)
- [x] Visualización clara (hielo, agujeros, objetivo)
- [x] Q-Learning y SARSA implementados
- [x] Interfaz web completa
- [x] Documentación completa

---

**¡Perfecto para aprender los fundamentos de RL con un problema clásico!** ❄️🤖

**Versión**: 1.0  
**Última actualización**: Diciembre 2024
