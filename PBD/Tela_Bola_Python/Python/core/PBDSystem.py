"""
PBDSystem - Sistema de Position-Based Dynamics
"""
import mathutils
from core.Particle import Particle
from constraints.DistanceConstraint import DistanceConstraint


class PBDSystem:
    """Sistema principal de simulación PBD"""
    
    def __init__(self, n, mass):
        """
        Constructor
        n: número de partículas a crear
        mass: masa de cada partícula
        """
        self.particles = []
        self.constraints = []
        self.collisionObjects = []  # Array de objetos de colisión (esferas, planos, etc.)
        self.sphereCollider = None  # Colisionador de esfera (opcional)
        self.niters = 5
        self.shapeMatching = None  # Shape Matching (opcional, para soft-bodies)
        
        # Crear partículas iniciales
        # CRÍTICO: Crear nuevos objetos Vector para cada partícula
        # Si todas comparten el mismo Vector, cambios en una afectan a todas
        for i in range(n):
            p = mathutils.Vector((0, 0, 0))  # Nuevo Vector para cada partícula
            v = mathutils.Vector((0, 0, 0))  # Nuevo Vector para cada partícula
            particle = Particle(p, v, mass)
            self.particles.append(particle)
            
            # DEBUG: Verificar que cada partícula tiene su propio Vector (primeras 3)
            if i < 3:
                print(f"      DEBUG PBDSystem: Partícula {i} creada - id(location)={id(particle.location)}, id(velocity)={id(particle.velocity)}")
    
    def set_n_iters(self, n):
        """Configurar número de iteraciones del solver"""
        self.niters = n
        for constraint in self.constraints:
            constraint.compute_k_coef(n)
    
    def add_constraint(self, c):
        """Añadir una restricción al sistema"""
        self.constraints.append(c)
        c.compute_k_coef(self.niters)
    
    def add_collision_object(self, obj):
        """Añadir un objeto de colisión al sistema"""
        self.collisionObjects.append(obj)
    
    def set_sphere_collider(self, sphere_collider):
        """Configurar el colisionador de esfera"""
        self.sphereCollider = sphere_collider
    
    def set_shape_matching(self, shapeMatching):
        """Configurar Shape Matching (opcional)"""
        self.shapeMatching = shapeMatching
    
    def run(self, dt, apply_damping=True, use_plane_col=True, use_sphere_col=True, use_shape_matching=True, debug_frame=None, floor_height=None):
        # DEBUG: Estado al inicio de run (solo primeros frames)
        if debug_frame is not None and debug_frame <= 3:
            print(f"      DEBUG PBDSystem.run: Frame {debug_frame}, dt={dt:.6f}")
            print(f"         Partículas: {len(self.particles)}, Restricciones: {len(self.constraints)}")
            print(f"         Primeras 3 partículas al INICIO de run:")
            for i in range(min(3, len(self.particles))):
                p = self.particles[i]
                print(f"            Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                      f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
        """
        Ejecutar un paso de simulación PBD
        
        dt: timestep
        apply_damping: aplicar damping global de Müller
        use_plane_col: usar colisiones con plano
        use_sphere_col: usar colisiones con esfera
        use_shape_matching: usar Shape Matching
        debug_frame: número de frame para logs (None = sin logs)
        floor_height: altura del suelo para colisiones (None = desactivado)
        """
        import math
        
        # LOG: Verificar posiciones ANTES de update (solo frame 1-3)
        if debug_frame is not None and debug_frame <= 3:
            nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            if nan_count > 0:
                print(f"   🔴 Frame {debug_frame}: {nan_count} partículas con NaN ANTES de update()")
        
        # 1. Predicción de posiciones (integración explícita)
        for particle in self.particles:
            particle.update(dt)
        
        # 1b. Predicción de posición de la esfera (si existe)
        # CRÍTICO: Actualizar posición de la esfera ANTES del solver, igual que las partículas
        # La gravedad ya se aplicó antes de llamar a run(), aquí solo actualizamos posición
        if self.sphereCollider is not None and self.sphereCollider.active:
            self.sphereCollider.update(dt)
        
        # LOG: Verificar posiciones DESPUÉS de update (solo frame 1-3)
        if debug_frame is not None and debug_frame <= 3:
            nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            if nan_count > 0:
                print(f"   🔴 Frame {debug_frame}: {nan_count} partículas con NaN DESPUÉS de update()")
        
        # Resetear flags de colisión
        for particle in self.particles:
            particle.inCollisionWithSphere = False
        
        # Número de iteraciones para Shape Matching (30% del total)
        shapeMatchingIterations = max(1, int(self.niters * 0.3))
        
        # 2. Bucle de solver de restricciones
        for it in range(self.niters):
            # LOG: Verificar posiciones antes de restricciones (solo primera iteración, frame 1-3)
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_count > 0:
                    print(f"   🔴 Frame {debug_frame}, iter {it}: {nan_count} partículas con NaN ANTES de restricciones")
            
            # Importar aquí para evitar imports circulares y para detectar stiffness
            from constraints.BendingConstraint import BendingConstraint
            from constraints.ShearConstraint import ShearConstraint
            from constraints.VolumeConstraintTet import VolumeConstraintTet
            from constraints.VolumeConstraintGlobal import VolumeConstraintGlobal
            
            # NUEVO: Detectar si hay stiffness muy bajo en restricciones de volumen
            # Si es así, resolver volumen PRIMERO para darle prioridad
            min_volume_stiffness = 1.0
            for c in self.constraints:
                if type(c).__name__ in ['VolumeConstraintTet', 'VolumeConstraintGlobal']:
                    if hasattr(c, 'stiffness'):
                        min_volume_stiffness = min(min_volume_stiffness, c.stiffness)
            
            # ORDEN DE RESOLUCIÓN ADAPTATIVO
            # Si stiffness de volumen < 0.25 → Resolver volumen PRIMERO
            # De lo contrario → Orden normal (distancias primero)
            if min_volume_stiffness < 0.25:
                # MODO VOLUMEN PRIMERO (para stiffness bajo)
                # 2a. Resolver restricciones de volumen PRIMERO (múltiples iteraciones)
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_before_vol = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                
                # Calcular iteraciones de volumen
                if min_volume_stiffness > 0.7:
                    num_volume_iterations = 5 if it < 3 else 3
                elif min_volume_stiffness > 0.3:
                    num_volume_iterations = 8 if it < 3 else 5
                else:
                    num_volume_iterations = 12 if it < 3 else 8
                
                for vol_iter in range(num_volume_iterations):
                    self.projectConstraintsOfType(VolumeConstraintTet)
                    self.projectConstraintsOfType(VolumeConstraintGlobal)
                
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_after_vol = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                    if nan_after_vol > nan_before_vol:
                        print(f"   🔴 Frame {debug_frame}, iter {it}: VolumeConstraint generó NaN: {nan_before_vol} -> {nan_after_vol}")
                
                # 2b. Luego distancias (con menos fuerza gracias al ajuste adaptativo)
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_before_dist = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                
                self.projectConstraintsOfType(DistanceConstraint)
            else:
                # MODO NORMAL (orden original para stiffness normal/alto)
                # 2a. Resolver restricciones internas en orden específico
                # LOG: Antes de DistanceConstraint
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_before_dist = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                
                self.projectConstraintsOfType(DistanceConstraint)
            
            # LOG: Después de DistanceConstraint
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_after_dist = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_after_dist > nan_before_dist:
                    print(f"   🔴 Frame {debug_frame}, iter {it}: DistanceConstraint generó NaN: {nan_before_dist} -> {nan_after_dist}")
            
            # LOG: Antes de ShearConstraint
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_before_shear = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            
            self.projectConstraintsOfType(ShearConstraint)
            
            # LOG: Después de ShearConstraint
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_after_shear = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_after_shear > nan_before_shear:
                    print(f"   🔴 Frame {debug_frame}, iter {it}: ShearConstraint generó NaN: {nan_before_shear} -> {nan_after_shear}")
            
            # LOG: Antes de BendingConstraint
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_before_bend = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            
            self.projectConstraintsOfType(BendingConstraint)
            
            # LOG: Después de BendingConstraint
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_after_bend = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_after_bend > nan_before_bend:
                    print(f"   🔴 Frame {debug_frame}, iter {it}: BendingConstraint generó NaN: {nan_before_bend} -> {nan_after_bend}")
            
            # 2b. APLICAR SHAPE MATCHING (Müller 2005) en primeras iteraciones
            if self.shapeMatching and use_shape_matching and it < shapeMatchingIterations:
                self.shapeMatching.apply()
            
            # 2c. Resolver colisiones PRIMERO (antes de restricciones de volumen)
            self.projectCollisions(use_plane_col, use_sphere_col, dt)
            
            # 2d. Colisión con suelo (plano Z = altura_suelo) - APLICAR ANTES de restricciones de volumen
            # NOTA: La colisión se aplica antes, pero las restricciones de volumen corrigen después
            if use_plane_col and floor_height is not None:
                self.projectFloorCollision(dt, floor_height)
            
            # 2d2. Colisión con esfera - APLICAR DESPUÉS del suelo
            if use_sphere_col and self.sphereCollider is not None:
                self.projectSphereCollision(dt, floor_height)
            
            # 2e. Resolver restricciones de volumen DESPUÉS de colisiones (para corregir el aplastamiento)
            # SOLO si NO se resolvieron al principio (stiffness >= 0.25)
            if min_volume_stiffness >= 0.25:
                # MODO NORMAL: Volumen después de colisiones
                # LOG: Antes de VolumeConstraint
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_before_vol = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                
                # Calcular iteraciones basadas en stiffness:
                # - Stiffness alto (>0.7): 3-5 iteraciones
                # - Stiffness medio (0.3-0.7): 5-8 iteraciones  
                # - Stiffness bajo (<0.3): 8-12 iteraciones
                if min_volume_stiffness > 0.7:
                    num_volume_iterations = 5 if it < 3 else 3
                elif min_volume_stiffness > 0.3:
                    num_volume_iterations = 8 if it < 3 else 5
                else:
                    num_volume_iterations = 12 if it < 3 else 8
                
                for vol_iter in range(num_volume_iterations):
                    # Proyectar restricciones de volumen por tetraedros
                    self.projectConstraintsOfType(VolumeConstraintTet)
                    
                    # Proyectar restricción de volumen global (si existe)
                    self.projectConstraintsOfType(VolumeConstraintGlobal)
                
                # LOG: Después de VolumeConstraint
                if debug_frame is not None and debug_frame <= 3 and it == 0:
                    nan_after_vol = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                    if nan_after_vol > nan_before_vol:
                        print(f"   🔴 Frame {debug_frame}, iter {it}: VolumeConstraint generó NaN: {nan_before_vol} -> {nan_after_vol}")
            
            # LOG: Verificar posiciones después de todas las restricciones (solo primera iteración, frame 1-3)
            if debug_frame is not None and debug_frame <= 3 and it == 0:
                nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
                if nan_count > 0:
                    print(f"   🔴 Frame {debug_frame}, iter {it}: {nan_count} partículas con NaN DESPUÉS de todas las restricciones")
                else:
                    print(f"   ✅ Frame {debug_frame}, iter {it}: Todas válidas DESPUÉS de todas las restricciones")
        
        # LOG: Verificar posiciones después de restricciones, antes de update_pbd_vel (solo frame 1-3)
        if debug_frame is not None and debug_frame <= 3:
            nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            if nan_count > 0:
                print(f"   🔴 Frame {debug_frame}: {nan_count} partículas con NaN DESPUÉS de restricciones, ANTES de update_pbd_vel")
            else:
                print(f"   ✅ Frame {debug_frame}: Todas válidas DESPUÉS de restricciones")
        
        # LOG: Verificar velocidades ANTES de update_pbd_vel (solo frame 2-3)
        if debug_frame is not None and debug_frame >= 2 and debug_frame <= 3:
            vel_invalidas = sum(1 for p in self.particles if (math.isnan(p.velocity.x) or math.isnan(p.velocity.y) or math.isnan(p.velocity.z) or
                                                              math.isinf(p.velocity.x) or math.isinf(p.velocity.y) or math.isinf(p.velocity.z)))
            if vel_invalidas > 0:
                print(f"   🔴 Frame {debug_frame}: {vel_invalidas} partículas con velocidad inválida ANTES de update_pbd_vel")
                # Mostrar ejemplo
                for i, p in enumerate(self.particles[:3]):
                    if (math.isnan(p.velocity.x) or math.isnan(p.velocity.y) or math.isnan(p.velocity.z)):
                        print(f"      Partícula {i}: vel={p.velocity}, location={p.location}, last_location={p.last_location}")
        
        # 3. Actualizar velocidades basándose en el cambio de posición
        # v[i] = (p_new[i] - p_old[i]) / dt
        for particle in self.particles:
            particle.update_pbd_vel(dt)
        
        # LOG: Verificar velocidades DESPUÉS de update_pbd_vel (solo frame 2-3)
        if debug_frame is not None and debug_frame >= 2 and debug_frame <= 3:
            vel_invalidas = sum(1 for p in self.particles if (math.isnan(p.velocity.x) or math.isnan(p.velocity.y) or math.isnan(p.velocity.z) or
                                                              math.isinf(p.velocity.x) or math.isinf(p.velocity.y) or math.isinf(p.velocity.z)))
            if vel_invalidas > 0:
                print(f"   🔴 Frame {debug_frame}: {vel_invalidas} partículas con velocidad inválida DESPUÉS de update_pbd_vel")
        
        # LOG: Verificar posiciones después de update_pbd_vel, antes de damping (solo frame 1-3)
        if debug_frame is not None and debug_frame <= 3:
            nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            if nan_count > 0:
                print(f"   🔴 Frame {debug_frame}: {nan_count} partículas con NaN DESPUÉS de update_pbd_vel")
                # Mostrar ejemplos
                for i, p in enumerate(self.particles[:3]):
                    if math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z):
                        print(f"      Partícula {i}: location={p.location}, last_location={p.last_location}, vel={p.velocity}")
        
        # 4. APLICAR DAMPING GLOBAL (según Müller07, preserva movimiento rígido)
        if apply_damping:
            self.applyGlobalDamping(0.1, debug_frame=debug_frame)  # k_damping reducido a 0.1 (más suave)
        
        # LOG: Verificar posiciones DESPUÉS de todo (solo frame 1-3)
        if debug_frame is not None and debug_frame <= 3:
            nan_count = sum(1 for p in self.particles if (math.isnan(p.location.x) or math.isnan(p.location.y) or math.isnan(p.location.z)))
            if nan_count > 0:
                print(f"   🔴 Frame {debug_frame}: {nan_count} partículas con NaN DESPUÉS de run() completo")
            else:
                print(f"   ✅ Frame {debug_frame}: Todas válidas DESPUÉS de run() completo")
            
            # DEBUG: Estado final de las primeras 3 partículas
            print(f"      DEBUG PBDSystem.run: Primeras 3 partículas al FINAL de run:")
            for i in range(min(3, len(self.particles))):
                p = self.particles[i]
                print(f"            Partícula {i}: loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                      f"vel=({p.velocity.x:.6f}, {p.velocity.y:.6f}, {p.velocity.z:.6f})")
    
    def projectConstraintsOfType(self, typeClass, enabled=True):
        """Proyectar todas las restricciones de un tipo específico"""
        if not enabled or typeClass is None:
            return
        
        for constraint in self.constraints:
            if isinstance(constraint, typeClass):
                constraint.proyecta_restriccion()
    
    def projectCollisions(self, use_plane_col, use_sphere_col, dt):
        """Proyectar colisiones con objetos externos"""
        for obj in self.collisionObjects:
            # Por ahora solo implementamos colisiones básicas
            # Se pueden añadir más tipos de colisiones aquí
            if hasattr(obj, 'project'):
                obj.project(self.particles, dt)
    
    def projectFloorCollision(self, dt, floor_height=0.0):
        """
        Proyectar colisiones con el suelo (plano horizontal) de forma suave
        Usa una fuerza de repulsión proporcional a la penetración en lugar de mover directamente
        floor_height: altura Z del suelo (en Blender, Z es el eje vertical)
        """
        import math
        
        # Parámetros de colisión suave
        # CRÍTICO: La colisión debe ser suave para permitir que las restricciones de volumen funcionen
        # Si la colisión es demasiado agresiva, comprime el cubo antes de que las restricciones puedan corregir
        stiffness_collision = 0.3  # Rigidez de la colisión (0-1, más alto = más rígido) - Ajustado
        damping_collision = 0.3  # Damping del rebote (0-1, más alto = menos rebote) - Ajustado
        min_penetration = 0.001  # Penetración mínima para aplicar corrección (evita micro-colisiones)
        
        # Límite máximo de penetración permitida antes de aplicar corrección forzada
        # Esto previene que las partículas se compriman demasiado y causen inversión de tetraedros
        max_penetration = 0.05  # REDUCIDO: Si la penetración es mayor, aplicar corrección más agresiva
        
        for particle in self.particles:
            if particle.bloqueada:
                continue
            
            # Calcular penetración en el suelo
            penetration = floor_height - particle.location.z
            
            # Si hay penetración significativa, aplicar corrección suave
            if penetration > min_penetration:
                # Si la penetración es muy grande, limitarla para prevenir compresión excesiva
                if penetration > max_penetration:
                    # Aplicar corrección más agresiva pero limitada
                    correction = max_penetration * stiffness_collision + (penetration - max_penetration) * 0.5
                else:
                    # Corrección proporcional a la penetración (más suave que mover directamente)
                    correction = penetration * stiffness_collision
                
                particle.location.z += correction
                
                # Si la velocidad apunta hacia abajo (Z negativo), reflejarla (con damping)
                if particle.velocity.z < 0:
                    # Damping de rebote (coeficiente de restitución)
                    restitution = damping_collision  # Ajustado para menos rebote agresivo
                    particle.velocity.z = -particle.velocity.z * restitution
                    
                    # También reducir velocidad horizontal por fricción (X e Y)
                    friction = 0.7  # Fricción ligeramente reducida
                    particle.velocity.x *= friction
                    particle.velocity.y *= friction
    
    def projectSphereCollision(self, dt, floor_height=None):
        """
        Resolver colisiones entre partículas del cubo y la esfera
        Implementa dos-way coupling: partículas son empujadas fuera y la esfera recibe impulso
        floor_height: altura del suelo (None = no hay suelo)
        """
        if self.sphereCollider is None or not self.sphereCollider.active:
            return
        
        # NOTA: La posición de la esfera ya se actualizó en la fase de predicción (antes del solver)
        # Aquí solo resolvemos las colisiones, no actualizamos posición
        
        # Acumuladores para impulso de reacción (basado en velocidades relativas)
        total_impulse = mathutils.Vector((0, 0, 0))
        total_mass = 0.0
        
        # Velocidad de la esfera (para calcular velocidad relativa)
        sphere_velocity = self.sphereCollider.velocity
        
        # Resolver colisión para cada partícula
        for particle in self.particles:
            if particle.bloqueada:
                continue
            
            # Verificar colisión
            is_inside, penetration, normal = self.sphereCollider.check_collision(particle.location)
            
            if is_inside and normal is not None:
                # Calcular velocidad relativa ANTES de aplicar correcciones
                relative_velocity = particle.velocity - sphere_velocity
                relative_v_normal = relative_velocity.dot(normal)
                relative_speed = abs(relative_v_normal)
                
                # UMBRALES para evitar colisiones continuas cuando hay contacto estático
                min_relative_speed_for_collision = 0.2  # Velocidad mínima relativa para considerar colisión activa
                min_relative_speed_for_strong_correction = 0.5  # Velocidad mínima para corrección fuerte
                
                # Si la esfera está en reposo, reducir aún más las correcciones
                if self.sphereCollider.is_resting:
                    # En reposo: corrección mínima solo para evitar penetración profunda
                    static_correction_factor = 0.1  # Reducir corrección al 10% cuando está en reposo
                    stiffness = self.sphereCollider.stiffness * static_correction_factor
                # Si la velocidad relativa es muy baja, reducir corrección (contacto estático)
                # Esto evita el ciclo infinito de colisión cuando la esfera está reposando
                elif relative_speed < min_relative_speed_for_collision:
                    # Contacto estático: aplicar corrección mínima solo para evitar penetración
                    static_correction_factor = 0.2  # Reducir corrección al 20% en contacto estático
                    stiffness = self.sphereCollider.stiffness * static_correction_factor
                else:
                    # Colisión activa: corrección normal o aumentada
                    stiffness = self.sphereCollider.stiffness
                    
                    # Aumentar corrección solo si hay movimiento significativo
                    if relative_speed > min_relative_speed_for_strong_correction:
                        # Factor basado en masa: esferas más pesadas deforman más el cubo
                        mass_factor = min(2.0, 1.0 + (self.sphereCollider.mass / 2.0))
                        stiffness *= mass_factor
                
                # Aplicar corrección PBD: empujar partícula fuera de la esfera
                correction = normal * penetration * stiffness
                particle.location += correction
                
                # Solo aplicar impulso si hay movimiento relativo hacia adentro Y significativo
                if relative_v_normal < -min_relative_speed_for_collision:  # Acercándose con velocidad significativa
                    # Calcular impulso usando conservación de momento y restitución
                    # Impulso = masa_relativa * cambio_de_velocidad_normal
                    # Cambio de velocidad = -(1 + restitución) * velocidad_relativa_normal
                    restitution = self.sphereCollider.restitution
                    
                    # Masa efectiva para colisión (1/m_eff = 1/m1 + 1/m2)
                    if particle.masa > 1e-6 and self.sphereCollider.mass > 1e-6:
                        effective_mass = 1.0 / (1.0/particle.masa + 1.0/self.sphereCollider.mass)
                    else:
                        effective_mass = min(particle.masa, self.sphereCollider.mass) if particle.masa > 1e-6 else self.sphereCollider.mass
                    
                    # Impulso en dirección normal (conservación de momento)
                    # Reducir impulso si la esfera está en reposo o la velocidad relativa es muy baja
                    if self.sphereCollider.is_resting:
                        # En reposo: impulso mínimo (casi cero)
                        static_impulse_factor = 0.1  # Reducir impulso al 10% cuando está en reposo
                        mass_boost = 1.0  # Sin boost de masa en reposo
                    elif relative_speed < min_relative_speed_for_strong_correction:
                        # Contacto estático: reducir impulso significativamente
                        static_impulse_factor = 0.3  # Reducir impulso al 30% en contacto estático
                        mass_boost = 1.0  # Sin boost de masa en contacto estático
                    else:
                        # Colisión activa: impulso normal o aumentado
                        static_impulse_factor = 1.0
                        mass_boost = 1.0 + (self.sphereCollider.mass / 5.0)  # Boost basado en masa (máx 2x para masa 5kg)
                    
                    impulse_magnitude = effective_mass * (1.0 + restitution) * abs(relative_v_normal) * mass_boost * static_impulse_factor
                    impulse = normal * impulse_magnitude
                    
                    # Aplicar impulso a la partícula (cambiar su velocidad)
                    if particle.masa > 1e-6:
                        # Factor de deformación: muy reducido en reposo, reducido en contacto estático
                        if self.sphereCollider.is_resting:
                            deformation_boost = 0.2  # Muy reducido cuando está en reposo (evitar movimiento)
                        elif relative_speed < min_relative_speed_for_strong_correction:
                            deformation_boost = 0.5  # Reducir impulso en contacto estático
                        else:
                            deformation_boost = 1.5  # Aumentar impulso 50% para más deformación en colisión activa
                        particle.velocity += (impulse / particle.masa) * deformation_boost
                        
                        # Aplicar fricción a componente tangencial
                        v_tangential = relative_velocity - relative_v_normal * normal
                        friction = self.sphereCollider.friction
                        particle.velocity -= v_tangential * (friction / particle.masa)
                    
                    # Acumular impulso opuesto para la esfera (conservación de momento)
                    total_impulse -= impulse  # Opuesto porque es reacción
                    total_mass += particle.masa
        
        # Aplicar impulso de reacción a la esfera (conservación de momento)
        if total_impulse.length > 1e-6 and self.sphereCollider.mass > 1e-6:
            # Si está en reposo, reducir mucho más el impulso
            if self.sphereCollider.is_resting:
                # En reposo: aplicar solo 10% del impulso
                total_impulse *= 0.1
            
            # Cambio de velocidad de la esfera = impulso / masa_esfera
            self.sphereCollider.velocity += total_impulse / self.sphereCollider.mass
            
            # Aplicar damping adicional después de colisión para reducir rebote
            # Más agresivo si está en reposo
            if self.sphereCollider.is_resting:
                collision_damping = 0.5  # Reducir 50% cuando está en reposo (muy agresivo)
            else:
                collision_damping = 0.7  # Reducir velocidad 30% después de colisión con cubo
            self.sphereCollider.velocity *= collision_damping
            
            # Reducir aún más la componente vertical si está rebotando
            if self.sphereCollider.velocity.z > 0:  # Rebotando hacia arriba
                self.sphereCollider.velocity.z *= 0.8  # Reducir rebote vertical adicional
            
            # Limitar velocidad máxima para evitar explosiones
            max_velocity = 50.0
            if self.sphereCollider.velocity.length > max_velocity:
                self.sphereCollider.velocity = self.sphereCollider.velocity.normalized() * max_velocity
            
            # Si la velocidad es muy baja después de colisión, detenerla casi completamente
            min_velocity_after_collision = 0.5  # Velocidad mínima después de colisión (aumentada)
            if self.sphereCollider.velocity.length < min_velocity_after_collision:
                self.sphereCollider.velocity *= 0.3  # Reducir mucho más si es muy baja (antes 0.5)
        
        # Colisión de la esfera con el suelo (opcional, para evitar que caiga infinitamente)
        if floor_height is not None and self.sphereCollider.center.z - self.sphereCollider.radius < floor_height:
            # La esfera está debajo del suelo, corregir
            penetration = self.sphereCollider.radius - (self.sphereCollider.center.z - floor_height)
            self.sphereCollider.center.z = floor_height + self.sphereCollider.radius
            
            # Reflejar velocidad vertical con restitución reducida y damping adicional
            if self.sphereCollider.velocity.z < 0:
                # Aplicar restitución (rebote) - muy reducida
                bounce_velocity = -self.sphereCollider.velocity.z * self.sphereCollider.restitution
                
                # Aplicar damping adicional al rebote del suelo (más agresivo)
                damping_factor = 0.75  # Reducir velocidad 25% después del rebote (antes 0.9)
                self.sphereCollider.velocity.z = bounce_velocity * damping_factor
                
                # También reducir velocidad horizontal por fricción con el suelo
                friction = self.sphereCollider.friction
                self.sphereCollider.velocity.x *= friction
                self.sphereCollider.velocity.y *= friction
            
            # Si la velocidad es muy baja, detenerla completamente (evitar micro-rebotes)
            min_velocity_threshold = 0.4  # Velocidad mínima (m/s) - reducida para detenerse antes
            if abs(self.sphereCollider.velocity.z) < min_velocity_threshold:
                self.sphereCollider.velocity.z = 0.0
            if self.sphereCollider.velocity.length < min_velocity_threshold:
                self.sphereCollider.velocity = mathutils.Vector((0, 0, 0))
    
    def applyGlobalDamping(self, k_damping, debug_frame=None):
        """
        Damping global de Müller (2007)
        Preserva el movimiento rígido (traslación + rotación)
        y solo atenúa las vibraciones y energía artificial de las constraints
        
        k_damping: parámetro entre 0 y 1
        0 = sin damping
        1 = elimina todo movimiento no rígido
        Recomendado: 0.1 - 0.2
        """
        import math
        
        n = len(self.particles)
        if n == 0:
            return
        
        # ===== A) Calcular centro de masas =====
        # CRÍTICO: Excluir partículas bloqueadas (masa = inf) para evitar NaN
        x_cm = mathutils.Vector((0, 0, 0))
        total_mass = 0.0
        particles_validas = []
        
        for particle in self.particles:
            # Solo incluir partículas no bloqueadas con masa finita
            if not particle.bloqueada and particle.masa != float('inf') and particle.masa > 0:
                # LOG: Verificar posición antes de usar
                if debug_frame is not None and debug_frame <= 3:
                    if (math.isnan(particle.location.x) or math.isnan(particle.location.y) or math.isnan(particle.location.z)):
                        print(f"   🔴 Damping: Partícula con NaN en location: {particle.location}, masa={particle.masa}")
                
                x_cm += particle.location * particle.masa
                total_mass += particle.masa
                particles_validas.append(particle)
        
        # Si no hay partículas válidas, no aplicar damping
        if total_mass <= 0 or len(particles_validas) == 0:
            if debug_frame is not None and debug_frame <= 3:
                print(f"   ⚠️ Damping: No hay partículas válidas (total_mass={total_mass}, validas={len(particles_validas)})")
            return
        
        # LOG: Verificar x_cm y total_mass antes de dividir
        if debug_frame is not None and debug_frame <= 3:
            if (math.isnan(x_cm.x) or math.isnan(x_cm.y) or math.isnan(x_cm.z) or
                math.isinf(x_cm.x) or math.isinf(x_cm.y) or math.isinf(x_cm.z) or
                math.isnan(total_mass) or math.isinf(total_mass)):
                print(f"   🔴 Damping: x_cm o total_mass inválido ANTES de dividir: x_cm={x_cm}, total_mass={total_mass}")
        
        x_cm /= total_mass
        
        # LOG: Verificar x_cm después de dividir
        if debug_frame is not None and debug_frame <= 3:
            if (math.isnan(x_cm.x) or math.isnan(x_cm.y) or math.isnan(x_cm.z)):
                print(f"   🔴 Damping: x_cm inválido DESPUÉS de dividir: {x_cm}")
        
        # ===== B) Calcular velocidad del centro de masas =====
        v_cm = mathutils.Vector((0, 0, 0))
        
        # Solo usar partículas válidas (no bloqueadas)
        for particle in particles_validas:
            v_cm += particle.velocity * particle.masa
        
        if total_mass > 0:
            v_cm /= total_mass
        
        # ===== C) Calcular momento angular L =====
        L = mathutils.Vector((0, 0, 0))
        
        # Solo usar partículas válidas (no bloqueadas)
        for particle in particles_validas:
            r = particle.location - x_cm  # Posición relativa
            momentum = particle.velocity * particle.masa  # m * v
            angular = mathutils.Vector.cross(r, momentum)  # r × (m * v)
            L += angular
        
        # ===== D) Calcular tensor de inercia I (matriz 3x3) =====
        # I = Σ m[i] * (|r|² * Identity - outer(r, r))
        I = [[0.0, 0.0, 0.0],
             [0.0, 0.0, 0.0],
             [0.0, 0.0, 0.0]]
        
        # Solo usar partículas válidas (no bloqueadas)
        for particle in particles_validas:
            r = particle.location - x_cm
            r_sq = r.length_squared
            m = particle.masa
            
            # Diagonal: m * |r|²
            I[0][0] += m * r_sq
            I[1][1] += m * r_sq
            I[2][2] += m * r_sq
            
            # Fuera de diagonal: -m * r[i] * r[j]
            I[0][0] -= m * r.x * r.x
            I[0][1] -= m * r.x * r.y
            I[0][2] -= m * r.x * r.z
            
            I[1][0] -= m * r.y * r.x
            I[1][1] -= m * r.y * r.y
            I[1][2] -= m * r.y * r.z
            
            I[2][0] -= m * r.z * r.x
            I[2][1] -= m * r.z * r.y
            I[2][2] -= m * r.z * r.z
        
        # ===== E) Calcular velocidad angular w = I^(-1) * L =====
        w = self.invertMatrixAndMultiply(I, L)
        
        # Si la inversión falla (matriz singular), no aplicar damping angular
        if w is None:
            # Solo aplicar damping a traslación (solo a partículas válidas)
            for particle in particles_validas:
                v_non_rigid = particle.velocity - v_cm
                particle.velocity = v_cm + v_non_rigid * (1.0 - k_damping)
            return
        
        # ===== F y G) Calcular velocidad rígida y aplicar damping =====
        # Solo aplicar a partículas válidas (no bloqueadas)
        for particle in particles_validas:
            r = particle.location - x_cm  # Posición relativa
            
            # Velocidad rígida ideal: v_rigid = v_cm + w × r
            w_cross_r = mathutils.Vector.cross(w, r)
            v_rigid = v_cm + w_cross_r
            
            # Aplicar damping solo a la parte no rígida
            # v_new = v_rigid + (1 - k_damping) * (v_old - v_rigid)
            v_non_rigid = particle.velocity - v_rigid
            particle.velocity = v_rigid + v_non_rigid * (1.0 - k_damping)
    
    def invertMatrixAndMultiply(self, I, v):
        """
        Invertir matriz 3x3 y multiplicar por vector
        Retorna None si la matriz es singular
        """
        # Calcular determinante
        det = (I[0][0] * (I[1][1] * I[2][2] - I[1][2] * I[2][1]) -
               I[0][1] * (I[1][0] * I[2][2] - I[1][2] * I[2][0]) +
               I[0][2] * (I[1][0] * I[2][1] - I[1][1] * I[2][0]))
        
        # Si determinante es muy pequeño, la matriz es singular
        if abs(det) < 0.0001:
            return None
        
        # Calcular matriz inversa usando cofactores
        invDet = 1.0 / det
        I_inv = [
            [
                (I[1][1] * I[2][2] - I[1][2] * I[2][1]) * invDet,
                (I[0][2] * I[2][1] - I[0][1] * I[2][2]) * invDet,
                (I[0][1] * I[1][2] - I[0][2] * I[1][1]) * invDet
            ],
            [
                (I[1][2] * I[2][0] - I[1][0] * I[2][2]) * invDet,
                (I[0][0] * I[2][2] - I[0][2] * I[2][0]) * invDet,
                (I[0][2] * I[1][0] - I[0][0] * I[1][2]) * invDet
            ],
            [
                (I[1][0] * I[2][1] - I[1][1] * I[2][0]) * invDet,
                (I[0][1] * I[2][0] - I[0][0] * I[2][1]) * invDet,
                (I[0][0] * I[1][1] - I[0][1] * I[1][0]) * invDet
            ]
        ]
        
        # Multiplicar I_inv * v
        result = mathutils.Vector((
            I_inv[0][0] * v.x + I_inv[0][1] * v.y + I_inv[0][2] * v.z,
            I_inv[1][0] * v.x + I_inv[1][1] * v.y + I_inv[1][2] * v.z,
            I_inv[2][0] * v.x + I_inv[2][1] * v.y + I_inv[2][2] * v.z
        ))
        
        return result

