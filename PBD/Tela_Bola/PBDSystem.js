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
    
    // 1. Resetear flags de colisión
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].collidedWithPlane = false;
    }
    
    // 2. Predicción de posiciones (integración explícita)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(dt);
    }

    // 3. Bucle de solver de restricciones
    for (let it = 0; it < this.niters; it++) {
      // 3a. Resolver todas las restricciones internas (distance, bending, shear)
      for (let i = 0; i < this.constraints.length; i++) {
        this.constraints[i].proyecta_restriccion();
      }
      
      // 3b. Resolver colisiones con objetos externos (esferas, planos, etc.)
      // Aquí se marcan las partículas que colisionaron
      for (let i = 0; i < this.collisionObjects.length; i++) {
        this.collisionObjects[i].project(this.particles);
      }
    }
     
    // 4. Actualizar velocidades basándose en el cambio de posición
    // v[i] = (p_new[i] - p_old[i]) / dt
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update_pbd_vel(dt);
    }
    
    // 5. APLICAR FRICCIÓN (según Müller07, DESPUÉS de actualizar velocidades)
    this.apply_friction();
    
    // 6. APLICAR DAMPING GLOBAL (según Müller07, preserva movimiento rígido)
    this.applyGlobalDamping(0.25); // k_damping entre 0.1-0.2
  }
  
  apply_friction() {
    // Coeficiente de fricción (configurable)
    const frictionCoefficient = 0.8; // 0.5-0.8 funciona bien
    
    // Buscar el plano en collisionObjects (asumiendo que solo hay uno)
    let planeNormal = null;
    for (let i = 0; i < this.collisionObjects.length; i++) {
      if (this.collisionObjects[i].normal) {
        planeNormal = this.collisionObjects[i].normal;
        break;
      }
    }
    
    // Si no hay plano, no aplicar fricción
    if (!planeNormal) return;
    
    // Para cada partícula que colisionó con el plano
    for (let i = 0; i < this.particles.length; i++) {
      let part = this.particles[i];
      
      // Solo aplicar fricción si la partícula colisionó en este frame
      if (!part.collidedWithPlane) continue;
      
      // Obtener velocidad actual
      let v = part.velocity;
      
      // Descomponer velocidad en componente normal y tangencial
      let v_normal_mag = v.dot(planeNormal);
      let v_normal = p5.Vector.mult(planeNormal, v_normal_mag);
      let v_tangent = p5.Vector.sub(v, v_normal);
      
      // Aplicar fricción SOLO a la componente tangencial
      v_tangent.mult(1.0 - frictionCoefficient);
      
      // OPCIONAL: Reducir rebote (coeficiente de restitución)
      if (v_normal_mag < 0) {
        v_normal.mult(0.3); // 30% de rebote
      }
      
      // Reconstruir velocidad final
      part.velocity = p5.Vector.add(v_normal, v_tangent);
    }
  }
  
  // ============================================
  // DAMPING GLOBAL DE MÜLLER (2007)
  // ============================================
  // Este método preserva el movimiento rígido (traslación + rotación)
  // y solo atenúa las vibraciones y energía artificial de las constraints
  applyGlobalDamping(k_damping) {
    // k_damping: parámetro entre 0 y 1
    // 0 = sin damping
    // 1 = elimina todo movimiento no rígido
    // Recomendado: 0.1 - 0.2
    
    let n = this.particles.length;
    if (n === 0) return;
    
    // ===== A) Calcular centro de masas =====
    let x_cm = createVector(0, 0, 0);
    let total_mass = 0;
    
    for (let i = 0; i < n; i++) {
      let p = this.particles[i];
      x_cm.add(p5.Vector.mult(p.location, p.masa));
      total_mass += p.masa;
    }
    x_cm.div(total_mass);
    
    // ===== B) Calcular velocidad del centro de masas =====
    let v_cm = createVector(0, 0, 0);
    
    for (let i = 0; i < n; i++) {
      let p = this.particles[i];
      v_cm.add(p5.Vector.mult(p.velocity, p.masa));
    }
    v_cm.div(total_mass);
    
    // ===== C) Calcular momento angular L =====
    let L = createVector(0, 0, 0);
    
    for (let i = 0; i < n; i++) {
      let p = this.particles[i];
      let r = p5.Vector.sub(p.location, x_cm); // Posición relativa
      let momentum = p5.Vector.mult(p.velocity, p.masa); // m * v
      let angular = p5.Vector.cross(r, momentum); // r × (m * v)
      L.add(angular);
    }
    
    // ===== D) Calcular tensor de inercia I (matriz 3x3) =====
    // I = Σ m[i] * (|r|² * Identity - outer(r, r))
    let I = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    
    for (let i = 0; i < n; i++) {
      let p = this.particles[i];
      let r = p5.Vector.sub(p.location, x_cm);
      let r_sq = r.magSq();
      let m = p.masa;
      
      // Diagonal: m * |r|²
      I[0][0] += m * r_sq;
      I[1][1] += m * r_sq;
      I[2][2] += m * r_sq;
      
      // Fuera de diagonal: -m * r[i] * r[j]
      I[0][0] -= m * r.x * r.x;
      I[0][1] -= m * r.x * r.y;
      I[0][2] -= m * r.x * r.z;
      
      I[1][0] -= m * r.y * r.x;
      I[1][1] -= m * r.y * r.y;
      I[1][2] -= m * r.y * r.z;
      
      I[2][0] -= m * r.z * r.x;
      I[2][1] -= m * r.z * r.y;
      I[2][2] -= m * r.z * r.z;
    }
    
    // ===== E) Calcular velocidad angular w = I^(-1) * L =====
    // Invertir matriz 3x3 y multiplicar por L
    let w = this.invertMatrixAndMultiply(I, L);
    
    // Si la inversión falla (matriz singular), no aplicar damping angular
    if (w === null) {
      // Solo aplicar damping a traslación
      for (let i = 0; i < n; i++) {
        let p = this.particles[i];
        let v_non_rigid = p5.Vector.sub(p.velocity, v_cm);
        p.velocity = p5.Vector.add(v_cm, p5.Vector.mult(v_non_rigid, 1.0 - k_damping));
      }
      return;
    }
    
    // ===== F y G) Calcular velocidad rígida y aplicar damping =====
    for (let i = 0; i < n; i++) {
      let p = this.particles[i];
      let r = p5.Vector.sub(p.location, x_cm); // Posición relativa
      
      // Velocidad rígida ideal: v_rigid = v_cm + w × r
      let w_cross_r = p5.Vector.cross(w, r);
      let v_rigid = p5.Vector.add(v_cm, w_cross_r);
      
      // Aplicar damping solo a la parte no rígida
      // v_new = v_rigid + (1 - k_damping) * (v_old - v_rigid)
      let v_non_rigid = p5.Vector.sub(p.velocity, v_rigid);
      p.velocity = p5.Vector.add(v_rigid, p5.Vector.mult(v_non_rigid, 1.0 - k_damping));
    }
  }
  
  // ============================================
  // UTILIDAD: Invertir matriz 3x3 y multiplicar por vector
  // ============================================
  invertMatrixAndMultiply(I, v) {
    // Calcular determinante
    let det = I[0][0] * (I[1][1] * I[2][2] - I[1][2] * I[2][1]) -
              I[0][1] * (I[1][0] * I[2][2] - I[1][2] * I[2][0]) +
              I[0][2] * (I[1][0] * I[2][1] - I[1][1] * I[2][0]);
    
    // Si determinante es muy pequeño, la matriz es singular
    if (abs(det) < 0.0001) {
      return null;
    }
    
    // Calcular matriz inversa usando cofactores
    let invDet = 1.0 / det;
    let I_inv = [
      [
        (I[1][1] * I[2][2] - I[1][2] * I[2][1]) * invDet,
        (I[0][2] * I[2][1] - I[0][1] * I[2][2]) * invDet,
        (I[0][1] * I[1][2] - I[0][2] * I[1][1]) * invDet
      ],
      [
        (I[1][2] * I[2][0] - I[1][0] * I[2][2]) * invDet,
        (I[0][0] * I[2][2] - I[0][2] * I[2][0]) * invDet,
        (I[0][2] * I[1][0] - I[0][0] * I[1][2]) * invDet
      ],
      [
        (I[1][0] * I[2][1] - I[1][1] * I[2][0]) * invDet,
        (I[0][1] * I[2][0] - I[0][0] * I[2][1]) * invDet,
        (I[0][0] * I[1][1] - I[0][1] * I[1][0]) * invDet
      ]
    ];
    
    // Multiplicar I_inv * v
    let result = createVector(
      I_inv[0][0] * v.x + I_inv[0][1] * v.y + I_inv[0][2] * v.z,
      I_inv[1][0] * v.x + I_inv[1][1] * v.y + I_inv[1][2] * v.z,
      I_inv[2][0] * v.x + I_inv[2][1] * v.y + I_inv[2][2] * v.z
    );
    
    return result;
  }
}

