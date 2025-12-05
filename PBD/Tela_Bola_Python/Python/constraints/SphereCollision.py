"""
SphereCollision - Colisión entre esfera y partículas PBD
Implementa detección y resolución de colisiones esfera-cubo
"""
import mathutils
import math


class SphereCollider:
    """
    Colisionador de esfera para interacción con partículas PBD
    """
    
    def __init__(self, center, radius, velocity=mathutils.Vector((0, 0, 0)), mass=1.0):
        """
        Constructor
        center: posición inicial de la esfera (mathutils.Vector)
        radius: radio de la esfera (float)
        velocity: velocidad inicial de la esfera (mathutils.Vector)
        mass: masa de la esfera (float)
        """
        self.center = mathutils.Vector(center)
        self.radius = radius
        self.velocity = mathutils.Vector(velocity)
        self.mass = mass
        self.active = True
        
        # Gravedad - se configurará desde fuera para usar el mismo valor que el cubo
        self.gravity = 0.0  # Se establecerá desde fuera
        
        # Parámetros de colisión
        self.stiffness = 0.5  # Rigidez de la colisión (0-1)
        self.restitution = 0.3  # Coeficiente de restitución (rebote)
        self.friction = 0.7  # Fricción
    
    def set_gravity(self, gravity_value):
        """
        Configurar el valor de gravedad (debe ser el mismo que usa el cubo)
        gravity_value: valor de gravedad (normalmente negativo, ej: -9.81)
        """
        self.gravity = gravity_value
    
    def apply_gravity(self, dt):
        """
        Aplicar gravedad a la velocidad de la esfera
        Debe llamarse ANTES del solver, igual que se hace con las partículas del cubo
        """
        if not self.active:
            return
        
        # Aplicar gravedad a la velocidad (en dirección Z)
        self.velocity.z += self.gravity * dt
    
    def update(self, dt):
        """
        Actualizar posición de la esfera según su velocidad
        NO aplica gravedad aquí - la gravedad se aplica antes, igual que al cubo
        """
        if not self.active:
            return
        
        # Solo actualizar posición basándose en la velocidad actual
        self.center += self.velocity * dt
    
    def check_collision(self, particle_location):
        """
        Verificar si una partícula está dentro de la esfera
        Retorna: (bool is_inside, float penetration, Vector3 normal)
        """
        # Vector desde el centro de la esfera a la partícula
        to_particle = particle_location - self.center
        
        # Distancia desde el centro
        distance = to_particle.length
        
        # Si está dentro de la esfera
        if distance < self.radius:
            penetration = self.radius - distance
            
            # Normal apuntando desde el centro hacia la partícula (para empujar hacia afuera)
            if distance > 1e-6:
                normal = to_particle.normalized()
            else:
                # Si la partícula está exactamente en el centro, usar dirección arbitraria
                normal = mathutils.Vector((1, 0, 0))
            
            return True, penetration, normal
        
        return False, 0.0, None
    
    def apply_collision_correction(self, particle, dt, stiffness_override=None):
        """
        Aplicar corrección de colisión a una partícula (lado PBD)
        Esto empuja la partícula fuera de la esfera
        """
        is_inside, penetration, normal = self.check_collision(particle.location)
        
        if not is_inside or normal is None:
            return False
        
        # Usar stiffness personalizado o el de la esfera
        stiffness = stiffness_override if stiffness_override is not None else self.stiffness
        
        # Corrección: empujar la partícula hacia afuera
        correction = normal * penetration * stiffness
        
        # Aplicar corrección
        particle.location += correction
        
        # Si la velocidad apunta hacia adentro, reflejarla (con restitución)
        if particle.velocity.dot(normal) < 0:
            # Velocidad relativa normal
            v_normal = particle.velocity.dot(normal) * normal
            v_tangential = particle.velocity - v_normal
            
            # Reflejar velocidad normal con restitución
            particle.velocity = -v_normal * self.restitution + v_tangential * self.friction
        
        return True
    
    def apply_reaction_impulse(self, total_correction, total_mass, dt):
        """
        Aplicar impulso de reacción a la esfera (conservación de momento)
        total_correction: suma de todas las correcciones aplicadas a las partículas
        total_mass: masa total de las partículas que colisionaron
        dt: timestep
        """
        if total_correction.length < 1e-6 or total_mass < 1e-6:
            return
        
        # Convertir corrección en cambio de velocidad para las partículas
        particle_delta_v = total_correction / dt if dt > 1e-6 else mathutils.Vector((0, 0, 0))
        
        # Impulso aplicado a las partículas (aproximado)
        impulse_on_particles = total_mass * particle_delta_v
        
        # Por conservación de momento, aplicar impulso opuesto a la esfera
        impulse_on_sphere = -impulse_on_particles
        
        # Aplicar a la velocidad de la esfera
        if self.mass > 1e-6:
            self.velocity += impulse_on_sphere / self.mass
            
            # Limitar velocidad máxima para evitar explosiones
            max_velocity = 50.0
            if self.velocity.length > max_velocity:
                self.velocity = self.velocity.normalized() * max_velocity
    
    def get_position(self):
        """Obtener posición actual de la esfera"""
        return mathutils.Vector(self.center)
    
    def set_position(self, position):
        """Establecer posición de la esfera"""
        self.center = mathutils.Vector(position)
    
    def get_velocity(self):
        """Obtener velocidad actual de la esfera"""
        return mathutils.Vector(self.velocity)
    
    def set_velocity(self, velocity):
        """Establecer velocidad de la esfera"""
        self.velocity = mathutils.Vector(velocity)

