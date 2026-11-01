(function () {
  const fantasySpecies = {
    royal_serpent: {
      name: 'Royal Serpent',
      primaryColor: '#facc15',
      secondaryColor: '#f59e0b',
      accent: '#fff7d6',
      eyeColor: '#ff4d5a',
      glow: '#fbbf24',
      species: 'snake'
    },
    sun_dragon: {
      name: 'Sun Dragon',
      primaryColor: '#ffd166',
      secondaryColor: '#f97316',
      accent: '#fff7d6',
      eyeColor: '#ff4d5a',
      glow: '#fbbf24',
      species: 'dragon'
    },
    emerald_frog: {
      name: 'Emerald Frog',
      primaryColor: '#34d399',
      secondaryColor: '#059669',
      accent: '#d9f99d',
      eyeColor: '#ff7b54',
      glow: '#6ee7b7',
      species: 'frog'
    },
    jungle_anaconda: {
      name: 'Jungle Anaconda',
      primaryColor: '#c084fc',
      secondaryColor: '#7c3aed',
      accent: '#ddd6fe',
      eyeColor: '#ff5d8f',
      glow: '#d8b4fe',
      species: 'anaconda'
    },
    imperial_drake: {
      name: 'Imperial Drake',
      primaryColor: '#dbeafe',
      secondaryColor: '#64748b',
      accent: '#f8fafc',
      eyeColor: '#ff5d8f',
      glow: '#bfdbfe',
      species: 'imperial_dragon'
    },
    swamp_gator: {
      name: 'Swamp Gator',
      primaryColor: '#f59e0b',
      secondaryColor: '#7c2d12',
      accent: '#fef3c7',
      eyeColor: '#ff5d8f',
      glow: '#fbbf24',
      species: 'gator'
    }
  };

  function norm(skin) {
    const base = skin && typeof skin === 'object' ? skin : fantasySpecies.royal_serpent;
    return {
      name: base.name || 'Creature',
      primaryColor: base.primaryColor || '#facc15',
      secondaryColor: base.secondaryColor || '#f59e0b',
      accent: base.accent || '#fff7d6',
      eyeColor: base.eyeColor || '#ff4d5a',
      glow: base.glow || '#fbbf24',
      species: base.species || 'snake'
    };
  }

  function drawScaledBand(ctx, radius, colorA, colorB, accent) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    for (let i = -3; i <= 3; i++) {
      const x = i * (radius * 0.35);
      ctx.beginPath();
      ctx.moveTo(x, -radius * 0.9);
      ctx.quadraticCurveTo(x + 8, 0, x, radius * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEntityShape(ctx, x, y, radius, skin, hasMagnet) {
    const s = norm(skin);
    const species = s.species;
    const glowColor = hasMagnet ? '#ec4899' : s.glow;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = hasMagnet ? 22 : 14;

    if (species === 'dragon' || species === 'imperial_dragon') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.2, radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15, -radius * 1.25);
        ctx.lineTo(i * 15 + 8, -radius * 2.1);
        ctx.lineTo(i * 15 + 16, -radius * 1.25);
        ctx.fill();
      }

      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.moveTo(-radius * 1.2, 0);
      ctx.lineTo(0, -radius * 2.2);
      ctx.lineTo(radius * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-radius * 0.9, -radius * 0.25, 5, 0, Math.PI * 2);
      ctx.arc(radius * 0.9, -radius * 0.25, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.eyeColor;
      ctx.beginPath();
      ctx.arc(-radius * 0.9, -radius * 0.25, 2.1, 0, Math.PI * 2);
      ctx.arc(radius * 0.9, -radius * 0.25, 2.1, 0, Math.PI * 2);
      ctx.fill();

    } else if (species === 'frog') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.8, radius * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.15, radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-radius * 0.4, -radius * 0.25, 8, 0, Math.PI * 2);
      ctx.arc(radius * 0.4, -radius * 0.25, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.eyeColor;
      ctx.beginPath();
      ctx.arc(-radius * 0.4, -radius * 0.25, 3.2, 0, Math.PI * 2);
      ctx.arc(radius * 0.4, -radius * 0.25, 3.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (species === 'anaconda') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.2, radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.42, radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        const yy = i * 9;
        ctx.beginPath();
        ctx.moveTo(-radius * 1.8, yy);
        ctx.lineTo(radius * 1.8, yy + 4);
        ctx.stroke();
      }

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-radius * 0.8, -radius * 0.2, 6, 0, Math.PI * 2);
      ctx.arc(radius * 0.8, -radius * 0.2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.eyeColor;
      ctx.beginPath();
      ctx.arc(-radius * 0.8, -radius * 0.2, 2.4, 0, Math.PI * 2);
      ctx.arc(radius * 0.8, -radius * 0.2, 2.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (species === 'gator') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.1, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.accent;
      ctx.fillRect(-radius * 0.5, -radius * 0.18, radius * 1.0, radius * 0.38);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-radius * 0.9, -radius * 0.15, 5, 0, Math.PI * 2);
      ctx.arc(radius * 0.9, -radius * 0.15, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.eyeColor;
      ctx.beginPath();
      ctx.arc(-radius * 0.9, -radius * 0.15, 2.2, 0, Math.PI * 2);
      ctx.arc(radius * 0.9, -radius * 0.15, 2.2, 0, Math.PI * 2);
      ctx.fill();

    } else {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.18, radius * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();

      drawScaledBand(ctx, radius, s.primaryColor, s.secondaryColor, s.accent);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-radius * 0.75, -radius * 0.2, 5.5, 0, Math.PI * 2);
      ctx.arc(radius * 0.75, -radius * 0.2, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.eyeColor;
      ctx.beginPath();
      ctx.arc(-radius * 0.75, -radius * 0.2, 2.4, 0, Math.PI * 2);
      ctx.arc(radius * 0.75, -radius * 0.2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCreatureOverlay() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = window.player;
    const bots = Array.isArray(window.bots) ? window.bots : [];

    if (player && Number.isFinite(player.x) && Number.isFinite(player.y)) {
      drawEntityShape(ctx, player.x, player.y, (player.radius || 18) * 1.8, player.skin || fantasySpecies.sun_dragon, !!player.hasMagnet);
    }

    for (const bot of bots) {
      if (!bot || !Number.isFinite(bot.x) || !Number.isFinite(bot.y) || bot.alive === false) continue;
      const skin = bot.skin || fantasySpecies.royal_serpent;
      drawEntityShape(ctx, bot.x, bot.y, (bot.radius || 18) * 1.7, skin, !!bot.hasMagnet);
    }
  }

  function patchAnimationLoop() {
    const originalRAF = window.requestAnimationFrame;
    if (!originalRAF || window.__beastOverlayPatched) return;
    window.__beastOverlayPatched = true;

    window.requestAnimationFrame = function (callback) {
      return originalRAF.call(window, function (timestamp) {
        const result = callback(timestamp);
        try {
          drawCreatureOverlay();
        } catch (e) {
          // keep the game running even if the overlay fails
        }
        return result;
      });
    };
  }

  function patchSkinSelection() {
    if (typeof window.selectSkin === 'function' && !window.__beastSkinPatch) {
      const oldSelect = window.selectSkin;
      window.__beastSkinPatch = true;
      window.selectSkin = function (key) {
        const output = oldSelect ? oldSelect.call(window, key) : undefined;
        if (window.player && fantasySpecies[key]) {
          window.player.skin = fantasySpecies[key];
        }
        return output;
      };
    }
  }

  function injectCards() {
    const grid = document.querySelector('.skin-grid');
    if (!grid) return;
    const extras = [
      ['royal_serpent', '🐍', 'Royal Serpent'],
      ['sun_dragon', '🐉', 'Sun Dragon'],
      ['emerald_frog', '🐸', 'Emerald Frog'],
      ['jungle_anaconda', '🐍', 'Jungle Anaconda'],
      ['imperial_drake', '👑', 'Imperial Drake'],
      ['swamp_gator', '🐊', 'Swamp Gator']
    ];

    extras.forEach(([key, icon, label]) => {
      if (grid.querySelector(`[data-beast-card="${key}"]`)) return;
      const div = document.createElement('div');
      div.className = 'skin-card';
      div.setAttribute('data-beast-card', key);
      div.setAttribute('onclick', `selectSkin('${key}')`);
      div.innerHTML = `<div style="font-size:24px;">${icon}</div><label>${label}</label>`;
      grid.appendChild(div);
    });
  }

  function init() {
    if (window.skinCatalog) {
      Object.assign(window.skinCatalog, fantasySpecies);
    }
    if (window.player) {
      window.player.skin = fantasySpecies.sun_dragon;
    }
    patchAnimationLoop();
    patchSkinSelection();
    injectCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
