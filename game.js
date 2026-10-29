const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Posición y estructura del gusano del jugador
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let snake = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    speed: 3,
    trail: []
};

// Registrar movimiento del mouse
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Funciones para abrir y cerrar modales
function openModal() {
    document.getElementById('depositModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('depositModal').style.display = 'none';
}

function submitPayment() {
    const ref = document.getElementById('refInput').value;
    if (!ref) {
        alert("Por favor ingresa el número de referencia del Pago Móvil.");
        return;
    }
    alert("¡Pago reportado con éxito! Referencia: " + ref);
    closeModal();
}

// Bucle principal del juego en Canvas
function gameLoop() {
    // Limpiar pantalla
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar cuadrícula de fondo estilo neón
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Mover la cabeza del gusano hacia el mouse
    let dx = mouse.x - snake.x;
    let dy = mouse.y - snake.y;
    let angle = Math.atan2(dy, dx);
    
    if (Math.hypot(dx, dy) > 2) {
        snake.x += Math.cos(angle) * snake.speed;
        snake.y += Math.sin(angle) * snake.speed;
    }

    // Guardar rastro del cuerpo
    snake.trail.push({ x: snake.x, y: snake.y });
    if (snake.trail.length > 25) {
        snake.trail.shift();
    }

    // Dibujar el cuerpo del gusano
    for (let i = 0; i < snake.trail.length; i++) {
        let p = snake.trail[i];
        let size = snake.radius * (i / snake.trail.length);
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2);
        ctx.fill();
    }

    // Dibujar la cabeza del gusano con ojos
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, snake.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ojos
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(snake.x + Math.cos(angle - 0.5) * 6, snake.y + Math.sin(angle - 0.5) * 6, 3, 0, Math.PI * 2);
    ctx.arc(snake.x + Math.cos(angle + 0.5) * 6, snake.y + Math.sin(angle + 0.5) * 6, 3, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(gameLoop);
}

gameLoop();