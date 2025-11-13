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
  for (let i = 0; i < n_ancho; i++) {
    for (let j = 0; j < n_alto; j++) {
      let p = tela.particles[id];
      p.location.set(dx * i, dy * j, 0);
      p.display_size = display_size;
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
  
  // Fijamos dos esquinas
  id = n_alto - 1;
  tela.particles[id].set_bloqueada(true); 
  
  id = N - 1;
  tela.particles[id].set_bloqueada(true); 
  
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


