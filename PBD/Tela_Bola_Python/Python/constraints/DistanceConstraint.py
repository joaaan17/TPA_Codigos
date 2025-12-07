"""
DistanceConstraint para Position-Based Dynamics
Mantiene constante la distancia entre dos partículas
Migrado de JavaScript a Python para Blender
"""
import mathutils
import math
from core.Constraint import Constraint


class DistanceConstraint(Constraint):
    """Restricción de distancia entre dos partículas"""
    
    def __init__(self, p1, p2, dist, k):
        super().__init__()
        self.d = dist  # Distancia de reposo
        self.particles = [p1, p2]
        self.stiffness = k
        self.k_coef = k
        self.C = 0.0
        self.epsilon = 0.0001
    
    def proyecta_restriccion(self):
        """Proyecta las partículas para mantener la distancia de reposo"""
        import math
        
        part1 = self.particles[0]
        part2 = self.particles[1]
        
        # LOG: Verificar posiciones antes de aplicar restricción
        if (math.isnan(part1.location.x) or math.isnan(part1.location.y) or math.isnan(part1.location.z) or
            math.isnan(part2.location.x) or math.isnan(part2.location.y) or math.isnan(part2.location.z)):
            # No hacer nada si hay NaN
            return
        
        # Vector de diferencia entre partículas
        vd = part1.location - part2.location
        dist_actual = vd.length
        
        # Si las partículas están en la misma posición, salir
        if dist_actual < self.epsilon:
            return
        
        # Calcular constraint: C = |p1 - p2| - d
        self.C = dist_actual - self.d
        
        # Normalizar el vector de diferencia
        if dist_actual > self.epsilon:
            n = vd.normalized()
        else:
            return
        
        # Calcular las correcciones usando el método PBD
        # delta_p = -k' * C * n / (w1 + w2)
        w_sum = part1.w + part2.w
        if w_sum < self.epsilon:  # Ambas partículas fijas
            return
        
        delta_lambda = -self.k_coef * self.C / w_sum
        
        # LOG: Verificar delta_lambda
        if math.isnan(delta_lambda) or math.isinf(delta_lambda):
            return
        
        # Aplicar correcciones
        correction = n * delta_lambda
        
        # LOG: Verificar correction antes de aplicar
        if (math.isnan(correction.x) or math.isnan(correction.y) or math.isnan(correction.z) or
            math.isinf(correction.x) or math.isinf(correction.y) or math.isinf(correction.z)):
            return
        
        # CRÍTICO: Clamp de corrección (Müller 2007, Macklin FleX)
        # Evita correcciones excesivas que causan ondas de choque y colapso
        correction = self.clamp_correction(correction)
        
        if not part1.bloqueada:
            nueva_pos1 = part1.location + correction * part1.w
            # Verificar que la nueva posición es válida
            if not (math.isnan(nueva_pos1.x) or math.isnan(nueva_pos1.y) or math.isnan(nueva_pos1.z)):
                part1.location = nueva_pos1
        
        if not part2.bloqueada:
            nueva_pos2 = part2.location - correction * part2.w
            # Verificar que la nueva posición es válida
            if not (math.isnan(nueva_pos2.x) or math.isnan(nueva_pos2.y) or math.isnan(nueva_pos2.z)):
                part2.location = nueva_pos2

