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

// ==========================================
// CONFIGURACIÓN DE BACKEND Y SUPABASE
// ==========================================
const BACKEND_URL = "https://guerradecoliciones.onrender.com"; 
let currentUserId = localStorage.getItem('supabase_user_id') || "00000000-0000-0000-0000-000000000000";

// Variable global para controlar la partida y costo de entrada ($2.00 USD)
let isGameActive = false;
const ENTRY_FEE = 2.00; 

// Inicializar cliente de Supabase en el navegador si está disponible
let supabaseClient = null;
async function initSupabase() {
    try {
        let res = await fetch(`${BACKEND_URL}/api/config`);
        let config = await res.json();
        if (config.supabase_url && config.supabase_anon_key && window.supabase) {
            supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
        }
    } catch (e) {
        console.error("Error al inicializar cliente Supabase:", e);
    }
}
initSupabase();

// 1. Obtener la Tasa BCV desde la API oficial y mostrarla en la interfaz del juego
async function syncBcvRate() {
    try {
        let response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        let data = await response.json();
        if (data && data.promedio) {
            let rate = data.promedio.toFixed(2);
            let rateElem = document.getElementById('bcvRate');
            if (rateElem) rateElem.innerText = `${rate}`;
            window.currentBcvRate = parseFloat(rate);
        }
    } catch (error) {
        console.error("Error al consultar la tasa BCV:", error);
    }
}
syncBcvRate();

// 2. FUNCIÓN DE VALIDACIÓN Y ACCESO PREVIO AL JUEGO ($2.00 USD) - CONSULTA REAL A SUPABASE
async function tryEnterMatch() {
    if (!currentUserId || currentUserId === "00000000-0000-0000-0000-000000000000") {
        showFloatingMessage("Debes iniciar sesión para jugar.", "#ef4444");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
        return;
    }

    if (!supabaseClient) {
        showFloatingMessage("Conectando con el servidor de base de datos...", "#eab308");
        await initSupabase();
        if (!supabaseClient) {
            showFloatingMessage("Error crítico de conexión con Supabase.", "#ef4444");
            return;
        }
    }

    try {
        showFloatingMessage("Verificando saldo aprobado en tu billetera...", "#eab308");

        // Consultar directamente la tabla user_wallets en Supabase
        const { data: wallet, error } = await supabaseClient
            .from('user_wallets')
            .select('balance_usd')
            .eq('user_id', currentUserId)
            .single();

        if (error || !wallet) {
            showFloatingMessage("No se encontró tu billetera. Reporta tu pago primero.", "#ef4444");
            openModal();
            return;
        }

        let currentBalance = parseFloat(wallet.balance_usd || 0);

        if (currentBalance < ENTRY_FEE) {
            showFloatingMessage(`⚠️ Saldo insuficiente ($${currentBalance.toFixed(2)} USD). Necesitas $2.00 USD aprobados.`, "#ef4444");
            openModal();
            return;
        }

        // Descontar la entrada de $2.00 USD de la billetera en Supabase
        let newBalance = currentBalance - ENTRY_FEE;
        const { error: updateError } = await supabaseClient
            .from('user_wallets')
            .update({ balance_usd: newBalance })
            .eq('user_id', currentUserId);

        if (updateError) {
            showFloatingMessage("Error al procesar el costo de entrada.", "#ef4444");
            return;
        }

        // Actualizar el saldo visual en el HUD superior
        let balElem = document.getElementById('userBalance');
        if (balElem) balElem.innerText = `$${newBalance.toFixed(2)} USD`;

        // ¡Acceso permitido a la arena!
        startArenaGame();

    } catch (err) {
        console.error("Error al verificar entrada:", err);
        showFloatingMessage("Error al validar fondos de entrada.", "#ef4444");
    }
}

// 3. INICIO DE LA ARENA
function startArenaGame() {
    isGameActive = true;
    let gallery = document.getElementById('skinGallery');
    if (gallery) gallery.style.display = 'none';
    
    // Ocultar botón de inicio si existe
    let startBtn = document.getElementById('btnStartMatch');
    if (startBtn) startBtn.style.display = 'none';

    showFloatingMessage("¡Partida iniciada con éxito! ¡A sobrevivir!", "#10b981");
}

// 4. Función para reportar un Pago Móvil enviando los datos al backend app.py
async function submitPayment() {
    const refInput = document.getElementById('refInput');
    const ref = refInput ? refInput.value.trim() : "";
    
    if (!ref) {
        showFloatingMessage("Por favor ingresa el número de referencia.", "#ef4444");
        return;
    }

    let rate = window.currentBcvRate || 36.50;
    let amountUSD = 2.00;
    let amountVES = (amountUSD * rate).toFixed(2);

    let payload = {
        user_id: currentUserId,
        amount_usd: amountUSD,
        bcv_rate: rate,
        amount_ves: amountVES,
        reference_number: ref,
        phone_number: "0412-1234567"
    };

    try {
        showFloatingMessage("Enviando comprobante al servidor...", "#eab308");

        let response = await fetch(`${BACKEND_URL}/api/payment/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let result = await response.json();

        if (response.ok && result.success) {
            showFloatingMessage("¡Pago reportado! Esperando aprobación en Telegram.", "#10b981");
            if (refInput) refInput.value = "";
            closeModal();
        } else {
            showFloatingMessage(result.error || "Error al registrar el pago.", "#ef4444");
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        showFloatingMessage("Error de conexión con el backend.", "#ef4444");
    }
}
// ==========================================

// Catálogo de Skins Temáticas
const skinCatalog = {
    cyber_dragon: { name: "Digital Dragon", primaryColor: "#10b981", secondaryColor: "#065f46" },
    fire_scale: { name: "FireScale Killa", primaryColor: "#ef4444", secondaryColor: "#991b1b" },
    flag_venezuela: { name: "TriColor Runner", primaryColor: "#facc15", secondaryColor: "#1e40af" },
    clockwork_gator: { name: "Clockwork Gator", primaryColor: "#d97706", secondaryColor: "#78350f" }
};

const skinKeys = Object.keys(skinCatalog);

let camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    update(targetX, targetY) {
        this.x = targetX - (canvas.width / 2) / this.zoom;
        this.y = targetY - (canvas.height / 2) / this.zoom;
    }
};

let player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: 18,
    maxSegments: 30,
    speed: 4.2,
    trail: [],
    alive: true,
    score: 0,
    name: "Tú (Jugador)",
    skin: skinCatalog.cyber_dragon,
    cashOutGoal: 100000,
    invincible: false
};

window.selectSkin = function(skinKey) {
    if (skinCatalog[skinKey]) {
        player.skin = skinCatalog[skinKey];
    }
};

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

let foodPellets = [];
for (let i = 0; i < 400; i++) {
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

let goldCoins = [];

// Generación de monedas de $0.01 USD tras colisión (Total $1.00 USD en orbes)
function createGoldCoinsFromCollision(trail) {
    let coinsCount = 100; // 100 monedas de $0.01 USD
    for (let i = 0; i < coinsCount; i++) {
        let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
        goldCoins.push({
            x: randomSegment.x + (Math.random() - 0.5) * 40,
            y: randomSegment.y + (Math.random() - 0.5) * 40,
            radius: 5,
            color: '#eab308',
            value: 0.01 // Valor en dólares por moneda
        });
    }
}

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
        maxSegments: 30,
        speed: 3.2,
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

function openModal() {
    document.getElementById('depositModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('depositModal').style.display = 'none';
}

function attemptCashOut() {
    if (player.score >= player.cashOutGoal) {
        showFloatingMessage(`¡Retirada exitosa! Cobrado $${(player.score * 0.1).toFixed(2)} USD.`, "#eab308");
        player.score = 0;
        player.maxSegments = 30;
    } else {
        showFloatingMessage("Aún no has llenado la barra superior para retirarte.", "#ef4444");
    }
}

function drawHexMap(ctx) {
    const hexRadius = 45;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.0;
    ctx.fillStyle = "#070c16";

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

function drawOrganicBody(ctx, trail, fixedRadius, skin) {
    for (let i = trail.length - 1; i >= 0; i -= 2) {
        let p = trail[i];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = skin.secondaryColor;
        ctx.beginPath(); ctx.arc(0, 0, fixedRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin.primaryColor;
        ctx.beginPath(); ctx.arc(0, 0, fixedRadius * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function drawAdvancedHead(ctx, x, y, radius, angle, skin, name, score) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = skin.primaryColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = skin.primaryColor;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2); ctx.fill();
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
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - 12, y - radius - 34, textWidth + 24, 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.fillText(labelText, x, y - radius - 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(name, x, y - radius - 42);
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.alive && isGameActive) {
        let screenCenterX = canvas.width / 2;
        let screenCenterY = canvas.height / 2;
        let angle = Math.atan2(mouse.y - screenCenterY, mouse.x - screenCenterX);

        player.x += Math.cos(angle) * player.speed;
        player.y += Math.sin(angle) * player.speed;

        player.x = Math.max(30, Math.min(WORLD_WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, player.y));

        player.trail.push({ x: player.x, y: player.y, angle: angle });
        if (player.trail.length > player.maxSegments) player.trail.shift();

        camera.update(player.x, player.y);
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawHexMap(ctx);

    // Comida Pequeña
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

        if (player.alive && isGameActive && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            player.maxSegments += 1;
            foodPellets.splice(i, 1);
            spawnPellet();
        }
    }

    // Monedas / Orbes de $0.01 USD
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();

        if (player.alive && isGameActive && Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
            player.score += coin.value;
            player.maxSegments += 2;
            goldCoins.splice(i, 1);
        }
    }

    // IA DE LOS BOTS
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        if (!bot.alive) continue;

        let targetAngle = bot.angle;
        let closestDist = 9999;
        let targetX = null;
        let targetY = null;

        if (player.alive && isGameActive) {
            let dPlayer = Math.hypot(bot.x - player.x, bot.y - player.y);
            if (dPlayer < 550) {
                closestDist = dPlayer;
                let playerHeading = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
                targetX = player.x + Math.cos(playerHeading) * 120;
                targetY = player.y + Math.sin(playerHeading) * 120;
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

        if (targetX !== null && targetY !== null) {
            targetAngle = Math.atan2(targetY - bot.y, targetX - bot.x);
        } else {
            bot.changeTimer++;
            if (bot.changeTimer > 50) {
                targetAngle += (Math.random() - 0.5) * 1.5;
                bot.changeTimer = 0;
            }
        }

        bot.angle = targetAngle;
        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        if (bot.x < 50 || bot.x > WORLD_WIDTH - 50) bot.angle = Math.PI - bot.angle;
        if (bot.y < 50 || bot.y > WORLD_HEIGHT - 50) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > bot.maxSegments) bot.trail.shift();

        // Colisión del jugador con el bot
        if (player.alive && isGameActive && !player.invincible) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.6) {
                    player.alive = false;
                    isGameActive = false;
                    createGoldCoinsFromCollision(player.trail);
                    showFloatingMessage("¡Colisión! Perdiste tu entrada y soltaste monedas en la arena.", "#ef4444");
                    
                    // Volver a mostrar el botón de inicio para pagar nueva entrada
                    let startBtn = document.getElementById('btnStartMatch');
                    if (startBtn) startBtn.style.display = 'block';

                    setTimeout(() => {
                        player.x = Math.random() * (WORLD_WIDTH - 400) + 200;
                        player.y = Math.random() * (WORLD_HEIGHT - 400) + 200;
                        player.radius = 18;
                        player.maxSegments = 30;
                        player.score = 0;
                        player.trail = [];
                        player.invincible = true;
                        player.alive = true;
                        setTimeout(() => { player.invincible = false; }, 2000);
                    }, 1200);
                    break;
                }
            }
        }

        if (bot.alive) {
            drawOrganicBody(ctx, bot.trail, bot.radius, bot.skin);
            drawAdvancedHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score);
        }
    }

    if (player.alive) {
        let lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
        drawOrganicBody(ctx, player.trail, player.radius, player.skin);
        drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
    }

    ctx.restore();

    let progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    let barFill = document.getElementById('cashBarFill');
    if (barFill) barFill.style.width = progress + '%';

    requestAnimationFrame(gameLoop);
}

gameLoop();
