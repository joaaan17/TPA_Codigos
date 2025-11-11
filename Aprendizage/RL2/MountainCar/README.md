# 🏔️ Mountain Car - Reinforcement Learning

Implementación interactiva del clásico problema de Reinforcement Learning **Mountain Car** en HTML5 y JavaScript.

## ⚡ Optimización de Entrenamiento

**NUEVO**: Entrenamiento optimizado sin visualización durante el proceso. El entrenamiento de 1000 episodios ahora toma solo **5-10 segundos** en lugar de varios minutos. La visualización solo se muestra al probar el agente entrenado.

## 📋 Descripción

El **Mountain Car** es un problema paradigmático en el aprendizaje por refuerzo donde un coche atrapado en un valle debe aprender a alcanzar la cima de la colina derecha, a pesar de no tener suficiente potencia para subir directamente.

### 🎯 Objetivo

El coche debe llegar a la cima de la colina derecha (posición ≥ 0.5). El desafío radica en que debe primero retroceder hacia la colina izquierda para ganar impulso y luego acelerar hacia la derecha.

## 🎮 Características

- **Control Manual**: Prueba el entorno manualmente usando los botones de control
- **Entrenamiento Automático**: Entrena agentes usando Q-Learning o SARSA
- **Visualización en Tiempo Real**: Observa cómo aprende el agente
- **Gráficos de Progreso**: Visualiza el aprendizaje con gráficos de recompensas
- **Configuración Flexible**: Ajusta hiperparámetros del aprendizaje

## 🧠 Algoritmos Implementados

### Q-Learning (Off-Policy)
Algoritmo de Temporal Difference que aprende la política óptima independientemente de la política seguida durante el entrenamiento.

**Actualización**:
```
Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
```

### SARSA (On-Policy)
Algoritmo que aprende el valor de las acciones basándose en la política que realmente sigue el agente.

**Actualización**:
```
Q(s,a) ← Q(s,a) + α[r + γ Q(s',a') - Q(s,a)]
```

## ⚙️ Parámetros del Entorno

### Espacio de Estados (Continuo)
- **Posición**: [-1.2, 0.6]
- **Velocidad**: [-0.07, 0.07]

*Nota: Los estados se discretizan en 20x20 bins para usar Q-Learning tabular*

### Espacio de Acciones (Discreto)
- **0**: Acelerar hacia la izquierda
- **1**: No acelerar (neutral)
- **2**: Acelerar hacia la derecha

### Recompensas
- Cada paso: **-1** (penalización por tiempo)
- Meta alcanzada: Episodio termina
- Límite de pasos: **200**

### Física del Entorno
```javascript
velocity_t+1 = velocity_t + force * power - cos(3 * position_t) * gravity
position_t+1 = position_t + velocity_t+1

donde:
- power = 0.001
- gravity = 0.0025
- force = action - 1  // -1, 0, o +1
```

## 🚀 Uso

### 1. Control Manual
Usa los botones de control manual para experimentar con el entorno:
- **← Izquierda**: Acelera el coche hacia la izquierda
- **⏸ Neutral**: Sin aceleración
- **Derecha →**: Acelera el coche hacia la derecha

### 2. Entrenamiento Automático

1. **Selecciona el algoritmo**: Q-Learning o SARSA
2. **Ajusta los hiperparámetros**:
   - **Alpha (α)**: Tasa de aprendizaje (0.1 recomendado)
   - **Gamma (γ)**: Factor de descuento (0.99 recomendado)
   - **Epsilon (ε)**: Tasa de exploración inicial (1.0)
   - **Decay**: Factor de decaimiento de epsilon (0.995)
   - **Min ε**: Epsilon mínimo (0.01)
3. **Configura episodios**: Número de episodios de entrenamiento (500-1000 recomendado)
4. **Haz clic en "🎓 Entrenar"**
5. **Observa el progreso** en el gráfico y logs

### 3. Probar Agente Entrenado

Después del entrenamiento:
1. Haz clic en **"🧪 Probar Agente"**
2. Observa cómo el agente usa la política aprendida (sin exploración)

## 📊 Interpretación de Resultados

### Recompensas
- **Recompensa > -200**: Muy bueno (alcanza la meta rápidamente)
- **Recompensa ≈ -150**: Bueno (alcanza la meta)
- **Recompensa = -200**: Malo (no alcanza la meta)

### Tasa de Éxito
- Porcentaje de episodios donde el agente alcanza la meta
- Una buena política debería lograr >90% después de suficiente entrenamiento

### Curva de Aprendizaje
- La recompensa promedio debe **aumentar** (menos negativa) con el tiempo
- Indica que el agente está aprendiendo una mejor política

## 🧪 Experimentos Sugeridos

1. **Comparar Q-Learning vs SARSA**
   - ¿Cuál converge más rápido?
   - ¿Cuál encuentra mejor política?

2. **Efecto de Alpha**
   - Alpha alto (0.5): Aprendizaje rápido pero inestable
   - Alpha bajo (0.01): Aprendizaje lento pero estable

3. **Efecto de Gamma**
   - Gamma alto (0.99): Considera recompensas futuras
   - Gamma bajo (0.5): Enfoque en recompensas inmediatas

4. **Estrategia de Exploración**
   - Decaimiento rápido de epsilon: Convergencia rápida pero subóptima
   - Decaimiento lento: Mejor exploración, convergencia más lenta

## 💡 Conceptos Clave de RL

### Sparse Rewards (Recompensas Escasas)
El agente solo recibe señales de recompensa significativas al final (alcanzar la meta). Esto hace que el aprendizaje sea más difícil.

### Delayed Gratification (Gratificación Diferida)
El agente debe aprender que alejarse temporalmente del objetivo (retroceder) es necesario para alcanzarlo eventualmente.

### Exploration vs Exploitation
- **Exploración**: Probar acciones aleatorias para descubrir nuevas estrategias
- **Explotación**: Usar el conocimiento actual para maximizar recompensas

### Credit Assignment Problem
¿Qué acciones fueron responsables del éxito/fracaso? El algoritmo TD learning (Q-Learning/SARSA) resuelve esto propagando valores hacia atrás.

## 🏗️ Estructura del Proyecto

```
MountainCar/
├── index.html          # Página principal con UI
├── styles.css          # Estilos CSS
├── mountaincar.js      # Implementación del entorno
├── agent.js           # Agentes RL (Q-Learning, SARSA)
├── training.js        # Sistema de entrenamiento
└── README.md          # Esta documentación
```

## 🎓 Recursos Adicionales

- **Sutton & Barto**: "Reinforcement Learning: An Introduction" - Capítulo 6
- **OpenAI Gymnasium**: [MountainCar-v0 Documentation](https://gymnasium.farama.org/environments/classic_control/mountain_car/)
- **Original Paper**: Moore, A. W. (1990). Efficient Memory-based Learning for Robot Control

## 🐛 Troubleshooting

**El agente no aprende:**
- Aumenta el número de episodios (1000+)
- Verifica que epsilon decay no sea muy rápido
- Intenta diferentes tasas de aprendizaje (alpha)

**Entrenamiento muy lento:**
- ✅ **YA OPTIMIZADO**: Visualización desactivada durante entrenamiento
- El entrenamiento ahora es muy rápido (5-10 segundos para 1000 episodios)
- Solo se visualiza al usar "Probar Agente"

**Resultados inconsistentes:**
- El aprendizaje RL es estocástico por naturaleza
- Ejecuta múltiples entrenamientos y promedia resultados
- Ajusta la semilla aleatoria (no implementado, pero puede agregarse)

## 📝 Notas de Implementación

- Estados discretizados en grilla 20x20 (400 estados totales)
- Tabla Q implementada con JavaScript Map
- Epsilon-greedy para balance exploración/explotación
- Canvas HTML5 para renderizado
- Animación con requestAnimationFrame

## 🤝 Contribuciones

Este proyecto es educativo. Siéntete libre de experimentar y modificar el código para aprender más sobre Reinforcement Learning.

---

**¡Diviértete aprendiendo Reinforcement Learning! 🎉**

