const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const WORLD_WIDTH = 3500;
const WORLD_HEIGHT = 3500;

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Registro de Skins Temáticas
const skinCatalog = {
    cyber_dragon: {
        name: "Digital Dragon",
        type: "dragon",
        primaryColor: "#06b6d4",
        secondaryColor: "#3b82f6",
        headDetail: "DRAGON_CYBER",
        badge: "🐉"
    },
    fire_scale: {
        name: "FireScale Killa",
        type: "dragon",
        primaryColor: "#ef4444",
        secondaryColor: "#991b1b",
        headDetail: "DRAGON_FIRE",
        badge: "🔥"
    },
    flag_venezuela: {
        name: "TriColor Runner",
        type: "flag",
        primaryColor: "#facc15",
        secondaryColor: "#2563eb",
        headDetail: "FLAG_TRICOLOR",
        badge: "🇻🇪"
    },
    clockwork_gator: {
        name: "Clockwork Gator",
        type: "gator",
        primaryColor: "#d97706",
        secondaryColor: "#78350f",
        headDetail: "GATOR",
        badge: "🐊"
    }
};

let camera = {
    x: 0,
    y: 0,
    update(targetX, targetY) {
        this.x = targetX - canvas.width / 2;
        this.y = targetY - canvas.height / 2;
    }
};

let player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: 18,
    speed: 4.0,
    trail: [],
    alive: true,
    score: 85420,
    name: "Tú (Jugador)",
    skin: skinCatalog.cyber_dragon,
    cashOutGoal: 100000
};

window.selectSkin = function(skinKey) {
    if (skinCatalog[skinKey]) {
        player.skin = skinCatalog[skinKey];
    }
};

let foodPellets = [];
for (let i = 0; i < 350; i++) {
    spawnPellet();
}

function spawnPellet() {
    foodPellets.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 4,
        color: Math.random() > 0.5 ? '#ef4444' : '#38bdf8'
    });
}

let goldCoins = [];

let bots = [
    { name: "FireScale_Killa", skin: skinCatalog.fire_scale, x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 - 150, score: 140 },
    { name: "TriColor_Runner", skin: skinCatalog.flag_venezuela, x: WORLD_WIDTH / 2 + 250, y: WORLD_HEIGHT / 2 - 100, score: 1250 },
    { name: "Clockwork_Gator", skin: skinCatalog.clockwork_gator, x: WORLD_WIDTH / 2 + 300, y: WORLD_HEIGHT / 2 + 100, score: 3400 }
];

bots.forEach(bot => {
    bot.radius = 18;
    bot.speed = 2.4;
    bot.angle = Math.random() * Math.PI * 2;
    bot.changeTimer = 0;
    bot.trail = [];
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Dibujo de Malla de Panal Hexagonal
function drawHexMap(ctx) {
    const hexRadius = 40;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;

    ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#0a0f1d";

    let startX = Math.floor(camera.x / hexWidth) * hexWidth - hexWidth;
    let endX = startX + canvas.width + hexWidth * 2;
    let startY = Math.floor(camera.y / (hexHeight * 0.75)) * (hexHeight * 0.75) - hexHeight;
    let endY = startY + canvas.height + hexHeight * 2;

    for (let y = startY; y < endY; y += hexHeight * 0.75) {
        let isOffset = Math.floor(y / (hexHeight * 0.75)) % 2 !== 0;
        let xOffset = isOffset ? hexWidth / 2 : 0;

        for (let x = startX + xOffset; x < endX; x += hexWidth) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                let angle = (Math.PI / 3) * i;
                let hx = x + hexRadius * Math.cos(angle);
                let hy = y + hexRadius * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
}

// Renderizador Avanzado de Cabeza de Gusano
function drawAdvancedHead(ctx, x, y, radius, angle, skin, name, score) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Renderizar Forma según el Tipo de Skin
    if (skin.headDetail === "DRAGON_CYBER" || skin.headDetail === "DRAGON_FIRE") {
        // Hocico / Cabeza de Dragón
        ctx.fillStyle = skin.primaryColor;
        ctx.beginPath();
        ctx.moveTo(radius * 1.4, 0);
        ctx.lineTo(-radius * 0.8, -radius * 0.9);
        ctx.lineTo(-radius * 0.5, 0);
        ctx.lineTo(-radius * 0.8, radius * 0.9);
        ctx.closePath();
        ctx.fill();

        // Cuernos
        ctx.fillStyle = skin.secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, -radius * 0.6);
        ctx.lineTo(-radius * 1.5, -radius * 1.1);
        ctx.lineTo(-radius * 0.8, -radius * 0.3);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, radius * 0.6);
        ctx.lineTo(-radius * 1.5, radius * 1.1);
        ctx.lineTo(-radius * 0.8, radius * 0.3);
        ctx.fill();
    } else {
        // Cabeza Estándar
        ctx.fillStyle = skin.primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ojos Grandes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(radius * 0.3, -radius * 0.4, 5, 0, Math.PI * 2);
    ctx.arc(radius * 0.3, radius * 0.4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(radius * 0.4, -radius * 0.4, 2.5, 0, Math.PI * 2);
    ctx.arc(radius * 0.4, radius * 0.4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Etiqueta de Saldo Flotante ($ USD)
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    let labelText = `$${score.toLocaleString()}`;
    ctx.font = "bold 12px sans-serif";
    let textWidth = ctx.measureText(labelText).width;

    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 10, y - radius - 32, textWidth + 20, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.fillText(labelText, x, y - radius - 17);

    // Nombre
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText(name, x, y - radius - 38);
    ctx.restore();
}

// Bucle Principal
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.alive) {
        let cx = mouse.x - canvas.width / 2;
        let cy = mouse.y - canvas.height / 2;
        let angle = Math.atan2(cy, cx);

        if (Math.hypot(cx, cy) > 3) {
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
        }

        player.x = Math.max(30, Math.min(WORLD_WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, player.y));

        player.trail.push({ x: player.x, y: player.y, angle: angle });
        if (player.trail.length > Math.floor(player.radius * 2.8)) player.trail.shift();

        camera.update(player.x, player.y);
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Dibujar Panal Hexagonal
    drawHexMap(ctx);

    // Dibujar Comida
    for (let p of foodPellets) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Dibujar Bots
    bots.forEach(bot => {
        bot.changeTimer++;
        if (bot.changeTimer > 80) {
            bot.angle += (Math.random() - 0.5) * 1.5;
            bot.changeTimer = 0;
        }
        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > Math.floor(bot.radius * 2.8)) bot.trail.shift();

        // Cuerpo
        for (let i = 0; i < bot.trail.length; i++) {
            let p = bot.trail[i];
            ctx.fillStyle = (i % 2 === 0) ? bot.skin.primaryColor : bot.skin.secondaryColor;
            ctx.beginPath(); ctx.arc(p.x, p.y, bot.radius * 0.8, 0, Math.PI * 2); ctx.fill();
        }

        drawAdvancedHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score);
    });

    // Dibujar Jugador
    if (player.alive) {
        let lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;

        // Cuerpo con textura/escamas
        for (let i = 0; i < player.trail.length; i++) {
            let p = player.trail[i];
            let size = player.radius * (i / player.trail.length);
            ctx.fillStyle = (i % 2 === 0) ? player.skin.primaryColor : player.skin.secondaryColor;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(size, 5), 0, Math.PI * 2); ctx.fill();
        }

        drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

gameLoop();
