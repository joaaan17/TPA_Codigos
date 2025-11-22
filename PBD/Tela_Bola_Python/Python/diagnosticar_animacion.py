"""
Script para diagnosticar por qué la animación de Shape Keys no funciona
Ejecuta este script en Blender para verificar el estado de la animación
"""
import bpy

print("\n" + "=" * 60)
print("🔍 DIAGNÓSTICO DE ANIMACIÓN DE SHAPE KEYS")
print("=" * 60)

# Buscar el objeto Cloth
obj = bpy.data.objects.get("Cloth")
if not obj:
    print("❌ No se encontró el objeto 'Cloth'")
    exit()

print(f"✓ Objeto 'Cloth' encontrado")

# Verificar Shape Keys
if not obj.data.shape_keys:
    print("❌ El objeto no tiene Shape Keys")
    exit()

shape_keys = obj.data.shape_keys
key_blocks = shape_keys.key_blocks

print(f"\n📋 SHAPE KEYS:")
print(f"   Total: {len(key_blocks)}")
print(f"   Modo: {'Relative' if shape_keys.use_relative else 'Absolute'}")

# Verificar animación
print(f"\n🎬 ANIMACIÓN:")
if not shape_keys.animation_data:
    print("   ❌ No hay animation_data")
    print("   💡 La animación no se creó correctamente")
else:
    print("   ✓ animation_data existe")
    
    if not shape_keys.animation_data.action:
        print("   ❌ No hay action asignada")
        print("   💡 Los keyframes no se crearon")
    else:
        action = shape_keys.animation_data.action
        print(f"   ✓ Action: '{action.name}'")
        print(f"   ✓ Fcurves: {len(action.fcurves)}")
        print(f"   ✓ Rango de frames: {action.frame_range[0]} a {action.frame_range[1]}")
        
        # Verificar fcurves
        if len(action.fcurves) == 0:
            print("   ❌ No hay fcurves creadas")
            print("   💡 Los keyframes no se insertaron")
        else:
            print(f"\n   📊 FCURVES CREADAS:")
            for i, fcurve in enumerate(action.fcurves[:5]):  # Primeras 5
                num_kf = len(fcurve.keyframe_points)
                print(f"      {i+1}. {fcurve.data_path}")
                print(f"         Keyframes: {num_kf}")
                if num_kf > 0:
                    first = fcurve.keyframe_points[0]
                    last = fcurve.keyframe_points[-1]
                    print(f"         Rango: frame {first.co[0]:.0f} a {last.co[0]:.0f}")
                    print(f"         Valores: {first.co[1]:.3f} a {last.co[1]:.3f}")
            
            if len(action.fcurves) > 5:
                print(f"      ... y {len(action.fcurves) - 5} más")
            
            # Verificar un Shape Key específico
            print(f"\n   🔍 VERIFICACIÓN DETALLADA (sim_0001):")
            test_fcurve = None
            for fc in action.fcurves:
                if 'sim_0001' in fc.data_path:
                    test_fcurve = fc
                    break
            
            if test_fcurve:
                print(f"      ✓ Fcurve encontrada para sim_0001")
                print(f"      Keyframes: {len(test_fcurve.keyframe_points)}")
                for kf in test_fcurve.keyframe_points:
                    print(f"         Frame {kf.co[0]:.0f}: valor {kf.co[1]:.3f} (interp: {kf.interpolation})")
            else:
                print(f"      ❌ No se encontró fcurve para sim_0001")

# Verificar rango de frames de la escena
print(f"\n🎞️ ESCENA:")
print(f"   Frame actual: {bpy.context.scene.frame_current}")
print(f"   Frame inicio: {bpy.context.scene.frame_start}")
print(f"   Frame fin: {bpy.context.scene.frame_end}")

# Verificar valores actuales de Shape Keys
print(f"\n📊 VALORES ACTUALES DE SHAPE KEYS:")
for i, key in enumerate(key_blocks[:5]):
    print(f"   {key.name}: {key.value:.3f}")
if len(key_blocks) > 5:
    print(f"   ... y {len(key_blocks) - 5} más")

# Sugerencias
print(f"\n💡 SUGERENCIAS:")
if shape_keys.animation_data and shape_keys.animation_data.action:
    if len(shape_keys.animation_data.action.fcurves) == 0:
        print("   ❌ No hay fcurves - la animación no se creó")
        print("   → Ejecuta la simulación de nuevo")
    else:
        print("   ✓ Hay fcurves creadas")
        print("   → Prueba cambiar manualmente el frame (1, 2, 3...)")
        print("   → Verifica que los valores de los Shape Keys cambien")
        print("   → Presiona SPACE para reproducir")
else:
    print("   ❌ No hay animación asignada")
    print("   → Ejecuta la simulación de nuevo")

print("\n" + "=" * 60)

