"""
Funciones para crear un cubo con restricciones de volumen
Genera tetraedros interiores y calcula volúmenes iniciales
"""
import mathutils
import math
from PBDSystem import PBDSystem
from VolumeConstraintTet import VolumeConstraintTet
from VolumeConstraintGlobal import VolumeConstraintGlobal
from DistanceConstraint import DistanceConstraint
from BendingConstraint import BendingConstraint


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
    # CRÍTICO: Asegurar que las velocidades y fuerzas estén en cero
    # DEBUG: Verificar que cada partícula tiene su propio objeto Vector
    print(f"   🔍 DEBUG: Inicializando {N} partículas...")
    for i, pos in enumerate(vertices_pos):
        # CRÍTICO: Crear nuevos objetos Vector para cada partícula
        system.particles[i].location = mathutils.Vector(pos)
        system.particles[i].last_location = mathutils.Vector(pos)  # Nuevo Vector, no referencia
        # CRÍTICO: Resetear velocidades y fuerzas para evitar estado residual
        system.particles[i].velocity = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].force = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        
        # DEBUG: Verificar primeras 3 partículas
        if i < 3:
            p = system.particles[i]
            print(f"      Partícula {i}: loc={p.location}, last_loc={p.last_location}, "
                  f"id(loc)={id(p.location)}, id(last_loc)={id(p.last_location)}")
    
    print(f"   ✓ {N} partículas inicializadas")
    
    # ===== 2. Generar tetraedros interiores =====
    tetraedros_indices = generar_tetraedros_cubo_subdividido(subdivisiones)
    
    # ===== 3. Crear restricciones de DISTANCIA para mantener la forma del cubo =====
    # INTENCIÓN: Mantener las aristas a su longitud natural, evitando que el cubo se estire o comprima
    # Esto es complementario a las restricciones de volumen y ayuda a mantener la forma cúbica
    distance_constraints = []
    # CRÍTICO: La rigidez de distancia debe ser compatible con la rigidez de volumen
    # Si el volumen es débil (< 0.3), las distancias también deben ser más suaves
    # Esto evita que las distancias "bloqueen" la geometría y el volumen no pueda actuar
    if stiffness_volumen < 0.3:
        # Volumen suave → Distancias también suaves (pero un poco más rígidas)
        distance_stiffness = min(0.5, stiffness_volumen + 0.2)
    elif stiffness_volumen < 0.6:
        # Volumen medio → Distancias medias
        distance_stiffness = 0.6
    else:
        # Volumen rígido → Distancias rígidas
        distance_stiffness = 0.8
    
    print(f"   📊 Stiffness de distancia ajustado: {distance_stiffness:.2f} (basado en stiffness de volumen: {stiffness_volumen:.2f})")
    
    # Calcular distancia esperada entre vértices adyacentes
    step = lado / (subdivisiones - 1) if subdivisiones > 1 else lado
    
    # Función auxiliar para obtener índice de vértice en la grilla
    def get_idx(x, y, z):
        return z * subdivisiones * subdivisiones + y * subdivisiones + x
    
    # Crear restricciones de distancia en las 3 direcciones (X, Y, Z)
    # Esto crea una malla de restricciones que mantiene la estructura del cubo
    for z in range(subdivisiones):
        for y in range(subdivisiones):
            for x in range(subdivisiones):
                idx = get_idx(x, y, z)
                
                # Restricción en dirección X (vértice adyacente a la derecha)
                if x < subdivisiones - 1:
                    idx_right = get_idx(x + 1, y, z)
                    if idx < N and idx_right < N:
                        p0 = system.particles[idx]
                        p1 = system.particles[idx_right]
                        # Calcular distancia inicial
                        dist0 = (p1.location - p0.location).length
                        if dist0 > 1e-6:
                            constraint = DistanceConstraint(p0, p1, dist0, distance_stiffness)
                            distance_constraints.append(constraint)
                            system.add_constraint(constraint)
                
                # Restricción en dirección Y (vértice adyacente arriba)
                if y < subdivisiones - 1:
                    idx_up = get_idx(x, y + 1, z)
                    if idx < N and idx_up < N:
                        p0 = system.particles[idx]
                        p1 = system.particles[idx_up]
                        dist0 = (p1.location - p0.location).length
                        if dist0 > 1e-6:
                            constraint = DistanceConstraint(p0, p1, dist0, distance_stiffness)
                            distance_constraints.append(constraint)
                            system.add_constraint(constraint)
                
                # Restricción en dirección Z (vértice adyacente arriba en Z)
                if z < subdivisiones - 1:
                    idx_front = get_idx(x, y, z + 1)
                    if idx < N and idx_front < N:
                        p0 = system.particles[idx]
                        p1 = system.particles[idx_front]
                        dist0 = (p1.location - p0.location).length
                        if dist0 > 1e-6:
                            constraint = DistanceConstraint(p0, p1, dist0, distance_stiffness)
                            distance_constraints.append(constraint)
                            system.add_constraint(constraint)
    
    print(f"   ✓ {len(distance_constraints)} restricciones de distancia creadas para mantener forma cúbica")
    
    # ===== 4. Calcular volúmenes iniciales (V0) de cada tetraedro =====
    # NOTA: Los V0 se calculan aquí con las posiciones actuales
    # Si el cubo se mueve después, los V0 deben recalcularse o el cubo debe moverse antes
    volume_constraints = []
    for tet in tetraedros_indices:
        i0, i1, i2, i3 = tet
        # Validar índices
        if i0 >= N or i1 >= N or i2 >= N or i3 >= N:
            continue
        
        p0 = system.particles[i0]
        p1 = system.particles[i1]
        p2 = system.particles[i2]
        p3 = system.particles[i3]
        
        # Calcular volumen inicial
        V0 = calcular_volumen_tetraedro(
            p0.location, p1.location, p2.location, p3.location
        )
        
        # Solo crear constraint si el volumen es válido (positivo y no demasiado pequeño)
        if V0 > 1e-6:
            constraint = VolumeConstraintTet(p0, p1, p2, p3, V0, stiffness_volumen)
            volume_constraints.append(constraint)
            system.add_constraint(constraint)
            
            # DEBUG: Verificar primeras 3 restricciones
            if len(volume_constraints) <= 3:
                print(f"      DEBUG CuboVolumen: Constraint {len(volume_constraints)-1} creada - "
                      f"V0={V0:.6f}, stiffness={stiffness_volumen:.4f}, "
                      f"id(V0)={id(constraint.V0) if hasattr(constraint, 'V0') else 'N/A'}")
    
    # ===== 5. (Opcional) Crear restricción de volumen global =====
    global_volume_constraint = None
    # CRÍTICO: Crear la restricción si stiffness_global no es None
    # El valor mínimo ya se aplicó en blender_tela_shapekeys.py
    if stiffness_global is not None and stiffness_global > 1e-6:
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
    
    # ===== 6. Crear restricciones de BENDING para las caras externas =====
    # INTENCIÓN: Evitar que las caras del cubo se plieguen o colapsen
    # Se aplican solo en la superficie para no interferir con las restricciones de volumen internas
    bending_constraints = []
    bending_stiffness = 0.1  # Rigidez baja para permitir cierta deformación
    
    # Función auxiliar para calcular phi0 (ángulo inicial entre dos triángulos adyacentes)
    def calcular_phi0(p1, p2, p3, p4):
        """
        Calcular ángulo diedro inicial entre dos triángulos que comparten una arista
        p1, p2: vértices de la arista compartida
        p3: tercer vértice del primer triángulo
        p4: tercer vértice del segundo triángulo
        """
        e1 = p2.location - p1.location
        e2 = p3.location - p1.location
        e3 = p4.location - p1.location
        
        n1 = mathutils.Vector.cross(e1, e2)
        n2 = mathutils.Vector.cross(e1, e3)
        
        len_n1 = n1.length
        len_n2 = n2.length
        
        if len_n1 < 1e-6 or len_n2 < 1e-6:
            return 0.087  # ~5 grados por defecto para evitar degeneración
        
        n1 = n1.normalized()
        n2 = n2.normalized()
        
        d = n1.dot(n2)
        d = max(-1.0, min(1.0, d))
        
        if abs(d - 1.0) < 1e-6:  # Si los vectores son casi paralelos, ángulo es 0
            return 0.087  # ~5 grados
        
        return math.acos(d)
    
    # Crear restricciones de bending para cada cara del cubo
    # Solo en las caras externas (superficie del cubo)
    
    # Cara inferior (z = 0)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Cada cuadrado de la cara se divide en 2 triángulos
            # Necesitamos crear bending constraints entre triángulos adyacentes
            
            # Triángulo 1: (x,y,0), (x+1,y,0), (x,y+1,0)
            # Triángulo 2: (x+1,y,0), (x+1,y+1,0), (x,y+1,0)
            # Arista compartida: (x+1,y,0) - (x,y+1,0)
            
            p1_idx = get_idx(x + 1, y, 0)      # Vértice 1 de arista compartida
            p2_idx = get_idx(x, y + 1, 0)      # Vértice 2 de arista compartida
            p3_idx = get_idx(x, y, 0)          # Tercer vértice triángulo 1
            p4_idx = get_idx(x + 1, y + 1, 0)  # Tercer vértice triángulo 2
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    # Cara superior (z = subdivisiones - 1)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            p1_idx = get_idx(x + 1, y, subdivisiones - 1)
            p2_idx = get_idx(x, y + 1, subdivisiones - 1)
            p3_idx = get_idx(x, y, subdivisiones - 1)
            p4_idx = get_idx(x + 1, y + 1, subdivisiones - 1)
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    # Cara frontal (y = 0)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            p1_idx = get_idx(x + 1, 0, z)
            p2_idx = get_idx(x, 0, z + 1)
            p3_idx = get_idx(x, 0, z)
            p4_idx = get_idx(x + 1, 0, z + 1)
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    # Cara trasera (y = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            p1_idx = get_idx(x + 1, subdivisiones - 1, z)
            p2_idx = get_idx(x, subdivisiones - 1, z + 1)
            p3_idx = get_idx(x, subdivisiones - 1, z)
            p4_idx = get_idx(x + 1, subdivisiones - 1, z + 1)
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    # Cara izquierda (x = 0)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            p1_idx = get_idx(0, y + 1, z)
            p2_idx = get_idx(0, y, z + 1)
            p3_idx = get_idx(0, y, z)
            p4_idx = get_idx(0, y + 1, z + 1)
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    # Cara derecha (x = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            p1_idx = get_idx(subdivisiones - 1, y + 1, z)
            p2_idx = get_idx(subdivisiones - 1, y, z + 1)
            p3_idx = get_idx(subdivisiones - 1, y, z)
            p4_idx = get_idx(subdivisiones - 1, y + 1, z + 1)
            
            if p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N:
                p1 = system.particles[p1_idx]
                p2 = system.particles[p2_idx]
                p3 = system.particles[p3_idx]
                p4 = system.particles[p4_idx]
                
                phi0 = calcular_phi0(p1, p2, p3, p4)
                bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
    
    print(f"   ✓ {len(bending_constraints)} restricciones de bending creadas para caras externas")
    
    # ===== 7. Crear restricciones DIAGONALES para las caras externas =====
    # INTENCIÓN: Evitar el cizallamiento (shearing) de las caras del cubo
    # Las restricciones diagonales conectan vértices diagonalmente en cada cara
    # Esto previene que las caras se deformen en forma de paralelogramo
    diagonal_constraints = []
    # CRÍTICO: Las diagonales deben ser compatibles con el volumen
    # Usar aproximadamente la misma rigidez que las distancias, o un poco menos
    diagonal_stiffness = distance_stiffness * 0.8  # 80% de la rigidez de distancia
    print(f"   📊 Stiffness diagonal ajustado: {diagonal_stiffness:.2f}")
    
    # Cara inferior (z = 0)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Diagonal 1: (x,y,0) -> (x+1,y+1,0)
            p0_idx = get_idx(x, y, 0)
            p1_idx = get_idx(x + 1, y + 1, 0)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (x+1,y,0) -> (x,y+1,0)
            p0_idx = get_idx(x + 1, y, 0)
            p1_idx = get_idx(x, y + 1, 0)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    # Cara superior (z = subdivisiones - 1)
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Diagonal 1: (x,y,z_max) -> (x+1,y+1,z_max)
            p0_idx = get_idx(x, y, subdivisiones - 1)
            p1_idx = get_idx(x + 1, y + 1, subdivisiones - 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (x+1,y,z_max) -> (x,y+1,z_max)
            p0_idx = get_idx(x + 1, y, subdivisiones - 1)
            p1_idx = get_idx(x, y + 1, subdivisiones - 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    # Cara frontal (y = 0)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Diagonal 1: (x,0,z) -> (x+1,0,z+1)
            p0_idx = get_idx(x, 0, z)
            p1_idx = get_idx(x + 1, 0, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (x+1,0,z) -> (x,0,z+1)
            p0_idx = get_idx(x + 1, 0, z)
            p1_idx = get_idx(x, 0, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    # Cara trasera (y = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Diagonal 1: (x,y_max,z) -> (x+1,y_max,z+1)
            p0_idx = get_idx(x, subdivisiones - 1, z)
            p1_idx = get_idx(x + 1, subdivisiones - 1, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (x+1,y_max,z) -> (x,y_max,z+1)
            p0_idx = get_idx(x + 1, subdivisiones - 1, z)
            p1_idx = get_idx(x, subdivisiones - 1, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    # Cara izquierda (x = 0)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            # Diagonal 1: (0,y,z) -> (0,y+1,z+1)
            p0_idx = get_idx(0, y, z)
            p1_idx = get_idx(0, y + 1, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (0,y+1,z) -> (0,y,z+1)
            p0_idx = get_idx(0, y + 1, z)
            p1_idx = get_idx(0, y, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    # Cara derecha (x = subdivisiones - 1)
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            # Diagonal 1: (x_max,y,z) -> (x_max,y+1,z+1)
            p0_idx = get_idx(subdivisiones - 1, y, z)
            p1_idx = get_idx(subdivisiones - 1, y + 1, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
            
            # Diagonal 2: (x_max,y+1,z) -> (x_max,y,z+1)
            p0_idx = get_idx(subdivisiones - 1, y + 1, z)
            p1_idx = get_idx(subdivisiones - 1, y, z + 1)
            if p0_idx < N and p1_idx < N:
                p0 = system.particles[p0_idx]
                p1 = system.particles[p1_idx]
                dist0 = (p1.location - p0.location).length
                if dist0 > 1e-6:
                    dc = DistanceConstraint(p0, p1, dist0, diagonal_stiffness)
                    diagonal_constraints.append(dc)
                    system.add_constraint(dc)
    
    print(f"   ✓ {len(diagonal_constraints)} restricciones diagonales creadas para caras externas")
    
    return system, volume_constraints, global_volume_constraint, distance_constraints, bending_constraints, diagonal_constraints

