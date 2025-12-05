# ============================================
# LOADER PARA BLENDER - VERSIÓN CON SHAPE KEYS
# Copia y pega este código en el Text Editor de Blender
# ============================================

import bpy
import os
import sys

# Nombre del script principal a ejecutar (CON SHAPE KEYS Y PANEL)
filename = "blender_tela_shapekeys.py"

# Ruta a tu carpeta Tela_Bola_Python (AJUSTA ESTA RUTA si es necesario)
# ⚠️ IMPORTANTE: Usa r"..." (raw string) para rutas de Windows
script_dir = r"C:\Users\jonro\Desktop\Vida Universitaria\Cuarto\TPA\LABS\TPA_Codigos\PBD\Tela_Bola_Python"

# Construir rutas
python_dir = os.path.join(script_dir, "Python")
blender_scripts_dir = os.path.join(python_dir, "blender")

# Añadir al path de Python (para que encuentre los módulos)
if python_dir not in sys.path:
    sys.path.insert(0, python_dir)
    print(f"✓ Añadida ruta: {python_dir}")

# Ruta completa al script (ahora está en blender/ subfolder)
filepath = os.path.join(blender_scripts_dir, filename)

# Verificar que existe
if not os.path.exists(filepath):
    print(f"❌ ERROR: No se encontró: {filepath}")
    print(f"   Verifica que la ruta 'script_dir' sea correcta")
    print(f"\n📂 Estructura esperada:")
    print(f"   {script_dir}/")
    print(f"   └── Python/")
    print(f"       └── blender/")
    print(f"           └── {filename}")
else:
    print(f"✓ Archivo encontrado: {filepath}")
    
    # Crear namespace global
    global_namespace = {
        "__file__": filepath,
        "__name__": "__main__"
    }
    
    # Ejecutar el script
    try:
        with open(filepath, 'rb') as file:
            exec(compile(file.read(), filepath, 'exec'), global_namespace)
        print("✓ Script ejecutado correctamente")
        print("\n" + "="*60)
        print("✓ PANEL PBD CLOTH CARGADO")
        print("="*60)
        print("\nINSTRUCCIONES:")
        print("1. Presiona N para abrir el panel lateral")
        print("2. Busca la pestaña 'PBD Cloth'")
        print("3. Configura los parámetros")
        print("4. Activa/desactiva restricciones (Bending, Shear)")
        print("5. Haz clic en 'Simular Cubo Volumen'")
        print("6. Espera a que termine la simulación")
        print("7. Presiona SPACE para reproducir la animación")
        print("\n")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

