# 🚀 Inicio Rápido - Reinforcement Learning

## ¿Por dónde empiezo?

### Paso 1: Abre `index.html` en tu navegador 🌐
Este es el punto de entrada principal con 3 opciones:

```
┌─────────────────────────────────────┐
│  🧠 Reinforcement Learning          │
├─────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐      │
│  │ 🎲 Agente │  │ 🎓 Q-      │      │
│  │ Aleatorio │  │ Learning  │      │
│  └───────────┘  └───────────┘      │
│  ┌───────────┐                      │
│  │ 📚 SARSA  │                      │
│  └───────────┘                      │
└─────────────────────────────────────┘
```

---

## 📖 Tutorial Paso a Paso

### Demo 1: Agente Aleatorio (5 minutos)
**Objetivo:** Entender el problema

1. Abre `random-agent.html`
2. Haz clic en "Iniciar" ▶
3. Observa:
   - El agente se mueve sin estrategia
   - Toma muchos pasos innecesarios
   - A veces se queda atascado

**Conclusión:** Necesitamos aprendizaje!

---

### Demo 2: Q-Learning (15 minutos)
**Objetivo:** Entrenar un agente inteligente

#### Configuración Básica (para empezar):
```
Entorno:
  Ancho: 10
  Alto: 10
  Obstáculos: 10%

Agente:
  Alpha (α): 0.1
  Gamma (γ): 0.9
  Epsilon (ε): 0.1
  Episodios: 1000
  
☐ Visualizar (déjalo desactivado para más velocidad)
```

#### Pasos:
1. Abre `q-learning.html`
2. Haz clic en "🔄 Nuevo Entorno"
3. Configura los parámetros de arriba
4. Haz clic en "🎓 Entrenar"
5. Espera ~30 segundos
6. ¡Observa el gráfico subir! 📈
7. Haz clic en "🧪 Probar"
8. ¡Ve cómo el agente llegó al objetivo eficientemente!

**¿Qué pasó?**
- El gráfico muestra que el agente mejoró con el tiempo
- Al probarlo, usa el camino más óptimo
- ¡Aprendió la política óptima!

---

### Demo 3: SARSA vs Q-Learning (10 minutos)
**Objetivo:** Comparar algoritmos

#### Experimento:
1. Entrena Q-Learning con:
   - Entorno: 10x10, 15% obstáculos
   - Parámetros: α=0.1, γ=0.9, ε=0.1
   - Episodios: 1000

2. Anota el resultado:
   - Pasos promedio: ____
   - Recompensa promedio: ____

3. Entrena SARSA con **exactamente los mismos parámetros**

4. Compara:
   - ¿Cuál aprendió más rápido?
   - ¿Cuál tiene mejor política final?

**Lo que deberías notar:**
- Q-Learning es generalmente más agresivo
- SARSA es más conservador
- En este entorno determinista, ambos convergen a similar política

---

## 🎮 Guía Rápida de Uso

### Controles Básicos

#### Agente Aleatorio
```
▶ Iniciar     → Comienza la simulación
⏸ Pausar      → Pausa la simulación
⏭ Paso        → Ejecuta un solo paso
🔄 Reiniciar  → Vuelve al inicio
```

#### Q-Learning / SARSA
```
🔄 Nuevo Entorno → Crea un entorno nuevo
🎓 Entrenar      → Inicia el entrenamiento
⏹ Detener       → Detiene el entrenamiento
🧪 Probar        → Prueba el agente entrenado
```

### Atajos de Teclado
```
Agente Aleatorio:
  Espacio → Iniciar/Pausar
  R       → Reiniciar
  N       → Nuevo entorno
  S       → Paso a paso

Q-Learning/SARSA:
  Ctrl+E  → Crear entorno
  Ctrl+T  → Entrenar
  Ctrl+S  → Detener
```

---

## 🎯 Experimentos Sugeridos

### Experimento 1: Efecto de Alpha (α)
Entrena con diferentes α y compara:
- α = 0.01 (muy bajo)
- α = 0.1 (normal)
- α = 0.5 (alto)

**Pregunta:** ¿Cuál aprende más rápido? ¿Cuál es más estable?

### Experimento 2: Efecto de Epsilon (ε)
- ε = 0.01 (poca exploración)
- ε = 0.1 (normal)
- ε = 0.3 (mucha exploración)

**Pregunta:** ¿Qué pasa si hay poca exploración? ¿Y mucha?

### Experimento 3: Tamaño del Entorno
- 5x5 (pequeño)
- 10x10 (mediano)
- 15x15 (grande)

**Pregunta:** ¿Cómo afecta el tamaño al tiempo de aprendizaje?

### Experimento 4: Obstáculos
- 0% obstáculos
- 10% obstáculos
- 30% obstáculos

**Pregunta:** ¿Más obstáculos = más difícil de aprender?

---

## 📊 Interpretando el Gráfico

### Gráfico Ideal
```
Recompensa
    │
  0 ┼─────────────────────
    │              ┌──────
-100┼───        ┌──┘
    │    ╲    ╱
-200┼─────╲──╱
    │      ╲╱
-300┼───────
    └────────────────────
        Episodios
```
- **Inicio:** Recompensa muy negativa (muchos pasos)
- **Medio:** Mejora gradual
- **Final:** Se estabiliza (aprendió la política)

### Señales de Problema
```
Recompensa
    │
  0 ┼─────────────────────
    │  ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲
-200┼─╱──────────────────
    │
-400┼─────────────────────
    └────────────────────
        Episodios
```
- Oscilaciones constantes
- No mejora
- **Solución:** Reducir α, aumentar episodios

---

## 🔍 Checklist de Aprendizaje

Marca cuando hayas completado:

- [ ] Corrí la demo del agente aleatorio
- [ ] Entrené mi primer agente con Q-Learning
- [ ] Probé el agente entrenado y llegó al objetivo
- [ ] Comparé Q-Learning vs SARSA
- [ ] Experimenté con diferentes valores de α
- [ ] Experimenté con diferentes valores de ε
- [ ] Probé diferentes tamaños de entorno
- [ ] Entiendo cómo leer el gráfico de aprendizaje
- [ ] Vi la política aprendida en la consola
- [ ] Entiendo la diferencia entre exploración y explotación

---

## 🆘 Problemas Comunes

### "El agente no llega al objetivo"
✅ **Solución:** 
- Aumenta los episodios a 2000-5000
- Verifica que α > 0
- Aumenta ε para más exploración

### "El entrenamiento es muy lento"
✅ **Solución:**
- Desactiva "Visualizar" durante el entrenamiento
- Reduce el tamaño del entorno
- Reduce los obstáculos

### "El gráfico no mejora"
✅ **Solución:**
- Verifica los parámetros (α, γ, ε)
- Aumenta episodios
- Reduce obstáculos
- Prueba un entorno más pequeño primero

### "El navegador se congela"
✅ **Solución:**
- Desactiva "Visualizar"
- Reduce episodios
- Usa Chrome o Firefox (mejor rendimiento)

---

## 🎓 Siguiente Nivel

Cuando domines lo básico:

1. **Lee el código:**
   - `core/env_2D.js` - Entender el entorno
   - `core/agentesRL.js` - Entender los algoritmos

2. **Experimenta en la consola:**
   ```javascript
   // Ver la política
   agent.printPolicy();
   
   // Ver estadísticas
   agent.getQTableStats();
   
   // Exportar agente
   const data = agent.exportQTable();
   console.log(data);
   ```

3. **Modifica y experimenta:**
   - Cambia las recompensas
   - Añade nuevas acciones
   - Crea nuevos entornos

---

## 📚 Recursos de Aprendizaje

### En orden de prioridad:
1. **Este README** (lo estás leyendo)
2. **README.md** (documentación completa)
3. **El código** (bien comentado)
4. **Libro:** "Reinforcement Learning: An Introduction" - Sutton & Barto
5. **Video:** David Silver's RL Course (YouTube)

---

## 💡 Tips Finales

1. **Empieza simple:** 5x5 sin obstáculos
2. **Ve aumentando:** Añade complejidad gradualmente
3. **Compara:** Corre el mismo experimento varias veces
4. **Anota:** Guarda los mejores parámetros que encuentres
5. **Experimenta:** No tengas miedo de probar cosas nuevas

---

**¿Listo? ¡Abre `index.html` y comienza tu viaje en Reinforcement Learning!** 🚀

