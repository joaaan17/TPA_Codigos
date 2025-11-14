// ============================================
// FUNCIÓN CREAR TELA
// ============================================
function crea_tela(alto, ancho, dens, n_alto, n_ancho, stiffness, display_size) {
  let N = n_alto * n_ancho;
  let masa = dens * alto * ancho;
  let tela = new PBDSystem(N, masa / N);
  
  let dx = ancho / (n_ancho - 1.0);
  let dy = alto / (n_alto - 1.0);
  
  let id = 0;
  let offsetX = -ancho / 2.0;
  for (let i = 0; i < n_ancho; i++) {
    for (let j = 0; j < n_alto; j++) {
      let p = tela.particles[id];
      p.location.set(offsetX + dx * i, dy * j, 0);
      p.display_size = display_size;
      p.last_location = p.location.copy();
      id++;
    }
  }
  
  /**
   * Creo restricciones de distancia. Aquí sólo se crean restricciones de estructura.
   * Faltarían las de shear y las de bending.
   */
  id = 0;
  for (let i = 0; i < n_ancho; i++) {
    for (let j = 0; j < n_alto; j++) {
      let p = tela.particles[id];
      
      if (i > 0) {
        let idx = id - n_alto;
        let px = tela.particles[idx];
        let c = new DistanceConstraint(p, px, dx, stiffness);
        tela.add_constraint(c);
      }

      if (j > 0) {
        let idy = id - 1;
        let py = tela.particles[idy];
        let c = new DistanceConstraint(p, py, dy, stiffness);
        tela.add_constraint(c);
      }

      id++;
    }
  }
  
  console.log("Tela creada con " + tela.particles.length + " partículas y " + tela.constraints.length + " restricciones."); 
  
  return tela;
}

// ============================================
// FUNCIÓN AÑADIR RESTRICCIONES DE BENDING
// ============================================
/**
 * Añade restricciones de bending (pliegue) a una tela existente.
 * Crea restricciones que mantienen constante el ángulo diedro entre triángulos adyacentes.
 * 
 * @param {PBDSystem} tela - El sistema PBD con la tela
 * @param {number} n_alto - Número de partículas en dirección Y
 * @param {number} n_ancho - Número de partículas en dirección X
 * @param {number} stiffness - Rigidez de las restricciones de bending (0-1)
 */
function add_bending_constraints(tela, n_alto, n_ancho, stiffness) {
  let num_bending = 0;
  
  // Función auxiliar para obtener el índice lineal de una partícula (i, j)
  function getIndex(i, j) {
    return i * n_alto + j;
  }
  
  // Función auxiliar para calcular el ángulo inicial entre dos triángulos
  function calcular_phi0(p1, p2, p3, p4) {
    // Calcular normales de los dos triángulos
    let e1 = p5.Vector.sub(p2.location, p1.location);
    let e2 = p5.Vector.sub(p3.location, p1.location);
    let e3 = p5.Vector.sub(p4.location, p1.location);
    
    let n1 = p5.Vector.cross(e1, e2);
    let n2 = p5.Vector.cross(e1, e3);
    
    let len_n1 = n1.mag();
    let len_n2 = n2.mag();
    
    // Evitar normales degeneradas
    if (len_n1 < 0.0001 || len_n2 < 0.0001) {
      return 0; // Ángulo plano por defecto
    }
    
    n1.normalize();
    n2.normalize();
    
    let d = n1.dot(n2);
    d = constrain(d, -1.0, 1.0);
    
    return acos(d);
  }
  
  // 1. BENDING CONSTRAINTS HORIZONTALES (alrededor de aristas verticales)
  // Configuración: p1-p3 es la arista compartida (vertical)
  //    p2
  //   / |
  //  p1-p3
  //   | \
  //    p4
  for (let i = 0; i < n_ancho - 1; i++) {
    for (let j = 0; j < n_alto - 1; j++) {
      // p1: (i, j), p2: (i, j+1), p3: (i+1, j), p4: (i+1, j+1)
      let idx1 = getIndex(i, j);
      let idx2 = getIndex(i, j + 1);
      let idx3 = getIndex(i + 1, j);
      let idx4 = getIndex(i + 1, j + 1);
      
      let p1 = tela.particles[idx1];
      let p2 = tela.particles[idx2];
      let p3 = tela.particles[idx3];
      let p4 = tela.particles[idx4];
      
      // Calcular ángulo inicial
      let phi0 = calcular_phi0(p1, p3, p2, p4);
      
      // Crear restricción de bending
      let bc = new BendingConstraint(p1, p3, p2, p4, phi0, stiffness);
      tela.add_constraint(bc);
      num_bending++;
    }
  }
  
  // 2. BENDING CONSTRAINTS VERTICALES (alrededor de aristas horizontales)
  // Configuración: p1-p2 es la arista compartida (horizontal)
  //  p3-p1-p4
  //     |
  //     p2
  for (let i = 0; i < n_ancho - 1; i++) {
    for (let j = 0; j < n_alto - 1; j++) {
      // p1: (i, j), p2: (i, j+1), p3: (i+1, j), p4: (i+1, j+1)
      let idx1 = getIndex(i, j);
      let idx2 = getIndex(i, j + 1);
      let idx3 = getIndex(i + 1, j);
      let idx4 = getIndex(i + 1, j + 1);
      
      let p1 = tela.particles[idx1];
      let p2 = tela.particles[idx2];
      let p3 = tela.particles[idx3];
      let p4 = tela.particles[idx4];
      
      // Calcular ángulo inicial
      let phi0 = calcular_phi0(p1, p2, p3, p4);
      
      // Crear restricción de bending
      let bc = new BendingConstraint(p1, p2, p3, p4, phi0, stiffness);
      tela.add_constraint(bc);
      num_bending++;
    }
  }
  
  console.log("Añadidas " + num_bending + " restricciones de bending.");
}

// ============================================
// FUNCIÓN AÑADIR RESTRICCIONES DE SHEAR (CIZALLA)
// ============================================
/**
 * Añade restricciones de shear (cizalla) a una tela existente.
 * Crea restricciones que mantienen constantes los ángulos internos de los triángulos
 * formados por la malla, previniendo la deformación por cizalla.
 * 
 * @param {PBDSystem} tela - El sistema PBD con la tela
 * @param {number} n_alto - Número de partículas en dirección Y
 * @param {number} n_ancho - Número de partículas en dirección X
 * @param {number} stiffness - Rigidez de las restricciones de shear (0-1)
 */
function add_shear_constraints(tela, n_alto, n_ancho, stiffness) {
  let num_shear = 0;
  
  // Función auxiliar para obtener el índice lineal de una partícula (i, j)
  function getIndex(i, j) {
    return i * n_alto + j;
  }
  
  // Función auxiliar para calcular el ángulo inicial en un vértice
  function calcular_psi0(p0, p1, p2) {
    // v1 = p1 - p0
    // v2 = p2 - p0
    let v1 = p5.Vector.sub(p1.location, p0.location);
    let v2 = p5.Vector.sub(p2.location, p0.location);
    
    let len_v1 = v1.mag();
    let len_v2 = v2.mag();
    
    // Evitar vectores degenerados
    if (len_v1 < 0.0001 || len_v2 < 0.0001) {
      return HALF_PI; // Ángulo de 90° por defecto
    }
    
    v1.normalize();
    v2.normalize();
    
    let c = v1.dot(v2);
    c = constrain(c, -1.0, 1.0);
    
    return acos(c);
  }
  
  // CREAR RESTRICCIONES DE SHEAR PARA CADA CUADRILÁTERO DE LA MALLA
  // Para cada cuadrilátero formado por 4 partículas adyacentes, creamos
  // 4 restricciones de shear (una por cada ángulo interno)
  
  for (let i = 0; i < n_ancho - 1; i++) {
    for (let j = 0; j < n_alto - 1; j++) {
      // Obtener los 4 vértices del cuadrilátero:
      //  p01 -- p11
      //   |      |
      //  p00 -- p10
      
      let idx00 = getIndex(i, j);
      let idx10 = getIndex(i + 1, j);
      let idx01 = getIndex(i, j + 1);
      let idx11 = getIndex(i + 1, j + 1);
      
      let p00 = tela.particles[idx00];
      let p10 = tela.particles[idx10];
      let p01 = tela.particles[idx01];
      let p11 = tela.particles[idx11];
      
      // TRIÁNGULO INFERIOR: (p00, p10, p01)
      // Restricción en ángulo de p00
      let psi0_p00_tri1 = calcular_psi0(p00, p10, p01);
      let sc1 = new ShearConstraint(p00, p10, p01, psi0_p00_tri1, stiffness);
      tela.add_constraint(sc1);
      num_shear++;
      
      // Restricción en ángulo de p10
      let psi0_p10_tri1 = calcular_psi0(p10, p00, p11);
      let sc2 = new ShearConstraint(p10, p00, p11, psi0_p10_tri1, stiffness);
      tela.add_constraint(sc2);
      num_shear++;
      
      // Restricción en ángulo de p01
      let psi0_p01_tri1 = calcular_psi0(p01, p00, p11);
      let sc3 = new ShearConstraint(p01, p00, p11, psi0_p01_tri1, stiffness);
      tela.add_constraint(sc3);
      num_shear++;
      
      // TRIÁNGULO SUPERIOR: (p10, p11, p01)
      // Restricción en ángulo de p11
      let psi0_p11_tri2 = calcular_psi0(p11, p10, p01);
      let sc4 = new ShearConstraint(p11, p10, p01, psi0_p11_tri2, stiffness);
      tela.add_constraint(sc4);
      num_shear++;
    }
  }
  
  console.log("Añadidas " + num_shear + " restricciones de shear.");
}


