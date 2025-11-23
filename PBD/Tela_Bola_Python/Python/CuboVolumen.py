"""
Funciones para crear un cubo con restricciones de volumen
Genera tetraedros interiores y calcula volúmenes iniciales
"""
import mathutils
import math
from PBDSystem import PBDSystem
from VolumeConstraintTet import VolumeConstraintTet
from VolumeConstraintGlobal import VolumeConstraintGlobal


def calcular_volumen_tetraedro(p0, p1, p2, p3):
    """
    Calcular volumen de un tetraedro definido por 4 puntos
    V = dot(cross(p1-p0, p2-p0), (p3-p0)) / 6
    """
    e1 = p1 - p0
    e2 = p2 - p0
    e3 = p3 - p0
    
    cross_e1_e2 = mathutils.Vector.cross(e1, e2)
    V = mathutils.Vector.dot(cross_e1_e2, e3) / 6.0
    
    return V


def generar_tetraedros_cubo(vertices):
    """
    Generar tetraedros interiores de un cubo
    Un cubo puede dividirse en 5 tetraedros usando una diagonal principal
    
    Args:
        vertices: lista de 8 vértices del cubo en orden:
                  [v0, v1, v2, v3, v4, v5, v6, v7]
                  donde:
                  - v0-v3: cara inferior (z=0)
                  - v4-v7: cara superior (z=1)
                  - v0, v1, v4, v5: cara frontal
                  - v2, v3, v6, v7: cara trasera
    
    Returns:
        Lista de tetraedros, cada uno es (i0, i1, i2, i3) con índices de vértices
    """
    # Método: dividir el cubo en 5 tetraedros usando la diagonal principal
    # Tetraedro 1: v0, v1, v3, v4
    # Tetraedro 2: v1, v4, v5, v6
    # Tetraedro 3: v1, v3, v4, v6
    # Tetraedro 4: v1, v2, v3, v6
    # Tetraedro 5: v3, v4, v6, v7
    
    tetraedros = [
        (0, 1, 3, 4),  # v0, v1, v3, v4
        (1, 4, 5, 6),  # v1, v4, v5, v6
        (1, 3, 4, 6),  # v1, v3, v4, v6
        (1, 2, 3, 6),  # v1, v2, v3, v6
        (3, 4, 6, 7),  # v3, v4, v6, v7
    ]
    
    return tetraedros


def generar_triangulos_cubo():
    """
    Generar lista de triángulos de la malla cerrada del cubo
    Para la restricción de volumen global
    
    Returns:
        Lista de triángulos, cada uno es (i0, i1, i2) con índices de vértices
    """
    # 6 caras del cubo, cada una con 2 triángulos
    # Vértices: v0-v3 (cara inferior), v4-v7 (cara superior)
    # v0, v1, v4, v5: cara frontal
    # v2, v3, v6, v7: cara trasera
    
    triangulos = [
        # Cara inferior (z=0)
        (0, 1, 2), (0, 2, 3),
        # Cara superior (z=1)
        (4, 6, 5), (4, 7, 6),
        # Cara frontal (y=0)
        (0, 4, 5), (0, 5, 1),
        # Cara trasera (y=1)
        (2, 6, 7), (2, 7, 3),
        # Cara izquierda (x=0)
        (0, 3, 7), (0, 7, 4),
        # Cara derecha (x=1)
        (1, 5, 6), (1, 6, 2),
    ]
    
    return triangulos


def generar_vertices_cubo_subdividido(lado, subdivisiones=3):
    """
    Generar vértices de un cubo subdividido en una grilla regular
    
    Args:
        lado: longitud del lado del cubo
        subdivisiones: número de subdivisiones por eje (3 = 3x3x3 = 27 vértices)
    
    Returns:
        Lista de posiciones de vértices (mathutils.Vector)
    """
    vertices = []
    offset = lado / 2.0
    step = lado / (subdivisiones - 1)
    
    # Generar vértices en una grilla 3D
    for z in range(subdivisiones):
        for y in range(subdivisiones):
            for x in range(subdivisiones):
                pos = mathutils.Vector((
                    -offset + x * step,
                    -offset + y * step,
                    -offset + z * step
                ))
                vertices.append(pos)
    
    return vertices


def generar_tetraedros_cubo_subdividido(subdivisiones=3):
    """
    Generar tetraedros para un cubo subdividido
    Divide cada celda cúbica en 5 tetraedros (mismo método que el cubo simple)
    
    Args:
        subdivisiones: número de subdivisiones por eje
    
    Returns:
        Lista de tetraedros, cada uno es (i0, i1, i2, i3) con índices de vértices
    """
    tetraedros = []
    
    # Para cada celda cúbica en la grilla
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            for x in range(subdivisiones - 1):
                # Índices de los 8 vértices de esta celda cúbica
                # Orden estándar del cubo
                base_idx = z * subdivisiones * subdivisiones + y * subdivisiones + x
                
                v0 = base_idx
                v1 = base_idx + 1
                v2 = base_idx + subdivisiones + 1
                v3 = base_idx + subdivisiones
                v4 = base_idx + subdivisiones * subdivisiones
                v5 = base_idx + subdivisiones * subdivisiones + 1
                v6 = base_idx + subdivisiones * subdivisiones + subdivisiones + 1
                v7 = base_idx + subdivisiones * subdivisiones + subdivisiones
                
                # Dividir esta celda en 5 tetraedros (mismo método que el cubo simple)
                tetraedros.extend([
                    (v0, v1, v3, v4),
                    (v1, v4, v5, v6),
                    (v1, v3, v4, v6),
                    (v1, v2, v3, v6),
                    (v3, v4, v6, v7),
                ])
    
    return tetraedros


def generar_triangulos_cubo_subdividido(subdivisiones=3):
    """
    Generar triángulos de superficie para un cubo subdividido
    Solo incluye las caras exteriores del cubo
    
    Args:
        subdivisiones: número de subdivisiones por eje
    
    Returns:
        Lista de triángulos, cada uno es (i0, i1, i2) con índices de vértices
    """
    triangulos = []
    
    def get_idx(x, y, z):
        """Obtener índice de vértice en la grilla"""
        return z * subdivisiones * subdivisiones + y * subdivisiones + x
    
    # Cara inferior (z = 0)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, y, 0)
            i1 = get_idx(x + 1, y, 0)
            i2 = get_idx(x + 1, y + 1, 0)
            i3 = get_idx(x, y + 1, 0)
            triangulos.extend([(i0, i1, i2), (i0, i2, i3)])
    
    # Cara superior (z = subdivisiones - 1)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, y, subdivisiones - 1)
            i1 = get_idx(x + 1, y, subdivisiones - 1)
            i2 = get_idx(x + 1, y + 1, subdivisiones - 1)
            i3 = get_idx(x, y + 1, subdivisiones - 1)
            triangulos.extend([(i0, i2, i1), (i0, i3, i2)])
    
    # Cara frontal (y = 0)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, 0, z)
            i1 = get_idx(x + 1, 0, z)
            i2 = get_idx(x + 1, 0, z + 1)
            i3 = get_idx(x, 0, z + 1)
            triangulos.extend([(i0, i1, i2), (i0, i2, i3)])
    
    # Cara trasera (y = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, subdivisiones - 1, z)
            i1 = get_idx(x + 1, subdivisiones - 1, z)
            i2 = get_idx(x + 1, subdivisiones - 1, z + 1)
            i3 = get_idx(x, subdivisiones - 1, z + 1)
            triangulos.extend([(i0, i2, i1), (i0, i3, i2)])
    
    # Cara izquierda (x = 0)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            i0 = get_idx(0, y, z)
            i1 = get_idx(0, y + 1, z)
            i2 = get_idx(0, y + 1, z + 1)
            i3 = get_idx(0, y, z + 1)
            triangulos.extend([(i0, i1, i2), (i0, i2, i3)])
    
    # Cara derecha (x = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            i0 = get_idx(subdivisiones - 1, y, z)
            i1 = get_idx(subdivisiones - 1, y + 1, z)
            i2 = get_idx(subdivisiones - 1, y + 1, z + 1)
            i3 = get_idx(subdivisiones - 1, y, z + 1)
            triangulos.extend([(i0, i2, i1), (i0, i3, i2)])
    
    return triangulos


def crear_cubo_volumen(lado, densidad, stiffness_volumen, stiffness_global=None, subdivisiones=3):
    """
    Crear un cubo con restricciones de volumen (subdividido para más realismo)
    
    Args:
        lado: longitud del lado del cubo
        densidad: densidad del material (kg/m³)
        stiffness_volumen: rigidez de las restricciones de volumen por tetraedro [0, 1]
        stiffness_global: rigidez de la restricción global (opcional, None para desactivar)
        subdivisiones: número de subdivisiones por eje (3 = 3x3x3 = 27 vértices, 4 = 64 vértices, etc.)
    
    Returns:
        PBDSystem configurado con el cubo y sus restricciones de volumen
    """
    # ===== 1. Generar vértices del cubo subdividido =====
    vertices_pos = generar_vertices_cubo_subdividido(lado, subdivisiones)
    N = len(vertices_pos)
    
    volumen_cubo = lado * lado * lado
    masa_total = densidad * volumen_cubo
    masa_particula = masa_total / N
    
    system = PBDSystem(N, masa_particula)
    
    # Inicializar partículas en las posiciones de los vértices
    # CRÍTICO: Asegurar que las partículas se inicializan con posiciones limpias
    import math
    for i, pos in enumerate(vertices_pos):
        # Crear nuevo Vector para evitar referencias compartidas
        new_pos = mathutils.Vector((pos.x, pos.y, pos.z))
        system.particles[i].location = new_pos
        system.particles[i].last_location = mathutils.Vector((pos.x, pos.y, pos.z))
        
        # Validar que la posición se asignó correctamente
        if i < 3:  # Debug para primeras 3 partículas
            if (math.isnan(system.particles[i].location.x) or 
                math.isnan(system.particles[i].location.y) or 
                math.isnan(system.particles[i].location.z)):
                print(f"   🔴 ERROR: Partícula {i} tiene NaN después de inicialización: {system.particles[i].location}")
    
    # ===== 2. Generar tetraedros interiores =====
    tetraedros_indices = generar_tetraedros_cubo_subdividido(subdivisiones)
    
    # ===== 3. Calcular volúmenes iniciales (V0) de cada tetraedro =====
    volume_constraints = []
    v0_problemas = []  # Para debugging
    
    for tet in tetraedros_indices:
        i0, i1, i2, i3 = tet
        # Validar índices
        if i0 >= N or i1 >= N or i2 >= N or i3 >= N:
            continue
        
        p0 = system.particles[i0]
        p1 = system.particles[i1]
        p2 = system.particles[i2]
        p3 = system.particles[i3]
        
        # DEBUGGING: Verificar posiciones antes de calcular V0
        if len(volume_constraints) < 3:  # Solo para primeros 3
            import math
            if (math.isnan(p0.location.x) or math.isnan(p1.location.x) or 
                math.isnan(p2.location.x) or math.isnan(p3.location.x)):
                print(f"   🔴 ERROR: Tetraedro {len(volume_constraints)} tiene partículas con NaN antes de calcular V0")
        
        # Calcular volumen inicial
        V0 = calcular_volumen_tetraedro(
            p0.location, p1.location, p2.location, p3.location
        )
        
        # DEBUGGING: Verificar V0 calculado
        if len(volume_constraints) < 3:  # Solo para primeros 3
            print(f"   🔍 DEBUG: Tetraedro {len(volume_constraints)} - V0 calculado = {V0:.9f}")
            print(f"      p0: {p0.location}, p1: {p1.location}, p2: {p2.location}, p3: {p3.location}")
        
        # Solo crear constraint si el volumen es válido (positivo y no demasiado pequeño)
        if V0 > 1e-6:
            constraint = VolumeConstraintTet(p0, p1, p2, p3, V0, stiffness_volumen)
            volume_constraints.append(constraint)
            system.add_constraint(constraint)
        else:
            # Guardar información sobre V0 inválido para debugging
            if len(v0_problemas) < 5:
                v0_problemas.append({
                    'tet': len(volume_constraints),
                    'V0': V0,
                    'p0': p0.location.copy(),
                    'p1': p1.location.copy(),
                    'p2': p2.location.copy(),
                    'p3': p3.location.copy()
                })
    
    # DEBUGGING: Reportar V0 problemáticos
    if len(v0_problemas) > 0:
        print(f"   ⚠️ ADVERTENCIA: {len(v0_problemas)} tetraedros con V0 inválido (primeros 5):")
        for prob in v0_problemas:
            print(f"      Tetra {prob['tet']}: V0 = {prob['V0']:.9f}")
            print(f"         p0: {prob['p0']}, p1: {prob['p1']}, p2: {prob['p2']}, p3: {prob['p3']}")
    
    # ===== 4. (Opcional) Crear restricción de volumen global =====
    global_volume_constraint = None
    if stiffness_global is not None and stiffness_global > 0:
        # Calcular volumen global inicial
        triangulos = generar_triangulos_cubo_subdividido(subdivisiones)
        
        # Calcular V0 usando la fórmula de Müller 2007
        V0_global = 0.0
        for tri in triangulos:
            i0, i1, i2 = tri
            # Validar índices
            if i0 >= N or i1 >= N or i2 >= N:
                continue
            
            p0 = system.particles[i0]
            p1 = system.particles[i1]
            p2 = system.particles[i2]
            
            cross_p0_p1 = mathutils.Vector.cross(p0.location, p1.location)
            V_tri = mathutils.Vector.dot(cross_p0_p1, p2.location) / 6.0
            V0_global += V_tri
        
        # Crear constraint global
        global_volume_constraint = VolumeConstraintGlobal(
            system.particles, triangulos, V0_global, stiffness_global
        )
        system.add_constraint(global_volume_constraint)
    
    return system, volume_constraints, global_volume_constraint

