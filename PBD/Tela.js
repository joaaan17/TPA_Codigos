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

