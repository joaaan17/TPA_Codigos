"""
ShearConstraint para Position-Based Dynamics
Mantiene constante el ángulo interno de un triángulo en un vértice
Migrado de JavaScript a Python para Blender
"""
import mathutils
import math
from core.Constraint import Constraint


class ShearConstraint(Constraint):
    """Restricción de cizalla (shear) que mantiene el ángulo interno de un triángulo"""
    
    def __init__(self, p0, p1, p2, psi0, k):
        super().__init__()
        self.particles = [p0, p1, p2]  # x0, x1, x2
        self.psi0 = psi0  # Ángulo inicial
        self.stiffness = k
        self.k_coef = k
        self.C = 0.0
        self.epsilon = 0.0001
    
    def proyecta_restriccion(self):
        """Proyecta las partículas para mantener el ángulo interno"""
        part0 = self.particles[0]  # x0
        part1 = self.particles[1]  # x1
        part2 = self.particles[2]  # x2
        
        # Leer posiciones x0, x1, x2
        x0 = part0.location
        x1 = part1.location
        x2 = part2.location
        
        # Calcular v1 y v2
        # v1 = x1 - x0
        # v2 = x2 - x0
        v1 = x1 - x0
        v2 = x2 - x0
        
        len_v1 = v1.length
        len_v2 = v2.length
        
        # Validación: evitar vectores degenerados
        if len_v1 < self.epsilon or len_v2 < self.epsilon:
            return
        
        # Normalizar v1 y v2
        v1 = v1.normalized()
        v2 = v2.normalized()
        
        # Calcular c = dot(v1, v2) con clamp
        c = v1.dot(v2)
        c = max(-1.0, min(1.0, c))
        
        # Calcular C = acos(c) - psi0
        self.C = math.acos(c) - self.psi0
        
        # Si C ≈ 0, salir
        if abs(self.C) < self.epsilon:
            return
        
        # Validación: evitar NaN en sqrt(1 - c²)
        c2 = c * c
        sqrt_term = math.sqrt(1.0 - c2)
        if sqrt_term < self.epsilon:
            return
        
        # Calcular gradientes ∇x0, ∇x1, ∇x2
        # Fórmulas exactas según las diapositivas:
        # ∇x1 C = -(1 / sqrt(1 - c²)) * ((I - v1v1^T) / |x1 - x0|) * v2
        # ∇x2 C = -(1 / sqrt(1 - c²)) * ((I - v2v2^T) / |x2 - x0|) * v1
        # ∇x0 C = -∇x1 C - ∇x2 C
        
        factor = -1.0 / sqrt_term
        
        # Para ∇x1 C: (I - v1v1^T) * v2 = v2 - v1 * (v1 · v2) = v2 - v1 * c
        grad_x1_unnorm = v2 - v1 * c
        grad_x1 = grad_x1_unnorm * (factor / len_v1)
        
        # Para ∇x2 C: (I - v2v2^T) * v1 = v1 - v2 * (v2 · v1) = v1 - v2 * c
        grad_x2_unnorm = v1 - v2 * c
        grad_x2 = grad_x2_unnorm * (factor / len_v2)
        
        # ∇x0 C = -∇x1 C - ∇x2 C
        grad_x0 = -(grad_x1 + grad_x2)
        
        # Calcular |∇C|² = |∇x0 C|² + |∇x1 C|² + |∇x2 C|²
        grad_norm_sq = grad_x0.length_squared + grad_x1.length_squared + grad_x2.length_squared
        
        # Validación: evitar división por cero
        if grad_norm_sq < self.epsilon:
            return
        
        # Calcular masas inversas y sum_w
        w0 = part0.w
        w1 = part1.w
        w2 = part2.w
        sum_w = w0 + w1 + w2
        
        # Validación: si todas las partículas están fijas
        if sum_w < self.epsilon:
            return
        
        # Aplicar fórmula PBD para Δp0, Δp1, Δp2
        # Δpi = -(wi / sum_w) * (C / |∇C|²) * ∇pi C
        lambda_val = -self.C / grad_norm_sq
        
        # Aplicar rigidez k' (ajustada por el solver)
        lambda_val *= self.k_coef
        
        # Calcular y aplicar correcciones con validación
        if not part0.bloqueada:
            delta_p0 = grad_x0 * ((w0 / sum_w) * lambda_val)
            # Validar corrección antes de aplicar
            if (not math.isnan(delta_p0.x) and not math.isnan(delta_p0.y) and not math.isnan(delta_p0.z) and
                not math.isinf(delta_p0.x) and not math.isinf(delta_p0.y) and not math.isinf(delta_p0.z)):
                # CRÍTICO: Clamp de corrección (Müller 2007, Macklin FleX)
                delta_p0 = self.clamp_correction(delta_p0)
                nueva_pos = part0.location + delta_p0
                # Validar posición resultante
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part0.location = nueva_pos
        
        if not part1.bloqueada:
            delta_p1 = grad_x1 * ((w1 / sum_w) * lambda_val)
            if (not math.isnan(delta_p1.x) and not math.isnan(delta_p1.y) and not math.isnan(delta_p1.z) and
                not math.isinf(delta_p1.x) and not math.isinf(delta_p1.y) and not math.isinf(delta_p1.z)):
                # CRÍTICO: Clamp de corrección (Müller 2007, Macklin FleX)
                delta_p1 = self.clamp_correction(delta_p1)
                nueva_pos = part1.location + delta_p1
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part1.location = nueva_pos
        
        if not part2.bloqueada:
            delta_p2 = grad_x2 * ((w2 / sum_w) * lambda_val)
            if (not math.isnan(delta_p2.x) and not math.isnan(delta_p2.y) and not math.isnan(delta_p2.z) and
                not math.isinf(delta_p2.x) and not math.isinf(delta_p2.y) and not math.isinf(delta_p2.z)):
                # CRÍTICO: Clamp de corrección (Müller 2007, Macklin FleX)
                delta_p2 = self.clamp_correction(delta_p2)
                nueva_pos = part2.location + delta_p2
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part2.location = nueva_pos

