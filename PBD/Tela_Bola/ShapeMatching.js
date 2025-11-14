// ============================================
// SHAPE MATCHING (Müller et al. 2005)
// "Meshless Deformations Based on Shape Matching"
// ============================================

// ============================================
// POLAR DECOMPOSITION usando SVD
// ============================================
function polarDecomposition(A) {
  // A es una matriz 3x3
  // Queremos A = R * S donde R es rotación y S es simétrica
  
  // Extraer valores de la matriz A (formato: array de arrays)
  let a11 = A[0][0], a12 = A[0][1], a13 = A[0][2];
  let a21 = A[1][0], a22 = A[1][1], a23 = A[1][2];
  let a31 = A[2][0], a32 = A[2][1], a33 = A[2][2];
  
  // Calcular A^T * A (matriz simétrica 3x3)
  let ata = [
    [
      a11*a11 + a21*a21 + a31*a31,
      a11*a12 + a21*a22 + a31*a32,
      a11*a13 + a21*a23 + a31*a33
    ],
    [
      a12*a11 + a22*a21 + a32*a31,
      a12*a12 + a22*a22 + a32*a32,
      a12*a13 + a22*a23 + a32*a33
    ],
    [
      a13*a11 + a23*a21 + a33*a31,
      a13*a12 + a23*a22 + a33*a32,
      a13*a13 + a23*a23 + a33*a33
    ]
  ];
  
  // Eigenvalues y eigenvectors de A^T * A usando Jacobi iteration
  let { eigenvalues, eigenvectors } = jacobiEigenvalue(ata);
  
  // Construir matriz V desde eigenvectors
  let V = eigenvectors;
  
  // Calcular S = sqrt(eigenvalues) en diagonal
  let S = [
    [Math.sqrt(Math.max(0, eigenvalues[0])), 0, 0],
    [0, Math.sqrt(Math.max(0, eigenvalues[1])), 0],
    [0, 0, Math.sqrt(Math.max(0, eigenvalues[2]))]
  ];
  
  // Calcular V^T
  let VT = transpose3x3(V);
  
  // S_full = V * S * V^T
  let VS = multiplyMatrix3x3(V, S);
  let S_full = multiplyMatrix3x3(VS, VT);
  
  // Calcular S^(-1) (inversa de S_full)
  let S_inv = invertMatrix3x3(S_full);
  
  // R = A * S^(-1)
  let R = multiplyMatrix3x3(A, S_inv);
  
  // Asegurar que R es una rotación válida (det(R) = 1)
  let det = determinant3x3(R);
  if (det < 0) {
    // Si el determinante es negativo, flipear una columna
    R[0][2] = -R[0][2];
    R[1][2] = -R[1][2];
    R[2][2] = -R[2][2];
  }
  
  return { R: R, S: S_full };
}

// ============================================
// JACOBI EIGENVALUE ALGORITHM para matrices 3x3 simétricas
// ============================================
function jacobiEigenvalue(A) {
  let V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  
  let A_copy = [
    [A[0][0], A[0][1], A[0][2]],
    [A[1][0], A[1][1], A[1][2]],
    [A[2][0], A[2][1], A[2][2]]
  ];
  
  let maxIterations = 50;
  let epsilon = 1e-10;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Encontrar el elemento off-diagonal más grande
    let p = 0, q = 1;
    let maxVal = Math.abs(A_copy[0][1]);
    
    if (Math.abs(A_copy[0][2]) > maxVal) {
      p = 0; q = 2;
      maxVal = Math.abs(A_copy[0][2]);
    }
    if (Math.abs(A_copy[1][2]) > maxVal) {
      p = 1; q = 2;
      maxVal = Math.abs(A_copy[1][2]);
    }
    
    if (maxVal < epsilon) break;
    
    // Calcular rotación de Givens
    let app = A_copy[p][p];
    let aqq = A_copy[q][q];
    let apq = A_copy[p][q];
    
    let theta = 0.5 * Math.atan2(2 * apq, aqq - app);
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    
    // Actualizar A_copy
    let A_new = [
      [A_copy[0][0], A_copy[0][1], A_copy[0][2]],
      [A_copy[1][0], A_copy[1][1], A_copy[1][2]],
      [A_copy[2][0], A_copy[2][1], A_copy[2][2]]
    ];
    
    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        let aip = A_copy[i][p];
        let aiq = A_copy[i][q];
        A_new[i][p] = c * aip - s * aiq;
        A_new[p][i] = A_new[i][p];
        A_new[i][q] = s * aip + c * aiq;
        A_new[q][i] = A_new[i][q];
      }
    }
    
    A_new[p][p] = c*c*app + s*s*aqq - 2*c*s*apq;
    A_new[q][q] = s*s*app + c*c*aqq + 2*c*s*apq;
    A_new[p][q] = 0;
    A_new[q][p] = 0;
    
    A_copy = A_new;
    
    // Actualizar eigenvectors
    let V_new = [
      [V[0][0], V[0][1], V[0][2]],
      [V[1][0], V[1][1], V[1][2]],
      [V[2][0], V[2][1], V[2][2]]
    ];
    
    for (let i = 0; i < 3; i++) {
      let vip = V[i][p];
      let viq = V[i][q];
      V_new[i][p] = c * vip - s * viq;
      V_new[i][q] = s * vip + c * viq;
    }
    
    V = V_new;
  }
  
  let eigenvalues = [A_copy[0][0], A_copy[1][1], A_copy[2][2]];
  let eigenvectors = V;
  
  return { eigenvalues, eigenvectors };
}

// ============================================
// UTILIDADES DE MATRICES 3x3
// ============================================
function multiplyMatrix3x3(A, B) {
  let result = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  
  return result;
}

function transpose3x3(A) {
  return [
    [A[0][0], A[1][0], A[2][0]],
    [A[0][1], A[1][1], A[2][1]],
    [A[0][2], A[1][2], A[2][2]]
  ];
}

function determinant3x3(A) {
  return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
         A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
         A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
}

function invertMatrix3x3(A) {
  let det = determinant3x3(A);
  
  if (Math.abs(det) < 1e-10) {
    // Matriz singular, devolver identidad
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }
  
  let invDet = 1.0 / det;
  
  return [
    [
      invDet * (A[1][1] * A[2][2] - A[1][2] * A[2][1]),
      invDet * (A[0][2] * A[2][1] - A[0][1] * A[2][2]),
      invDet * (A[0][1] * A[1][2] - A[0][2] * A[1][1])
    ],
    [
      invDet * (A[1][2] * A[2][0] - A[1][0] * A[2][2]),
      invDet * (A[0][0] * A[2][2] - A[0][2] * A[2][0]),
      invDet * (A[0][2] * A[1][0] - A[0][0] * A[1][2])
    ],
    [
      invDet * (A[1][0] * A[2][1] - A[1][1] * A[2][0]),
      invDet * (A[0][1] * A[2][0] - A[0][0] * A[2][1]),
      invDet * (A[0][0] * A[1][1] - A[0][1] * A[1][0])
    ]
  ];
}

// ============================================
// CLASE SHAPE MATCHING
// ============================================
class ShapeMatching {
  constructor(particles, stiffness = 0.5) {
    this.particles = particles; // Array de partículas del cubo
    this.stiffness = stiffness; // 0 = sin efecto, 1 = rígido
    
    // Guardar posiciones de reposo (q_i) y masas
    this.restPositions = [];
    this.masses = [];
    this.totalMass = 0;
    
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      this.restPositions.push(p.location.copy());
      this.masses.push(p.masa);
      this.totalMass += p.masa;
    }
    
    // Calcular centro de masas de las posiciones de reposo (q_cm)
    this.restCenterOfMass = this.calculateCenterOfMass(this.restPositions);
    
    console.log(`✨ Shape Matching creado para ${particles.length} partículas (stiffness=${stiffness})`);
  }
  
  // Calcular centro de masas ponderado
  calculateCenterOfMass(positions) {
    let cm = createVector(0, 0, 0);
    
    for (let i = 0; i < positions.length; i++) {
      let pos = positions[i];
      let mass = this.masses[i];
      cm.add(p5.Vector.mult(pos, mass));
    }
    
    cm.div(this.totalMass);
    return cm;
  }
  
  // Aplicar Shape Matching
  apply() {
    if (this.particles.length === 0) return;
    if (this.stiffness <= 0) return; // Si stiffness es 0, no hacer nada
    
    // 1. Calcular centro de masas actual (x_cm) - solo partículas NO bloqueadas
    let currentPositions = [];
    let activeMasses = [];
    let totalActiveMass = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      // Incluir TODAS las partículas para calcular CM (incluso bloqueadas)
      currentPositions.push(this.particles[i].location);
    }
    let currentCM = this.calculateCenterOfMass(currentPositions);
    
    // 2. Construir matriz A = Σ m_i * (x_i - x_cm) * (q_i - q_cm)^T
    let A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    
    for (let i = 0; i < this.particles.length; i++) {
      let p = p5.Vector.sub(currentPositions[i], currentCM); // x_i - x_cm
      let q = p5.Vector.sub(this.restPositions[i], this.restCenterOfMass); // q_i - q_cm
      let mass = this.masses[i];
      
      // Outer product: p * q^T, ponderado por masa
      A[0][0] += mass * p.x * q.x;
      A[0][1] += mass * p.x * q.y;
      A[0][2] += mass * p.x * q.z;
      
      A[1][0] += mass * p.y * q.x;
      A[1][1] += mass * p.y * q.y;
      A[1][2] += mass * p.y * q.z;
      
      A[2][0] += mass * p.z * q.x;
      A[2][1] += mass * p.z * q.y;
      A[2][2] += mass * p.z * q.z;
    }
    
    // 3. Polar decomposition: A = R * S
    let { R } = polarDecomposition(A);
    
    // 4. Calcular posiciones objetivo rígidas y aplicar corrección
    for (let i = 0; i < this.particles.length; i++) {
      // CRÍTICO: No mover partículas bloqueadas NI anclas
      if (this.particles[i].bloqueada) continue;
      
      // ✅ CRÍTICO: NO aplicar Shape Matching a partículas en colisión con la esfera
      // Esto permite que la colisión "gane" y la esfera no se cuele
      if (this.particles[i].inCollisionWithSphere) {
        continue; // Saltar partículas que están tocando la esfera
      }
      
      // g_i = x_cm + R * (q_i - q_cm)
      let q_rel = p5.Vector.sub(this.restPositions[i], this.restCenterOfMass);
      
      // Multiplicar R * q_rel
      let rotated = createVector(
        R[0][0] * q_rel.x + R[0][1] * q_rel.y + R[0][2] * q_rel.z,
        R[1][0] * q_rel.x + R[1][1] * q_rel.y + R[1][2] * q_rel.z,
        R[2][0] * q_rel.x + R[2][1] * q_rel.y + R[2][2] * q_rel.z
      );
      
      let g_i = p5.Vector.add(currentCM, rotated);
      
      // Mezclar: p_new = x_i + k * (g_i - x_i)
      let correction = p5.Vector.sub(g_i, this.particles[i].location);
      correction.mult(this.stiffness);
      
      // Limitar la corrección para evitar movimientos bruscos
      let maxCorrection = 0.05; // Máximo 5 cm por iteración
      if (correction.mag() > maxCorrection) {
        correction.setMag(maxCorrection);
      }
      
      this.particles[i].location.add(correction);
      this.particles[i].last_location = this.particles[i].location.copy();
    }
  }
}

