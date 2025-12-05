"""
Script principal de Blender para simular una tela con PBD
Este script crea una tela con 3 tipos de restricciones y la visualiza en Blender

INSTRUCCIONES:
1. Abre Blender
2. Ve a Scripting workspace
3. Abre este archivo
4. Asegúrate de que todos los módulos Python estén en la misma carpeta
5. Ejecuta el script (Run Script)
6. La tela aparecerá en la escena y se simulará automáticamente
"""
import bpy
import bmesh
import mathutils
import sys
import os

# Añadir la ruta del directorio actual al path de Python
# Esto permite importar los módulos PBD
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Importar módulos PBD
from Particle import Particle
from PBDSystem import PBDSystem
from Tela import crea_tela, add_bending_constraints, add_shear_constraints

# ============================================
# CONFIGURACIÓN
# ============================================
# Propiedades de la tela
ANCHO_TELA = 2.0  # metros
ALTO_TELA = 2.0   # metros
N_ANCHO_TELA = 10  # número de partículas en X (reducido para mejor performance)
N_ALTO_TELA = 10   # número de partículas en Y
DENSIDAD_TELA = 0.1  # kg/m²
STIFFNESS = 0.5  # rigidez de restricciones de distancia
BENDING_STIFFNESS = 0.1  # rigidez de restricciones de bending
SHEAR_STIFFNESS = 0.1  # rigidez de restricciones de shear

# Configuración de simulación
DT = 1.0 / 60.0  # timestep (60 FPS)
SOLVER_ITERATIONS = 5
USE_BENDING = True
USE_SHEAR = True

# Variables globales
system = None
cloth_objects = []  # Lista de objetos de Blender que representan las partículas
handler = None  # Handler para el callback de frame


# ============================================
# FUNCIONES DE VISUALIZACIÓN
# ============================================
def crear_particula_mesh(location, size=0.05):
    """
    Crear un mesh de Blender para representar una partícula
    Retorna un objeto de Blender
    """
    # Crear un mesh básico (esfera pequeña)
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=size,
        location=location
    )
    
    obj = bpy.context.active_object
    obj.name = f"Particle_{len(cloth_objects)}"
    
    # Material básico
    mat = bpy.data.materials.new(name=f"ParticleMat_{len(cloth_objects)}")
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    
    # Nodo de salida
    output = mat.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    # Nodo de Principled BSDF
    principled = mat.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = (0.2, 0.5, 1.0, 1.0)  # Azul
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.5
    
    # Conectar
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    obj.data.materials.append(mat)
    
    return obj


def crear_tela_mesh(tela):
    """
    Crear objetos de Blender para visualizar todas las partículas de la tela
    """
    global cloth_objects
    
    # Limpiar objetos anteriores si existen
    limpiar_tela()
    
    # Crear un objeto para cada partícula
    for i, particle in enumerate(tela.particles):
        obj = crear_particula_mesh(particle.location, size=0.05)
        cloth_objects.append(obj)
    
    print(f"✓ Creados {len(cloth_objects)} objetos para visualizar la tela")


def actualizar_tela_visualizacion():
    """Actualizar las posiciones de los objetos de Blender según las partículas"""
    global system, cloth_objects
    
    if system is None or len(cloth_objects) == 0:
        return
    
    for i, obj in enumerate(cloth_objects):
        if i < len(system.particles):
            # Actualizar posición del objeto
            obj.location = system.particles[i].location


def crear_malla_tela(tela, n_ancho, n_alto):
    """
    Crear un mesh de tela conectando las partículas
    Esto crea una superficie real en lugar de solo puntos
    """
    # Limpiar objetos anteriores
    limpiar_tela()
    
    # Crear un nuevo mesh
    mesh = bpy.data.meshes.new(name="ClothMesh")
    obj = bpy.data.objects.new("Cloth", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Crear bmesh
    bm = bmesh.new()
    
    # Crear vértices
    vertices = []
    for particle in tela.particles:
        v = bm.verts.new(particle.location)
        vertices.append(v)
    
    # Crear caras (quads) para la malla
    for i in range(n_ancho - 1):
        for j in range(n_alto - 1):
            # Índices de los 4 vértices del quad
            idx00 = i * n_alto + j
            idx10 = (i + 1) * n_alto + j
            idx01 = i * n_alto + (j + 1)
            idx11 = (i + 1) * n_alto + (j + 1)
            
            # Crear cara
            try:
                face = bm.faces.new([
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
    
    # Material para la tela
    mat = bpy.data.materials.new(name="ClothMaterial")
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    
    output = mat.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    principled = mat.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = (0.8, 0.8, 0.9, 1.0)  # Blanco azulado
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.7
    
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    mesh.materials.append(mat)
    
    cloth_objects.append(obj)
    
    print(f"✓ Creado mesh de tela con {len(vertices)} vértices")


def actualizar_malla_tela(tela, obj):
    """Actualizar el mesh de la tela con las nuevas posiciones de las partículas"""
    if obj is None or obj.type != 'MESH':
        return
    
    mesh = obj.data
    mesh.vertices.foreach_set("co", [coord for p in tela.particles for coord in p.location])
    mesh.update()


def limpiar_tela():
    """Eliminar todos los objetos de la tela de la escena"""
    global cloth_objects
    
    for obj in cloth_objects:
        if obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj)
    
    cloth_objects = []
    print("✓ Tela limpiada")


# ============================================
# FUNCIONES DE SIMULACIÓN
# ============================================
def inicializar_tela():
    """Crear y configurar la tela"""
    global system
    
    print("=" * 50)
    print("CREANDO TELA CON PBD")
    print("=" * 50)
    
    # Crear tela básica con restricciones de distancia
    system = crea_tela(
        ALTO_TELA,
        ANCHO_TELA,
        DENSIDAD_TELA,
        N_ALTO_TELA,
        N_ANCHO_TELA,
        STIFFNESS,
        0.05  # display_size
    )
    
    # Añadir restricciones de bending
    if USE_BENDING:
        add_bending_constraints(system, N_ALTO_TELA, N_ANCHO_TELA, BENDING_STIFFNESS)
    
    # Añadir restricciones de shear
    if USE_SHEAR:
        add_shear_constraints(system, N_ALTO_TELA, N_ANCHO_TELA, SHEAR_STIFFNESS)
    
    # Configurar solver
    system.set_n_iters(SOLVER_ITERATIONS)
    
    # Anclar la fila inferior de la tela
    anclar_base_tela()
    
    print(f"✓ Tela inicializada: {len(system.particles)} partículas, {len(system.constraints)} restricciones")
    
    # Crear visualización
    crear_malla_tela(system, N_ANCHO_TELA, N_ALTO_TELA)


def anclar_base_tela():
    """Anclar la fila inferior de la tela (simular que está colgada)"""
    global system
    
    if system is None:
        return
    
    # Anclar todas las partículas de la primera fila (j=0)
    for i in range(N_ANCHO_TELA):
        idx = i * N_ALTO_TELA  # j=0
        particle = system.particles[idx]
        particle.set_bloqueada(True)
        particle.location.z = 0  # Asegurar que estén en el plano
    
    print(f"✓ {N_ANCHO_TELA} partículas ancladas en la base")


def simular_frame(scene):
    """Callback ejecutado en cada frame de Blender"""
    global system
    
    if system is None:
        return
    
    # Aplicar gravedad
    gravity = mathutils.Vector((0.0, 0.0, -9.81))
    for particle in system.particles:
        if not particle.bloqueada:
            particle.force += gravity * particle.masa
    
    # Ejecutar solver PBD
    system.run(DT, apply_damping=True, use_plane_col=False, use_sphere_col=False, use_shape_matching=False)
    
    # Actualizar visualización
    if len(cloth_objects) > 0:
        actualizar_malla_tela(system, cloth_objects[0])


# ============================================
# FUNCIÓN PRINCIPAL
# ============================================
def main():
    """Función principal que inicializa todo"""
    global handler
    
    print("\n" + "=" * 50)
    print("INICIANDO SIMULACIÓN DE TELA EN BLENDER")
    print("=" * 50 + "\n")
    
    # Limpiar escena si es necesario
    limpiar_tela()
    
    # Inicializar tela
    inicializar_tela()
    
    # Registrar callback para simulación en cada frame
    if handler is None:
        handler = bpy.app.handlers.frame_change_pre.append(simular_frame)
        print("✓ Handler de simulación registrado")
    
    # Configurar frame inicial
    bpy.context.scene.frame_set(1)
    
    print("\n" + "=" * 50)
    print("✓ SIMULACIÓN LISTA")
    print("=" * 50)
    print("\nINSTRUCCIONES:")
    print("1. Presiona SPACE para reproducir la animación")
    print("2. La tela se simulará automáticamente en cada frame")
    print("3. Puedes ajustar los parámetros en la parte superior del script")
    print("4. Para detener, ejecuta: bpy.app.handlers.frame_change_pre.remove(handler)")
    print("\n")


# Ejecutar si se corre directamente
if __name__ == "__main__":
    main()

