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
    
    // Calcular diferencia directamente sin crear vector temporal
    let dx = part1.location.x - part2.location.x;
    let dy = part1.location.y - part2.location.y;
    let dz = part1.location.z - part2.location.z;
    
    let dist_actual = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Si las partículas están en la misma posición, salir
    if (dist_actual < 0.0001) return;
    
    // Calcular constraint: C = |p1 - p2| - d
    this.C = dist_actual - this.d;
    
    // Normalizar y calcular corrección en uno
    let w_sum = part1.w + part2.w;
    if (w_sum < 0.0001) return; // Ambas partículas fijas
    
    let factor = -this.k_coef * this.C / (w_sum * dist_actual);
    
    // Aplicar correcciones directamente
    if (!part1.bloqueada) {
      let w1_factor = factor * part1.w;
      part1.location.x += dx * w1_factor;
      part1.location.y += dy * w1_factor;
      part1.location.z += dz * w1_factor;
    }
    if (!part2.bloqueada) {
      let w2_factor = factor * part2.w;
      part2.location.x -= dx * w2_factor;
      part2.location.y -= dy * w2_factor;
      part2.location.z -= dz * w2_factor;
    }
  }
  
  display(scale_px) {
    let p1 = this.particles[0].location; 
    let p2 = this.particles[1].location; 
    
    // Color que cambia según la tensión/compresión
    let tension = abs(4 * this.C / this.d);
    let colorVal = 255 * (1 - tension);
    
    strokeWeight(2); // Reducido para mejor rendimiento
    stroke(255, colorVal, colorVal);
    line(scale_px * p1.x, -scale_px * p1.y, scale_px * p1.z, 
         scale_px * p2.x, -scale_px * p2.y, scale_px * p2.z);
  }
}

