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
    for i, pos in enumerate(vertices_pos):
        system.particles[i].location = mathutils.Vector(pos)
        system.particles[i].last_location = mathutils.Vector(pos)
        # CRÍTICO: Asegurar que velocidad y fuerza estén en cero para evitar deformación inicial
        system.particles[i].velocity = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].force = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].acceleration = mathutils.Vector((0.0, 0.0, 0.0))
    
    # ===== 2. Generar tetraedros interiores =====
    tetraedros_indices = generar_tetraedros_cubo_subdividido(subdivisiones)
    
    # ===== 3. Calcular volúmenes iniciales (V0) de cada tetraedro =====
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
    
    # ===== 4. Crear restricciones de DISTANCIA para mantener la forma del cubo =====
    # INTENCIÓN: Mantener las aristas a su longitud natural, evitando que el cubo se estire
    distance_constraints = []
    distance_stiffness = 0.5  # REDUCIDO para evitar conflictos con volumen
    
    # Calcular distancia esperada entre vértices adyacentes
    step = lado / (subdivisiones - 1) if subdivisiones > 1 else lado
    
    # Crear restricciones de distancia en las 3 direcciones (X, Y, Z)
    for z in range(subdivisiones):
        for y in range(subdivisiones):
            for x in range(subdivisiones):
                idx = z * subdivisiones * subdivisiones + y * subdivisiones + x
                
                # Restricción en dirección X (vértice adyacente a la derecha)
                if x < subdivisiones - 1:
                    idx_right = z * subdivisiones * subdivisiones + y * subdivisiones + (x + 1)
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
                    idx_up = z * subdivisiones * subdivisiones + (y + 1) * subdivisiones + x
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
                    idx_front = (z + 1) * subdivisiones * subdivisiones + y * subdivisiones + x
                    if idx < N and idx_front < N:
                        p0 = system.particles[idx]
                        p1 = system.particles[idx_front]
                        dist0 = (p1.location - p0.location).length
                        if dist0 > 1e-6:
                            constraint = DistanceConstraint(p0, p1, dist0, distance_stiffness)
                            distance_constraints.append(constraint)
                            system.add_constraint(constraint)
    
    print(f"   ✓ {len(distance_constraints)} restricciones de distancia creadas para mantener forma cúbica")
    
    # ===== 5. Crear restricciones de BENDING (ángulo) SOLO en las CARAS externas =====
    # INTENCIÓN: Limitar la torsión entre triángulos adyacentes en la superficie
    # Evita que las caras se doblen de manera no deseada
    # CRÍTICO: Solo aplicar en caras externas, NUNCA en el volumen interno
    bending_constraints = []
    bending_stiffness = 0.05  # EXTREMADAMENTE REDUCIDO - las correcciones son demasiado grandes
    
    def calcular_phi0(p1, p2, p3, p4):
        """
        Calcular el ángulo diedro inicial entre dos triángulos adyacentes
        Según BendingConstraint: p1, p2, p3, p4 donde:
        - p1: vértice libre triángulo A
        - p2, p3: arista compartida
        - p4: vértice libre triángulo B
        Triángulo A: (p1, p2, p3)
        Triángulo B: (p4, p2, p3)
        Arista compartida: (p2, p3)
        """
        # Calcular vectores desde la arista compartida (p2, p3)
        e1 = p2.location - p1.location  # Vector desde p1 a p2 (arista compartida)
        e2 = p3.location - p1.location  # Vector desde p1 a p3
        e3 = p4.location - p1.location  # Vector desde p1 a p4
        
        # Calcular normales de los triángulos
        # Normal triángulo A: cross(p2-p1, p3-p1)
        n1 = mathutils.Vector.cross(e1, e2)
        # Normal triángulo B: cross(p2-p1, p4-p1)  
        n2 = mathutils.Vector.cross(e1, e3)
        
        len_n1 = n1.length
        len_n2 = n2.length
        
        if len_n1 < 0.0001 or len_n2 < 0.0001:
            # Si las normales son degeneradas, retornar un ángulo por defecto
            # Para un cubo perfecto, el ángulo diedro debería ser ~90° (1.57 rad) o ~180° (3.14 rad)
            return math.pi / 2.0  # 90 grados por defecto
        
        n1 = n1.normalized()
        n2 = n2.normalized()
        
        d = n1.dot(n2)
        d = max(-1.0, min(1.0, d))
        
        # CRÍTICO: El ángulo diedro se calcula como acos(d), pero hay un problema:
        # Cuando dos triángulos están en el mismo plano (cara plana), las normales son paralelas
        # y d = 1.0, entonces acos(1.0) = 0.0. Pero el ángulo diedro entre dos triángulos
        # en el mismo plano debería ser 180° (π rad), no 0°.
        #
        # Sin embargo, según la definición de Müller 2007, el ángulo diedro es el ángulo
        # entre las normales de los triángulos. Si las normales son paralelas (d=1.0),
        # el ángulo es 0°, lo cual es correcto matemáticamente.
        #
        # El problema es que cuando el cubo se deforma, el ángulo cambia y la restricción
        # intenta corregirlo, pero si phi0=0.0, cualquier cambio genera correcciones enormes.
        #
        # SOLUCIÓN: Si d está muy cerca de 1.0, significa que los triángulos están
        # casi en el mismo plano. En este caso, usamos un valor pequeño pero no cero
        # para evitar correcciones extremas.
        
        if abs(d - 1.0) < 0.001:  # Normales casi paralelas (triángulos en mismo plano)
            # Usar un valor pequeño pero no cero para evitar correcciones extremas
            # Un ángulo de ~5° (0.087 rad) es razonable para triángulos casi coplanares
            phi0 = 0.087  # ~5 grados
        else:
            phi0 = math.acos(d)
        
        # DEBUGGING: Verificar valores problemáticos
        if phi0 < 0.01:
            print(f"   ⚠️ ADVERTENCIA: phi0 calculado como {phi0:.6f} (muy pequeño)")
            print(f"      d={d:.6f}, n1={n1}, n2={n2}")
            print(f"      p1={p1.location}, p2={p2.location}, p3={p3.location}, p4={p4.location}")
        
        return phi0
    
    def get_idx(x, y, z):
        """Obtener índice de vértice en la grilla"""
        return z * subdivisiones * subdivisiones + y * subdivisiones + x
    
    # Aplicar bending SOLO en las 6 caras externas del cubo
    # Para cada cara, encontrar pares de triángulos adyacentes que compartan una arista
    
    # Cara inferior (z = 0)
    z = 0
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            # Cada cuadrícula tiene 2 triángulos: (i0, i1, i2) y (i0, i2, i3)
            i0 = get_idx(x, y, z)
            i1 = get_idx(x + 1, y, z)
            i2 = get_idx(x + 1, y + 1, z)
            i3 = get_idx(x, y + 1, z)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                # Bending entre los dos triángulos de esta cuadrícula
                # Triángulo A: (i0, i1, i2), Triángulo B: (i0, i2, i3)
                # Arista compartida: (i0, i2)
                # Vértices libres: i1 (triángulo A) e i3 (triángulo B)
                phi0 = calcular_phi0(p1, p0, p2, p3)
                
                # DEBUGGING: Log valores iniciales de bending constraints
                if len(bending_constraints) < 5:  # Solo primeros 5 para no saturar
                    print(f"   📐 Creando BendingConstraint #{len(bending_constraints)}:")
                    print(f"      Cara: Inferior (z=0), Cuadrícula: ({x}, {y})")
                    print(f"      Partículas: [{i0}, {i1}, {i2}, {i3}]")
                    print(f"      Triángulo A: ({i0}, {i1}, {i2}), Triángulo B: ({i0}, {i2}, {i3})")
                    print(f"      Arista compartida: ({i0}, {i2})")
                    print(f"      Ángulo inicial (phi0): {phi0:.6f} rad ({math.degrees(phi0):.2f}°)")
                    print(f"      Rigidez: {bending_stiffness}")
                    print(f"      Posiciones iniciales:")
                    print(f"         p{i0}: {p0.location}")
                    print(f"         p{i1}: {p1.location}")
                    print(f"         p{i2}: {p2.location}")
                    print(f"         p{i3}: {p3.location}")
                
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                # Bending con triángulo adyacente a la derecha (si existe)
                if x < subdivisiones - 2:
                    i4 = get_idx(x + 2, y, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        # Triángulo actual: (i0, i1, i2), Triángulo derecho: (i1, i4, i2)
                        # Arista compartida: (i1, i2)
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                # Bending con triángulo adyacente arriba (si existe)
                if y < subdivisiones - 2:
                    i4 = get_idx(x, y + 2, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        # Triángulo actual: (i0, i2, i3), Triángulo arriba: (i2, i4, i3)
                        # Arista compartida: (i2, i3)
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    # Cara superior (z = subdivisiones - 1)
    z = subdivisiones - 1
    for y in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, y, z)
            i1 = get_idx(x + 1, y, z)
            i2 = get_idx(x + 1, y + 1, z)
            i3 = get_idx(x, y + 1, z)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                # Bending entre los dos triángulos de esta cuadrícula
                # Triángulo A: (i0, i2, i1), Triángulo B: (i0, i3, i2)
                # Arista compartida: (i0, i2)
                phi0 = calcular_phi0(p1, p0, p2, p3)
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                if x < subdivisiones - 2:
                    i4 = get_idx(x + 2, y, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                if y < subdivisiones - 2:
                    i4 = get_idx(x, y + 2, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    # Cara frontal (y = 0)
    y = 0
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, y, z)
            i1 = get_idx(x + 1, y, z)
            i2 = get_idx(x + 1, y, z + 1)
            i3 = get_idx(x, y, z + 1)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                # Bending entre los dos triángulos de esta cuadrícula
                phi0 = calcular_phi0(p1, p0, p2, p3)
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                if x < subdivisiones - 2:
                    i4 = get_idx(x + 2, y, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                if z < subdivisiones - 2:
                    i4 = get_idx(x, y, z + 2)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    # Cara trasera (y = subdivisiones - 1)
    y = subdivisiones - 1
    for z in range(subdivisiones - 1):
        for x in range(subdivisiones - 1):
            i0 = get_idx(x, y, z)
            i1 = get_idx(x + 1, y, z)
            i2 = get_idx(x + 1, y, z + 1)
            i3 = get_idx(x, y, z + 1)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                phi0 = calcular_phi0(p1, p0, p2, p3)
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                if x < subdivisiones - 2:
                    i4 = get_idx(x + 2, y, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                if z < subdivisiones - 2:
                    i4 = get_idx(x, y, z + 2)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    # Cara izquierda (x = 0)
    x = 0
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            i0 = get_idx(x, y, z)
            i1 = get_idx(x, y + 1, z)
            i2 = get_idx(x, y + 1, z + 1)
            i3 = get_idx(x, y, z + 1)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                phi0 = calcular_phi0(p1, p0, p2, p3)
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                if y < subdivisiones - 2:
                    i4 = get_idx(x, y + 2, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                if z < subdivisiones - 2:
                    i4 = get_idx(x, y, z + 2)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    # Cara derecha (x = subdivisiones - 1)
    x = subdivisiones - 1
    for z in range(subdivisiones - 1):
        for y in range(subdivisiones - 1):
            i0 = get_idx(x, y, z)
            i1 = get_idx(x, y + 1, z)
            i2 = get_idx(x, y + 1, z + 1)
            i3 = get_idx(x, y, z + 1)
            
            if all(i < N for i in [i0, i1, i2, i3]):
                p0 = system.particles[i0]
                p1 = system.particles[i1]
                p2 = system.particles[i2]
                p3 = system.particles[i3]
                
                phi0 = calcular_phi0(p1, p0, p2, p3)
                bc = BendingConstraint(p1, p0, p2, p3, phi0, bending_stiffness)
                bending_constraints.append(bc)
                system.add_constraint(bc)
                
                if y < subdivisiones - 2:
                    i4 = get_idx(x, y + 2, z)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p1, p2, p4)
                        bc = BendingConstraint(p0, p1, p2, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                
                if z < subdivisiones - 2:
                    i4 = get_idx(x, y, z + 2)
                    if i4 < N:
                        p4 = system.particles[i4]
                        phi0 = calcular_phi0(p0, p2, p3, p4)
                        bc = BendingConstraint(p0, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
    
    print(f"   ✓ {len(bending_constraints)} restricciones de bending creadas (solo en caras externas)")
    
    # ===== 6. (Opcional) Crear restricción de volumen global =====
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

