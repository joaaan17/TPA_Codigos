# 🎯 Sistema de Aprendizaje Multi-Goal

## 📋 Archivos Creados

### Versión Single-Goal (Original)
- `training.html` - Interfaz web original
- `training.js` - Lógica de entrenamiento
- `env_2D.js` - Entorno con 1 meta
- `agentesRL.js` - Agente RL estándar

### Versión Multi-Goal (Nueva) ⭐
- `trainingMulti.html` - Interfaz web multi-goal
- `trainingMulti.js` - Lógica de entrenamiento multi-goal
- `env_2DMulti.js` - Entorno con múltiples metas
- `agentesRLMulti.js` - Agente RL multi-goal

---

## 🆚 Diferencias Principales

### 1. **Entorno (`env_2DMulti.js`)**

#### Single-Goal:
```javascript
this.goal = [width - 1, height - 1]; // 1 meta fija
reward = 1; // Recompensa: +1
```

#### Multi-Goal:
```javascript
this.goals = []; // Array de múltiples metas
this.numGoals = numGoals; // Configurable
reward = 10; // Recompensa mayor: +10
```

**Características Multi-Goal:**
- ✅ Múltiples metas generadas aleatoriamente
- ✅ El agente termina al alcanzar CUALQUIER meta
- ✅ Cada meta tiene un color diferente (estrella con número)
- ✅ Recompensa más alta (+10 vs +1) para compensar dificultad

---

### 2. **Visualización**

#### Single-Goal:
- 🔴 1 círculo rojo (meta única)
- Esquina inferior derecha

#### Multi-Goal:
- ⭐ Múltiples estrellas de colores
- 🎨 Colores: Oro, Rojo, Verde, Rosa, Cyan, Naranja
- 🔢 Cada estrella tiene un número (1, 2, 3...)
- 📍 Posiciones aleatorias

---

### 3. **Política de Aprendizaje**

#### Frozen Policy (Single-Goal):
```
Política determinista → 1 meta fija
El agente siempre va al mismo destino
```

#### Multi-Goal Policy:
```
Política flexible → n metas posibles
El agente aprende a llegar a la META MÁS CERCANA
Generaliza mejor → más robusto
```

---

## 🧠 ¿Por Qué Multi-Goal?

### Ventajas:
1. **Generalización**: El agente aprende a navegar a múltiples destinos
2. **Robustez**: No depende de una única configuración
3. **Exploración**: Fomenta mejor exploración del espacio de estados
4. **Realismo**: Más parecido a problemas del mundo real

### Desventajas:
- Mayor complejidad
- Puede tardar más en converger
- Necesita más episodios de entrenamiento

---

## 🚀 Cómo Usar

### 1. Abrir la Interfaz
```
Abre: trainingMulti.html
```

### 2. Configurar Parámetros
- **Número de Metas**: 2-8 (recomendado: 3-5)
- **Tamaño Grid**: 10x10 (default)
- **Obstáculos**: 10% (default)
- **Episodios**: 1000+ (multi-goal necesita más)

### 3. Crear Entorno
- Click en "Crear Entorno"
- Se generarán las metas aleatoriamente

### 4. Entrenar
- Selecciona algoritmo (Q-Learning o SARSA)
- Click en "Entrenar"
- Observa las estadísticas de distribución de metas

### 5. Probar
- Click en "Probar Agente"
- Verás a qué metas llega más frecuentemente

---

## 📊 Interpretación de Resultados

### Single-Goal:
```
Meta alcanzada: 100% de las veces en la misma posición
Recompensa típica: -17 (grid 10x10)
```

### Multi-Goal:
```
Meta alcanzada: Distribución entre las n metas
Recompensa típica: -8 a +5 (llega más rápido a meta cercana)
Distribución: [30%, 25%, 20%, 15%, 10%] (ejemplo 5 metas)
```

---

## 🔬 Comparación Experimental

### Configuración de Prueba:
- Grid: 10x10
- Obstáculos: 10%
- Episodios: 1000
- Alpha: 0.1, Gamma: 0.9, Epsilon: 0.1

### Resultados Esperados:

| Métrica | Single-Goal | Multi-Goal (3 metas) |
|---------|-------------|----------------------|
| Convergencia | ~300 episodios | ~500 episodios |
| Recompensa Promedio | -15 a -20 | -5 a -10 |
| Exploración | Baja | Alta |
| Robustez | Baja | Alta |

---

## 💡 Conceptos Clave

### Frozen Policy:
- Política aprendida y **no cambia** después del entrenamiento
- En single-goal: siempre va al mismo lugar
- En multi-goal: **elige dinámicamente** la mejor meta según posición

### Multi-Goal Learning:
- El agente aprende valores Q para **alcanzar cualquier meta**
- La Q-Table generaliza: Q(s,a) es útil para múltiples objetivos
- Política emergente: "ir hacia la meta más cercana/accesible"

---

## 🎯 Casos de Uso

### Single-Goal:
- ✅ Problema específico con destino único
- ✅ Navegación punto a punto
- ✅ Entorno estático

### Multi-Goal:
- ✅ Robot que debe llegar a estaciones de carga
- ✅ Agente de delivery con múltiples destinos
- ✅ Navegación en entornos dinámicos
- ✅ Problemas de optimización de rutas

---

## 🐛 Debugging

### Si el agente no aprende:
1. Aumenta episodios (multi-goal necesita más)
2. Ajusta epsilon (más exploración)
3. Reduce número de metas (empezar con 2-3)
4. Verifica que no haya demasiados obstáculos

### Si todas las metas tienen distribución similar:
✅ ¡Eso es bueno! Significa que el agente aprendió a alcanzar cualquiera

### Si una meta domina (>80%):
⚠️ Puede ser que esa meta esté más cerca del inicio
💡 Esto es natural y esperado

---

## 📚 Referencias Teóricas

### Q-Learning Multi-Goal:
```
Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
```
Donde `r = 10` si alcanza cualquier meta

### SARSA Multi-Goal:
```
Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a') - Q(s,a)]
```
Más conservador, aprende política real

---

## 🎨 Personalización

### Cambiar colores de metas:
Edita en `env_2DMulti.js`:
```javascript
const goalColors = ['#FFD700', '#FF6347', '#32CD32', ...];
```

### Cambiar recompensa por meta:
```javascript
reward = 10; // Cambia este valor
```

### Agregar más metas:
```html
<input type="number" id="numGoals" value="3" min="2" max="8">
```

---

## ✅ Checklist de Implementación

- [x] Entorno con múltiples metas
- [x] Visualización con estrellas de colores
- [x] Estadísticas de distribución de metas
- [x] Interfaz con configuración de número de metas
- [x] Agente que aprende a alcanzar cualquier meta
- [x] Sistema de recompensas ajustado
- [x] Logs informativos sobre qué meta se alcanzó
- [x] Pruebas que muestran distribución

---

## 🚀 Próximos Pasos

1. **Hindsight Experience Replay (HER)**: Mejorar aprendizaje
2. **Goal Prioritization**: Aprender a priorizar metas
3. **Dynamic Goals**: Metas que cambian durante el entrenamiento
4. **Multi-Agent Multi-Goal**: Múltiples agentes compartiendo metas

---

**Autor**: Sistema de Aprendizaje por Refuerzo  
**Fecha**: 2024  
**Versión**: 1.0  

¡Experimenta y aprende! 🎯🤖

