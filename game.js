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
    const BACKEND_URL = 'https://onrender.com';
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

    const skinCatalog = {
        cyber_dragon: { name: 'Digital Dragon', primaryColor: '#10b981', secondaryColor: '#065f46' },
        fire_scale: { name: 'FireScale Killa', primaryColor: '#ef4444', secondaryColor: '#991b1b' },
        flag_venezuela: { name: 'TriColor Runner', primaryColor: '#facc15', secondaryColor: '#1e40af' },
        clockwork_gator: { name: 'Clockwork Gator', primaryColor: '#d97706', secondaryColor: '#78350f' }
    };
    const skinKeys = Object.keys(skinCatalog);
    // ===== CRIATURAS FANTÁSTICAS =====
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

    // FUNCIÓN CORREGIDA: Ahora itera sobre el trail para darle longitud real a las bestias
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

            if (species === 'dragon' || species === 'imperial_dragon') {
                ctx.fillStyle = s.secondaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.4, fixedRadius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = s.primaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.0, fixedRadius * 0.55, 0, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = s.accent;
                ctx.beginPath();
                ctx.moveTo(-fixedRadius * 0.5, -fixedRadius * 0.8);
                ctx.lineTo(0, -fixedRadius * 1.4);
                ctx.lineTo(fixedRadius * 0.5, -fixedRadius * 0.8);
                ctx.fill();
            } else if (species === 'frog') {
                ctx.fillStyle = s.secondaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.3, fixedRadius * 0.9, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = s.primaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 0.95, fixedRadius * 0.65, 0, 0, Math.PI * 2); ctx.fill();
            } else if (species === 'anaconda') {
                ctx.fillStyle = s.secondaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.5, fixedRadius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = s.primaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.1, fixedRadius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            } else if (species === 'gator') {
                ctx.fillStyle = s.secondaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.4, fixedRadius * 0.85, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = s.primaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.0, fixedRadius * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = s.secondaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 1.3, fixedRadius * 0.75, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = s.primaryColor;
                ctx.beginPath(); ctx.ellipse(0, 0, fixedRadius * 0.9, fixedRadius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                drawBeastBand(ctx, fixedRadius, s.accent);
            }
            ctx.restore();
        }
    }

    function drawBeastHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
        const s = normalizeBeastSkin(skin);
        const species = s.species;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.shadowColor = hasMagnet ? '#ec4899' : s.glow;
        ctx.shadowBlur = hasMagnet ? 26 : 14;

        if (species === 'dragon' || species === 'imperial_dragon') {
            ctx.fillStyle = s.primaryColor;
            ctx.beginPath();
            ctx.moveTo(radius * 1.2, 0);
            ctx.lineTo(radius * 2.2, -radius * 0.9);
            ctx.lineTo(radius * 2.5, 0);
            ctx.lineTo(radius * 2.2, radius * 0.9);
            ctx.closePath(); ctx.fill();
        } else if (species === 'frog') {
            ctx.fillStyle = s.primaryColor;
            ctx.beginPath(); ctx.ellipse(radius * 0.5, 0, radius * 1.1, radius * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        } else if (species === 'anaconda') {
            ctx.fillStyle = s.primaryColor;
            ctx.beginPath();
            ctx.moveTo(radius * 1.1, 0);
            ctx.lineTo(radius * 2.2, -radius * 0.7);
            ctx.lineTo(radius * 2.4, 0);
            ctx.lineTo(radius * 2.2, radius * 0.7);
            ctx.closePath(); ctx.fill();
        } else if (species === 'gator') {
            ctx.fillStyle = s.primaryColor;
            ctx.beginPath();
            ctx.moveTo(radius * 0.9, 0);
            ctx.lineTo(radius * 2.2, -radius * 0.65);
            ctx.lineTo(radius * 2.5, 0);
            ctx.lineTo(radius * 2.2, radius * 0.65);
            ctx.closePath(); ctx.fill();
        } else {
            ctx.fillStyle = s.primaryColor;
            ctx.beginPath(); ctx.ellipse(radius * 0.5, 0, radius * 1.1, radius * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(radius * 0.4, -radius * 0.25, 4.5, 0, Math.PI * 2);
        ctx.arc(radius * 0.4, radius * 0.25, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = s.eyeColor;
        ctx.beginPath();
        ctx.arc(radius * 0.55, -radius * 0.25, 2.0, 0, Math.PI * 2);
        ctx.arc(radius * 0.55, radius * 0.25, 2.0, 0, Math.PI * 2);
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

    window.beastSpecies = beastSpecies;
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

    function selectSkin(skinKey) {
        if (skinCatalog[skinKey]) {
            player.skin = skinCatalog[skinKey];
            showFloatingMessage(`Skin actualizada: ${skinCatalog[skinKey].name}`);
        }
    }
    window.selectSkin = selectSkin;

    function ensureAdminControls() {
        if (document.getElementById('adminGiftValue')) return;
        const panelBody = document.getElementById('adminPanelBody');
        if (!panelBody) return;

        const giftBlock = document.createElement('div');
        giftBlock.style.marginBottom = '8px';
        giftBlock.innerHTML = `
            <label style="font-size: 0.75rem; color: #94a3b8;">Valor del Regalo ($ USD):</label>
            <input type="number" id="adminGiftValue" value="1.00" step="0.1" style="width: 100%; padding: 5px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px; margin-top: 3px; font-size: 0.85rem;">
        `;
        panelBody.insertBefore(giftBlock, panelBody.firstChild);
    }

    function updateAdminBotSelect() {
        const select = document.getElementById('adminBotSelect');
        if (!select) return;
        select.innerHTML = '';
        if (bots.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = 'No hay bots activos';
            select.appendChild(opt);
            return;
        }
        bots.forEach((b, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `${b.name} ($${b.score.toFixed(2)})`;
            select.appendChild(opt);
        });
    }
    window.updateAdminBotSelect = updateAdminBotSelect;

    function injectAdminPanel() {
        if (document.getElementById('adminPanelContainer')) return;
        const panel = document.createElement('div');
        panel.id = 'adminPanelContainer';
        panel.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 9999; background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8; padding: 12px; border-radius: 12px; color: #fff; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 260px; transition: all 0.3s ease;';
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
                <button onclick="adminDropSpecialBox('invisibility')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">👻 Caja Invisibilidad</button>
                <button onclick="adminDropSpecialBox('power')" style="width: 100%; padding: 6px; margin-bottom: 4px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">💥 Caja Poder Destructor</button>
                <button onclick="adminDropSpecialBox('magnet')" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #ec4899; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🧲 Caja Imán</button>

                <div style="font-size: 0.75rem; color: #38bdf8; margin: 4px 0; font-weight: bold;">Gestión de Bots:</div>
                <div style="display: flex; gap: 5px; margin-bottom: 6px;">
                    <button onclick="adminAddBot()" style="flex: 1; padding: 6px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➕ Sumar</button>
                    <button onclick="adminRemoveBot()" style="flex: 1; padding: 6px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➖ Quitar</button>
                </div>
                <button onclick="adminResetAllBotsScore()" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #d97706; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🔄 Reiniciar Valor Bots (0)</button>

                <div style="background: rgba(30, 41, 59, 0.8); padding: 6px; border-radius: 6px; margin-bottom: 8px;">
                    <label style="font-size: 0.7rem; color: #38bdf8; display: block; margin-bottom: 2px;">⚡ Elevar Valor a Bot Específico:</label>
                    <select id="adminBotSelect" style="width: 100%; padding: 4px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 4px; font-size: 0.75rem; margin-bottom: 4px;"></select>
                    <input type="number" id="adminBotBoostValue" value="5.00" step="1" style="width: 100%; padding: 4px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 4px; font-size: 0.75rem; margin-bottom: 4px;">
                    <button onclick="adminBoostSelectedBot()" style="width: 100%; padding: 5px; background: #10b981; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">⬆️ Aumentar Valor Bot</button>
                </div>

                <button id="adminFreeCamBtn" onclick="toggleAdminFreeCam()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🗺️ Navegación Libre: OFF</button>
                <button id="adminInvisBtn" onclick="toggleAdminInvisible()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">👻 Modo Fantasma: OFF</button>
                <button onclick="adminSpawnDirect()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #06b6d4; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">⚡ Spawn instantáneo</button>
                <button onclick="adminFreeEntry()" style="width: 100%; padding: 6px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🚀 Ingreso VIP</button>
            </div>
        `;
        document.body.appendChild(panel);
        ensureAdminControls();
        updateAdminBotSelect();
    }

    window.toggleAdminPanelCollapse = function() {
        const body = document.getElementById('adminPanelBody');
        const icon = document.getElementById('adminToggleIcon');
        const panel = document.getElementById('adminPanelContainer');
        if (!body || !icon || !panel) return;
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? 'block' : 'none';
        icon.innerText = collapsed ? '[-]' : '[+]';
        panel.style.width = collapsed ? '260px' : '140px';
        adminPanelCollapsed = !collapsed;
    };

    window.adminResetAllBotsScore = function() {
        if (!isAdminUser) return;
        bots.forEach(b => {
            b.score = 0;
            b.maxSegments = INITIAL_SEGMENTS;
            b.trail = [];
        });
        showFloatingMessage('🔄 ¡Se ha restablecido el valor de todos los bots a $0.00!', '#d97706');
        updateAdminBotSelect();
    };

    window.adminBoostSelectedBot = function() {
        if (!isAdminUser) return;
        const select = document.getElementById('adminBotSelect');
        const valInput = document.getElementById('adminBotBoostValue');
        if (!select || select.value === "") {
            showFloatingMessage('Selecciona un bot válido.', '#ef4444');
            return;
        }
        const index = parseInt(select.value);
        const addAmount = parseFloat(valInput ? valInput.value : 5) || 5;
        if (bots[index]) {
            bots[index].score += addAmount;
            bots[index].maxSegments = Math.min(MAX_SEGMENTS_LIMIT, bots[index].maxSegments + Math.floor(addAmount * 20));
            showFloatingMessage(`⬆️ ¡${bots[index].name} aumentado en +$${addAmount.toFixed(2)}!`, '#10b981');
            updateAdminBotSelect();
        }
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
                    showFloatingMessage('👑 ¡Bienvenido Administrador! Panel VIP activado.', '#38bdf8');
                    injectAdminPanel();
                }
            }
        } catch (error) {
            console.error('Error inicializando Supabase:', error);
        }
    }

    window.toggleAdminFreeCam = function() {
        if (!isAdminUser) return;
        adminFreeCam = !adminFreeCam;
        if (adminFreeCam) {
            player.alive = false;
            adminCamX = player.x;
            adminCamY = player.y;
        }
        const btn = document.getElementById('adminFreeCamBtn');
        if (btn) {
            btn.style.background = adminFreeCam ? '#0ea5e9' : '#64748b';
            btn.innerText = adminFreeCam ? '🗺️ Navegación Libre: ON' : '🗺️ Navegación Libre: OFF';
        }
        showFloatingMessage(adminFreeCam ? '🗺️ Navegación libre activada.' : '🗺️ Navegación libre desactivada.', adminFreeCam ? '#0ea5e9' : '#10b981');
    };

    window.adminSpawnDirect = function() {
        if (!isAdminUser) return;
        adminFreeCam = false;
        closeModal();
        startArenaGame();
        showFloatingMessage('🎮 Spawn instantáneo de Administrador.', '#06b6d4');
    };

    window.adminFreeEntry = function() {
        if (!isAdminUser) return;
        closeModal();
        startArenaGame();
        showFloatingMessage('🚀 Ingreso VIP Gratuito aplicado.', '#8b5cf6');
    };

    window.toggleAdminInvisible = function() {
        if (!isAdminUser) return;
        adminInvisible = !adminInvisible;
        player.invincible = adminInvisible;
        const btn = document.getElementById('adminInvisBtn');
        if (btn) {
            btn.style.background = adminInvisible ? '#ef4444' : '#64748b';
            btn.innerText = adminInvisible ? '👻 Modo Fantasma: ON' : '👻 Modo Fantasma: OFF';
        }
        showFloatingMessage(adminInvisible ? '👻 Modo Fantasma VIP activo (Totalmente Invisible).' : '👻 Modo Fantasma deshabilitado.', adminInvisible ? '#ef4444' : '#10b981');
    };

    window.adminAddBot = function() {
        if (!isAdminUser) return;
        const speciesList = Object.keys(beastSpecies);
        const randomSkin = beastSpecies[speciesList[Math.floor(Math.random() * speciesList.length)]];
        const botName = botNamesList[Math.floor(Math.random() * botNamesList.length)] + '_' + Math.floor(Math.random() * 99);
        spawnBorderBot(botName, randomSkin);
        showFloatingMessage(`➕ Bot añadido (${bots.length} totales).`, '#3b82f6');
        updateAdminBotSelect();
    };

    window.adminRemoveBot = function() {
        if (!isAdminUser) return;
        if (bots.length > 0) {
            bots.pop();
            showFloatingMessage(`➖ Bot eliminado (${bots.length} restantes).`, '#ef4444');
            updateAdminBotSelect();
        } else {
            showFloatingMessage('No hay bots para eliminar.', '#eab308');
        }
    };

    window.adminDropGift = function(type) {
        if (!isAdminUser) return;
        const giftInput = document.getElementById('adminGiftValue');
        const val = giftInput ? parseFloat(giftInput.value) || 1 : 1;
        const targetX = mouse.x + camera.x;
        const targetY = mouse.y + camera.y;
        const color = type === 'chest' ? '#eab308' : '#facc15';
        goldCoins.push({ x: targetX, y: targetY, radius: type === 'chest' ? 10 : 8, color, value: val });
        showFloatingMessage(`🎁 ¡${type === 'chest' ? 'Cofre' : 'Estrella'} desplegado! ($${val.toFixed(2)})`, '#10b981');
    };

    window.adminDropSpecialBox = function(boxType) {
        if (!isAdminUser) return;
        const targetX = mouse.x + camera.x;
        const targetY = mouse.y + camera.y;
        spawnSpecialBox(targetX, targetY, boxType);
        showFloatingMessage(`🎁 ¡Caja especial (${boxType}) desplegada por Admin!`, '#38bdf8');
    };

    function spawnSpecialBox(x, y, type) {
        let color = '#0ea5e9';
        let name = 'Rapidez';
        if (type === 'invisibility') { color = '#8b5cf6'; name = 'Invisibilidad'; }
        else if (type === 'power') { color = '#ef4444'; name = 'Poder Destructor'; }
        else if (type === 'magnet') { color = '#ec4899'; name = 'Imán'; }
        specialBoxes.push({ x, y, radius: 14, type, color, name });
    }
    function openModal() {
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.innerText = 'Recargar Entrada ($2.00)';
        const modalBody = document.getElementById('modalBodyContent');
        if (modalBody) {
            modalBody.innerHTML = `
                <p>Costo de entrada a la partida: <strong>$2.00 USD</strong></p>
                <div class="payment-info" style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 0.85rem; color: #94a3b8;">
                    • Banco: Banesco (0134)<br>• Teléfono: 0412-1234567<br>• C.I.: V-12.345.678
                </div>
                <div style="margin-top: 15px;">
                    <label style="font-size: 0.85rem; color: #94a3b8;">Número de Referencia:</label>
                    <input type="text" id="refInput" class="form-control" placeholder="Ej: 123456" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <button class="btn-action" style="width: 100%; padding: 12px; margin-top: 15px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;" onclick="submitPayment()">Enviar Comprobante</button>
            `;
        }
        const modal = document.getElementById('depositModal');
        if (modal) modal.style.display = 'flex';
    }
    window.openModal = openModal;

    function closeModal() {
        const modal = document.getElementById('depositModal');
        if (modal) modal.style.display = 'none';
    }
    window.closeModal = closeModal;

    function drawHexMap(ctx) {
        const hexRadius = 45;
        const hexWidth = Math.sqrt(3) * hexRadius;
        const hexHeight = 2 * hexRadius;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.0;
        ctx.fillStyle = '#070c16';

        const startX = Math.floor(camera.x / hexWidth) * hexWidth - hexWidth;
        const endX = startX + canvas.width + hexWidth * 2;
        const startY = Math.floor(camera.y / (hexHeight * 0.75)) * (hexHeight * 0.75) - hexHeight;
        const endY = startY + canvas.height + hexHeight * 2;

        for (let y = startY; y < endY; y += hexHeight * 0.75) {
            const isOffset = Math.floor(y / (hexHeight * 0.75)) % 2 !== 0;
            const xOffset = isOffset ? hexWidth / 2 : 0;
            for (let x = startX + xOffset; x < endX; x += hexWidth) {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    ctx.lineTo(x + hexRadius * Math.cos(angle), y + hexRadius * Math.sin(angle));
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        }
    }

    function drawOrganicBody(ctx, trail, fixedRadius, skin, hasMagnet = false) {
        for (let i = trail.length - 1; i >= 0; i -= 2) {
            const p = trail[i];
            if (!p) continue;
            ctx.save();
            ctx.translate(p.x, p.y);
            if (hasMagnet) { ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 12; }
            ctx.fillStyle = skin.secondaryColor;
            ctx.beginPath(); ctx.arc(0, 0, fixedRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = skin.primaryColor;
            ctx.beginPath(); ctx.arc(0, 0, fixedRadius * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawAdvancedHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (hasMagnet) { ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 22; }
        else { ctx.shadowColor = skin.primaryColor; ctx.shadowBlur = 10; }
        ctx.fillStyle = skin.primaryColor;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(radius * 0.35, -radius * 0.45, 5.5, 0, Math.PI * 2);
        ctx.arc(radius * 0.35, radius * 0.45, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(radius * 0.45, -radius * 0.45, 2.5, 0, Math.PI * 2);
        ctx.arc(radius * 0.45, radius * 0.45, 2.5, 0, Math.PI * 2);
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

    function applyMagnetEffect(entity, isPlayer = false) {
        const magnetRadius = 240;
        
        // 1. Atracción de Pellets de comida
        for (let i = foodPellets.length - 1; i >= 0; i--) {
            const p = foodPellets[i];
            let absorbed = false;
            if (Math.hypot(entity.x - p.x, entity.y - p.y) = 0; i--) {
            const coin = goldCoins[i];
            let absorbed = false;
            if (Math.hypot(entity.x - coin.x, entity.y - coin.y) = 0; i--) {
            const box = specialBoxes[i];
            let absorbed = false;
            if (Math.hypot(entity.x - box.x, entity.y - box.y)  0) playerPowerState.speedBoostTimer -= 1/60;
        if (playerPowerState.invisibilityTimer > 0) playerPowerState.invisibilityTimer -= 1/60;
        if (playerPowerState.magnetTimer > 0) { playerPowerState.magnetTimer -= 1/60; applyMagnetEffect(player, true); }
        if (playerPowerState.hasDestructionPower && playerPowerState.powerTimer > 0) {
            playerPowerState.powerTimer -= 1/60;
            if (playerPowerState.powerTimer <= 0) { playerPowerState.hasDestructionPower = false; showFloatingMessage("💥 El poder destructor ha expirado.", "#64748b"); }
        }

        if (adminFreeCam) {
            const moveSpeed = 15;
            if (mouse.x < 100) adminCamX -= moveSpeed;
        if (mouse.y > canvas.height - 100) adminCamY += moveSpeed;
        adminCamX = Math.max(0, Math.min(WORLD_WIDTH, adminCamX));
        adminCamY = Math.max(0, Math.min(WORLD_HEIGHT, adminCamY));
        camera.update(adminCamX, adminCamY);
    } else if (player.alive && isGameActive) {
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        const angle = Math.atan2(mouse.y - screenCenterY, mouse.x - screenCenterX);
        const currentActualSpeed = playerPowerState.speedBoostTimer > 0 ? player.speed * 1.8 : player.speed;
        player.x += Math.cos(angle) * currentActualSpeed;
        player.y += Math.sin(angle) * currentActualSpeed;
        player.x = Math.max(30, Math.min(WORLD_WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, player.y));
        player.trail.push({ x: player.x, y: player.y, angle });
        if (player.trail.length > player.maxSegments) player.trail.shift();
        camera.update(player.x, player.y);
    } else if (player.isSpectator) {
        const leaderBot = bots.length > 0 ? bots[0] : null;
        if (leaderBot) camera.update(leaderBot.x, leaderBot.y);
    }

    ctx.save(); 
    ctx.translate(-camera.x, -camera.y);
    drawHexMap(ctx);

    for (let i = foodPellets.length - 1; i >= 0; i--) {
        const p = foodPellets[i];
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        let pelletEaten = false;
        if (player.alive && isGameActive && Math.hypot(player.x - p.x, player.y - p.y) = 0; i--) {
        const box = specialBoxes[i];
        ctx.save(); ctx.shadowColor = box.color; ctx.shadowBlur = 15; ctx.fillStyle = box.color;
        ctx.beginPath(); ctx.rect(box.x - box.radius, box.y - box.radius, box.radius * 2, box.radius * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore();
        let boxTaken = false;
        if (player.alive && isGameActive && Math.hypot(player.x - box.x, player.y - box.y) < player.radius + box.radius) {
            if (box.type === 'speed') { playerPowerState.speedBoostTimer = 7.0; showFloatingMessage("⚡ ¡Caja de Rapidez recogida!", "#0ea5e9"); }
            else if (box.type === 'invisibility') { playerPowerState.invisibilityTimer = 7.0; showFloatingMessage("👻 ¡Caja Modo Fantasma recogida!", "#8b5cf6"); }
            else if (box.type === 'power') { playerPowerState.hasDestructionPower = true; playerPowerState.powerTimer = 7.0; showFloatingMessage("💥 ¡Poder Destructor obtenido!", "#ef4444"); }
            else if (box.type === 'magnet') { playerPowerState.magnetTimer = 12.0; showFloatingMessage("🧲 ¡Caja Imán recogida!", "#ec4899"); }
            specialBoxes.splice(i, 1); continue;
        }
        for (const bot of bots) {
            if (bot.alive && Math.hypot(bot.x - box.x, box.y - box.y) < bot.radius + box.radius) {
                if (box.type === 'speed') bot.speedBoostTimer = 7.0;
                else if (box.type === 'magnet') bot.magnetTimer = 12.0;
                else if (box.type === 'invisibility') bot.invisibilityTimer = 7.0;
                else if (box.type === 'power') { bot.hasDestructionPower = true; bot.powerTimer = 7.0; }
                specialBoxes.splice(i, 1); boxTaken = true; break;
            }
        }
        if (boxTaken) continue;
    }

    for (let i = goldCoins.length - 1; i >= 0; i--) {
        const coin = goldCoins[i];
        ctx.fillStyle = coin.color; ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();
        let coinEaten = false;
        if (player.alive && isGameActive && Math.hypot(player.x - coin.x, player.y - coin.y) = 0; bIndex--) {
        const bot = bots[bIndex]; if (!bot.alive) continue;
        if (bot.magnetTimer > 0) { bot.magnetTimer -= 1/60; applyMagnetEffect(bot, false); }
        if (bot.speedBoostTimer > 0) bot.speedBoostTimer -= 1/60;
        if (bot.invisibilityTimer > 0) bot.invisibilityTimer -= 1/60;
        if (bot.powerTimer > 0) { bot.powerTimer -= 1/60; if (bot.powerTimer <= 0) bot.hasDestructionPower = false; }
        if (bot.hasDestructionPower && bot.powerTimer > 0) executeBotDestructionPower(bot);

        if (!bot.cachedObjective || (frameCount % 15 === (bIndex % 15))) bot.cachedObjective = chooseBotObjective(bot);
        const objective = bot.cachedObjective;
        let targetAngle = bot.angle;
        if (objective.type === 'evade' && objective.evadeAngle !== null) targetAngle = normalizeAngle(objective.evadeAngle + Math.PI);
        else targetAngle = Math.atan2(objective.y - bot.y, objective.x - bot.x);

        bot.angle += normalizeAngle(targetAngle - bot.angle) * 0.16; bot.angle = normalizeAngle(bot.angle);
        const currentBotSpeed = bot.speedBoostTimer > 0 ? bot.baseSpeed * 1.8 : bot.baseSpeed;
        bot.x += Math.cos(bot.angle) * currentBotSpeed; bot.y += Math.sin(bot.angle) * currentBotSpeed;

        const margin = 60;
        if (bot.x < margin) { bot.x = margin; bot.angle = 0; } 
        if (bot.x > WORLD_WIDTH - margin) { bot.x = WORLD_WIDTH - margin; bot.angle = Math.PI; }
        if (bot.y < margin) { bot.y = margin; bot.angle = Math.PI / 2; } 
        if (bot.y > WORLD_HEIGHT - margin) { bot.y = WORLD_HEIGHT - margin; bot.angle = -Math.PI / 2; }

        bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
        if (bot.trail.length > bot.maxSegments) bot.trail.shift();

        const botIsGhost = bot.invisibilityTimer > 0;
        const playerIsGhost = playerPowerState.invisibilityTimer > 0;

        if (player.alive && isGameActive && !player.invincible && !adminInvisible) {
            const canInteractPlayerBot = (!botIsGhost && !playerIsGhost) || (botIsGhost && playerIsGhost);
            if (canInteractPlayerBot) {
                for (let i = 0; i < player.trail.length - 10; i++) {
                    const seg = player.trail[i];
                    if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + player.radius * 0.6) {
                        createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                        showFloatingMessage(`💥 ¡${bot.name} chocó contra ti y murió!`, '#10b981');
                        const deadName = bot.name; const deadSkin = bot.skin;
                        bots.splice(bIndex, 1); setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                        bot.alive = false; updateAdminBotSelect(); break;
                    }
                }
            }
        }
        if (!bot.alive) continue;

        let botDiedByOther = false;
        const nearbyForCollision = entityGrid.getNearby(bot.x, bot.y);
        for (const otherBot of nearbyForCollision) {
            if (otherBot === bot || !otherBot.alive || otherBot === player) continue;
            const otherIsGhost = otherBot.invisibilityTimer > 0;
            const canInteractBots = (!botIsGhost && !otherIsGhost) || (botIsGhost && otherIsGhost);
            if (canInteractBots) {
                for (let i = 0; i < otherBot.trail.length - 10; i++) {
                    const seg = otherBot.trail[i];
                    if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + otherBot.radius * 0.6) {
                        createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                        otherBot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, otherBot.maxSegments + 10);
                        showFloatingMessage(`💥 ${bot.name} chocó contra el cuerpo de ${otherBot.name}.`, '#64748b');
                        const deadName = bot.name; const deadSkin = bot.skin;
                        bots.splice(bIndex, 1); setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                        botDiedByOther = true; updateAdminBotSelect(); break;
                    }
                }
            }
            if (botDiedByOther) break;
        }
        if (botDiedByOther) continue;

        if (player.alive && isGameActive && !player.invincible && !adminInvisible) {
            const canInteractPlayerBot = (!botIsGhost && !playerIsGhost) || (botIsGhost && playerIsGhost);
            if (canInteractPlayerBot) {
                for (let i = 0; i < bot.trail.length - 10; i++) {
                    const seg = bot.trail[i];
                    if (Math.hypot(player.x - seg.x, player.y - seg.y) < player.radius + bot.radius * 0.6) {
                        player.alive = false; isGameActive = false; bot.score += 1;
                        bot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, bot.maxSegments + 50);
                        createGoldCoinsFromPlayerDeath(player.trail, player.score);
                        showFloatingMessage(`💥 ¡Chocaste contra el cuerpo de ${bot.name}!`, '#ef4444');
                        const gallery = document.getElementById('skinGallery'); if (gallery) gallery.style.display = 'block';
                        updateAdminBotSelect(); break;
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

        if (player.alive && isGameActive) {
            const lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
            const hasPlayerMagnet = playerPowerState.magnetTimer > 0;
            const isPlayerGhost = playerPowerState.invisibilityTimer > 0;

            if (adminInvisible) {
                ctx.save(); ctx.globalAlpha = 0.2;
                drawBeastBody(ctx, player.trail, player.radius, player.skin, hasPlayerMagnet);
                drawBeastHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, `${player.name} (👑 ADMIN INVIS)`, player.score, hasPlayerMagnet);
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
