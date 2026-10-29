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
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    speed: 3.5,
    trail: []
};

// Array de pepitas (comida pequeña para crecimiento lento)
let foodPellets = [];
for (let i = 0; i < 150; i++) {
    foodPellets.push({
        x: Math.random() * canvas.width * 2 - canvas.width,
        y: Math.random() * canvas.height * 2 - canvas.height,
        radius: 3,
        color: '#10b981'
    });
}

// Array de bots ambulantes autónomos
let bots = [];
for (let i = 0; i < 5; i++) {
    bots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 12,
        speed: 2,
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0,
        trail: [],
        color: '#ef4444' // Color rojo diferenciador para los bots
    });
}

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar cuadrícula de fondo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 1. Dibujar y gestionar las pepitas pequeñas (Crecimiento lento)
    for (let pellet of foodPellets) {
        ctx.fillStyle = pellet.color;
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2);
        ctx.fill();

        // Colisión del jugador con las pepitas (crecimiento muy pequeño: +0.05 por pepita)
        let dist = Math.hypot(player.x - pellet.x, player.y - pellet.y);
        if (dist < player.radius + pellet.radius) {
            player.radius += 0.05; // Crecimiento mínimo y controlado
            // Reubicar pepita
            pellet.x = Math.random() * canvas.width;
            pellet.y = Math.random() * canvas.height;
        }
    }

    // 2. Mover y actualizar los Bots Ambulantes
    for (let bot of bots) {
        bot.changeTimer++;
        if (bot.changeTimer > 100) {
            bot.angle += (Math.random() - 0.5) * 2; // Cambiar dirección suavemente
            bot.changeTimer = 0;
        }

        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        // Rebotar en los bordes de la pantalla
        if (bot.x < 50 || bot.x > canvas.width - 50) bot.angle = Math.PI - bot.angle;
        if (bot.y < 50 || bot.y > canvas.height - 50) bot.angle = -bot.angle;

        // Guardar rastro del bot
        bot.trail.push({ x: bot.x, y: bot.y });
        if (bot.trail.length > 20) bot.trail.shift();

        // Dibujar cuerpo del bot
        for (let p of bot.trail) {
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath();
            ctx.arc(p.x, p.y, bot.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dibujar cabeza del bot
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Mover la cabeza del jugador hacia el mouse
    let dx = mouse.x - player.x;
    let dy = mouse.y - player.y;
    let angle = Math.atan2(dy, dx);
    
    if (Math.hypot(dx, dy) > 2) {
        player.x += Math.cos(angle) * player.speed;
        player.y += Math.sin(angle) * player.speed;
    }

    // Guardar rastro del jugador
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > Math.floor(player.radius * 3)) {
        player.trail.shift();
    }

    // Dibujar el cuerpo del jugador
    for (let i = 0; i < player.trail.length; i++) {
        let p = player.trail[i];
        let size = player.radius * (i / player.trail.length);
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2);
        ctx.fill();
    }

    // Dibujar la cabeza del jugador con ojos
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(angle - 0.5) * 6, player.y + Math.sin(angle - 0.5) * 6, 2.5, 0, Math.PI * 2);
    ctx.arc(player.x + Math.cos(angle + 0.5) * 6, player.y + Math.sin(angle + 0.5) * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(gameLoop);
}

gameLoop();
