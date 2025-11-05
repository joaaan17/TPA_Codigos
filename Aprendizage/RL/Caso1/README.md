# 🧠 Reinforcement Learning - Visualización Web

Sistema completo de Reinforcement Learning con visualización interactiva en el navegador.

## 📁 Estructura del Proyecto

```
RL/
├── index.html              # Página principal de navegación
├── random-agent.html       # Demostración de agente aleatorio
├── q-learning.html         # Entrenamiento con Q-Learning
├── sarsa.html             # Entrenamiento con SARSA
├── README.md              # Este archivo
├── core/                  # Código JavaScript core
│   ├── env_2D.js         # Entorno 2D (replica env_2D.py)
│   └── agentesRL.js      # Algoritmos RL (replica agentesRL.py)
├── scripts/              # Scripts de control
│   ├── random-agent.js   # Lógica del agente aleatorio
│   └── training-common.js # Lógica común de entrenamiento
└── styles/               # Estilos CSS
    └── common.css        # Estilos compartidos
```

## 🚀 Inicio Rápido

### Opción 1: Abrir directamente
1. Abre `index.html` en tu navegador
2. Selecciona la demo que quieras probar
3. ¡Listo!

### Opción 2: Demos individuales
- **Agente Aleatorio:** Abre `random-agent.html`
- **Q-Learning:** Abre `q-learning.html`
- **SARSA:** Abre `sarsa.html`

## 📚 Demos Disponibles

### 1. 🎲 Agente Aleatorio
**Archivo:** `random-agent.html`

Observa un agente que se mueve aleatoriamente en el entorno.

**Características:**
- Movimientos completamente aleatorios
- Control de velocidad
- Modo paso a paso
- Visualización en tiempo real

**Uso:**
1. Configura el tamaño del entorno y obstáculos
2. Presiona "Iniciar" para comenzar la simulación
3. Observa cómo el agente explora sin estrategia

**Equivalente Python:**
```python
action = random.choice(env.get_valid_actions())
env.step(action)
```

### 2. 🎓 Q-Learning
**Archivo:** `q-learning.html`

Entrena un agente con el algoritmo Q-Learning.

**Características:**
- Off-policy TD control
- Parámetros configurables (α, γ, ε)
- Gráfico de aprendizaje en tiempo real
- Visualización de Q-table
- Testing del agente entrenado

**Parámetros:**
- **Alpha (α):** Learning rate (0.1 recomendado)
- **Gamma (γ):** Discount factor (0.9 recomendado)
- **Epsilon (ε):** Exploration rate (0.1 recomendado)
- **Episodios:** Número de episodios de entrenamiento

**Algoritmo:**
```
Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
```

### 3. 📚 SARSA
**Archivo:** `sarsa.html`

Entrena un agente con el algoritmo SARSA.

**Características:**
- On-policy TD control
- Parámetros configurables
- Comparación con Q-Learning
- Visualización de política

**Parámetros:** Mismos que Q-Learning

**Algoritmo:**
```
Q(s,a) ← Q(s,a) + α[r + γ Q(s',a') - Q(s,a)]
```

**Diferencia con Q-Learning:**
- Q-Learning usa `max Q(s',a')` (off-policy)
- SARSA usa `Q(s',a')` donde a' es la acción que realmente tomará (on-policy)

## 🎯 Flujo de Aprendizaje Recomendado

1. **Comenzar con Agente Aleatorio**
   - Entender el problema
   - Ver cómo se comporta sin aprendizaje
   - Notar la ineficiencia

2. **Experimentar con Q-Learning**
   - Configurar parámetros básicos
   - Entrenar 1000 episodios
   - Observar el gráfico de aprendizaje
   - Probar el agente entrenado

3. **Comparar con SARSA**
   - Usar las mismas configuraciones
   - Entrenar y comparar resultados
   - Analizar diferencias

4. **Experimentar**
   - Variar parámetros (α, γ, ε)
   - Cambiar tamaño del entorno
   - Añadir más obstáculos
   - Observar cómo afecta el aprendizaje

## ⚙️ Configuración del Entorno

### Parámetros Básicos
- **Ancho/Alto:** 5-20 (10 recomendado para empezar)
- **Obstáculos:** 0-40% (10% recomendado)

### Parámetros del Agente
- **Alpha (α):** 0.01-0.5
  - Muy bajo: Aprendizaje lento
  - Muy alto: Inestabilidad
  - Recomendado: 0.1

- **Gamma (γ):** 0.7-0.99
  - Bajo: Miope (solo importa recompensa inmediata)
  - Alto: Visionario (considera futuro lejano)
  - Recomendado: 0.9

- **Epsilon (ε):** 0.01-0.5
  - Bajo: Más explotación
  - Alto: Más exploración
  - Recomendado: 0.1

## 📊 Interpretando los Resultados

### Gráfico de Recompensas
- **Tendencia ascendente:** El agente está aprendiendo
- **Meseta:** El agente ha convergido
- **Oscilaciones:** Puede necesitar más episodios o ajustar α

### Métricas
- **Pasos:** Menos pasos = Mejor política aprendida
- **Recompensa total:** Mayor recompensa = Mejor desempeño
- **Promedio (últimos 100):** Indica estabilidad del aprendizaje

## ⌨️ Atajos de Teclado

### Agente Aleatorio
- `Espacio`: Iniciar/Pausar
- `R`: Reiniciar
- `N`: Nuevo entorno
- `S`: Paso a paso

### Q-Learning / SARSA
- `Ctrl+E`: Crear entorno
- `Ctrl+T`: Iniciar entrenamiento
- `Ctrl+S`: Detener entrenamiento

## 🔧 Características Técnicas

### Environment2D
- Grid configurable
- Obstáculos aleatorios
- Sistema de recompensas (-1 por paso, +1 al objetivo)
- Rendering en HTML5 Canvas

### Agent
- Implementación de Q-Learning y SARSA
- Epsilon-greedy para exploración/explotación
- Q-table con inicialización a ceros
- Métodos de análisis (estadísticas, política)

### Visualización
- Canvas HTML5 para rendering del entorno
- Gráficos de recompensas en tiempo real
- Log de eventos
- Interfaz responsive

## 🎓 Conceptos Clave

### Q-Table
Tabla que almacena el valor estimado de cada par (estado, acción).

### Epsilon-Greedy
Estrategia de exploración:
- Con probabilidad ε: acción aleatoria (exploración)
- Con probabilidad 1-ε: mejor acción conocida (explotación)

### Temporal Difference (TD)
Actualización incremental basada en estimaciones:
- No requiere esperar al final del episodio
- Aprende de cada transición

### Off-Policy vs On-Policy
- **Off-policy (Q-Learning):** Aprende política óptima independientemente de la política seguida
- **On-policy (SARSA):** Aprende la política que realmente sigue

## 🐛 Solución de Problemas

### El agente no aprende
- Aumentar número de episodios
- Verificar que α > 0
- Aumentar ε para más exploración
- Reducir obstáculos

### El gráfico oscila mucho
- Reducir α (learning rate)
- Aumentar número de episodios
- Reducir ε después de cierto entrenamiento

### El navegador se congela
- Desactivar "Visualizar" durante entrenamiento
- Reducir número de episodios
- Usar entorno más pequeño

## 💾 Guardar/Cargar Agentes

Los agentes entrenados se pueden exportar/importar:

```javascript
// Exportar
const qdata = agent.exportQTable();
localStorage.setItem('myAgent', JSON.stringify(qdata));

// Importar
const qdata = JSON.parse(localStorage.getItem('myAgent'));
agent.importQTable(qdata);
```

## 📝 Correspondencia con Python

| Python | JavaScript |
|--------|-----------|
| `env_2D.py` | `core/env_2D.js` |
| `agentesRL.py` | `core/agentesRL.js` |
| `ej_alumn.py` | `random-agent.html` |
| `agent.train_q_learning()` | `agent.trainQLearning()` |
| `agent.train_sarsa()` | `agent.trainSARSA()` |
| `agent.test_agent()` | `agent.testAgent()` |

## 🌟 Características Avanzadas

### Análisis de Q-Table
```javascript
// Ver política aprendida
agent.printPolicy();

// Estadísticas
const stats = agent.getQTableStats();
console.log(stats);
// { mean, min, max, nonZeroCount, totalValues, sparsity }

// Mejor acción para un estado
const bestAction = agent.getBestAction([0, 0]);
```

### Callbacks Personalizados
Los métodos de entrenamiento aceptan callbacks:

```javascript
agent.trainQLearning(1000, 
    (episode, total) => console.log(`Episodio ${episode}/${total}`),
    (episode, reward, rewards) => updateChart(rewards)
);
```

## 📖 Recursos Adicionales

- **Sutton & Barto:** "Reinforcement Learning: An Introduction"
- **David Silver:** Curso de RL (YouTube)
- **OpenAI Spinning Up:** spinning-up.openai.com

## 🤝 Contribuciones

Este proyecto es para fines académicos del curso TPA.

## 📄 Licencia

Uso académico - Técnicas de Programación Avanzada

---

**💡 Tip Final:** Experimenta con diferentes configuraciones y observa cómo afectan el aprendizaje. ¡La mejor manera de aprender es practicando!

