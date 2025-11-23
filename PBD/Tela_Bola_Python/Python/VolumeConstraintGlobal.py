"""
VolumeConstraintGlobal para Position-Based Dynamics
Restricción de volumen global tipo Müller 2007 (cloth balloons)
Mantiene constante el volumen total de una malla cerrada
"""
import mathutils
import math
from Constraint import Constraint


class VolumeConstraintGlobal(Constraint):
    """Restricción de volumen global para una malla cerrada de triángulos"""
    
    def __init__(self, particles, triangles, V0, k):
        """
        Constructor
        particles: lista de todas las partículas de la malla
        triangles: lista de triángulos, cada uno es (i0, i1, i2) con índices de partículas
        V0: volumen en reposo de la malla cerrada
        k: rigidez (stiffness) en [0, 1]
        """
        super().__init__()
        self.particles = particles  # Todas las partículas
        self.triangles = triangles  # Lista de (i0, i1, i2)
        self.V0 = V0  # Volumen en reposo
        self.stiffness = k
        self.k_coef = k
        self.C = 0.0
        self.epsilon = 0.0001
    
    def calcular_volumen(self):
        """
        Calcular volumen actual usando la fórmula de Müller 2007:
        V = Σ (cross(a, b) · c) / 6
        donde a, b, c son los vértices de cada triángulo
        """
        V = 0.0
        
        for tri in self.triangles:
            i0, i1, i2 = tri
            if i0 >= len(self.particles) or i1 >= len(self.particles) or i2 >= len(self.particles):
                continue
            
            p0 = self.particles[i0]
            p1 = self.particles[i1]
            p2 = self.particles[i2]
            
            # Validar posiciones
            if (math.isnan(p0.location.x) or math.isnan(p0.location.y) or math.isnan(p0.location.z) or
                math.isnan(p1.location.x) or math.isnan(p1.location.y) or math.isnan(p1.location.z) or
                math.isnan(p2.location.x) or math.isnan(p2.location.y) or math.isnan(p2.location.z)):
                continue
            
            # Volumen del tetraedro formado por el triángulo y el origen
            # V_tri = dot(cross(p0, p1), p2) / 6
            cross_p0_p1 = mathutils.Vector.cross(p0.location, p1.location)
            V_tri = mathutils.Vector.dot(cross_p0_p1, p2.location) / 6.0
            
            if not (math.isnan(V_tri) or math.isinf(V_tri)):
                V += V_tri
        
        return V
    
    def calcular_gradientes(self):
        """
        Calcular gradientes para cada partícula según Müller 2007
        Retorna un diccionario {índice_partícula: gradiente}
        """
        gradients = {}
        
        for tri in self.triangles:
            i0, i1, i2 = tri
            if i0 >= len(self.particles) or i1 >= len(self.particles) or i2 >= len(self.particles):
                continue
            
            p0 = self.particles[i0]
            p1 = self.particles[i1]
            p2 = self.particles[i2]
            
            # Gradiente para cada vértice del triángulo
            # grad_i = cross(p_j, p_k) / 6 (donde i, j, k son cíclicos)
            grad0 = mathutils.Vector.cross(p1.location, p2.location) / 6.0
            grad1 = mathutils.Vector.cross(p2.location, p0.location) / 6.0
            grad2 = mathutils.Vector.cross(p0.location, p1.location) / 6.0
            
            # Acumular gradientes (una partícula puede estar en múltiples triángulos)
            if i0 not in gradients:
                gradients[i0] = mathutils.Vector((0.0, 0.0, 0.0))
            if i1 not in gradients:
                gradients[i1] = mathutils.Vector((0.0, 0.0, 0.0))
            if i2 not in gradients:
                gradients[i2] = mathutils.Vector((0.0, 0.0, 0.0))
            
            gradients[i0] += grad0
            gradients[i1] += grad1
            gradients[i2] += grad2
        
        return gradients
    
    def proyecta_restriccion(self):
        """
        Proyecta las partículas para mantener el volumen global
        """
        import math
        
        # ===== 1. Calcular volumen actual =====
        V = self.calcular_volumen()
        
        if math.isnan(V) or math.isinf(V):
            return
        
        # ===== 2. Calcular constraint =====
        self.C = V - self.V0
        
        # ===== 3. Calcular gradientes =====
        gradients = self.calcular_gradientes()
        
        # ===== 4. Calcular denominador =====
        # denom = Σ (w_i * |grad_i|^2)
        denom = 0.0
        for idx, grad in gradients.items():
            if idx < len(self.particles):
                p = self.particles[idx]
                w = p.w if not p.bloqueada else 0.0
                denom += w * grad.length_squared
        
        if denom < self.epsilon:
            return
        
        # ===== 5. Calcular correcciones =====
        # Δp_i = -w_i * (C / denom) * k' * grad_i
        lambda_val = -self.k_coef * self.C / denom
        
        if math.isnan(lambda_val) or math.isinf(lambda_val):
            return
        
        # Aplicar correcciones
        for idx, grad in gradients.items():
            if idx < len(self.particles):
                p = self.particles[idx]
                if not p.bloqueada:
                    w = p.w
                    delta_p = grad * (w * lambda_val)
                    if not (math.isnan(delta_p.x) or math.isnan(delta_p.y) or math.isnan(delta_p.z)):
                        p.location += delta_p


