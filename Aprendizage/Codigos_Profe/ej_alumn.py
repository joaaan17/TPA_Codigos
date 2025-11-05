import numpy as np
import random
import matplotlib.pyplot as plt

from env_2D import *
from env_pacman import *
from env_maze import *
from env_race import *
from env_frozen import *
from agentesRL import *

# Ejemplo de uso
if __name__ == "__main__":
    plt.figure(figsize=(5, 5))  # Crear la figura antes del entrenamiento
    env = Environment2D(15, 15)  # Crear un entorno 5x5
    #env = MazeEnvironment(15, 15)  # Crear un entorno 5x5

    state = env.reset()  # Reiniciar el entorno para cada prueba
    done = False
    env.render()  # Mostrar el entorno antes de la prueba

    while not done:
        action = random.choice(env.get_valid_actions())  # Elegir acción basada en Q
        next_state, reward, done = env.step(action)  # Realizar acción
        state = next_state  # Avanzar al siguiente estado

        # Renderizar el entorno después de cada acción
        env.render()  # Renderizar el entorno

    plt.show()
    
    