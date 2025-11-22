"""
Funciones para crear y configurar una tela con PBD
Migrado de JavaScript a Python para Blender
"""
import mathutils
import math
from PBDSystem import PBDSystem
from DistanceConstraint import DistanceConstraint
from BendingConstraint import BendingConstraint
from ShearConstraint import ShearConstraint


def crea_tela(alto, ancho, dens, n_alto, n_ancho, stiffness, display_size):
    """
    Crear una tela con restricciones de distancia (estructura básica)
    
    Args:
        alto: altura de la tela en metros
        ancho: ancho de la tela en metros
        dens: densidad de la tela en kg/m²
        n_alto: número de partículas en dirección Y
        n_ancho: número de partículas en dirección X
        stiffness: rigidez de las restricciones (0-1)
        display_size: tamaño de visualización de las partículas
    
    Returns:
        PBDSystem con la tela configurada
    """
    N = n_alto * n_ancho
    masa = dens * alto * ancho
    tela = PBDSystem(N, masa / N)
    
    dx = ancho / (n_ancho - 1.0) if n_ancho > 1 else ancho
    dy = alto / (n_alto - 1.0) if n_alto > 1 else alto
    
    id = 0
    offsetX = -ancho / 2.0
    for i in range(n_ancho):
        for j in range(n_alto):
            p = tela.particles[id]
            p.location = mathutils.Vector((offsetX + dx * i, dy * j, 0))
            p.display_size = display_size
            p.last_location = mathutils.Vector(p.location)
            id += 1
    
    # Crear restricciones de distancia (estructura básica)
    id = 0
    for i in range(n_ancho):
        for j in range(n_alto):
            p = tela.particles[id]
            
            # Restricción horizontal (izquierda)
            if i > 0:
                idx = id - n_alto
                px = tela.particles[idx]
                c = DistanceConstraint(p, px, dx, stiffness)
                tela.add_constraint(c)
            
            # Restricción vertical (abajo)
            if j > 0:
                idy = id - 1
                py = tela.particles[idy]
                c = DistanceConstraint(p, py, dy, stiffness)
                tela.add_constraint(c)
            
            id += 1
    
    print(f"Tela creada con {len(tela.particles)} partículas y {len(tela.constraints)} restricciones.")
    
    return tela


def add_bending_constraints(tela, n_alto, n_ancho, stiffness):
    """
    Añade restricciones de bending (pliegue) a una tela existente.
    Crea restricciones que mantienen constante el ángulo diedro entre triángulos adyacentes.
    
    Args:
        tela: El sistema PBD con la tela
        n_alto: Número de partículas en dirección Y
        n_ancho: Número de partículas en dirección X
        stiffness: Rigidez de las restricciones de bending (0-1)
    """
    num_bending = 0
    
    def getIndex(i, j):
        """Obtener el índice lineal de una partícula (i, j)"""
        return i * n_alto + j
    
    def calcular_phi0(p1, p2, p3, p4):
        """Calcular el ángulo inicial entre dos triángulos"""
        # Calcular normales de los dos triángulos
        e1 = p2.location - p1.location
        e2 = p3.location - p1.location
        e3 = p4.location - p1.location
        
        n1 = mathutils.Vector.cross(e1, e2)
        n2 = mathutils.Vector.cross(e1, e3)
        
        len_n1 = n1.length
        len_n2 = n2.length
        
        # Evitar normales degeneradas
        if len_n1 < 0.0001 or len_n2 < 0.0001:
            return 0  # Ángulo plano por defecto
        
        n1 = n1.normalized()
        n2 = n2.normalized()
        
        d = n1.dot(n2)
        d = max(-1.0, min(1.0, d))
        
        return math.acos(d)
    
    # 1. BENDING CONSTRAINTS HORIZONTALES (alrededor de aristas verticales)
    # Configuración: p1-p3 es la arista compartida (vertical)
    #    p2
    #   / |
    #  p1-p3
    #   | \
    #    p4
    for i in range(n_ancho - 1):
        for j in range(n_alto - 1):
            # p1: (i, j), p2: (i, j+1), p3: (i+1, j), p4: (i+1, j+1)
            idx1 = getIndex(i, j)
            idx2 = getIndex(i, j + 1)
            idx3 = getIndex(i + 1, j)
            idx4 = getIndex(i + 1, j + 1)
            
            p1 = tela.particles[idx1]
            p2 = tela.particles[idx2]
            p3 = tela.particles[idx3]
            p4 = tela.particles[idx4]
            
            # Calcular ángulo inicial
            phi0 = calcular_phi0(p1, p3, p2, p4)
            
            # Crear restricción de bending
            bc = BendingConstraint(p1, p3, p2, p4, phi0, stiffness)
            tela.add_constraint(bc)
            num_bending += 1
    
    # 2. BENDING CONSTRAINTS VERTICALES (alrededor de aristas horizontales)
    # Configuración: p1-p2 es la arista compartida (horizontal)
    #  p3-p1-p4
    #     |
    #     p2
    for i in range(n_ancho - 1):
        for j in range(n_alto - 1):
            # p1: (i, j), p2: (i, j+1), p3: (i+1, j), p4: (i+1, j+1)
            idx1 = getIndex(i, j)
            idx2 = getIndex(i, j + 1)
            idx3 = getIndex(i + 1, j)
            idx4 = getIndex(i + 1, j + 1)
            
            p1 = tela.particles[idx1]
            p2 = tela.particles[idx2]
            p3 = tela.particles[idx3]
            p4 = tela.particles[idx4]
            
            # Calcular ángulo inicial
            phi0 = calcular_phi0(p1, p2, p3, p4)
            
            # Crear restricción de bending
            bc = BendingConstraint(p1, p2, p3, p4, phi0, stiffness)
            tela.add_constraint(bc)
            num_bending += 1
    
    print(f"Añadidas {num_bending} restricciones de bending.")


def add_shear_constraints(tela, n_alto, n_ancho, stiffness):
    """
    Añade restricciones de shear (cizalla) a una tela existente.
    Crea restricciones que mantienen constantes los ángulos internos de los triángulos
    formados por la malla, previniendo la deformación por cizalla.
    
    Args:
        tela: El sistema PBD con la tela
        n_alto: Número de partículas en dirección Y
        n_ancho: Número de partículas en dirección X
        stiffness: Rigidez de las restricciones de shear (0-1)
    """
    num_shear = 0
    
    def getIndex(i, j):
        """Obtener el índice lineal de una partícula (i, j)"""
        return i * n_alto + j
    
    def calcular_psi0(p0, p1, p2):
        """Calcular el ángulo inicial en un vértice"""
        # v1 = p1 - p0
        # v2 = p2 - p0
        v1 = p1.location - p0.location
        v2 = p2.location - p0.location
        
        len_v1 = v1.length
        len_v2 = v2.length
        
        # Evitar vectores degenerados
        if len_v1 < 0.0001 or len_v2 < 0.0001:
            return math.pi / 2  # Ángulo de 90° por defecto
        
        v1 = v1.normalized()
        v2 = v2.normalized()
        
        c = v1.dot(v2)
        c = max(-1.0, min(1.0, c))
        
        return math.acos(c)
    
    # CREAR RESTRICCIONES DE SHEAR PARA CADA CUADRILÁTERO DE LA MALLA
    # Para cada cuadrilátero formado por 4 partículas adyacentes, creamos
    # 4 restricciones de shear (una por cada ángulo interno)
    
    for i in range(n_ancho - 1):
        for j in range(n_alto - 1):
            # Obtener los 4 vértices del cuadrilátero:
            #  p01 -- p11
            #   |      |
            #  p00 -- p10
            
            idx00 = getIndex(i, j)
            idx10 = getIndex(i + 1, j)
            idx01 = getIndex(i, j + 1)
            idx11 = getIndex(i + 1, j + 1)
            
            p00 = tela.particles[idx00]
            p10 = tela.particles[idx10]
            p01 = tela.particles[idx01]
            p11 = tela.particles[idx11]
            
            # TRIÁNGULO INFERIOR: (p00, p10, p01)
            # Restricción en ángulo de p00
            psi0_p00_tri1 = calcular_psi0(p00, p10, p01)
            sc1 = ShearConstraint(p00, p10, p01, psi0_p00_tri1, stiffness)
            tela.add_constraint(sc1)
            num_shear += 1
            
            # Restricción en ángulo de p10
            psi0_p10_tri1 = calcular_psi0(p10, p00, p11)
            sc2 = ShearConstraint(p10, p00, p11, psi0_p10_tri1, stiffness)
            tela.add_constraint(sc2)
            num_shear += 1
            
            # Restricción en ángulo de p01
            psi0_p01_tri1 = calcular_psi0(p01, p00, p11)
            sc3 = ShearConstraint(p01, p00, p11, psi0_p01_tri1, stiffness)
            tela.add_constraint(sc3)
            num_shear += 1
            
            # TRIÁNGULO SUPERIOR: (p10, p11, p01)
            # Restricción en ángulo de p11
            psi0_p11_tri2 = calcular_psi0(p11, p10, p01)
            sc4 = ShearConstraint(p11, p10, p01, psi0_p11_tri2, stiffness)
            tela.add_constraint(sc4)
            num_shear += 1
    
    print(f"Añadidas {num_shear} restricciones de shear.")

