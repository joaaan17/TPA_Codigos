"""
==============================================
COPIAR Y PEGAR ESTE CÓDIGO EN BLENDER
Text Editor → New → Pegar → Run Script (Alt+P)
==============================================
"""
import bpy
import os
import sys

print("\n" + "="*60)
print("🚀 CARGANDO SISTEMA PBD...")
print("="*60)

# ⚠️ AJUSTA ESTA RUTA A TU CARPETA Tela_Bola_Python
PROJECT_DIR = r"C:\Users\jonro\Desktop\Vida Universitaria\Cuarto\TPA\LABS\TPA_Codigos\PBD\Tela_Bola_Python"

# Construir rutas
python_dir = os.path.join(PROJECT_DIR, "Python")
script_main = os.path.join(python_dir, "blender", "blender_tela_shapekeys.py")

# Verificar
if not os.path.exists(script_main):
    print(f"\n❌ ERROR: No se encontró:")
    print(f"   {script_main}")
    print(f"\n💡 Ajusta PROJECT_DIR en la línea 15")
    print(f"   Debe apuntar a: Tela_Bola_Python/")
else:
    print(f"✓ Script encontrado: {script_main}")
    
    # Añadir Python al path
    if python_dir not in sys.path:
        sys.path.insert(0, python_dir)
        print(f"✓ Python añadido al path: {python_dir}")
    
    # Ejecutar
    try:
        global_namespace = {"__file__": script_main, "__name__": "__main__"}
        with open(script_main, 'rb') as file:
            exec(compile(file.read(), script_main, 'exec'), global_namespace)
        
        print("\n" + "="*60)
        print("✅ SISTEMA PBD CARGADO")
        print("="*60)
        print("\n📋 Presiona N → Busca 'PBD Cloth' → Configura → Simular\n")
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()

