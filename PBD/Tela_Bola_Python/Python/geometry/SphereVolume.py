"""
Funciones para crear una esfera con restricciones de volumen (PBD Sphere)
Genera partículas dentro de una esfera, tetraedros interiores y calcula volúmenes iniciales
"""
import mathutils
import math
from core.PBDSystem import PBDSystem
from constraints.VolumeConstraintTet import VolumeConstraintTet
from constraints.VolumeConstraintGlobal import VolumeConstraintGlobal
from constraints.DistanceConstraint import DistanceConstraint
from constraints.BendingConstraint import BendingConstraint
from geometry.CuboVolumen import calcular_volumen_tetraedro


def generar_particulas_esfera(radio, subdivisiones, centro=None):
    """
    Generar partículas dentro de una esfera usando un grid cúbico
    Solo se incluyen partículas cuya distancia al centro <= radio
    
    Args:
        radio: radio de la esfera
        subdivisiones: número de subdivisiones por eje (NxNxN grid)
        centro: centro de la esfera (mathutils.Vector, opcional, por defecto (0,0,0))
    
    Returns:
        Tupla (lista de posiciones, diccionario de mapeo grid->índice)
    """
    if centro is None:
        centro = mathutils.Vector((0.0, 0.0, 0.0))
    
    # Espaciado entre partículas en el grid
    spacing = (2.0 * radio) / subdivisiones if subdivisiones > 1 else radio
    
    # Origen del grid (esquina inferior izquierda)
    origen = centro - mathutils.Vector((radio, radio, radio))
    
    particulas = []
    particulas_grid = {}  # Mapeo directo: (x, y, z) -> índice en la lista
    
    # Iterar sobre todo el grid cúbico
    for x in range(subdivisiones + 1):
        for y in range(subdivisiones + 1):
            for z in range(subdivisiones + 1):
                # Calcular posición en el grid
                p = origen + mathutils.Vector((x * spacing, y * spacing, z * spacing))
                
                # Calcular distancia al centro
                distancia_al_centro = (p - centro).length
                
                # Solo incluir si está dentro de la esfera
                if distancia_al_centro <= radio:
                    idx = len(particulas)  # Índice será la posición en la lista
                    particulas.append(p)
                    particulas_grid[(x, y, z)] = idx  # Mapeo directo
    
    return particulas, particulas_grid


def obtener_indice_particula_grid(x, y, z, subdivisiones, particulas_grid):
    """
    Obtener el índice de una partícula en la lista basado en su posición en el grid
    Retorna -1 si la partícula no existe (está fuera de la esfera)
    
    Args:
        x, y, z: coordenadas en el grid (0 a subdivisiones)
        subdivisiones: número de subdivisiones
        particulas_grid: diccionario {(x,y,z): índice} mapeando posiciones del grid a índices
    
    Returns:
        Índice de la partícula en la lista, o -1 si no existe
    """
    key = (x, y, z)
    return particulas_grid.get(key, -1)


def generar_tetraedros_esfera(radio, subdivisiones, particulas, particulas_grid):
    """
    Generar tetraedros para una esfera usando el método cube-based tetra splitting
    Solo se generan tetraedros para cubos completamente dentro de la esfera
    
    Args:
        radio: radio de la esfera
        subdivisiones: número de subdivisiones por eje
        particulas: lista de posiciones de partículas
        particulas_grid: diccionario {(x,y,z): índice} mapeando posiciones del grid
    
    Returns:
        Lista de tetraedros, cada uno es (i0, i1, i2, i3) con índices de partículas
    """
    centro = mathutils.Vector((0.0, 0.0, 0.0))
    spacing = (2.0 * radio) / subdivisiones if subdivisiones > 1 else radio
    origen = centro - mathutils.Vector((radio, radio, radio))
    
    tetraedros = []
    cubos_procesados = 0
    cubos_completos = 0
    cubos_incompletos = 0
    
    # Iterar sobre cada cubo del grid
    for x in range(subdivisiones):
        for y in range(subdivisiones):
            for z in range(subdivisiones):
                cubos_procesados += 1
                
                # Obtener las 8 esquinas del cubo
                esquinas = [
                    (x, y, z),           # v0
                    (x + 1, y, z),       # v1
                    (x + 1, y + 1, z),   # v2
                    (x, y + 1, z),       # v3
                    (x, y, z + 1),       # v4
                    (x + 1, y, z + 1),   # v5
                    (x + 1, y + 1, z + 1),  # v6
                    (x, y + 1, z + 1),   # v7
                ]
                
                # Verificar que todas las esquinas estén dentro de la esfera
                todas_dentro = True
                indices_esquinas = []
                esquinas_fuera = []
                
                for corner in esquinas:
                    cx, cy, cz = corner
                    idx = obtener_indice_particula_grid(cx, cy, cz, subdivisiones, particulas_grid)
                    
                    if idx == -1:
                        # Esta esquina está fuera de la esfera
                        todas_dentro = False
                        esquinas_fuera.append((cx, cy, cz))
                        # No hacer break para contar todas las esquinas fuera
                    
                    indices_esquinas.append(idx)
                
                # Si todas las esquinas están dentro, generar los 5 tetraedros
                if todas_dentro and len(indices_esquinas) == 8:
                    cubos_completos += 1
                    v0, v1, v2, v3, v4, v5, v6, v7 = indices_esquinas
                    
                    # Validar que todos los índices sean diferentes (evitar tetraedros degenerados)
                    if len(set([v0, v1, v2, v3, v4, v5, v6, v7])) == 8:
                        # Mismo patrón que el cubo: 5 tetraedros por cubo
                        tetraedros.append((v0, v1, v3, v4))  # Tetra 1
                        tetraedros.append((v1, v4, v5, v6))  # Tetra 2
                        tetraedros.append((v1, v3, v4, v6))  # Tetra 3
                        tetraedros.append((v1, v2, v3, v6))  # Tetra 4
                        tetraedros.append((v3, v4, v6, v7))  # Tetra 5
                    elif cubos_completos <= 3:
                        print(f"      ⚠️ DEBUG: Cubo ({x},{y},{z}) completo pero tiene índices duplicados: [{v0}, {v1}, {v2}, {v3}, {v4}, {v5}, {v6}, {v7}]")
                else:
                    cubos_incompletos += 1
                    if cubos_incompletos <= 3:
                        print(f"      🔍 DEBUG: Cubo ({x},{y},{z}) incompleto - esquinas fuera: {len(esquinas_fuera)}/8")
    
    print(f"      🔍 DEBUG Tetraedros: {cubos_procesados} cubos procesados, {cubos_completos} completos, {cubos_incompletos} incompletos")
    return tetraedros


def generar_aristas_esfera(particulas, particulas_grid, subdivisiones, radio):
    """
    Generar aristas (edges) entre partículas vecinas dentro de la esfera
    Se consideran vecinos en las 3 direcciones (X, Y, Z)
    
    Args:
        particulas: lista de posiciones de partículas
        particulas_grid: diccionario {(x,y,z): índice}
        subdivisiones: número de subdivisiones
        radio: radio de la esfera
    
    Returns:
        Lista de aristas, cada una es (i0, i1) con índices de partículas
    """
    aristas = []
    centro = mathutils.Vector((0.0, 0.0, 0.0))
    spacing = (2.0 * radio) / subdivisiones if subdivisiones > 1 else radio
    origen = centro - mathutils.Vector((radio, radio, radio))
    
    # Mapeo inverso: índice -> (x, y, z)
    indice_a_posicion = {}
    for (x, y, z), idx in particulas_grid.items():
        indice_a_posicion[idx] = (x, y, z)
    
    aristas_x = 0
    aristas_y = 0
    aristas_z = 0
    ejemplos_aristas = []
    
    # Iterar sobre todas las partículas y buscar vecinos
    for idx, pos in enumerate(particulas):
        if idx not in indice_a_posicion:
            continue
        
        x, y, z = indice_a_posicion[idx]
        
        # Vecino en dirección X (derecha)
        if x < subdivisiones:
            idx_right = obtener_indice_particula_grid(x + 1, y, z, subdivisiones, particulas_grid)
            if idx_right != -1 and idx_right > idx:  # Evitar duplicados
                aristas.append((idx, idx_right))
                aristas_x += 1
                if len(ejemplos_aristas) < 3:
                    ejemplos_aristas.append(('X', idx, idx_right))
        
        # Vecino en dirección Y (arriba)
        if y < subdivisiones:
            idx_up = obtener_indice_particula_grid(x, y + 1, z, subdivisiones, particulas_grid)
            if idx_up != -1 and idx_up > idx:  # Evitar duplicados
                aristas.append((idx, idx_up))
                aristas_y += 1
                if len(ejemplos_aristas) < 3:
                    ejemplos_aristas.append(('Y', idx, idx_up))
        
        # Vecino en dirección Z (frente)
        if z < subdivisiones:
            idx_front = obtener_indice_particula_grid(x, y, z + 1, subdivisiones, particulas_grid)
            if idx_front != -1 and idx_front > idx:  # Evitar duplicados
                aristas.append((idx, idx_front))
                aristas_z += 1
                if len(ejemplos_aristas) < 3:
                    ejemplos_aristas.append(('Z', idx, idx_front))
    
    # DEBUG: Mostrar estadísticas de aristas
    print(f"      🔍 DEBUG Aristas: {len(aristas)} aristas generadas (X: {aristas_x}, Y: {aristas_y}, Z: {aristas_z})")
    if ejemplos_aristas:
        print(f"      🔍 DEBUG: Ejemplos de aristas:")
        for dir, i0, i1 in ejemplos_aristas:
            print(f"         Arista {dir}: partículas [{i0}, {i1}]")
    
    return aristas


def generar_triangulos_superficie_esfera(particulas, particulas_grid, subdivisiones, radio):
    """
    Generar triángulos de la superficie de la esfera para la restricción de volumen global
    Encuentra las caras externas de los tetraedros que están en la superficie
    
    Args:
        particulas: lista de posiciones de partículas
        particulas_grid: diccionario {(x,y,z): índice}
        subdivisiones: número de subdivisiones
        radio: radio de la esfera
    
    Returns:
        Lista de triángulos, cada uno es (i0, i1, i2) con índices de partículas
    """
    # Calcular todas las caras de los tetraedros y encontrar las que están en la superficie
    # Una cara está en la superficie si solo pertenece a un tetraedro
    
    centro = mathutils.Vector((0.0, 0.0, 0.0))
    umbral_superficie = radio * 0.95  # Partículas muy cerca del radio están en la superficie
    
    # Primero, identificar partículas de superficie
    particulas_superficie = set()
    for idx, pos in enumerate(particulas):
        distancia = (pos - centro).length
        if distancia >= umbral_superficie:
            particulas_superficie.add(idx)
    
    print(f"      🔍 DEBUG Superficie: {len(particulas_superficie)} partículas identificadas en la superficie (umbral: {umbral_superficie:.4f})")
    
    # Generar tetraedros temporalmente para obtener las caras
    tetraedros = generar_tetraedros_esfera(radio, subdivisiones, particulas, particulas_grid)
    
    # Contar ocurrencias de cada cara
    caras_contador = {}
    total_caras = 0
    
    # Las 4 caras de cada tetraedro
    for tetra in tetraedros:
        v0, v1, v2, v3 = tetra
        # Cada tetraedro tiene 4 caras (triángulos)
        caras = [
            tuple(sorted([v0, v1, v2])),  # Cara opuesta a v3
            tuple(sorted([v0, v1, v3])),  # Cara opuesta a v2
            tuple(sorted([v0, v2, v3])),  # Cara opuesta a v1
            tuple(sorted([v1, v2, v3])),  # Cara opuesta a v0
        ]
        
        for cara in caras:
            if cara in caras_contador:
                caras_contador[cara] += 1
            else:
                caras_contador[cara] = 1
            total_caras += 1
    
    print(f"      🔍 DEBUG Superficie: {total_caras} caras de tetraedros procesadas, {len(caras_contador)} caras únicas")
    
    # Las caras que aparecen solo una vez están en la superficie
    triangulos_superficie = []
    triangulos_con_particulas_superficie = 0
    
    for cara, count in caras_contador.items():
        if count == 1:
            # Verificar que al menos un vértice está en la superficie
            if any(v in particulas_superficie for v in cara):
                triangulos_superficie.append(cara)
                triangulos_con_particulas_superficie += 1
    
    print(f"      🔍 DEBUG Superficie: {len(triangulos_superficie)} triángulos de superficie encontrados "
          f"({triangulos_con_particulas_superficie} con partículas de superficie)")
    
    # DEBUG: Mostrar ejemplos de triángulos
    if len(triangulos_superficie) > 0:
        print(f"      🔍 DEBUG: Ejemplos de triángulos de superficie:")
        for i in range(min(3, len(triangulos_superficie))):
            tri = triangulos_superficie[i]
            print(f"         Triángulo {i}: vértices {tri}")
    
    return triangulos_superficie


def crear_esfera_volumen(radio, densidad, stiffness_volumen, stiffness_global=None, subdivisiones=3):
    """
    Crear una esfera con restricciones de volumen (subdividida para más realismo)
    
    Args:
        radio: radio de la esfera
        densidad: densidad del material (kg/m³)
        stiffness_volumen: rigidez de las restricciones de volumen por tetraedro [0, 1]
        stiffness_global: rigidez de la restricción global (opcional, None para desactivar)
        subdivisiones: número de subdivisiones por eje (3 = 3x3x3 grid)
    
    Returns:
        Tupla (PBDSystem, lista_tetraedros, lista_triangulos_superficie, particulas_grid)
    """
    # ===== 1. Generar partículas dentro de la esfera =====
    particulas_pos, particulas_grid = generar_particulas_esfera(radio, subdivisiones)
    N = len(particulas_pos)
    
    if N == 0:
        raise ValueError(f"No se generaron partículas para la esfera con radio={radio}, subdivisiones={subdivisiones}")
    
    print(f"   📊 Generadas {N} partículas dentro de la esfera")
    print(f"   📊 Mapeadas {len(particulas_grid)} partículas al grid")
    
    # DEBUG: Mostrar ejemplos de partículas
    if N > 0:
        print(f"   🔍 DEBUG: Ejemplos de partículas generadas:")
        for i in range(min(3, N)):
            pos = particulas_pos[i]
            print(f"      Partícula {i}: pos=({pos.x:.4f}, {pos.y:.4f}, {pos.z:.4f}), "
                  f"distancia_centro={(pos - mathutils.Vector((0,0,0))).length:.4f}")
    
    # Calcular masa
    volumen_esfera = (4.0 / 3.0) * math.pi * radio * radio * radio
    masa_total = densidad * volumen_esfera
    masa_particula = masa_total / N if N > 0 else 0.0
    
    system = PBDSystem(N, masa_particula)
    
    # Inicializar partículas
    print(f"   🔍 DEBUG: Inicializando {N} partículas...")
    for i, pos in enumerate(particulas_pos):
        system.particles[i].location = mathutils.Vector(pos)
        system.particles[i].last_location = mathutils.Vector(pos)
        system.particles[i].velocity = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].force = mathutils.Vector((0.0, 0.0, 0.0))
        system.particles[i].acceleration = mathutils.Vector((0.0, 0.0, 0.0))
        
        # DEBUG: Verificar primeras 3 partículas
        if i < 3:
            p = system.particles[i]
            print(f"      DEBUG SphereVolume: Partícula {i} inicializada - "
                  f"loc=({p.location.x:.6f}, {p.location.y:.6f}, {p.location.z:.6f}), "
                  f"id(loc)={id(p.location)}, id(last_loc)={id(p.last_location)}")
    
    print(f"   ✓ {N} partículas inicializadas")
    
    # ===== 2. Generar tetraedros =====
    print(f"   🔍 DEBUG: Generando tetraedros...")
    tetraedros_indices = generar_tetraedros_esfera(radio, subdivisiones, particulas_pos, particulas_grid)
    print(f"   📊 Generados {len(tetraedros_indices)} tetraedros")
    
    # DEBUG: Mostrar ejemplos de tetraedros
    if len(tetraedros_indices) > 0:
        print(f"   🔍 DEBUG: Ejemplos de tetraedros generados:")
        for i in range(min(3, len(tetraedros_indices))):
            tetra = tetraedros_indices[i]
            v0, v1, v2, v3 = tetra
            # Calcular volumen del tetraedro
            if v0 < N and v1 < N and v2 < N and v3 < N:
                p0 = system.particles[v0].location
                p1 = system.particles[v1].location
                p2 = system.particles[v2].location
                p3 = system.particles[v3].location
                V = calcular_volumen_tetraedro(p0, p1, p2, p3)
                print(f"      Tetraedro {i}: vértices=[{v0}, {v1}, {v2}, {v3}], V={V:.6f}")
    
    # CRÍTICO: Validar que se generaron suficientes tetraedros
    if len(tetraedros_indices) == 0:
        raise ValueError(f"❌ ERROR: No se generaron tetraedros para la esfera. "
                        f"Esto causará colapso. Verifica que las partículas estén correctamente mapeadas al grid. "
                        f"Partículas: {N}, Grid mapeado: {len(particulas_grid)}")
    elif len(tetraedros_indices) < N / 10:
        print(f"   ⚠️ ADVERTENCIA: Solo se generaron {len(tetraedros_indices)} tetraedros para {N} partículas.")
        print(f"   ⚠️ Ratio esperado: ~{N/5} tetraedros (5 tetraedros por cubo, ~{N/8} cubos).")
        print(f"   ⚠️ Esto puede causar inestabilidad. Considera aumentar las subdivisiones o el radio.")
    
    # Calcular ratio de tetraedros por partícula
    ratio_tetra = len(tetraedros_indices) / N if N > 0 else 0
    print(f"   📊 Ratio: {ratio_tetra:.2f} tetraedros por partícula (óptimo: ~0.6-1.0)")
    
    # ===== 3. Crear restricciones de DISTANCIA =====
    # Ajustar stiffness de distancia basado en stiffness de volumen (igual que el cubo)
    # CRÍTICO: Asegurar stiffness mínimo para evitar colapso
    if stiffness_volumen < 0.15:
        # Stiffness muy bajo: garantizar mínimo para distancia
        distance_stiffness = 0.4
        print(f"   ⚠️ ADVERTENCIA: Stiffness de volumen muy bajo ({stiffness_volumen:.2f}). Usando stiffness de distancia mínimo (0.4)")
    elif stiffness_volumen < 0.3:
        distance_stiffness = min(0.5, stiffness_volumen + 0.2)
    elif stiffness_volumen < 0.6:
        distance_stiffness = 0.6
    else:
        distance_stiffness = 0.8
    
    print(f"   📊 Stiffness de distancia ajustado: {distance_stiffness:.2f} (basado en stiffness de volumen: {stiffness_volumen:.2f})")
    
    # Generar aristas entre partículas vecinas
    aristas = generar_aristas_esfera(particulas_pos, particulas_grid, subdivisiones, radio)
    
    print(f"   🔍 DEBUG: Creando restricciones de distancia a partir de {len(aristas)} aristas...")
    distance_constraints = []
    distancias_ejemplo = []
    
    for i0, i1 in aristas:
        if i0 < N and i1 < N:
            p0 = system.particles[i0]
            p1 = system.particles[i1]
            dist0 = (p1.location - p0.location).length
            if dist0 > 1e-6:
                constraint = DistanceConstraint(p0, p1, dist0, distance_stiffness)
                distance_constraints.append(constraint)
                system.add_constraint(constraint)
                
                # DEBUG: Guardar ejemplos
                if len(distancias_ejemplo) < 3:
                    distancias_ejemplo.append((i0, i1, dist0))
    
    print(f"   ✓ Creadas {len(distance_constraints)} restricciones de distancia")
    
    # DEBUG: Mostrar ejemplos de restricciones de distancia
    if distancias_ejemplo:
        print(f"   🔍 DEBUG: Ejemplos de restricciones de distancia:")
        for idx, (i0, i1, d) in enumerate(distancias_ejemplo):
            print(f"      DistanceConstraint {idx}: partículas [{i0}, {i1}], distancia={d:.6f}, stiffness={distance_stiffness:.4f}")
    
    # CRÍTICO: Validar que hay suficientes restricciones de distancia
    if len(distance_constraints) < N / 2:
        print(f"   ⚠️ ADVERTENCIA: Solo {len(distance_constraints)} restricciones de distancia para {N} partículas.")
        print(f"   ⚠️ Esto puede causar inestabilidad. Verifica el mapeo del grid.")
    
    # ===== 4. Crear restricciones de VOLUMEN por tetraedro =====
    # CRÍTICO: Asegurar stiffness mínimo para evitar colapso total
    effective_volume_stiffness = max(0.1, stiffness_volumen)  # Mínimo 0.1 para evitar colapso completo
    if stiffness_volumen < 0.1:
        print(f"   ⚠️ ADVERTENCIA: Stiffness de volumen muy bajo ({stiffness_volumen:.2f}). Aplicando mínimo (0.1) para evitar colapso.")
    
    print(f"   🔍 DEBUG: Creando restricciones de volumen para {len(tetraedros_indices)} tetraedros...")
    volume_constraints = []
    tetraedros_validos = 0
    tetraedros_degenerados = 0
    
    for tetra_idx, tetra in enumerate(tetraedros_indices):
        i0, i1, i2, i3 = tetra
        if i0 < N and i1 < N and i2 < N and i3 < N:
            p0 = system.particles[i0]
            p1 = system.particles[i1]
            p2 = system.particles[i2]
            p3 = system.particles[i3]
            
            # Calcular volumen inicial
            V0 = calcular_volumen_tetraedro(p0.location, p1.location, p2.location, p3.location)
            
            if abs(V0) > 1e-10:  # Ignorar tetraedros degenerados
                # Usar stiffness efectivo (mínimo garantizado)
                constraint = VolumeConstraintTet(p0, p1, p2, p3, V0, effective_volume_stiffness)
                volume_constraints.append(constraint)
                system.add_constraint(constraint)
                tetraedros_validos += 1
                
                # DEBUG: Verificar primeras 3 restricciones
                if len(volume_constraints) <= 3:
                    print(f"      DEBUG SphereVolume: VolumeConstraint {len(volume_constraints)-1} creada - "
                          f"tetraedro_idx={tetra_idx}, vértices=[{i0}, {i1}, {i2}, {i3}], "
                          f"V0={V0:.6f}, stiffness={effective_volume_stiffness:.4f}, "
                          f"id(V0)={id(constraint.V0) if hasattr(constraint, 'V0') else 'N/A'}")
            else:
                tetraedros_degenerados += 1
                # DEBUG: Mostrar primeros tetraedros degenerados
                if tetraedros_degenerados <= 3:
                    print(f"      ⚠️ DEBUG: Tetraedro {tetra_idx} degenerado - vértices=[{i0}, {i1}, {i2}, {i3}], V0={V0:.10f}")
    
    print(f"   ✓ Creadas {len(volume_constraints)} restricciones de volumen local")
    if tetraedros_degenerados > 0:
        print(f"   ⚠️ ADVERTENCIA: {tetraedros_degenerados} tetraedros degenerados ignorados")
    
    # CRÍTICO: Validar que hay suficientes restricciones de volumen
    if len(volume_constraints) == 0:
        raise ValueError(f"❌ ERROR: No se crearon restricciones de volumen. La esfera colapsará.")
    elif len(volume_constraints) < len(tetraedros_indices) * 0.5:
        print(f"   ⚠️ ADVERTENCIA: Solo {len(volume_constraints)} de {len(tetraedros_indices)} tetraedros tienen restricciones válidas.")
    
    # ===== 5. Crear restricción de VOLUMEN GLOBAL (opcional) =====
    global_constraint = None
    if stiffness_global is not None and stiffness_global > 0:
        print(f"   🔍 DEBUG: Creando restricción de volumen global...")
        # Generar triángulos de superficie
        triangulos_superficie = generar_triangulos_superficie_esfera(
            particulas_pos, particulas_grid, subdivisiones, radio
        )
        
        # Calcular volumen inicial global
        V0_global = volumen_esfera  # Usar el volumen teórico de la esfera
        
        global_constraint = VolumeConstraintGlobal(
            system.particles, triangulos_superficie, V0_global, stiffness_global
        )
        system.add_constraint(global_constraint)
        
        print(f"   ✓ Creada restricción de volumen global con {len(triangulos_superficie)} triángulos de superficie")
        print(f"   🔍 DEBUG: VolumeConstraintGlobal - V0={V0_global:.6f}, stiffness={stiffness_global:.4f}, "
              f"triángulos={len(triangulos_superficie)}")
    else:
        # Si no hay volumen global, necesitamos generar triángulos de superficie para bending
        triangulos_superficie = generar_triangulos_superficie_esfera(
            particulas_pos, particulas_grid, subdivisiones, radio
        )
    
    # ===== 6. Crear restricciones de BENDING para la superficie =====
    # INTENCIÓN: Evitar que la superficie de la esfera se pliegue o colapse
    # Se aplican solo en la superficie para no interferir con las restricciones de volumen internas
    print(f"   🔍 DEBUG: Creando restricciones de bending a partir de {len(triangulos_superficie)} triángulos de superficie...")
    bending_constraints = []
    bending_stiffness = 0.1  # Rigidez baja para permitir cierta deformación
    
    # Función auxiliar para calcular phi0 (ángulo inicial entre dos triángulos adyacentes)
    def calcular_phi0(p1, p2, p3, p4):
        """
        Calcular ángulo diedro inicial entre dos triángulos que comparten una arista
        p1, p2: vértices de la arista compartida
        p3: tercer vértice del primer triángulo
        p4: tercer vértice del segundo triángulo
        """
        e1 = p2.location - p1.location
        e2 = p3.location - p1.location
        e3 = p4.location - p1.location
        
        n1 = mathutils.Vector.cross(e1, e2)
        n2 = mathutils.Vector.cross(e1, e3)
        
        len_n1 = n1.length
        len_n2 = n2.length
        
        if len_n1 < 1e-6 or len_n2 < 1e-6:
            return 0.087  # ~5 grados por defecto
        
        n1 = n1.normalized()
        n2 = n2.normalized()
        
        d = n1.dot(n2)
        d = max(-1.0, min(1.0, d))
        
        if abs(d - 1.0) < 1e-6:
            return 0.087  # ~5 grados
        
        return math.acos(d)
    
    # Encontrar triángulos adyacentes (que comparten una arista)
    # Para cada triángulo, buscar otros triángulos que compartan exactamente 2 vértices
    triangulos_procesados = set()
    
    for i, tri1 in enumerate(triangulos_superficie):
        if i in triangulos_procesados:
            continue
        
        v0_1, v1_1, v2_1 = tri1
        set_tri1 = set(tri1)
        
        # Buscar triángulos adyacentes
        for j, tri2 in enumerate(triangulos_superficie):
            if i == j or j in triangulos_procesados:
                continue
            
            v0_2, v1_2, v2_2 = tri2
            set_tri2 = set(tri2)
            
            # Encontrar vértices compartidos (deben ser exactamente 2)
            shared_verts = set_tri1.intersection(set_tri2)
            
            if len(shared_verts) == 2:
                # Estos dos triángulos comparten una arista - crear bending constraint
                shared_list = list(shared_verts)
                p1_idx, p2_idx = shared_list[0], shared_list[1]
                
                # Encontrar los otros dos vértices (uno en cada triángulo)
                other_verts_tri1 = set_tri1 - shared_verts
                other_verts_tri2 = set_tri2 - shared_verts
                
                if len(other_verts_tri1) == 1 and len(other_verts_tri2) == 1:
                    p3_idx = list(other_verts_tri1)[0]  # Vértice único del triángulo 1
                    p4_idx = list(other_verts_tri2)[0]  # Vértice único del triángulo 2
                    
                    # Validar índices
                    if (p1_idx < N and p2_idx < N and p3_idx < N and p4_idx < N):
                        p1 = system.particles[p1_idx]
                        p2 = system.particles[p2_idx]
                        p3 = system.particles[p3_idx]
                        p4 = system.particles[p4_idx]
                        
                        # Calcular ángulo inicial
                        phi0 = calcular_phi0(p1, p2, p3, p4)
                        
                        # Crear bending constraint
                        bc = BendingConstraint(p1, p2, p3, p4, phi0, bending_stiffness)
                        bending_constraints.append(bc)
                        system.add_constraint(bc)
                        
                        # DEBUG: Mostrar primeros ejemplos
                        if len(bending_constraints) <= 3:
                            print(f"      DEBUG SphereVolume: BendingConstraint {len(bending_constraints)-1} creada - "
                                  f"vértices=[{p1_idx}, {p2_idx}, {p3_idx}, {p4_idx}], "
                                  f"phi0={phi0:.6f} rad ({math.degrees(phi0):.2f}°), stiffness={bending_stiffness:.4f}")
                        
                        # Marcar ambos triángulos como procesados para evitar duplicados
                        triangulos_procesados.add(i)
                        triangulos_procesados.add(j)
                        break  # Solo un vecino por triángulo por iteración
    
    print(f"   ✓ Creadas {len(bending_constraints)} restricciones de bending en la superficie")
    
    # DEBUG: Estadísticas finales de restricciones
    print(f"\n   🔍 DEBUG: RESUMEN DE RESTRICCIONES:")
    print(f"      - Restricciones de distancia: {len(distance_constraints)}")
    print(f"      - Restricciones de volumen local: {len(volume_constraints)}")
    print(f"      - Restricción de volumen global: {'Sí' if global_constraint is not None else 'No'}")
    print(f"      - Restricciones de bending: {len(bending_constraints)}")
    print(f"      - TOTAL: {len(system.constraints)} restricciones")
    print(f"      - Partículas: {N}")
    print(f"      - Tetraedros: {len(tetraedros_indices)} (válidos: {tetraedros_validos}, degenerados: {tetraedros_degenerados})")
    
    # ===== 7. Retornar sistema y datos adicionales =====
    return system, tetraedros_indices, particulas_grid, particulas_pos

