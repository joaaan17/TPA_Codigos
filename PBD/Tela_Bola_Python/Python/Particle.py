"""
Clase Particle para Position-Based Dynamics
Migrado de JavaScript a Python para Blender
"""
import mathutils


class Particle:
    def __init__(self, location, velocity, mass, options=None):
        if options is None:
            options = {}
        
        # Vectores de posición y velocidad (usando mathutils.Vector)
        self.location = mathutils.Vector(location)
        self.last_location = mathutils.Vector(location)  # CRÍTICO: debe ser igual a location inicial
        self.velocity = mathutils.Vector(velocity)
        self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        self.force = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Propiedades físicas
        self.masa = mass
        self.w = 1.0 / mass if mass > 0 else 0.0  # Masa inversa
        
        # Estado
        self.bloqueada = False
        self.display_size = options.get('displaySize', 0.1)
        self.radius = options.get('radius', 0.0)
        self.isSphere = options.get('isSphere', False)
        self.isDynamic = options.get('isDynamic', True)
        self.isReleased = options.get('isReleased', True) if self.isSphere else True
        
        # Flags y datos de depuración
        self.inCollisionWithSphere = False
        self.debugId = None
    
    def set_bloqueada(self, bl):
        """Bloquear la partícula (masa infinita)"""
        self.bloqueada = True
        self.w = 0.0
        self.masa = float('inf')
    
    def update_pbd_vel(self, dt):
        """
        Calcular velocidad basada en el cambio de posición
        v = (p_new - p_old) / dt
        """
        import math
        
        # Validar dt
        if dt <= 0 or math.isnan(dt) or math.isinf(dt):
            return
        
        # Validar posiciones antes de calcular velocidad
        if (math.isnan(self.location.x) or math.isnan(self.location.y) or math.isnan(self.location.z) or
            math.isnan(self.last_location.x) or math.isnan(self.last_location.y) or math.isnan(self.last_location.z) or
            math.isinf(self.location.x) or math.isinf(self.location.y) or math.isinf(self.location.z) or
            math.isinf(self.last_location.x) or math.isinf(self.last_location.y) or math.isinf(self.last_location.z)):
            # Si hay NaN, mantener velocidad actual o resetear
            if (math.isnan(self.velocity.x) or math.isnan(self.velocity.y) or math.isnan(self.velocity.z)):
                self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
            return
        
        # Calcular velocidad
        vel_delta = (self.location - self.last_location) / dt
        
        # Validar velocidad calculada
        if (not math.isnan(vel_delta.x) and not math.isnan(vel_delta.y) and not math.isnan(vel_delta.z) and
            not math.isinf(vel_delta.x) and not math.isinf(vel_delta.y) and not math.isinf(vel_delta.z)):
            self.velocity = vel_delta
        else:
            # Si la velocidad calculada es inválida, mantener la anterior o resetear
            if (math.isnan(self.velocity.x) or math.isnan(self.velocity.y) or math.isnan(self.velocity.z)):
                self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
        
        # NOTA: El damping global de Müller se aplica DESPUÉS, en PBDSystem
    
    def update(self, dt):
        """
        Actualizar posición usando integración explícita (Euler semi-implícito)
        """
        import math
        
        if self.isSphere and (not self.isDynamic or not self.isReleased):
            self.last_location = mathutils.Vector(self.location)
            self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
            self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
            self.force = mathutils.Vector((0.0, 0.0, 0.0))
            return
        
        # Si está bloqueada, no actualizar
        if self.bloqueada:
            return
        
        # Validar dt
        if dt <= 0 or math.isnan(dt) or math.isinf(dt):
            if hasattr(self, 'debugId') and self.debugId == 0:
                print(f"   ⚠️ Particle {self.debugId}: dt inválido: {dt}")
            return
        
        # LOG: Verificar fuerzas antes de actualizar (solo primera partícula)
        if hasattr(self, 'debugId') and self.debugId == 0:
            if (math.isnan(self.force.x) or math.isnan(self.force.y) or math.isnan(self.force.z) or
                math.isinf(self.force.x) or math.isinf(self.force.y) or math.isinf(self.force.z)):
                print(f"   🔴 Particle {self.debugId}: Fuerza inválida ANTES de update: {self.force}")
        
        # CRÍTICO: Resetear aceleración ANTES de calcular nueva (no acumular entre frames)
        # La aceleración debe calcularse desde cero cada frame
        self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Actualizar aceleración (solo si masa es finita y positiva)
        if self.masa > 0 and self.masa != float('inf'):
            accel_delta = self.force * self.w
            # Validar que la aceleración no sea NaN
            if (not math.isnan(accel_delta.x) and not math.isnan(accel_delta.y) and not math.isnan(accel_delta.z) and
                not math.isinf(accel_delta.x) and not math.isinf(accel_delta.y) and not math.isinf(accel_delta.z)):
                self.acceleration = accel_delta  # ASIGNAR, no acumular
            elif hasattr(self, 'debugId') and self.debugId == 0:
                print(f"   🔴 Particle {self.debugId}: accel_delta inválido: {accel_delta}, force={self.force}, w={self.w}, masa={self.masa}")
                self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Guardar posición anterior para PBD
        self.last_location = mathutils.Vector(self.location)
        
        # Validar posición y velocidad antes de actualizar
        if (math.isnan(self.location.x) or math.isnan(self.location.y) or math.isnan(self.location.z) or
            math.isinf(self.location.x) or math.isinf(self.location.y) or math.isinf(self.location.z)):
            # Si la posición es inválida, resetear
            if hasattr(self, 'debugId') and self.debugId == 0:
                print(f"   🔴 Particle {self.debugId}: Posición inválida ANTES de update: {self.location}")
            self.location = mathutils.Vector(self.last_location)
            self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
            self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
            self.force = mathutils.Vector((0.0, 0.0, 0.0))
            return
        
        # Validar velocidad antes de usarla
        if (math.isnan(self.velocity.x) or math.isnan(self.velocity.y) or math.isnan(self.velocity.z) or
            math.isinf(self.velocity.x) or math.isinf(self.velocity.y) or math.isinf(self.velocity.z)):
            if hasattr(self, 'debugId') and self.debugId == 0:
                print(f"   🔴 Particle {self.debugId}: Velocidad inválida ANTES de update: {self.velocity}")
            self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Predicción de PBD (Euler semi-implícito)
        # v_new = v_old + a * dt
        vel_delta = self.acceleration * dt
        if (not math.isnan(vel_delta.x) and not math.isnan(vel_delta.y) and not math.isnan(vel_delta.z) and
            not math.isinf(vel_delta.x) and not math.isinf(vel_delta.y) and not math.isinf(vel_delta.z)):
            nueva_vel = self.velocity + vel_delta
            # Validar velocidad resultante
            if (not math.isnan(nueva_vel.x) and not math.isnan(nueva_vel.y) and not math.isnan(nueva_vel.z) and
                not math.isinf(nueva_vel.x) and not math.isinf(nueva_vel.y) and not math.isinf(nueva_vel.z)):
                self.velocity = nueva_vel
            else:
                if hasattr(self, 'debugId') and self.debugId == 0:
                    print(f"   🔴 Particle {self.debugId}: nueva_vel inválida: {nueva_vel}, vel_old={self.velocity}, accel={self.acceleration}")
                # Mantener velocidad anterior si la nueva es inválida
        elif hasattr(self, 'debugId') and self.debugId == 0:
            print(f"   🔴 Particle {self.debugId}: vel_delta inválido: {vel_delta}, accel={self.acceleration}, dt={dt}")
        
        # p_new = p_old + v * dt
        pos_delta = self.velocity * dt
        if (not math.isnan(pos_delta.x) and not math.isnan(pos_delta.y) and not math.isnan(pos_delta.z) and
            not math.isinf(pos_delta.x) and not math.isinf(pos_delta.y) and not math.isinf(pos_delta.z)):
            nueva_pos = self.location + pos_delta
            # Validar posición resultante
            if (not math.isnan(nueva_pos.x) and not math.isnan(nueva_pos.y) and not math.isnan(nueva_pos.z) and
                not math.isinf(nueva_pos.x) and not math.isinf(nueva_pos.y) and not math.isinf(nueva_pos.z)):
                self.location = nueva_pos
            else:
                if hasattr(self, 'debugId') and self.debugId == 0:
                    print(f"   🔴 Particle {self.debugId}: nueva_pos inválida: {nueva_pos}, pos_old={self.location}, vel={self.velocity}")
                # Mantener posición anterior si la nueva es inválida
        elif hasattr(self, 'debugId') and self.debugId == 0:
            print(f"   🔴 Particle {self.debugId}: pos_delta inválido: {pos_delta}, vel={self.velocity}, dt={dt}")
        
        # Validar posición final
        if (math.isnan(self.location.x) or math.isnan(self.location.y) or math.isnan(self.location.z) or
            math.isinf(self.location.x) or math.isinf(self.location.y) or math.isinf(self.location.z)):
            # Si la posición final es inválida, revertir
            if hasattr(self, 'debugId') and self.debugId == 0:
                print(f"   🔴 Particle {self.debugId}: Posición inválida DESPUÉS de update: {self.location}, revirtiendo a {self.last_location}")
            self.location = mathutils.Vector(self.last_location)
            self.velocity = mathutils.Vector((0.0, 0.0, 0.0))
        
        # Limpiar fuerzas y aceleraciones
        self.acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        self.force = mathutils.Vector((0.0, 0.0, 0.0))
    
    def getLocation(self):
        return self.location
    
    def getLastLocation(self):
        return self.last_location

