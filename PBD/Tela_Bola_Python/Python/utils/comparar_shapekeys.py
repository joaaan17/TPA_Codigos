"""
Script para comparar Shape Keys y verificar que tienen posiciones diferentes
Ejecuta este script en Blender para diagnosticar por qué la animación está estática
"""
import bpy
import mathutils

print("\n" + "=" * 60)
print("🔍 COMPARACIÓN DE SHAPE KEYS")
print("=" * 60)

# Buscar el objeto Cloth
obj = bpy.data.objects.get("Cloth")
if not obj:
    print("❌ No se encontró el objeto 'Cloth'")
    exit()

if not obj.data.shape_keys:
    print("❌ El objeto no tiene Shape Keys")
    exit()

shape_keys = obj.data.shape_keys
key_blocks = shape_keys.key_blocks

print(f"✓ Encontrados {len(key_blocks)} Shape Keys\n")

# Comparar Basis con sim_0001
if len(key_blocks) < 2:
    print("❌ No hay suficientes Shape Keys para comparar")
    exit()

basis = key_blocks[0]
sim1 = key_blocks[1]

print(f"📊 COMPARANDO '{basis.name}' vs '{sim1.name}':")
print(f"   Vértices en Basis: {len(basis.data)}")
print(f"   Vértices en sim_0001: {len(sim1.data)}")

if len(basis.data) != len(sim1.data):
    print("   ⚠️ ADVERTENCIA: Número de vértices diferente")
else:
    diferencias = 0
    max_diff = 0.0
    diferencias_por_eje = {"x": 0, "y": 0, "z": 0}
    
    for i in range(len(basis.data)):
        pos_basis = basis.data[i].co
        pos_sim1 = sim1.data[i].co
        
        diff = (pos_basis - pos_sim1).length
        
        if diff > 0.001:
            diferencias += 1
            max_diff = max(max_diff, diff)
            
            # Verificar qué eje cambió más
            if abs(pos_basis.x - pos_sim1.x) > 0.001:
                diferencias_por_eje["x"] += 1
            if abs(pos_basis.y - pos_sim1.y) > 0.001:
                diferencias_por_eje["y"] += 1
            if abs(pos_basis.z - pos_sim1.z) > 0.001:
                diferencias_por_eje["z"] += 1
    
    print(f"\n   📈 RESULTADOS:")
    print(f"      Vértices diferentes: {diferencias}/{len(basis.data)}")
    print(f"      Diferencia máxima: {max_diff:.6f} metros")
    print(f"      Diferencias por eje:")
    print(f"         X: {diferencias_por_eje['x']} vértices")
    print(f"         Y: {diferencias_por_eje['y']} vértices")
    print(f"         Z: {diferencias_por_eje['z']} vértices")
    
    if diferencias == 0:
        print(f"\n   ❌ PROBLEMA ENCONTRADO: Todos los vértices tienen la misma posición")
        print(f"   💡 Esto significa que las partículas NO se están moviendo durante la simulación")
        print(f"   💡 Posibles causas:")
        print(f"      1. Las partículas están todas ancladas")
        print(f"      2. Las fuerzas no se están aplicando")
        print(f"      3. El solver PBD no está funcionando")
        print(f"      4. Las restricciones son demasiado rígidas")
    else:
        print(f"\n   ✅ Los Shape Keys SÍ tienen posiciones diferentes")
        print(f"   💡 Si la animación parece estática, el problema puede estar en los keyframes")

# Comparar varios Shape Keys entre sí
print(f"\n📊 COMPARACIÓN ENTRE MÚLTIPLES SHAPE KEYS:")
if len(key_blocks) >= 5:
    # Comparar sim_0001, sim_0050, sim_0100 (si existen)
    frames_a_comparar = [1, min(50, len(key_blocks)-1), min(100, len(key_blocks)-1)]
    
    for i, frame_num in enumerate(frames_a_comparar):
        if frame_num < len(key_blocks):
            key = key_blocks[frame_num]
            if i == 0:
                continue  # Saltar el primero
            
            key_anterior = key_blocks[frames_a_comparar[i-1]]
            
            diferencias = 0
            max_diff = 0.0
            for j in range(min(len(key.data), len(key_anterior.data))):
                diff = (key.data[j].co - key_anterior.data[j].co).length
                if diff > 0.001:
                    diferencias += 1
                    max_diff = max(max_diff, diff)
            
            print(f"   {key_anterior.name} vs {key.name}: {diferencias} vértices diferentes (max diff: {max_diff:.6f}m)")

print("\n" + "=" * 60)

