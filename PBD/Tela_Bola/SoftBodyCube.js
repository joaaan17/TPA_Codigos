// ============================================
// GENERADOR DE CUBO DEFORMABLE (SOFT BODY CUBE)
// VERSIÓN OPTIMIZADA - Solo constraints necesarias
// ============================================

/**
 * Crea un cubo deformable (soft body) con partículas y restricciones PBD
 * 
 * @param {p5.Vector|Array} center - Centro del cubo [x, y, z] o createVector(x, y, z)
 * @param {number} size - Tamaño de las aristas del cubo
 * @param {number} resolution - Subdivisiones por eje (mínimo 2, recomendado 3-4)
 * @param {number} mass - Masa por partícula
 * @param {number} stiffness - Rigidez base para todas las constraints (0-1)
 * @returns {Object} { particles: Array<Particle>, constraints: Array<Constraint> }
 */
function createSoftBodyCube(center, size, resolution, mass, stiffness, options = {}) {
  const { useVolumeConstraints = true } = options;
  // Validar parámetros
  if (resolution < 2) {
    console.warn("Resolution debe ser al menos 2, ajustando a 2");
    resolution = 2;
  }
  
  // Convertir center a p5.Vector si es array
  let centerVec = Array.isArray(center) ? createVector(center[0], center[1], center[2]) : center.copy();
  
  // Arrays para almacenar partículas y constraints
  let particles = [];
  let constraints = [];
  let volumeCount = 0;
  
  // ============================================
  // 1. GENERAR PARTÍCULAS EN REJILLA 3D
  // ============================================
  
  let numParticles = resolution * resolution * resolution;
  let spacing = size / (resolution - 1); // Espaciado entre partículas
  let halfSize = size / 2;
  
  console.log(`Generando cubo: ${resolution}x${resolution}x${resolution} = ${numParticles} partículas`);
  
  // Función auxiliar para obtener índice lineal de una partícula (i, j, k)
  function getIndex(i, j, k) {
    return i * resolution * resolution + j * resolution + k;
  }
  
  // Crear partículas en rejilla 3D centrada
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx = getIndex(i, j, k);
        let x = centerVec.x + (i * spacing) - halfSize;
        let y = centerVec.y + (j * spacing) - halfSize;
        let z = centerVec.z + (k * spacing) - halfSize;
        
        let pos = createVector(x, y, z);
        let vel = createVector(0, 0, 0);
        let p = new Particle(pos, vel, mass);
        p.display_size = 0.05; // Tamaño pequeño para visualización
        
        p.debugId = idx;
        particles[idx] = p;
      }
    }
  }
  
  // ============================================
  // 2. STRETCH CONSTRAINTS (SOLO VECINOS DIRECTOS)
  // ============================================
  
  let stretchCount = 0;
  
  // SOLO conectar vecinos inmediatos en X, Y, Z
  // NO diagonales de caras, NO diagonales volumétricas
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx = getIndex(i, j, k);
        let p1 = particles[idx];
        
        // Conexión en eje X (i+1) - solo vecino directo
        if (i < resolution - 1) {
          let idx2 = getIndex(i + 1, j, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          stretchCount++;
        }
        
        // Conexión en eje Y (j+1) - solo vecino directo
        if (j < resolution - 1) {
          let idx2 = getIndex(i, j + 1, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          stretchCount++;
        }
        
        // Conexión en eje Z (k+1) - solo vecino directo
        if (k < resolution - 1) {
          let idx2 = getIndex(i, j, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          stretchCount++;
        }
      }
    }
  }
  
  console.log(`✓ ${stretchCount} stretch constraints creadas (solo vecinos directos)`);
  
  // ============================================
  // 3. SHEAR CONSTRAINTS (SOLO CARAS EXTERNAS, 2 DIAGONALES POR CUADRADO)
  // ============================================
  
  let shearCount = 0;
  let shearStiffness = stiffness * 0.2; // Shear más suave
  
  // Helper: añadir 2 diagonales por cuadrado
  function addShearDiagonals(p00, p10, p01, p11) {
    // Diagonal 1: esquina inferior-izquierda a superior-derecha
    let d1 = p5.Vector.dist(p00.location, p11.location);
    constraints.push(new DistanceConstraint(p00, p11, d1, shearStiffness));
    
    // Diagonal 2: esquina inferior-derecha a superior-izquierda
    let d2 = p5.Vector.dist(p10.location, p01.location);
    constraints.push(new DistanceConstraint(p10, p01, d2, shearStiffness));
    
    shearCount += 2;
  }
  
  // SOLO añadir shear en las 6 CARAS EXTERNAS del cubo
  
  // Caras en plano XY (k = 0 y k = resolution-1)
  for (let face_k of [0, resolution - 1]) {
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        let p00 = particles[getIndex(i, j, face_k)];
        let p10 = particles[getIndex(i + 1, j, face_k)];
        let p01 = particles[getIndex(i, j + 1, face_k)];
        let p11 = particles[getIndex(i + 1, j + 1, face_k)];
        addShearDiagonals(p00, p10, p01, p11);
      }
    }
  }
  
  // Caras en plano XZ (j = 0 y j = resolution-1)
  for (let face_j of [0, resolution - 1]) {
    for (let i = 0; i < resolution - 1; i++) {
      for (let k = 0; k < resolution - 1; k++) {
        let p00 = particles[getIndex(i, face_j, k)];
        let p10 = particles[getIndex(i + 1, face_j, k)];
        let p01 = particles[getIndex(i, face_j, k + 1)];
        let p11 = particles[getIndex(i + 1, face_j, k + 1)];
        addShearDiagonals(p00, p10, p01, p11);
      }
    }
  }
  
  // Caras en plano YZ (i = 0 y i = resolution-1)
  for (let face_i of [0, resolution - 1]) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let p00 = particles[getIndex(face_i, j, k)];
        let p10 = particles[getIndex(face_i, j + 1, k)];
        let p01 = particles[getIndex(face_i, j, k + 1)];
        let p11 = particles[getIndex(face_i, j + 1, k + 1)];
        addShearDiagonals(p00, p10, p01, p11);
      }
    }
  }
  
  console.log(`✓ ${shearCount} shear constraints creadas (solo caras externas, 2 diagonales por cuadrado)`);
  
  // ============================================
  // 4. BENDING CONSTRAINTS (SEPARACIÓN DE 2 UNIDADES)
  // ============================================
  
  let bendingCount = 0;
  let bendingStiffness = stiffness * 0.05; // Bending MUY suave
  
  // SOLO entre partículas separadas por 2 unidades en la rejilla
  // Igual que la bending de la tela
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx = getIndex(i, j, k);
        let p1 = particles[idx];
        
        // Bending en dirección X: p(i,j,k) ↔ p(i+2,j,k)
        if (i < resolution - 2) {
          let idx2 = getIndex(i + 2, j, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, bendingStiffness));
          bendingCount++;
        }
        
        // Bending en dirección Y: p(i,j,k) ↔ p(i,j+2,k)
        if (j < resolution - 2) {
          let idx2 = getIndex(i, j + 2, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, bendingStiffness));
          bendingCount++;
        }
        
        // Bending en dirección Z: p(i,j,k) ↔ p(i,j,k+2)
        if (k < resolution - 2) {
          let idx2 = getIndex(i, j, k + 2);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, bendingStiffness));
          bendingCount++;
        }
      }
    }
  }
  
  console.log(`✓ ${bendingCount} bending constraints creadas (separación de 2 unidades)`);
  
  // ============================================
  // 5. VOLUME CONSTRAINTS (TETRAEDROS INTERNOS)
  // ============================================
  if (useVolumeConstraints) {
    let volumeStiffness = constrain(stiffness * 0.6, 0.3, 0.7);
    
    function addVolumeConstraintFromIndices(i1, i2, i3, i4) {
      let p1 = particles[i1];
      let p2 = particles[i2];
      let p3 = particles[i3];
      let p4 = particles[i4];
      
      let restVolume = tetraVolume(p1.location, p2.location, p3.location, p4.location);
      if (Math.abs(restVolume) < 1e-8) {
        console.warn("⚠️ Tetraedro degenerado (volumen ≈ 0). Se omite constraint.");
        return;
      }
      
      let volumeConstraint = new VolumeConstraint(p1, p2, p3, p4, restVolume, volumeStiffness);
      constraints.push(volumeConstraint);
      volumeCount++;
    }
    
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        for (let k = 0; k < resolution - 1; k++) {
          // Partículas del cubito local (2x2x2)
          let a = getIndex(i, j, k);
          let b = getIndex(i + 1, j, k);
          let c = getIndex(i, j + 1, k);
          let d = getIndex(i + 1, j + 1, k);
          let e = getIndex(i, j, k + 1);
          let f = getIndex(i + 1, j, k + 1);
          let g = getIndex(i, j + 1, k + 1);
          let h = getIndex(i + 1, j + 1, k + 1);
          
          // Partición estándar en 6 tetraedros
          addVolumeConstraintFromIndices(a, b, c, e);
          addVolumeConstraintFromIndices(b, c, g, f);
          addVolumeConstraintFromIndices(c, g, h, e);
          addVolumeConstraintFromIndices(a, c, h, e);
          addVolumeConstraintFromIndices(a, f, b, e);
          addVolumeConstraintFromIndices(f, g, b, e);
        }
      }
    }
    
    console.log(`✓ ${volumeCount} volume constraints creadas (tetraedros internos, stiffness=${volumeStiffness.toFixed(2)})`);
  } else {
    console.log(`⚪ Volume constraints desactivadas para este cubo.`);
  }
  
  // ============================================
  // RESUMEN Y RETORNO
  // ============================================
  
  let totalConstraints = stretchCount + shearCount + bendingCount + volumeCount;
  console.log(`========================================`);
  console.log(`CUBO SOFT-BODY GENERADO (OPTIMIZADO)`);
  console.log(`Partículas: ${particles.length}`);
  console.log(`Constraints totales: ${totalConstraints}`);
  console.log(`  - Stretch (vecinos directos): ${stretchCount}`);
  console.log(`  - Shear (caras externas, 2 diag): ${shearCount}`);
  console.log(`  - Bending (separación 2): ${bendingCount}`);
  console.log(`  - Volume (tetraedros internos): ${volumeCount}`);
  console.log(`========================================`);
  
  return {
    particles: particles,
    constraints: constraints,
    resolution: resolution  // Retornar también la resolución
  };
}

// ============================================
// UTILIDAD: VOLUMEN DE UN TETRAEDRO
// ============================================
function tetraVolume(p1, p2, p3, p4) {
  let v21 = p5.Vector.sub(p2, p1);
  let v31 = p5.Vector.sub(p3, p1);
  let v41 = p5.Vector.sub(p4, p1);
  let triple = v21.dot(p5.Vector.cross(v31, v41));
  return triple / 6.0; // Signed volume; la magnitud indica volumen, el signo la orientación
}
