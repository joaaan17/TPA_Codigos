function createPBDSphereParticle(particleMass) {
  let radius = sphere_radius_default;
  let sphere_mass = particleMass * sphere_mass_multiplier;
  let start_pos = createVector(0.0, sphere_drop_height, 0.0);
  let vel = createVector(0, 0, 0);
  let sphere = new Particle(start_pos, vel, sphere_mass, {
    radius: radius,
    isSphere: true,
    isDynamic: true,
    isReleased: false,
    displaySize: radius
  });
  return sphere;
}
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
let sphereParticle = null; // Partícula-esfera integrada en el solver
let fallingSphere = null; // Esfera clásica (modo legacy)
let sphere_radius_default = 0.22;
let sphere_mass_multiplier = 40.0; // Mayor masa relativa para impactos más fuertes
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
let use_sphere_particle = true; // nuevo botón para activar/desactivar comportamiento PBD de la bola
let use_shape_matching = true; // K: Controlar Shape Matching (Müller 2005)
let use_volume_constraints = true; // Control del método volumétrico
let deformationMode = 'both'; // 'shape', 'volume', 'both', 'custom'
let debug_rest_pose = false; // Modo especial para verificar estado de reposo
const rest_pose_tolerance = 1e-5;
const rest_pose_log_interval = 45;
let last_rest_pose_log_frame = -Infinity;

// ============================================
// SETUP
// ============================================
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  vel_viento = createVector(0, 0, 0);
  sphere_size_tela = ancho_tela / n_ancho_tela * 0.4;
  applyDeformationModeSettings(false);
  
  if (use_cube_mode) {
    // MODO CUBO DEFORMABLE
    createCubeMode();
  } else {
    // MODO TELA (original)
    createClothMode();
  }
                    
  system.set_n_iters(20); // ✅ 20 iteraciones (suficiente con Shape Match antes de colisiones)
  
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
  
  let toggleSphereModeButton = document.getElementById('toggleSphereModeButton');
  if (toggleSphereModeButton) {
    toggleSphereModeButton.addEventListener('click', function() {
      use_sphere_particle = !use_sphere_particle;
      console.log(`🎛️ Modo bola PBD: ${use_sphere_particle ? "ON (corrección simétrica)" : "OFF (modo clásico)"}`);
      recreateCubeWithNewResolution();
    });
  }
  
  // Selector para elegir el método de deformación
  let deformationSelect = document.getElementById('deformationMode');
  if (deformationSelect) {
    deformationSelect.value = deformationMode;
    deformationSelect.addEventListener('change', function() {
      let selected = this.value;
      
      if (selected === 'custom') {
        deformationMode = 'custom';
        console.log("⚙️ Modo de deformación: PERSONALIZADO (controlado por teclas).");
        updateDeformationModeLabel();
        return;
      }
      
      deformationMode = selected;
      applyDeformationModeSettings(true);
      console.log(`🎛️ Modo selecionado: ${getReadableDeformationMode()}. Recreando cubo...`);
      recreateCubeWithNewResolution();
    });
  } else {
    console.log("⚠️ Selector deformationMode no encontrado");
  }
}

function applyDeformationModeSettings(logChanges = true) {
  if (deformationMode === 'custom') {
    updateDeformationModeLabel();
    return;
  }
  
  let prevShape = use_shape_matching;
  let prevVolume = use_volume_constraints;
  
  if (deformationMode === 'shape') {
    use_shape_matching = true;
    use_volume_constraints = false;
  } else if (deformationMode === 'volume') {
    use_shape_matching = false;
    use_volume_constraints = true;
  } else {
    // 'both'
    use_shape_matching = true;
    use_volume_constraints = true;
  }
  
  if (logChanges && (prevShape !== use_shape_matching || prevVolume !== use_volume_constraints)) {
    console.log(`🎚️ Aplicando modo de deformación: ${getReadableDeformationMode()}`);
  }
  
  updateForceIndicators();
  updateDeformationModeLabel();
}

function markDeformationModeAsCustom(reason) {
  deformationMode = 'custom';
  let deformationSelect = document.getElementById('deformationMode');
  if (deformationSelect) {
    deformationSelect.value = 'custom';
  }
  if (reason) {
    console.log(reason);
  }
  updateDeformationModeLabel();
}

function getReadableDeformationMode() {
  switch (deformationMode) {
    case 'shape':
      return 'Shape Matching';
    case 'volume':
      return 'Volumétrico';
    case 'both':
      return 'Ambos';
    default:
      return 'Personalizado';
  }
}

function updateDeformationModeLabel() {
  let modeEl = document.getElementById('force-mode');
  if (!modeEl) return;
  modeEl.textContent = getReadableDeformationMode();
  modeEl.style.color = deformationMode === 'custom' ? '#ffcc66' : '#ffffff';
}

// ============================================
// CREAR MODO TELA
// ============================================
function createClothMode() {
  sphereParticle = null;
  fallingSphere = null;
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
  
  if (use_anchors) {
    let anchorStiffness = 0.99;
    for (let i = 0; i < n_ancho_tela; i++) {
      let idx = i * n_alto_tela; // fila inferior (j = 0)
      let particle = system.particles[idx];
      particle.last_location = particle.location.copy();
      let anchor = new AnchorConstraint(particle, particle.location.copy(), anchorStiffness);
      system.add_constraint(anchor);
    }
    console.log(`🔒 Tela anclada al plano con ${n_ancho_tela} anclas (stiffness=${anchorStiffness})`);
  } else {
    console.log("🔓 Tela sin anclas (base libre)");
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
  let cube_mass = 2.0; // Masa por partícula
  let cube_stiffness = 0.8; // Menos rígido para permitir más deformación
  
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
    cube_stiffness,
    { useVolumeConstraints: use_volume_constraints }
  );
  
  // AÑADIR PARTÍCULAS AL SISTEMA
  for (let i = 0; i < softCube.particles.length; i++) {
    system.particles.push(softCube.particles[i]);
  }
  
  // AÑADIR CONSTRAINTS AL SISTEMA
  for (let i = 0; i < softCube.constraints.length; i++) {
    system.add_constraint(softCube.constraints[i]);
  }
  
  // ✅ CRÍTICO: CREAR SHAPE MATCHING ANTES de anclas
  // Capturar posiciones de reposo del cubo SIN deformaciones
  if (use_shape_matching) {
    let shapeMatchingStiffness = 0.3; // ✅ AUMENTADO: 0.05 → 0.3 (más firme, seguro ahora)
    let shapeMatching = new ShapeMatching(softCube.particles, shapeMatchingStiffness);
    system.set_shape_matching(shapeMatching);
    console.log(`✨ Shape Matching configurado (stiffness=${shapeMatchingStiffness})`);
  } else {
    system.set_shape_matching(null);
    console.log("⚪ Shape Matching desactivado para este cubo.");
  }
  
  // ANCLAR LA BASE DEL CUBO AL PLANO (DESPUÉS de Shape Matching)
  let anchorsCount = 0;
  
  if (use_anchors) {
    let anchorStiffness = 0.99; // Anclas casi rígidas
    
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
  
  sphereParticle = null;
  fallingSphere = null;
  if (!debug_mode && use_sphere) {
    if (use_sphere_particle) {
      sphereParticle = createPBDSphereParticle(cube_mass);
      system.particles.push(sphereParticle);
      sphereParticle.debugId = system.particles.length - 1;
      console.log(`🔴 Esfera PBD creada (radio=${sphereParticle.radius.toFixed(2)}m, masa=${sphereParticle.masa.toFixed(2)}kg)`);
      
      for (let i = 0; i < softCube.particles.length; i++) {
        system.add_constraint(new SphereContactConstraint(softCube.particles[i], sphereParticle));
      }
    } else {
      let sphere_radius = sphere_radius_default;
      let sphere_start_pos = createVector(0.0, sphere_drop_height, 0.0);
      fallingSphere = new LegacySphereCollision(sphere_start_pos, sphere_radius, true);
      system.add_collision_object(fallingSphere);
      console.log("🔴 Esfera rígida clásica creada (modo legacy).");
    }
  } else {
    console.log(`🔵 MODO DEBUG: Sin esfera - Solo cubo en reposo`);
  }
  
  console.log(`🟥 MODO CUBO - Posado y anclado al plano, listo para simular`);
  console.log(`🎛️ Deformación activa: ${getReadableDeformationMode()} (Shape=${use_shape_matching ? "ON" : "OFF"}, Volume=${use_volume_constraints ? "ON" : "OFF"})`);
  
  if (sphereParticle) {
    console.log(`🔴 Estado esfera: isReleased=${sphereParticle.isReleased}, masa=${sphereParticle.masa.toFixed(2)}kg`);
    console.log(`📍 Posición esfera: (${sphereParticle.location.x.toFixed(3)}, ${sphereParticle.location.y.toFixed(3)}, ${sphereParticle.location.z.toFixed(3)})`);
  } else if (fallingSphere) {
    console.log(`🔴 Esfera legacy lista. isReleased=${fallingSphere.isReleased}`);
    console.log(`📍 Posición esfera: (${fallingSphere.center.x.toFixed(3)}, ${fallingSphere.center.y.toFixed(3)}, ${fallingSphere.center.z.toFixed(3)})`);
  }
  
  // DIAGNÓSTICO: Imprimir primeras 10 constraints para verificar rest lengths
  diagnosticarConstraints();
  updateForceIndicators();
  updateDeformationModeLabel();
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
  
  // Leer altura del input HTML
  let heightInput = document.getElementById('dropHeight');
  if (heightInput) {
    sphere_drop_height = parseFloat(heightInput.value) || 4.5;
  }
  
  console.log(`📏 Altura configurada: ${sphere_drop_height}m`);
  
  let new_pos = createVector(0.0, sphere_drop_height, 0.0);
  
  if (use_sphere_particle) {
    if (!sphereParticle) {
      console.log("⚠️ ERROR: sphereParticle no existe");
      return;
    }
    sphereParticle.location = new_pos.copy();
    sphereParticle.last_location = new_pos.copy();
    sphereParticle.velocity.set(0, 0, 0);
    sphereParticle.force.set(0, 0, 0);
    sphereParticle.isReleased = true;
    sphereParticle.isDynamic = true;
    console.log("📍 Esfera PBD lista en", new_pos);
  } else {
    if (!fallingSphere) {
      console.log("⚠️ ERROR: esfera legacy no existe");
      return;
    }
    fallingSphere.reset(new_pos);
    fallingSphere.release();
    console.log("📍 Esfera legacy lista en", new_pos);
  }
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
    system.set_n_iters(20);
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
    let part = system.particles[i];
    if (part.isSphere) continue;
    
    let x = (0.5 + random(0.5)) * vel_viento.x * area;
    let y = (0.5 + random(0.5)) * vel_viento.y * area;
    let z = (0.5 + random(0.5)) * vel_viento.z * area;
    let fv = createVector(x, y, z); 
    part.force.add(fv);
  }
}

// ============================================
// DRAW
// ============================================
function draw() {
  background(20, 20, 55);
  
  // Control de cámara orbital (usa el mouse para rotar)
  orbitControl();
  
  // NO aplicar gravedad al cubo - Eliminado completamente
  // El cubo se mantiene en posición gracias a las anclas (tecla H)

  if (!debug_rest_pose) {
  aplica_viento();
  }
  
  if (use_sphere_particle && sphereParticle && sphereParticle.isSphere && sphereParticle.isDynamic && sphereParticle.isReleased && !debug_mode && !debug_rest_pose) {
    sphereParticle.force.add(createVector(0.0, -9.81 * sphereParticle.masa, 0.0));
  } else if (!use_sphere_particle && fallingSphere && fallingSphere.isDynamic && !debug_mode && !debug_rest_pose) {
    fallingSphere.update(dt, createVector(0.0, -9.81, 0.0));
  }

  // Ejecutar solver PBD con fuerzas controlables individualmente
  let applyDamping = debug_rest_pose ? false : use_damping;
  let applyPlaneCollision = debug_rest_pose ? false : use_plane_collision;
  let applySphereCollision = debug_rest_pose ? false : use_sphere_collision;
  let applyShapeMatching = debug_rest_pose ? false : use_shape_matching;
  
  system.run(dt, applyDamping, applyPlaneCollision, applySphereCollision, applyShapeMatching);
  
  if (debug_rest_pose) {
    runRestPoseDiagnostics();
  }

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
  let shapeMatchEl = document.getElementById('force-shapematch');
  let planeEl = document.getElementById('force-plane');
  let sphereEl = document.getElementById('force-sphere');
  let anchorsEl = document.getElementById('force-anchors');
  let volumeEl = document.getElementById('force-volume');
  let modeEl = document.getElementById('force-mode');
  let sphereModeEl = document.getElementById('force-sphere-mode');
  
  if (dampingEl) {
    dampingEl.textContent = use_damping ? 'ON' : 'OFF';
    dampingEl.style.color = use_damping ? '#88ff88' : '#ff8888';
  }
  
  if (shapeMatchEl) {
    shapeMatchEl.textContent = use_shape_matching ? 'ON' : 'OFF';
    shapeMatchEl.style.color = use_shape_matching ? '#88ff88' : '#ff8888';
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
  
  if (volumeEl) {
    volumeEl.textContent = use_volume_constraints ? 'ON' : 'OFF';
    volumeEl.style.color = use_volume_constraints ? '#88ff88' : '#ff8888';
  }
  
  if (modeEl) {
    modeEl.textContent = getReadableDeformationMode();
    modeEl.style.color = deformationMode === 'custom' ? '#ffcc66' : '#ffffff';
  }
  
  if (sphereModeEl) {
    sphereModeEl.textContent = use_sphere_particle ? 'PBD' : 'LEGACY';
    sphereModeEl.style.color = use_sphere_particle ? '#88ff88' : '#ffcc66';
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
    if (c instanceof SphereContactConstraint) {
      continue; // no dibujar las restricciones cubo-esfera
    }
    
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
  
  if (use_sphere_particle && sphereParticle) {
    push();
    translate(scale_px * sphereParticle.location.x,
              -scale_px * sphereParticle.location.y,
              scale_px * sphereParticle.location.z);
    fill(255, 150, 50, 220);
    noStroke();
    sphere(scale_px * sphereParticle.radius, 20, 20);
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
      system.set_n_iters(20);
    }
  }
  
  // ===== MODO DEBUG REST POSE =====
  if (key === 'R' || key === 'r') {
    toggleRestPoseMode();
  }
  
  // ===== TOGGLE SHAPE MATCHING (Tecla K) =====
  if (key === 'K' || key === 'k') {
    use_shape_matching = !use_shape_matching;
    console.log("✨ Shape Matching:", use_shape_matching ? "ON (mantiene forma)" : "OFF");
    markDeformationModeAsCustom("⚙️ Shape Matching modificado manualmente (modo personalizado).");
    updateForceIndicators();
    mostrarEstadoFuerzas();
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
    system.set_n_iters(20);
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
      system.set_n_iters(20);
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
  console.log(`  ✨ Shape Matching:    ${use_shape_matching ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🧱 Volume Constraints:${use_volume_constraints ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🟩 Colisión Plano:    ${use_plane_collision ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🔴 Colisión Esfera:   ${use_sphere_collision ? "ON ✓" : "OFF ✗"}`);
  console.log(`  🔒 Anclas (XZ):       ${use_anchors ? "ON ✓ (base fija)" : "OFF ✗ (cubo libre)"}`);
  console.log(`  🎛️ Modo Deformación:  ${getReadableDeformationMode()}`);
  console.log(`  ⚽ Modo Bola:         ${use_sphere_particle ? "PBD (simétrica)" : "LEGACY (sólo cubo)"}`);
  console.log(`  💤 Debug Rest Pose:   ${debug_rest_pose ? "ON ✓" : "OFF ✗"}`);
  console.log("═".repeat(40) + "\n");
}

// ============================================
// DEBUG REST POSE (sin fuerzas externas)
// ============================================
function toggleRestPoseMode() {
  debug_rest_pose = !debug_rest_pose;
  last_rest_pose_log_frame = -Infinity;
  console.log("=".repeat(50));
  console.log(debug_rest_pose ? "🛌 REST POSE MODE: ON (sin plano, sin esfera, sin viento)" :
                                "🛌 REST POSE MODE: OFF");
  console.log("=".repeat(50));
  if (debug_rest_pose) {
    console.log("Objetivo: el cubo debe quedarse completamente quieto solo con sus constraints.");
    console.log("Si detecto movimiento residual, imprimiré los primeros constraints y tetraedros.");
  }
}

function runRestPoseDiagnostics() {
  if (!system || !system.particles) return;
  
  let maxDelta = 0;
  for (let i = 0; i < system.particles.length; i++) {
    let p = system.particles[i];
    let delta = p5.Vector.sub(p.location, p.last_location).mag();
    if (delta > maxDelta) {
      maxDelta = delta;
    }
  }
  
  if (maxDelta > rest_pose_tolerance && frameCount - last_rest_pose_log_frame >= rest_pose_log_interval) {
    last_rest_pose_log_frame = frameCount;
    console.log("\n" + "🔍 REST POSE DIAGNOSTIC".padEnd(40, " "));
    console.log(`   Movimiento residual max: ${maxDelta.toExponential(3)} m`);
    logRestPoseSnapshot();
  }
}

function logRestPoseSnapshot() {
  if (!system || !system.constraints) return;
  let logged = 0;
  let limit = 10;
  console.log("   Primeras constraints:");
  for (let i = 0; i < system.constraints.length && logged < limit; i++) {
    let c = system.constraints[i];
    if (c instanceof DistanceConstraint) {
      logDistanceConstraintInfo(c, i);
      logged++;
    } else if (c instanceof VolumeConstraint) {
      logVolumeConstraintInfo(c, i);
      logged++;
    }
  }
}

function logDistanceConstraintInfo(constraint, idx) {
  let part1 = constraint.particles[0];
  let part2 = constraint.particles[1];
  let current = p5.Vector.dist(part1.location, part2.location);
  let diff = current - constraint.d;
  console.log(`     [C${idx}] Distance (${getParticleDebugId(part1)}, ${getParticleDebugId(part2)}) `
    + `rest=${constraint.d.toFixed(6)} current=${current.toFixed(6)} diff=${diff.toExponential(3)}`);
}

function logVolumeConstraintInfo(constraint, idx) {
  let parts = constraint.particles;
  let current = computeSignedTetraVolume(
    parts[0].location,
    parts[1].location,
    parts[2].location,
    parts[3].location
  );
  let diff = current - constraint.restVolume;
  console.log(`     [C${idx}] Volume (${getParticleDebugId(parts[0])}, ${getParticleDebugId(parts[1])}, `
    + `${getParticleDebugId(parts[2])}, ${getParticleDebugId(parts[3])}) `
    + `rest=${constraint.restVolume.toExponential(3)} current=${current.toExponential(3)} `
    + `C=${diff.toExponential(3)}`);
}

function getParticleDebugId(particle) {
  if (particle && particle.debugId !== null && particle.debugId !== undefined) {
    return particle.debugId;
  }
  if (!system || !system.particles) {
    return "?";
  }
  let idx = system.particles.indexOf(particle);
  return idx >= 0 ? idx : "?";
}

function computeSignedTetraVolume(p1, p2, p3, p4) {
  if (typeof tetraVolume === "function") {
    return tetraVolume(p1, p2, p3, p4);
  }
  // Fallback si la función no está disponible (no debería ocurrir)
  let v21 = p5.Vector.sub(p2, p1);
  let v31 = p5.Vector.sub(p3, p1);
  let v41 = p5.Vector.sub(p4, p1);
  return v21.dot(p5.Vector.cross(v31, v41)) / 6.0;
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
  
  system.set_n_iters(20);
}

