# 🎯 Goal-Conditioned Reinforcement Learning

## 🚀 ¿Qué es Goal-Conditioned RL?

**Goal-Conditioned RL** es una técnica donde el agente aprende a navegar hacia **cualquier objetivo** que le des, no solo hacia uno fijo. Después del entrenamiento, puedes **cambiar el objetivo dinámicamente** sin necesidad de re-entrenar.

---

## 🆚 Comparación de Enfoques

### 1. **Single-Goal** (Original)
```
Entrenamiento: Meta fija en (9, 9)
   ├─ Agente aprende: "Siempre ir a (9, 9)"
   └─ Después: Solo puede ir a (9, 9)

❌ Problema: No se adapta a nuevos objetivos
```

### 2. **Multi-Goal** 
```
Entrenamiento: 3 metas aleatorias
   ├─ Agente aprende: "Ir a la meta más cercana"
   └─ Después: Va a una de las 3 metas conocidas

⚠️ Limitación: Solo conoce las metas del entrenamiento
```

### 3. **Goal-Conditioned** ⭐
```
Entrenamiento: MUCHAS metas aleatorias (cambian cada episodio)
   ├─ Agente aprende: "Navegar hacia CUALQUIER posición"
   └─ Después: Puedes dar CUALQUIER objetivo nuevo

✅ Ventaja: Generaliza a cualquier meta, incluso no vista
```

---

## 🧠 ¿Cómo Funciona?

### Arquitectura Clave

El agente usa una **Q-Table consciente del objetivo**:

```javascript
Q[state_y][state_x][goal_direction][action]
```

Donde `goal_direction` codifica la dirección relativa al objetivo:
- 0: Arriba-Izquierda
- 1: Arriba
- 2: Arriba-Derecha
- 3: Izquierda
- 4: Mismo lugar
- 5: Derecha
- 6: Abajo-Izquierda
- 7: Abajo
- 8: Abajo-Derecha

### Durante el Entrenamiento

```javascript
// Cada episodio tiene un objetivo DIFERENTE
for (episode = 0; episode < numEpisodes; episode++) {
    env.randomizeGoal(); // 🎯 Objetivo aleatorio
    // Agente aprende a navegar hacia ESE objetivo
}
```

El agente aprende:
- "Si estoy en (2,3) y el objetivo está a mi derecha-abajo, debo moverme derecha"
- "Si estoy en (5,5) y el objetivo está arriba, debo moverme arriba"
- **Generaliza** el concepto de "navegar hacia un objetivo"

### Después del Entrenamiento

```javascript
// Puedes cambiar el objetivo sin re-entrenar
env.setGoal([7, 2]); // Nuevo objetivo
agent.navigateToGoal([7, 2]); // ✅ Funciona!
```

---

## 📂 Archivos Creados

### 🆕 Sistema Goal-Conditioned:

1. **`env_2DGoalConditioned.js`**
   - Método `setGoal(newGoal)` - Cambiar objetivo dinámicamente
   - Método `randomizeGoal()` - Objetivo aleatorio para entrenamiento
   - Visualización interactiva con hover

2. **`agentesRLGoalConditioned.js`**
   - Q-Table con conciencia del objetivo
   - Método `navigateToGoal(goal)` - Ir a objetivo específico
   - Entrenamiento con múltiples objetivos

3. **`trainingGoalConditioned.js`**
   - Click en canvas para cambiar objetivo
   - Navegación automática al hacer click
   - Callbacks para visualización

4. **`trainingGoalConditioned.html`**
   - Interfaz interactiva
   - Badge "DYNAMIC GOAL"
   - Instrucciones visuales

---

## 🎮 Cómo Usar

### Paso 1: Abrir la Interfaz
```
Archivo: trainingGoalConditioned.html
```

### Paso 2: Configurar
- **Episodios**: 1500+ (necesita más que single-goal)
- **Grid**: 10x10
- **Obstáculos**: 10%

### Paso 3: Entrenar
1. Click en "Crear Entorno"
2. Click en "Entrenar"
3. Observa cómo cambia el objetivo en cada episodio

### Paso 4: Probar Interactivamente 🎯
**¡AQUÍ ESTÁ LA MAGIA!**

1. Después del entrenamiento, **haz CLICK en cualquier celda del grid**
2. El agente **navegará automáticamente** hacia ese punto
3. Prueba con diferentes objetivos
4. ¡No necesitas re-entrenar!

---

## 🎨 Interfaz Interactiva

### Visualización:
- ⭐ **Estrella dorada**: Objetivo actual
- 🟦 **Círculo azul**: Agente
- ⚫ **Círculos negros**: Obstáculos
- 📏 **Línea punteada**: Camino directo (Manhattan)

### Interactividad:
- 🖱️ **Hover**: El canvas brilla
- 🖱️ **Click**: Establece nuevo objetivo
- ⚡ **Automático**: El agente navega inmediatamente

---

## 🔬 Conceptos Técnicos

### 1. Goal Representation

```javascript
_getGoalDirection(state, goal) {
    const dy = goal[0] - state[0];
    const dx = goal[1] - state[1];
    
    // Convierte a 9 direcciones
    const dirY = dy === 0 ? 1 : (dy > 0 ? 2 : 0);
    const dirX = dx === 0 ? 1 : (dx > 0 ? 2 : 0);
    
    return dirY * 3 + dirX; // 0-8
}
```

### 2. Recompensa Basada en Distancia

```javascript
_getDistanceReward() {
    const dx = Math.abs(this.state[1] - this.goal[1]);
    const dy = Math.abs(this.state[0] - this.goal[0]);
    const distance = dx + dy;
    
    return -distance * 0.1; // Más cerca = mejor
}
```

### 3. Entrenamiento Multi-Objetivo

```javascript
for (let episode = 0; episode < numEpisodes; episode++) {
    env.reset(true); // true = randomize goal ✨
    // ... entrenar hacia ese objetivo específico
}
```

---

## 📊 Resultados Esperados

### Configuración de Prueba:
- Grid: 10x10
- Obstáculos: 10%
- Episodios: 1500
- Alpha: 0.1, Gamma: 0.9, Epsilon: 0.1

### Métricas:

| Métrica | Single-Goal | Multi-Goal | Goal-Conditioned |
|---------|-------------|------------|------------------|
| **Convergencia** | 300 eps | 500 eps | 700 eps |
| **Flexibilidad** | ❌ Ninguna | ⚠️ Limitada | ✅ Total |
| **Objetivos** | 1 fijo | 3-8 fijos | ∞ dinámicos |
| **Re-entrenar** | ✅ Necesario | ✅ Necesario | ❌ No necesario |
| **Generalización** | Baja | Media | Alta |

---

## 🎯 Casos de Uso

### ✅ Ideal Para:

1. **Navegación Dinámica**
   - Usuario selecciona destino en tiempo real
   - Waypoints cambiantes

2. **Robótica**
   - Robot que debe ir a diferentes estaciones
   - Trayectorias que cambian según contexto

3. **Videojuegos**
   - NPCs que navegan a objetivos dinámicos
   - Pathfinding adaptativo

4. **Exploración**
   - Agente que explora puntos de interés
   - Objetivos determinados por sensores

### ❌ No Ideal Para:

- Tareas con meta única conocida
- Cuando re-entrenar es barato
- Problemas donde la meta define la estrategia completa

---

## 💡 Ventajas vs Desventajas

### ✅ Ventajas:

1. **Flexibilidad Total**
   - Cambia objetivos sin re-entrenar
   - Adapta a nuevos escenarios

2. **Generalización**
   - Aprende concepto general de navegación
   - Funciona con metas no vistas

3. **Eficiencia Post-Entrenamiento**
   - Una sola política para todos los objetivos
   - Deployment simplificado

4. **Interactividad**
   - Usuario puede interactuar en tiempo real
   - Demostración más impresionante

### ⚠️ Desventajas:

1. **Entrenamiento Más Largo**
   - Necesita ~2x más episodios
   - Más complejo de optimizar

2. **Q-Table Más Grande**
   - 9x más grande (por las direcciones)
   - Mayor uso de memoria

3. **Puede Ser Overkill**
   - Si solo necesitas 1-2 objetivos, es excesivo

---

## 🔧 Personalización

### Cambiar Sistema de Direcciones

Actualmente usa 9 direcciones. Podrías usar 4:

```javascript
_getGoalDirection(state, goal) {
    const dy = goal[0] - state[0];
    const dx = goal[1] - state[1];
    
    // 4 direcciones cardinales
    if (Math.abs(dy) > Math.abs(dx)) {
        return dy > 0 ? 1 : 0; // Arriba/Abajo
    } else {
        return dx > 0 ? 3 : 2; // Derecha/Izquierda
    }
}
```

### Cambiar Sistema de Recompensas

Actualmente usa distancia Manhattan. Podrías usar Euclidiana:

```javascript
_getDistanceReward() {
    const dx = this.state[1] - this.goal[1];
    const dy = this.state[0] - this.goal[0];
    const distance = Math.sqrt(dx*dx + dy*dy);
    return -distance * 0.1;
}
```

---

## 🧪 Experimentos Sugeridos

### 1. Comparación Directa
```
1. Entrenar single-goal en (9,9)
2. Entrenar goal-conditioned
3. Ambos navegar a (9,9)
4. Cambiar objetivo a (3,5)
   - Single-goal: ❌ Falla
   - Goal-conditioned: ✅ Funciona
```

### 2. Test de Generalización
```
1. Entrenar con obstáculos al 10%
2. Cambiar obstáculos al 15%
3. Probar con nuevos objetivos
4. Medir tasa de éxito
```

### 3. Velocidad de Adaptación
```
1. Entrenar
2. Cambiar objetivo cada 5 segundos
3. Medir tiempo hasta llegar
4. Comparar consistencia
```

---

## 📚 Teoría Subyacente

### Universal Value Function Approximators (UVFA)

Goal-Conditioned RL implementa una forma de UVFA:

```
V(s, g) = "Valor de estar en estado s con objetivo g"
Q(s, a, g) = "Valor de acción a en estado s para objetivo g"
```

### Hindsight Experience Replay (HER)

Aunque no implementado aquí, HER es una extensión natural:
- Cada experiencia fallida se re-etiqueta como éxito para otro objetivo
- Aprende incluso de fallos

### Transfer Learning

Goal-Conditioned permite transfer learning:
- Aprende en un entorno
- Transfiere a entornos similares con nuevos objetivos

---

## 🎓 Para Aprender Más

### Papers Importantes:
1. "Universal Value Function Approximators" (Schaul et al., 2015)
2. "Hindsight Experience Replay" (Andrychowicz et al., 2017)
3. "Goal-Conditioned Reinforcement Learning" (Pong et al., 2018)

### Aplicaciones Reales:
- Robótica (Fetch, UR5)
- Manipulación de objetos
- Navegación autónoma
- Juegos (AlphaStar, OpenAI Five)

---

## ✅ Resumen Ejecutivo

**Goal-Conditioned RL** es la evolución natural de RL cuando necesitas:
- 🎯 **Flexibilidad**: Objetivos dinámicos
- 🧠 **Generalización**: Funciona con metas no vistas
- ⚡ **Rapidez**: Sin re-entrenamiento
- 🎮 **Interactividad**: Usuario controla objetivos

**Trade-off**: Entrenamiento más largo, pero deployment infinitamente más flexible.

**Uso Recomendado**: Cuando los objetivos varían frecuentemente o son definidos por usuarios/entorno en tiempo real.

---

¡Experimenta haciendo click en el grid después del entrenamiento! 🎯✨

**Autor**: Sistema de RL Avanzado  
**Versión**: 1.0  
**Fecha**: 2024

