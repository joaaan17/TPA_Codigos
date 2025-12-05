"""
==============================================
LOADER PARA BLENDER - SISTEMA PBD COMPLETO
Copia este código en el Text Editor de Blender
==============================================
"""
import bpy
import os
import sys

print("\n" + "="*60)
print("🚀 CARGANDO SISTEMA PBD...")
print("="*60)

# ===== CONFIGURACIÓN - AJUSTA SOLO SI ES NECESARIO =====
# Opción 1: Ruta fija (más confiable)
PROJECT_DIR = r"C:\Users\jonro\Desktop\Vida Universitaria\Cuarto\TPA\LABS\TPA_Codigos\PBD\Tela_Bola_Python"

# Opción 2: Detección automática (intenta encontrar el proyecto automáticamente)
# Si el archivo .blend está guardado, intenta encontrar el proyecto
if bpy.data.filepath:
    blend_dir = os.path.dirname(bpy.data.filepath)
    # Buscar Tela_Bola_Python en el directorio del .blend o cerca
    possible_dirs = [
        blend_dir,
        os.path.dirname(blend_dir),
        os.path.join(os.path.dirname(blend_dir), "Tela_Bola_Python"),
    ]
    for dir_path in possible_dirs:
        test_python_dir = os.path.join(dir_path, "Python")
        if os.path.exists(test_python_dir):
            PROJECT_DIR = dir_path
            print(f"✓ Proyecto detectado automáticamente: {PROJECT_DIR}")
            break

# ===== NO CAMBIES NADA DESDE AQUÍ =====

# Construir rutas
python_dir = os.path.join(PROJECT_DIR, "Python")
blender_scripts_dir = os.path.join(python_dir, "blender")
script_main = os.path.join(blender_scripts_dir, "blender_tela_shapekeys.py")

# Verificar estructura
print(f"\n📂 Verificando estructura del proyecto...")
print(f"   Proyecto: {PROJECT_DIR}")
print(f"   Python:   {python_dir}")
print(f"   Script:   {script_main}")

if not os.path.exists(PROJECT_DIR):
    print(f"\n❌ ERROR: No se encontró el directorio del proyecto:")
    print(f"   {PROJECT_DIR}")
    print(f"\n💡 SOLUCIÓN: Ajusta PROJECT_DIR en la línea 15 de este script")
    print(f"   Debe apuntar a la carpeta Tela_Bola_Python")
    sys.exit(1)

if not os.path.exists(python_dir):
    print(f"\n❌ ERROR: No se encontró la carpeta Python en:")
    print(f"   {python_dir}")
    print(f"\n💡 Verifica que la estructura sea:")
    print(f"   Tela_Bola_Python/")
    print(f"   └── Python/")
    sys.exit(1)

if not os.path.exists(script_main):
    print(f"\n❌ ERROR: No se encontró el script principal en:")
    print(f"   {script_main}")
    print(f"\n💡 Verifica que el archivo exista en Python/blender/")
    sys.exit(1)

# Añadir Python al sys.path (CRÍTICO para que funcionen los imports)
if python_dir not in sys.path:
    sys.path.insert(0, python_dir)
    print(f"\n✓ Carpeta Python añadida al sys.path")
    print(f"   {python_dir}")

print(f"\n✓ Estructura del proyecto correcta")
print(f"\n" + "="*60)
print("⚙️  EJECUTANDO SCRIPT PRINCIPAL...")
print("="*60 + "\n")

# Ejecutar el script principal
try:
    # Crear namespace global
    global_namespace = {
        "__file__": script_main,
        "__name__": "__main__"
    }
    
    # Leer y ejecutar
    with open(script_main, 'rb') as file:
        exec(compile(file.read(), script_main, 'exec'), global_namespace)
    
    print("\n" + "="*60)
    print("✅ SISTEMA PBD CARGADO CORRECTAMENTE")
    print("="*60)
    print("\n📋 INSTRUCCIONES:")
    print("1. Presiona N para abrir el panel lateral")
    print("2. Busca la pestaña 'PBD Cloth'")
    print("3. Selecciona 'Cubo Volumen' como modo de simulación")
    print("4. Configura los parámetros (lado, densidad, stiffness, etc.)")
    print("5. Haz clic en 'Simular Cubo Volumen'")
    print("6. Espera a que termine la simulación")
    print("7. Presiona SPACE para reproducir la animación")
    print("\n")
    
except Exception as e:
    print("\n" + "="*60)
    print("❌ ERROR AL EJECUTAR EL SCRIPT")
    print("="*60)
    print(f"\nError: {e}\n")
    import traceback
    traceback.print_exc()
