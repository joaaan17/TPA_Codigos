"""
Script de prueba para verificar los keyframes de Shape Keys
Ejecuta este script en Blender después de crear la simulación
"""
import bpy

print("\n" + "=" * 60)
print("🔍 DIAGNÓSTICO COMPLETO DE KEYFRAMES")
print("=" * 60)

obj = bpy.data.objects.get("Cloth")
if not obj or not obj.data.shape_keys:
    print("❌ No se encontró el objeto 'Cloth' con Shape Keys")
    exit()

shape_keys = obj.data.shape_keys
action = shape_keys.animation_data.action if shape_keys.animation_data else None

if not action:
    print("❌ No hay Action asignado")
    exit()

print(f"\n✅ Action: '{action.name}'")
print(f"   F-curves: {len(action.fcurves)}")

# Verificar TODAS las F-curves
print(f"\n📊 TODAS LAS F-CURVES:")
for i, fcurve in enumerate(action.fcurves[:10]):  # Primeras 10
    print(f"\n   {i+1}. {fcurve.data_path}")
    print(f"      Keyframes: {len(fcurve.keyframe_points)}")
    
    if len(fcurve.keyframe_points) > 0:
        # Mostrar TODOS los keyframes
        for kp in sorted(fcurve.keyframe_points, key=lambda k: k.co[0]):
            frame = int(kp.co[0])
            value = kp.co[1]
            print(f"      Frame {frame}: {value:.6f}")

# Verificar valores en diferentes frames
print(f"\n📊 VALORES EN DIFERENTES FRAMES:")
scene = bpy.context.scene
for test_frame in [1, 2, 3, 50, 100, 150]:
    if test_frame <= len(shape_keys.key_blocks) - 1:
        scene.frame_set(test_frame)
        bpy.context.view_layer.update()
        
        # Verificar qué Shape Key debería estar activo
        expected_key = shape_keys.key_blocks[test_frame] if test_frame < len(shape_keys.key_blocks) else None
        
        # Verificar valores de los primeros 5 Shape Keys
        print(f"\n   Frame {test_frame}:")
        for i in range(1, min(6, len(shape_keys.key_blocks))):
            key = shape_keys.key_blocks[i]
            expected = 1.0 if i == test_frame else 0.0
            status = "✅" if abs(key.value - expected) < 0.001 else "❌"
            print(f"      {status} {key.name}: {key.value:.6f} (esperado: {expected:.1f})")

print("\n" + "=" * 60)

