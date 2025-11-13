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

// ============================================
// CLASE BENDINGCONSTRAINT (Müller 2007)
// ============================================
class BendingConstraint extends Constraint {
  constructor(p1, p2, p3, p4, phi0, k) {
    super();
    this.particles.push(p1); // i1
    this.particles.push(p2); // i2
    this.particles.push(p3); // i3
    this.particles.push(p4); // i4
    this.phi0 = phi0; // Ángulo diedro inicial
    this.stiffness = k;
    this.k_coef = k;
    this.C = 0;
    this.epsilon = 0.0001; // Para evitar divisiones por cero
  }
  
  proyecta_restriccion() {
    let part1 = this.particles[0]; // p1
    let part2 = this.particles[1]; // p2
    let part3 = this.particles[2]; // p3
    let part4 = this.particles[3]; // p4
    
    // 1. Leer posiciones
    let p1 = part1.location;
    let p2 = part2.location;
    let p3 = part3.location;
    let p4 = part4.location;
    
    // 2. Calcular normales n1 y n2
    // n1 = normalize(cross(p2 - p1, p3 - p1))
    // n2 = normalize(cross(p2 - p1, p4 - p1))
    let e1 = p5.Vector.sub(p2, p1); // p2 - p1
    let e2 = p5.Vector.sub(p3, p1); // p3 - p1
    let e3 = p5.Vector.sub(p4, p1); // p4 - p1
    
    let n1 = p5.Vector.cross(e1, e2);
    let n2 = p5.Vector.cross(e1, e3);
    
    let len_n1 = n1.mag();
    let len_n2 = n2.mag();
    
    // Validación: evitar normales degeneradas
    if (len_n1 < this.epsilon || len_n2 < this.epsilon) {
      return; // Normales degeneradas, salir sin aplicar corrección
    }
    
    n1.normalize();
    n2.normalize();
    
    // 3. Calcular d = dot(n1, n2)
    let d = n1.dot(n2);
    
    // Validación: clamp d a [-1, 1] para evitar problemas con acos
    d = constrain(d, -1.0, 1.0);
    
    // 4. Calcular C = acos(d) - phi0
    this.C = acos(d) - this.phi0;
    
    // 5. Si |C| < epsilon, no hay que corregir
    if (abs(this.C) < this.epsilon) {
      return;
    }
    
    // 6. Calcular gradientes q1, q2, q3, q4 (fórmulas explícitas de Müller 2007)
    // Necesitamos calcular los qi usando las fórmulas exactas
    
    // Vectores auxiliares
    let p2_p3 = p5.Vector.sub(p2, p3);
    let p2_p4 = p5.Vector.sub(p2, p4);
    let p3_p2 = p5.Vector.sub(p3, p2);
    let p4_p2 = p5.Vector.sub(p4, p2);
    
    let len_p2_p3 = p2_p3.mag();
    let len_p2_p4 = p2_p4.mag();
    
    // Validación: evitar división por cero
    if (len_p2_p3 < this.epsilon || len_p2_p4 < this.epsilon) {
      return;
    }
    
    // Fórmulas explícitas de Müller 2007, Apéndice B:
    // q3 = (p2 - n2 + (n1 - p2) * d) / |p2 - p3|
    // q4 = (p2 - n1 + (n2 - p2) * d) / |p2 - p4|
    // q2 = -(p3 - n2 + (n1 - p3) * d) / |p2 - p3| - (p4 - n1 + (n2 - p4) * d) / |p2 - p4|
    // q1 = -q2 - q3 - q4
    
    let n1_scaled = p5.Vector.mult(n1, d);
    let n2_scaled = p5.Vector.mult(n2, d);
    
    // q3 = (cross(p2 - p1, n2) + cross(n1, p2 - p1) * d) / |p2 - p3|
    // Usando la formulación simplificada:
    let q3 = p5.Vector.cross(e1, n2).div(len_p2_p3);
    
    // q4 = (cross(p2 - p1, n1) + cross(n2, p2 - p1) * d) / |p2 - p4|
    let q4 = p5.Vector.cross(e1, n1).div(len_p2_p4);
    
    // q2 = -cross(p3 - p1, n2) / |p2 - p3| - cross(p4 - p1, n1) / |p2 - p4|
    let q2_part1 = p5.Vector.cross(e2, n2).div(len_p2_p3);
    let q2_part2 = p5.Vector.cross(e3, n1).div(len_p2_p4);
    let q2 = p5.Vector.add(q2_part1, q2_part2).mult(-1);
    
    // q1 = -q2 - q3 - q4
    let q1 = p5.Vector.sub(createVector(0, 0, 0), q2);
    q1.sub(q3);
    q1.sub(q4);
    
    // 7. Calcular sum_q2 = |q1|^2 + |q2|^2 + |q3|^2 + |q4|^2
    let sum_q2 = q1.magSq() + q2.magSq() + q3.magSq() + q4.magSq();
    
    // Validación: evitar división por cero
    if (sum_q2 < this.epsilon) {
      return;
    }
    
    // 8. Calcular masas inversas y sum_w
    let w1 = part1.w;
    let w2 = part2.w;
    let w3 = part3.w;
    let w4 = part4.w;
    let sum_w = w1 + w2 + w3 + w4;
    
    // Validación: si todas las partículas están fijas
    if (sum_w < this.epsilon) {
      return;
    }
    
    // 9. Calcular Δpi para cada partícula
    // Δpi = -(4 * wi / sum_w) * ((acos(d) - phi0) / sqrt(1 - d^2)) * qi / sum_q2
    
    let d2 = d * d;
    let sqrt_term = sqrt(1.0 - d2);
    
    // Validación: evitar división por cero en sqrt(1 - d^2)
    if (sqrt_term < this.epsilon) {
      return;
    }
    
    let scalar = (acos(d) - this.phi0) / sqrt_term;
    let factor = -scalar / sum_q2;
    
    // Aplicar rigidez ajustada (k')
    factor *= this.k_coef;
    
    // Calcular y aplicar correcciones
    if (!part1.bloqueada) {
      let delta_p1 = p5.Vector.mult(q1, 4.0 * w1 * factor / sum_w);
      part1.location.add(delta_p1);
    }
    
    if (!part2.bloqueada) {
      let delta_p2 = p5.Vector.mult(q2, 4.0 * w2 * factor / sum_w);
      part2.location.add(delta_p2);
    }
    
    if (!part3.bloqueada) {
      let delta_p3 = p5.Vector.mult(q3, 4.0 * w3 * factor / sum_w);
      part3.location.add(delta_p3);
    }
    
    if (!part4.bloqueada) {
      let delta_p4 = p5.Vector.mult(q4, 4.0 * w4 * factor / sum_w);
      part4.location.add(delta_p4);
    }
  }
  
  display(scale_px) {
    // YA NO SE USA - El rendering se hace en PBD.js
  }
}

