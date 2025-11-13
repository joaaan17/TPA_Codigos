// ============================================
// CLASE PARTICLE
// ============================================
class Particle {
  constructor(l, v, ma) {
    this.acceleration = createVector(0.0, 0.0, 0.0);
    this.force = createVector(0.0, 0.0, 0.0);
    this.velocity = v.copy();
    this.location = l.copy();
    this.last_location = createVector(0, 0, 0);
    
    this.masa = ma;
    this.w = 1.0 / ma;
    
    this.bloqueada = false;
    this.display_size = 0.1;
  }

  set_bloqueada(bl) {
    this.bloqueada = true;
    this.w = 0;
    this.masa = Infinity;
  }

  update_pbd_vel(dt) {
    this.velocity = p5.Vector.sub(this.location, this.last_location).div(dt);
  }

  // Method to update location
  update(dt) {
    // Actualizar la aceleración de la partícula con la fuerza actual
    this.acceleration.add(p5.Vector.mult(this.force, this.w));
    
    // Guardamos posición anterior, para PBD
    this.last_location = this.location.copy();

    // Predicción de PBD
    // Utilizar euler semiimplícito para calcular velocidad y posición
    this.velocity.add(p5.Vector.mult(this.acceleration, dt));
    this.location.add(p5.Vector.mult(this.velocity, dt));
    
    // Limpieza de fuerzas y aceleraciones
    this.acceleration = createVector(0.0, 0.0, 0.0);
    this.force = createVector(0.0, 0.0, 0.0);
  }
  
  getLocation() {
    return this.location;
  }

  getLastLocation() {
    return this.last_location;
  }

  display(scale_px) {
    push();
      fill(220, 220, 220);
      noStroke(); // Sin bordes para mejor rendimiento en WEBGL
      translate(scale_px * this.location.x,
                -scale_px * this.location.y, // OJO!! Se le cambia el signo, porque los px aumentan hacia abajo
                scale_px * this.location.z);
      sphere(scale_px * this.display_size, 4, 4); // Ultra-optimizado a 4 segmentos
    pop();
  }
}

