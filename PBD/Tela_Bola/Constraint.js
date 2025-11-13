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

// ============================================
// CLASE SHEARCONSTRAINT (Angular)
// ============================================
class ShearConstraint extends Constraint {
  constructor(p0, p1, p2, psi0, k) {
    super();
    this.particles.push(p0); // x0 - vértice donde se mide el ángulo
    this.particles.push(p1); // x1 - primer punto del ángulo
    this.particles.push(p2); // x2 - segundo punto del ángulo
    this.psi0 = psi0; // Ángulo inicial
    this.stiffness = k;
    this.k_coef = k;
    this.C = 0;
    this.epsilon = 0.0001; // Para evitar divisiones por cero
  }
  
  proyecta_restriccion() {
    let part0 = this.particles[0]; // x0
    let part1 = this.particles[1]; // x1
    let part2 = this.particles[2]; // x2
    
    // 1. Leer posiciones x0, x1, x2
    let x0 = part0.location;
    let x1 = part1.location;
    let x2 = part2.location;
    
    // 2. Calcular v1 y v2
    // v1 = x1 - x0
    // v2 = x2 - x0
    let v1 = p5.Vector.sub(x1, x0);
    let v2 = p5.Vector.sub(x2, x0);
    
    let len_v1 = v1.mag();
    let len_v2 = v2.mag();
    
    // Validación: evitar vectores degenerados
    if (len_v1 < this.epsilon || len_v2 < this.epsilon) {
      return; // Vectores degenerados, salir sin aplicar corrección
    }
    
    // Normalizar v1 y v2
    v1.normalize();
    v2.normalize();
    
    // 3. Calcular c = dot(v1, v2) con clamp
    let c = v1.dot(v2);
    c = constrain(c, -1.0, 1.0);
    
    // 4. Calcular C = acos(c) - psi0
    this.C = acos(c) - this.psi0;
    
    // 5. Si C ≈ 0, salir
    if (abs(this.C) < this.epsilon) {
      return;
    }
    
    // Validación: evitar NaN en sqrt(1 - c²)
    let c2 = c * c;
    let sqrt_term = sqrt(1.0 - c2);
    if (sqrt_term < this.epsilon) {
      return; // Evitar división por cero
    }
    
    // 6. Calcular gradientes ∇x0, ∇x1, ∇x2
    // Fórmulas exactas según las diapositivas:
    // ∇x1 C = -(1 / sqrt(1 - c²)) * ((I - v1v1^T) / |x1 - x0|) * v2
    // ∇x2 C = -(1 / sqrt(1 - c²)) * ((I - v2v2^T) / |x2 - x0|) * v1
    // ∇x0 C = -∇x1 C - ∇x2 C
    
    let factor = -1.0 / sqrt_term;
    
    // Para ∇x1 C: necesitamos calcular (I - v1v1^T) * v2
    // (I - v1v1^T) * v2 = v2 - v1 * (v1 · v2) = v2 - v1 * c
    let grad_x1_unnorm = p5.Vector.sub(v2, p5.Vector.mult(v1, c));
    let grad_x1 = p5.Vector.mult(grad_x1_unnorm, factor / len_v1);
    
    // Para ∇x2 C: necesitamos calcular (I - v2v2^T) * v1
    // (I - v2v2^T) * v1 = v1 - v2 * (v2 · v1) = v1 - v2 * c
    let grad_x2_unnorm = p5.Vector.sub(v1, p5.Vector.mult(v2, c));
    let grad_x2 = p5.Vector.mult(grad_x2_unnorm, factor / len_v2);
    
    // ∇x0 C = -∇x1 C - ∇x2 C
    let grad_x0 = p5.Vector.sub(createVector(0, 0, 0), grad_x1);
    grad_x0.sub(grad_x2);
    
    // 7. Calcular |∇C|² = |∇x0 C|² + |∇x1 C|² + |∇x2 C|²
    let grad_norm_sq = grad_x0.magSq() + grad_x1.magSq() + grad_x2.magSq();
    
    // Validación: evitar división por cero
    if (grad_norm_sq < this.epsilon) {
      return;
    }
    
    // 8. Calcular masas inversas y sum_w
    let w0 = part0.w;
    let w1 = part1.w;
    let w2 = part2.w;
    let sum_w = w0 + w1 + w2;
    
    // Validación: si todas las partículas están fijas
    if (sum_w < this.epsilon) {
      return;
    }
    
    // 9. Aplicar fórmula PBD para Δp0, Δp1, Δp2
    // Δpi = -(wi / sum_w) * (C / |∇C|²) * ∇pi C
    let lambda = -this.C / grad_norm_sq;
    
    // Aplicar rigidez k' (ajustada por el solver)
    lambda *= this.k_coef;
    
    // 10. Calcular y aplicar correcciones
    if (!part0.bloqueada) {
      let delta_p0 = p5.Vector.mult(grad_x0, (w0 / sum_w) * lambda);
      part0.location.add(delta_p0);
    }
    
    if (!part1.bloqueada) {
      let delta_p1 = p5.Vector.mult(grad_x1, (w1 / sum_w) * lambda);
      part1.location.add(delta_p1);
    }
    
    if (!part2.bloqueada) {
      let delta_p2 = p5.Vector.mult(grad_x2, (w2 / sum_w) * lambda);
      part2.location.add(delta_p2);
    }
  }
  
  display(scale_px) {
    // YA NO SE USA - El rendering se hace en PBD.js
  }
}

// ============================================
// CLASE SPHERECOLLISION (Colisión con esfera)
// ============================================
class SphereCollision {
  constructor(center, radius) {
    this.center = center.copy(); // p5.Vector - centro de la esfera
    this.radius = radius; // number - radio de la esfera
    this.epsilon = 0.0001; // Para evitar divisiones por cero
  }
  
  /**
   * Proyecta las partículas que penetran la esfera hacia afuera
   * Esta es una restricción de DESIGUALDAD: solo se aplica si C < 0
   * 
   * @param {Array} particles - Array de partículas del sistema
   */
  project(particles) {
    for (let i = 0; i < particles.length; i++) {
      let part = particles[i];
      
      // Saltar partículas bloqueadas (no se pueden mover)
      if (part.bloqueada) continue;
      
      // 1. Obtener posición predicha de la partícula
      let p = part.location;
      
      // 2. Calcular dirección y distancia desde el centro de la esfera
      let dir = p5.Vector.sub(p, this.center);
      let dist = dir.mag();
      
      // 3. Evaluar colisión: dist < radius → hay penetración
      if (dist >= this.radius) {
        continue; // No hay colisión, pasar a la siguiente partícula
      }
      
      // 4. HAY COLISIÓN - Calcular vector normal
      // Proteger contra el caso raro dist == 0 (partícula exactamente en el centro)
      let n;
      if (dist < this.epsilon) {
        // Usar un vector fijo para evitar NaN
        n = createVector(0, 1, 0); // Empujar hacia arriba por defecto
      } else {
        n = dir.normalize();
      }
      
      // 5. Calcular C(p) = dist - radius (será negativo porque hay penetración)
      let C = dist - this.radius;
      
      // 6. Aplicar corrección PBD
      // Para un constraint con un solo punto: Δp = -C * n
      // Como C < 0 (penetración), -C > 0, empuja hacia afuera
      // Equivalente a: Δp = (radius - dist) * n
      let correction = p5.Vector.mult(n, -C);
      
      // 7. Actualizar posición de la partícula
      part.location.add(correction);
    }
  }
  
  display(scale_px) {
    // Dibujar la esfera de colisión
    push();
    translate(scale_px * this.center.x, 
              -scale_px * this.center.y, 
              scale_px * this.center.z);
    
    // Esfera semitransparente para visualizar colisiones
    fill(255, 100, 100); // Rojo semitransparente
    noStroke();
    sphere(scale_px * this.radius, 16, 16);
    pop();
  }
}

// ============================================
// CLASE PLANECOLLISION (Colisión con plano)
// ============================================
class PlaneCollision {
  constructor(point, normal) {
    this.point = point.copy(); // p5.Vector - punto en el plano
    this.normal = normal.copy().normalize(); // p5.Vector - normal del plano (unitaria)
    this.epsilon = 0.0001;
  }
  
  /**
   * Proyecta las partículas que penetran el plano hacia afuera
   * Esta es una restricción de DESIGUALDAD: solo se aplica si la partícula
   * está debajo del plano
   * 
   * @param {Array} particles - Array de partículas del sistema
   */
  project(particles) {
    for (let i = 0; i < particles.length; i++) {
      let part = particles[i];
      
      // Saltar partículas bloqueadas
      if (part.bloqueada) continue;
      
      // 1. Obtener posición de la partícula
      let p = part.location;
      
      // 2. Calcular distancia con signo al plano
      // dist = (p - point) · normal
      let diff = p5.Vector.sub(p, this.point);
      let dist = diff.dot(this.normal);
      
      // 3. Evaluar colisión: dist < 0 → partícula debajo del plano
      if (dist >= 0) {
        continue; // No hay colisión
      }
      
      // 4. HAY COLISIÓN - Empujar partícula hacia arriba
      // Corrección: Δp = -dist * normal (dist es negativo, -dist es positivo)
      let correction = p5.Vector.mult(this.normal, -dist);
      
      // 5. Aplicar corrección
      part.location.add(correction);
    }
  }
  
  display(scale_px) {
    // Dibujar el plano como una rejilla
    push();
    
    // Posicionar en el punto del plano
    translate(scale_px * this.point.x, 
              -scale_px * this.point.y, 
              scale_px * this.point.z);
    
    // Dibujar rejilla
    stroke(100, 255, 100, 180); // Verde semitransparente
    strokeWeight(1);
    noFill();
    
    let grid_size = 3.0; // Tamaño de la rejilla en metros
    let grid_divisions = 20;
    let cell_size = grid_size / grid_divisions;
    
    // Líneas paralelas en X
    for (let i = -grid_divisions / 2; i <= grid_divisions / 2; i++) {
      let x = i * cell_size;
      line(scale_px * x, 0, -scale_px * grid_size / 2,
           scale_px * x, 0, scale_px * grid_size / 2);
    }
    
    // Líneas paralelas en Z
    for (let j = -grid_divisions / 2; j <= grid_divisions / 2; j++) {
      let z = j * cell_size;
      line(-scale_px * grid_size / 2, 0, scale_px * z,
           scale_px * grid_size / 2, 0, scale_px * z);
    }
    
    pop();
  }
}


