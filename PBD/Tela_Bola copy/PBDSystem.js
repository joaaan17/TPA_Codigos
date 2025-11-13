// ============================================
// CLASE PBDSYSTEM
// ============================================
class PBDSystem {
  constructor(n, mass) {
    // Array de partículas luminosas. Aún NO SE CREAN las partículas concretas
    this.particles = [];
    this.constraints = [];
    this.collisionObjects = []; // Array de objetos de colisión (esferas, planos, etc.)
    
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
  
  add_collision_object(obj) {
    this.collisionObjects.push(obj);
  }

  apply_gravity(g) {
    let p;
    for (let i = 0; i < this.particles.length; i++) {
      p = this.particles[i];
      if (p.w > 0) { // Si la masa es infinita, no se aplica
        p.force.add(p5.Vector.mult(g, p.masa));
      }
    }
  }

  run(dt) {
    // Simulación PBD según Müller et al.
    
    // 1. Predicción de posiciones (integración explícita)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(dt);
    }

    // 2. Bucle de solver de restricciones
    for (let it = 0; it < this.niters; it++) {
      // 2a. Resolver todas las restricciones internas (distance, bending, shear)
      for (let i = 0; i < this.constraints.length; i++) {
        this.constraints[i].proyecta_restriccion();
      }
      
      // 2b. Resolver colisiones con objetos externos (esferas, planos, etc.)
      for (let i = 0; i < this.collisionObjects.length; i++) {
        this.collisionObjects[i].project(this.particles);
      }
    }
     
    // 3. Actualizar velocidades basándose en el cambio de posición
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update_pbd_vel(dt);
    }
  }
}

