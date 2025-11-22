"""
SCRIPT DE EMERGENCIA - Resetear Flag de Simulación
Ejecuta este script directamente en Blender para desbloquear el panel
"""
import bpy

# Resetear el flag directamente
bpy.context.scene.pbd_cloth_is_simulating = False

print("=" * 60)
print("✓ FLAG DE SIMULACIÓN RESETEADO")
print("=" * 60)
print(f"Estado actual: {bpy.context.scene.pbd_cloth_is_simulating}")
print("El panel debería estar desbloqueado ahora.")
print("=" * 60)

# Intentar actualizar la UI
try:
    bpy.context.view_layer.update()
    print("✓ UI actualizada")
except:
    pass

# Mostrar mensaje en el área de información
try:
    bpy.ops.ui.reports_to_textblock()
except:
    pass

