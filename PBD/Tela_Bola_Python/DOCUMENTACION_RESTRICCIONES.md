# 📐 RESTRICCIONES DEL CUBO PBD

## Resumen de Restricciones Aplicadas

Tu cubo tiene **4 tipos de restricciones** que trabajan en conjunto para mantener su forma y comportamiento:

---

## 🔹 1. RESTRICCIONES DE DISTANCIA (Aristas)

### **¿Qué hacen?**
Mantienen la longitud de las aristas del cubo, evitando que se estiren o compriman.

### **¿Dónde se aplican?**
**En TODAS las partículas del cubo**, conectando partículas **vecinas** en las 3 direcciones:

```
Cada partícula (x, y, z) se conecta con:
├── → (x+1, y, z)   [Dirección X - derecha]
├── ↑ (x, y+1, z)   [Dirección Y - arriba]
└── ↗ (x, y, z+1)   [Dirección Z - adelante]
```

### **Ejemplo Visual (Cubo 3x3x3):**
```
Capa Z=0:
  ●───●───●
  │   │   │
  ●───●───●
  │   │   │
  ●───●───●

Cada ● tiene conexiones:
- → hacia la derecha
- ↑ hacia arriba  
- ↗ hacia adelante (Z+1)
```

### **Cantidad:**
- Con 6 subdivisiones: **~432 restricciones** (144 por cada dirección X, Y, Z)

---

## 🔹 2. RESTRICCIONES DE BENDING (Doblez)

### **¿Qué hacen?**
Evitan que las caras del cubo se plieguen o colapsen. Mantienen el ángulo entre triángulos adyacentes.

### **¿Dónde se aplican?**
**SOLO en las 6 CARAS EXTERNAS** del cubo (superficie), no en el interior.

Cada restricción conecta **4 partículas** formando 2 triángulos que comparten una arista:

```
     P3
     ●
    /│\
   / │ \
  /  │  \
 ●───●───●
P1  arista  P2
```

### **Cara por Cara:**
- ✅ **Cara inferior** (z = 0)
- ✅ **Cara superior** (z = subdivisiones-1)
- ✅ **Cara frontal** (y = 0)
- ✅ **Cara trasera** (y = subdivisiones-1)
- ✅ **Cara izquierda** (x = 0)
- ✅ **Cara derecha** (x = subdivisiones-1)

### **Cantidad:**
- Con 6 subdivisiones: **~150 restricciones** (25 por cada cara × 6 caras)

---

## 🔹 3. RESTRICCIONES DIAGONALES (Shear)

### **¿Qué hacen?**
Evitan el **cizallamiento** (shearing). Previenen que las caras se deformen en forma de paralelogramo.

### **¿Dónde se aplican?**
**SOLO en las 6 CARAS EXTERNAS**, conectando partículas **diagonalmente** en cada cuadrado de la cara.

Cada cuadrado tiene **2 diagonales**:

```
Cada cuadrado de una cara:
  ●───────●
  │  ╲   ╱│
  │   ╲ ╱ │
  │   ╱ ╲ │
  │  ╱   ╲│
  ●───────●
  Diagonal 1: esquina1 → esquina3
  Diagonal 2: esquina2 → esquina4
```

### **Cara por Cara:**
- ✅ **6 caras externas** (mismo que bending)
- Cada cara tiene **2 diagonales por cuadrado**

### **Cantidad:**
- Con 6 subdivisiones: **~300 restricciones** (50 por cada cara × 6 caras)

---

## 🔹 4. RESTRICCIONES DE VOLUMEN

### **¿Qué hacen?**
Mantienen el volumen de cada tetraedro interno. Son la base de la simulación de soft body.

### **¿Dónde se aplican?**
**En TODO el INTERIOR del cubo**, dividido en tetraedros.

Cada celda cúbica se divide en **5 tetraedros**:

```
Cada cubo pequeño se divide así:
   v7──────v6
   │\     /│
   │ \   / │
   │  \ /  │
   │   \   │
   │  / \  │
   │ /   \ │
   │/     \│
   v4──────v5
   
Tetraedros:
1. v0, v1, v3, v4
2. v1, v4, v5, v6
3. v1, v3, v4, v6
4. v1, v2, v3, v6
5. v3, v4, v6, v7
```

### **Cantidad:**
- Con 6 subdivisiones: **~675 restricciones** (5 tetraedros × 5×5×5 = 125 celdas)

---

## 📊 RESUMEN TOTAL (6 subdivisiones = 216 partículas)

| Tipo | Alcance | Cantidad Aprox. | Stiffness |
|------|---------|----------------|-----------|
| **Distancia** | Todo el cubo (3D) | ~432 | 0.3-0.8 (adaptativo) |
| **Volumen** | Todo el interior (3D) | ~675 | Variable (0.1-1.0) |
| **Bending** | Solo 6 caras (2D) | ~150 | 0.1 fijo |
| **Diagonales** | Solo 6 caras (2D) | ~300 | 80% de distancia |
| **Volumen Global** | Todo el cubo | 1 | Variable (0.1-1.0) |
| **TOTAL** | - | **~1,558** | - |

---

## 🎯 JERARQUÍA DE RESTRICCIONES

### **Interior (3D):**
- ✅ Volumen (tetraedros) → Mantiene forma 3D
- ✅ Distancia (aristas) → Mantiene estructura

### **Superficie (2D):**
- ✅ Bending → Evita pliegues
- ✅ Diagonales → Evita cizallamiento

### **Global:**
- ✅ Volumen Global → Mantiene volumen total

---

## 💡 RESPONDIENDO TU PREGUNTA:

**"¿Con partículas de arriba, abajo, izquierda y derecha o con algunas más?"**

### ✅ **TODAS las partículas están conectadas:**
1. **Distancia**: Cada partícula → 3 vecinas (derecha, arriba, adelante)
2. **Volumen**: Cada partícula → En múltiples tetraedros (conecta con varias)
3. **Bending**: Partículas de superficie → 4 partículas (2 triángulos)
4. **Diagonales**: Partículas de superficie → 1 diagonal (2 partículas)

**No es solo "arriba, abajo, izquierda, derecha"**. Es una **red 3D completa** donde:
- Cada partícula interna está conectada con **~12-15 partículas** diferentes
- Cada partícula de superficie está conectada con **~8-10 partículas** diferentes

---

## 🎨 VISUALIZACIÓN SIMPLIFICADA:

```
Partícula Central (x, y, z):
         ↗ (z+1)
        /
    ●──●──●  (y+1)
    │  │  │
    ●──●──●  (y)
    │  │  │
    ●──●──●  (y-1)
       │
       ↘ (z-1)
```

**Conexiones:**
- → X+1 (derecha)
- ← X-1 (izquierda)
- ↑ Y+1 (arriba)
- ↓ Y-1 (abajo)
- ↗ Z+1 (adelante)
- ↙ Z-1 (atrás)
- + Diagonales (en superficie)
- + Tetraedros (con múltiples)

---

## 🔧 CONFIGURACIÓN ACTUAL:

- **Stiffness Distancia**: Adaptativo según volumen (0.3-0.8)
- **Stiffness Volumen**: Configurable (0.1-1.0)
- **Stiffness Bending**: 0.1 fijo
- **Stiffness Diagonales**: 80% de distancia

**Todas trabajan juntas para crear un cubo deformable realista!** 🚀

