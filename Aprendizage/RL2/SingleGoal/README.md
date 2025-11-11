# 🎯 Single-Goal Reinforcement Learning

## 📋 Descripción

Sistema básico de Reinforcement Learning con **un único objetivo fijo**.

### Características:
- ✅ **1 meta fija** en la esquina inferior derecha (9,9)
- ✅ Política simple y determinista
- ✅ Entrenamiento rápido (~300-500 episodios)
- ✅ Ideal para aprender conceptos básicos de RL

---

## 📂 Archivos

- `index.html` - Interfaz web principal
- `training.js` - Lógica de entrenamiento
- `env_2D.js` - Entorno 2D con 1 meta fija
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
- **Episodios**: 1000

### 3. Crear entorno
- Click en "Crear Entorno"
- Se generará un grid 10x10 con obstáculos

### 4. Entrenar
- Selecciona algoritmo (Q-Learning o SARSA)
- Click en "Entrenar"
- Espera 2-5 segundos

### 5. Probar
- Click en "Probar Agente"
- Observa cómo navega hacia la esquina inferior derecha

---

## 🎨 Visualización

- 🟦 **Círculo azul**: Agente
- 🔴 **Círculo rojo**: Meta (esquina inferior derecha)
- ⚫ **Círculos negros**: Obstáculos
- ⬜ **Grid blanco**: Cuadrícula de navegación

---

## 📊 Resultados Esperados

### Grid 10x10, Obstáculos 10%:
- **Episodios para converger**: ~300-500
- **Pasos promedio**: 15-20
- **Recompensa promedio**: -15 a -20
- **Tasa de éxito**: ~100%

---

## 💡 Conceptos Implementados

### Algoritmos:
1. **Q-Learning** (Off-Policy)
   - Aprende política óptima
   - Más agresivo en la exploración

2. **SARSA** (On-Policy)
   - Aprende política que sigue
   - Más conservador

### Sistema de Recompensas:
- **+1**: Al alcanzar la meta
- **-1**: Por cada paso
- **Objetivo**: Minimizar pasos (maximizar recompensa)

### Política:
- **Epsilon-Greedy**: Balance exploración/explotación
- **Frozen después del entrenamiento**: Siempre va a (9,9)

---

## 🆚 Comparación

| Aspecto | Single-Goal |
|---------|-------------|
| **Metas** | 1 fija |
| **Flexibilidad** | Baja |
| **Velocidad entrenamiento** | ⚡ Rápida |
| **Complejidad** | 🟢 Baja |
| **Uso ideal** | Aprendizaje básico de RL |

---

## 🔗 Otros Sistemas

- 📁 **MultiGoal**: Múltiples metas aleatorias
- 📁 **GoalConditioned**: Objetivo dinámico interactivo (¡prueba este!)

---

**Bueno para**: Aprender conceptos básicos, demos rápidas, problemas específicos de navegación punto-a-punto.

