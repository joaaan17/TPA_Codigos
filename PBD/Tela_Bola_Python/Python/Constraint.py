"""
Clase base abstracta Constraint para Position-Based Dynamics
Migrado de JavaScript a Python para Blender
"""
import math


class Constraint:
    """Clase base abstracta para todas las restricciones PBD"""
    
    def __init__(self):
        self.particles = []
        self.stiffness = 0.0
        self.k_coef = 0.0  # Coeficiente ajustado por número de iteraciones
        self.C = 0.0  # Valor de la restricción
    
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

