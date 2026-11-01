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
        growthPointsEaten: 0
    };

    const skinCatalog = {
        cyber_dragon: { name: 'Digital Dragon', primaryColor: '#10b981', secondaryColor: '#065f46' },
        fire_scale: { name: 'FireScale Killa', primaryColor: '#ef4444', secondaryColor: '#991b1b' },
        flag_venezuela: { name: 'TriColor Runner', primaryColor: '#facc15', secondaryColor: '#1e40af' },
        clockwork_gator: { name: 'Clockwork Gator', primaryColor: '#d97706', secondaryColor: '#78350f' }
    };
    const skinKeys = Object.keys(skinCatalog);

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
        skin: skinCatalog.cyber_dragon,
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
        window.notifTimer = setTimeout(() => {
            notif.style.opacity = '0';
        }, 3000);
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
                <button onclick="adminDropSpecialBox('power')" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">💥 Caja Poder Destructor</button>

                <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                    <button onclick="adminAddBot()" style="flex: 1; padding: 6px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➕ Sumar Bot</button>
                    <button onclick="adminRemoveBot()" style="flex: 1; padding: 6px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">➖ Quitar Bot</button>
                </div>
                <button id="adminFreeCamBtn" onclick="toggleAdminFreeCam()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🗺️ Navegación Libre: OFF</button>
                <button id="adminInvisBtn" onclick="toggleAdminInvisible()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">👻 Modo Fantasma: OFF</button>
                <button onclick="adminSpawnDirect()" style="width: 100%; padding: 6px; margin-bottom: 5px; background: #06b6d4; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">⚡ Spawn instantáneo</button>
                <button onclick="adminFreeEntry()" style="width: 100%; padding: 6px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🚀 Ingreso VIP</button>
            </div>
        `;
        document.body.appendChild(panel);
        ensureAdminControls();
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
        showFloatingMessage(adminInvisible ? '👻 Modo Fantasma activo.' : '👻 Modo Fantasma inactivo.', adminInvisible ? '#ef4444' : '#10b981');
    };

    window.adminAddBot = function() {
        if (!isAdminUser) return;
        const randomSkinKey = skinKeys[Math.floor(Math.random() * skinKeys.length)];
        const botName = botNamesList[Math.floor(Math.random() * botNamesList.length)] + '_' + Math.floor(Math.random() * 99);
        spawnBorderBot(botName, skinCatalog[randomSkinKey]);
        showFloatingMessage(`➕ Bot añadido (${bots.length} totales).`, '#3b82f6');
    };

    window.adminRemoveBot = function() {
        if (!isAdminUser) return;
        if (bots.length > 0) {
            bots.pop();
            showFloatingMessage(`➖ Bot eliminado (${bots.length} restantes).`, '#ef4444');
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

        specialBoxes.push({
            x,
            y,
            radius: 14,
            type,
            color,
            name
        });
    }

    async function syncBcvRate() {
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            const data = await response.json();
            if (data && data.promedio) {
                const rate = data.promedio.toFixed(2);
                const rateElem = document.getElementById('bcvRate');
                if (rateElem) rateElem.innerText = `${rate}`;
                window.currentBcvRate = parseFloat(rate);
            }
        } catch (error) {
            console.error('Error consultando tasa BCV:', error);
        }
    }

    async function syncUserWallet() {
        if (!currentUserId || currentUserId === defaultUserId) return;
        try {
            if (!supabaseClient) await initSupabase();
            if (!supabaseClient) return;
            const { data: wallet } = await supabaseClient.from('user_wallets').select('balance_usd').eq('user_id', currentUserId).single();
            if (wallet) {
                const balElem = document.getElementById('userBalance');
                if (balElem) balElem.innerText = `$${parseFloat(wallet.balance_usd).toFixed(2)} USD`;
            }
        } catch (error) {
            console.error('Error sincronizando billetera:', error);
        }
    }

    function startWaitingForApproval() {
        showFloatingMessage('⏳ Pago reportado. Esperando aprobación...', '#eab308');
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.innerText = 'Verificando Pago ($2.00)';
        const modalBody = document.getElementById('modalBodyContent');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">⏳</div>
                    <p style="color: #eab308; font-weight: bold; font-size: 1.1rem;">Comprobante enviado al Administrador.</p>
                    <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 8px;">En cuanto se apruebe en Telegram, entrarás automáticamente...</p>
                </div>
            `;
        }
        if (verificationInterval) clearInterval(verificationInterval);
        verificationInterval = setInterval(async () => {
            if (!supabaseClient || !currentUserId) return;
            try {
                const { data: wallet } = await supabaseClient.from('user_wallets').select('balance_usd').eq('user_id', currentUserId).single();
                if (wallet && parseFloat(wallet.balance_usd) >= ENTRY_FEE) {
                    clearInterval(verificationInterval);
                    verificationInterval = null;
                    showFloatingMessage('¡Pago aprobado! Entrando...', '#10b981');
                    closeModal();
                    const newBalance = parseFloat(wallet.balance_usd) - ENTRY_FEE;
                    await supabaseClient.from('user_wallets').update({ balance_usd: newBalance }).eq('user_id', currentUserId);
                    const balElem = document.getElementById('userBalance');
                    if (balElem) balElem.innerText = `$${newBalance.toFixed(2)} USD`;
                    startArenaGame();
                }
            } catch (error) {
                console.error('Error verificando aprobación automática:', error);
            }
        }, 3000);
    }

    function startArenaGame() {
        isGameActive = true;
        player.alive = true;
        player.isSpectator = false;
        adminFreeCam = false;

        const spawnTarget = bots.length > 0 ? bots[Math.floor(Math.random() * bots.length)] : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
        player.x = Math.max(300, Math.min(WORLD_WIDTH - 300, spawnTarget.x + (Math.random() - 0.5) * 600));
        player.y = Math.max(300, Math.min(WORLD_HEIGHT - 300, spawnTarget.y + (Math.random() - 0.5) * 600));
        player.score = 0;
        player.maxSegments = INITIAL_SEGMENTS;
        player.trail = [];
        playerPowerState.growthPointsEaten = 0;
        playerPowerState.speedBoostTimer = 0;
        playerPowerState.invisibilityTimer = 0;
        playerPowerState.hasDestructionPower = false;
        playerPowerState.powerTimer = 0;

        player.invincible = true;
        if (!adminInvisible) {
            setTimeout(() => {
                player.invincible = false;
                showFloatingMessage('🛡️ Escudo de entrada finalizado.', '#eab308');
            }, 4000);
        }
        const gallery = document.getElementById('skinGallery');
        if (gallery) gallery.style.display = 'none';
        showFloatingMessage('🛡️ Partida iniciada con éxito.', '#10b981');
    }

    async function submitPayment() {
        const refInput = document.getElementById('refInput');
        const ref = refInput ? refInput.value.trim() : '';
        if (!ref) {
            showFloatingMessage('Por favor ingresa el número de referencia.', '#ef4444');
            return;
        }

        const rate = window.currentBcvRate || 36.5;
        const amountUSD = 2.0;
        const amountVES = (amountUSD * rate).toFixed(2);
        const payload = {
            user_id: currentUserId,
            amount_usd: amountUSD,
            bcv_rate: rate,
            amount_ves: amountVES,
            reference_number: ref,
            phone_number: '0412-1234567'
        };

        try {
            showFloatingMessage('Enviando comprobante...', '#eab308');
            const response = await fetch(`${BACKEND_URL}/api/payment/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showFloatingMessage('¡Pago reportado con éxito!', '#10b981');
                if (refInput) refInput.value = '';
                startWaitingForApproval();
            } else {
                showFloatingMessage(result.error || 'Error al registrar el pago.', '#ef4444');
            }
        } catch (error) {
            console.error('Error al conectar con backend:', error);
            showFloatingMessage('Error de conexión con el backend.', '#ef4444');
        }
    }
    window.submitPayment = submitPayment;

    window.attemptCashOut = function() {
        if (player.score < player.cashOutGoal) {
            showFloatingMessage('Aún no has llenado la barra para retirarte.', '#ef4444');
            return;
        }
        if (player.cashOutInterval) return;
        player.alive = false;
        player.isSpectator = true;
        let secondsLeft = 10;
        showFloatingMessage(`⏳ Retiro en proceso. Espectador (${secondsLeft}s)...`, '#eab308');
        player.cashOutInterval = setInterval(async () => {
            secondsLeft--;
            if (secondsLeft > 0) {
                showFloatingMessage(`⏳ Procesando cobro... ${secondsLeft}s`, '#eab308');
            } else {
                clearInterval(player.cashOutInterval);
                player.cashOutInterval = null;
                const amountUSD = (player.score * 0.1).toFixed(2);
                const rate = window.currentBcvRate || 36.5;
                const amountVES = (amountUSD * rate).toFixed(2);
                try {
                    const response = await fetch(`${BACKEND_URL}/api/cashout/request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: currentUserId, amount_usd: amountUSD, amount_ves: amountVES, bcv_rate: rate })
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        startWaitingForCashOutApproval(amountUSD);
                    } else {
                        showFloatingMessage(result.error || 'Error al solicitar retiro.', '#ef4444');
                        closeModal();
                        player.isSpectator = false;
                        const gallery = document.getElementById('skinGallery');
                        if (gallery) gallery.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error al solicitar retiro:', error);
                    showFloatingMessage('Error de conexión.', '#ef4444');
                    closeModal();
                    player.isSpectator = false;
                    const gallery = document.getElementById('skinGallery');
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
                const { data: txs } = await supabaseClient.from('payment_transactions').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(1);
                if (txs && txs.length > 0) {
                    const tx = txs[0];
                    if (tx.status === 'paid') {
                        clearInterval(cashOutCheckInterval);
                        cashOutCheckInterval = null;
                        showFloatingMessage(`¡Retiro de $${amountUSD} USD pagado! Ref: ${tx.reference_number}`, '#10b981');
                        
                        player.score = 0;
                        player.alive = false;
                        player.isSpectator = false;
                        isGameActive = false;
                        player.maxSegments = INITIAL_SEGMENTS;
                        player.trail = [];
                        
                        const gallery = document.getElementById('skinGallery');
                        if (gallery) gallery.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error en sondeo de retiro:', error);
            }
        }, 4000);
    }

    window.forfeitMatch = function() {
        if (isGameActive && player.alive) {
            if (player.score > 0) {
                createAccumulatedCoinsFromPlayer(player.trail, player.score);
                showFloatingMessage('💥 Abandonaste. Tu dinero quedó en la arena.', '#ef4444');
            } else {
                showFloatingMessage('Saliste de la partida.', '#64748b');
            }
            player.alive = false;
            isGameActive = false;
            player.score = 0;
            player.trail = [];
            const gallery = document.getElementById('skinGallery');
            if (gallery) gallery.style.display = 'block';
        }
    };

    window.addEventListener('beforeunload', () => {
        if (isGameActive && player.alive && player.score > 0) {
            player.score = 0;
        }
    });

    function spawnPellet() {
        foodPellets.push({ x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT, radius: 4.5, color: Math.random() > 0.5 ? '#ef4444' : '#10b981' });
    }

    function createGoldCoinsFromPlayerDeath(trail) {
        const prizePool = 1.0;
        const coinsCount = 50;
        const valuePerCoin = prizePool / coinsCount;
        for (let i = 0; i < coinsCount; i++) {
            const randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
            goldCoins.push({ x: randomSegment.x + (Math.random() - 0.5) * 50, y: randomSegment.y + (Math.random() - 0.5) * 50, radius: 6, color: '#eab308', value: valuePerCoin });
        }
    }

    function createAccumulatedCoinsFromPlayer(trail, totalAmount) {
        const coinsCount = Math.max(10, Math.floor(totalAmount * 50));
        const valuePerCoin = totalAmount / coinsCount;
        for (let i = 0; i < coinsCount; i++) {
            const randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: player.x, y: player.y };
            goldCoins.push({ x: randomSegment.x + (Math.random() - 0.5) * 60, y: randomSegment.y + (Math.random() - 0.5) * 60, radius: 6, color: '#eab308', value: valuePerCoin });
        }
    }

    function createCoinsOrPelletsFromBotDeath(trail, botScore) {
        if (botScore > 0) {
            const coinsCount = Math.max(10, Math.floor(botScore * 50));
            const valuePerCoin = botScore / coinsCount;
            for (let i = 0; i < coinsCount; i++) {
                const randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: 0, y: 0 };
                goldCoins.push({ x: randomSegment.x + (Math.random() - 0.5) * 40, y: randomSegment.y + (Math.random() - 0.5) * 40, radius: 6, color: '#eab308', value: valuePerCoin });
            }
        } else {
            for (let i = 0; i < 15; i++) {
                const randomSegment = trail[Math.floor(Math.random() * trail.length)] || { x: 0, y: 0 };
                foodPellets.push({ x: randomSegment.x + (Math.random() - 0.5) * 40, y: randomSegment.y + (Math.random() - 0.5) * 40, radius: 4.5, color: Math.random() > 0.5 ? '#ef4444' : '#10b981' });
            }
        }
    }

    const botNamesList = ['ViperKilla', 'ShadowHunter', 'AlphaOmega', 'NeonVenom', 'ToxicSerpent', 'ApexPredator', 'CyberCobra', 'GoldenScale', 'DragonsLair', 'TitanPython', 'GatorBite', 'HyperSpeed', 'ZeroTolerance', 'PhantomSnake', 'DarkRider', 'FlameThrower', 'VorticeXX', 'SteelFang', 'MegaSlayer', 'ChaosReaper'];

    function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    window.addEventListener('mousedown', (event) => {
        if (!player.alive || !isGameActive) return;
        if (playerPowerState.hasDestructionPower && playerPowerState.powerTimer > 0) {
            const screenCenterX = canvas.width / 2;
            const screenCenterY = canvas.height / 2;
            const clickAngle = Math.atan2(event.clientY - screenCenterY, event.clientX - screenCenterX);

            let destroyedCount = 0;
            for (let i = bots.length - 1; i >= 0; i--) {
                const b = bots[i];
                const dist = Math.hypot(b.x - player.x, b.y - player.y);
                const angleToBot = Math.atan2(b.y - player.y, b.x - player.x);
                const angleDiff = Math.abs(normalizeAngle(angleToBot - clickAngle));

                if (dist < 550 && angleDiff < 0.6) {
                    createCoinsOrPelletsFromBotDeath(b.trail, b.score);
                    const deadName = b.name;
                    const deadSkin = b.skin;
                    bots.splice(i, 1);
                    setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                    destroyedCount++;
                }
            }

            if (destroyedCount > 0) {
                showFloatingMessage(`💥 ¡Poder Destructor lanzado! (${destroyedCount} enemigos eliminados)`, '#ef4444');
            } else {
                showFloatingMessage(`💥 Poder lanzado en esa dirección, pero no impactó enemigos.`, '#facc15');
            }

            playerPowerState.hasDestructionPower = false;
            playerPowerState.powerTimer = 0;
        }
    });

    function getAdvancedBotRisk(bot, playerRef, botList) {
        let riskScore = 0;
        let nearestDangerAngle = null;

        const wallDistMin = Math.min(bot.x, WORLD_WIDTH - bot.x, bot.y, WORLD_HEIGHT - bot.y);
        if (wallDistMin < 220) {
            riskScore += (220 - wallDistMin) * 0.05; 
            if (wallDistMin === bot.x) nearestDangerAngle = Math.PI;
            else if (wallDistMin === WORLD_WIDTH - bot.x) nearestDangerAngle = 0;
            else if (wallDistMin === bot.y) nearestDangerAngle = -Math.PI / 2;
            else nearestDangerAngle = Math.PI / 2;
        }

        if (playerRef.alive && !(isAdminUser && (adminInvisible || playerPowerState.invisibilityTimer > 0))) {
            const distHead = Math.hypot(playerRef.x - bot.x, playerRef.y - bot.y);
            if (distHead < bot.safetyMargin) {
                riskScore += (bot.safetyMargin - distHead) * 0.04;
                if (!nearestDangerAngle) nearestDangerAngle = Math.atan2(playerRef.y - bot.y, playerRef.x - bot.x);
            }
            for (let i = 0; i < playerRef.trail.length - 10; i += 4) {
                const seg = playerRef.trail[i];
                const distSeg = Math.hypot(seg.x - bot.x, seg.y - bot.y);
                if (distSeg < bot.safetyMargin * 0.7) {
                    riskScore += 2.5;
                    nearestDangerAngle = Math.atan2(seg.y - bot.y, seg.x - bot.x);
                    break;
                }
            }
        }

        for (const other of botList) {
            if (other === bot || !other.alive) continue;
            const distBotHead = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (distBotHead < bot.safetyMargin * 0.7) {
                riskScore += 1.5;
                if (!nearestDangerAngle) nearestDangerAngle = Math.atan2(other.y - bot.y, other.x - bot.x);
            }
        }

        return { riskScore, nearestDangerAngle };
    }

    function chooseBotObjective(bot) {
        const { riskScore } = getAdvancedBotRisk(bot, player, bots);

        if (riskScore > bot.riskTolerance) {
            return { type: 'evade', score: 999 };
        }

        let bestObjective = null;
        let highestScore = -999;

        for (const coin of goldCoins) {
            const dist = Math.hypot(coin.x - bot.x, coin.y - bot.y);
            if (dist < 800) {
                let score = 300 - dist + (coin.value * 50);
                if (score > highestScore) {
                    highestScore = score;
                    bestObjective = { x: coin.x, y: coin.y, type: 'coin' };
                }
            }
        }

        if (!bestObjective || highestScore < 120) {
            for (const pellet of foodPellets) {
                const dist = Math.hypot(pellet.x - bot.x, pellet.y - bot.y);
                if (dist < 500) {
                    const score = 200 - dist;
                    if (score > highestScore) {
                        highestScore = score;
                        bestObjective = { x: pellet.x, y: pellet.y, type: 'food' };
                    }
                }
            }
        }

        if (player.alive && !(isAdminUser && (adminInvisible || playerPowerState.invisibilityTimer > 0)) && bot.aggression > 0.5) {
            const distPlayer = Math.hypot(player.x - bot.x, player.y - bot.y);
            if (distPlayer < 350 && riskScore < 1.8) {
                return { x: player.x, y: player.y, type: 'attack_pass' };
            }
        }

        if (bestObjective) return bestObjective;

        return {
            x: bot.x + Math.cos(bot.angle) * 400,
            y: bot.y + Math.sin(bot.angle) * 400,
            type: 'wander'
        };
    }

    function spawnBorderBot(name, skin) {
        const edge = Math.floor(Math.random() * 4);
        let sx, sy, sAngle;
        if (edge === 0) { sx = 50; sy = Math.random() * WORLD_HEIGHT; sAngle = 0; }
        else if (edge === 1) { sx = WORLD_WIDTH - 50; sy = Math.random() * WORLD_HEIGHT; sAngle = Math.PI; }
        else if (edge === 2) { sx = Math.random() * WORLD_WIDTH; sy = 50; sAngle = Math.PI / 2; }
        else { sx = Math.random() * WORLD_WIDTH; sy = WORLD_HEIGHT - 50; sAngle = -Math.PI / 2; }

        bots.push({
            name,
            skin,
            x: sx,
            y: sy,
            radius: 18,
            maxSegments: INITIAL_SEGMENTS,
            speed: 5.0 + Math.random() * 1.0,
            angle: sAngle,
            changeTimer: 0,
            trail: [],
            score: 0,
            alive: true,
            aggression: 0.4 + Math.random() * 0.4,
            safetyMargin: 160 + Math.random() * 80,
            riskTolerance: 3.0 + Math.random() * 1.5
        });
    }

    for (let i = 0; i < 20; i++) {
        const randomSkinKey = skinKeys[Math.floor(Math.random() * skinKeys.length)];
        spawnBorderBot(botNamesList[i] || `Bot_${i}`, skinCatalog[randomSkinKey]);
    }
    for (let i = 0; i < 400; i++) spawnPellet();

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    function openModal() {
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.innerText = 'Recargar Entrada ($2.00)';
        const modalBody = document.getElementById('modalBodyContent');
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
                    const hx = x + hexRadius * Math.cos(angle);
                    const hy = y + hexRadius * Math.sin(angle);
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
            const p = trail[i];
            if (!p) continue;
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
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - textWidth / 2 - 12, y - radius - 34, textWidth + 24, 24, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, x, y - radius - 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(name, x, y - radius - 42);
        ctx.restore();
    }

    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (playerPowerState.speedBoostTimer > 0) playerPowerState.speedBoostTimer -= 1/60;
        if (playerPowerState.invisibilityTimer > 0) playerPowerState.invisibilityTimer -= 1/60;
        if (playerPowerState.hasDestructionPower && playerPowerState.powerTimer > 0) {
            playerPowerState.powerTimer -= 1/60;
            if (playerPowerState.powerTimer <= 0) {
                playerPowerState.hasDestructionPower = false;
                showFloatingMessage("💥 El poder destructor ha expirado.", "#64748b");
            }
        }

        if (adminFreeCam) {
            const moveSpeed = 15;
            if (mouse.x < 100) adminCamX -= moveSpeed;
            if (mouse.x > canvas.width - 100) adminCamX += moveSpeed;
            if (mouse.y < 100) adminCamY -= moveSpeed;
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
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            if (player.alive && isGameActive && Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
                if (player.maxSegments < MAX_SEGMENTS_LIMIT) player.maxSegments += 1;
                
                playerPowerState.growthPointsEaten += 1;
                if (playerPowerState.growthPointsEaten >= 100) {
                    playerPowerState.growthPointsEaten = 0;
                    const lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
                    const dropX = player.x + Math.cos(lastAngle) * 70;
                    const dropY = player.y + Math.sin(lastAngle) * 70;
                    const types = ['speed', 'invisibility', 'power'];
                    const randomType = types[Math.floor(Math.random() * types.length)];
                    spawnSpecialBox(dropX, dropY, randomType);
                    showFloatingMessage("🎁 ¡Has alcanzado 100 puntos! Caja de regalo desplegada enfrente.", "#38bdf8");
                }

                foodPellets.splice(i, 1);
                spawnPellet();
            }
        }

        for (let i = specialBoxes.length - 1; i >= 0; i--) {
            const box = specialBoxes[i];
            ctx.save();
            ctx.shadowColor = box.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = box.color;
            ctx.beginPath();
            ctx.rect(box.x - box.radius, box.y - box.radius, box.radius * 2, box.radius * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.restore();

            if (player.alive && isGameActive && Math.hypot(player.x - box.x, player.y - box.y) < player.radius + box.radius) {
                if (box.type === 'speed') {
                    playerPowerState.speedBoostTimer = 7.0;
                    showFloatingMessage("⚡ ¡Caja de Rapidez recogida! Velocidad x1.8 por 7s.", "#0ea5e9");
                } else if (box.type === 'invisibility') {
                    playerPowerState.invisibilityTimer = 7.0;
                    showFloatingMessage("👻 ¡Caja de Invisibilidad recogida! Oculto por 7s.", "#8b5cf6");
                } else if (box.type === 'power') {
                    playerPowerState.hasDestructionPower = true;
                    playerPowerState.powerTimer = 7.0;
                    showFloatingMessage("💥 ¡Poder Destructor obtenido! Haz click en 7s para disparar.", "#ef4444");
                }
                specialBoxes.splice(i, 1);
            }
        }

        for (let i = goldCoins.length - 1; i >= 0; i--) {
            const coin = goldCoins[i];
            ctx.fillStyle = coin.color;
            ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill();
            let coinEaten = false;
            if (player.alive && isGameActive && Math.hypot(player.x - coin.x, player.y - coin.y) < player.radius + coin.radius) {
                player.score += coin.value;
                if (player.maxSegments < MAX_SEGMENTS_LIMIT) player.maxSegments += Math.min(2, MAX_SEGMENTS_LIMIT - player.maxSegments);
                goldCoins.splice(i, 1);
                continue;
            }

            for (const bot of bots) {
                if (bot.alive && Math.hypot(bot.x - coin.x, bot.y - coin.y) < bot.radius + coin.radius) {
                    bot.score += coin.value;
                    if (bot.maxSegments < MAX_SEGMENTS_LIMIT) bot.maxSegments += 1;
                    goldCoins.splice(i, 1);
                    coinEaten = true;
                    break;
                }
            }
            if (coinEaten) continue;
        }

        // =====================================================================
        // BUCLE DE BOTS Y COLISIONES CABEZA A CUERPO (ELIMINACIÓN ESTRICTA)
        // =====================================================================
        for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
            const bot = bots[bIndex];
            if (!bot.alive) continue;

            const { riskScore, nearestDangerAngle } = getAdvancedBotRisk(bot, player, bots);
            const objective = chooseBotObjective(bot);

            let targetAngle = bot.angle;
            if (objective.type === 'evade' && nearestDangerAngle !== null) {
                targetAngle = normalizeAngle(nearestDangerAngle + Math.PI);
            } else {
                targetAngle = Math.atan2(objective.y - bot.y, objective.x - bot.x);
            }

            const angleDiff = normalizeAngle(targetAngle - bot.angle);
            bot.angle += angleDiff * 0.10;
            bot.angle = normalizeAngle(bot.angle);

            bot.x += Math.cos(bot.angle) * bot.speed;
            bot.y += Math.sin(bot.angle) * bot.speed;

            const margin = 60;
            if (bot.x < margin) { bot.x = margin; bot.angle = 0; }
            if (bot.x > WORLD_WIDTH - margin) { bot.x = WORLD_WIDTH - margin; bot.angle = Math.PI; }
            if (bot.y < margin) { bot.y = margin; bot.angle = Math.PI / 2; }
            if (bot.y > WORLD_HEIGHT - margin) { bot.y = WORLD_HEIGHT - margin; bot.angle = -Math.PI / 2; }

            bot.trail.push({ x: bot.x, y: bot.y, angle: bot.angle });
            if (bot.trail.length > bot.maxSegments) bot.trail.shift();

            const isPlayerHidden = adminInvisible || playerPowerState.invisibilityTimer > 0;

            // 1. COLISIÓN: Cabeza de Bot vs Cuerpo del Jugador
            if (player.alive && isGameActive && !player.invincible && !isPlayerHidden) {
                for (let i = 0; i < player.trail.length - 10; i++) {
                    const seg = player.trail[i];
                    if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + player.radius * 0.6) {
                        createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                        showFloatingMessage(`💥 ¡${bot.name} chocó contra ti y murió!`, '#10b981');
                        const deadName = bot.name;
                        const deadSkin = bot.skin;
                        bots.splice(bIndex, 1);
                        setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                        bot.alive = false;
                        break;
                    }
                }
            }
            if (!bot.alive) continue;

            // 2. COLISIÓN: Cabeza de Bot vs Cuerpo de OTROS BOTS
            let botDiedByOther = false;
            for (let otherIdx = 0; otherIdx < bots.length; otherIdx++) {
                if (otherIdx === bIndex) continue;
                const otherBot = bots[otherIdx];
                if (!otherBot.alive) continue;

                for (let i = 0; i < otherBot.trail.length - 10; i++) {
                    const seg = otherBot.trail[i];
                    if (Math.hypot(bot.x - seg.x, bot.y - seg.y) < bot.radius + otherBot.radius * 0.6) {
                        createCoinsOrPelletsFromBotDeath(bot.trail, bot.score);
                        otherBot.score += 1;
                        otherBot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, otherBot.maxSegments + 20);
                        showFloatingMessage(`💥 ${bot.name} chocó contra el cuerpo de ${otherBot.name}.`, '#ef4444');
                        const deadName = bot.name;
                        const deadSkin = bot.skin;
                        bots.splice(bIndex, 1);
                        setTimeout(() => spawnBorderBot(deadName, deadSkin), 4000);
                        botDiedByOther = true;
                        break;
                    }
                }
                if (botDiedByOther) break;
            }
            if (botDiedByOther) continue;

            // 3. COLISIÓN: Cabeza del Jugador vs Cuerpo de este Bot
            if (player.alive && isGameActive && !player.invincible && !isPlayerHidden) {
                for (let i = 0; i < bot.trail.length - 10; i++) {
                    const seg = bot.trail[i];
                    if (Math.hypot(player.x - seg.x, player.y - seg.y) < player.radius + bot.radius * 0.6) {
                        player.alive = false;
                        isGameActive = false;
                        bot.score += 1;
                        bot.maxSegments = Math.min(MAX_SEGMENTS_LIMIT, bot.maxSegments + 50);
                        createGoldCoinsFromPlayerDeath(player.trail);
                        showFloatingMessage(`💥 ¡Chocaste contra el cuerpo de ${bot.name}!`, '#ef4444');
                        const gallery = document.getElementById('skinGallery');
                        if (gallery) gallery.style.display = 'block';
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
            const lastAngle = player.trail.length > 0 ? player.trail[player.trail.length - 1].angle : 0;
            const isPlayerHidden = adminInvisible || playerPowerState.invisibilityTimer > 0;
            if (!isPlayerHidden) {
                drawOrganicBody(ctx, player.trail, player.radius, player.skin);
                drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, player.name, player.score);
            } else {
                ctx.save();
                ctx.globalAlpha = 0.35;
                drawOrganicBody(ctx, player.trail, player.radius, player.skin);
                drawAdvancedHead(ctx, player.x, player.y, player.radius, lastAngle, player.skin, `${player.name} (👻)`, player.score);
                ctx.restore();
            }
        }

        ctx.restore();

        const progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
        const barFill = document.getElementById('cashBarFill');
        if (barFill) barFill.style.width = `${progress}%`;

        const cashOutBtn = document.getElementById('cashOutBtn');
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

    syncBcvRate();
    setTimeout(syncUserWallet, 1500);
    initSupabase();
    requestAnimationFrame(gameLoop);
}
