"""
Clase base abstracta Constraint para Position-Based Dynamics
Migrado de JavaScript a Python para Blender
"""
import math
import mathutils


class Constraint:
    """Clase base abstracta para todas las restricciones PBD"""
    
    # CRÍTICO: Límite máximo de corrección por frame (Müller 2007, Macklin FleX)
    # Sin este clamp, un tetraedro puede corregir 0.3m de golpe, formando ondas de choque y colapso
    MAX_CORRECTION_PER_FRAME = 0.1  # metros (10cm máximo por frame)
    
    def __init__(self):
        self.particles = []
        self.stiffness = 0.0
        self.k_coef = 0.0  # Coeficiente ajustado por número de iteraciones
        self.C = 0.0  # Valor de la restricción
    
    @staticmethod
    def clamp_correction(correction_vector, max_magnitude=None):
        """
        Clamp de corrección según PBD profesional (Müller 2007, Macklin FleX)
        Limita la magnitud máxima de la corrección para evitar ondas de choque y colapso.
        
        Args:
            correction_vector: Vector de corrección (mathutils.Vector)
            max_magnitude: Magnitud máxima permitida (None = usa MAX_CORRECTION_PER_FRAME)
        
        Returns:
            Vector de corrección limitado
        """
        if max_magnitude is None:
            max_magnitude = Constraint.MAX_CORRECTION_PER_FRAME
        
        correction_magnitude = correction_vector.length
        
        # Si la magnitud excede el máximo, escalar el vector
        if correction_magnitude > max_magnitude:
            # Normalizar y escalar al máximo
            return correction_vector.normalized() * max_magnitude
        
        return correction_vector
    
    def compute_k_coef(self, n):
        """
        Ajustar coeficiente de rigidez según número de iteraciones del solver
        k' = 1 - (1 - k)^(1/n)
        """
        if n > 0:
            self.k_coef = 1.0 - pow(1.0 - self.stiffness, 1.0 / n)
        else:
            self.k_coef = self.stiffness
        print(f"Fijamos {n} iteraciones --> k = {self.stiffness:.4f}, k' = {self.k_coef:.4f}")
    
    def proyecta_restriccion(self):
        """
        Método abstracto - debe ser implementado por subclases
        Proyecta las partículas para satisfacer la restricción
        """
        raise NotImplementedError("Las subclases deben implementar proyecta_restriccion()")
    
    def display(self, scale_px):
        """
        Método abstracto - puede ser implementado por subclases para visualización
        """
        pass  # Por defecto no hace nada

