// ============================================
// VARIABLES GLOBALES
// ============================================
let scale_px = 200;  // Reducido para mejor escala visual
let debug = false;
let system;
let dt = 0.016;  // ~60 FPS
let vel_viento;

// Variables para colisiones
let groundPlane; // Plataforma (plano)
let fallingSphere; // Esfera que cae sobre el cubo
let sphere_drop_height = 4.5; // Altura desde donde cae la esfera (configurable) - 3m más arriba

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

// Variables para el cubo deformable
let use_cube_mode = true; // false = tela, true = cubo ← CAMBIAR A true PARA VER EL CUBO
let cube_resolution = 3; // Resolución del cubo (configurable desde UI)

// Variables de debug - Control individual de cada fuerza
let debug_mode = false; // true = sin esfera, solo cubo en reposo
let use_sphere = true; // No se usa actualmente
let use_anchors = true; // H: Controlar anclas de la base (mantiene cubo en posición XZ)
let use_damping = true; // D: Controlar damping de Müller
let use_plane_collision = true; // F: Controlar colisión con plano (Floor)
let use_sphere_collision = true; // E: Controlar colisión con esfera

// ============================================
// SETUP
// ============================================
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  vel_viento = createVector(0, 0, 0);
  sphere_size_tela = ancho_tela / n_ancho_tela * 0.4;
  
  if (use_cube_mode) {
    // MODO CUBO DEFORMABLE
    createCubeMode();
  } else {
    // MODO TELA (original)
    createClothMode();
  }
                    
  system.set_n_iters(5); // Podemos permitirnos más iteraciones ahora
  
  // CONFIGURAR LISTENER DEL BOTÓN
  setupButtonListeners();
}

// ============================================
// CONFIGURAR EVENT LISTENERS
// ============================================
function setupButtonListeners() {
  // Botón para soltar la bola
  let dropButton = document.getElementById('dropButton');
  if (dropButton) {
    dropButton.addEventListener('click', function() {
      console.log("🔴 CLICK DETECTADO en botón soltar bola");
      dropSphere();
    });
    console.log("✓ Listener del botón soltar bola configurado");
  } else {
    console.log("⚠️ Botón dropButton no encontrado");
  }
  
  // Botón para recrear el cubo con nueva resolución
  let recreateCubeButton = document.getElementById('recreateCubeButton');
  if (recreateCubeButton) {
    recreateCubeButton.addEventListener('click', function() {
      console.log("🧊 CLICK DETECTADO en botón recrear cubo");
      recreateCubeWithNewResolution();
    });
    console.log("✓ Listener del botón recrear cubo configurado");
  } else {
    console.log("⚠️ Botón recreateCubeButton no encontrado");
  }
}

// ============================================
// CREAR MODO TELA
// ============================================
function createClothMode() {
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
  
  // CREAR PLATAFORMA (PLANO)
  let plane_point = createVector(0, 0, 0); // Punto en el plano (Y = 0)
  let plane_normal = createVector(0, 1, 0); // Normal hacia arriba
  groundPlane = new PlaneCollision(plane_point, plane_normal);
  system.add_collision_object(groundPlane);
  
  console.log("🟦 MODO TELA - Plataforma creada en Y = 0");
}

// ============================================
// CREAR MODO CUBO DEFORMABLE
// ============================================
function createCubeMode() {
  // Crear sistema PBD vacío
  system = new PBDSystem(0, 1.0);
  
  // GENERAR CUBO SOFT-BODY con resolución configurable
  let cube_size = 0.8; // Tamaño: 0.8 metros
  // cube_resolution es variable global, se lee del selector
  let cube_mass = 0.5; // ✅ AUMENTADO: 0.1 → 0.5 kg (más peso = más resistencia)
  let cube_stiffness = 0.98; // ✅ AUMENTADO: 0.8 → 0.98 (mucho más rígido)
  
  // POSICIONAR CUBO CON LA BASE EN EL PLANO (Y = 0)
  // Centro en Y = cube_size/2 para que la base esté en Y = 0
  let cube_center = createVector(0.0, cube_size / 2, 0.0);
  
  console.log("========================================");
  console.log("🟥 GENERANDO CUBO DEFORMABLE");
  console.log("========================================");
  
  let softCube = createSoftBodyCube(
    cube_center,
    cube_size,
    cube_resolution,
    cube_mass,
    cube_stiffness
  );
  
  // AÑADIR PARTÍCULAS AL SISTEMA
  for (let i = 0; i < softCube.particles.length; i++) {
    system.particles.push(softCube.particles[i]);
  }
  
  // AÑADIR CONSTRAINTS AL SISTEMA
  for (let i = 0; i < softCube.constraints.length; i++) {
    system.add_constraint(softCube.constraints[i]);
  }
  
  // ANCLAR LA BASE DEL CUBO AL PLANO (usando AnchorConstraints) - si está activado
  let anchorsCount = 0;
  
  if (use_anchors) {
    let anchorStiffness = 0.99; // ✅ AUMENTADO: 0.95 → 0.99 (anclas casi rígidas)
    
    for (let i = 0; i < cube_resolution; i++) {
      for (let k = 0; k < cube_resolution; k++) {
        // Índice de partículas en la capa inferior (j = 0)
        let idx = i * cube_resolution * cube_resolution + 0 * cube_resolution + k;
        let particle = system.particles[idx];
        
        // CRÍTICO: Asegurar que last_location también esté sincronizada
        particle.last_location = particle.location.copy();
        
        // Crear ancla en la posición inicial de la partícula
        let anchor_pos = particle.location.copy();
        let anchor = new AnchorConstraint(particle, anchor_pos, anchorStiffness);
        system.add_constraint(anchor);
        anchorsCount++;
      }
    }
    console.log(`🔒 ${anchorsCount} anclas creadas (base del cubo fijada al plano, stiffness=${anchorStiffness})`);
  } else {
    console.log(`🔓 Anclas desactivadas - cubo puede moverse libremente`);
  }
  
  // CREAR PLATAFORMA (PLANO)
  let plane_point = createVector(0, 0, 0); // Punto en el plano (Y = 0)
  let plane_normal = createVector(0, 1, 0); // Normal hacia arriba
  groundPlane = new PlaneCollision(plane_point, plane_normal);
  system.add_collision_object(groundPlane);
  
  // CREAR ESFERA QUE CAE (dinámica) - solo si no estamos en modo debug
  if (!debug_mode) {
    let sphere_radius = 0.25; // 25 cm de radio (aumentado para mayor deformación)
    let sphere_start_pos = createVector(0.0, sphere_drop_height, 0.0);
    fallingSphere = new SphereCollision(sphere_start_pos, sphere_radius, true); // true = dinámica
    system.add_collision_object(fallingSphere);
    console.log(`🔴 Esfera creada en altura ${sphere_drop_height}m`);
  } else {
    console.log(`🔵 MODO DEBUG: Sin esfera, sin gravedad - Solo cubo en reposo`);
  }
  
  console.log(`🟥 MODO CUBO - Posado y anclado al plano, listo para simular`);
  
  // Verificar estado de la esfera
  if (fallingSphere) {
    console.log(`🔴 Estado esfera: isDynamic=${fallingSphere.isDynamic}, isReleased=${fallingSphere.isReleased}`);
    console.log(`📍 Posición esfera: (${fallingSphere.center.x}, ${fallingSphere.center.y}, ${fallingSphere.center.z})`);
  }
  
  // DIAGNÓSTICO: Imprimir primeras 10 constraints para verificar rest lengths
  diagnosticarConstraints();
}

// ============================================
// DIAGNÓSTICO DE CONSTRAINTS
// ============================================
function diagnosticarConstraints() {
  console.log("\n" + "=".repeat(50));
  console.log("🔍 DIAGNÓSTICO DE CONSTRAINTS (primeras 10)");
  console.log("=".repeat(50));
  
  let limit = Math.min(10, system.constraints.length);
  for (let i = 0; i < limit; i++) {
    let c = system.constraints[i];
    
    if (c.particles.length >= 2) {
      let p1 = c.particles[0];
      let p2 = c.particles[1];
      let dist_actual = p5.Vector.dist(p1.location, p2.location);
      let rest_length = c.d || "N/A";
      let diff = rest_length !== "N/A" ? abs(dist_actual - rest_length) : 0;
      
      console.log(`Constraint ${i}:`);
      console.log(`  Tipo: ${c.constructor.name}`);
      console.log(`  Rest length: ${rest_length}`);
      console.log(`  Dist actual: ${dist_actual.toFixed(6)}`);
      console.log(`  Diferencia: ${diff.toFixed(6)} ${diff > 0.0001 ? "⚠️ PROBLEMA" : "✓"}`);
    } else if (c.particles.length === 1) {
      console.log(`Constraint ${i}: ${c.constructor.name} (1 partícula - ancla)`);
    }
  }
  console.log("=".repeat(50) + "\n");
}

// ============================================
// FUNCIÓN PARA SOLTAR LA BOLA
// ============================================
function dropSphere() {
  console.log("🔴 Botón presionado - dropSphere() llamada");
  
  if (!fallingSphere) {
    console.log("⚠️ ERROR: fallingSphere no existe");
    return;
  }
  
  console.log("✓ fallingSphere existe, isReleased =", fallingSphere.isReleased);
  
  // Leer altura del input HTML
  let heightInput = document.getElementById('dropHeight');
  if (heightInput) {
    sphere_drop_height = parseFloat(heightInput.value) || 1.5;
  }
  
  console.log(`📏 Altura configurada: ${sphere_drop_height}m`);
  
  // Reset posición a la altura especificada
  let new_pos = createVector(0.0, sphere_drop_height, 0.0);
  fallingSphere.reset(new_pos);
  
  console.log("📍 Posición reseteada a", new_pos);
  
  // SOLTAR la esfera (activa la física)
  fallingSphere.release();
  
  console.log(`🔴 Esfera soltada - isReleased =`, fallingSphere.isReleased);
}

// Hacer funciones accesibles globalmente para onclick
window.dropSphere = dropSphere;

// ============================================
// RECREAR CUBO CON NUEVA RESOLUCIÓN
// ============================================
function recreateCubeWithNewResolution() {
  // Leer resolución del selector HTML
  let resolutionSelect = document.getElementById('cubeResolution');
  if (resolutionSelect) {
    cube_resolution = parseInt(resolutionSelect.value) || 3;
  }
  
  console.log("=".repeat(50));
  console.log(`🧊 RECREANDO CUBO CON RESOLUCIÓN ${cube_resolution}x${cube_resolution}x${cube_resolution}`);
  console.log("=".repeat(50));
  
  // Recrear el cubo
  if (use_cube_mode) {
    createCubeMode();
    system.set_n_iters(10);
  }
}

window.recreateCubeWithNewResolution = recreateCubeWithNewResolution;

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
  
  // Actualizar esfera que cae (si existe, es dinámica y no estamos en modo debug)
  // La esfera SÍ experimenta gravedad SIEMPRE (cuando es soltada)
  if (fallingSphere && fallingSphere.isDynamic && !debug_mode && use_sphere) {
    fallingSphere.update(dt, createVector(0.0, -9.81, 0.0));
  }

  // NO aplicar gravedad al cubo - Eliminado completamente
  // El cubo se mantiene en posición gracias a las anclas (tecla H)
  
  aplica_viento();

  // Ejecutar solver PBD con fuerzas controlables individualmente
  system.run(dt, use_damping, use_plane_collision, use_sphere_collision);  

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
  
  // ACTUALIZAR ESTADO DE FUERZAS
  updateForceIndicators();
}

// ============================================
// ACTUALIZAR INDICADORES DE FUERZAS
// ============================================
function updateForceIndicators() {
  // Actualizar indicadores de fuerzas en el panel
  let dampingEl = document.getElementById('force-damping');
  let planeEl = document.getElementById('force-plane');
  let sphereEl = document.getElementById('force-sphere');
  let anchorsEl = document.getElementById('force-anchors');
  
  if (dampingEl) {
    dampingEl.textContent = use_damping ? 'ON' : 'OFF';
    dampingEl.style.color = use_damping ? '#88ff88' : '#ff8888';
  }
  
  if (planeEl) {
    planeEl.textContent = use_plane_collision ? 'ON' : 'OFF';
    planeEl.style.color = use_plane_collision ? '#88ff88' : '#ff8888';
  }
  
  if (sphereEl) {
    sphereEl.textContent = use_sphere_collision ? 'ON' : 'OFF';
    sphereEl.style.color = use_sphere_collision ? '#88ff88' : '#ff8888';
  }
  
  if (anchorsEl) {
    anchorsEl.textContent = use_anchors ? 'ON' : 'OFF';
    anchorsEl.style.color = use_anchors ? '#88ff88' : '#ff8888';
  }
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
    
    // Solo dibujar si la constraint tiene al menos 2 partículas
    // (AnchorConstraint solo tiene 1, no se dibuja)
    if (c.particles.length >= 2) {
      let p1 = c.particles[0].location;
      let p2 = c.particles[1].location;
      vertex(scale_px * p1.x, -scale_px * p1.y, scale_px * p1.z);
      vertex(scale_px * p2.x, -scale_px * p2.y, scale_px * p2.z);
    }
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
  
  // DIBUJAR PLATAFORMA Y OTROS OBJETOS DE COLISIÓN
  for (let i = 0; i < system.collisionObjects.length; i++) {
    system.collisionObjects[i].display(scale_px);
  }
}

// ============================================
// EVENTOS DE TECLADO
// ============================================
function keyPressed() {
  
  // ===== SOLTAR BOLA CON TECLA ESPACIO (ALTERNATIVA) =====
  if (key === ' ' || keyCode === 32) {
    console.log("🔴 TECLA ESPACIO - Soltando bola");
    dropSphere();
    return;
  }
  
  // ===== MODO DEBUG (sin esfera) =====
  if (key === 'P' || key === 'p') {
    debug_mode = !debug_mode;
    console.log("=".repeat(40));
    console.log("MODO DEBUG:", debug_mode ? "🔵 ACTIVADO (sin esfera)" : "🟢 DESACTIVADO");
    console.log("=".repeat(40));
    
    // Recrear cubo para aplicar cambios
    if (use_cube_mode) {
      createCubeMode();
      system.set_n_iters(5);
    }
  }
  
  // ===== TOGGLE DAMPING DE MÜLLER =====
  if (keyCode === 68) { // Tecla D
    use_damping = !use_damping;
    console.log("💨 Damping de Müller:", use_damping ? "ON" : "OFF");
    mostrarEstadoFuerzas();
  }
  
  // ===== TOGGLE COLISIÓN CON PLANO =====
  if (key === 'F' || key === 'f') {
    use_plane_collision = !use_plane_collision;
    console.log("🟩 Colisión con Plano:", use_plane_collision ? "ON" : "OFF");
    mostrarEstadoFuerzas();
  }
  
  // ===== TOGGLE COLISIÓN CON ESFERA =====
  if (key === 'E' || key === 'e') {
    use_sphere_collision = !use_sphere_collision;
    console.log("🔴 Colisión con Esfera:", use_sphere_collision ? "ON" : "OFF");
    mostrarEstadoFuerzas();
  }
  
  // ===== CAMBIAR MODO (TELA / CUBO) =====
  if (key === 'M' || key === 'm') {
    use_cube_mode = !use_cube_mode;
    console.log("=".repeat(40));
    console.log("CAMBIANDO MODO:", use_cube_mode ? "🟥 CUBO" : "🟦 TELA");
    console.log("=".repeat(40));
    
    // Recrear la simulación en el nuevo modo
    if (use_cube_mode) {
      createCubeMode();
    } else {
      createClothMode();
    }
    system.set_n_iters(5);
  }
  
  // ===== TOGGLES DE RESTRICCIONES =====
  // Reiniciar simulación con/sin bending
  if (key === 'B' || key === 'b') {
    use_bending = !use_bending;
    console.log("Bending constraints: " + (use_bending ? "ON" : "OFF"));
    recrearTela();
  }
  
  // ===== TOGGLE ANCLAS (Tecla H) =====
  if (key === 'H' || key === 'h') {
    use_anchors = !use_anchors;
    console.log("🔒 Anclas:", use_anchors ? "ON (base fijada)" : "OFF (cubo libre)");
    // Recrear cubo
    if (use_cube_mode) {
      createCubeMode();
      system.set_n_iters(5);
    }
    mostrarEstadoFuerzas();
  }
  
  // ===== MOSTRAR ESTADO DE FUERZAS (Tecla I para Info) =====
  if (key === 'I' || key === 'i') {
    mostrarEstadoFuerzas();
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

function mousePressed() {
  // Puede agregar funcionalidad aquí si lo desea
}

// ============================================
// MOSTRAR ESTADO DE TODAS LAS FUERZAS
// ============================================
function mostrarEstadoFuerzas() {
  console.log("\n" + "═".repeat(40));
  console.log("📊 ESTADO ACTUAL DE FUERZAS:");
  console.log("═".repeat(40));
  console.log(`  💨 Damping (Müller):  ${use_damping ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🟩 Colisión Plano:    ${use_plane_collision ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🔴 Colisión Esfera:   ${use_sphere_collision ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🔒 Anclas (XZ):       ${use_anchors ? "ON ✓ (base fija)" : "OFF ✗ (cubo libre)"}`);
  console.log("═".repeat(40) + "\n");
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
  
  // Re-añadir plataforma
  system.add_collision_object(groundPlane);
  
  system.set_n_iters(5);
}

