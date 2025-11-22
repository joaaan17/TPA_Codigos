"""
Script para verificar y mostrar información sobre los Shape Keys
Ejecuta este script en Blender para ver todos los Shape Keys creados
"""
import bpy

print("\n" + "=" * 60)
print("🔍 VERIFICACIÓN DE SHAPE KEYS")
print("=" * 60)

# Buscar el objeto Cloth
obj = None
if "Cloth" in bpy.data.objects:
    obj = bpy.data.objects["Cloth"]
    print(f"✓ Objeto 'Cloth' encontrado")
else:
    print("❌ No se encontró el objeto 'Cloth'")
    print("\nObjetos disponibles en la escena:")
    for obj_name in bpy.data.objects:
        print(f"   - {obj_name.name}")
    print("\n💡 Asegúrate de que el objeto de la tela se llame 'Cloth'")
    print("=" * 60)
    exit()

# Verificar si tiene Shape Keys
if not obj.data.shape_keys:
    print("❌ El objeto 'Cloth' no tiene Shape Keys")
    print("💡 Ejecuta la simulación primero para crear los Shape Keys")
    print("=" * 60)
    exit()

shape_keys = obj.data.shape_keys
key_blocks = shape_keys.key_blocks

print(f"\n📋 INFORMACIÓN DE SHAPE KEYS:")
print(f"   Total de Shape Keys: {len(key_blocks)}")
print(f"   - Basis: 1")
print(f"   - Simulación: {len(key_blocks) - 1}")

print(f"\n📝 LISTA DE SHAPE KEYS:")
for i, key in enumerate(key_blocks):
    status = "✓" if key.value > 0 else "○"
    print(f"   {i:3d}. {status} {key.name:20s} (valor: {key.value:.3f})")

# Mostrar algunos ejemplos de posiciones
print(f"\n🔍 EJEMPLO DE POSICIONES (primeros 3 Shape Keys):")
for i in range(min(3, len(key_blocks))):
    key = key_blocks[i]
    print(f"\n   {key.name}:")
    if len(key.data) > 0:
        # Mostrar primeras 5 posiciones
        for j in range(min(5, len(key.data))):
            pos = key.data[j].co
            print(f"      Vértice {j}: ({pos.x:.3f}, {pos.y:.3f}, {pos.z:.3f})")

# Verificar diferencias entre Shape Keys
if len(key_blocks) > 2:
    print(f"\n📊 COMPARACIÓN ENTRE SHAPE KEYS:")
    basis = key_blocks[0]  # Basis
    sim1 = key_blocks[1]   # sim_0001
    
    if len(basis.data) == len(sim1.data):
        diferencias = 0
        max_diff = 0.0
        for i in range(len(basis.data)):
            diff = (basis.data[i].co - sim1.data[i].co).length
            if diff > 0.001:
                diferencias += 1
            max_diff = max(max_diff, diff)
        
        print(f"   Vértices que cambiaron: {diferencias}/{len(basis.data)}")
        print(f"   Diferencia máxima: {max_diff:.6f}")
        
        if diferencias > 0:
            print(f"   ✅ Los Shape Keys tienen posiciones diferentes (correcto)")
        else:
            print(f"   ⚠️ Advertencia: Los Shape Keys tienen las mismas posiciones")

print(f"\n💡 DÓNDE VER LOS SHAPE KEYS EN BLENDER:")
print(f"   1. Selecciona el objeto 'Cloth' en la vista 3D")
print(f"   2. Ve al panel Properties (panel derecho, ícono de engranaje)")
print(f"   3. Busca la pestaña con ícono de curva/onda (Shape Keys)")
print(f"   4. Si no la ves, el objeto puede no estar seleccionado")
print(f"   5. También puedes buscarla en: Object Data Properties → Shape Keys")

print(f"\n🎬 PARA REPRODUCIR LA ANIMACIÓN:")
print(f"   - Presiona SPACE para reproducir")
print(f"   - Los Shape Keys se activarán automáticamente según el frame")
print(f"   - Rango de frames: {bpy.context.scene.frame_start} a {bpy.context.scene.frame_end}")

print("\n" + "=" * 60)

