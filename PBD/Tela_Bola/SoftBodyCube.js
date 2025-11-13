// ============================================
// GENERADOR DE CUBO DEFORMABLE (SOFT BODY CUBE)
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
function createSoftBodyCube(center, size, resolution, mass, stiffness) {
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
        let x = centerVec.x + (i * spacing) - halfSize;
        let y = centerVec.y + (j * spacing) - halfSize;
        let z = centerVec.z + (k * spacing) - halfSize;
        
        let pos = createVector(x, y, z);
        let vel = createVector(0, 0, 0);
        let p = new Particle(pos, vel, mass);
        p.display_size = 0.05; // Tamaño pequeño para visualización
        
        particles.push(p);
      }
    }
  }
  
  // ============================================
  // 2. DISTANCE CONSTRAINTS (ESTRUCTURA)
  // ============================================
  
  let distanceCount = 0;
  
  // 2a. Aristas principales (edges) - conectar vecinos adyacentes
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx = getIndex(i, j, k);
        let p1 = particles[idx];
        
        // Conexión en eje X (i+1)
        if (i < resolution - 1) {
          let idx2 = getIndex(i + 1, j, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        // Conexión en eje Y (j+1)
        if (j < resolution - 1) {
          let idx2 = getIndex(i, j + 1, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        // Conexión en eje Z (k+1)
        if (k < resolution - 1) {
          let idx2 = getIndex(i, j, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
      }
    }
  }
  
  // 2b. Diagonales de caras (face diagonals) - estabilidad 2D en cada cara
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx = getIndex(i, j, k);
        let p1 = particles[idx];
        
        // Diagonales en plano XY
        if (i < resolution - 1 && j < resolution - 1) {
          let idx2 = getIndex(i + 1, j + 1, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        if (i > 0 && j < resolution - 1) {
          let idx2 = getIndex(i - 1, j + 1, k);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        // Diagonales en plano XZ
        if (i < resolution - 1 && k < resolution - 1) {
          let idx2 = getIndex(i + 1, j, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        if (i > 0 && k < resolution - 1) {
          let idx2 = getIndex(i - 1, j, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        // Diagonales en plano YZ
        if (j < resolution - 1 && k < resolution - 1) {
          let idx2 = getIndex(i, j + 1, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        if (j > 0 && k < resolution - 1) {
          let idx2 = getIndex(i, j - 1, k + 1);
          let p2 = particles[idx2];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
      }
    }
  }
  
  // 2c. Diagonales volumétricas (body diagonals) - estabilidad 3D
  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let idx1 = getIndex(i, j, k);
        let p1 = particles[idx1];
        
        // 4 diagonales del cubo unitario
        let diagonals = [
          getIndex(i + 1, j + 1, k + 1),
          getIndex(i + 1, j + 1, k),
          getIndex(i + 1, j, k + 1),
          getIndex(i, j + 1, k + 1)
        ];
        
        for (let diagIdx of diagonals) {
          let p2 = particles[diagIdx];
          let dist = p5.Vector.dist(p1.location, p2.location);
          constraints.push(new DistanceConstraint(p1, p2, dist, stiffness));
          distanceCount++;
        }
        
        // Diagonal opuesta
        let idx2 = getIndex(i, j, k + 1);
        let idx3 = getIndex(i + 1, j + 1, k);
        let p2 = particles[idx2];
        let p3 = particles[idx3];
        let dist2 = p5.Vector.dist(p2.location, p3.location);
        constraints.push(new DistanceConstraint(p2, p3, dist2, stiffness));
        distanceCount++;
        
        idx2 = getIndex(i, j + 1, k);
        idx3 = getIndex(i + 1, j, k + 1);
        p2 = particles[idx2];
        p3 = particles[idx3];
        dist2 = p5.Vector.dist(p2.location, p3.location);
        constraints.push(new DistanceConstraint(p2, p3, dist2, stiffness));
        distanceCount++;
      }
    }
  }
  
  console.log(`✓ ${distanceCount} distance constraints creadas`);
  
  // ============================================
  // 3. BENDING CONSTRAINTS
  // ============================================
  
  let bendingCount = 0;
  let bendingStiffness = stiffness * 0.3; // Bending más suave
  
  // Función auxiliar para calcular ángulo diedro inicial
  function calcular_phi0(p1, p2, p3, p4) {
    let e1 = p5.Vector.sub(p2.location, p1.location);
    let e2 = p5.Vector.sub(p3.location, p1.location);
    let e3 = p5.Vector.sub(p4.location, p1.location);
    
    let n1 = p5.Vector.cross(e1, e2);
    let n2 = p5.Vector.cross(e1, e3);
    
    let len_n1 = n1.mag();
    let len_n2 = n2.mag();
    
    if (len_n1 < 0.0001 || len_n2 < 0.0001) {
      return 0; // Ángulo plano por defecto
    }
    
    n1.normalize();
    n2.normalize();
    
    let d = n1.dot(n2);
    d = constrain(d, -1.0, 1.0);
    
    return acos(d);
  }
  
  // Bending en caras paralelas al plano XY (aristas en Z)
  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx1 = getIndex(i, j, k);
        let idx2 = getIndex(i + 1, j, k);
        let idx3 = getIndex(i, j + 1, k);
        let idx4 = getIndex(i + 1, j + 1, k);
        
        let p1 = particles[idx1];
        let p2 = particles[idx2];
        let p3 = particles[idx3];
        let p4 = particles[idx4];
        
        let phi0 = calcular_phi0(p1, p2, p3, p4);
        constraints.push(new BendingConstraint(p1, p2, p3, p4, phi0, bendingStiffness));
        bendingCount++;
      }
    }
  }
  
  // Bending en caras paralelas al plano XZ (aristas en Y)
  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let idx1 = getIndex(i, j, k);
        let idx2 = getIndex(i + 1, j, k);
        let idx3 = getIndex(i, j, k + 1);
        let idx4 = getIndex(i + 1, j, k + 1);
        
        let p1 = particles[idx1];
        let p2 = particles[idx2];
        let p3 = particles[idx3];
        let p4 = particles[idx4];
        
        let phi0 = calcular_phi0(p1, p2, p3, p4);
        constraints.push(new BendingConstraint(p1, p2, p3, p4, phi0, bendingStiffness));
        bendingCount++;
      }
    }
  }
  
  // Bending en caras paralelas al plano YZ (aristas en X)
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let idx1 = getIndex(i, j, k);
        let idx2 = getIndex(i, j + 1, k);
        let idx3 = getIndex(i, j, k + 1);
        let idx4 = getIndex(i, j + 1, k + 1);
        
        let p1 = particles[idx1];
        let p2 = particles[idx2];
        let p3 = particles[idx3];
        let p4 = particles[idx4];
        
        let phi0 = calcular_phi0(p1, p2, p3, p4);
        constraints.push(new BendingConstraint(p1, p2, p3, p4, phi0, bendingStiffness));
        bendingCount++;
      }
    }
  }
  
  console.log(`✓ ${bendingCount} bending constraints creadas`);
  
  // ============================================
  // 4. SHEAR CONSTRAINTS
  // ============================================
  
  let shearCount = 0;
  let shearStiffness = stiffness * 0.3; // Shear más suave
  
  // Función auxiliar para calcular ángulo inicial
  function calcular_psi0(p0, p1, p2) {
    let v1 = p5.Vector.sub(p1.location, p0.location);
    let v2 = p5.Vector.sub(p2.location, p0.location);
    
    let len_v1 = v1.mag();
    let len_v2 = v2.mag();
    
    if (len_v1 < 0.0001 || len_v2 < 0.0001) {
      return HALF_PI; // 90° por defecto
    }
    
    v1.normalize();
    v2.normalize();
    
    let c = v1.dot(v2);
    c = constrain(c, -1.0, 1.0);
    
    return acos(c);
  }
  
  // Shear en caras paralelas al plano XY
  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution; k++) {
        let idx00 = getIndex(i, j, k);
        let idx10 = getIndex(i + 1, j, k);
        let idx01 = getIndex(i, j + 1, k);
        let idx11 = getIndex(i + 1, j + 1, k);
        
        let p00 = particles[idx00];
        let p10 = particles[idx10];
        let p01 = particles[idx01];
        let p11 = particles[idx11];
        
        // 4 ángulos del cuadrado
        let psi0_00 = calcular_psi0(p00, p10, p01);
        constraints.push(new ShearConstraint(p00, p10, p01, psi0_00, shearStiffness));
        shearCount++;
        
        let psi0_10 = calcular_psi0(p10, p00, p11);
        constraints.push(new ShearConstraint(p10, p00, p11, psi0_10, shearStiffness));
        shearCount++;
        
        let psi0_01 = calcular_psi0(p01, p00, p11);
        constraints.push(new ShearConstraint(p01, p00, p11, psi0_01, shearStiffness));
        shearCount++;
        
        let psi0_11 = calcular_psi0(p11, p10, p01);
        constraints.push(new ShearConstraint(p11, p10, p01, psi0_11, shearStiffness));
        shearCount++;
      }
    }
  }
  
  // Shear en caras paralelas al plano XZ
  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let idx00 = getIndex(i, j, k);
        let idx10 = getIndex(i + 1, j, k);
        let idx01 = getIndex(i, j, k + 1);
        let idx11 = getIndex(i + 1, j, k + 1);
        
        let p00 = particles[idx00];
        let p10 = particles[idx10];
        let p01 = particles[idx01];
        let p11 = particles[idx11];
        
        // 4 ángulos del cuadrado
        let psi0_00 = calcular_psi0(p00, p10, p01);
        constraints.push(new ShearConstraint(p00, p10, p01, psi0_00, shearStiffness));
        shearCount++;
        
        let psi0_10 = calcular_psi0(p10, p00, p11);
        constraints.push(new ShearConstraint(p10, p00, p11, psi0_10, shearStiffness));
        shearCount++;
        
        let psi0_01 = calcular_psi0(p01, p00, p11);
        constraints.push(new ShearConstraint(p01, p00, p11, psi0_01, shearStiffness));
        shearCount++;
        
        let psi0_11 = calcular_psi0(p11, p10, p01);
        constraints.push(new ShearConstraint(p11, p10, p01, psi0_11, shearStiffness));
        shearCount++;
      }
    }
  }
  
  // Shear en caras paralelas al plano YZ
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      for (let k = 0; k < resolution - 1; k++) {
        let idx00 = getIndex(i, j, k);
        let idx10 = getIndex(i, j + 1, k);
        let idx01 = getIndex(i, j, k + 1);
        let idx11 = getIndex(i, j + 1, k + 1);
        
        let p00 = particles[idx00];
        let p10 = particles[idx10];
        let p01 = particles[idx01];
        let p11 = particles[idx11];
        
        // 4 ángulos del cuadrado
        let psi0_00 = calcular_psi0(p00, p10, p01);
        constraints.push(new ShearConstraint(p00, p10, p01, psi0_00, shearStiffness));
        shearCount++;
        
        let psi0_10 = calcular_psi0(p10, p00, p11);
        constraints.push(new ShearConstraint(p10, p00, p11, psi0_10, shearStiffness));
        shearCount++;
        
        let psi0_01 = calcular_psi0(p01, p00, p11);
        constraints.push(new ShearConstraint(p01, p00, p11, psi0_01, shearStiffness));
        shearCount++;
        
        let psi0_11 = calcular_psi0(p11, p10, p01);
        constraints.push(new ShearConstraint(p11, p10, p01, psi0_11, shearStiffness));
        shearCount++;
      }
    }
  }
  
  console.log(`✓ ${shearCount} shear constraints creadas`);
  
  // ============================================
  // RESUMEN Y RETORNO
  // ============================================
  
  let totalConstraints = distanceCount + bendingCount + shearCount;
  console.log(`========================================`);
  console.log(`CUBO SOFT-BODY GENERADO EXITOSAMENTE`);
  console.log(`Partículas: ${particles.length}`);
  console.log(`Constraints totales: ${totalConstraints}`);
  console.log(`  - Distance: ${distanceCount}`);
  console.log(`  - Bending: ${bendingCount}`);
  console.log(`  - Shear: ${shearCount}`);
  console.log(`========================================`);
  
  return {
    particles: particles,
    constraints: constraints
  };
}

