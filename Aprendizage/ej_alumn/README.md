# 🎮 Reinforcement Learning - Versión Web

Este directorio contiene la implementación en JavaScript de los algoritmos de Reinforcement Learning del curso.

## 📁 Archivos

### 1. **index.html** - Simulación con Movimientos Aleatorios
Replica el comportamiento de `ej_alumn.py`:
- Agente que se mueve aleatoriamente hasta llegar al objetivo
- Visualización en tiempo real
- Control de velocidad de simulación
- Modo paso a paso

**Uso:** Abre `index.html` en tu navegador

### 2. **training.html** - Entrenamiento de Agentes RL
Interfaz completa para entrenar y probar agentes:
- **Algoritmos:** Q-Learning y SARSA
- **Entrenamiento:** Configurable (α, γ, ε, episodios)
- **Visualización:** Gráfico de recompensas en tiempo real
- **Testing:** Prueba el agente entrenado

**Uso:** Abre `training.html` en tu navegador

### 3. **env_2D.js** - Clase Environment2D
Implementación del entorno 2D con:
- Grid configurable
- Obstáculos aleatorios
- Sistema de recompensas
- Rendering en canvas

### 4. **agentesRL.js** - Clase Agent
Implementación de algoritmos RL:
- **Q-Learning:** Temporal Difference Learning
- **SARSA:** On-policy TD Control
- **Métodos auxiliares:** exportar/importar Q-table, estadísticas, política

### 5. **ej_alumn.js** - Lógica de simulación aleatoria
Control de la simulación con movimientos aleatorios

### 6. **training.js** - Lógica de entrenamiento
Control del entrenamiento y testing de agentes

## 🚀 Inicio Rápido

1. **Demo Rápida (Movimientos Aleatorios):**
   ```
   Abre: index.html
   Presiona: "Iniciar" para ver al agente moverse aleatoriamente
   ```

2. **Entrenar un Agente:**
   ```
   Abre: training.html
   Configura parámetros (o usa los por defecto)
   Presiona: "Entrenar"
   Espera a que termine
   Presiona: "Probar Agente"
   ```

## 🎯 Funcionalidades Principales

### Environment2D
- Grids de 5x5 hasta 30x30
- Porcentaje configurable de obstáculos (0-50%)
- Posición inicial: (0, 0)
- Objetivo: esquina inferior derecha
- Recompensas: -1 por paso, +1 al llegar al objetivo

### Agent (Q-Learning/SARSA)
- **Alpha (α):** Learning rate (0.1 por defecto)
- **Gamma (γ):** Discount factor (0.9 por defecto)
- **Epsilon (ε):** Exploration rate (0.1 por defecto)
- **Episodios:** Número de episodios de entrenamiento

## ⌨️ Atajos de Teclado

### index.html
- `Espacio`: Iniciar/Pausar simulación
- `R`: Reiniciar
- `N`: Nuevo entorno
- `S`: Paso a paso

### training.html
- `Ctrl+E`: Crear entorno
- `Ctrl+T`: Iniciar entrenamiento
- `Ctrl+S`: Detener entrenamiento

## 📊 Características Adicionales

### Visualización
- Canvas HTML5 para rendering
- Colores: Azul (agente), Rojo (objetivo), Negro (obstáculos)
- Grid visible con líneas

### Estadísticas en Tiempo Real
- Posición actual del agente
- Número de pasos
- Recompensa total y promedio
- Progreso del entrenamiento

### Gráficos
- Gráfico de recompensas por episodio
- Promedio móvil (últimos 100 episodios)
- Actualización en tiempo real durante el entrenamiento

### Debugging
- Log en consola y en pantalla
- Visualización de política aprendida
- Estadísticas de Q-table
- Exportar/Importar Q-table

## 🔧 Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- JavaScript habilitado
- No requiere servidor web (funciona con file://)

## 📝 Notas

- La Q-table se guarda en memoria (se pierde al recargar la página)
- Para entrenamientos largos, desactiva "Visualizar" para mejor rendimiento
- Los algoritmos son idénticos a la versión Python

## 🎓 Uso Académico

Este código replica exactamente el comportamiento de:
- `env_2D.py` → `env_2D.js`
- `agentesRL.py` → `agentesRL.js`
- `ej_alumn.py` → `index.html + ej_alumn.js`

Ideal para:
- Visualizar el comportamiento de los algoritmos
- Experimentar con diferentes parámetros
- Entender Q-Learning y SARSA visualmente
- Comparar resultados con la versión Python

