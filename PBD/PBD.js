// ============================================
// VARIABLES GLOBALES
// ============================================
let scale_px = 200;  // Reducido para mejor escala visual
let debug = false;
let system;
let dt = 0.016;  // ~60 FPS
let vel_viento;

// Propiedades tela (optimizadas para rendimiento)
let ancho_tela = 2.0;  // 2 metros de ancho
let alto_tela = 2.0;   // 2 metros de alto
let n_ancho_tela = 10; // Reducido para mejor rendimiento (10x10 = 100 partículas)
let n_alto_tela = 10;  // Reducido para mejor rendimiento
let densidad_tela = 0.1; // kg/m^2 Podría ser tela gruesa de algodón, 100g/m^2
let sphere_size_tela;
let stiffness = 0.98;  // Aumentado para tela más rígida

// ============================================
// SETUP
// ============================================
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Optimizaciones de rendimiento WEBGL
  smooth(); // Activar anti-aliasing
  
  vel_viento = createVector(0, 0, 0);
  sphere_size_tela = ancho_tela / n_ancho_tela * 0.4;
  
  system = crea_tela(alto_tela,
                    ancho_tela,
                    densidad_tela,
                    n_alto_tela,
                    n_ancho_tela,
                    stiffness,
                    sphere_size_tela);
                    
  system.set_n_iters(3); // Reducido a 3 iteraciones para mejor rendimiento
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
  lights();
  
  // Posicionar cámara inicial más cerca y con mejor ángulo
  camera(
    ancho_tela * scale_px * 1.5, // x - un poco a la derecha
    -alto_tela * scale_px * 0.5, // y - un poco arriba
    ancho_tela * scale_px * 2.0,  // z - hacia adelante (más cerca)
    ancho_tela * scale_px * 0.5,  // mirando al centro x
    -alto_tela * scale_px * 0.5,  // mirando al centro y
    0,                             // mirando al centro z
    0, 1, 0                        // vector "arriba"
  );
  
  // Control de cámara orbital (usa el mouse para rotar)
  orbitControl();

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
  
  document.getElementById('fps').textContent = int(frameRate());
  document.getElementById('particles').textContent = npart;
  document.getElementById('wind').textContent = 
    '(' + vel_viento.x.toFixed(3) + ', ' + 
    vel_viento.y.toFixed(3) + ', ' + 
    vel_viento.z.toFixed(3) + ')';
}

function display() {
  let npart = system.particles.length;
  let nconst = system.constraints.length;
  
  // Dibujar constraints (líneas) primero
  for (let i = 0; i < nconst; i++) {
    system.constraints[i].display(scale_px);
  }
  
  // Dibujar partículas (esferas) - optimizado con WEBGL
  for (let i = 0; i < npart; i++) {
    system.particles[i].display(scale_px);
  }
}

// ============================================
// EVENTOS DE TECLADO
// ============================================
function keyPressed() {
  // Tipo de fuegos
  if (key === '1') {
    console.log(key);
  }
  
  // Viento - Eje Y (vertical)
  if (key === 'S' || key === 's') {
    vel_viento.y += 0.001;
  } else if (key === 'X' || key === 'x') {
    vel_viento.y -= 0.001;
  }
  
  // Viento - Eje Z (profundidad)
  if (key === 'D' || key === 'd') {
    vel_viento.z += 0.001;
  } else if (key === 'A' || key === 'a') {
    vel_viento.z -= 0.001;
  }
  
  // Viento - Eje X (horizontal)
  if (key === 'C' || key === 'c') {
    vel_viento.x += 0.001;
  } else if (key === 'Z' || key === 'z') {
    vel_viento.x -= 0.001;
  }
}

function mousePressed() {
  // Puede agregar funcionalidad aquí si lo desea
}

