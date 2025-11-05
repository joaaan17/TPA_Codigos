import numpy as np
import matplotlib.pyplot as plt
import random

class Environment2D:
    def __init__(self, width, height, obstacle_percentage=0):
        self.width = width
        self.height = height
        self.state = (0, 0)  # Estado inicial del agente (esquina superior izquierda)
        self.goal = (width - 1, height - 1)  # Objetivo en la esquina inferior derecha
        self.obstacle_percentage = obstacle_percentage
        self.grid = np.zeros((height, width))  # Crear una cuadrícula de 0s (sin obstáculos)
        self._generate_obstacles()  # Generar obstáculos según el porcentaje dado

    def _generate_obstacles(self):
        total_cells = self.width * self.height
        obstacle_count = int(total_cells * self.obstacle_percentage)  # Número de celdas de obstáculos
        possible_positions = [(x, y) for x in range(self.height) for y in range(self.width)
                              if (x, y) != self.state and (x, y) != self.goal]  # Evitar obstaculizar el inicio y el objetivo

        obstacles = random.sample(possible_positions, obstacle_count)  # Seleccionar posiciones aleatorias
        for (x, y) in obstacles:
            self.grid[x, y] = 1  # Marcar la celda como obstáculo

    def reset(self):
        self.state = (0, 0)  # Reiniciar el estado
        return self.state

    def step(self, action):
        # Mover al agente en función de la acción
        if action == 0:  # Arriba
            new_state = (max(self.state[0] - 1, 0), self.state[1])
        elif action == 1:  # Abajo
            new_state = (min(self.state[0] + 1, self.height - 1), self.state[1])
        elif action == 2:  # Izquierda
            new_state = (self.state[0], max(self.state[1] - 1, 0))
        elif action == 3:  # Derecha
            new_state = (self.state[0], min(self.state[1] + 1, self.width - 1))
        else:
            raise ValueError("Acción no válida")

        # Verificar si la nueva posición es un obstáculo
        if self.grid[new_state] == 1:
            new_state = self.state  # Si es un obstáculo, el agente no se mueve

        self.state = new_state

        # Recompensa: +1 si llega al objetivo, -1 por cada paso
        if self.state == self.goal:
            return self.state, 1, True  # (nuevo estado, recompensa, fin del episodio)
        else:
            return self.state, -1, False  # (nuevo estado, recompensa, fin del episodio)

    def get_valid_actions(self):
        return [0, 1, 2, 3]  # Las acciones posibles: Arriba, Abajo, Izquierda, Derecha

    def render(self):
        """Dibuja el entorno 2D."""
        plt.clf()  # Limpiar la figura actual
        plt.xlim(-0.5, self.width - 0.5)
        plt.ylim(-0.5, self.height - 0.5)

        # Dibujar la cuadrícula
        plt.grid(True)

        # Dibujar los obstáculos
        obstacle_positions = np.argwhere(self.grid == 1)
        for pos in obstacle_positions:
            plt.scatter(pos[1], pos[0], color='black', s=100)  # Obstáculo

        # Dibujar el agente
        plt.scatter(self.state[1], self.state[0], color='blue', s=100, label='Agente')  # Agente
        # Dibujar el objetivo
        plt.scatter(self.goal[1], self.goal[0], color='red', s=100, label='Objetivo')  # Objetivo

        # Etiquetas y leyenda
        plt.xticks(range(self.width))
        plt.yticks(range(self.height))
        plt.gca().invert_yaxis()  # Invertir el eje Y para que la (0,0) esté en la parte superior izquierda
        plt.legend()
        plt.title("Entorno 2D")
        plt.pause(0.1)  # Pausa para permitir la visualización
