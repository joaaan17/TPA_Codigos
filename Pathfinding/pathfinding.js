// Configuración de la cuadrícula
const CONFIG = {
    CELL_SIZE: 20,              // Tamaño de cada celda en píxeles
    GRID_COLOR: '#FFFFFF',      // Color de las líneas de la cuadrícula (blanco)
    WALL_COLOR: '#FFFFFF',      // Color de los obstáculos (blanco)
    START_COLOR: '#4CAF50',     // Color del punto de inicio (verde)
    END_COLOR: '#FF5722',       // Color del punto de destino (naranja-rojo)
    START_POS: { x: 2, y: 2 },  // Posición inicial (esquina superior izquierda)
    END_POS: { x: 35, y: 25 }   // Posición del destino (zona inferior derecha)
};

// Variables globales
let canvas, ctx;
let obstacles = new Set(); // Usar Set para almacenar obstáculos de forma eficiente
let startPos = CONFIG.START_POS;
let endPos = CONFIG.END_POS;
let isDragging = false;
let draggingItem = null; // 'start', 'end' o null
let isMouseDown = false;
let isPainting = false; // true para pintar, false para borrar
let lastCell = null; // Para rastrear la última celda visitada

// Configuración de dimensiones del canvas
const CANVAS_CONFIG = {
    baseWidth: 800,
    baseHeight: 600,
    aspectRatio: 800 / 600
};

// Inicialización
function init() {
    canvas = document.getElementById('gridCanvas');
    ctx = canvas.getContext('2d');
    
    // Redimensionar canvas al cargar y al cambiar el tamaño de la ventana
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners para interacción con mouse
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Deshabilitar menú contextual
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseUp); // Detener al salir del canvas
    
    // Event listeners para interacción táctil
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    render();
}

// Redimensionar el canvas manteniendo el aspect ratio
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    
    // Calcular el nuevo tamaño manteniendo el aspect ratio
    let newWidth = Math.min(containerWidth, CANVAS_CONFIG.baseWidth);
    let newHeight = newWidth / CANVAS_CONFIG.aspectRatio;
    
    // Asegurar que no exceda la altura disponible
    // En móviles, usar más espacio vertical (60% en móvil vs 70% en desktop)
    const isMobile = window.innerWidth <= 600;
    const maxHeight = window.innerHeight * (isMobile ? 0.6 : 0.7);
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * CANVAS_CONFIG.aspectRatio;
    }
    
    // Aplicar el nuevo tamaño
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    
    render();
}

// Obtener la celda desde coordenadas del mouse
function getCellFromMouse(x, y) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = x - rect.left;
    const mouseY = y - rect.top;
    
    return {
        x: Math.floor(mouseX / CONFIG.CELL_SIZE),
        y: Math.floor(mouseY / CONFIG.CELL_SIZE)
    };
}

// Verificar si una posición es el inicio
function isStart(pos) {
    return pos.x === startPos.x && pos.y === startPos.y;
}

// Verificar si una posición es el destino
function isEnd(pos) {
    return pos.x === endPos.x && pos.y === endPos.y;
}

// Manejar inicio de click presionado
function handleMouseDown(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Click derecho: seleccionar inicio o destino para mover
    if (e.button === 2) {
        if (isStart(cell)) {
            isDragging = true;
            draggingItem = 'start';
            return;
        } else if (isEnd(cell)) {
            isDragging = true;
            draggingItem = 'end';
            return;
        }
    }
    
    // Click izquierdo: iniciar pintado de obstáculos
    if (e.button === 0) {
        isMouseDown = true;
        
        // No permitir obstáculos en las posiciones de inicio o fin
        if (isStart(cell) || isEnd(cell)) {
            return;
        }
        
        // Determinar si estamos pintando o borrando
        isPainting = !obstacles.has(cellKey);
        
        // Toggle la celda inicial
        if (isPainting) {
            obstacles.add(cellKey);
        } else {
            obstacles.delete(cellKey);
        }
        
        lastCell = cellKey;
        render();
    }
}

// Manejar click simple (tap)
function handleClick(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Click derecho: seleccionar inicio o destino para mover
    if (e.button === 2) {
        if (isStart(cell)) {
            isDragging = true;
            draggingItem = 'start';
            return;
        } else if (isEnd(cell)) {
            isDragging = true;
            draggingItem = 'end';
            return;
        }
    }
}

// Manejar liberación del mouse
function handleMouseUp(e) {
    isMouseDown = false;
    isDragging = false;
    lastCell = null;
}

// Función para pintar o borrar una celda
function paintCell(cell, cellKey) {
    // No permitir obstáculos en las posiciones de inicio o fin
    if (isStart(cell) || isEnd(cell)) {
        return;
    }
    
    if (isPainting) {
        obstacles.add(cellKey);
    } else {
        obstacles.delete(cellKey);
    }
}

// Manejar movimiento del mouse
function handleMouseMove(e) {
    const cell = getCellFromMouse(e.clientX, e.clientY);
    const cellKey = `${cell.x},${cell.y}`;
    
    // Si estamos arrastrando inicio o fin
    if (isDragging && draggingItem) {
        // No permitir mover a posiciones con obstáculos u otra celda especial
        if (obstacles.has(cellKey)) return;
        if ((draggingItem === 'start' && isEnd(cell)) || 
            (draggingItem === 'end' && isStart(cell))) {
            return;
        }
        
        if (draggingItem === 'start') {
            startPos = cell;
        } else if (draggingItem === 'end') {
            endPos = cell;
        }
        
        render();
        return;
    }
    
    // Si estamos pintando/borrando con el click izquierdo
    if (isMouseDown) {
        // Evitar pintar la misma celda múltiples veces
        if (lastCell === cellKey) return;
        lastCell = cellKey;
        
        paintCell(cell, cellKey);
        render();
    }
}

// Dibujar la cuadrícula
function drawGrid() {
    const rows = Math.ceil(canvas.height / CONFIG.CELL_SIZE);
    const cols = Math.ceil(canvas.width / CONFIG.CELL_SIZE);
    
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 0.5;
    
    // Dibujar líneas verticales
    for (let i = 0; i <= cols; i++) {
        const x = i * CONFIG.CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Dibujar líneas horizontales
    for (let i = 0; i <= rows; i++) {
        const y = i * CONFIG.CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Dibujar una celda cuadrada rellena
function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
        x * CONFIG.CELL_SIZE + 1,
        y * CONFIG.CELL_SIZE + 1,
        CONFIG.CELL_SIZE - 2,
        CONFIG.CELL_SIZE - 2
    );
}

// Dibujar una flecha triangular (para el agente vehículo)
function drawArrow(x, y, direction = 0) {
    // Calcular el centro de la celda
    const centerX = x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const centerY = y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const size = CONFIG.CELL_SIZE * 0.5; // 50% del tamaño de la celda para hacerlo más pequeño
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(direction);
    
    // Dibujar triángulo apuntando a la derecha (como la imagen)
    ctx.fillStyle = '#666'; // Gris oscuro (#666666 simplificado)
    ctx.beginPath();
    ctx.moveTo(size * 0.7, 0); // Punta de la flecha (más alargada)
    ctx.lineTo(-size * 0.7, size * 0.4); // Esquina inferior izquierda
    ctx.lineTo(-size * 0.7, -size * 0.4); // Esquina superior izquierda
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Renderizar todo el estado actual
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Dibujar la cuadrícula
    drawGrid();
    
    // 2. Dibujar obstáculos
    for (const cellKey of obstacles) {
        const [x, y] = cellKey.split(',').map(Number);
        drawCell(x, y, CONFIG.WALL_COLOR);
    }
    
    // 3. Dibujar punto de destino (antes del inicio para que esté debajo)
    drawCell(endPos.x, endPos.y, CONFIG.END_COLOR);
    
    // 4. Dibujar punto de inicio como flecha (agente vehículo)
    drawArrow(startPos.x, startPos.y, 0);
}

// Handlers para eventos táctiles
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0, // Tratamos todos los toques como click izquierdo
        touches: e.touches
    };
    handleMouseDown(simulatedEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp(e);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        touches: e.touches
    };
    handleMouseMove(simulatedEvent);
}

// Iniciar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', init);


