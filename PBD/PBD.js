// ============================================
// VARIABLES GLOBALES
// ============================================
let scale_px = 200;  // Reducido para mejor escala visual
let debug = false;
let system;
let dt = 0.016;  // ~60 FPS
let vel_viento;

// Variables para la esfera de colisión
let collisionSphere;
let sphere_velocity = 0.05; // Velocidad de movimiento de la esfera (m/frame)

// Sistema de input continuo estilo videojuego
let keysPressed = {
  up: false,
  down: false,
  left: false,
  right: false,
  forward: false,
  backward: false
};

// Propiedades tela (optimizadas para rendimiento)
let ancho_tela = 2.0;  // 2 metros de ancho
let alto_tela = 2.0;   // 2 metros de alto
let n_ancho_tela = 15; // Aumentamos ahora que arreglamos el rendering
let n_alto_tela = 15;  // 15x15 = 225 partículas
let densidad_tela = 0.1; // kg/m^2 Podría ser tela gruesa de algodón, 100g/m^2
let sphere_size_tela;
let stiffness = 0.98;  // Aumentado para tela más rígida
let bending_stiffness = 0.1; // Rigidez de las restricciones de bending
let shear_stiffness = 0.1; // Rigidez de las restricciones de shear
let use_bending = true; // Activar/desactivar restricciones de bending
let use_shear = true; // Activar/desactivar restricciones de shear

// ============================================
// SETUP
// ============================================
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  vel_viento = createVector(0, 0, 0);
  sphere_size_tela = ancho_tela / n_ancho_tela * 0.4;
  
  system = crea_tela(alto_tela,
                    ancho_tela,
                    densidad_tela,
                    n_alto_tela,
                    n_ancho_tela,
                    stiffness,
                    sphere_size_tela);
  
  // AÑADIR RESTRICCIONES DE BENDING (opcional)
  if (use_bending) {
    add_bending_constraints(system, n_alto_tela, n_ancho_tela, bending_stiffness);
  }
  
  // AÑADIR RESTRICCIONES DE SHEAR (opcional)
  if (use_shear) {
    add_shear_constraints(system, n_alto_tela, n_ancho_tela, shear_stiffness);
  }
  
  // CREAR ESFERA DE COLISIÓN
  // Posicionar la esfera debajo y al centro de la tela
  let sphere_center = createVector(ancho_tela / 2, -0.5, 0);
  let sphere_radius = 0.3; // 30 cm de radio
  collisionSphere = new SphereCollision(sphere_center, sphere_radius);
  system.add_collision_object(collisionSphere);
  
  console.log("Esfera de colisión creada en posición:", sphere_center);
                    
  system.set_n_iters(5); // Podemos permitirnos más iteraciones ahora
}

// Ajustar canvas cuando se redimensiona la ventana
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ============================================
// FUNCIÓN APLICAR VIENTO
// ============================================
function aplica_viento() {
  // Aplicamos una fuerza que es proporcional al área.
  // No calculamos la normal. Se deja como ejercicio
  // El área se calcula como el área total, entre el número de partículas
  let npart = system.particles.length;
  let area_total = ancho_tela * alto_tela;
  let area = area_total / npart;
  
  for (let i = 0; i < npart; i++) {
    let x = (0.5 + random(0.5)) * vel_viento.x * area;
    let y = (0.5 + random(0.5)) * vel_viento.y * area;
    let z = (0.5 + random(0.5)) * vel_viento.z * area;
    let fv = createVector(x, y, z); 
    system.particles[i].force.add(fv);
  }
}

// ============================================
// DRAW
// ============================================
function draw() {
  background(20, 20, 55);
  
  // Control de cámara orbital (usa el mouse para rotar)
  orbitControl();
  
  // MOVER ESFERA DE FORMA CONTINUA (estilo videojuego)
  moveSphereFromInput();

  system.apply_gravity(createVector(0.0, -9.81, 0.0)); // Gravedad más realista
  aplica_viento();

  system.run(dt);  

  display();
  stats();
}

// ============================================
// STATS Y DISPLAY
// ============================================
function stats() {
  // Actualizar estadísticas en HTML (más eficiente que dibujar texto en WEBGL)
  let npart = system.particles.length;
  let nconst = system.constraints.length;
  
  document.getElementById('fps').textContent = int(frameRate());
  document.getElementById('particles').textContent = npart;
  document.getElementById('constraints').textContent = nconst;
  document.getElementById('wind').textContent = 
    '(' + vel_viento.x.toFixed(3) + ', ' + 
    vel_viento.y.toFixed(3) + ', ' + 
    vel_viento.z.toFixed(3) + ')';
  document.getElementById('bending').textContent = use_bending ? 'ON' : 'OFF';
  document.getElementById('shear').textContent = use_shear ? 'ON' : 'OFF';
}

function display() {
  let npart = system.particles.length;
  let nconst = system.constraints.length;
  
  // DIBUJAR SOLO LÍNEAS (sin superficie rellena)
  noFill(); // CRÍTICO: Sin relleno para evitar superficie negra
  stroke(200, 200, 255); // Líneas azul claro
  strokeWeight(1);
  beginShape(LINES);
  for (let i = 0; i < nconst; i++) {
    let c = system.constraints[i];
    let p1 = c.particles[0].location;
    let p2 = c.particles[1].location;
    vertex(scale_px * p1.x, -scale_px * p1.y, scale_px * p1.z);
    vertex(scale_px * p2.x, -scale_px * p2.y, scale_px * p2.z);
  }
  endShape();
  
  // DIBUJAR PARTÍCULAS como esferas negras
  fill(0); // Negro
  noStroke();
  let size = scale_px * sphere_size_tela;
  
  for (let i = 0; i < npart; i++) {
    let p = system.particles[i];
    push();
    translate(scale_px * p.location.x,
              -scale_px * p.location.y,
              scale_px * p.location.z);
    sphere(size, 6, 6); // Esferas negras con detalle moderado
    pop();
  }
  
  // DIBUJAR ESFERA DE COLISIÓN
  for (let i = 0; i < system.collisionObjects.length; i++) {
    system.collisionObjects[i].display(scale_px);
  }
}

// ============================================
// MOVIMIENTO CONTINUO DE LA ESFERA (llamado en draw)
// ============================================
function moveSphereFromInput() {
  // Mover esfera basándose en teclas presionadas (continuo)
  if (keysPressed.up) {
    collisionSphere.center.y += sphere_velocity;
  }
  if (keysPressed.down) {
    collisionSphere.center.y -= sphere_velocity;
  }
  if (keysPressed.left) {
    collisionSphere.center.x -= sphere_velocity;
  }
  if (keysPressed.right) {
    collisionSphere.center.x += sphere_velocity;
  }
  if (keysPressed.forward) {
    collisionSphere.center.z -= sphere_velocity;
  }
  if (keysPressed.backward) {
    collisionSphere.center.z += sphere_velocity;
  }
}

// ============================================
// EVENTOS DE TECLADO
// ============================================
function keyPressed() {
  // ===== CONTROLES DE LA ESFERA (estilo videojuego) =====
  if (keyCode === UP_ARROW) {
    keysPressed.up = true;
  } else if (keyCode === DOWN_ARROW) {
    keysPressed.down = true;
  }
  
  if (keyCode === LEFT_ARROW) {
    keysPressed.left = true;
  } else if (keyCode === RIGHT_ARROW) {
    keysPressed.right = true;
  }
  
  if (key === 'U' || key === 'u') {
    keysPressed.forward = true;
  } else if (key === 'O' || key === 'o') {
    keysPressed.backward = true;
  }
  
  // ===== TOGGLES DE RESTRICCIONES =====
  // Reiniciar simulación con/sin bending
  if (key === 'B' || key === 'b') {
    use_bending = !use_bending;
    console.log("Bending constraints: " + (use_bending ? "ON" : "OFF"));
    recrearTela();
  }
  
  // Reiniciar simulación con/sin shear
  if (key === 'H' || key === 'h') {
    use_shear = !use_shear;
    console.log("Shear constraints: " + (use_shear ? "ON" : "OFF"));
    recrearTela();
  }
  
  // ===== CONTROLES DE VIENTO =====
  // Viento - Eje Y (vertical)
  if (key === 'S' || key === 's') {
    vel_viento.y += 0.1; // Incremento de 10 décimas
  } else if (key === 'X' || key === 'x') {
    vel_viento.y -= 0.1;
  }
  
  // Viento - Eje Z (profundidad)
  if (key === 'D' || key === 'd') {
    vel_viento.z += 0.1; // Incremento de 10 décimas
  } else if (key === 'A' || key === 'a') {
    vel_viento.z -= 0.1;
  }
  
  // Viento - Eje X (horizontal)
  if (key === 'C' || key === 'c') {
    vel_viento.x += 0.1; // Incremento de 10 décimas
  } else if (key === 'Z' || key === 'z') {
    vel_viento.x -= 0.1;
  }
}

function keyReleased() {
  // Liberar teclas de movimiento de la esfera
  if (keyCode === UP_ARROW) {
    keysPressed.up = false;
  } else if (keyCode === DOWN_ARROW) {
    keysPressed.down = false;
  }
  
  if (keyCode === LEFT_ARROW) {
    keysPressed.left = false;
  } else if (keyCode === RIGHT_ARROW) {
    keysPressed.right = false;
  }
  
  if (key === 'U' || key === 'u') {
    keysPressed.forward = false;
  } else if (key === 'O' || key === 'o') {
    keysPressed.backward = false;
  }
}

function mousePressed() {
  // Puede agregar funcionalidad aquí si lo desea
}

// ============================================
// FUNCIÓN AUXILIAR PARA RECREAR LA TELA
// ============================================
function recrearTela() {
  // Recrear la tela
  system = crea_tela(alto_tela, ancho_tela, densidad_tela,
                    n_alto_tela, n_ancho_tela, stiffness,
                    sphere_size_tela);
  
  // Añadir restricciones opcionales
  if (use_bending) {
    add_bending_constraints(system, n_alto_tela, n_ancho_tela, bending_stiffness);
  }
  if (use_shear) {
    add_shear_constraints(system, n_alto_tela, n_ancho_tela, shear_stiffness);
  }
  
  // Re-añadir esfera de colisión
  system.add_collision_object(collisionSphere);
  
  system.set_n_iters(5);
}

