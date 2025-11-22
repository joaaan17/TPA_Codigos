"""
Script principal de Blender para simular tela con PBD y guardar en Shape Keys
Este script crea un panel de control y pre-simula la tela guardando cada frame como Shape Key
"""
import bpy  # type: ignore
import bmesh  # type: ignore
import mathutils  # type: ignore
import sys
import os

# Añadir la ruta del directorio actual al path de Python
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Importar módulos PBD
from Particle import Particle
from PBDSystem import PBDSystem
from Tela import crea_tela, add_bending_constraints, add_shear_constraints

# ============================================
# PROPIEDADES DEL PANEL
# ============================================
def init_properties():
    """Inicializar propiedades personalizadas de Blender"""
    scene = bpy.types.Scene
    
    # Dimensiones de la tela
    scene.pbd_cloth_width = bpy.props.FloatProperty(
        name="Ancho",
        description="Ancho de la tela en metros",
        default=2.0,
        min=0.1,
        max=10.0
    )
    
    scene.pbd_cloth_height = bpy.props.FloatProperty(
        name="Alto",
        description="Alto de la tela en metros",
        default=2.0,
        min=0.1,
        max=10.0
    )
    
    scene.pbd_cloth_n_ancho = bpy.props.IntProperty(
        name="N_Ancho",
        description="Número de partículas en dirección X",
        default=10,
        min=3,
        max=50
    )
    
    scene.pbd_cloth_n_alto = bpy.props.IntProperty(
        name="N_Alto",
        description="Número de partículas en dirección Y",
        default=10,
        min=3,
        max=50
    )
    
    # Stiffness
    scene.pbd_cloth_stiffness = bpy.props.FloatProperty(
        name="Stiffness General",
        description="Rigidez de las restricciones de distancia",
        default=0.5,
        min=0.0,
        max=1.0
    )
    
    scene.pbd_cloth_bending_stiffness = bpy.props.FloatProperty(
        name="Bending Stiffness",
        description="Rigidez de las restricciones de bending",
        default=0.1,
        min=0.0,
        max=1.0
    )
    
    scene.pbd_cloth_shear_stiffness = bpy.props.FloatProperty(
        name="Shear Stiffness",
        description="Rigidez de las restricciones de shear",
        default=0.1,
        min=0.0,
        max=1.0
    )
    
    # Restricciones
    scene.pbd_cloth_use_bending = bpy.props.BoolProperty(
        name="Usar Bending",
        description="Activar restricciones de bending",
        default=True
    )
    
    scene.pbd_cloth_use_shear = bpy.props.BoolProperty(
        name="Usar Shear",
        description="Activar restricciones de shear",
        default=True
    )
    
    # Solver
    scene.pbd_cloth_solver_iterations = bpy.props.IntProperty(
        name="Iteraciones Solver",
        description="Número de iteraciones del solver PBD",
        default=5,
        min=1,
        max=20
    )
    
    # Simulación
    scene.pbd_cloth_num_frames = bpy.props.IntProperty(
        name="Frames de Simulación",
        description="Número de frames a simular",
        default=150,
        min=1,
        max=1000
    )
    
    # Fuerzas
    scene.pbd_cloth_gravity = bpy.props.FloatProperty(
        name="Gravedad",
        description="Fuerza de gravedad (negativa = hacia abajo)",
        default=-9.81,
        min=-50.0,
        max=50.0
    )
    
    scene.pbd_cloth_wind_x = bpy.props.FloatProperty(
        name="Viento X",
        description="Componente X del viento",
        default=0.0,
        min=-10.0,
        max=10.0
    )
    
    scene.pbd_cloth_wind_y = bpy.props.FloatProperty(
        name="Viento Y",
        description="Componente Y del viento",
        default=0.0,
        min=-10.0,
        max=10.0
    )
    
    scene.pbd_cloth_wind_z = bpy.props.FloatProperty(
        name="Viento Z",
        description="Componente Z del viento",
        default=0.0,
        min=-10.0,
        max=10.0
    )
    
    scene.pbd_cloth_wind_variation = bpy.props.FloatProperty(
        name="Variación Viento",
        description="Variación aleatoria del viento (0 = sin variación)",
        default=0.0,
        min=0.0,
        max=1.0
    )
    
    # Flag de simulación
    scene.pbd_cloth_is_simulating = bpy.props.BoolProperty(
        name="Is Simulating",
        default=False
    )


# ============================================
# PANEL DE UI
# ============================================
class PBD_CLOTH_PT_Panel(bpy.types.Panel):
    """Panel de control para la simulación PBD de tela"""
    bl_label = "PBD Cloth"
    bl_idname = "PBD_CLOTH_PT_Panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "PBD Cloth"
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # Dimensiones
        box = layout.box()
        box.label(text="Dimensiones:", icon='MESH_GRID')
        box.prop(scene, "pbd_cloth_width")
        box.prop(scene, "pbd_cloth_height")
        box.prop(scene, "pbd_cloth_n_ancho")
        box.prop(scene, "pbd_cloth_n_alto")
        
        # Stiffness
        box = layout.box()
        box.label(text="Stiffness:", icon='MODIFIER_ON')
        box.prop(scene, "pbd_cloth_stiffness")
        box.prop(scene, "pbd_cloth_bending_stiffness")
        box.prop(scene, "pbd_cloth_shear_stiffness")
        
        # Restricciones
        box = layout.box()
        box.label(text="Restricciones:", icon='CONSTRAINT')
        box.prop(scene, "pbd_cloth_use_bending")
        box.prop(scene, "pbd_cloth_use_shear")
        
        # Solver
        box = layout.box()
        box.label(text="Solver:", icon='SETTINGS')
        box.prop(scene, "pbd_cloth_solver_iterations")
        box.prop(scene, "pbd_cloth_num_frames")
        
        # Fuerzas
        box = layout.box()
        box.label(text="Fuerzas:", icon='FORCE_WIND')
        box.prop(scene, "pbd_cloth_gravity")
        box.prop(scene, "pbd_cloth_wind_x")
        box.prop(scene, "pbd_cloth_wind_y")
        box.prop(scene, "pbd_cloth_wind_z")
        box.prop(scene, "pbd_cloth_wind_variation")
        
        # Botones
        box = layout.box()
        if scene.pbd_cloth_is_simulating:
            box.label(text="⏳ Simulando...", icon='TIME')
            box.operator("pbd_cloth.reset_simulando", text="Reset Estado")
        else:
            box.operator("pbd_cloth.simular_shapekeys", text="Simular y Guardar en Shape Keys", icon='PLAY')


# ============================================
# OPERADORES
# ============================================
class PBD_CLOTH_OT_SimularShapeKeys(bpy.types.Operator):
    """Operador para simular y guardar en Shape Keys"""
    bl_idname = "pbd_cloth.simular_shapekeys"
    bl_label = "Simular y Guardar en Shape Keys"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            simular_y_guardar_shapekeys(context)
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


class PBD_CLOTH_OT_ResetSimulando(bpy.types.Operator):
    """Operador para resetear el flag de simulación"""
    bl_idname = "pbd_cloth.reset_simulando"
    bl_label = "Reset Estado de Simulación"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        context.scene.pbd_cloth_is_simulating = False
        self.report({'INFO'}, "Estado de simulación reseteado")
        return {'FINISHED'}


# ============================================
# FUNCIONES DE SIMULACIÓN
# ============================================
def crear_malla_tela_blender(ancho, alto, n_ancho, n_alto):
    """Crear el mesh de la tela en Blender"""
    # Eliminar objeto anterior si existe
    obj_anterior = bpy.data.objects.get("Cloth")
    if obj_anterior:
        bpy.data.objects.remove(obj_anterior)
    
    # Crear nuevo mesh
    mesh = bpy.data.meshes.new(name="ClothMesh")
    obj = bpy.data.objects.new("Cloth", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Crear bmesh
    bm = bmesh.new()
    
    # Crear vértices en una cuadrícula
    dx = ancho / (n_ancho - 1.0) if n_ancho > 1 else ancho
    dy = alto / (n_alto - 1.0) if n_alto > 1 else alto
    offsetX = -ancho / 2.0
    
    vertices = []
    for i in range(n_ancho):
        for j in range(n_alto):
            x = offsetX + dx * i
            y = dy * j
            z = 0.0
            v = bm.verts.new((x, y, z))
            vertices.append(v)
    
    # Crear caras (quads)
    for i in range(n_ancho - 1):
        for j in range(n_alto - 1):
            idx00 = i * n_alto + j
            idx10 = (i + 1) * n_alto + j
            idx01 = i * n_alto + (j + 1)
            idx11 = (i + 1) * n_alto + (j + 1)
            
            try:
                bm.faces.new([
                    vertices[idx00],
                    vertices[idx10],
                    vertices[idx11],
                    vertices[idx01]
                ])
            except:
                # Si falla, intentar con triángulos
                try:
                    bm.faces.new([vertices[idx00], vertices[idx10], vertices[idx01]])
                    bm.faces.new([vertices[idx10], vertices[idx11], vertices[idx01]])
                except:
                    pass
    
    # Actualizar mesh
    bm.to_mesh(mesh)
    bm.free()
    
    # Material básico
    mat = bpy.data.materials.new(name="ClothMaterial")
    mat.use_nodes = True
    mesh.materials.append(mat)
    
    return obj


def simular_y_guardar_shapekeys(context):
    """Función principal que simula y guarda en Shape Keys"""
    scene = context.scene
    
    # Obtener parámetros
    ancho = scene.pbd_cloth_width
    alto = scene.pbd_cloth_height
    n_ancho = scene.pbd_cloth_n_ancho
    n_alto = scene.pbd_cloth_n_alto
    stiffness = scene.pbd_cloth_stiffness
    use_bending = scene.pbd_cloth_use_bending
    use_shear = scene.pbd_cloth_use_shear
    bending_stiffness = scene.pbd_cloth_bending_stiffness
    shear_stiffness = scene.pbd_cloth_shear_stiffness
    solver_iterations = scene.pbd_cloth_solver_iterations
    num_frames = scene.pbd_cloth_num_frames
    DT = 1.0 / 60.0
    
    print("\n" + "=" * 60)
    print("🎬 INICIANDO SIMULACIÓN PBD")
    print("=" * 60)
    print(f"   Dimensiones: {ancho}m x {alto}m")
    print(f"   Resolución: {n_ancho} x {n_alto} = {n_ancho * n_alto} partículas")
    print(f"   Frames: {num_frames}")
    print(f"   Iteraciones solver: {solver_iterations}")
    
    # Crear mesh de Blender
    obj = crear_malla_tela_blender(ancho, alto, n_ancho, n_alto)
    
    # Crear sistema PBD
    N = n_ancho * n_alto
    densidad = 0.1
    masa_total = densidad * ancho * alto
    masa_particula = masa_total / N
    
    system = PBDSystem(N, masa_particula)
    system.set_n_iters(solver_iterations)
    
    # Posicionar partículas según el mesh
    mesh = obj.data
    
    if len(mesh.vertices) != len(system.particles):
        print(f"⚠️ ADVERTENCIA: Mesh tiene {len(mesh.vertices)} vértices, pero hay {len(system.particles)} partículas")
    
    # Añadir debugId a las partículas para logs
    for i in range(len(system.particles)):
        system.particles[i].debugId = i
    
    for i, vertex in enumerate(mesh.vertices):
        if i < len(system.particles):
            system.particles[i].location = mathutils.Vector(vertex.co)
            system.particles[i].last_location = mathutils.Vector(vertex.co)
            
            # LOG: Verificar posición inicial
            import math
            if (math.isnan(system.particles[i].location.x) or math.isnan(system.particles[i].location.y) or math.isnan(system.particles[i].location.z)):
                print(f"   🔴 Partícula {i}: Posición inicial inválida: {system.particles[i].location}")
        else:
            break
    
    print(f"   ✓ {min(len(mesh.vertices), len(system.particles))} partículas posicionadas según el mesh")
    
    # Crear restricciones
    from DistanceConstraint import DistanceConstraint
    
    dx = ancho / (n_ancho - 1.0) if n_ancho > 1 else ancho
    dy = alto / (n_alto - 1.0) if n_alto > 1 else alto
    
    for i in range(n_ancho):
        for j in range(n_alto):
            idx = i * n_alto + j
            p = system.particles[idx]
            
            # Restricción horizontal
            if i > 0:
                idx_left = (i - 1) * n_alto + j
                px = system.particles[idx_left]
                c = DistanceConstraint(p, px, dx, stiffness)
                system.add_constraint(c)
            
            # Restricción vertical
            if j > 0:
                idx_down = i * n_alto + (j - 1)
                py = system.particles[idx_down]
                c = DistanceConstraint(p, py, dy, stiffness)
                system.add_constraint(c)
    
    # Añadir restricciones de bending
    if use_bending:
        add_bending_constraints(system, n_alto, n_ancho, bending_stiffness)
    
    # Añadir restricciones de shear
    if use_shear:
        add_shear_constraints(system, n_alto, n_ancho, shear_stiffness)
    
    # Anclar fila superior
    part_bloqueadas = 0
    for i in range(n_ancho):
        idx = i * n_alto + (n_alto - 1)  # j = n_alto - 1 (fila superior)
        system.particles[idx].set_bloqueada(True)
        part_bloqueadas += 1
    
    print(f"   📌 {part_bloqueadas}/{len(system.particles)} partículas bloqueadas (ancladas)")
    if part_bloqueadas == len(system.particles):
        print(f"   ⚠️ ADVERTENCIA: TODAS las partículas están bloqueadas. La tela no se moverá.")
    elif part_bloqueadas == 0:
        print(f"   ⚠️ ADVERTENCIA: Ninguna partícula está bloqueada. La tela caerá completamente.")
    
    # Eliminar Shape Keys existentes
    if obj.data.shape_keys:
        print(f"   🗑️ Eliminando {len(obj.data.shape_keys.key_blocks)} Shape Keys existentes...")
        while obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 0:
            obj.shape_key_remove(obj.active_shape_key)
    
    # Crear Shape Key base (Basis)
    obj.shape_key_add(name="Basis")
    
    # Obtener fuerzas
    gravity_value = scene.pbd_cloth_gravity
    wind_base = mathutils.Vector((
        scene.pbd_cloth_wind_x,
        scene.pbd_cloth_wind_y,
        scene.pbd_cloth_wind_z
    ))
    wind_variation = scene.pbd_cloth_wind_variation
    
    import random
    
    # Marcar como simulando
    scene.pbd_cloth_is_simulating = True
    
    # Variable para comparar posiciones entre frames
    posiciones_frame_anterior = None
    
    # Usar try/finally para asegurar que el flag se resetee
    try:
        # Simular frame por frame
        for frame in range(1, num_frames + 1):
            # CRÍTICO: Resetear fuerzas antes de aplicar nuevas
            for particle in system.particles:
                particle.force = mathutils.Vector((0.0, 0.0, 0.0))
            
            # Aplicar gravedad
            gravity = mathutils.Vector((0.0, 0.0, gravity_value))
            fuerzas_aplicadas = 0
            for particle in system.particles:
                if not particle.bloqueada:
                    particle.force += gravity * particle.masa
                    fuerzas_aplicadas += 1
            
            # Aplicar viento
            if wind_base.length > 0.001:
                if wind_variation > 0.001:
                    variation = mathutils.Vector((
                        random.uniform(-wind_variation, wind_variation),
                        random.uniform(-wind_variation, wind_variation),
                        random.uniform(-wind_variation, wind_variation)
                    ))
                    wind = wind_base + variation * wind_base.length
                else:
                    wind = wind_base
                
                area_per_particle = (ancho * alto) / len(system.particles)
                for particle in system.particles:
                    if not particle.bloqueada:
                        wind_force = wind * area_per_particle * 0.1
                        particle.force += wind_force
            
            # Log: Verificar fuerzas (solo primeros frames)
            if frame <= 3:
                part_con_fuerza = sum(1 for p in system.particles if p.force.length > 0.001)
                print(f"   🔧 Frame {frame}: {part_con_fuerza}/{len(system.particles)} partículas con fuerza")
            
            # LOG: Verificar posiciones ANTES del solver (solo frame 2-3)
            if frame == 2 or frame == 3:
                nan_count_before = sum(1 for p in system.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_count_before > 0:
                    print(f"   🔴 Frame {frame}: {nan_count_before} partículas con NaN ANTES del solver")
                else:
                    print(f"   ✅ Frame {frame}: Todas las partículas válidas ANTES del solver")
            
            # Ejecutar solver PBD (con debug para primeros frames)
            # Usar try/except para manejar versiones antiguas del código sin debug_frame
            try:
                system.run(DT, apply_damping=True, use_plane_col=False, use_sphere_col=False, use_shape_matching=False, debug_frame=frame if frame <= 3 else None)
            except TypeError:
                # Si la versión del código no tiene debug_frame, llamar sin él
                system.run(DT, apply_damping=True, use_plane_col=False, use_sphere_col=False, use_shape_matching=False)
            
            # LOG: Verificar posiciones DESPUÉS del solver (solo frame 2-3)
            if frame == 2 or frame == 3:
                nan_count_after = sum(1 for p in system.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_count_after > 0:
                    print(f"   🔴 Frame {frame}: {nan_count_after} partículas con NaN DESPUÉS del solver")
                    # Mostrar ejemplos de partículas con NaN
                    for i, p in enumerate(system.particles[:5]):  # Primeras 5
                        if math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z):
                            print(f"      Partícula {i}: NaN en location={p.location}, bloqueada={p.bloqueada}, masa={p.masa}, w={p.w}")
                else:
                    print(f"   ✅ Frame {frame}: Todas las partículas válidas DESPUÉS del solver")
            
            # Crear Shape Key para este frame
            shape_key_name = f"sim_{frame:04d}"
            shape_key = obj.shape_key_add(name=shape_key_name)
            
            # Log: Información del Shape Key
            if frame == 1 or frame % 10 == 0:
                print(f"\n  📝 Frame {frame}: Creando Shape Key '{shape_key_name}'")
            
            # Actualizar posiciones de vértices en el Shape Key
            vertices_actualizados = 0
            
            # CORREGIDO: Inicializar min/max con valores válidos
            # Verificar que hay partículas y que tienen posiciones válidas
            if len(system.particles) == 0:
                print(f"   ❌ ERROR: No hay partículas en el sistema")
                continue
            
            # Encontrar primera partícula con posición válida
            primera_pos_valida = None
            particulas_invalidas = 0
            particulas_validas = 0
            
            for i, p in enumerate(system.particles):
                pos = p.location
                if (isinstance(pos.x, (int, float)) and isinstance(pos.y, (int, float)) and isinstance(pos.z, (int, float)) and
                    not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z)) and
                    not (math.isinf(pos.x) or math.isinf(pos.y) or math.isinf(pos.z))):
                    particulas_validas += 1
                    if primera_pos_valida is None:
                        primera_pos_valida = pos
                else:
                    particulas_invalidas += 1
                    # LOG: Mostrar detalles de partículas inválidas (solo primeras 3 en frame 2)
                    if frame == 2 and particulas_invalidas <= 3:
                        print(f"   🔴 Partícula {i}: Posición inválida: x={pos.x}, y={pos.y}, z={pos.z}, bloqueada={p.bloqueada}, masa={p.masa}")
            
            # LOG: Estadísticas de partículas válidas/inválidas
            if frame == 2 or (frame <= 10 and particulas_invalidas > 0):
                print(f"   📊 Frame {frame}: {particulas_validas} válidas, {particulas_invalidas} inválidas")
            
            if primera_pos_valida is None:
                print(f"   ❌ ERROR: No se encontró ninguna partícula con posición válida")
                print(f"   💡 Todas las {len(system.particles)} partículas tienen posiciones inválidas")
                # Intentar usar la posición del mesh base como respaldo
                if len(mesh.vertices) > 0:
                    primera_pos_valida = mathutils.Vector(mesh.vertices[0].co)
                    print(f"   💡 Usando posición del mesh base como respaldo: {primera_pos_valida}")
                else:
                    print(f"   ❌ No hay mesh base disponible, saltando este frame")
                    continue
            
            # Inicializar min/max con la primera posición válida
            import math
            posiciones_min = mathutils.Vector((primera_pos_valida.x, primera_pos_valida.y, primera_pos_valida.z))
            posiciones_max = mathutils.Vector((primera_pos_valida.x, primera_pos_valida.y, primera_pos_valida.z))
            
            # Verificar que hay suficientes vértices
            if len(shape_key.data) != len(system.particles):
                if frame == 1:
                    print(f"   ⚠️ ADVERTENCIA: Shape Key tiene {len(shape_key.data)} vértices, pero hay {len(system.particles)} partículas")
            
            # Guardar posiciones en el Shape Key
            # PRIMERO: Recopilar todas las posiciones válidas para calcular min/max correctamente
            posiciones_validas = []
            for i, particle in enumerate(system.particles):
                if i < len(shape_key.data):
                    pos = particle.location
                    
                    # Verificar que la posición es válida
                    if (isinstance(pos.x, (int, float)) and isinstance(pos.y, (int, float)) and isinstance(pos.z, (int, float)) and
                        not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z)) and
                        not (math.isinf(pos.x) or math.isinf(pos.y) or math.isinf(pos.z))):
                        posiciones_validas.append((i, pos))
            
            # Si hay posiciones válidas, recalcular min/max desde cero
            if len(posiciones_validas) > 0:
                primera_valida = posiciones_validas[0][1]
                posiciones_min = mathutils.Vector((primera_valida.x, primera_valida.y, primera_valida.z))
                posiciones_max = mathutils.Vector((primera_valida.x, primera_valida.y, primera_valida.z))
                
                # Calcular min/max de todas las posiciones válidas
                for i, pos in posiciones_validas:
                    posiciones_min.x = min(posiciones_min.x, pos.x)
                    posiciones_min.y = min(posiciones_min.y, pos.y)
                    posiciones_min.z = min(posiciones_min.z, pos.z)
                    posiciones_max.x = max(posiciones_max.x, pos.x)
                    posiciones_max.y = max(posiciones_max.y, pos.y)
                    posiciones_max.z = max(posiciones_max.z, pos.z)
            
            # SEGUNDO: Guardar todas las posiciones en el Shape Key
            for i, particle in enumerate(system.particles):
                if i < len(shape_key.data):
                    pos = particle.location
                    
                    # Verificar que la posición es válida
                    if (isinstance(pos.x, (int, float)) and isinstance(pos.y, (int, float)) and isinstance(pos.z, (int, float)) and
                        not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z)) and
                        not (math.isinf(pos.x) or math.isinf(pos.y) or math.isinf(pos.z))):
                        
                        # Guardar posición
                        shape_key.data[i].co = mathutils.Vector((pos.x, pos.y, pos.z))
                        vertices_actualizados += 1
                    else:
                        # Si la posición es inválida, usar la posición del mesh base
                        if i < len(mesh.vertices):
                            shape_key.data[i].co = mathutils.Vector(mesh.vertices[i].co)
                        else:
                            # Si no hay mesh base, usar la última posición válida o cero
                            if len(posiciones_validas) > 0:
                                ultima_valida = posiciones_validas[-1][1]
                                shape_key.data[i].co = mathutils.Vector((ultima_valida.x, ultima_valida.y, ultima_valida.z))
                            else:
                                shape_key.data[i].co = mathutils.Vector((0.0, 0.0, 0.0))
                else:
                    break
            
            # Verificar que las posiciones cambiaron (comparar con frame anterior)
            if posiciones_frame_anterior is not None and (frame == 2 or frame % 20 == 0):
                diferencias = 0
                max_diff = 0.0
                for i in range(min(len(system.particles), len(posiciones_frame_anterior))):
                    pos_actual = system.particles[i].location
                    pos_anterior = posiciones_frame_anterior[i]
                    
                    # Verificar que ambas posiciones son válidas
                    if (isinstance(pos_actual.x, (int, float)) and isinstance(pos_anterior.x, (int, float)) and
                        not (math.isnan(pos_actual.x) or math.isnan(pos_anterior.x))):
                        diff = (pos_actual - pos_anterior).length
                        if diff > 0.001:
                            diferencias += 1
                        max_diff = max(max_diff, diff)
                
                if frame == 2:
                    if diferencias > 0:
                        print(f"   ✅ Las partículas SÍ se están moviendo: {diferencias}/{len(system.particles)} cambiaron")
                        print(f"   📏 Diferencia máxima: {max_diff:.6f} metros")
                    else:
                        print(f"   ⚠️ PROBLEMA: Las partículas NO se están moviendo")
                        print(f"   💡 Verifica que las restricciones y fuerzas estén funcionando")
            
            # Guardar posiciones actuales para comparar en el siguiente frame
            posiciones_frame_anterior = []
            for p in system.particles:
                pos = p.location
                if (isinstance(pos.x, (int, float)) and isinstance(pos.y, (int, float)) and isinstance(pos.z, (int, float)) and
                    not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z))):
                    posiciones_frame_anterior.append(mathutils.Vector((pos.x, pos.y, pos.z)))
                else:
                    # Si es inválida, usar la posición anterior o cero
                    if len(posiciones_frame_anterior) > 0:
                        posiciones_frame_anterior.append(mathutils.Vector(posiciones_frame_anterior[-1]))
                    else:
                        posiciones_frame_anterior.append(mathutils.Vector((0, 0, 0)))
            
            # Log: Estadísticas del Shape Key
            if frame == 1 or frame % 10 == 0:
                print(f"     ✓ {vertices_actualizados} vértices actualizados")
                print(f"     📊 Rango de posiciones:")
                print(f"        X: [{posiciones_min.x:.3f}, {posiciones_max.x:.3f}]")
                print(f"        Y: [{posiciones_min.y:.3f}, {posiciones_max.y:.3f}]")
                print(f"        Z: [{posiciones_min.z:.3f}, {posiciones_max.z:.3f}]")
                
                # Mostrar ejemplo de posiciones
                if frame == 1:
                    print(f"     🔍 Ejemplo de posiciones (primeras 5 partículas):")
                    for i in range(min(5, len(system.particles))):
                        p = system.particles[i]
                        print(f"        Partícula {i}: ({p.location.x:.3f}, {p.location.y:.3f}, {p.location.z:.3f})")
            
            # Progreso
            if frame % 10 == 0 or frame == num_frames:
                progreso = (frame / num_frames) * 100
                print(f"     ✅ Progreso: {frame}/{num_frames} frames ({progreso:.1f}%)")
        
        # Crear animación
        print(f"\n   🎬 Creando animación con keyframes...")
        crear_animacion_shapekeys(obj, num_frames)
        
        print(f"\n" + "=" * 60)
        print(f"✅ SIMULACIÓN COMPLETADA")
        print("=" * 60)
        print(f"   ✓ {num_frames} Shape Keys creados")
        print(f"   ✓ Animación configurada")
        print(f"\n   💡 Presiona SPACE para reproducir la animación")
        print(f"   💡 Los Shape Keys se activarán automáticamente por frame")
        
    finally:
        # SIEMPRE resetear el flag, incluso si hay errores
        scene.pbd_cloth_is_simulating = False
        print(f"\n   🔄 Flag de simulación reseteado")


def crear_animacion_shapekeys(obj, num_frames):
    """Crear keyframes para la animación de Shape Keys"""
    if not obj.data.shape_keys:
        print("   ⚠️ No hay Shape Keys para animar")
        return
    
    shape_keys = obj.data.shape_keys
    key_blocks = shape_keys.key_blocks
    
    # Configurar modo absoluto
    shape_keys.use_relative = False
    
    # Crear o obtener Action
    if not shape_keys.animation_data:
        shape_keys.animation_data_create()
    
    action = shape_keys.animation_data.action
    if not action:
        action = bpy.data.actions.new(name="ClothShapeKeys")
        shape_keys.animation_data.action = action
    
    # Crear keyframes para cada Shape Key
    for i in range(1, min(len(key_blocks), num_frames + 1)):  # Empezar desde 1 (saltar Basis)
        key_name = key_blocks[i].name
        
        # Crear F-curve para este Shape Key
        data_path = f'key_blocks["{key_name}"].value'
        fcurve = action.fcurves.find(data_path)
        if not fcurve:
            fcurve = action.fcurves.new(data_path)
        
        # Insertar keyframes
        frame_num = i  # Frame 1 = sim_0001, Frame 2 = sim_0002, etc.
        
        # Valor 1.0 en el frame correspondiente
        fcurve.keyframe_points.insert(frame_num, 1.0)
        
        # Valor 0.0 en frames adyacentes
        if frame_num > 1:
            fcurve.keyframe_points.insert(frame_num - 1, 0.0)
        if frame_num < num_frames:
            fcurve.keyframe_points.insert(frame_num + 1, 0.0)
        
        # Configurar interpolación constante
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'CONSTANT'
    
    # Actualizar
    for fcurve in action.fcurves:
        fcurve.update()
    
    print(f"   ✓ {len(key_blocks) - 1} Shape Keys con keyframes creados")


# ============================================
# REGISTRO DE CLASES
# ============================================
classes = [
    PBD_CLOTH_PT_Panel,
    PBD_CLOTH_OT_SimularShapeKeys,
    PBD_CLOTH_OT_ResetSimulando
]


def register():
    """Registrar clases y propiedades"""
    init_properties()
    for cls in classes:
        bpy.utils.register_class(cls)
    print("✓ Panel PBD Cloth registrado")


def unregister():
    """Desregistrar clases"""
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    print("✓ Panel PBD Cloth desregistrado")


# Ejecutar registro automáticamente
if __name__ == "__main__":
    register()

