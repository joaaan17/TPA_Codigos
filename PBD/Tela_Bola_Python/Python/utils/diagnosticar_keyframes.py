"""
Script para diagnosticar los keyframes de Shape Keys
Ejecuta este script en Blender para ver los valores exactos de los keyframes
"""
import bpy

print("\n" + "=" * 60)
print("🔍 DIAGNÓSTICO DE KEYFRAMES DE SHAPE KEYS")
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

print(f"\n📋 INFORMACIÓN GENERAL:")
print(f"   Total de Shape Keys: {len(key_blocks)}")
print(f"   Modo: {'Relative' if shape_keys.use_relative else 'Absolute'}")

# Verificar animation_data
if not shape_keys.animation_data:
    print(f"\n❌ No hay animation_data")
    exit()

if not shape_keys.animation_data.action:
    print(f"\n❌ No hay Action asignado")
    exit()

action = shape_keys.animation_data.action
print(f"\n✅ Action: '{action.name}'")
print(f"   Total de F-curves: {len(action.fcurves)}")

# Verificar F-curves de los primeros 5 Shape Keys
print(f"\n📊 VALORES DE KEYFRAMES (primeros 5 Shape Keys):")
for i in range(1, min(6, len(key_blocks))):
    key_name = key_blocks[i].name
    data_path = f'key_blocks["{key_name}"].value'
    fcurve = action.fcurves.find(data_path)
    
    if fcurve:
        print(f"\n   {key_name} (Frame {i}):")
        print(f"      Keyframes: {len(fcurve.keyframe_points)}")
        
        # Mostrar TODOS los keyframes de este Shape Key
        for kp in fcurve.keyframe_points:
            frame = int(kp.co[0])
            value = kp.co[1]
            interp = kp.interpolation
            print(f"      Frame {frame}: Valor = {value:.6f}, Interpolación = {interp}")
        
        # Verificar valores en frames específicos
        print(f"      Valores en frames clave:")
        for test_frame in [i-1, i, i+1]:
            if test_frame >= 1 and test_frame <= len(key_blocks) - 1:
                # Evaluar la F-curve en este frame
                try:
                    evaluated_value = fcurve.evaluate(test_frame)
                    print(f"         Frame {test_frame}: {evaluated_value:.6f}")
                except:
                    print(f"         Frame {test_frame}: Error al evaluar")
    else:
        print(f"\n   {key_name}: ❌ No se encontró F-curve")

# Verificar valores actuales de Shape Keys
print(f"\n📊 VALORES ACTUALES DE SHAPE KEYS (Frame {bpy.context.scene.frame_current}):")
for i in range(1, min(6, len(key_blocks))):
    key = key_blocks[i]
    print(f"   {key.name}: {key.value:.6f}")

# Verificar si el problema es que todos tienen 0
valores_cero = sum(1 for i in range(1, len(key_blocks)) if key_blocks[i].value < 0.001)
if valores_cero == len(key_blocks) - 1:
    print(f"\n⚠️ PROBLEMA: Todos los Shape Keys tienen valor 0")
    print(f"   💡 Esto significa que ningún Shape Key está activo")
    print(f"   💡 Verifica que los keyframes tengan valores 1.0 en sus frames correspondientes")

print("\n" + "=" * 60)

