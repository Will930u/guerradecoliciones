const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Coordenadas del mundo del juego (Mapa gigante)
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Catálogo de Skins y Dibujos Personalizados
const skinStyles = {
    dragon: {
        name: "Dragón de Fuego",
        headColor: "#dc2626",
        bodyColor: "#991b1b",
        badge: "🐉"
    },
    flag: {
        name: "Bandera Nacional",
        headColor: "#facc15",
        bodyColor: "#2563eb",
        badge: "🇻🇪"
    },
    claws: {
        name: "Garras Letales",
        headColor: "#0284c7",
        bodyColor: "#0f172a",
        badge: "🐾"
    },
    sticker: {
        name: "Sticker Retro",
        headColor: "#ec4899",
        bodyColor: "#be185d",
        badge: "⭐"
    }
};

// Cámara que sigue al jugador
let camera = {
    x: 0,
    y: 0,
    update(targetX, targetY) {
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
    skin: skinStyles.dragon, // Skin inicial de Dragón
    cashOutGoal: 40
};

// Función global para cambiar skin desde la interfaz
window.changeSkin = function(skinKey) {
    if (skinStyles[skinKey]) {
        player.skin = skinStyles[skinKey];
    }
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

// Bots ambulantes con nombres y skins asignadas
let bots = [];
const botConfig = [
    { name: "CrimsonNinja42", skin: skinStyles.claws },
    { name: "ShadowSnakeXX", skin: skinStyles.sticker },
    { name: "NovaHunter916", skin: skinStyles.flag },
    { name: "ToxicLegendX9", skin: skinStyles.dragon },
    { name: "MegaDrifter328", skin: skinStyles.claws }
];

for (let i = 0; i < botConfig.length; i++) {
    spawnBot(botConfig[i].name, botConfig[i].skin);
}

function spawnBot(name, skin) {
    bots.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 14,
        speed: 2.3,
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0,
        trail: [],
        skin: skin || skinStyles.claws,
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
        // Mover Jugador hacia el mouse
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

    // APLICAR TRANSFORMACIÓN DE CÁMARA
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // 1. Dibujar Cuadrícula de Fondo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
    }

    // 2. Dibujar Comida Normal (Verde)
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

    // 3. Dibujar Monedas Doradas
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

    // 4. Actualizar y Dibujar BOTS
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
                    let skin = bot.skin;
                    bots.splice(bIndex, 1);
                    setTimeout(() => spawnBot(name, skin), 3000);
                    break;
                }
            }
        }

        // Cuerpo del Bot estilizado
        for (let i = 0; i < bot.trail.length; i++) {
            let p = bot.trail[i];
            let size = bot.radius * (i / bot.trail.length);
            ctx.fillStyle = (i % 2 === 0) ? bot.skin.bodyColor : bot.skin.headColor;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2); ctx.fill();
        }

        // Cabeza e Insignia del Bot
        ctx.fillStyle = bot.skin.headColor;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2); ctx.fill();

        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bot.skin.badge, bot.x, bot.y);

        // Nombre del Bot
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 10);
    }

    // 5. Dibujar Jugador con Skin Personalizada
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

        // Cuerpo del Jugador con patrón alternado de la Skin
        for (let i = 0; i < player.trail.length; i++) {
            let p = player.trail[i];
            let size = player.radius * (i / player.trail.length);
            ctx.fillStyle = (i % 2 === 0) ? player.skin.bodyColor : player.skin.headColor;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2); ctx.fill();
        }

        // Cabeza del Jugador
        ctx.fillStyle = player.skin.headColor;
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();

        // Insignia/Sticker en la cabeza
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(player.skin.badge, player.x, player.y);

        // Nombre flotante del usuario
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(player.name, player.x, player.y - player.radius - 10);
    }

    ctx.restore(); // Restaurar contexto para HUD

    requestAnimationFrame(gameLoop);
}

gameLoop();
