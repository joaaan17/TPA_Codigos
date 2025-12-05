"""
Script principal de Blender para simular tela con PBD y guardar en Shape Keys
Este script crea un panel de control y pre-simula la tela guardando cada frame como Shape Key
"""
import bpy  # type: ignore
import bmesh  # type: ignore
import mathutils  # type: ignore
import math
import sys
import os

# Añadir la ruta del directorio padre al path de Python
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Importar módulos PBD desde la nueva estructura
from core.Particle import Particle
from core.PBDSystem import PBDSystem
from geometry.Tela import crea_tela, add_bending_constraints, add_shear_constraints

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
    
    # ===== PROPIEDADES PARA MODO DE SIMULACIÓN =====
    scene.pbd_simulation_mode = bpy.props.EnumProperty(
        name="Modo de Simulación",
        description="Tipo de simulación a ejecutar",
        items=[
            ('CLOTH', "Tela", "Simulación de tela con restricciones de distancia, bending y shear"),
            ('VOLUME_CUBE', "Cubo Volumen", "Simulación de cubo con restricciones de volumen")
        ],
        default='CLOTH'
    )
    
    # ===== PROPIEDADES PARA CUBO DE VOLUMEN =====
    scene.pbd_cube_side = bpy.props.FloatProperty(
        name="Lado del Cubo",
        description="Longitud del lado del cubo en metros",
        default=1.0,
        min=0.1,
        max=5.0
    )
    
    scene.pbd_cube_density = bpy.props.FloatProperty(
        name="Densidad",
        description="Densidad del material del cubo (kg/m³)",
        default=100.0,
        min=1.0,
        max=10000.0
    )
    
    scene.pbd_cube_volume_stiffness = bpy.props.FloatProperty(
        name="Stiffness Volumen",
        description="Rigidez de las restricciones de volumen por tetraedro [0, 1]. Valores más altos = más resistencia a la compresión",
        default=0.8,
        min=0.0,
        max=1.0
    )
    
    scene.pbd_cube_global_volume_stiffness = bpy.props.FloatProperty(
        name="Stiffness Volumen Global",
        description="Rigidez de la restricción de volumen global [0, 1]. 0 = desactivado",
        default=0.0,
        min=0.0,
        max=1.0
    )
    
    scene.pbd_cube_use_global_volume = bpy.props.BoolProperty(
        name="Usar Volumen Global",
        description="Activar restricción de volumen global (Müller 2007)",
        default=False
    )
    
    # ===== PROPIEDADES PARA SUELO =====
    scene.pbd_floor_enabled = bpy.props.BoolProperty(
        name="Habilitar Suelo",
        description="Crear un suelo para colisiones",
        default=True
    )
    
    scene.pbd_floor_height = bpy.props.FloatProperty(
        name="Altura del Suelo",
        description="Altura Y del suelo en metros",
        default=0.0,
        min=-10.0,
        max=10.0
    )
    
    scene.pbd_cube_start_height = bpy.props.FloatProperty(
        name="Altura Inicial Cubo",
        description="Altura Y inicial del cubo (para que caiga)",
        default=5.0,
        min=0.0,
        max=20.0
    )
    
    scene.pbd_cube_subdivisions = bpy.props.IntProperty(
        name="Subdivisiones",
        description="Número de subdivisiones por eje (3 = 27, 4 = 64, 5 = 125, 6 = 216, 7 = 343, 8 = 512, 9 = 729, 10 = 1000, 15 = 3375 vértices)",
        default=3,
        min=2,
        max=15
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
        
        # ===== SELECTOR DE MODO =====
        box = layout.box()
        box.label(text="Modo de Simulación:", icon='SETTINGS')
        box.prop(scene, "pbd_simulation_mode", expand=True)
        
        mode = scene.pbd_simulation_mode
        
        if mode == 'CLOTH':
            # ===== PANEL PARA MODO TELA =====
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
            
        elif mode == 'VOLUME_CUBE':
            # ===== PANEL PARA MODO CUBO VOLUMEN =====
            # Parámetros del cubo
            box = layout.box()
            box.label(text="Parámetros del Cubo:", icon='MESH_CUBE')
            box.prop(scene, "pbd_cube_side")
            box.prop(scene, "pbd_cube_density")
            
            # Stiffness de volumen
            box = layout.box()
            box.label(text="Stiffness Volumen:", icon='MODIFIER_ON')
            box.prop(scene, "pbd_cube_volume_stiffness")
            box.prop(scene, "pbd_cube_use_global_volume")
            if scene.pbd_cube_use_global_volume:
                box.prop(scene, "pbd_cube_global_volume_stiffness")
            box.prop(scene, "pbd_cube_subdivisions")
            
            # Suelo
            box = layout.box()
            box.label(text="Suelo:", icon='MESH_PLANE')
            box.prop(scene, "pbd_floor_enabled")
            if scene.pbd_floor_enabled:
                box.prop(scene, "pbd_floor_height")
                box.prop(scene, "pbd_cube_start_height")
        
        # ===== PARÁMETROS COMUNES =====
        # Solver
        box = layout.box()
        box.label(text="Solver:", icon='SETTINGS')
        box.prop(scene, "pbd_cloth_solver_iterations")
        box.prop(scene, "pbd_cloth_num_frames")
        
        # Fuerzas
        box = layout.box()
        box.label(text="Fuerzas:", icon='FORCE_WIND')
        box.prop(scene, "pbd_cloth_gravity")
        if mode == 'CLOTH':
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
            if mode == 'CLOTH':
                box.operator("pbd_cloth.simular_shapekeys", text="Simular Tela", icon='PLAY')
            elif mode == 'VOLUME_CUBE':
                box.operator("pbd_cloth.simular_cubo_volumen", text="Simular Cubo Volumen", icon='PLAY')
        
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
            scene = context.scene
            mode = scene.pbd_simulation_mode
            
            # Buscar el objeto correcto según el modo de simulación
            if mode == 'CLOTH':
                obj = bpy.data.objects.get("Cloth")
                obj_name = "Cloth"
            elif mode == 'VOLUME_CUBE':
                obj = bpy.data.objects.get("VolumeCube")
                obj_name = "VolumeCube"
            else:
                # Intentar ambos objetos
                obj = bpy.data.objects.get("Cloth") or bpy.data.objects.get("VolumeCube")
                obj_name = obj.name if obj else "objeto de simulación"
            
            if not obj:
                self.report({'ERROR'}, f"No se encontró el objeto de simulación ('Cloth' o 'VolumeCube'). Asegúrate de haber ejecutado la simulación primero.")
                return {'CANCELLED'}
            
            if not obj.data.shape_keys:
                self.report({'ERROR'}, f"El objeto '{obj.name}' no tiene Shape Keys. Ejecuta la simulación primero.")
                return {'CANCELLED'}
            
            # CRÍTICO: Asegurar que los Shape Keys están en modo ABSOLUTO
            shape_keys = obj.data.shape_keys
            shape_keys.use_relative = False
            print(f"   ✓ Shape Keys configurados en modo ABSOLUTO")
            
            # CRÍTICO: Forzar actualización de todos los Shape Keys
            # Esto es necesario porque Blender a veces no aplica los Shape Keys correctamente
            for key_block in shape_keys.key_blocks:
                # Forzar actualización del valor del Shape Key
                key_block.value = key_block.value  # Esto fuerza una actualización
            
            # Seleccionar y activar el objeto
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            
            # Forzar actualización completa del objeto
            bpy.context.view_layer.update()
            
            # Actualizar el objeto
            obj.update_from_editmode()
            obj.data.update()
            
            # CRÍTICO: Forzar actualización de dependencias y evaluación
            depsgraph = bpy.context.evaluated_depsgraph_get()
            depsgraph.update()
            
            # CRÍTICO: Cambiar de frame para forzar re-evaluación
            frame_actual = scene.frame_current
            scene.frame_set(frame_actual + 1)
            bpy.context.view_layer.update()
            depsgraph.update()
            scene.frame_set(frame_actual)
            bpy.context.view_layer.update()
            depsgraph.update()
            
            # CRÍTICO: Forzar actualización del mesh evaluado
            obj_eval = obj.evaluated_get(depsgraph)
            if obj_eval and obj_eval.data:
                obj_eval.data.update()
            
            # Actualizar la vista en todas las áreas
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()
                elif area.type == 'PROPERTIES':
                    area.tag_redraw()
                elif area.type == 'DOPESHEET_EDITOR':
                    area.tag_redraw()
            
            # Verificar que los Shape Keys están visibles
            if shape_keys.use_relative:
                print(f"   ⚠️ Advertencia: Shape Keys en modo RELATIVE, cambiando a ABSOLUTE")
                shape_keys.use_relative = False
            
            self.report({'INFO'}, f"Actualización forzada del objeto '{obj.name}'. Shape Keys en modo ABSOLUTO. Intenta reproducir la animación (Space bar).")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


class PBD_CLOTH_OT_SimularCuboVolumen(bpy.types.Operator):
    """Operador para simular cubo con restricciones de volumen"""
    bl_idname = "pbd_cloth.simular_cubo_volumen"
    bl_label = "Simular Cubo Volumen"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            simular_cubo_volumen(context)
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


# ============================================
# FUNCIONES DE SIMULACIÓN
# ============================================
def crear_malla_cubo_blender(lado, subdivisiones=3):
    """Crear el mesh del cubo subdividido en Blender"""
    # NOTA: La eliminación del objeto anterior se hace en simular_cubo_volumen
    # para evitar problemas de estado persistente. Solo crear el mesh aquí.
    
    # Crear nuevo mesh
    mesh = bpy.data.meshes.new(name="VolumeCubeMesh")
    obj = bpy.data.objects.new("VolumeCube", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Crear bmesh
    bm = bmesh.new()
    
    # Generar vértices en una grilla 3D (igual que en CuboVolumen.py)
    offset = lado / 2.0
    step = lado / (subdivisiones - 1)
    
    verts_dict = {}  # Para evitar duplicados
    
    for z in range(subdivisiones):
        for y in range(subdivisiones):
            for x in range(subdivisiones):
                pos = mathutils.Vector((
                    -offset + x * step,
                    -offset + y * step,
                    -offset + z * step
                ))
                # Usar tupla como clave para evitar duplicados
                key = (x, y, z)
                if key not in verts_dict:
                    vert = bm.verts.new(pos)
                    verts_dict[key] = vert
    
    # Crear caras del cubo (solo las caras exteriores)
    def get_vert(x, y, z):
        """Obtener vértice en la grilla"""
        if (x, y, z) in verts_dict:
            return verts_dict[(x, y, z)]
        return None
    
    # Cara inferior (z = 0)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            v0 = get_vert(x, y, 0)
            v1 = get_vert(x + 1, y, 0)
            v2 = get_vert(x + 1, y + 1, 0)
            v3 = get_vert(x, y + 1, 0)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v1, v2, v3])
    
    # Cara superior (z = subdivisiones - 1)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            v0 = get_vert(x, y, subdivisiones - 1)
            v1 = get_vert(x + 1, y, subdivisiones - 1)
            v2 = get_vert(x + 1, y + 1, subdivisiones - 1)
            v3 = get_vert(x, y + 1, subdivisiones - 1)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v3, v2, v1])  # Invertir orden para normal correcta
    
    # Cara frontal (y = 0)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            v0 = get_vert(x, 0, z)
            v1 = get_vert(x + 1, 0, z)
            v2 = get_vert(x + 1, 0, z + 1)
            v3 = get_vert(x, 0, z + 1)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v1, v2, v3])
    
    # Cara trasera (y = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            v0 = get_vert(x, subdivisiones - 1, z)
            v1 = get_vert(x + 1, subdivisiones - 1, z)
            v2 = get_vert(x + 1, subdivisiones - 1, z + 1)
            v3 = get_vert(x, subdivisiones - 1, z + 1)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v3, v2, v1])  # Invertir orden
    
    # Cara izquierda (x = 0)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            v0 = get_vert(0, y, z)
            v1 = get_vert(0, y + 1, z)
            v2 = get_vert(0, y + 1, z + 1)
            v3 = get_vert(0, y, z + 1)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v1, v2, v3])
    
    # Cara derecha (x = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            v0 = get_vert(subdivisiones - 1, y, z)
            v1 = get_vert(subdivisiones - 1, y + 1, z)
            v2 = get_vert(subdivisiones - 1, y + 1, z + 1)
            v3 = get_vert(subdivisiones - 1, y, z + 1)
            if v0 and v1 and v2 and v3:
                bm.faces.new([v0, v3, v2, v1])  # Invertir orden
    
    # Actualizar mesh
    bm.to_mesh(mesh)
    bm.free()
    
    return obj


def crear_suelo_blender(altura, tamaño=20.0):
    """Crear un suelo plano en Blender para colisiones"""
    import math
    
    # Eliminar suelo anterior si existe
    obj_anterior = bpy.data.objects.get("Floor")
    if obj_anterior:
        bpy.data.objects.remove(obj_anterior)
    
    # Crear mesh del suelo
    mesh = bpy.data.meshes.new(name="FloorMesh")
    obj = bpy.data.objects.new("Floor", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Crear bmesh
    bm = bmesh.new()
    
    # Crear un plano grande
    # Por defecto create_grid crea un plano en el plano XY (normal hacia Z positivo)
    # Como el eje vertical es Z, el suelo debe estar en XY (horizontal), así que NO necesita rotación
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=tamaño)
    
    # Asegurar que los vértices estén indexados
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    
    # Mover a la altura correcta (en Z, que es el eje vertical en Blender)
    # El plano ya está en XY, solo lo movemos en Z
    bmesh.ops.translate(bm, vec=(0, 0, altura), verts=bm.verts)
    
    # Actualizar mesh
    bm.to_mesh(mesh)
    bm.free()
    
    # Aplicar material gris para visualización
    mat = bpy.data.materials.new(name="FloorMaterial")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (0.5, 0.5, 0.5, 1.0)
    obj.data.materials.append(mat)
    
    return obj


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
    
    # CRÍTICO: Bloquear partículas ANTES de crear constraints
    # Esto asegura que las distancias iniciales de las constraints sean correctas
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
    
    # Crear restricciones (DESPUÉS de bloquear partículas)
    from constraints.DistanceConstraint import DistanceConstraint
    
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
    
    # CRÍTICO: Período de "warm-up" para estabilizar la tela antes de guardar frames
    # Esto evita el comportamiento explosivo al principio
    warmup_frames = 20  # Número de frames de estabilización
    print(f"\n   🔥 Ejecutando {warmup_frames} frames de warm-up para estabilización...")
    
    for warmup in range(warmup_frames):
        # Resetear fuerzas
        for particle in system.particles:
            particle.force = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Aplicar gravedad (gradualmente al principio para suavizar)
        gravity_factor = min(1.0, (warmup + 1) / 10.0)  # Aumentar gradualmente
        gravity = mathutils.Vector((0.0, 0.0, gravity_value * gravity_factor))
        for particle in system.particles:
            if not particle.bloqueada:
                particle.force += gravity * particle.masa
        
        # Aplicar viento (solo después de algunos frames)
        if warmup > 5 and wind_base.length > 0.001:
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
            wind_factor = min(1.0, (warmup - 5) / 10.0)  # Aumentar gradualmente
            for particle in system.particles:
                if not particle.bloqueada:
                    wind_force = wind * area_per_particle * 0.1 * wind_factor
                    particle.force += wind_force
        
        # Ejecutar solver
        try:
            system.run(DT, apply_damping=True, use_plane_col=False, use_sphere_col=False, use_shape_matching=False)
        except TypeError:
            system.run(DT, apply_damping=True, use_plane_col=False, use_sphere_col=False, use_shape_matching=False)
    
    print(f"   ✅ Warm-up completado. La tela debería estar estabilizada.\n")
    
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
# FUNCIÓN DE SIMULACIÓN DE CUBO VOLUMEN
# ============================================
def simular_cubo_volumen(context):
    """Simular cubo con restricciones de volumen y guardar en Shape Keys"""
    scene = context.scene
    
    # Obtener parámetros
    lado = scene.pbd_cube_side
    densidad = scene.pbd_cube_density
    stiffness_volumen = scene.pbd_cube_volume_stiffness
    # CRÍTICO: Si el usuario marca "Usar Volumen Global", aplicar un mínimo para evitar colapso completo
    # Un stiffness muy bajo (cercano a 0) hace que la restricción apenas tenga efecto
    if scene.pbd_cube_use_global_volume:
        stiffness_global_raw = scene.pbd_cube_global_volume_stiffness
        # Aplicar valor mínimo de 0.05 si el stiffness es muy bajo
        # Esto evita que el cubo se colapse completamente mientras permite que sea más blando
        stiffness_global_min = 0.05
        if stiffness_global_raw < stiffness_global_min:
            print(f"   ⚠️ ADVERTENCIA: Stiffness global ({stiffness_global_raw}) es muy bajo.")
            print(f"   ⚠️ Aplicando valor mínimo ({stiffness_global_min}) para evitar colapso completo.")
            print(f"   💡 Para un cubo más blando, usa valores entre 0.1 y 0.3")
            stiffness_global = stiffness_global_min
        else:
            stiffness_global = stiffness_global_raw
    else:
        stiffness_global = None
    solver_iterations = scene.pbd_cloth_solver_iterations
    num_frames = scene.pbd_cloth_num_frames
    DT = 1.0 / 60.0
    gravity_value = scene.pbd_cloth_gravity
    floor_height = scene.pbd_floor_height if scene.pbd_floor_enabled else None
    start_height = scene.pbd_cube_start_height
    
    print("\n" + "=" * 60)
    print("🎬 INICIANDO SIMULACIÓN CUBO VOLUMEN")
    print("=" * 60)
    print(f"   Lado del cubo: {lado}m")
    print(f"   Densidad: {densidad} kg/m³")
    print(f"   Stiffness volumen: {stiffness_volumen}")
    if stiffness_global is not None:
        stiffness_global_raw = scene.pbd_cube_global_volume_stiffness if scene.pbd_cube_use_global_volume else None
        if stiffness_global_raw is not None and stiffness_global_raw < 0.05:
            print(f"   Stiffness volumen global: {stiffness_global} (ajustado desde {stiffness_global_raw} para evitar colapso)")
        else:
            print(f"   Stiffness volumen global: {stiffness_global}")
    else:
        print(f"   Stiffness volumen global: NO activo")
    print(f"   Frames: {num_frames}")
    print(f"   Iteraciones solver: {solver_iterations}")
    if floor_height is not None:
        print(f"   Suelo habilitado a altura: {floor_height}m")
        print(f"   Altura inicial cubo: {start_height}m")
    
    # Obtener número de subdivisiones
    subdivisiones = scene.pbd_cube_subdivisions
    
    # ===== PASO 1: Eliminar objeto anterior COMPLETAMENTE (incluyendo mesh y Shape Keys) =====
    # Esto es CRÍTICO para evitar que datos de ejecuciones anteriores interfieran
    obj_anterior = bpy.data.objects.get("VolumeCube")
    if obj_anterior:
        # Eliminar Shape Keys primero
        if obj_anterior.data.shape_keys:
            print(f"   🗑️ Eliminando {len(obj_anterior.data.shape_keys.key_blocks)} Shape Keys del objeto anterior...")
            while obj_anterior.data.shape_keys and len(obj_anterior.data.shape_keys.key_blocks) > 0:
                obj_anterior.shape_key_remove(obj_anterior.active_shape_key)
        
        # Desvincular objeto de la colección
        for collection in obj_anterior.users_collection:
            collection.objects.unlink(obj_anterior)
        
        # Eliminar objeto y mesh
        mesh_anterior = obj_anterior.data
        bpy.data.objects.remove(obj_anterior)
        if mesh_anterior:
            bpy.data.meshes.remove(mesh_anterior)
        
        print(f"   ✓ Objeto anterior completamente eliminado")
    
    # ===== PASO 2: Importar y recargar módulos =====
    import sys
    import importlib
    
    print(f"\n{'='*60}")
    print(f"🔍 DEBUG: INICIO DE EJECUCIÓN - Estado inicial")
    print(f"{'='*60}")
    print(f"   📊 Módulos cargados antes de recargar:")
    modules_antes = [m for m in sys.modules.keys() if any(x in m for x in ['CuboVolumen', 'VolumeConstraint', 'PBDSystem', 'Particle', 'Distance', 'Bending'])]
    for m in sorted(modules_antes):
        print(f"      - {m}")
    
    # Recargar módulos si ya están cargados (evitar caché)
    # CRÍTICO: Recargar TODOS los módulos relacionados, incluso si no están en sys.modules
    # Esto asegura que los cambios en el código se reflejen en Blender
    modules_to_reload = ['CuboVolumen', 'VolumeConstraintTet', 'VolumeConstraintGlobal', 'DistanceConstraint', 'BendingConstraint', 'PBDSystem', 'Particle', 'Constraint']
    
    # Primero, eliminar los módulos de sys.modules si existen
    for module_name in modules_to_reload:
        if module_name in sys.modules:
            print(f"   🔄 DEBUG: Eliminando módulo '{module_name}' de sys.modules...")
            del sys.modules[module_name]
            print(f"   ✓ Módulo '{module_name}' eliminado")
        else:
            print(f"   📝 DEBUG: Módulo '{module_name}' no estaba en sys.modules")
    
    # Ahora importar los módulos frescos (sin caché)
    print(f"\n   🔄 Importando módulos frescos (sin caché)...")
    from geometry.CuboVolumen import crear_cubo_volumen, calcular_volumen_tetraedro
    from constraints.VolumeConstraintTet import VolumeConstraintTet
    from constraints.VolumeConstraintGlobal import VolumeConstraintGlobal
    from constraints.DistanceConstraint import DistanceConstraint
    from constraints.BendingConstraint import BendingConstraint
    
    print(f"   ✓ Módulos importados correctamente (sin caché)")
    
    # ===== PASO 3: Crear sistema PBD PRIMERO (antes del mesh de Blender) =====
    # CRÍTICO: Los V0 se calculan dentro de crear_cubo_volumen con las posiciones iniciales
    # Si movemos el cubo después, los V0 serán incorrectos y causarán deformación inmediata
    print(f"\n{'='*60}")
    print(f"🔍 DEBUG: CREANDO SISTEMA PBD")
    print(f"{'='*60}")
    print(f"   📦 Creando sistema PBD con {subdivisiones}x{subdivisiones}x{subdivisiones} subdivisiones...")
    print(f"   📊 Parámetros: lado={lado}, densidad={densidad}, stiffness_vol={stiffness_volumen}, stiffness_glob={stiffness_global}")
    
    # CRÍTICO: Verificar que crear_cubo_volumen retorna 6 valores
    # Si retorna menos, significa que el módulo no se recargó correctamente
    resultado = crear_cubo_volumen(
        lado, densidad, stiffness_volumen, stiffness_global, subdivisiones
    )
    
    # Verificar número de valores retornados
    if len(resultado) == 6:
        system, volume_constraints, global_constraint, distance_constraints, bending_constraints, diagonal_constraints = resultado
        print(f"   ✓ Sistema PBD creado con {len(distance_constraints)} restricciones de distancia, {len(bending_constraints)} de bending y {len(diagonal_constraints)} diagonales")
    elif len(resultado) == 5:
        # Fallback: versión sin diagonales
        system, volume_constraints, global_constraint, distance_constraints, bending_constraints = resultado
        diagonal_constraints = []
        print(f"   ⚠️ ADVERTENCIA: crear_cubo_volumen retornó solo 5 valores (sin diagonales)")
        print(f"   ✓ Sistema PBD creado con {len(distance_constraints)} restricciones de distancia y {len(bending_constraints)} restricciones de bending")
    elif len(resultado) == 4:
        # Fallback: versión sin bending ni diagonales
        system, volume_constraints, global_constraint, distance_constraints = resultado
        bending_constraints = []
        diagonal_constraints = []
        print(f"   ⚠️ ADVERTENCIA: crear_cubo_volumen retornó solo 4 valores (sin bending ni diagonales)")
        print(f"   ✓ Sistema PBD creado con {len(distance_constraints)} restricciones de distancia")
    elif len(resultado) == 3:
        # Fallback: módulo antiguo, crear listas vacías
        system, volume_constraints, global_constraint = resultado
        distance_constraints = []
        bending_constraints = []
        diagonal_constraints = []
        print(f"   ⚠️ ADVERTENCIA: crear_cubo_volumen retornó solo 3 valores (módulo no recargado)")
        print(f"   ⚠️ Las restricciones de distancia, bending y diagonales no estarán disponibles")
    else:
        raise ValueError(f"crear_cubo_volumen retornó {len(resultado)} valores, se esperaban 3, 4, 5 o 6")
    system.set_n_iters(solver_iterations)
    
    print(f"\n   🔍 DEBUG: Sistema PBD creado")
    print(f"      - Partículas: {len(system.particles)}")
    print(f"      - Restricciones totales: {len(system.constraints)}")
    print(f"      - Restricciones de volumen: {len(volume_constraints)}")
    print(f"      - Restricciones de distancia: {len(distance_constraints)}")
    print(f"      - Restricciones de bending: {len(bending_constraints)}")
    print(f"      - Restricciones diagonales: {len(diagonal_constraints)}")
    if global_constraint:
        print(f"      - Restricción global: SÍ (V0={global_constraint.V0:.6f})")
    else:
        print(f"      - Restricción global: NO")
    
    # DEBUG: Verificar estado inicial de las primeras 3 partículas
    print(f"\n   🔍 DEBUG: Estado inicial de primeras 3 partículas:")
    for i in range(min(3, len(system.particles))):
        p = system.particles[i]
        print(f"      Partícula {i}:")
        print(f"         location: ({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f})")
        print(f"         last_location: ({p.last_location.x:.6f}, {p.last_location.y:.6f}, {p.last_location.z:.6f})")
        print(f"         velocity: ({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
        print(f"         force: ({p.force.x:.6f}, {p.force.y:.6f}, {p.force.z:.6f})")
        print(f"         masa: {p.masa:.6f}, w: {p.w:.6f}, bloqueada: {p.bloqueada}")
    
    # DEBUG: Verificar V0 de las primeras 3 restricciones de volumen
    print(f"\n   🔍 DEBUG: V0 de primeras 3 restricciones de volumen:")
    for i in range(min(3, len(volume_constraints))):
        c = volume_constraints[i]
        print(f"      Constraint {i}: V0={c.V0:.6f}, stiffness={c.stiffness:.4f}, k_coef={c.k_coef:.4f}")
    
    # DEBUG: Verificar dist0 de las primeras 3 restricciones de distancia
    if len(distance_constraints) > 0:
        print(f"\n   🔍 DEBUG: dist0 de primeras 3 restricciones de distancia:")
        for i in range(min(3, len(distance_constraints))):
            c = distance_constraints[i]
            p0, p1 = c.particles
            dist_actual = (p1.location - p0.location).length
            print(f"      Constraint {i}: dist0={c.d:.6f}, dist_actual={dist_actual:.6f}, stiffness={c.stiffness:.4f}")
    else:
        print(f"\n   ⚠️ DEBUG: No hay restricciones de distancia disponibles")
    
    # DEBUG: Verificar phi0 de las primeras 3 restricciones de bending
    if len(bending_constraints) > 0:
        print(f"\n   🔍 DEBUG: phi0 de primeras 3 restricciones de bending:")
        for i in range(min(3, len(bending_constraints))):
            c = bending_constraints[i]
    else:
        print(f"\n   ⚠️ DEBUG: No hay restricciones de bending disponibles")
    
    # ===== PASO 4: CRÍTICO - Posicionar cubo a la altura inicial Y RECALCULAR V0 =====
    # En Blender, Z es el eje vertical, así que movemos en Z
    # IMPORTANTE: Después de mover, debemos recalcular los V0 porque las posiciones cambiaron
    print(f"\n{'='*60}")
    print(f"🔍 DEBUG: MOVIENDO CUBO A ALTURA INICIAL")
    print(f"{'='*60}")
    print(f"   📊 Antes de mover - primeras 3 partículas:")
    for i in range(min(3, len(system.particles))):
        p = system.particles[i]
        print(f"      Partícula {i}: Z={p.location.z:.6f}")
    
    offset_z = start_height - (lado / 2.0)  # Ajustar para que el cubo esté a start_height en Z
    print(f"   📊 offset_z calculado: {offset_z:.6f} (start_height={start_height}, lado/2={lado/2.0})")
    
    for i, particle in enumerate(system.particles):
        z_antes = particle.location.z
        particle.location.z += offset_z
        particle.last_location = mathutils.Vector(particle.location)  # Copiar, no referenciar
        # DEBUG: Verificar primeras 3
        if i < 3:
            print(f"      Partícula {i}: Z {z_antes:.6f} -> {particle.location.z:.6f} (offset={offset_z:.6f})")
    
    print(f"   ✓ Cubo movido a altura {start_height}m")
    
    # RECALCULAR V0 después de mover el cubo
    # Esto es CRÍTICO: los V0 deben corresponder a las posiciones finales
    print(f"\n{'='*60}")
    print(f"🔍 DEBUG: RECALCULANDO V0 DESPUÉS DE MOVER")
    print(f"{'='*60}")
    print(f"   🔄 Recalculando V0 después de mover cubo a altura {start_height}m...")
    
    # DEBUG: Mostrar V0 ANTES de recalcular (primeras 3)
    print(f"\n   🔍 DEBUG: V0 ANTES de recalcular (primeras 3):")
    for i in range(min(3, len(volume_constraints))):
        c = volume_constraints[i]
        print(f"      Constraint {i}: V0_antes={c.V0:.6f}")
    
    v0_cambios = 0
    v0_sin_cambios = 0
    for i, constraint in enumerate(volume_constraints):
        p0, p1, p2, p3 = constraint.particles
        # Calcular nuevo V0 con las posiciones actuales
        V0_antes = constraint.V0
        V0_nuevo = calcular_volumen_tetraedro(
            p0.location, p1.location, p2.location, p3.location
        )
        if V0_nuevo > 1e-6:
            if abs(V0_nuevo - V0_antes) > 1e-6:
                v0_cambios += 1
                if i < 3:
                    print(f"      Constraint {i}: V0 {V0_antes:.6f} -> {V0_nuevo:.6f} (cambió)")
            else:
                v0_sin_cambios += 1
            constraint.V0 = V0_nuevo
        else:
            print(f"   ⚠️ Advertencia: V0 negativo o muy pequeño después de mover: {V0_nuevo}")
    
    print(f"   📊 V0 recalculados: {v0_cambios} cambiaron, {v0_sin_cambios} sin cambios")
    
    # DEBUG: Mostrar V0 DESPUÉS de recalcular (primeras 3)
    print(f"\n   🔍 DEBUG: V0 DESPUÉS de recalcular (primeras 3):")
    for i in range(min(3, len(volume_constraints))):
        c = volume_constraints[i]
        print(f"      Constraint {i}: V0_despues={c.V0:.6f}")
    
    # Recalcular V0 global si existe
    if global_constraint:
        from geometry.CuboVolumen import generar_triangulos_cubo_subdividido
        triangulos = generar_triangulos_cubo_subdividido(subdivisiones)
        V0_global_nuevo = 0.0
        for tri in triangulos:
            i0, i1, i2 = tri
            if i0 >= len(system.particles) or i1 >= len(system.particles) or i2 >= len(system.particles):
                continue
            p0 = system.particles[i0]
            p1 = system.particles[i1]
            p2 = system.particles[i2]
            cross_p0_p1 = mathutils.Vector.cross(p0.location, p1.location)
            V_tri = mathutils.Vector.dot(cross_p0_p1, p2.location) / 6.0
            V0_global_nuevo += V_tri
        global_constraint.V0 = V0_global_nuevo
        print(f"   ✓ V0 global recalculado: {V0_global_nuevo:.6f}")
    
    # RECALCULAR dist0 para restricciones de distancia después de mover el cubo
    # Esto es CRÍTICO: las distancias de reposo deben corresponder a las posiciones finales
    if len(distance_constraints) > 0:
        print(f"\n{'='*60}")
        print(f"🔍 DEBUG: RECALCULANDO DISTANCIAS DESPUÉS DE MOVER")
        print(f"{'='*60}")
        print(f"   🔄 Recalculando dist0 después de mover cubo a altura {start_height}m...")
        
        dist_cambios = 0
        dist_sin_cambios = 0
        for i, constraint in enumerate(distance_constraints):
            p0, p1 = constraint.particles
            # Calcular nueva distancia de reposo con las posiciones actuales
            dist_antes = constraint.d
            dist_nueva = (p1.location - p0.location).length
            if dist_nueva > 1e-6:
                if abs(dist_nueva - dist_antes) > 1e-6:
                    dist_cambios += 1
                    if i < 3:
                        print(f"      Constraint {i}: dist0 {dist_antes:.6f} -> {dist_nueva:.6f} (cambió)")
                else:
                    dist_sin_cambios += 1
                constraint.d = dist_nueva
            else:
                print(f"   ⚠️ Advertencia: Distancia muy pequeña después de mover: {dist_nueva}")
        
        print(f"   📊 Distancias recalculadas: {dist_cambios} cambiaron, {dist_sin_cambios} sin cambios")
    else:
        print(f"   ⚠️ No hay restricciones de distancia para recalcular")
    
    # RECALCULAR dist0 para restricciones diagonales después de mover el cubo
    # Esto es CRÍTICO: las distancias de reposo deben corresponder a las posiciones finales
    if len(diagonal_constraints) > 0:
        print(f"\n{'='*60}")
        print(f"🔍 DEBUG: RECALCULANDO DISTANCIAS DIAGONALES DESPUÉS DE MOVER")
        print(f"{'='*60}")
        print(f"   🔄 Recalculando dist0 diagonales después de mover cubo a altura {start_height}m...")
        
        diag_cambios = 0
        diag_sin_cambios = 0
        for i, constraint in enumerate(diagonal_constraints):
            p0, p1 = constraint.particles
            # Calcular nueva distancia de reposo con las posiciones actuales
            dist_antes = constraint.d
            dist_nueva = (p1.location - p0.location).length
            if dist_nueva > 1e-6:
                if abs(dist_nueva - dist_antes) > 1e-6:
                    diag_cambios += 1
                    if i < 3:
                        print(f"      Diagonal Constraint {i}: dist0 {dist_antes:.6f} -> {dist_nueva:.6f} (cambió)")
                else:
                    diag_sin_cambios += 1
                constraint.d = dist_nueva
            else:
                print(f"   ⚠️ Advertencia: Distancia diagonal muy pequeña después de mover: {dist_nueva}")
        
        print(f"   📊 Distancias diagonales recalculadas: {diag_cambios} cambiaron, {diag_sin_cambios} sin cambios")
        print(f"   ✓ Cubo posicionado a altura inicial: {start_height}m (V0, dist0 y diagonales recalculadas)")
    else:
        print(f"   ⚠️ No hay restricciones diagonales para recalcular")
        print(f"   ✓ Cubo posicionado a altura inicial: {start_height}m (V0 y dist0 recalculados)")
    
    # RECALCULAR phi0 para restricciones de bending después de mover el cubo
    # Esto es CRÍTICO: los ángulos de reposo deben corresponder a las posiciones finales
    if len(bending_constraints) > 0:
        print(f"\n{'='*60}")
        print(f"🔍 DEBUG: RECALCULANDO ÁNGULOS DE BENDING DESPUÉS DE MOVER")
        print(f"{'='*60}")
        print(f"   🔄 Recalculando phi0 después de mover cubo a altura {start_height}m...")
        
        phi_cambios = 0
        phi_sin_cambios = 0
        for i, constraint in enumerate(bending_constraints):
            p1, p2, p3, p4 = constraint.particles
            # Calcular nuevo phi0 con las posiciones actuales
            phi0_antes = constraint.phi0
            
            e1 = p2.location - p1.location
            e2 = p3.location - p1.location
            e3 = p4.location - p1.location
            
            n1 = mathutils.Vector.cross(e1, e2)
            n2 = mathutils.Vector.cross(e1, e3)
            
            len_n1 = n1.length
            len_n2 = n2.length
            
            # Evitar normales degeneradas
            if len_n1 < 1e-6 or len_n2 < 1e-6:
                constraint.phi0 = 0.087  # ~5 grados por defecto
            else:
                n1 = n1.normalized()
                n2 = n2.normalized()
                
                d = n1.dot(n2)
                d = max(-1.0, min(1.0, d))
                
                # Si d está muy cerca de 1.0, usar un valor por defecto
                if abs(d - 1.0) < 1e-6:
                    constraint.phi0 = 0.087  # ~5 grados
                else:
                    constraint.phi0 = math.acos(d)
            
            if abs(constraint.phi0 - phi0_antes) > 1e-6:
                phi_cambios += 1
                if i < 3:
                    print(f"      Constraint {i}: phi0 {phi0_antes:.6f} -> {constraint.phi0:.6f} rad (cambió)")
            else:
                phi_sin_cambios += 1
        
        print(f"   📊 Ángulos de bending recalculados: {phi_cambios} cambiaron, {phi_sin_cambios} sin cambios")
        print(f"   ✓ Cubo posicionado a altura inicial: {start_height}m (V0, dist0, diagonales y phi0 recalculados)")
    else:
        print(f"   ⚠️ No hay restricciones de bending para recalcular")
        print(f"   ✓ Cubo posicionado a altura inicial: {start_height}m (V0, dist0 y diagonales recalculadas)")
    
    # ===== PASO 5: Crear mesh de Blender usando las posiciones de las partículas =====
    # Esto asegura que el mesh coincida exactamente con las partículas del sistema PBD
    obj = crear_malla_cubo_blender(lado, subdivisiones)
    
    # Sincronizar posiciones del mesh con las partículas del sistema PBD
    # Esto es crítico para que el mesh inicial coincida con las partículas
    if len(obj.data.vertices) == len(system.particles):
        for i, vertex in enumerate(obj.data.vertices):
            vertex.co = system.particles[i].location
        obj.data.update()
        print(f"   ✓ Mesh sincronizado con posiciones de partículas")
    else:
        print(f"   ⚠️ Advertencia: Número de vértices del mesh ({len(obj.data.vertices)}) no coincide con partículas ({len(system.particles)})")
    
    # ===== PASO 6: Crear suelo si está habilitado =====
    if scene.pbd_floor_enabled:
        crear_suelo_blender(floor_height)
        print(f"   ✓ Suelo creado a altura {floor_height}m")
    
    # ===== PASO 7: Añadir debugId a las partículas =====
    for i in range(len(system.particles)):
        system.particles[i].debugId = i
    
    # ===== PASO 8: Crear Shape Key base (Basis) =====
    # Asegurar que no hay Shape Keys antes de crear el Basis
    if obj.data.shape_keys:
        print(f"   🗑️ Eliminando Shape Keys residuales...")
        while obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 0:
            obj.shape_key_remove(obj.active_shape_key)
    
    # Crear Shape Key base (Basis) con las posiciones actuales
    obj.shape_key_add(name="Basis")
    print(f"   ✓ Shape Key 'Basis' creado")
    
    # Marcar como simulando
    scene.pbd_cloth_is_simulating = True
    
    # Variables para logs de volumen
    print(f"\n{'='*60}")
    print(f"🔍 DEBUG: PREPARANDO VARIABLES PARA SIMULACIÓN")
    print(f"{'='*60}")
    
    volumenes_iniciales = []
    for constraint in volume_constraints:
        # CRÍTICO: Usar V0 de la constraint, NO recalcular desde posiciones
        # Esto asegura que usamos el valor correcto después de mover el cubo
        volumenes_iniciales.append(constraint.V0)
    
    print(f"   📊 Volúmenes iniciales almacenados: {len(volumenes_iniciales)}")
    print(f"   🔍 DEBUG: Primeros 3 V0 almacenados:")
    for i in range(min(3, len(volumenes_iniciales))):
        print(f"      V0[{i}]={volumenes_iniciales[i]:.6f} (de constraint.V0)")
    
    volumen_global_inicial = None
    if global_constraint:
        volumen_global_inicial = global_constraint.V0  # Usar V0 de la constraint, no recalcular
        print(f"   📊 Volumen global inicial: {volumen_global_inicial:.6f} (de constraint.V0)")
    else:
        print(f"   📊 Volumen global: NO activo")
    
    try:
        # DEBUG: Estado antes de empezar la simulación
        print(f"\n{'='*60}")
        print(f"🔍 DEBUG: ESTADO ANTES DE SIMULACIÓN (Frame 0)")
        print(f"{'='*60}")
        print(f"   📊 Partículas: {len(system.particles)}")
        print(f"   📊 Restricciones: {len(system.constraints)}")
        print(f"   📊 Primeras 3 partículas antes de Frame 1:")
        for i in range(min(3, len(system.particles))):
            p = system.particles[i]
            print(f"      Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                  f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f}), "
                  f"force=({p.force.x:.6f}, {p.force.y:.6f}, {p.force.z:.6f})")
        print(f"   📊 Primeras 3 V0 antes de Frame 1:")
        for i in range(min(3, len(volume_constraints))):
            print(f"      V0[{i}]={volume_constraints[i].V0:.6f}")
        if len(distance_constraints) > 0:
            print(f"   📊 Primeras 3 dist0 antes de Frame 1:")
            for i in range(min(3, len(distance_constraints))):
                c = distance_constraints[i]
                p0, p1 = c.particles
                dist_actual = (p1.location - p0.location).length
                print(f"      dist0[{i}]={c.d:.6f}, dist_actual={dist_actual:.6f}, diff={abs(dist_actual - c.d):.6f}")
        else:
            print(f"   ⚠️ No hay restricciones de distancia disponibles")
        
        # Simular frame por frame
        for frame in range(1, num_frames + 1):
            # DEBUG: Estado al inicio de cada frame (solo primeros 3 frames)
            if frame <= 3:
                print(f"\n{'='*60}")
                print(f"🔍 DEBUG: INICIO FRAME {frame}")
                print(f"{'='*60}")
                print(f"   📊 Primeras 3 partículas al INICIO del frame:")
                for i in range(min(3, len(system.particles))):
                    p = system.particles[i]
                    print(f"      Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                          f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
            
            # Resetear fuerzas
            for particle in system.particles:
                particle.force = mathutils.Vector((0.0, 0.0, 0.0))
            
            # Aplicar gravedad (en dirección Z negativo para que caiga hacia abajo)
            # En Blender, Z es el eje vertical (arriba/abajo)
            gravity = mathutils.Vector((0.0, 0.0, gravity_value))  # gravity_value negativo = hacia abajo
            for particle in system.particles:
                if not particle.bloqueada:
                    particle.force += gravity * particle.masa
            
            # DEBUG: Estado antes de ejecutar solver (solo primeros 3 frames)
            if frame <= 3:
                print(f"   📊 Primeras 3 partículas ANTES del solver:")
                for i in range(min(3, len(system.particles))):
                    p = system.particles[i]
                    print(f"      Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                          f"force=({p.force.x:.6f}, {p.force.y:.6f}, {p.force.z:.6f})")
            
            # Ejecutar solver PBD
            try:
                system.run(DT, apply_damping=True, use_plane_col=True, use_sphere_col=False, 
                          use_shape_matching=False, debug_frame=frame if frame <= 3 else None,
                          floor_height=floor_height)
            except TypeError:
                # Versión sin floor_height
                system.run(DT, apply_damping=True, use_plane_col=True, use_sphere_col=False, 
                          use_shape_matching=False)
                # Aplicar colisión con suelo manualmente
                if floor_height is not None:
                    # Verificar que el método existe antes de llamarlo
                    if hasattr(system, 'projectFloorCollision'):
                        system.projectFloorCollision(DT, floor_height)
                    else:
                        # Fallback: aplicar colisión manualmente
                        for particle in system.particles:
                            if not particle.bloqueada and particle.location.z < floor_height:
                                particle.location.z = floor_height
                                if particle.velocity.z < 0:
                                    restitution = 0.3
                                    particle.velocity.z = -particle.velocity.z * restitution
                                    friction = 0.8
                                    particle.velocity.x *= friction
                                    particle.velocity.y *= friction
            
            # DEBUG: Estado después de ejecutar solver (solo primeros 3 frames)
            if frame <= 3:
                print(f"   📊 Primeras 3 partículas DESPUÉS del solver:")
                for i in range(min(3, len(system.particles))):
                    p = system.particles[i]
                    print(f"      Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                          f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
                print(f"   📊 Primeras 3 V0 DESPUÉS del solver:")
                for i in range(min(3, len(volume_constraints))):
                    print(f"      V0[{i}]={volume_constraints[i].V0:.6f} (debe ser igual al inicial)")
                if len(distance_constraints) > 0:
                    print(f"   📊 Primeras 3 dist0 DESPUÉS del solver:")
                    for i in range(min(3, len(distance_constraints))):
                        c = distance_constraints[i]
                        p0, p1 = c.particles
                        dist_actual = (p1.location - p0.location).length
                        print(f"      dist0[{i}]={c.d:.6f}, dist_actual={dist_actual:.6f}, diff={abs(dist_actual - c.d):.6f}")
                else:
                    print(f"   ⚠️ No hay restricciones de distancia disponibles")
            
            # Log de volúmenes (cada 10 frames o primeros 3)
            if frame <= 3 or frame % 10 == 0:
                # Calcular volúmenes actuales
                volumenes_actuales = []
                for i, constraint in enumerate(volume_constraints):
                    p0, p1, p2, p3 = constraint.particles
                    e1 = p1.location - p0.location
                    e2 = p2.location - p0.location
                    e3 = p3.location - p0.location
                    cross_e1_e2 = mathutils.Vector.cross(e1, e2)
                    V = mathutils.Vector.dot(cross_e1_e2, e3) / 6.0
                    volumenes_actuales.append(V)
                    
                    if i < 3:  # Log de primeros 3 tetraedros
                        V0 = volumenes_iniciales[i]
                        ratio = V / V0 if abs(V0) > 0.0001 else 0.0
                        print(f"   📊 Frame {frame}, Tetra {i}: V/V0 = {ratio:.6f} (V={V:.6f}, V0={V0:.6f})")
                
                # Volumen global si está activo
                if global_constraint:
                    V_global = global_constraint.calcular_volumen()
                    ratio_global = V_global / volumen_global_inicial if abs(volumen_global_inicial) > 0.0001 else 0.0
                    print(f"   📊 Frame {frame}, Volumen Global: V/V0 = {ratio_global:.6f}")
            
            # Actualizar mesh base con las posiciones actuales (para visualización en tiempo real)
            # CRÍTICO: Validar posiciones antes de actualizar el mesh
            for i, vertex in enumerate(obj.data.vertices):
                if i < len(system.particles):
                    pos = system.particles[i].location
                    # Validar que la posición es válida antes de actualizar
                    if (isinstance(pos.x, (int, float)) and isinstance(pos.y, (int, float)) and isinstance(pos.z, (int, float)) and
                        not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z)) and
                        not (math.isinf(pos.x) or math.isinf(pos.y) or math.isinf(pos.z))):
                        vertex.co = mathutils.Vector((pos.x, pos.y, pos.z))
                    # Si es inválida, mantener la posición anterior del vértice
            obj.data.update()
            
            # Crear Shape Key para este frame
            shape_key_name = f"sim_{frame:04d}"
            shape_key = obj.shape_key_add(name=shape_key_name)
            
            # Actualizar posiciones de vértices en el Shape Key
            # CRÍTICO: Validar que todas las posiciones sean válidas antes de guardar
            # Si hay NaN o Inf, usar la posición del Basis o del mesh base
            vertices_actualizados = 0
            vertices_invalidos = 0
            
            # Obtener posiciones del Basis como respaldo (solo una vez, fuera del bucle)
            basis_positions = None
            if obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 0:
                try:
                    basis = obj.data.shape_keys.key_blocks[0]
                    if len(basis.data) == len(obj.data.vertices):
                        basis_positions = [mathutils.Vector(basis.data[i].co) for i in range(len(basis.data))]
                except:
                    pass  # Si falla, usar mesh base como respaldo
            
            for i, vertex in enumerate(obj.data.vertices):
                if i < len(system.particles):
                    pos = system.particles[i].location
                    
                    # CRÍTICO: Validar que la posición es válida (no NaN, no Inf)
                    try:
                        is_valid = (
                            isinstance(pos.x, (int, float)) and 
                            isinstance(pos.y, (int, float)) and 
                            isinstance(pos.z, (int, float)) and
                            not (math.isnan(pos.x) or math.isnan(pos.y) or math.isnan(pos.z)) and
                            not (math.isinf(pos.x) or math.isinf(pos.y) or math.isinf(pos.z))
                        )
                    except:
                        is_valid = False
                    
                    if is_valid:
                        # Guardar posición válida
                        shape_key.data[i].co = mathutils.Vector((pos.x, pos.y, pos.z))
                        vertices_actualizados += 1
                    else:
                        # CRÍTICO: Si la posición es inválida, usar respaldo
                        vertices_invalidos += 1
                        if basis_positions is not None and i < len(basis_positions):
                            # Usar posición del Basis
                            shape_key.data[i].co = mathutils.Vector(basis_positions[i])
                        else:
                            # Último recurso: usar posición del mesh base
                            shape_key.data[i].co = mathutils.Vector(vertex.co)
            
            # Log de advertencia solo si hay vértices inválidos (reducir frecuencia de logs)
            if vertices_invalidos > 0 and (frame <= 3 or frame % 20 == 0):
                print(f"   ⚠️ Frame {frame}: {vertices_invalidos} vértices con posiciones inválidas (NaN/Inf), se usaron respaldos")
            
            # Log de progreso
            if frame == 1 or frame % 10 == 0:
                progreso = (frame / num_frames) * 100
                print(f"   ✅ Frame {frame}/{num_frames} ({progreso:.1f}%) - Shape Key '{shape_key_name}' creado")
        
        print(f"\n   ✅ Simulación completada: {num_frames} frames")
        
        # Crear animación con keyframes
        crear_animacion_shapekeys(obj, num_frames)
        
        print(f"\n   ✅ Animación creada con keyframes")
        
    except Exception as e:
        print(f"\n   ❌ ERROR durante la simulación: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        scene.pbd_cloth_is_simulating = False
        
        # DEBUG: Estado final del sistema
        print(f"\n{'='*60}")
        print(f"🔍 DEBUG: ESTADO FINAL DESPUÉS DE SIMULACIÓN")
        print(f"{'='*60}")
        if 'system' in locals():
            print(f"   📊 Partículas: {len(system.particles)}")
            print(f"   📊 Restricciones: {len(system.constraints)}")
            print(f"   📊 Primeras 3 partículas al FINAL:")
            for i in range(min(3, len(system.particles))):
                p = system.particles[i]
                print(f"      Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                      f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
            print(f"   📊 Primeras 3 V0 al FINAL:")
            if 'volume_constraints' in locals():
                for i in range(min(3, len(volume_constraints))):
                    print(f"      V0[{i}]={volume_constraints[i].V0:.6f}")
        
        print(f"\n   ✅ Flag de simulación reseteado")


# ============================================
# REGISTRO DE CLASES
# ============================================
classes = [
    PBD_CLOTH_PT_Panel,
    PBD_CLOTH_OT_SimularShapeKeys,
    PBD_CLOTH_OT_ResetSimulando,
    PBD_CLOTH_OT_DiagnosticarKeyframes,
    PBD_CLOTH_OT_ForzarActualizacion,
    PBD_CLOTH_OT_SimularCuboVolumen
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

