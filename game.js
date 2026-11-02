const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (!canvas || !ctx) {
console.warn('game.js cargado sin canvas válido; se omite la inicialización del juego.');
} else {
function resizeCanvas() {
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;
const BACKEND_URL = 'https://guerradecoliciones.onrender.com';
const ENTRY_FEE = 2.0;
const INITIAL_SEGMENTS = 30;
const MAX_SEGMENTS_LIMIT = INITIAL_SEGMENTS * 20;

let frameCount = 0; 

class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.map = new Map();
    }
    clear() {
        this.map.clear();
    }
    insert(x, y, entity) {
        const key = `${Math.floor(x / this.cellSize)}_${Math.floor(y / this.cellSize)}`;
        if (!this.map.has(key)) {
            this.map.set(key, []);
        }
        this.map.get(key).push(entity);
    }
    getNearby(x, y) {
        const results = [];
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cx + dx}_${cy + dy}`;
                if (this.map.has(key)) {
                    results.push(...this.map.get(key));
                }
            }
        }
        return results;
    }
}

const entityGrid = new SpatialGrid(500);
const pelletGrid = new SpatialGrid(400);

const defaultUserId = '00000000-0000-0000-0000-000000000000';
let currentUserId = localStorage.getItem('supabase_user_id') || defaultUserId;
let backendAdminId = '';
let supabaseClient = null;
let isGameActive = false;
let verificationInterval = null;
let cashOutCheckInterval = null;
let isAdminUser = false;
let adminInvisible = false;
let adminFreeCam = false;
let adminCamX = WORLD_WIDTH / 2;
let adminCamY = WORLD_HEIGHT / 2;
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let adminPanelCollapsed = false;

window.currentBcvRate = 36.5;

let playerPowerState = {
    speedBoostTimer: 0,
    invisibilityTimer: 0,
    hasDestructionPower: false,
    powerTimer: 0,
    magnetTimer: 0,
    growthPointsEaten: 0
};

const beastSpecies = {
    royal_serpent: { name: 'Royal Serpent', primaryColor: '#facc15', secondaryColor: '#f59e0b', accent: '#fff7d6', eyeColor: '#ff4d5a', glow: '#fbbf24', species: 'snake' },
    sun_dragon: { name: 'Sun Dragon', primaryColor: '#ffd166', secondaryColor: '#f97316', accent: '#fff7d6', eyeColor: '#ff4d5a', glow: '#fbbf24', species: 'dragon' },
    emerald_frog: { name: 'Emerald Frog', primaryColor: '#34d399', secondaryColor: '#059669', accent: '#d9f99d', eyeColor: '#ff7b54', glow: '#6ee7b7', species: 'frog' },
    jungle_anaconda: { name: 'Jungle Anaconda', primaryColor: '#c084fc', secondaryColor: '#7c3aed', accent: '#ddd6fe', eyeColor: '#ff5d8f', glow: '#d8b4fe', species: 'anaconda' },
    imperial_drake: { name: 'Imperial Drake', primaryColor: '#dbeafe', secondaryColor: '#64748b', accent: '#f8fafc', eyeColor: '#ff5d8f', glow: '#bfdbfe', species: 'imperial_dragon' },
    swamp_gator: { name: 'Swamp Gator', primaryColor: '#f59e0b', secondaryColor: '#7c2d12', accent: '#fef3c7', eyeColor: '#ff5d8f', glow: '#fbbf24', species: 'gator' }
};

function normalizeBeastSkin(skin) {
    const base = skin && typeof skin === 'object' && skin.species ? skin : beastSpecies.sun_dragon;
    return {
        name: base.name || 'Creature',
        primaryColor: base.primaryColor || '#ffd166',
        secondaryColor: base.secondaryColor || '#f97316',
        accent: base.accent || '#fff7d6',
        eyeColor: base.eyeColor || '#ff4d5a',
        glow: base.glow || '#fbbf24',
        species: base.species || 'dragon'
    };
}

function drawBeastBand(ctx, radius, accent) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
        const x = i * (radius * 0.35);
        ctx.beginPath();
        ctx.moveTo(x, -radius * 0.95);
        ctx.quadraticCurveTo(x + 8, 0, x, radius * 0.95);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBeastBody(ctx, trail, fixedRadius, skin, hasMagnet = false) {
    const s = normalizeBeastSkin(skin);
    const species = s.species;
    for (let idx = trail.length - 1; idx >= 0; idx -= 2) {
        const p = trail[idx];
        if (!p) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = hasMagnet ? '#ec4899' : s.glow;
        ctx.shadowBlur = hasMagnet ? 22 : 10;
        ctx.fillStyle = s.secondaryColor;
        ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.3, fixedRadius * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = s.primaryColor;
        ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 0.9, fixedRadius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function drawBeastHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
    const s = normalizeBeastSkin(skin);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.shadowColor = hasMagnet ? '#ec4899' : s.glow;
    ctx.shadowBlur = hasMagnet ? 26 : 14;
    ctx.fillStyle = s.primaryColor;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(radius * 0.35, -radius * 0.25, 4.5, 0, Math.PI * 2);
    ctx.arc(radius * 0.35, radius * 0.25, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const labelText = `$${score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    ctx.font = 'bold 13px sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = hasMagnet ? '#ec4899' : '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - textWidth / 2 - 12, y - radius - 34, textWidth + 24, 24, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hasMagnet ? '#ec4899' : '#10b981';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, y - radius - 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(hasMagnet ? `${name} (🧲)` : name, x, y - radius - 42);
    ctx.restore();
}

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: 18,
    maxSegments: INITIAL_SEGMENTS,
    speed: 7,
    trail: [],
    alive: false,
    isSpectator: false,
    score: 0,
    name: 'Tú (Jugador)',
    skin: beastSpecies.sun_dragon,
    cashOutGoal: 50.0,
    invincible: false,
    cashOutInterval: null
};

let foodPellets = [];
let goldCoins = [];
let specialBoxes = [];
let bots = [];
const botNamesList = ['ViperKilla', 'ShadowHunter', 'AlphaOmega', 'NeonVenom', 'ToxicSerpent', 'ApexPredator', 'CyberCobra', 'GoldenScale'];

const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    update(targetX, targetY) {
        this.x = targetX - (canvas.width / 2) / this.zoom;
        this.y = targetY - (canvas.height / 2) / this.zoom;
    }
};

function showFloatingMessage(text, color = '#10b981') {
    const notif = document.getElementById('floatingNotification');
    if (!notif) return;
    notif.innerText = text;
    notif.style.background = color;
    notif.style.opacity = '1';
    clearTimeout(window.notifTimer);
    window.notifTimer = setTimeout(() => { notif.style.opacity = '0'; }, 3000);
}

window.toggleAdminPanelCollapse = function() {
    const body = document.getElementById('adminPanelBody');
    const icon = document.getElementById('adminToggleIcon');
    if (!body || !icon) return;
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? 'block' : 'none';
    icon.innerText = collapsed ? '[-]' : '[+]';
};

function injectAdminPanel() {
    if (document.getElementById('adminPanelContainer')) return;
    const panel = document.createElement('div');
    panel.id = 'adminPanelContainer';
    panel.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 9999; background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8; padding: 12px; border-radius: 12px; color: #fff; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 260px;';
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleAdminPanelCollapse()">
            <h3 style="margin: 0; font-size: 0.95rem; color: #38bdf8;">👑 Admin Panel</h3>
            <span id="adminToggleIcon" style="font-size: 1rem; color: #38bdf8; font-weight: bold;">[-]</span>
        </div>
        <div id="adminPanelBody" style="margin-top: 10px; display: block;">
            <button onclick="adminDropGift('chest')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #eab308; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🎁 Cofre</button>
            <button onclick="adminDropGift('star')" style="width: 100%; padding: 6px; margin-bottom: 6px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">⭐ Estrella</button>
            
            <div style="font-size: 0.75rem; color: #38bdf8; margin: 4px 0; font-weight: bold;">Cajas Especiales:</div>
            <button onclick="adminDropSpecialBox('speed')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #0ea5e9; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">⚡ Caja Rapidez</button>
            <button onclick="adminDropSpecialBox('invisibility')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">👻 Caja Modo Fantasma</button>
            <button onclick="adminDropSpecialBox('power')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">💥 Caja Poder Destructor</button>
            <button onclick="adminDropSpecialBox('magnet')" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #ec4899; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🧲 Caja Imán</button>

            <div style="font-size: 0.75rem; color: #38bdf8; margin: 4px 0; font-weight: bold;">Gestión de Bots:</div>
            <div style="display: flex; gap: 5px; margin-bottom: 6px;">
                <button onclick="adminAddBot()" style="flex: 1; padding: 6px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➕ Sumar</button>
                <button onclick="adminRemoveBot()" style="flex: 1; padding: 6px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➖ Quitar</button>
            </div>
            <button id="adminInvisBtn" onclick="toggleAdminInvisible()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">👻 Modo Fantasma ADMIN: OFF</button>
            <button onclick="startArenaGame()" style="width: 100%; padding: 6px; background: #06b6d4; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">⚡ Spawn instantáneo</button>
        </div>
    `;
    document.body.appendChild(panel);
}

window.toggleAdminInvisible = function() {
    if (!isAdminUser) return;
    adminInvisible = !adminInvisible;
    player.invincible = adminInvisible;
    const btn = document.getElementById('adminInvisBtn');
    if (btn) {
        btn.style.background = adminInvisible ? '#ef4444' : '#64748b';
        btn.innerText = adminInvisible ? '👻 Modo Fantasma ADMIN: ON' : '👻 Modo Fantasma ADMIN: OFF';
    }
    showFloatingMessage(adminInvisible ? '👻 Modo Fantasma ADMIN activo.' : '👻 Modo Fantasma desactivado.', adminInvisible ? '#ef4444' : '#10b981');
};

window.adminAddBot = function() {
    if (!isAdminUser) return;
    const keys = Object.keys(beastSpecies);
    const randomSkin = beastSpecies[keys[Math.floor(Math.random() * keys.length)]];
    spawnBorderBot('Bot_' + Math.floor(Math.random() * 99), randomSkin);
    showFloatingMessage('➕ Bot añadido.', '#3b82f6');
};

window.adminRemoveBot = function() {
    if (isAdminUser && bots.length > 0) bots.pop();
};

window.adminDropGift = function(type) {
    if (!isAdminUser) return;
    goldCoins.push({ x: mouse.x + camera.x, y: mouse.y + camera.y, radius: 10, color: type === 'chest' ? '#eab308' : '#facc15', value: 1.00 });
    showFloatingMessage('🎁 Regalo desplegado.', '#10b981');
};

window.adminDropSpecialBox = function(boxType) {
    if (!isAdminUser) return;
    specialBoxes.push({ x: mouse.x + camera.x, y: mouse.y + camera.y, radius: 14, type: boxType, color: '#0ea5e9', name: boxType });
    showFloatingMessage(`🎁 Caja (${boxType}) desplegada.`, '#38bdf8');
};

async function initSupabase() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/config`);
        const config = await response.json();
        if (config.admin_user_id) backendAdminId = config.admin_user_id;

        if (config.supabase_url && config.supabase_anon_key && window.supabase) {
            supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
            const { data: sessionData } = await supabaseClient.auth.getSession();
            if (sessionData?.session?.user) {
                currentUserId = sessionData.session.user.id;
                localStorage.setItem('supabase_user_id', currentUserId);
            }
            if (backendAdminId && currentUserId === backendAdminId) {
                isAdminUser = true;
                injectAdminPanel();
                showFloatingMessage('👑 ¡Bienvenido Administrador!', '#38bdf8');
            }
        }
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
    }
}

function spawnPellet() {
    foodPellets.push({ x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT, radius: 4.5, color: Math.random() > 0.5 ? '#ef4444' : '#10b981' });
}

function createGoldCoinsFromPlayerDeath(trail, score) {
    for (let i = 0; i < 15; i++) {
        goldCoins.push({ x: player.x + (Math.random() - 0.5) * 50, y: player.y + (Math.random() - 0.5) * 50, radius: 6, color: '#eab308', value: Math.max(0.1, score / 15) });
    }
}

function createCoinsOrPelletsFromBotDeath(trail, botScore) {
    for (let i = 0; i < 10; i++) {
        const seg = trail[Math.floor(Math.random() * trail.length)] || { x: WORLD_WIDTH/2, y: WORLD_HEIGHT/2 };
        goldCoins.push({ x: seg.x + (Math.random() - 0.5) * 40, y: seg.y + (Math.random() - 0.5) * 40, radius: 6, color: '#eab308', value: Math.max(0.1, botScore / 10) });
    }
}

function spawnBorderBot(name, skin) {
    bots.push({
        name, skin, x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT,
        radius: 18, maxSegments: INITIAL_SEGMENTS, speed: 5.5, baseSpeed: 5.5,
        angle: 0, trail: [], score: 0, alive: true,
        magnetTimer: 0, speedBoostTimer: 0, invisibilityTimer: 0, hasDestructionPower: false, powerTimer: 0
    });
}

for (let i = 0; i < 15; i++) {
    const keys = Object.keys(beastSpecies);
    spawnBorderBot(botNamesList[i % botNamesList.length] + '_' + i, beastSpecies[keys[i % keys.length]]);
}
for (let i = 0; i < 300; i++) spawnPellet();

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

window.addEventListener('mousedown', (event) => {
    if (!player.alive || !isGameActive) return;
    if (playerPowerState.hasDestructionPower && playerPowerState.powerTimer > 0) {
        const clickAngle = Math.atan2(event.clientY - canvas.height / 2, event.clientX - canvas.width / 2);
        for (let i = bots.length - 1; i >= 0; i--) {
            const b = bots[i];
            if (Math.hypot(b.x - player.x, b.y - player.y) < 500) {
                createCoinsOrPelletsFromBotDeath(b.trail, b.score);
                bots.splice(i, 1);
                setTimeout(() => spawnBorderBot('Bot_' + Math.floor(Math.random()*99), beastSpecies.sun_dragon), 4000);
            }
        }
        playerPowerState.hasDestructionPower = false;
        playerPowerState.powerTimer = 0;
        showFloatingMessage('💥 ¡Poder Destructor lanzado!', '#ef4444');
    }
});

function drawHexMap(ctx) {
    const hexRadius = 45;
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.fillStyle = '#070c16';

    for (let y = 0; y < WORLD_HEIGHT; y += hexHeight * 0.75) {
        for (let x = 0; x < WORLD_WIDTH; x += hexWidth) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                ctx.lineTo(x + hexRadius * Math.cos(angle), y + hexRadius * Math.sin(angle));
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    }
}

function applyMagnetEffect(entity, isPlayer = false) {
    const magnetRadius = 240;
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        if (Math.hypot(entity.x - foodPellets[i].x, entity.y - foodPellets[i].y) < magnetRadius) {
            foodPellets.splice(i, 1);
            spawnPellet();
            if (entity.maxSegments < MAX_SEGMENTS_LIMIT) entity.maxSegments++;
        }
    }
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        if (Math.hypot(entity.x - goldCoins[i].x, entity.y - goldCoins[i].y) < magnetRadius) {
            entity.score += goldCoins[i].value;
            goldCoins.splice(i, 1);
        }
    }
}

function executeBotDestructionPower(bot) {
    for (let i = bots.length - 1; i >= 0; i--) {
        const other = bots[i];
        if (other !== bot && other.alive && Math.hypot(bot.x - other.x, bot.y - other.y) < 400) {
            createCoinsOrPelletsFromBotDeath(other.trail, other.score);
            bots.splice(i, 1);
            setTimeout(() => spawnBorderBot('Bot_' + Math.floor(Math.random()*99), beastSpecies.sun_dragon), 4000);
        }
    }
    bot.hasDestructionPower = false;
    bot.powerTimer = 0;
}

window.startArenaGame = function() {
    isGameActive = true;
    player.alive = true;
    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;
    player.score = 0;
    player.trail = [];
    player.maxSegments = INITIAL_SEGMENTS;
    const gallery = document.getElementById('skinGallery');
    if (gallery) gallery.style.display = 'none';
    showFloatingMessage('🛡️ ¡Partida iniciada!', '#10b981');
};

function gameLoop() {
    frameCount++;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    entityGrid.clear();
    pelletGrid.clear();

    for (const bot of bots) if (bot.alive) entityGrid.insert(bot.x, bot.y, bot);
    if (player.alive && isGameActive && !adminInvisible) entityGrid.insert(player.x, player.y, player);

    if (playerPowerState.speedBoostTimer > 0) playerPowerState.speedBoostTimer -= 1/60;
    if (playerPowerState.invisibilityTimer > 0) playerPowerState.invisibilityTimer -= 1/60;
    if (playerPowerState.magnetTimer > 0) {
        playerPowerState.magnetTimer -= 1/60;
        applyMagnetEffect(player, true);
    }
    if (playerPowerState.powerTimer > 0) playerPowerState.powerTimer -= 1/60;

    if (player.alive && isGameActive) {
        const angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
        const speed = playerPowerState.speedBoostTimer > 0 ? player.speed * 1.8 : player.speed;
        player.x += Math.cos(angle) * speed;
        player.y += Math.sin(angle) * speed;
        player.trail.push({ x: player.x, y: player.y, angle });
        if (player.trail.length > player.maxSegments) player.trail.shift();
        camera.update(player.x, player.y);
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawHexMap(ctx);

    // Comida
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        const p = foodPellets[i];
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        if (player.alive && isGameActive && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            if (player.maxSegments < MAX_SEGMENTS_LIMIT) player.maxSegments++;
            foodPellets.splice(i, 1); spawnPellet();
        }
    }

    // Monedas de oro
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        const coin = goldCoins[i];
        ctx.fillStyle = coin.color; ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();
        if (player.alive && isGameActive && Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
            player.score += coin.value;
            if (player.maxSegments < MAX_SEGMENTS_LIMIT) player.maxSegments += 2;
            goldCoins.splice(i, 1);
        }
    }

    // Cajas especiales
    for (let i = specialBoxes.length - 1; i >= 0; i--) {
        const box = specialBoxes[i];
        ctx.fillStyle = box.color;
        ctx.fillRect(box.x - box.radius, box.y - box.radius, box.radius * 2, box.radius * 2);

        if (player.alive && isGameActive && Math.hypot(player.x - box.x, player.y - box.y) < player.radius + box.radius) {
            if (box.type === 'speed') playerPowerState.speedBoostTimer = 7.0;
            else if (box.type === 'invisibility') playerPowerState.invisibilityTimer = 7.0;
            else if (box.type === 'magnet') playerPowerState.magnetTimer = 12.0;
            else if (box.type === 'power') { playerPowerState.hasDestructionPower = true; playerPowerState.powerTimer = 7.0; }
            specialBoxes.splice(i, 1);
            continue;
        }
    }

    // Bucle de Bots
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        const bot = bots[bIndex];
        if (!bot.alive) continue;

        if (bot.magnetTimer > 0) { bot.magnetTimer -= 1/60; applyMagnetEffect(bot, false); }
        if (bot.speedBoostTimer > 0) bot.speedBoostTimer -= 1/60;
        if (bot.invisibilityTimer > 0) bot.invisibilityTimer -= 1/60;
        if (bot.powerTimer > 0) bot.powerTimer -= 1/60;
        if (bot.hasDestructionPower && bot.powerTimer > 0) executeBotDestructionPower(bot);

        bot.x += Math.cos(bot.angle) * (bot.speedBoostTimer > 0 ? bot.baseSpeed * 1.8 : bot.baseSpeed);
        bot.y += Math.sin(bot.angle) * (bot.speedBoostTimer > 0 ? bot.baseSpeed * 1.8 : bot.baseSpeed);
        bot.angle += (Math.random() - 0.5) * 0.2;

        if (bot.x < 50 || bot.x > WORLD_WIDTH - 50) bot.angle = Math.PI - bot.angle;
        if (bot.y < 50 || bot.y > WORLD_HEIGHT - 50) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > bot.maxSegments) bot.trail.shift();

        const botIsGhost = bot.invisibilityTimer > 0;
        const playerIsGhost = playerPowerState.invisibilityTimer > 0;

        // Colisiones Jugador vs Bot
        if (player.alive && isGameActive && !player.invincible && !adminInvisible) {
            const canInteract = (!botIsGhost && !playerIsGhost) || (botIsGhost && playerIsGhost);
            if (canInteract) {
                for (let i = 0; i < player.trail.length - 5; i++) {
                    const seg = player.trail[i];
                    if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + player.radius * 0.6) {
                        player.alive = false; isGameActive = false;
                        createGoldCoinsFromPlayerDeath(player.trail, player.score);
                        showFloatingMessage(`💥 ¡Chocaste contra ${bot.name}!`, '#ef4444');
                        const gallery = document.getElementById('skinGallery'); if (gallery) gallery.style.display = 'block';
                        break;
                    }
                }
            }
        }

        if (bot.alive) {
            const hasBotMagnet = bot.magnetTimer > 0;
            if (botIsGhost) {
                if (playerIsGhost || (isAdminUser && adminFreeCam)) {
                    ctx.save(); ctx.globalAlpha = 0.4;
                    drawBeastBody(ctx, bot.trail, bot.radius, bot.skin, hasBotMagnet);
                    drawBeastHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, `${bot.name} (👻)`, bot.score, hasBotMagnet);
                    ctx.restore();
                }
            } else {
                drawBeastBody(ctx, bot.trail, bot.radius, bot.skin, hasBotMagnet);
                drawBeastHead(ctx, bot.x, bot.y, bot.radius, bot.angle, bot.skin, bot.name, bot.score, hasBotMagnet);
            }
        }
    }

    // Dibujar Jugador
    if (player.alive && isGameActive) {
        const lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
        const hasPlayerMagnet = playerPowerState.magnetTimer > 0;
        const isPlayerGhost = playerPowerState.invisibilityTimer > 0;

        if (adminInvisible) {
            ctx.save(); ctx.globalAlpha = 0.2;
            drawBeastBody(ctx, player.trail, player.radius, player.skin, hasPlayerMagnet);
            drawBeastHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, `${player.name} (👑 ADMIN)`, player.score, hasPlayerMagnet);
            ctx.restore();
        } else if (isPlayerGhost) {
            ctx.save(); ctx.globalAlpha = 0.4;
            drawBeastBody(ctx, player.trail, player.radius, player.skin, hasPlayerMagnet);
            drawBeastHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, `${player.name} (👻)`, player.score, hasPlayerMagnet);
            ctx.restore();
        } else {
            drawBeastBody(ctx, player.trail, player.radius, player.skin, hasPlayerMagnet);
            drawBeastHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score, hasPlayerMagnet);
        }
    }

    ctx.restore();

    const progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    const barFill = document.getElementById('cashBarFill'); if (barFill) barFill.style.width = `${progress}%`;

    const cashOutBtn = document.getElementById('cashOutBtn');
    if (cashOutBtn) {
        if (player.score >= player.cashOutGoal) {
            cashOutBtn.disabled = false; cashOutBtn.style.opacity = '1'; cashOutBtn.style.cursor = 'pointer';
            cashOutBtn.style.background = '#eab308'; cashOutBtn.style.color = '#000';
        } else {
            cashOutBtn.disabled = true; cashOutBtn.style.opacity = '0.5'; cashOutBtn.style.cursor = 'not-allowed';
            cashOutBtn.style.background = '#64748b'; cashOutBtn.style.color = '#fff';
        }
    }
    requestAnimationFrame(gameLoop);
}

initSupabase();
requestAnimationFrame(gameLoop);


}
