"""
VolumeConstraintTet para Position-Based Dynamics
Mantiene constante el volumen de un tetraedro
Implementación exacta según especificaciones
"""
import mathutils
import math
from Constraint import Constraint


class VolumeConstraintTet(Constraint):
    """Restricción de volumen para un tetraedro definido por 4 partículas"""
    
    def __init__(self, p0, p1, p2, p3, V0, k):
        """
        Constructor
        p0, p1, p2, p3: partículas que forman el tetraedro
        V0: volumen en reposo del tetraedro
        k: rigidez (stiffness) en [0, 1]
        """
        super().__init__()
        self.particles = [p0, p1, p2, p3]
        self.V0 = V0  # Volumen en reposo
        self.stiffness = k
        self.k_coef = k
        self.C = 0.0
        self.epsilon = 1e-8  # Reducido para permitir correcciones incluso con gradientes muy pequeños
    
    def proyecta_restriccion(self):
        """
        Proyecta las partículas para mantener el volumen del tetraedro
        Implementación exacta según especificaciones:
        - V = dot(cross(p1-p0, p2-p0), (p3-p0)) / 6
        - C = V - V0
        - Gradientes: grad1, grad2, grad3, grad0
        - Corrección: Δp_i = -w_i * (C / denom) * k' * grad_i
        """
        import math
        
        p0 = self.particles[0]
        p1 = self.particles[1]
        p2 = self.particles[2]
        p3 = self.particles[3]
        
        # Validar posiciones antes de calcular
        if (math.isnan(p0.location.x) or math.isnan(p0.location.y) or math.isnan(p0.location.z) or
            math.isnan(p1.location.x) or math.isnan(p1.location.y) or math.isnan(p1.location.z) or
            math.isnan(p2.location.x) or math.isnan(p2.location.y) or math.isnan(p2.location.z) or
            math.isnan(p3.location.x) or math.isnan(p3.location.y) or math.isnan(p3.location.z)):
            return
        
        # ===== 1. Calcular volumen actual =====
        # V = dot(cross(p1-p0, p2-p0), (p3-p0)) / 6
        e1 = p1.location - p0.location
        e2 = p2.location - p0.location
        e3 = p3.location - p0.location
        
        cross_e1_e2 = mathutils.Vector.cross(e1, e2)
        V = mathutils.Vector.dot(cross_e1_e2, e3) / 6.0
        
        # Validar volumen
        if math.isnan(V) or math.isinf(V):
            return
        
        # CRÍTICO: Detectar compresión extrema o inversión ANTES de que sea demasiado tarde
        # Calcular ratio de compresión
        compression_ratio = abs(V) / abs(self.V0) if abs(self.V0) > 1e-6 else 0.0
        
        # Si el volumen es negativo, el tetraedro está invertido - CORRECCIÓN INMEDIATA
        if V < 0:
            # Tetraedro invertido - aplicar corrección de emergencia agresiva
            # Calcular normal del plano formado por las 3 primeras partículas
            normal = mathutils.Vector.cross(e1, e2)
            if normal.length_squared < 1e-10:
                # Si e1 y e2 son paralelos, usar e1 y e3
                normal = mathutils.Vector.cross(e1, e3)
            
            if normal.length_squared > 1e-10:
                normal.normalize()
                # Empujar las partículas para restaurar el volumen
                # Usar una distancia más grande para corregir la inversión
                push_distance = abs(self.V0) ** (1.0/3.0) * 0.3  # 30% de la arista característica
                
                # Empujar p3 en dirección de la normal, y las otras en dirección opuesta
                if not p3.bloqueada:
                    p3.location += normal * push_distance * self.k_coef
                if not p0.bloqueada:
                    p0.location -= normal * push_distance * self.k_coef * 0.33
                if not p1.bloqueada:
                    p1.location -= normal * push_distance * self.k_coef * 0.33
                if not p2.bloqueada:
                    p2.location -= normal * push_distance * self.k_coef * 0.33
                
                # Log para debugging
                if hasattr(p0, 'debugId') and p0.debugId == 0:
                    print(f"   ⚠️ Tetraedro INVERTIDO detectado (V={V:.9f}, V0={self.V0:.9f}) - Aplicando corrección de emergencia")
            
            # Salir después de aplicar corrección de emergencia
            return
        
        # CRÍTICO: Si el volumen es cero o muy pequeño (< 1% del original), aplicar corrección de emergencia
        if abs(V) < 1e-10 or compression_ratio < 0.01:
            # Tetraedro completamente aplastado - aplicar corrección de emergencia más agresiva
            # Empujar las partículas en la dirección de la normal del plano
            # Calcular normal del plano formado por las 3 primeras partículas
            normal = mathutils.Vector.cross(e1, e2)
            if normal.length_squared < 1e-10:
                # Si e1 y e2 son paralelos, usar e1 y e3
                normal = mathutils.Vector.cross(e1, e3)
            
            if normal.length_squared > 1e-10:
                normal.normalize()
                # Empujar las partículas para restaurar el volumen
                # Usar una distancia más grande para corregir el aplastamiento
                push_distance = abs(self.V0) ** (1.0/3.0) * 0.25  # 25% de la arista característica (aumentado de 0.1)
                
                # Empujar p3 en dirección de la normal, y las otras en dirección opuesta
                # Esto crea una separación que restaura el volumen
                if not p3.bloqueada:
                    p3.location += normal * push_distance * self.k_coef
                if not p0.bloqueada:
                    p0.location -= normal * push_distance * self.k_coef * 0.33
                if not p1.bloqueada:
                    p1.location -= normal * push_distance * self.k_coef * 0.33
                if not p2.bloqueada:
                    p2.location -= normal * push_distance * self.k_coef * 0.33
                
                # Log para debugging (solo si es muy crítico)
                if compression_ratio < 0.001 and hasattr(p0, 'debugId') and p0.debugId == 0:
                    print(f"   ⚠️ Tetraedro APLASTADO detectado (V={V:.9f}, V0={self.V0:.9f}, ratio={compression_ratio:.6f}) - Aplicando corrección de emergencia")
            
            # Salir después de aplicar corrección de emergencia
            return
        
        # ===== 2. Calcular constraint =====
        # C = V - V0
        self.C = V - self.V0
        
        # ===== 3. Calcular gradientes =====
        # grad1 = cross(p2 - p0, p3 - p0) / 6
        # grad2 = cross(p3 - p0, p1 - p0) / 6
        # grad3 = cross(p1 - p0, p2 - p0) / 6
        # grad0 = -(grad1 + grad2 + grad3)
        
        grad1 = mathutils.Vector.cross(e2, e3) / 6.0
        grad2 = mathutils.Vector.cross(e3, e1) / 6.0
        grad3 = mathutils.Vector.cross(e1, e2) / 6.0
        grad0 = -(grad1 + grad2 + grad3)
        
        # Validar gradientes
        if (math.isnan(grad1.x) or math.isnan(grad1.y) or math.isnan(grad1.z) or
            math.isnan(grad2.x) or math.isnan(grad2.y) or math.isnan(grad2.z) or
            math.isnan(grad3.x) or math.isnan(grad3.y) or math.isnan(grad3.z) or
            math.isnan(grad0.x) or math.isnan(grad0.y) or math.isnan(grad0.z)):
            return
        
        # ===== 4. Calcular denominador =====
        # denom = Σ (w_i * |grad_i|^2)
        w0 = p0.w if not p0.bloqueada else 0.0
        w1 = p1.w if not p1.bloqueada else 0.0
        w2 = p2.w if not p2.bloqueada else 0.0
        w3 = p3.w if not p3.bloqueada else 0.0
        
        denom = (w0 * grad0.length_squared + 
                 w1 * grad1.length_squared + 
                 w2 * grad2.length_squared + 
                 w3 * grad3.length_squared)
        
        # Si el denominador es muy pequeño, usar un valor mínimo para evitar que la restricción no se aplique
        # Esto es crítico cuando los tetraedros están muy comprimidos (V → 0)
        if denom < self.epsilon:
            # Si el volumen está muy comprimido (menos del 10% del original), aplicar corrección de emergencia
            if abs(self.V0) > 1e-6 and abs(V) < abs(self.V0) * 0.1:
                # Usar un denominador mínimo basado en el tamaño característico del tetraedro
                # Aproximación: usar la longitud promedio de las aristas al cuadrado
                avg_edge_length = (e1.length + e2.length + e3.length) / 3.0
                denom = max(self.epsilon, avg_edge_length * avg_edge_length * 0.01)
            else:
                # Si no está muy comprimido pero denom es pequeño, simplemente usar epsilon
                denom = self.epsilon
        
        # ===== 5. Calcular correcciones =====
        # Δp_i = -w_i * (C / denom) * k' * grad_i
        
        # Si el tetraedro está muy comprimido, aumentar la fuerza de corrección
        # Usar el compression_ratio calculado arriba
        if compression_ratio < 0.5:  # Menos del 50% del volumen original
            # Aumentar k_coef temporalmente para corrección de emergencia
            # Cuanto más comprimido, más fuerza aplicar
            if compression_ratio < 0.1:
                effective_k_coef = min(1.0, self.k_coef * 5.0)  # 5x para compresión extrema
            elif compression_ratio < 0.3:
                effective_k_coef = min(1.0, self.k_coef * 3.0)  # 3x para compresión fuerte
            else:
                effective_k_coef = min(1.0, self.k_coef * 2.0)  # 2x para compresión moderada
        else:
            effective_k_coef = self.k_coef
        
        lambda_val = -effective_k_coef * self.C / denom
        
        # Validar lambda
        if math.isnan(lambda_val) or math.isinf(lambda_val):
            # Restaurar k_coef original si se modificó
            if hasattr(self, '_original_k_coef'):
                self.k_coef = self._original_k_coef
            return
        
        # Aplicar correcciones a cada partícula
        if not p0.bloqueada:
            delta_p0 = grad0 * (w0 * lambda_val)
            if not (math.isnan(delta_p0.x) or math.isnan(delta_p0.y) or math.isnan(delta_p0.z)):
                p0.location += delta_p0
        
        if not p1.bloqueada:
            delta_p1 = grad1 * (w1 * lambda_val)
            if not (math.isnan(delta_p1.x) or math.isnan(delta_p1.y) or math.isnan(delta_p1.z)):
                p1.location += delta_p1
        
        if not p2.bloqueada:
            delta_p2 = grad2 * (w2 * lambda_val)
            if not (math.isnan(delta_p2.x) or math.isnan(delta_p2.y) or math.isnan(delta_p2.z)):
                p2.location += delta_p2
        
        if not p3.bloqueada:
            delta_p3 = grad3 * (w3 * lambda_val)
            if not (math.isnan(delta_p3.x) or math.isnan(delta_p3.y) or math.isnan(delta_p3.z)):
                p3.location += delta_p3
        
        # Restaurar k_coef original si se modificó para tetraedros degenerados
        if hasattr(self, '_original_k_coef'):
            self.k_coef = self._original_k_coef
            delattr(self, '_original_k_coef')

