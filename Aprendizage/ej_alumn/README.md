# 🤖 Sistemas de Reinforcement Learning

## 📁 Estructura del Proyecto

```
ej_alumn/
│
├── 📄 index.html                    ← 🚀 EMPIEZA AQUÍ (Índice visual)
│
├── 📁 SingleGoal/                   🎯 Sistema Básico (1 meta)
│   ├── index.html
│   ├── training.js
│   ├── env_2D.js
│   ├── agentesRL.js
│   └── README.md
│
├── 📁 MultiGoal/                    ⭐ Múltiples Metas
│   ├── index.html
│   ├── training.js
│   ├── env_2D.js
│   ├── agentesRL.js
│   └── README.md
│
├── 📁 GoalConditioned/              🚀 Objetivo Dinámico
│   ├── index.html
│   ├── training.js
│   ├── env_2D.js
│   ├── agentesRL.js
│   └── README.md
│
└── 📁 MountainCar/                  🏔️ Problema Clásico
    ├── index.html
    ├── training.js
    ├── mountaincar.js
    ├── agent.js
    ├── styles.css
    └── README.md
```

---

## 🚀 Inicio Rápido

### ⭐ RECOMENDADO: Interfaz Visual
```
Abre: index.html
```
Página interactiva con todos los sistemas disponibles.

---

## 🎯 Los 4 Sistemas Disponibles

### 1️⃣ SingleGoal - Sistema Básico 🎯
**Ubicación**: `SingleGoal/index.html`

**¿Qué hace?**
- Agente aprende a navegar hacia 1 meta fija
- Grid 2D discreto
- Ideal para aprender fundamentos

**Tiempo**: ⚡ 2-5 segundos (1000 episodios)

---

### 2️⃣ MultiGoal - Múltiples Objetivos ⭐  
**Ubicación**: `MultiGoal/index.html`

**¿Qué hace?**
- Agente aprende a navegar hacia múltiples metas
- 2-8 metas aleatorias
- Visualización con estrellas de colores

**Tiempo**: 5-10 segundos (1500 episodios)

---

### 3️⃣ GoalConditioned - Objetivo Dinámico 🚀
**Ubicación**: `GoalConditioned/index.html`

**¿Qué hace?** ⭐
- **HAZ CLICK en el grid** para cambiar objetivo
- Agente navega **sin re-entrenar**
- Generaliza a cualquier meta

**Tiempo**: 5-15 segundos (1500 episodios)

**💡 Lo Especial**: Después de entrenar, haz click en cualquier celda y el agente irá ahí inmediatamente.

---

### 4️⃣ MountainCar - Problema Clásico 🏔️
**Ubicación**: `MountainCar/index.html`

**¿Qué hace?**
- Problema clásico de RL
- Espacio de estados **continuo** (no discreto 2D)
- El coche usa impulso para llegar a la meta
- Estrategia contraintuitiva (retroceder para avanzar)

**Tiempo**: ⚡ 3-8 segundos (1000 episodios)

**💡 Optimizado**: Entrenamiento sin visualización para máxima velocidad. Solo visualiza al probar el agente.

---

## 🆚 Comparación Rápida

| Sistema | Tipo | Metas | Interactivo | Tiempo | Nivel |
|---------|------|-------|-------------|--------|-------|
| **SingleGoal** | Grid 2D | 1 fija | ❌ | ⚡ 2-5s | 🟢 Fácil |
| **MultiGoal** | Grid 2D | 3-8 | ❌ | 5-10s | 🟡 Medio |
| **GoalConditioned** | Grid 2D | ∞ | ✅ Click | 5-15s | 🟠 Avanzado |
| **MountainCar** | Continuo | 1 fija | ❌ | ⚡ 3-8s | 🟠 Avanzado |

---

## 🎓 ¿Cuál Elegir?

### Para Aprender RL:
→ **SingleGoal** (Lo más simple)

### Para Explorar Variantes:
→ **MultiGoal** (Múltiples metas)

### Para Impresionar:
→ **GoalConditioned** (Click para cambiar meta)

### Para Problema Clásico:
→ **MountainCar** (Benchmark de RL)

---

## 💡 Diferencias Clave

### Grid 2D (Single/Multi/Goal-Conditioned):
- Espacio discreto: posiciones (x, y)
- 4 acciones: ↑ ↓ ← →
- Obstáculos configurables
- Visualización en cuadrícula

### Mountain Car:
- Espacio continuo: posición y velocidad
- 3 acciones: Izq, Neutral, Der
- Física realista (gravedad, inercia)
- Visualización con montañas y coche

---

## 🚀 Optimizaciones Implementadas

### ⚡ Entrenamiento Rápido:

#### Grids 2D:
- Entrenamiento en memoria
- Callbacks cada 10 episodios
- Visualización solo en pruebas

#### Mountain Car:
- **Sin visualización** durante entrenamiento
- Solo renderiza al probar
- **10x más rápido** que antes
- 1000 episodios en ~5 segundos

---

## 📊 Resultados Esperados

### SingleGoal (Grid 10x10):
```
Episodios: 1000
Recompensa: -15 a -20
Tasa éxito: ~100%
```

### MultiGoal (Grid 10x10, 3 metas):
```
Episodios: 1500
Recompensa: -5 a -10
Distribución: Equilibrada
```

### GoalConditioned (Grid 10x10):
```
Episodios: 1500
Funciona con: Cualquier objetivo
Click: Respuesta inmediata
```

### MountainCar:
```
Episodios: 1000
Recompensa: -150 a -100
Tasa éxito: 80-95%
Estrategia: Retroceder → impulso → meta
```

---

## 🎮 Atajos de Teclado

En todos los sistemas Grid 2D:
- `Ctrl + E` - Crear entorno
- `Ctrl + T` - Iniciar entrenamiento
- `Ctrl + S` - Detener entrenamiento

---

## 📚 Recursos de Aprendizaje

### Tutoriales:
1. Empieza con **SingleGoal**
2. Progresa a **MultiGoal**
3. Experimenta con **GoalConditioned**
4. Prueba el clásico **MountainCar**

### Papers:
- Watkins (1989) - Q-Learning
- Rummery & Niranjan (1994) - SARSA
- Sutton & Barto (2018) - RL: An Introduction
- Schaul et al. (2015) - UVFA (Goal-Conditioned)

---

## 🎨 Características Compartidas

Todos los sistemas tienen:
- ✅ Tema oscuro moderno
- ✅ Efectos glassmorphism
- ✅ Gradientes morados/azules
- ✅ Gráficos de progreso
- ✅ Métricas en tiempo real
- ✅ Sin dependencias externas

---

## 🔗 Enlaces Directos

- [🎯 Single-Goal](SingleGoal/index.html) - 1 meta fija
- [⭐ Multi-Goal](MultiGoal/index.html) - Múltiples metas
- [🚀 Goal-Conditioned](GoalConditioned/index.html) - Click para cambiar meta
- [🏔️ Mountain Car](MountainCar/index.html) - Problema clásico

---

## ✅ Estado del Proyecto

- [x] 4 sistemas completos implementados
- [x] Organizados en carpetas separadas
- [x] Documentación completa
- [x] Optimizaciones de velocidad
- [x] Interfaz visual de navegación
- [x] Todo funcional y probado

---

**¡Explora, experimenta y aprende!** 🎯🚀

**Versión**: 2.1  
**Última actualización**: Noviembre 2024

