// ============================================
// CLASE CONSTRAINT (Abstract)
// ============================================
class Constraint {
  constructor() {
    this.particles = [];
    this.stiffness = 0;
    this.k_coef = 0;
    this.C = 0;
  }
  
  compute_k_coef(n) {
    this.k_coef = 1.0 - pow((1.0 - this.stiffness), 1.0 / n);
    console.log("Fijamos " + n + " iteraciones   -->  k = " + this.stiffness + "    k' = " + this.k_coef + ".");
  }

  proyecta_restriccion() {
    // Abstract method - to be implemented by subclasses
  }
  
  display(scale_px) {
    // Abstract method - to be implemented by subclasses
  }
}

// ============================================
// CLASE DISTANCECONSTRAINT
// ============================================
class DistanceConstraint extends Constraint {
  constructor(p1, p2, dist, k) {
    super();
    this.d = dist;
    this.particles.push(p1);
    this.particles.push(p2);
    this.stiffness = k;
    this.k_coef = k;
    this.C = 0;
  }
  
  proyecta_restriccion() {
    let part1 = this.particles[0]; 
    let part2 = this.particles[1];
    
    // Vector de diferencia entre partículas
    let vd = p5.Vector.sub(part1.location, part2.location);
    let dist_actual = vd.mag();
    
    // Si las partículas están en la misma posición, salir
    if (dist_actual < 0.0001) return;
    
    // Calcular constraint: C = |p1 - p2| - d
    this.C = dist_actual - this.d;
    
    // Normalizar el vector de diferencia
    let n = vd.normalize();
    
    // Calcular las correcciones usando el método PBD
    // delta_p = -k' * C * n / (w1 + w2)
    let w_sum = part1.w + part2.w;
    if (w_sum < 0.0001) return; // Ambas partículas fijas
    
    let delta_lambda = -this.k_coef * this.C / w_sum;
    
    // Aplicar correcciones
    let correction = p5.Vector.mult(n, delta_lambda);
    
    if (!part1.bloqueada) {
      part1.location.add(p5.Vector.mult(correction, part1.w));
    }
    if (!part2.bloqueada) {
      part2.location.sub(p5.Vector.mult(correction, part2.w));
    }
  }
  
  display(scale_px) {
    // YA NO SE USA - El rendering se hace con beginShape(LINES) en PBD.js
    // Esto es mucho más rápido que llamar line() 180 veces
  }
}

