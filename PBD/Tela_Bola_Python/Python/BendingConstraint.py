"""
BendingConstraint para Position-Based Dynamics (Müller 2007)
Mantiene constante el ángulo diedro entre dos triángulos adyacentes
Migrado de JavaScript a Python para Blender
"""
import mathutils
import math
from Constraint import Constraint


class BendingConstraint(Constraint):
    """Restricción de pliegue (bending) entre dos triángulos adyacentes"""
    
    def __init__(self, p1, p2, p3, p4, phi0, k):
        super().__init__()
        self.particles = [p1, p2, p3, p4]  # i1, i2, i3, i4
        self.phi0 = phi0  # Ángulo diedro inicial
        self.stiffness = k
        self.k_coef = k
        self.C = 0.0
        self.epsilon = 0.0001
    
    def proyecta_restriccion(self):
        """Proyecta las partículas para mantener el ángulo diedro"""
        part1 = self.particles[0]  # p1
        part2 = self.particles[1]  # p2
        part3 = self.particles[2]  # p3
        part4 = self.particles[3]  # p4
        
        # Leer posiciones
        p1 = part1.location
        p2 = part2.location
        p3 = part3.location
        p4 = part4.location
        
        # DEBUGGING: Log para rastrear valores problemáticos
        if not hasattr(BendingConstraint, '_debug_count'):
            BendingConstraint._debug_count = 0
            BendingConstraint._problematic_constraints = set()
        
        BendingConstraint._debug_count += 1
        
        # Calcular normales n1 y n2
        # n1 = normalize(cross(p2 - p1, p3 - p1))
        # n2 = normalize(cross(p2 - p1, p4 - p1))
        e1 = p2 - p1  # p2 - p1
        e2 = p3 - p1  # p3 - p1
        e3 = p4 - p1  # p4 - p1
        
        n1 = mathutils.Vector.cross(e1, e2)
        n2 = mathutils.Vector.cross(e1, e3)
        
        len_n1 = n1.length
        len_n2 = n2.length
        
        # Validación: evitar normales degeneradas
        if len_n1 < self.epsilon or len_n2 < self.epsilon:
            return
        
        n1 = n1.normalized()
        n2 = n2.normalized()
        
        # Calcular d = dot(n1, n2)
        d = n1.dot(n2)
        
        # Validación: clamp d a [-1, 1] para evitar problemas con acos
        d = max(-1.0, min(1.0, d))
        
        # Calcular C = acos(d) - phi0
        phi_actual = math.acos(d)
        self.C = phi_actual - self.phi0
        
        # DEBUGGING: Detectar valores problemáticos
        constraint_id = id(self)
        is_problematic = False
        
        # Detectar si el ángulo cambió demasiado
        if abs(self.C) > 1.0:  # Cambio de más de 1 radian (57 grados)
            is_problematic = True
        
        # Detectar si phi0 es inválido
        if math.isnan(self.phi0) or math.isinf(self.phi0):
            is_problematic = True
        
        # Detectar si phi_actual es inválido
        if math.isnan(phi_actual) or math.isinf(phi_actual):
            is_problematic = True
        
        # Log cada 1000 restricciones o si es problemática
        if is_problematic or (BendingConstraint._debug_count % 1000 == 0 and constraint_id not in BendingConstraint._problematic_constraints):
            p1_id = getattr(part1, 'debugId', '?')
            p2_id = getattr(part2, 'debugId', '?')
            p3_id = getattr(part3, 'debugId', '?')
            p4_id = getattr(part4, 'debugId', '?')
            
            print(f"   📐 BendingConstraint [{constraint_id}]:")
            print(f"      Partículas: [{p1_id}, {p2_id}, {p3_id}, {p4_id}]")
            print(f"      Posiciones: p1={p1}, p2={p2}, p3={p3}, p4={p4}")
            print(f"      Ángulo inicial (phi0): {self.phi0:.6f} rad ({math.degrees(self.phi0):.2f}°)")
            print(f"      Ángulo actual (phi): {phi_actual:.6f} rad ({math.degrees(phi_actual):.2f}°)")
            print(f"      Constraint C = phi - phi0: {self.C:.6f} rad ({math.degrees(self.C):.2f}°)")
            print(f"      d (dot product): {d:.6f}")
            print(f"      Rigidez (k): {self.k_coef:.3f}")
            
            if is_problematic:
                print(f"      ⚠️ PROBLEMÁTICO: Cambio de ángulo muy grande o valores inválidos")
                BendingConstraint._problematic_constraints.add(constraint_id)
        
        # Si |C| < epsilon, no hay que corregir
        if abs(self.C) < self.epsilon:
            return
        
        # Calcular gradientes q1, q2, q3, q4 (fórmulas explícitas de Müller 2007)
        p2_p3 = p2 - p3
        p2_p4 = p2 - p4
        
        len_p2_p3 = p2_p3.length
        len_p2_p4 = p2_p4.length
        
        # Validación: evitar división por cero
        if len_p2_p3 < self.epsilon or len_p2_p4 < self.epsilon:
            return
        
        # Fórmulas explícitas de Müller 2007, Apéndice B:
        # q3 = cross(e1, n2) / |p2 - p3|
        q3 = mathutils.Vector.cross(e1, n2) / len_p2_p3
        
        # q4 = cross(e1, n1) / |p2 - p4|
        q4 = mathutils.Vector.cross(e1, n1) / len_p2_p4
        
        # q2 = -cross(e2, n2) / |p2 - p3| - cross(e3, n1) / |p2 - p4|
        q2_part1 = mathutils.Vector.cross(e2, n2) / len_p2_p3
        q2_part2 = mathutils.Vector.cross(e3, n1) / len_p2_p4
        q2 = -(q2_part1 + q2_part2)
        
        # q1 = -q2 - q3 - q4
        q1 = -(q2 + q3 + q4)
        
        # Calcular sum_q2 = |q1|^2 + |q2|^2 + |q3|^2 + |q4|^2
        sum_q2 = q1.length_squared + q2.length_squared + q3.length_squared + q4.length_squared
        
        # Validación: evitar división por cero
        if sum_q2 < self.epsilon:
            return
        
        # Calcular masas inversas y sum_w
        w1 = part1.w
        w2 = part2.w
        w3 = part3.w
        w4 = part4.w
        sum_w = w1 + w2 + w3 + w4
        
        # Validación: si todas las partículas están fijas
        if sum_w < self.epsilon:
            return
        
        # Calcular Δpi para cada partícula
        # Δpi = -(4 * wi / sum_w) * ((acos(d) - phi0) / sqrt(1 - d^2)) * qi / sum_q2
        
        d2 = d * d
        sqrt_term = math.sqrt(1.0 - d2)
        
        # Validación: evitar división por cero en sqrt(1 - d^2)
        if sqrt_term < self.epsilon:
            return
        
        scalar = (math.acos(d) - self.phi0) / sqrt_term
        
        # CRÍTICO: Limitar el scalar para evitar correcciones extremas
        # Si el ángulo cambió demasiado, limitar la corrección
        max_scalar = 0.5  # Máximo cambio de ángulo permitido por paso
        if abs(scalar) > max_scalar:
            scalar = max_scalar if scalar > 0 else -max_scalar
        
        factor = -scalar / sum_q2
        
        # Aplicar rigidez ajustada (k')
        factor *= self.k_coef
        
        # DEBUGGING: Calcular magnitudes de correcciones antes de aplicar
        max_correction_magnitude = 0.0
        total_corrections = []
        
        # Calcular y aplicar correcciones con validación
        if not part1.bloqueada:
            delta_p1 = q1 * (4.0 * w1 * factor / sum_w)
            correction_mag = delta_p1.length
            max_correction_magnitude = max(max_correction_magnitude, correction_mag)
            total_corrections.append(('p1', correction_mag, delta_p1))
            # Validar corrección antes de aplicar
            if (not math.isnan(delta_p1.x) and not math.isnan(delta_p1.y) and not math.isnan(delta_p1.z) and
                not math.isinf(delta_p1.x) and not math.isinf(delta_p1.y) and not math.isinf(delta_p1.z)):
                nueva_pos = part1.location + delta_p1
                # Validar posición resultante
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part1.location = nueva_pos
        
        if not part2.bloqueada:
            delta_p2 = q2 * (4.0 * w2 * factor / sum_w)
            correction_mag = delta_p2.length
            max_correction_magnitude = max(max_correction_magnitude, correction_mag)
            total_corrections.append(('p2', correction_mag, delta_p2))
            if (not math.isnan(delta_p2.x) and not math.isnan(delta_p2.y) and not math.isnan(delta_p2.z) and
                not math.isinf(delta_p2.x) and not math.isinf(delta_p2.y) and not math.isinf(delta_p2.z)):
                nueva_pos = part2.location + delta_p2
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part2.location = nueva_pos
        
        if not part3.bloqueada:
            delta_p3 = q3 * (4.0 * w3 * factor / sum_w)
            correction_mag = delta_p3.length
            max_correction_magnitude = max(max_correction_magnitude, correction_mag)
            total_corrections.append(('p3', correction_mag, delta_p3))
            if (not math.isnan(delta_p3.x) and not math.isnan(delta_p3.y) and not math.isnan(delta_p3.z) and
                not math.isinf(delta_p3.x) and not math.isinf(delta_p3.y) and not math.isinf(delta_p3.z)):
                nueva_pos = part3.location + delta_p3
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part3.location = nueva_pos
        
        if not part4.bloqueada:
            delta_p4 = q4 * (4.0 * w4 * factor / sum_w)
            correction_mag = delta_p4.length
            max_correction_magnitude = max(max_correction_magnitude, correction_mag)
            total_corrections.append(('p4', correction_mag, delta_p4))
            if (not math.isnan(delta_p4.x) and not math.isnan(delta_p4.y) and not math.isnan(delta_p4.z) and
                not math.isinf(delta_p4.x) and not math.isinf(delta_p4.y) and not math.isinf(delta_p4.z)):
                nueva_pos = part4.location + delta_p4
                if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z)):
                    part4.location = nueva_pos
        
        # DEBUGGING: Log correcciones grandes o problemáticas
        # También log si el scalar es muy grande (indica que phi0 está muy mal)
        if constraint_id in BendingConstraint._problematic_constraints or max_correction_magnitude > 0.1 or abs(scalar) > 0.5:
            print(f"   📐 BendingConstraint [{constraint_id}] - Correcciones aplicadas:")
            print(f"      ⚠️ PROBLEMA DETECTADO:")
            print(f"         - Máxima corrección: {max_correction_magnitude:.6f}")
            print(f"         - Scalar: {scalar:.6f} (debería ser < 0.5, indica phi0 muy diferente de phi actual)")
            print(f"         - Constraint C: {self.C:.6f} rad ({math.degrees(self.C):.2f}°)")
            print(f"         - Ángulo inicial (phi0): {self.phi0:.6f} rad ({math.degrees(self.phi0):.2f}°)")
            print(f"         - Ángulo actual (phi): {phi_actual:.6f} rad ({math.degrees(phi_actual):.2f}°)")
            for part_name, mag, delta in total_corrections:
                print(f"      {part_name}: magnitud={mag:.6f}, vector={delta}")
            print(f"      Factor total: {factor:.6f}, sum_q2: {sum_q2:.6f}, sqrt_term: {sqrt_term:.6f}")
            print(f"      sum_w: {sum_w:.6f}")

