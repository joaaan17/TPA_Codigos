// ============================================
// CLASE PBDSYSTEM
// ============================================
class PBDSystem {
  constructor(n, mass) {
    // Array de partículas luminosas. Aún NO SE CREAN las partículas concretas
    this.particles = [];
    this.constraints = [];
    
    this.niters = 5;
    
    let p = createVector(0, 0, 0);
    let v = createVector(0, 0, 0);
 
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(p, v, mass));
    }
  }

  set_n_iters(n) {
    this.niters = n;
    for (let i = 0; i < this.constraints.length; i++) {
      this.constraints[i].compute_k_coef(n);
    }
  }

  add_constraint(c) {
    this.constraints.push(c);
    c.compute_k_coef(this.niters);
  }

  apply_gravity(g) {
    // Optimizado: aplicar gravedad sin crear vectores temporales
    let gx = g.x;
    let gy = g.y;
    let gz = g.z;
    
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      if (p.w > 0) { // Si la masa es infinita, no se aplica
        p.force.x += gx * p.masa;
        p.force.y += gy * p.masa;
        p.force.z += gz * p.masa;
      }
    }
  }

  run(dt) {
    // Simulación
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(dt);
    }

    for (let it = 0; it < this.niters; it++) {
      for (let i = 0; i < this.constraints.length; i++) {
        this.constraints[i].proyecta_restriccion();
      }
    }
     
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update_pbd_vel(dt);
    }
  }
}

