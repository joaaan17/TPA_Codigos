"""
==============================================
LOADER SIMPLE PARA BLENDER - VERSIÓN UNIFICADA
Copia este código en el Text Editor de Blender
==============================================
"""
import bpy
import os
import sys

print("\n" + "="*60)
print("🚀 INICIANDO CARGA DEL SCRIPT PBD")
print("="*60)

# ===== CONFIGURACIÓN - AJUSTA SOLO ESTA LÍNEA =====
# Ruta a la carpeta Tela_Bola_Python (la que contiene Python/)
PROJECT_DIR = r"C:\Users\jonro\Desktop\Vida Universitaria\Cuarto\TPA\LABS\TPA_Codigos\PBD\Tela_Bola_Python"

# ===== NO NECESITAS CAMBIAR NADA MÁS ABAJO =====

# Construir rutas
python_dir = os.path.join(PROJECT_DIR, "Python")
blender_scripts_dir = os.path.join(python_dir, "blender")
script_path = os.path.join(blender_scripts_dir, "blender_tela_shapekeys.py")

# Verificar que existe la carpeta Python
if not os.path.exists(python_dir):
    print(f"❌ ERROR: No se encontró la carpeta Python en:")
    print(f"   {python_dir}")
    print(f"\n💡 SOLUCIÓN: Ajusta PROJECT_DIR en la línea 15 de este script")
    print(f"   Debe apuntar a la carpeta Tela_Bola_Python")
else:
    print(f"✓ Carpeta Python encontrada: {python_dir}")

# Verificar que existe el script
if not os.path.exists(script_path):
    print(f"❌ ERROR: No se encontró el script en:")
    print(f"   {script_path}")
    print(f"\n📂 Estructura esperada:")
    print(f"   Tela_Bola_Python/")
    print(f"   └── Python/")
    print(f"       └── blender/")
    print(f"           └── blender_tela_shapekeys.py")
else:
    print(f"✓ Script encontrado: {script_path}")
    
    # Añadir Python al path
    if python_dir not in sys.path:
        sys.path.insert(0, python_dir)
        print(f"✓ Añadido al sys.path: {python_dir}")
    
    # Ejecutar el script
    print("\n" + "="*60)
    print("⚙️  EJECUTANDO SCRIPT...")
    print("="*60 + "\n")
    
    try:
        # Crear namespace global
        global_namespace = {
            "__file__": script_path,
            "__name__": "__main__"
        }
        
        # Leer y ejecutar
        with open(script_path, 'rb') as file:
            exec(compile(file.read(), script_path, 'exec'), global_namespace)
        
        print("\n" + "="*60)
        print("✅ SCRIPT EJECUTADO CORRECTAMENTE")
        print("="*60)
        print("\n📋 INSTRUCCIONES:")
        print("1. Presiona N para abrir el panel lateral")
        print("2. Busca la pestaña 'PBD Cloth'")
        print("3. Configura los parámetros")
        print("4. Haz clic en 'Simular Cubo Volumen'")
        print("5. Espera a que termine")
        print("6. Presiona SPACE para reproducir\n")
        
    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR AL EJECUTAR EL SCRIPT")
        print("="*60)
        print(f"\nError: {e}\n")
        import traceback
        traceback.print_exc()

