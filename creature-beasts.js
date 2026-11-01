(function () {
  const extraSkins = {
    royal_serpent: {
      name: 'Royal Serpent',
      primaryColor: '#7dd3fc',
      secondaryColor: '#14532d',
      accent: '#dcfce7',
      species: 'snake'
    },
    sun_dragon: {
      name: 'Sun Dragon',
      primaryColor: '#f59e0b',
      secondaryColor: '#7c2d12',
      accent: '#fef3c7',
      species: 'dragon'
    },
    emerald_frog: {
      name: 'Emerald Frog',
      primaryColor: '#34d399',
      secondaryColor: '#064e3b',
      accent: '#ecfccb',
      species: 'frog'
    },
    jungle_anaconda: {
      name: 'Jungle Anaconda',
      primaryColor: '#a78bfa',
      secondaryColor: '#4c1d95',
      accent: '#ddd6fe',
      species: 'anaconda'
    },
    imperial_drake: {
      name: 'Imperial Drake',
      primaryColor: '#e2e8f0',
      secondaryColor: '#475569',
      accent: '#f8fafc',
      species: 'imperial_dragon'
    },
    swamp_gator: {
      name: 'Swamp Gator',
      primaryColor: '#f59e0b',
      secondaryColor: '#78350f',
      accent: '#fef3c7',
      species: 'gator'
    }
  };

  function ensureSkins() {
    if (window.skinCatalog && typeof window.skinCatalog === 'object') {
      Object.assign(window.skinCatalog, extraSkins);
    }
    if (window.player && !window.player.skin) {
      window.player.skin = extraSkins.royal_serpent;
    }
  }

  function getSkinFor(entity) {
    if (!entity) return extraSkins.royal_serpent;
    if (entity.skin && typeof entity.skin === 'object') return entity.skin;
    if (typeof entity.skin === 'string' && window.skinCatalog && window.skinCatalog[entity.skin]) {
      return window.skinCatalog[entity.skin];
    }
    return extraSkins.royal_serpent;
  }

  function drawCreatureBody(ctx, x, y, radius, angle, skin, isPlayer) {
    const species = (skin && skin.species) || 'snake';
    const bodyColor = skin.primaryColor || '#7dd3fc';
    const accentColor = skin.secondaryColor || '#14532d';
    const glow = isPlayer ? '#34d399' : '#f8fafc';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.shadowColor = glow;
    ctx.shadowBlur = isPlayer ? 18 : 10;

    if (species === 'dragon' || species === 'imperial_dragon') {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.2, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.4, radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.accent || '#fef3c7';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 14, -radius * 1.3);
        ctx.lineTo(i * 14 + 8, -radius * 2.2);
        ctx.lineTo(i * 14 + 16, -radius * 1.3);
        ctx.fill();
      }
    } else if (species === 'frog') {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.25, radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = skin.accent || '#ecfccb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 1.3, radius * 0.2);
      ctx.quadraticCurveTo(0, radius * 1.7, radius * 1.3, radius * 0.2);
      ctx.stroke();
    } else if (species === 'anaconda') {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.3, radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.5, radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = skin.accent || '#ddd6fe';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const offset = i * 8;
        ctx.moveTo(-radius * 1.8, offset);
        ctx.lineTo(radius * 1.8, offset + 2);
      }
      ctx.stroke();
    } else if (species === 'gator') {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.1, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.accent || '#fef3c7';
      ctx.fillRect(-radius * 0.5, -radius * 0.2, radius * 1.1, radius * 0.38);
    } else {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.18, radius * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = skin.accent || '#dcfce7';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-radius * 1.5 + i * 12, -radius * 0.2);
        ctx.lineTo(-radius * 0.55 + i * 12, radius * 0.2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(radius * 0.75, -radius * 0.35, 4.2, 0, Math.PI * 2);
    ctx.arc(radius * 0.75, radius * 0.35, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(radius * 0.95, -radius * 0.35, 2, 0, Math.PI * 2);
    ctx.arc(radius * 0.95, radius * 0.35, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(radius * 1.5, 0);
    ctx.lineTo(radius * 2.4, -radius * 0.8);
    ctx.lineTo(radius * 2.9, 0);
    ctx.lineTo(radius * 2.4, radius * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawCreatureLabel(ctx, x, y, score, isPlayer) {
    const text = `$${Number(score || 0).toFixed(2)}`;
    const fontSize = isPlayer ? 14 : 12;
    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    const width = ctx.measureText(text).width + 16;
    const height = fontSize + 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(x - width / 2, y - radiusLabelOffset - 18, width, height);
    ctx.strokeStyle = isPlayer ? '#34d399' : '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - width / 2, y - radiusLabelOffset - 18, width, height);
    ctx.fillStyle = isPlayer ? '#34d399' : '#f8fafc';
    ctx.fillText(text, x, y - radiusLabelOffset - 7);
    ctx.restore();
  }

  function drawCreatureOverlay() {
    const canvasEl = document.getElementById('gameCanvas');
    const ctx2 = canvasEl && canvasEl.getContext ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctx2) return;

    const playerObj = window.player;
    if (playerObj && playerObj.x !== undefined && playerObj.y !== undefined) {
      const skin = getSkinFor(playerObj);
      drawCreatureBody(ctx2, playerObj.x, playerObj.y, (playerObj.radius || 18) * 1.2, playerObj.angle || 0, skin, true);
    }

    const bots = Array.isArray(window.bots) ? window.bots : [];
    for (const bot of bots) {
      if (!bot || bot.x === undefined || bot.y === undefined) continue;
      if (bot.alive === false) continue;
      const skin = getSkinFor(bot);
      drawCreatureBody(ctx2, bot.x, bot.y, (bot.radius || 18) * 1.1, bot.angle || 0, skin, false);
    }
  }

  function installRAFHook() {
    const originalRAF = window.requestAnimationFrame;
    if (!originalRAF || window.__creatureRAFPatched) return;
    window.__creatureRAFPatched = true;
    window.requestAnimationFrame = function (callback) {
      return originalRAF.call(window, function (ts) {
        const result = callback(ts);
        try {
          drawCreatureOverlay();
        } catch (e) {
          // no-op for safety
        }
        return result;
      });
    };
  }

  function installSelectSkinHook() {
    const originalSelectSkin = window.selectSkin;
    if (!window.__creatureSkinHooked) {
      window.__creatureSkinHooked = true;
      window.selectSkin = function (skinKey) {
        if (extraSkins[skinKey] && window.player) {
          window.player.skin = extraSkins[skinKey];
          if (typeof window.showFloatingMessage === 'function') {
            window.showFloatingMessage(`Skin: ${extraSkins[skinKey].name}`, '#10b981');
          }
        }
        if (typeof originalSelectSkin === 'function') {
          return originalSelectSkin.call(window, skinKey);
        }
      };
    }
  }

  function addSkinCards() {
    const gallery = document.querySelector('.skin-grid');
    if (!gallery) return;

    const keys = ['royal_serpent', 'sun_dragon', 'emerald_frog', 'jungle_anaconda', 'imperial_drake', 'swamp_gator'];
    const emojis = ['🐍', '🐉', '🐸', '🐍', '👑', '🐊'];
    const labels = ['Royal Serpent', 'Sun Dragon', 'Emerald Frog', 'Jungle Anaconda', 'Imperial Drake', 'Swamp Gator'];

    keys.forEach((key, index) => {
      if (gallery.querySelector(`[data-creature-skin="${key}"]`)) return;
      const card = document.createElement('div');
      card.className = 'skin-card';
      card.setAttribute('data-creature-skin', key);
      card.onclick = function () { window.selectSkin(key); };
      card.innerHTML = `<div style="font-size: 24px;">${emojis[index]}</div><label>${labels[index]}</label>`;
      gallery.appendChild(card);
    });
  }

  function init() {
    ensureSkins();
    installRAFHook();
    installSelectSkinHook();
    addSkinCards();

    if (window.player && !window.player.skin) {
      window.player.skin = extraSkins.royal_serpent;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
