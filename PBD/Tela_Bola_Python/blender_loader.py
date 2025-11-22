"""
Script Loader para Blender - Carga todos los módulos PBD
Copia este código en el Text Editor de Blender y ejecútalo
"""
import bpy
import os
import sys

# Nombre del script principal a ejecutar
filename = "blender_tela.py"

# Obtener la ruta del directorio donde está este script (o el archivo .blend)
# Si el archivo .blend está guardado, usa su directorio
# Si no, usa el directorio del script actual
if bpy.data.filepath:
    # Archivo .blend guardado - usar su directorio
    base_dir = os.path.dirname(bpy.data.filepath)
else:
    # Archivo no guardado - usar el directorio del script
    # Necesitas ajustar esta ruta manualmente si es necesario
    base_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.expanduser("~")

# Ruta a la carpeta Python donde están todos los módulos
python_dir = os.path.join(base_dir, "Python")

# Si no existe en la ruta del .blend, intentar en la carpeta Tela_Bola_Python
if not os.path.exists(python_dir):
    # Intentar encontrar la carpeta Python relativa a este script
    current_script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else base_dir
    python_dir = os.path.join(current_script_dir, "Python")
    
    # Si aún no existe, buscar en el directorio padre
    if not os.path.exists(python_dir):
        parent_dir = os.path.dirname(current_script_dir)
        python_dir = os.path.join(parent_dir, "Python")

# Añadir la carpeta Python al sys.path para que se puedan importar los módulos
if python_dir not in sys.path:
    sys.path.insert(0, python_dir)
    print(f"✓ Añadida ruta al sys.path: {python_dir}")

# Ruta completa al script principal
filepath = os.path.join(python_dir, filename)

# Verificar que el archivo existe
if not os.path.exists(filepath):
    print(f"❌ ERROR: No se encontró el archivo: {filepath}")
    print(f"   Asegúrate de que '{filename}' esté en la carpeta 'Python/'")
    print(f"   Directorios buscados:")
    print(f"   - {os.path.join(base_dir, 'Python', filename)}")
    if '__file__' in globals():
        print(f"   - {os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Python', filename)}")
else:
    print(f"✓ Archivo encontrado: {filepath}")
    
    # Crear namespace global para el script
    global_namespace = {
        "__file__": filepath,
        "__name__": "__main__"
    }
    
    # Leer y ejecutar el script
    try:
        with open(filepath, 'rb') as file:
            exec(compile(file.read(), filepath, 'exec'), global_namespace)
        print("✓ Script ejecutado correctamente")
    except Exception as e:
        print(f"❌ ERROR al ejecutar el script: {e}")
        import traceback
        traceback.print_exc()

