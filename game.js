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

// Catálogo de Skins Temáticas
const skinCatalog = {
    cyber_dragon: {
        name: "Digital Dragon",
        primaryColor: "#10b981",
        secondaryColor: "#065f46"
    },
    fire_scale: {
        name: "FireScale Killa",
        primaryColor: "#ef4444",
        secondaryColor: "#991b1b"
    },
    flag_venezuela: {
        name: "TriColor Runner",
        primaryColor: "#facc15",
        secondaryColor: "#1e40af"
    },
    clockwork_gator: {
        name: "Clockwork Gator",
        primaryColor: "#d97706",
        secondaryColor: "#78350f"
    }
};

const skinKeys = Object.keys(skinCatalog);

// Cámara con Zoom Dinámico
let camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    update(targetX, targetY, playerRadius) {
        this.targetZoom = Math.max(0.4, 1.0 - (playerRadius - 18) * 0.008);
        this.zoom += (this.targetZoom - this.zoom) * 0.05;

        this.x = targetX - (canvas.width / 2) / this.zoom;
        this.y = targetY - (canvas.height / 2) / this.zoom;
    }
};

let player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: 18,
    speed: 4.2,
    trail: [],
    alive: true,
    score: 0, // Inicia en $0 USD reales
    name: "Tú (Jugador)",
    skin: skinCatalog.cyber_dragon,
    cashOutGoal: 100000
};

// Selector de Skin
window.selectSkin = function(skinKey) {
    if (skinCatalog[skinKey]) {
        player.skin = skinCatalog[skinKey];
    }
};

// Notificaciones Flotantes
function showFloatingMessage(text, color = "#10b981") {
    let notif = document.getElementById('floatingNotification');
    if (!notif) return;
    notif.innerText = text;
    notif.style.background = color;
    notif.style.opacity = '1';
    
    clearTimeout(window.notifTimer);
    window.notifTimer = setTimeout(() => {
        notif.style.opacity = '0';
    }, 3000);
}

// Comida pequeña normal (Pepitas Neón - NO DAN DINERO, SOLO CRECIMIENTO MÍNIMO)
let foodPellets = [];
for (let i = 0; i < 450; i++) {
    spawnPellet();
}

function spawnPellet() {
    foodPellets.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 4.5,
        color: Math.random() > 0.5 ? '#ef4444' : '#10b981'
    });
}

// Monedas doradas grandes (Botín de gusanos caídos - SÍ SUMAN SALDO Y TAMAÑO)
let goldCoins = [];

function createGoldCoins(trail, totalScore) {
    let coinsCount = Math.max(5, Math.floor(trail.length / 2));
    let valuePerCoin = Math.max(10, Math.floor(totalScore / coinsCount));

    for (let i = 0; i < trail.length; i += 2) {
        goldCoins.push({
            x: trail[i].x + (Math.random() - 0.5) * 20,
            y: trail[i].y + (Math.random() - 0.5) * 20,
            radius: 8,
            color: '#eab308',
            value: valuePerCoin
        });
    }
}

// Nombres para los Bots
const botNamesList = [
    "ViperKilla", "ShadowHunter", "AlphaOmega", "NeonVenom", "ToxicSerpent",
    "ApexPredator", "CyberCobra", "GoldenScale", "DragonsLair", "TitanPython",
    "GatorBite", "HyperSpeed", "ZeroTolerance", "PhantomSnake", "DarkRider",
    "FlameThrower", "VorticeXX", "SteelFang", "MegaSlayer", "ChaosReaper"
];

let bots = [];
for (let i = 0; i < 20; i++) {
    let randomSkinKey = skinKeys[Math.floor(Math.random() * skinKeys.length)];
    spawnBorderBot(botNamesList[i] || ("Bot_" + i), skinCatalog[randomSkinKey]);
}

function spawnBorderBot(name, skin) {
    let edge = Math.floor(Math.random() * 4);
    let sx, sy, sAngle;

    if (edge === 0) { sx = 50; sy = Math.random() * WORLD_HEIGHT; sAngle = 0; }
    else if (edge === 1) { sx = WORLD_WIDTH - 50; sy = Math.random() * WORLD_HEIGHT; sAngle = Math.PI; }
    else if (edge === 2) { sx = Math.random() * WORLD_WIDTH; sy = 50; sAngle = Math.PI / 2; }
    else { sx = Math.random() * WORLD_WIDTH; sy = WORLD_HEIGHT - 50; sAngle = -Math.PI / 2; }

    bots.push({
        name: name,
        skin: skin,
        x: sx,
        y: sy,
        radius: 18,
        speed: 2.8 + Math.random() * 0.6,
        angle: sAngle,
        changeTimer: 0,
        trail: [],
        score: Math.floor(Math.random() * 1000) + 200,
        alive: true
    });
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Modal & Cash Out
function openModal() {
    document.getElementById('depositModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('depositModal').style.display = 'none';
}
function submitPayment() {
    const ref = document.getElementById('refInput').value;
    if (!ref) {
        showFloatingMessage("Por favor ingresa el número de referencia.", "#ef4444");
        return;
    }
    showFloatingMessage("¡Pago reportado con éxito!", "#10b981");
    closeModal();
}
function attemptCashOut() {
    if (player.score >= player.cashOutGoal) {
        showFloatingMessage(`¡Retirada exitosa! Cobrado $${(player.score * 0.1).toFixed(2)} USD.`, "#eab308");
        player.score = 0;
        player.radius = 18;
    } else {
        showFloatingMessage("Aún no has llenado la barra superior para retirarte.", "#ef4444");
    }
}

// Dibujo de Malla Hexagonal
function drawHexMap(ctx) {
    const hexRadius = 45;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "#070c16";

    let startX = Math.floor(camera.x / hexWidth) * hexWidth - hexWidth;
    let endX = startX + (canvas.width / camera.zoom) + hexWidth * 2;
    let startY = Math.floor(camera.y / (hexHeight * 0.75)) * (hexHeight * 0.75) - hexHeight;
    let endY = startY + (canvas.height / camera.zoom) + hexHeight * 2;

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

// Renderizador de Gusano Orgánico
function drawOrganicBody(ctx, trail, radius, skin) {
    for (let i = trail.length - 1; i >= 0; i--) {
        let p = trail[i];
        let segmentRadius = radius * (0.5 + 0.5 * (i / trail.length));

        ctx.save();
        ctx.translate(p.x, p.y);

        ctx.shadowColor = skin.primaryColor;
        ctx.shadowBlur = 8;

        ctx.fillStyle = skin.secondaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, segmentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = skin.primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, segmentRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.beginPath();
        ctx.arc(-segmentRadius * 0.25, -segmentRadius * 0.25, segmentRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Renderizador de Cabeza Neón
function drawAdvancedHead(ctx, x, y, radius, angle, skin, name, score) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = skin.primaryColor;
    ctx.shadowBlur = 12;

    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(radius * 0.35, -radius * 0.45, 5.5, 0, Math.PI * 2);
    ctx.arc(radius * 0.35, radius * 0.45, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(radius * 0.45, -radius * 0.45, 2.5, 0, Math.PI * 2);
    ctx.arc(radius * 0.45, radius * 0.45, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    let labelText = `$${score.toLocaleString()}`;
    ctx.font = "bold 13px sans-serif";
    let textWidth = ctx.measureText(labelText).width;

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 12, y - radius - 34, textWidth + 24, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.fillText(labelText, x, y - radius - 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(name, x, y - radius - 42);
    ctx.restore();
}

// Bucle Principal
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Movimiento del Jugador
    if (player.alive) {
        let worldMouseX = mouse.x / camera.zoom + camera.x;
        let worldMouseY = mouse.y / camera.zoom + camera.y;

        let cx = worldMouseX - player.x;
        let cy = worldMouseY - player.y;
        let angle = Math.atan2(cy, cx);

        if (Math.hypot(cx, cy) > 3) {
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
        }

        player.x = Math.max(30, Math.min(WORLD_WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, player.y));

        player.trail.push({ x: player.x, y: player.y, angle: angle });
        if (player.trail.length > Math.floor(player.radius * 2.8)) player.trail.shift();

        camera.update(player.x, player.y, player.radius);
    }

    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);

    drawHexMap(ctx);

    // 2. Comida Pequeña (SOLO AUMENTA TAMAÑO, NO SUMA SALDO EN USD)
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        if (player.alive && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            player.radius += 0.03; // Crecimiento físico mínimo
            foodPellets.splice(i, 1);
            spawnPellet();
        }
    }

    // 3. Monedas Doradas (AUMENTAN SALDO REAL EN USD Y TAMAÑO)
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        if (player.alive && Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
            player.score += coin.value; // ¡Aquí sí suma saldo en USD!
            player.radius += 0.25;      // Crecimiento de masa significativo
            goldCoins.splice(i, 1);
        }
    }

    // 4. IA de los Bots
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        if (!bot.alive) continue;

        let targetAngle = bot.angle;
        let closestDist = 9999;
        let targetX = null;
        let targetY = null;

        if (player.alive) {
            let dPlayer = Math.hypot(bot.x - player.x, bot.y - player.y);
            if (dPlayer < 500) {
                closestDist = dPlayer;
                targetX = player.x + (Math.cos(player.trail.length > 0 ? player.trail[player.trail.length-1].angle : 0) * 80);
                targetY = player.y + (Math.sin(player.trail.length > 0 ? player.trail[player.trail.length-1].angle : 0) * 80);
            }
        }

        if (!targetX) {
            for (let coin of goldCoins) {
                let d = Math.hypot(bot.x - coin.x, bot.y - coin.y);
                if (d < 450 && d < closestDist) {
                    closestDist = d;
                    targetX = coin.x;
                    targetY = coin.y;
                }
            }
        }

        if (!targetX) {
            for (let i = 0; i < foodPellets.length; i += 8) {
                let p = foodPellets[i];
                let dFood = Math.hypot(bot.x - p.x, bot.y - p.y);
                if (dFood < 200 && dFood < closestDist) {
                    closestDist = dFood;
                    targetX = p.x;
                    targetY = p.y;
                }
            }
        }

        if (targetX !== null && targetY !== null) {
            targetAngle = Math.atan2(targetY - bot.y, targetX - bot.x);
        } else {
            bot.changeTimer++;
            if (bot.changeTimer > 50) {
                targetAngle += (Math.random() - 0.5) * 1.5;
                bot.changeTimer = 0;
            }
        }

        let dangerDetected = false;
        if (player.alive) {
            for (let seg of player.trail) {
                if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + 30) {
                    targetAngle += Math.PI * 0.6;
                    dangerDetected = true;
                    break;
                }
            }
        }

        bot.angle = targetAngle;
        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        if (bot.x < 50 || bot.x > WORLD_WIDTH - 50) bot.angle = Math.PI - bot.angle;
        if (bot.y < 50 || bot.y > WORLD_HEIGHT - 50) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > Math.floor(bot.radius * 2.8)) bot.trail.shift();

        // Recolección de comida por los Bots (Solo aumenta tamaño)
        for (let i = foodPellets.length - 1; i >= 0; i--) {
            let p = foodPellets[i];
            if (Math.hypot(bot.x - p.x, bot.y - p.y) < bot.radius + p.radius) {
                bot.radius += 0.02;
                foodPellets.splice(i, 1);
                spawnPellet();
            }
        }

        // Recolección de monedas por los Bots (Suma saldo y tamaño)
        for (let i = goldCoins.length - 1; i >= 0; i--) {
            let coin = goldCoins[i];
            if (Math.hypot(bot.x - coin.x, bot.y - coin.y) < bot.radius + coin.radius) {
                bot.score += coin.value;
                bot.radius += 0.15;
                goldCoins.splice(i, 1);
            }
        }

        // Colisiones
        if (player.alive) {
            for (let segment of player.trail) {
                if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + player.radius * 0.6) {
                    createGoldCoins(bot.trail, bot.score);
                    showFloatingMessage(`¡Eliminaste a ${bot.name}! Dejó botín en oro.`, "#10b981");
                    let deadName = bot.name;
                    let deadSkin = bot.skin;
                    bots.splice(bIndex, 1);
                    setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                    break;
                }
            }
        }

        if (player.alive && bot.alive) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.6) {
                    player.alive = false;
                    createGoldCoins(player.trail, player.score);
                    showFloatingMessage("¡Chocaste contra un rival y perdiste!", "#ef4444");
                    setTimeout(() => {
                        player.x = WORLD_WIDTH / 2;
                        player.y = WORLD_HEIGHT / 2;
                        player.radius = 18;
                        player.score = 0;
                        player.trail = [];
                        player.alive = true;
                    }, 1000);
                    break;
                }
            }
        }

        if (bot.alive) {
            drawOrganicBody(ctx, bot.trail, bot.radius, bot.skin);
            drawAdvancedHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score);
        }
    }

    // 5. Dibujar Jugador
    if (player.alive) {
        let lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
        drawOrganicBody(ctx, player.trail, player.radius, player.skin);
        drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
    }

    ctx.restore();

    // Actualizar Barra Cash Out
    let progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    let barFill = document.getElementById('cashBarFill');
    if (barFill) barFill.style.width = progress + '%';

    requestAnimationFrame(gameLoop);
}

gameLoop();
