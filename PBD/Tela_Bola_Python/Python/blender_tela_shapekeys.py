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
        
        # Botón de diagnóstico
        box = layout.box()
        box.label(text="Diagnóstico:", icon='CONSOLE')
        box.operator("pbd_cloth.diagnosticar_keyframes", text="Diagnosticar Keyframes", icon='GRAPH')
        box.operator("pbd_cloth.forzar_actualizacion", text="Forzar Actualización", icon='FILE_REFRESH')


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


class PBD_CLOTH_OT_DiagnosticarKeyframes(bpy.types.Operator):
    """Operador para diagnosticar los keyframes de Shape Keys"""
    bl_idname = "pbd_cloth.diagnosticar_keyframes"
    bl_label = "Diagnosticar Keyframes"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            diagnosticar_keyframes_shapekeys()
            self.report({'INFO'}, "Diagnóstico completado. Revisa la consola.")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


class PBD_CLOTH_OT_ForzarActualizacion(bpy.types.Operator):
    """Operador para forzar la actualización del mesh y Shape Keys"""
    bl_idname = "pbd_cloth.forzar_actualizacion"
    bl_label = "Forzar Actualización"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            obj = bpy.data.objects.get("Cloth")
            if not obj:
                self.report({'ERROR'}, "No se encontró el objeto 'Cloth'")
                return {'CANCELLED'}
            
            # Forzar actualización completa
            bpy.context.view_layer.update()
            
            # Actualizar el objeto
            obj.update_from_editmode()
            obj.data.update()
            
            # Forzar actualización de dependencias
            depsgraph = bpy.context.evaluated_depsgraph_get()
            depsgraph.update()
            
            # Actualizar la vista
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()
            
            self.report({'INFO'}, "Actualización forzada. Intenta reproducir la animación.")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


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
    # CRÍTICO: En modo absoluto, cada Shape Key debe tener keyframes en TODOS los frames
    # - Valor 1.0 en su frame correspondiente
    # - Valor 0.0 en TODOS los demás frames
    
    print(f"   📝 Creando keyframes para {min(len(key_blocks) - 1, num_frames)} Shape Keys...")
    
    # PRIMERO: Limpiar todas las F-curves existentes para empezar desde cero
    if action.fcurves:
        for fcurve in action.fcurves[:]:
            action.fcurves.remove(fcurve)
    
    # SEGUNDO: Crear F-curves y keyframes para cada Shape Key
    # CRÍTICO: En modo absoluto, cada Shape Key necesita keyframes en TODOS los frames
    # donde su valor cambia. Necesitamos insertar keyframes en:
    # - Frame 1: 0.0 para todos excepto sim_0001 (que tiene 1.0)
    # - Frame N: 1.0 para sim_00NN
    # - Frame N+1: 0.0 para todos
    
    print(f"   📝 Creando F-curves y keyframes...")
    
    # Crear todas las F-curves primero
    fcurves_dict = {}
    for i in range(1, min(len(key_blocks), num_frames + 1)):
        key_name = key_blocks[i].name
        data_path = f'key_blocks["{key_name}"].value'
        fcurve = action.fcurves.new(data_path)
        fcurves_dict[i] = fcurve
    
    # Ahora insertar keyframes frame por frame (más eficiente y evita conflictos)
    print(f"   📝 Insertando keyframes frame por frame (1 a {num_frames})...")
    
    total_keyframes_insertados = 0
    for frame in range(1, num_frames + 1):
        # Para cada frame, determinar qué Shape Key debe estar activo
        shape_key_activo = frame  # Frame 1 = sim_0001, Frame 2 = sim_0002, etc.
        
        if shape_key_activo < len(key_blocks):
            # Insertar keyframes en todas las F-curves para este frame
            for i, fcurve in fcurves_dict.items():
                value = 1.0 if i == shape_key_activo else 0.0
                
                # Verificar si ya existe un keyframe en este frame
                kp_existente = None
                for kp in fcurve.keyframe_points:
                    if abs(kp.co[0] - frame) < 0.01:
                        kp_existente = kp
                        break
                
                if kp_existente:
                    # Actualizar valor existente
                    kp_existente.co[1] = value
                    kp_existente.interpolation = 'CONSTANT'
                else:
                    # Insertar nuevo keyframe
                    kp = fcurve.keyframe_points.insert(frame, value)
                    kp.interpolation = 'CONSTANT'
                    total_keyframes_insertados += 1
        
        # Log de progreso cada 50 frames
        if frame % 50 == 0:
            print(f"      Progreso: Frame {frame}/{num_frames}...")
    
    print(f"   ✓ Total de keyframes insertados: {total_keyframes_insertados}")
    
    # Actualizar todas las F-curves
    for fcurve in fcurves_dict.values():
        fcurve.update()
    
    # LOG: Verificar que se insertaron correctamente
    print(f"   📊 Verificación de keyframes insertados:")
    print(f"      Total de F-curves: {len(fcurves_dict)}")
    
    # Verificar algunos Shape Keys específicos
    for i in [1, 2, 3, 50, 100, 150]:
        if i < len(key_blocks) and i in fcurves_dict:
            fcurve = fcurves_dict[i]
            key_name = key_blocks[i].name
            num_kps = len(fcurve.keyframe_points)
            expected_kps = num_frames  # Debería tener keyframes en todos los frames
            status = "✅" if num_kps == expected_kps else "❌"
            print(f"      {status} {key_name}: {num_kps} keyframes (esperado: {expected_kps})")
            
            # Verificar keyframe en su frame correspondiente
            kp_en_frame = None
            for kp in fcurve.keyframe_points:
                if abs(kp.co[0] - i) < 0.01:
                    kp_en_frame = kp
                    break
            
            if kp_en_frame:
                value = kp_en_frame.co[1]
                expected_value = 1.0
                status_val = "✅" if abs(value - expected_value) < 0.001 else "❌"
                print(f"         {status_val} Frame {i}: {value:.6f} (esperado: {expected_value:.1f})")
            else:
                print(f"         ❌ No hay keyframe en Frame {i}")
    
    print(f"   ✓ Keyframes creados para todos los Shape Keys")
    
    # Actualizar todas las F-curves
    for fcurve in action.fcurves:
        fcurve.update()
    
    # CRÍTICO: Forzar actualización de los valores de Shape Keys en el frame actual
    # Esto asegura que Blender aplique los keyframes
    scene = bpy.context.scene
    frame_actual = scene.frame_current
    
    # Establecer frame 1 para verificar que funciona
    scene.frame_set(1)
    
    # Forzar actualización de dependencias
    bpy.context.view_layer.update()
    
    # Verificar valores en frame 1
    if len(key_blocks) > 1:
        sim1 = key_blocks[1]
        print(f"   📊 Verificación Frame 1: '{sim1.name}' = {sim1.value:.6f}")
    
    # Volver al frame original
    scene.frame_set(frame_actual)
    
    # Verificar que se crearon correctamente
    total_keyframes = sum(len(fc.keyframe_points) for fc in action.fcurves)
    print(f"   ✓ {len(action.fcurves)} F-curves creadas")
    print(f"   ✓ {total_keyframes} keyframes totales insertados")
    
    # Verificar un ejemplo
    if len(action.fcurves) > 0:
        ejemplo_fc = action.fcurves[0]
        print(f"   📊 Ejemplo: '{ejemplo_fc.data_path}' tiene {len(ejemplo_fc.keyframe_points)} keyframes")
        if len(ejemplo_fc.keyframe_points) > 0:
            primer_kp = ejemplo_fc.keyframe_points[0]
            ultimo_kp = ejemplo_fc.keyframe_points[-1]
            print(f"      Rango: Frame {int(primer_kp.co[0])} (valor {primer_kp.co[1]:.1f}) a Frame {int(ultimo_kp.co[0])} (valor {ultimo_kp.co[1]:.1f})")


# ============================================
# FUNCIÓN DE DIAGNÓSTICO
# ============================================
def diagnosticar_keyframes_shapekeys():
    """Función para diagnosticar los keyframes de Shape Keys"""
    print("\n" + "=" * 60)
    print("🔍 DIAGNÓSTICO COMPLETO DE KEYFRAMES")
    print("=" * 60)
    
    obj = bpy.data.objects.get("Cloth")
    if not obj or not obj.data.shape_keys:
        print("❌ No se encontró el objeto 'Cloth' con Shape Keys")
        return
    
    shape_keys = obj.data.shape_keys
    key_blocks = shape_keys.key_blocks
    
    print(f"\n📋 INFORMACIÓN GENERAL:")
    print(f"   Total de Shape Keys: {len(key_blocks)}")
    print(f"   Modo: {'Relative' if shape_keys.use_relative else 'Absolute'}")
    
    action = shape_keys.animation_data.action if shape_keys.animation_data else None
    
    if not action:
        print("❌ No hay Action asignado")
        return
    
    print(f"\n✅ Action: '{action.name}'")
    print(f"   F-curves: {len(action.fcurves)}")
    
    # Verificar TODAS las F-curves
    print(f"\n📊 TODAS LAS F-CURVES (primeras 10):")
    for i, fcurve in enumerate(action.fcurves[:10]):
        print(f"\n   {i+1}. {fcurve.data_path}")
        print(f"      Keyframes: {len(fcurve.keyframe_points)}")
        
        if len(fcurve.keyframe_points) > 0:
            # Mostrar TODOS los keyframes
            for kp in sorted(fcurve.keyframe_points, key=lambda k: k.co[0]):
                frame = int(kp.co[0])
                value = kp.co[1]
                interp = kp.interpolation
                print(f"      Frame {frame}: {value:.6f} (interp: {interp})")
        else:
            print(f"      ⚠️ No tiene keyframes")
    
    # Verificar valores en diferentes frames
    print(f"\n📊 VALORES EN DIFERENTES FRAMES:")
    scene = bpy.context.scene
    frame_original = scene.frame_current
    
    test_frames = [1, 2, 3]
    if len(key_blocks) > 50:
        test_frames.extend([50, 100])
    if len(key_blocks) > 150:
        test_frames.append(150)
    
    for test_frame in test_frames:
        if test_frame < len(key_blocks):
            scene.frame_set(test_frame)
            bpy.context.view_layer.update()
            
            # Verificar valores: mostrar el Shape Key que debería estar activo + algunos adyacentes
            print(f"\n   Frame {test_frame}:")
            
            # Determinar qué Shape Keys mostrar
            shape_keys_a_mostrar = []
            
            # Siempre mostrar el Shape Key que debería estar activo en este frame
            if test_frame < len(key_blocks):
                shape_keys_a_mostrar.append(test_frame)
            
            # Mostrar algunos Shape Keys adyacentes para contexto
            if test_frame == 1:
                # Frame 1: mostrar sim_0001, sim_0002, sim_0003
                shape_keys_a_mostrar.extend([1, 2, 3])
            elif test_frame == 2:
                # Frame 2: mostrar sim_0001, sim_0002, sim_0003
                shape_keys_a_mostrar.extend([1, 2, 3])
            elif test_frame == 3:
                # Frame 3: mostrar sim_0001, sim_0002, sim_0003, sim_0004
                shape_keys_a_mostrar.extend([1, 2, 3, 4])
            else:
                # Frames más altos: mostrar el activo + algunos antes y después
                inicio = max(1, test_frame - 2)
                fin = min(len(key_blocks), test_frame + 3)
                shape_keys_a_mostrar.extend(range(inicio, fin))
            
            # Eliminar duplicados y ordenar
            shape_keys_a_mostrar = sorted(set(shape_keys_a_mostrar))
            
            # Mostrar los Shape Keys seleccionados
            for i in shape_keys_a_mostrar:
                if i < len(key_blocks):
                    key = key_blocks[i]
                    expected = 1.0 if i == test_frame else 0.0
                    status = "✅" if abs(key.value - expected) < 0.001 else "❌"
                    print(f"      {status} {key.name}: {key.value:.6f} (esperado: {expected:.1f})")
    
    # Volver al frame original
    scene.frame_set(frame_original)
    
    # Verificar si los Shape Keys tienen posiciones diferentes
    print(f"\n📊 VERIFICACIÓN DE POSICIONES DE VÉRTICES:")
    if len(key_blocks) >= 3:
        # Comparar Basis, sim_0001, sim_0002
        basis = key_blocks[0]
        sim1 = key_blocks[1]
        sim2 = key_blocks[2] if len(key_blocks) > 2 else None
        
        if basis and sim1:
            # Comparar primer vértice
            if len(basis.data) > 0 and len(sim1.data) > 0:
                v_basis = basis.data[0].co
                v_sim1 = sim1.data[0].co
                diff = (v_sim1 - v_basis).length
                status = "✅" if diff > 0.001 else "❌"
                print(f"   {status} Basis vs sim_0001 (vértice 0): diferencia = {diff:.6f}")
                
                if sim2 and len(sim2.data) > 0:
                    v_sim2 = sim2.data[0].co
                    diff2 = (v_sim2 - v_basis).length
                    status2 = "✅" if diff2 > 0.001 else "❌"
                    print(f"   {status2} Basis vs sim_0002 (vértice 0): diferencia = {diff2:.6f}")
                    
                    diff12 = (v_sim2 - v_sim1).length
                    status12 = "✅" if diff12 > 0.001 else "❌"
                    print(f"   {status12} sim_0001 vs sim_0002 (vértice 0): diferencia = {diff12:.6f}")
    
    # Resumen
    print(f"\n📊 RESUMEN:")
    total_keyframes = sum(len(fc.keyframe_points) for fc in action.fcurves)
    print(f"   Total de F-curves: {len(action.fcurves)}")
    print(f"   Total de keyframes: {total_keyframes}")
    
    # Verificar si hay problemas
    fcurves_sin_keyframes = sum(1 for fc in action.fcurves if len(fc.keyframe_points) == 0)
    if fcurves_sin_keyframes > 0:
        print(f"   ⚠️ {fcurves_sin_keyframes} F-curves sin keyframes")
    
    # Verificar si los valores son correctos en frames clave
    print(f"\n📊 VERIFICACIÓN FINAL:")
    frames_verificar = [1, 2, 3, 50, 100, 150]
    frames_ok = 0
    for f in frames_verificar:
        if f < len(key_blocks):
            scene.frame_set(f)
            bpy.context.view_layer.update()
            key_activo = key_blocks[f]
            if abs(key_activo.value - 1.0) < 0.001:
                frames_ok += 1
    
    if frames_ok == len([f for f in frames_verificar if f < len(key_blocks)]):
        print(f"   ✅ Todos los frames clave tienen el Shape Key correcto activo")
    else:
        print(f"   ⚠️ Algunos frames clave no tienen el Shape Key correcto activo")
    
    # Volver al frame original
    scene.frame_set(frame_original)
    
    # VERIFICACIÓN CRÍTICA: Estado del objeto y visualización
    print(f"\n🔍 VERIFICACIÓN DE VISUALIZACIÓN:")
    
    # 1. Verificar modo del objeto
    if obj.mode != 'OBJECT':
        print(f"   ⚠️ Objeto en modo '{obj.mode}' (debería estar en 'OBJECT')")
    else:
        print(f"   ✅ Objeto en modo OBJECT")
    
    # 2. Verificar si el objeto está visible
    print(f"   Visibilidad: visible={obj.visible_get()}, hide_viewport={obj.hide_viewport}, hide_render={obj.hide_render}")
    
    # 3. Verificar si los Shape Keys están habilitados
    if shape_keys.use_relative:
        print(f"   ⚠️ Shape Keys en modo RELATIVE (debería ser ABSOLUTE)")
    else:
        print(f"   ✅ Shape Keys en modo ABSOLUTE")
    
    # 4. Verificar si hay modificadores que puedan interferir
    if obj.modifiers:
        print(f"   ⚠️ Objeto tiene {len(obj.modifiers)} modificador(es) que pueden interferir:")
        for mod in obj.modifiers:
            print(f"      - {mod.name} ({mod.type})")
    else:
        print(f"   ✅ No hay modificadores que interfieran")
    
    # 5. Verificar evaluación de la animación
    print(f"\n📊 VERIFICACIÓN DE EVALUACIÓN DE ANIMACIÓN:")
    
    # CRÍTICO: Necesitamos obtener el objeto EVALUADO (con Shape Keys aplicados)
    # no el objeto base (sin Shape Keys)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    
    scene.frame_set(1)
    bpy.context.view_layer.update()
    obj_eval1 = obj.evaluated_get(depsgraph)
    v1_frame1 = obj_eval1.data.vertices[0].co.copy() if len(obj_eval1.data.vertices) > 0 else None
    
    scene.frame_set(10)
    bpy.context.view_layer.update()
    depsgraph.update()
    obj_eval10 = obj.evaluated_get(depsgraph)
    v1_frame10 = obj_eval10.data.vertices[0].co.copy() if len(obj_eval10.data.vertices) > 0 else None
    
    scene.frame_set(50)
    bpy.context.view_layer.update()
    depsgraph.update()
    obj_eval50 = obj.evaluated_get(depsgraph)
    v1_frame50 = obj_eval50.data.vertices[0].co.copy() if len(obj_eval50.data.vertices) > 0 else None
    
    if v1_frame1 and v1_frame10 and v1_frame50:
        diff_1_10 = (v1_frame10 - v1_frame1).length
        diff_1_50 = (v1_frame50 - v1_frame1).length
        diff_10_50 = (v1_frame50 - v1_frame10).length
        
        print(f"   Vértice 0 en Frame 1:  ({v1_frame1.x:.3f}, {v1_frame1.y:.3f}, {v1_frame1.z:.3f})")
        print(f"   Vértice 0 en Frame 10: ({v1_frame10.x:.3f}, {v1_frame10.y:.3f}, {v1_frame10.z:.3f})")
        print(f"   Vértice 0 en Frame 50: ({v1_frame50.x:.3f}, {v1_frame50.y:.3f}, {v1_frame50.z:.3f})")
        print(f"   Diferencia Frame 1→10: {diff_1_10:.6f}")
        print(f"   Diferencia Frame 1→50: {diff_1_50:.6f}")
        print(f"   Diferencia Frame 10→50: {diff_10_50:.6f}")
        
        if diff_1_10 > 0.001 or diff_1_50 > 0.001:
            print(f"   ✅ Blender SÍ está aplicando los Shape Keys (vértices cambian entre frames)")
        else:
            print(f"   ❌ Blender NO está aplicando los Shape Keys (vértices NO cambian entre frames)")
            print(f"   💡 Posibles causas y soluciones:")
            print(f"      1. Verificar que los Shape Keys estén visibles:")
            print(f"         - Selecciona el objeto 'Cloth'")
            print(f"         - Ve a Properties > Mesh Data > Shape Keys")
            print(f"         - Asegúrate de que el icono del ojo esté activo para los Shape Keys")
            print(f"      2. Forzar actualización del mesh:")
            print(f"         - Presiona el botón 'Forzar Actualización' en el panel")
            print(f"      3. Verificar que el objeto esté seleccionado y visible")
            print(f"      4. Intentar reproducir la animación (Space bar)")
            
            # Verificar valores de Shape Keys directamente
            print(f"\n   🔍 Verificación directa de valores de Shape Keys:")
            scene.frame_set(1)
            bpy.context.view_layer.update()
            print(f"      Frame 1: sim_0001 = {key_blocks[1].value:.6f}, sim_0002 = {key_blocks[2].value:.6f}")
            
            scene.frame_set(10)
            bpy.context.view_layer.update()
            print(f"      Frame 10: sim_0001 = {key_blocks[1].value:.6f}, sim_0010 = {key_blocks[10].value:.6f}")
            
            scene.frame_set(50)
            bpy.context.view_layer.update()
            print(f"      Frame 50: sim_0001 = {key_blocks[1].value:.6f}, sim_0050 = {key_blocks[50].value:.6f}")
            
            # CRÍTICO: Comparar posiciones almacenadas en Shape Keys vs posiciones evaluadas
            print(f"\n   🔍 COMPARACIÓN: Posiciones almacenadas vs evaluadas:")
            
            # Leer posiciones almacenadas directamente en los Shape Keys
            if len(key_blocks) > 10 and len(key_blocks[1].data) > 0 and len(key_blocks[10].data) > 0:
                # Posición almacenada en sim_0001 (frame 1)
                stored_sim1 = key_blocks[1].data[0].co.copy()
                # Posición almacenada en sim_0010 (frame 10)
                stored_sim10 = key_blocks[10].data[0].co.copy()
                
                print(f"      Posición ALMACENADA en sim_0001: ({stored_sim1.x:.3f}, {stored_sim1.y:.3f}, {stored_sim1.z:.3f})")
                print(f"      Posición ALMACENADA en sim_0010: ({stored_sim10.x:.3f}, {stored_sim10.y:.3f}, {stored_sim10.z:.3f})")
                print(f"      Posición EVALUADA en Frame 1: ({v1_frame1.x:.3f}, {v1_frame1.y:.3f}, {v1_frame1.z:.3f})")
                print(f"      Posición EVALUADA en Frame 10: ({v1_frame10.x:.3f}, {v1_frame10.y:.3f}, {v1_frame10.z:.3f})")
                
                # Comparar
                diff_stored = (stored_sim10 - stored_sim1).length
                diff_eval = (v1_frame10 - v1_frame1).length
                
                print(f"      Diferencia entre Shape Keys almacenados: {diff_stored:.6f}")
                print(f"      Diferencia entre posiciones evaluadas: {diff_eval:.6f}")
                
                if diff_stored > 0.001 and diff_eval < 0.001:
                    print(f"      ❌ PROBLEMA ENCONTRADO: Los Shape Keys tienen posiciones diferentes,")
                    print(f"         pero Blender NO está aplicándolas al mesh evaluado.")
                    print(f"         Esto indica un problema con la evaluación de Shape Keys absolutos.")
                    
                    # Verificar si el problema es con el modo
                    print(f"\n      🔧 VERIFICACIÓN ADICIONAL:")
                    print(f"         use_relative en código: {shape_keys.use_relative}")
                    print(f"         use_relative actual: {obj.data.shape_keys.use_relative if obj.data.shape_keys else 'N/A'}")
                    
                    # Intentar forzar modo absoluto
                    if obj.data.shape_keys:
                        obj.data.shape_keys.use_relative = False
                        print(f"         ✅ Forzado use_relative = False")
                        
                        # Re-evaluar
                        scene.frame_set(1)
                        bpy.context.view_layer.update()
                        depsgraph.update()
                        obj_eval1_new = obj.evaluated_get(depsgraph)
                        v1_frame1_new = obj_eval1_new.data.vertices[0].co.copy() if len(obj_eval1_new.data.vertices) > 0 else None
                        
                        scene.frame_set(10)
                        bpy.context.view_layer.update()
                        depsgraph.update()
                        obj_eval10_new = obj.evaluated_get(depsgraph)
                        v1_frame10_new = obj_eval10_new.data.vertices[0].co.copy() if len(obj_eval10_new.data.vertices) > 0 else None
                        
                        if v1_frame1_new and v1_frame10_new:
                            diff_new = (v1_frame10_new - v1_frame1_new).length
                            print(f"         Diferencia después de forzar ABSOLUTE: {diff_new:.6f}")
                            if diff_new > 0.001:
                                print(f"         ✅ ¡PROBLEMA RESUELTO! Los vértices ahora cambian.")
                            else:
                                print(f"         ❌ Aún no funciona. Puede ser un bug de Blender con Shape Keys absolutos.")
    
    # Volver al frame original
    scene.frame_set(frame_original)
    
    # 6. Verificar configuración de la escena
    print(f"\n📊 CONFIGURACIÓN DE ESCENA:")
    print(f"   Frame actual: {scene.frame_current}")
    print(f"   Frame inicio: {scene.frame_start}")
    print(f"   Frame fin: {scene.frame_end}")
    print(f"   FPS: {scene.render.fps}")
    
    print("\n" + "=" * 60)


# ============================================
# REGISTRO DE CLASES
# ============================================
classes = [
    PBD_CLOTH_PT_Panel,
    PBD_CLOTH_OT_SimularShapeKeys,
    PBD_CLOTH_OT_ResetSimulando,
    PBD_CLOTH_OT_DiagnosticarKeyframes,
    PBD_CLOTH_OT_ForzarActualizacion
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

