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

let isGameActive = false;
const ENTRY_FEE = 2.00; 
let verificationInterval = null;
let cashOutCheckInterval = null;

// Límite de crecimiento: 20 veces el tamaño inicial de 30 = 600 segmentos
const INITIAL_SEGMENTS = 30;
const MAX_SEGMENTS_LIMIT = INITIAL_SEGMENTS * 20; 

let supabaseClient = null;
async function initSupabase() {
    try {
        let res = await fetch(`${BACKEND_URL}/api/config`);
        let config = await res.json();
        if (config.supabase_url && config.supabase_anon_key && window.supabase) {
            supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
            
            const { data: sessionData } = await supabaseClient.auth.getSession();
            if (sessionData && sessionData.session && sessionData.session.user) {
                currentUserId = sessionData.session.user.id;
                localStorage.setItem('supabase_user_id', currentUserId);
            }
        }
    } catch (e) {
        console.error("Error al inicializar cliente Supabase:", e);
    }
}
initSupabase();

// 1. Obtener la Tasa BCV desde la API oficial
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

// Sincronizar saldo de la billetera al cargar la página
async function syncUserWallet() {
    if (!currentUserId || currentUserId === "00000000-0000-0000-0000-000000000000") return;
    try {
        if (!supabaseClient) await initSupabase();
        if (!supabaseClient) return;

        const { data: wallet } = await supabaseClient
            .from('user_wallets')
            .select('balance_usd')
            .eq('user_id', currentUserId)
            .single();

        if (wallet) {
            let balElem = document.getElementById('userBalance');
            if (balElem) balElem.innerText = `$${parseFloat(wallet.balance_usd).toFixed(2)} USD`;
        }
    } catch (e) {
        console.error("Error sincronizando billetera:", e);
    }
}
setTimeout(syncUserWallet, 1500);

// 2. FUNCIÓN DE ESPERA ACTIVA (POLLING) - DETECTA LA APROBACIÓN EN TELEGRAM Y ENTRA AUTOMÁTICO
function startWaitingForApproval() {
    showFloatingMessage("⏳ Pago reportado. Esperando aprobación en Telegram...", "#eab308");
    
    let modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = "Verificando Pago ($2.00)";

    let modalBody = document.getElementById('modalBodyContent');
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">⏳</div>
                <p style="color: #eab308; font-weight: bold; font-size: 1.1rem;">Comprobante enviado al Administrador.</p>
                <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 8px;">En cuanto apruebes el pago en Telegram, entrarás al juego <strong>automáticamente</strong> sin presionar nada...</p>
            </div>
        `;
    }

    if (verificationInterval) clearInterval(verificationInterval);

    verificationInterval = setInterval(async () => {
        if (!supabaseClient || !currentUserId) return;

        try {
            const { data: wallet } = await supabaseClient
                .from('user_wallets')
                .select('balance_usd')
                .eq('user_id', currentUserId)
                .single();

            if (wallet && parseFloat(wallet.balance_usd) >= ENTRY_FEE) {
                clearInterval(verificationInterval);
                verificationInterval = null;

                showFloatingMessage("¡Pago aprobado! Entrando a la arena...", "#10b981");
                closeModal();

                let newBalance = parseFloat(wallet.balance_usd) - ENTRY_FEE;
                await supabaseClient
                    .from('user_wallets')
                    .update({ balance_usd: newBalance })
                    .eq('user_id', currentUserId);

                let balElem = document.getElementById('userBalance');
                if (balElem) balElem.innerText = `$${newBalance.toFixed(2)} USD`;

                startArenaGame();
            }
        } catch (e) {
            console.error("Error en la verificación automática:", e);
        }
    }, 3000);
}

// 3. INICIO DE LA ARENA
function startArenaGame() {
    isGameActive = true;
    player.alive = true;
    player.x = Math.random() * (WORLD_WIDTH - 400) + 200;
    player.y = Math.random() * (WORLD_HEIGHT - 400) + 200;
    player.score = 0;
    player.maxSegments = INITIAL_SEGMENTS;
    player.trail = [];

    let gallery = document.getElementById('skinGallery');
    if (gallery) gallery.style.display = 'none';
    
    showFloatingMessage("¡Partida iniciada con éxito! ¡A sobrevivir!", "#10b981");
}

// 4. Reportar Pago Móvil y activar la espera automática
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let result = await response.json();

        if (response.ok && result.success) {
            showFloatingMessage("¡Pago reportado con éxito!", "#10b981");
            if (refInput) refInput.value = "";
            startWaitingForApproval();
        } else {
            showFloatingMessage(result.error || "Error al registrar el pago.", "#ef4444");
        }
    } catch (error) {
        console.error("Error al conectar con el backend:", error);
        showFloatingMessage("Error de conexión con el backend.", "#ef4444");
    }
}

// ==========================================
// 5. SOLICITUD DE RETIRO (CASH OUT) GLOBAL
// ==========================================
window.attemptCashOut = async function() {
    if (player.score < player.cashOutGoal) {
        showFloatingMessage("Aún no has llenado la barra superior para retirarte.", "#ef4444");
        return;
    }

    // Detener la partida de inmediato
    isGameActive = false;
    player.alive = false;

    let amountUSD = (player.score * 0.1).toFixed(2);
    let rate = window.currentBcvRate || 36.50;
    let amountVES = (amountUSD * rate).toFixed(2);

    let modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = "Procesando Retiro ($" + amountUSD + ")";

    let modalBody = document.getElementById('modalBodyContent');
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 25px;">
                <div style="font-size: 2.8rem; margin-bottom: 15px;">⏳</div>
                <p style="color: #eab308; font-weight: bold; font-size: 1.2rem;">Cargando Retiro...</p>
                <p style="font-size: 0.95rem; color: #94a3b8; margin-top: 10px;">Monto: <strong>$${amountUSD} USD</strong> (Bs. ${amountVES})</p>
                <p style="font-size: 0.85rem; color: #64748b; margin-top: 8px;">Esperando que respondas con la referencia en Telegram...</p>
            </div>
        `;
    }
    document.getElementById('depositModal').style.display = 'flex';

    try {
        let response = await fetch(`${BACKEND_URL}/api/cashout/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUserId,
                amount_usd: amountUSD,
                amount_ves: amountVES,
                bcv_rate: rate
            })
        });

        let result = await response.json();
        if (response.ok && result.success) {
            startWaitingForCashOutApproval(amountUSD);
        } else {
            showFloatingMessage(result.error || "Error al solicitar retiro.", "#ef4444");
            closeModal();
            isGameActive = true;
            player.alive = true;
        }
    } catch (err) {
        console.error("Error al solicitar retiro:", err);
        showFloatingMessage("Error de conexión al solicitar retiro.", "#ef4444");
        closeModal();
        isGameActive = true;
        player.alive = true;
    }
}

// Sondeo para detectar el pago y mostrar la notificación flotante de éxito
function startWaitingForCashOutApproval(amountUSD) {
    if (cashOutCheckInterval) clearInterval(cashOutCheckInterval);

    cashOutCheckInterval = setInterval(async () => {
        if (!supabaseClient || !currentUserId) return;

        try {
            const { data: txs, error } = await supabaseClient
                .from('payment_transactions')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (txs && txs.length > 0) {
                let tx = txs[0];
                if (tx.status === 'paid') {
                    clearInterval(cashOutCheckInterval);
                    cashOutCheckInterval = null;

                    // 1. Cerrar el modal de carga
                    closeModal();

                    // 2. Mostrar la notificación flotante de éxito al usuario
                    showFloatingMessage(`¡Retiro de $${amountUSD} USD pagado con éxito a tu cuenta! 🚀`, "#10b981");

                    // 3. Reiniciar puntaje y segmentos del jugador
                    player.score = 0;
                    player.maxSegments = INITIAL_SEGMENTS;

                    // 4. Mostrar de nuevo la galería de skins / menú principal
                    let gallery = document.getElementById('skinGallery');
                    if (gallery) gallery.style.display = 'block';
                }
            }
        } catch (e) {
            console.error("Error en sondeo de retiro:", e);
        }
    }, 4000);
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
    maxSegments: INITIAL_SEGMENTS,
    speed: 4.2,
    trail: [],
    alive: false,
    score: 0,
    name: "Tú (Jugador)",
    skin: skinCatalog.cyber_dragon,
    cashOutGoal: 50.0, // Meta realista para la barra
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

function createGoldCoinsFromCollision(trail) {
    let coinsCount = 100;
    for (let i = 0; i < coinsCount; i++) {
        let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
        goldCoins.push({
            x: randomSegment.x + (Math.random() - 0.5) * 40,
            y: randomSegment.y + (Math.random() - 0.5) * 40,
            radius: 5,
            color: '#eab308',
            value: 0.01 
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
        maxSegments: INITIAL_SEGMENTS,
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
    let modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = "Recargar Entrada ($2.00)";

    let modalBody = document.getElementById('modalBodyContent');
    if (modalBody) {
        modalBody.innerHTML = `
            <p>Costo de entrada a la partida: <strong>$2.00 USD</strong></p>
            <div class="payment-info" style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 0.85rem; color: #94a3b8;">
                • Banco: Banesco (0134)<br>
                • Teléfono: 0412-1234567<br>
                • C.I.: V-12.345.678
            </div>
            <div style="margin-top: 15px;">
                <label style="font-size: 0.85rem; color: #94a3b8;">Número de Referencia:</label>
                <input type="text" id="refInput" class="form-control" placeholder="Ej: 123456" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px; margin-top: 5px;">
            </div>
            <button class="btn-action" style="width: 100%; padding: 12px; margin-top: 15px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;" onclick="submitPayment()">Enviar Comprobante</button>
        `;
    }
    document.getElementById('depositModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('depositModal').style.display = 'none';
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

    // Comida Pequeña (Con límite de 600 segmentos)
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

        if (player.alive && isGameActive && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            if (player.maxSegments < MAX_SEGMENTS_LIMIT) {
                player.maxSegments += 1;
            }
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
            if (player.maxSegments < MAX_SEGMENTS_LIMIT) {
                player.maxSegments += Math.min(2, MAX_SEGMENTS_LIMIT - player.maxSegments);
            }
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

        // 1. COLISIÓN DEL JUGADOR CONTRA EL BOT (EL JUGADOR MUERE)
        if (player.alive && isGameActive && !player.invincible) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.6) {
                    player.alive = false;
                    isGameActive = false;
                    createGoldCoinsFromCollision(player.trail);
                    showFloatingMessage("💥 ¡Colisión! Perdiste tu entrada y soltaste monedas en la arena.", "#ef4444");
                    
                    let gallery = document.getElementById('skinGallery');
                    if (gallery) gallery.style.display = 'block';
                    break;
                }
            }
        }

        // 2. COLISIÓN DEL BOT CONTRA LA ESTELA DEL JUGADOR (EL BOT MUERE)
        if (player.alive && isGameActive) {
            for (let segment of player.trail) {
                if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + player.radius * 0.6) {
                    createGoldCoinsFromCollision(bot.trail);
                    showFloatingMessage(`¡${bot.name} chocó contra ti y fue eliminado!`, "#10b981");
                    
                    let deadName = bot.name;
                    let deadSkin = bot.skin;
                    bots.splice(bIndex, 1);
                    setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                    break;
                }
            }
        }

        if (bot.alive) {
            drawOrganicBody(ctx, bot.trail, bot.radius, bot.skin);
            drawAdvancedHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score);
        }
    }

    if (player.alive && isGameActive) {
        let lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
        drawOrganicBody(ctx, player.trail, player.radius, player.skin);
        drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
    }

    ctx.restore();

    // Control de la barra y el botón de Cash Out
    let progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    let barFill = document.getElementById('cashBarFill');
    if (barFill) barFill.style.width = progress + '%';

    let cashOutBtn = document.getElementById('cashOutBtn');
    if (cashOutBtn) {
        if (player.score >= player.cashOutGoal) {
            cashOutBtn.disabled = false;
            cashOutBtn.style.opacity = '1';
            cashOutBtn.style.cursor = 'pointer';
            cashOutBtn.style.background = '#eab308';
            cashOutBtn.style.color = '#000';
        } else {
            cashOutBtn.disabled = true;
            cashOutBtn.style.opacity = '0.5';
            cashOutBtn.style.cursor = 'not-allowed';
            cashOutBtn.style.background = '#64748b';
            cashOutBtn.style.color = '#fff';
        }
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
