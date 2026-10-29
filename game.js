const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Coordenadas del mundo del juego (El mapa es mucho más grande que la pantalla)
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Cámara que sigue al jugador
let camera = {
    x: 0,
    y: 0,
    update(targetX, targetY) {
        // Centrar la cámara suavemente en el jugador
        this.x = targetX - canvas.width / 2;
        this.y = targetY - canvas.height / 2;
    }
};

// Estructura del Jugador
let player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: 14,
    speed: 3.8,
    trail: [],
    alive: true,
    score: 0,
    name: "Tú (Jugador)",
    cashOutGoal: 40 // Puntos necesarios para habilitar el cash out
};

// Comida pequeña normal (Pepitas verdes)
let foodPellets = [];
for (let i = 0; i < 300; i++) {
    spawnPellet();
}

function spawnPellet() {
    foodPellets.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 3,
        color: '#10b981',
        value: 1
    });
}

// Monedas doradas grandes (Botín de muertos)
let goldCoins = [];

// Bots ambulantes con nombres flotantes (Estilo del video)
let bots = [];
const botNames = ["CrimsonNinja42", "ShadowSnakeXX", "NovaHunter916", "ToxicLegendX9", "MegaDrifter328"];
for (let i = 0; i < 6; i++) {
    spawnBot(botNames[i] || "BotPlayer");
}

function spawnBot(name) {
    bots.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 14,
        speed: 2.3,
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0,
        trail: [],
        color: '#ef4444',
        name: name
    });
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Soltar monedas doradas al morir
function createGoldCoins(trail) {
    for (let i = 0; i < trail.length; i += 2) {
        goldCoins.push({
            x: trail[i].x + (Math.random() - 0.5) * 15,
            y: trail[i].y + (Math.random() - 0.5) * 15,
            radius: 7,
            color: '#eab308',
            value: 5
        });
    }
}

function attemptCashOut() {
    if (player.score >= player.cashOutGoal) {
        alert(`¡Retirada exitosa! Has cobrado $${(player.score * 0.1).toFixed(2)} USD.`);
        player.score = 0;
        player.radius = 14;
    } else {
        alert("Aún no has llenado la barra superior para retirarte.");
    }
}

// Bucle principal de renderizado
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.alive) {
        // 1. Mover Jugador hacia el mouse respecto al centro de la pantalla
        let cx = mouse.x - canvas.width / 2;
        let cy = mouse.y - canvas.height / 2;
        let angle = Math.atan2(cy, cx);

        if (Math.hypot(cx, cy) > 3) {
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
        }

        // Limitar dentro del mapa gigante
        player.x = Math.max(30, Math.min(WORLD_WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, player.y));

        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > Math.floor(player.radius * 2.5)) player.trail.shift();

        // Actualizar la cámara para que siga al jugador
        camera.update(player.x, player.y);
    }

    // APLICAR TRANSFORMACIÓN DE CÁMARA (Todo lo que se dibuje aquí se moverá con el mapa)
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // 2. Dibujar Cuadrícula / Fondo del Mapa Gigante
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
    }

    // 3. Dibujar Comida Normal (Verde)
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

        if (player.alive) {
            if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
                player.radius += 0.05;
                player.score += p.value;
                foodPellets.splice(i, 1);
                spawnPellet();
            }
        }
    }

    // 4. Dibujar Monedas Doradas (Botín brillante)
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        if (player.alive) {
            if (Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
                player.radius += 0.3;
                player.score += coin.value;
                goldCoins.splice(i, 1);
            }
        }
    }

    // 5. Actualizar y Dibujar BOTS
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        bot.changeTimer++;
        if (bot.changeTimer > 90) {
            bot.angle += (Math.random() - 0.5) * 1.5;
            bot.changeTimer = 0;
        }

        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        if (bot.x < 50 || bot.x > WORLD_WIDTH - 50) bot.angle = Math.PI - bot.angle;
        if (bot.y < 50 || bot.y > WORLD_HEIGHT - 50) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y });
        if (bot.trail.length > Math.floor(bot.radius * 2.5)) bot.trail.shift();

        // Colisión Bot contra Jugador
        if (player.alive) {
            for (let segment of player.trail) {
                if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + player.radius * 0.7) {
                    createGoldCoins(bot.trail);
                    let name = bot.name;
                    bots.splice(bIndex, 1);
                    setTimeout(() => spawnBot(name), 3000);
                    break;
                }
            }
        }

        // Cuerpo del Bot
        for (let p of bot.trail) {
            ctx.fillStyle = "#991b1b";
            ctx.beginPath(); ctx.arc(p.x, p.y, bot.radius * 0.75, 0, Math.PI * 2); ctx.fill();
        }
        // Cabeza y Nombre del Bot
        ctx.fillStyle = bot.color;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 8);
    }

    // 6. Dibujar Jugador con su nombre flotante
    if (player.alive) {
        for (let bot of bots) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.7) {
                    player.alive = false;
                    createGoldCoins(player.trail);
                    alert("¡Chocaste contra un rival y perdiste!");
                    setTimeout(() => {
                        player.x = WORLD_WIDTH / 2;
                        player.y = WORLD_HEIGHT / 2;
                        player.radius = 14;
                        player.score = 0;
                        player.trail = [];
                        player.alive = true;
                    }, 1000);
                    break;
                }
            }
        }

        // Cuerpo del Jugador
        for (let i = 0; i < player.trail.length; i++) {
            let p = player.trail[i];
            let size = player.radius * (i / player.trail.length);
            ctx.fillStyle = "#059669";
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2); ctx.fill();
        }

        // Cabeza del Jugador
        ctx.fillStyle = "#10b981";
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();

        // Nombre flotante del usuario (Estilo del video)
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(player.name, player.x, player.y - player.radius - 8);
    }

    ctx.restore(); // Restaurar la cámara normal para elementos fijos de la interfaz

    // Actualizar barra superior de Cash Out dinámicamente
    let progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    // Puedes añadir un elemento en tu HTML con id="cashBarFill" para ver cómo se llena la barra

    requestAnimationFrame(gameLoop);
}

gameLoop();
