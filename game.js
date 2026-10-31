const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// [PUNTO 7] CAMBIO 1: MAPA DINÁMICO / EXTENSIBLE (DIMENSIONES EXPANDIBLES)
// ==========================================
let WORLD_WIDTH = 6000;
let WORLD_HEIGHT = 6000;

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// ==========================================
// CONFIGURACIÓN DE BACKEND Y SUPABASE
// ==========================================
const BACKEND_URL = "https://guerradecoliciones.onrender.com"; 
let currentUserId = localStorage.getItem('supabase_user_id') || "00000000-0000-0000-0000-000000000000";

// ==========================================
// [PUNTO 11 Y 12] CAMBIO 10 Y 11: CONFIGURACIÓN DE ADMINISTRADOR Y PANEL DE REGALOS / GHOST MODE
// ==========================================
const ADMIN_USER_ID = "REEMPLAZA_CON_TU_SUPABASE_USER_ID"; // Reemplaza con tu UUID exacto de Supabase
let adminInvisible = false;

function checkAdminAccess() {
    if (currentUserId === ADMIN_USER_ID) {
        showFloatingMessage("👑 ¡Bienvenido Administrador! Panel VIP activado.", "#38bdf8");
        injectAdminPanel();
    }
}
setTimeout(checkAdminAccess, 2000);

function injectAdminPanel() {
    if (document.getElementById('adminPanelContainer')) return;
    let panel = document.createElement('div');
    panel.id = 'adminPanelContainer';
    panel.style.cssText = `
        position: fixed; top: 20px; left: 20px; z-index: 9999;
        background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8;
        padding: 15px; border-radius: 12px; color: #fff; font-family: sans-serif;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 260px;
    `;
    panel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: #38bdf8; text-align: center;">👑 Panel de Administrador</h3>
        <div style="margin-bottom: 10px;">
            <label style="font-size: 0.8rem; color: #94a3b8;">Valor del Regalo ($ USD):</label>
            <input type="number" id="adminGiftValue" value="1.00" step="0.1" style="width: 100%; padding: 6px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px; margin-top: 4px;">
        </div>
        <button onclick="adminDropGift('chest')" style="width: 100%; padding: 8px; margin-bottom: 6px; background: #eab308; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🎁 Soltar Cofre de Regalo</button>
        <button onclick="adminDropGift('star')" style="width: 100%; padding: 8px; margin-bottom: 10px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">⭐ Soltar Estrella Dorada</button>
        <button id="adminInvisBtn" onclick="toggleAdminInvisible()" style="width: 100%; padding: 8px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">👻 Modo Fantasma: OFF</button>
        <button onclick="adminFreeEntry()" style="width: 100%; padding: 8px; margin-top: 8px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🚀 Ingreso VIP Gratuito</button>
    `;
    document.body.appendChild(panel);
}

window.adminFreeEntry = function() {
    closeModal();
    startArenaGame();
    showFloatingMessage("🚀 Ingreso directo a la arena sin costo (Admin VIP).", "#8b5cf6");
};

window.toggleAdminInvisible = function() {
    adminInvisible = !adminInvisible;
    player.invincible = adminInvisible;
    let btn = document.getElementById('adminInvisBtn');
    if (btn) {
        btn.style.background = adminInvisible ? "#ef4444" : "#64748b";
        btn.innerText = adminInvisible ? "👻 Modo Fantasma: ON" : "👻 Modo Fantasma: OFF";
    }
    showFloatingMessage(adminInvisible ? "👻 Modo Fantasma activado: Eres invisible e intangible." : "👻 Modo Fantasma desactivado.", adminInvisible ? "#ef4444" : "#10b981");
};

window.adminDropGift = function(type) {
    if (!isGameActive || !player.alive) {
        showFloatingMessage("⚠️ Debes estar jugando en la arena para soltar regalos.", "#ef4444");
        return;
    }
    let valInput = document.getElementById('adminGiftValue');
    let val = valInput ? parseFloat(valInput.value) || 1.00 : 1.00;

    let color = type === 'chest' ? '#eab308' : '#facc15';
    let radius = type === 'chest' ? 10 : 8;

    goldCoins.push({
        x: player.x + (Math.random() - 0.5) * 40,
        y: player.y + (Math.random() - 0.5) * 40,
        radius: radius,
        color: color,
        value: val
    });

    showFloatingMessage(`🎁 ¡Regalo desplegado por Admin! Valor: $${val.toFixed(2)} USD`, "#10b981");
};

let isGameActive = false;
const ENTRY_FEE = 2.00; 
let verificationInterval = null;
let cashOutCheckInterval = null;

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
                checkAdminAccess(); // Comprobar admin al iniciar sesión
            }
        }
    } catch (e) {
        console.error("Error al inicializar cliente Supabase:", e);
    }
}
initSupabase();

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

// ==========================================
// [PUNTO 8] CAMBIO 2: SPAWN INTELIGENTE, SEGURO Y ESCUDO TEMPORAL
// ==========================================
function startArenaGame() {
    isGameActive = true;
    player.alive = true;
    player.isSpectator = false;
    
    let spawnTarget = bots.length > 0 ? bots[Math.floor(Math.random() * bots.length)] : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    player.x = Math.max(300, Math.min(WORLD_WIDTH - 300, spawnTarget.x + (Math.random() - 0.5) * 600));
    player.y = Math.max(300, Math.min(WORLD_HEIGHT - 300, spawnTarget.y + (Math.random() - 0.5) * 600));
    
    player.score = 0;
    player.maxSegments = INITIAL_SEGMENTS;
    player.trail = [];

    player.invincible = adminInvisible ? true : true;
    if (!adminInvisible) {
        setTimeout(() => {
            player.invincible = false;
            showFloatingMessage("🛡️ Escudo de entrada finalizado. ¡Estás en combate!", "#eab308");
        }, 4000);
    }

    let gallery = document.getElementById('skinGallery');
    if (gallery) gallery.style.display = 'none';
    
    showFloatingMessage(adminInvisible ? "👻 Entraste en Modo Fantasma (Admin)." : "🛡️ Spawn seguro activado. ¡Protección temporal de 4s!", "#10b981");
}

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
// [PUNTO 10] CAMBIO 3: RETIRO DINÁMICO CON CONTADOR FLOTANTE DE 10 SEGUNDOS Y MODO ESPECTADOR
// ==========================================
window.attemptCashOut = function() {
    if (player.score < player.cashOutGoal) {
        showFloatingMessage("Aún no has llenado la barra superior para retirarte.", "#ef4444");
        return;
    }

    if (player.cashOutTimer) return;

    player.alive = false;
    player.isSpectator = true;
    let secondsLeft = 10;

    showFloatingMessage(`⏳ Retiro en proceso. Pasando a Modo Espectador (${secondsLeft}s)...`, "#eab308");

    player.cashOutInterval = setInterval(async () => {
        secondsLeft--;
        if (secondsLeft > 0) {
            showFloatingMessage(`⏳ Procesando cobro en vivo... ${secondsLeft}s`, "#eab308");
        } else {
            clearInterval(player.cashOutInterval);
            player.cashOutInterval = null;

            let amountUSD = (player.score * 0.1).toFixed(2);
            let rate = window.currentBcvRate || 36.50;
            let amountVES = (amountUSD * rate).toFixed(2);

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
                    let gallery = document.getElementById('skinGallery');
                    if (gallery) gallery.style.display = 'block';
                }
            } catch (err) {
                console.error("Error al solicitar retiro:", err);
                showFloatingMessage("Error de conexión al solicitar retiro.", "#ef4444");
                let gallery = document.getElementById('skinGallery');
                if (gallery) gallery.style.display = 'block';
            }
        }
    }, 1000);
};

function startWaitingForCashOutApproval(amountUSD) {
    if (cashOutCheckInterval) clearInterval(cashOutCheckInterval);

    cashOutCheckInterval = setInterval(async () => {
        if (!supabaseClient || !currentUserId) return;

        try {
            const { data: txs } = await supabaseClient
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

                    showFloatingMessage(`¡Retiro de $${amountUSD} USD procesado con éxito! Ref: ${tx.reference_number}`, "#10b981");

                    player.score = 0;
                    player.isSpectator = false;
                    player.maxSegments = INITIAL_SEGMENTS;

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
// [PUNTO 9] CAMBIO 4: BOTÓN SALIR Y ABANDONO VOLUNTARIO (SOLTAR ACUMULADO)
// ==========================================
window.leaveGameVoluntarily = function() {
    if (isGameActive && player.alive) {
        if (player.score > 0) {
            createAccumulatedCoinsFromPlayer(player.trail, player.score);
            showFloatingMessage("💥 Abandonaste la partida. Tu dinero acumulado quedó en la arena.", "#ef4444");
        } else {
            showFloatingMessage("Saliste de la partida.", "#64748b");
        }
        player.alive = false;
        isGameActive = false;
        player.score = 0;
        let gallery = document.getElementById('skinGallery');
        if (gallery) gallery.style.display = 'block';
    }
};

window.addEventListener('beforeunload', () => {
    if (isGameActive && player.alive && player.score > 0) {
        player.score = 0;
    }
});

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
    speed: 7,
    trail: [],
    alive: false,
    isSpectator: false,
    score: 0,
    name: "Tú (Jugador)",
    skin: skinCatalog.cyber_dragon,
    cashOutGoal: 50.0,
    invincible: false,
    cashOutInterval: null
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

// ==========================================
// [PUNTO 2 Y 3] CAMBIO 5: REGLA ECONÓMICA DE ENTRADA ($1.00 USD) Y BOTÍN DIFERENCIADO
// ==========================================
function createGoldCoinsFromPlayerDeath(trail) {
    let prizePool = 1.00;
    let coinsCount = 50;
    let valuePerCoin = prizePool / coinsCount;

    for (let i = 0; i < coinsCount; i++) {
        let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
        goldCoins.push({
            x: randomSegment.x + (Math.random() - 0.5) * 50,
            y: randomSegment.y + (Math.random() - 0.5) * 50,
            radius: 6,
            color: '#eab308',
            value: valuePerCoin 
        });
    }
}

function createAccumulatedCoinsFromPlayer(trail, totalAmount) {
    let coinsCount = Math.max(10, Math.floor(totalAmount * 50));
    let valuePerCoin = totalAmount / coinsCount;
    for (let i = 0; i < coinsCount; i++) {
        let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
        goldCoins.push({
            x: randomSegment.x + (Math.random() - 0.5) * 60,
            y: randomSegment.y + (Math.random() - 0.5) * 60,
            radius: 6,
            color: '#eab308',
            value: valuePerCoin
        });
    }
}

function createCoinsOrPelletsFromBotDeath(trail, botScore) {
    if (botScore > 0) {
        let coinsCount = Math.max(10, Math.floor(botScore * 50));
        let valuePerCoin = botScore / coinsCount;
        for (let i = 0; i < coinsCount; i++) {
            let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: 0, y: 0 };
            goldCoins.push({
                x: randomSegment.x + (Math.random() - 0.5) * 40,
                y: randomSegment.y + (Math.random() - 0.5) * 40,
                radius: 6,
                color: '#eab308',
                value: valuePerCoin
            });
        }
    } else {
        for (let i = 0; i < 15; i++) {
            let randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: 0, y: 0 };
            foodPellets.push({
                x: randomSegment.x + (Math.random() - 0.5) * 40,
                y: randomSegment.y + (Math.random() - 0.5) * 40,
                radius: 4.5,
                color: Math.random() > 0.5 ? '#ef4444' : '#10b981'
            });
        }
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

// ==========================================
// [PUNTO 6] CAMBIO 6: REAPARICIÓN DISCRETA E IMPERCEPTIBLE DE BOTS
// ==========================================
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
        speed: 5,
        angle: sAngle,
        changeTimer: 0,
        trail: [],
        score: 0,
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
    let labelText = `$${score.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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
    } else if (player.isSpectator) {
        let leaderBot = bots.length > 0 ? bots[0] : null;
        if (leaderBot) camera.update(leaderBot.x, leaderBot.y);
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawHexMap(ctx);

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

    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();

        let coinEaten = false;

        if (player.alive && isGameActive && Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
            player.score += coin.value;
            if (player.maxSegments < MAX_SEGMENTS_LIMIT) {
                player.maxSegments += Math.min(2, MAX_SEGMENTS_LIMIT - player.maxSegments);
            }
            goldCoins.splice(i, 1);
            continue;
        }

        for (let bot of bots) {
            if (bot.alive && Math.hypot(bot.x - coin.x, bot.y - coin.y) < bot.radius + coin.radius) {
                bot.score += coin.value;
                if (bot.maxSegments < MAX_SEGMENTS_LIMIT) {
                    bot.maxSegments += 1;
                }
                goldCoins.splice(i, 1);
                coinEaten = true;
                break;
            }
        }
        if (coinEaten) continue;
    }

    // ==========================================
    // [PUNTO 1, 4 Y 5] CAMBIO 7, 8 Y 9: AUTONOMÍA INDIVIDUAL, COMBATE CRUZADO Y EVALUACIÓN DE RIESGO
    // ==========================================
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        if (!bot.alive) continue;

        let closestDist = 9999;
        let targetX = null;
        let targetY = null;

        // [PUNTO 1 & 12] Prioridad 1: Cazar al jugador si está cerca (y el admin NO está en modo fantasma/invisible)
        if (player.alive && isGameActive && !adminInvisible) {
            let dPlayer = Math.hypot(bot.x - player.x, bot.y - player.y);
            if (dPlayer < 550) {
                closestDist = dPlayer;
                let playerHeading = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
                targetX = player.x + Math.cos(playerHeading) * 120;
                targetY = player.y + Math.sin(playerHeading) * 120;
            }
        }

        // [PUNTO 4] Prioridad 2: Combate cruzado entre bots con superviviencia calculada
        if (!targetX) {
            for (let otherBot of bots) {
                if (otherBot !== bot && otherBot.alive) {
                    let dBot = Math.hypot(bot.x - otherBot.x, bot.y - otherBot.y);
                    if (dBot < 350 && dBot < closestDist) {
                        if (otherBot.maxSegments > bot.maxSegments * 1.3) {
                            let escapeAngle = Math.atan2(bot.y - otherBot.y, bot.x - otherBot.x);
                            bot.angle = escapeAngle;
                        } else {
                            closestDist = dBot;
                            targetX = otherBot.x;
                            targetY = otherBot.y;
                        }
                    }
                }
            }
        }

        // [PUNTO 5] Prioridad 3: Buscar oro con evaluación de riesgo (evita pozos acorralados por el jugador)
        if (!targetX) {
            for (let coin of goldCoins) {
                let d = Math.hypot(bot.x - coin.x, bot.y - coin.y);
                if (d < 450 && d < closestDist) {
                    let isSafeToGrab = true;
                    if (player.alive && isGameActive && !adminInvisible) {
                        let distPlayerToCoin = Math.hypot(player.x - coin.x, player.y - coin.y);
                        if (distPlayerToCoin < 300) {
                            isSafeToGrab = false;
                        }
                    }

                    if (isSafeToGrab) {
                        closestDist = d;
                        targetX = coin.x;
                        targetY = coin.y;
                    }
                }
            }
        }

        if (targetX !== null && targetY !== null) {
            let desiredAngle = Math.atan2(targetY - bot.y, targetX - bot.x);
            let angleDiff = Math.atan2(Math.sin(desiredAngle - bot.angle), Math.cos(desiredAngle - bot.angle));
            bot.angle += angleDiff * 0.1;
        } else {
            bot.changeTimer++;
            if (bot.changeTimer > 40) {
                bot.angle += (Math.random() - 0.5) * 1.2;
                bot.changeTimer = 0;
            }
        }

        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        if (bot.x < 80 || bot.x > WORLD_WIDTH - 80) bot.angle = Math.PI - bot.angle;
        if (bot.y < 80 || bot.y > WORLD_HEIGHT - 80) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > bot.maxSegments) bot.trail.shift();

        // Colisión del Jugador contra Bot (Ignorada si adminInvisible está activo)
        if (player.alive && isGameActive && !player.invincible && !adminInvisible) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.6) {
                    player.alive = false;
                    isGameActive = false;
                    
                    bot.score += 1.00;
                    bot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, bot.maxSegments + 50);

                    createGoldCoinsFromPlayerDeath(player.trail);
                    showFloatingMessage(`💥 ¡Colisión con ${bot.name}! Perdiste tu entrada y soltaste el pozo en la arena.`, "#ef4444");
                    
                    let gallery = document.getElementById('skinGallery');
                    if (gallery) gallery.style.display = 'block';
                    break;
                }
            }
        }

        // Colisión del Bot contra Jugador
        if (player.alive && isGameActive && !adminInvisible) {
            for (let segment of player.trail) {
                if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + player.radius * 0.6) {
                    createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                    showFloatingMessage(`¡${bot.name} chocó contra ti y fue eliminado!`, "#10b981");
                    
                    let deadName = bot.name;
                    let deadSkin = bot.skin;
                    bots.splice(bIndex, 1);
                    setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                    break;
                }
            }
        }

        // Combate de Bots entre sí
        for (let otherBot of bots) {
            if (otherBot !== bot && otherBot.alive) {
                for (let segment of otherBot.trail) {
                    if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + otherBot.radius * 0.6) {
                        bot.alive = false;
                        
                        if (bot.score > 0) {
                            otherBot.score += bot.score;
                        }
                        otherBot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, otherBot.maxSegments + 20);

                        createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                        
                        let deadName = bot.name;
                        let deadSkin = bot.skin;
                        bots.splice(bIndex, 1);
                        setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                        break;
                    }
                }
            }
            if (!bot.alive) break;
        }

        if (bot.alive) {
            drawOrganicBody(ctx, bot.trail, bot.radius, bot.skin);
            drawAdvancedHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score);
        }
    }

    // ==========================================
    // [PUNTO 12] CAMBIO 12: RENDERIZADO VISIBLE O FANTASMA DEL JUGADOR ADMIN
    // ==========================================
    if (player.alive && isGameActive) {
        let lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
        if (!adminInvisible) {
            drawOrganicBody(ctx, player.trail, player.radius, player.skin);
            drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
        } else {
            ctx.save();
            ctx.globalAlpha = 0.35; // Translúcido para el admin en modo fantasma
            drawOrganicBody(ctx, player.trail, player.radius, player.skin);
            drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name + " (👻 FANTASMA)", player.score);
            ctx.restore();
        }
    }

    ctx.restore();

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
