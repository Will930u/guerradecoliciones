const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Estructura del Jugador
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    speed: 3.5,
    trail: [],
    alive: true,
    score: 0
};

// Comida pequeña normal (pepitas de crecimiento lento)
let foodPellets = [];
for (let i = 0; i < 120; i++) {
    spawnPellet();
}

function spawnPellet() {
    foodPellets.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 3,
        color: '#10b981',
        value: 0.05
    });
}

// Monedas doradas grandes (dejadas por los muertos -> Crecimiento Rápido)
let goldCoins = [];

// Bots ambulantes oponentes
let bots = [];
for (let i = 0; i < 6; i++) {
    spawnBot();
}

function spawnBot() {
    bots.push({
        id: Math.random(),
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 12,
        speed: 2.2,
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0,
        trail: [],
        color: '#ef4444'
    });
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Función para soltar botín de monedas doradas al morir
function createGoldCoins(trail, radius) {
    for (let i = 0; i < trail.length; i += 2) {
        goldCoins.push({
            x: trail[i].x + (Math.random() - 0.5) * 10,
            y: trail[i].y + (Math.random() - 0.5) * 10,
            radius: 6,
            color: '#eab308', // Dorado
            value: 0.8 // ¡Crecimiento RÁPIDO!
        });
    }
}

// Bucle principal
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar Cuadrícula de Fondo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 2. Dibujar y Comer Comida Normal (Verde - Crecimiento Lento)
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (player.alive) {
            let dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < player.radius + p.radius) {
                player.radius += p.value;
                foodPellets.splice(i, 1);
                spawnPellet();
            }
        }
    }

    // 3. Dibujar y Comer Monedas Doradas (Botín de Muertos - Crecimiento RÁPIDO)
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Si el jugador la come
        if (player.alive) {
            let dist = Math.hypot(player.x - coin.x, player.y - coin.y);
            if (dist < player.radius + coin.radius) {
                player.radius += coin.value; // ¡Crece mucho más rápido!
                goldCoins.splice(i, 1);
            }
        }
    }

    // 4. Actualizar y Dibujar BOTS
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];

        bot.changeTimer++;
        if (bot.changeTimer > 80) {
            bot.angle += (Math.random() - 0.5) * 1.5;
            bot.changeTimer = 0;
        }

        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        // Rebotar en paredes
        if (bot.x < 30 || bot.x > canvas.width - 30) bot.angle = Math.PI - bot.angle;
        if (bot.y < 30 || bot.y > canvas.height - 30) bot.angle = -bot.angle;

        // Rastro del Bot
        bot.trail.push({ x: bot.x, y: bot.y });
        if (bot.trail.length > Math.floor(bot.radius * 2.5)) bot.trail.shift();

        // COLISIÓN: Cabeza del Bot choca contra el cuerpo del JUGADOR
        if (player.alive) {
            for (let segment of player.trail) {
                let d = Math.hypot(bot.x - segment.x, bot.y - segment.y);
                if (d < bot.radius + player.radius * 0.7) {
                    // ¡EL BOT MUERE!
                    createGoldCoins(bot.trail, bot.radius);
                    bots.splice(bIndex, 1);
                    setTimeout(spawnBot, 3000); // Reaparece un nuevo bot en 3 seg
                    break;
                }
            }
        }

        // Dibujar cuerpo del Bot
        for (let p of bot.trail) {
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath();
            ctx.arc(p.x, p.y, bot.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        // Cabeza del Bot
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. Actualizar y Dibujar JUGADOR
    if (player.alive) {
        let dx = mouse.x - player.x;
        let dy = mouse.y - player.y;
        let angle = Math.atan2(dy, dx);

        if (Math.hypot(dx, dy) > 2) {
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
        }

        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > Math.floor(player.radius * 2.5)) {
            player.trail.shift();
        }

        // COLISIÓN: Cabeza del Jugador choca contra el cuerpo de algún BOT
        for (let bot of bots) {
            for (let segment of bot.trail) {
                let d = Math.hypot(player.x - segment.x, player.y - segment.y);
                if (d < player.radius + bot.radius * 0.7) {
                    // ¡EL JUGADOR MUERE!
                    player.alive = false;
                    createGoldCoins(player.trail, player.radius);
                    alert("¡Has chocado y moriste! Tus monedas quedaron en el mapa.");
                    setTimeout(() => {
                        player.x = canvas.width / 2;
                        player.y = canvas.height / 2;
                        player.radius = 12;
                        player.trail = [];
                        player.alive = true;
                    }, 1000);
                    break;
                }
            }
        }

        // Dibujar cuerpo del Jugador
        for (let i = 0; i < player.trail.length; i++) {
            let p = player.trail[i];
            let size = player.radius * (i / player.trail.length);
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2);
            ctx.fill();
        }

        // Dibujar cabeza del Jugador
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ojos
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(player.x + Math.cos(angle - 0.5) * 6, player.y + Math.sin(angle - 0.5) * 6, 2.5, 0, Math.PI * 2);
        ctx.arc(player.x + Math.cos(angle + 0.5) * 6, player.y + Math.sin(angle + 0.5) * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
