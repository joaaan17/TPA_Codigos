"""
Extractor de superficie para esfera PBD
Encuentra las caras externas del mesh tetraédrico y genera triángulos para visualización
"""
import mathutils
import math


def extraer_superficie_tetraedros(tetraedros, particulas, umbral_distancia=None):
    """
    Extraer las caras externas de un mesh tetraédrico
    Las caras externas son aquellas que pertenecen a un solo tetraedro
    
    Args:
        tetraedros: lista de tetraedros, cada uno es (i0, i1, i2, i3) con índices
        particulas: lista de partículas (objetos Particle o mathutils.Vector)
        umbral_distancia: distancia mínima al centro para considerar superficie (opcional)
    
    Returns:
        Lista de triángulos de superficie, cada uno es (i0, i1, i2) con índices ordenados
    """
    # Contar ocurrencias de cada cara (triángulo)
    caras_contador = {}
    
    # Iterar sobre todos los tetraedros
    for tetra in tetraedros:
        if len(tetra) != 4:
            continue
        
        v0, v1, v2, v3 = tetra
        
        # Cada tetraedro tiene 4 caras (triángulos)
        # Ordenar índices para normalizar la representación de la cara
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
    
    # Las caras que aparecen solo una vez son caras externas
    triangulos_superficie = []
    
    for cara, count in caras_contador.items():
        if count == 1:
            # Opcionalmente, filtrar por distancia al centro
            if umbral_distancia is not None:
                # Obtener posiciones de los vértices
                v0_idx, v1_idx, v2_idx = cara
                if v0_idx < len(particulas) and v1_idx < len(particulas) and v2_idx < len(particulas):
                    # Obtener posición (puede ser Particle o Vector)
                    if hasattr(particulas[v0_idx], 'location'):
                        p0 = particulas[v0_idx].location
                    else:
                        p0 = mathutils.Vector(particulas[v0_idx])
                    
                    # Calcular centro del triángulo
                    if hasattr(particulas[v1_idx], 'location'):
                        p1 = particulas[v1_idx].location
                    else:
                        p1 = mathutils.Vector(particulas[v1_idx])
                    
                    if hasattr(particulas[v2_idx], 'location'):
                        p2 = particulas[v2_idx].location
                    else:
                        p2 = mathutils.Vector(particulas[v2_idx])
                    
                    centro_triangulo = (p0 + p1 + p2) / 3.0
                    distancia = centro_triangulo.length
                    
                    # Solo incluir si está cerca de la superficie (mayor o igual al umbral)
                    if distancia >= umbral_distancia:
                        # Usar índices ordenados (ya están ordenados en 'cara')
                        triangulos_superficie.append(cara)
            else:
                # Sin filtro: usar todos los triángulos de superficie
                # Los índices ya están ordenados en 'cara'
                triangulos_superficie.append(cara)
    
    # Si no encontramos triángulos con filtro, intentar sin filtro
    if len(triangulos_superficie) == 0 and umbral_distancia is not None:
        print(f"   ⚠️ No se encontraron triángulos con umbral {umbral_distancia}, intentando sin filtro...")
        return extraer_superficie_tetraedros(tetraedros, particulas, umbral_distancia=None)
    
    return triangulos_superficie


def deduplicar_triangulos(triangulos):
    """
    Eliminar triángulos duplicados manteniendo solo uno de cada
    (Normalmente ya están ordenados, pero por seguridad)
    
    Args:
        triangulos: lista de triángulos, cada uno es (i0, i1, i2)
    
    Returns:
        Lista de triángulos únicos
    """
    triangulos_unicos = []
    triangulos_vistos = set()
    
    for tri in triangulos:
        # Normalizar ordenando los índices
        tri_normalizado = tuple(sorted(tri))
        if tri_normalizado not in triangulos_vistos:
            triangulos_unicos.append(tri)
            triangulos_vistos.add(tri_normalizado)
    
    return triangulos_unicos


def generar_mesh_blender(particulas, triangulos, nombre="SphereSurface", bmesh_obj=None):
    """
    Generar o actualizar un mesh de Blender a partir de partículas y triángulos
    
    Args:
        particulas: lista de partículas (objetos Particle con .location)
        triangulos: lista de triángulos, cada uno es (i0, i1, i2)
        nombre: nombre del objeto mesh en Blender
        bmesh_obj: objeto bmesh existente para actualizar (None para crear nuevo)
    
    Returns:
        mesh de Blender y objeto bmesh
    """
    import bpy
    import bmesh
    
    # Crear o limpiar bmesh
    if bmesh_obj is None:
        bmesh_obj = bmesh.new()
    else:
        bmesh_obj.clear()
        bmesh_obj.verts.ensure_lookup_table()
        bmesh_obj.faces.ensure_lookup_table()
    
    # Obtener posiciones actuales de las partículas
    vertices_pos = []
    for p in particulas:
        if hasattr(p, 'location'):
            vertices_pos.append(p.location.copy())
        else:
            vertices_pos.append(mathutils.Vector(p))
    
    print(f"   🔍 DEBUG: Creando mesh con {len(vertices_pos)} vértices y {len(triangulos)} triángulos")
    
    # Crear vértices en bmesh
    bm_verts = []
    for pos in vertices_pos:
        bm_vert = bmesh_obj.verts.new(pos)
        bm_verts.append(bm_vert)
    
    # Asegurar lookup table después de crear vértices
    bmesh_obj.verts.ensure_lookup_table()
    bmesh_obj.verts.index_update()
    
    # Crear caras (triángulos)
    caras_creadas = 0
    caras_duplicadas = 0
    for tri in triangulos:
        i0, i1, i2 = tri
        if i0 < len(bm_verts) and i1 < len(bm_verts) and i2 < len(bm_verts):
            # Verificar que los índices sean válidos y diferentes
            if i0 != i1 and i1 != i2 and i0 != i2:
                try:
                    face = bmesh_obj.faces.new([bm_verts[i0], bm_verts[i1], bm_verts[i2]])
                    caras_creadas += 1
                except ValueError:
                    # Cara duplicada o inválida, ignorar
                    caras_duplicadas += 1
                    pass
    
    print(f"   🔍 DEBUG: Creadas {caras_creadas} caras, {caras_duplicadas} duplicadas ignoradas")
    
    # Actualizar índices y lookup tables
    bmesh_obj.faces.ensure_lookup_table()
    bmesh_obj.faces.index_update()
    
    # Actualizar normales
    bmesh_obj.normal_update()
    
    # Convertir a mesh de Blender
    mesh = bpy.data.meshes.new(nombre)
    bmesh_obj.to_mesh(mesh)
    mesh.update()
    
    print(f"   ✓ Mesh creado: {len(mesh.vertices)} vértices, {len(mesh.polygons)} caras")
    
    return mesh, bmesh_obj


def actualizar_mesh_blender_desde_particulas(mesh, bmesh_obj, particulas, triangulos):
    """
    Actualizar un mesh existente con las posiciones actuales de las partículas
    
    Args:
        mesh: mesh de Blender existente
        bmesh_obj: objeto bmesh existente
        particulas: lista de partículas (objetos Particle con .location)
        triangulos: lista de triángulos (puede ser None si ya están en el bmesh)
    """
    import bmesh
    
    # Asegurar lookup tables
    bmesh_obj.verts.ensure_lookup_table()
    bmesh_obj.faces.ensure_lookup_table()
    
    # Actualizar posiciones de vértices
    for i, vert in enumerate(bmesh_obj.verts):
        if i < len(particulas):
            if hasattr(particulas[i], 'location'):
                vert.co = particulas[i].location.copy()
            else:
                vert.co = mathutils.Vector(particulas[i])
    
    # Si se proporcionan nuevos triángulos, regenerar caras
    if triangulos is not None:
        # Limpiar caras existentes
        faces_to_remove = list(bmesh_obj.faces)
        for face in faces_to_remove:
            bmesh_obj.faces.remove(face)
        
        bmesh_obj.faces.ensure_lookup_table()
        
        # Recrear caras
        for tri in triangulos:
            i0, i1, i2 = tri
            if (i0 < len(bmesh_obj.verts) and 
                i1 < len(bmesh_obj.verts) and 
                i2 < len(bmesh_obj.verts) and
                i0 != i1 and i1 != i2 and i0 != i2):
                try:
                    bmesh_obj.faces.new([
                        bmesh_obj.verts[i0],
                        bmesh_obj.verts[i1],
                        bmesh_obj.verts[i2]
                    ])
                except ValueError:
                    # Cara duplicada, ignorar
                    pass
    
    # Actualizar índices
    bmesh_obj.verts.index_update()
    bmesh_obj.faces.index_update()
    
    # Actualizar normales y mesh
    bmesh_obj.normal_update()
    
    # CRÍTICO: Convertir bmesh a mesh sin actualizar layers de shape keys
    # Los shape keys se manejan directamente en el mesh, no en el bmesh
    bmesh_obj.to_mesh(mesh)
    mesh.update()

