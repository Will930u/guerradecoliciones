(function () {
  const fantasySpecies = {
    royal_serpent: {
      name: 'Royal Serpent',
      primaryColor: '#facc15',
      secondaryColor: '#f59e0b',
      accent: '#fef3c7',
      eyeColor: '#ff4d5a',
      glow: '#fbbf24',
      species: 'snake'
    },
    sun_dragon: {
      name: 'Sun Dragon',
      primaryColor: '#ffd166',
      secondaryColor: '#f59e0b',
      accent: '#fff7d6',
      eyeColor: '#ff4d5a',
      glow: '#fbbf24',
      species: 'dragon'
    },
    emerald_frog: {
      name: 'Emerald Frog',
      primaryColor: '#34d399',
      secondaryColor: '#10b981',
      accent: '#ecfccb',
      eyeColor: '#ff7b54',
      glow: '#34d399',
      species: 'frog'
    },
    jungle_anaconda: {
      name: 'Jungle Anaconda',
      primaryColor: '#a78bfa',
      secondaryColor: '#7c3aed',
      accent: '#ddd6fe',
      eyeColor: '#ff5d8f',
      glow: '#c084fc',
      species: 'anaconda'
    },
    imperial_drake: {
      name: 'Imperial Drake',
      primaryColor: '#dbeafe',
      secondaryColor: '#94a3b8',
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

  function normalizeSkin(skin) {
    const base = skin && typeof skin === 'object' ? skin : fantasySpecies.royal_serpent;
    return {
      name: base.name || 'Creature',
      primaryColor: base.primaryColor || '#facc15',
      secondaryColor: base.secondaryColor || '#f59e0b',
      accent: base.accent || '#fef3c7',
      eyeColor: base.eyeColor || '#ff4d5a',
      glow: base.glow || '#fbbf24',
      species: base.species || 'snake'
    };
  }

  function applyScales(ctx, radius, colorA, colorB, accent, spread) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      const x = i * (radius * 0.36);
      ctx.beginPath();
      ctx.moveTo(x, -radius * 0.9);
      ctx.quadraticCurveTo(x + (spread || 8), 0, x, radius * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function createMetalGradient(ctx, a, b, c) {
    const g = ctx.createLinearGradient(-40, -40, 40, 40);
    g.addColorStop(0, a);
    g.addColorStop(0.5, b);
    g.addColorStop(1, c);
    return g;
  }

  function drawSegment(ctx, x, y, radius, skin, hasMagnet) {
    const s = normalizeSkin(skin);
    const species = s.species;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = hasMagnet ? '#ec4899' : s.glow;
    ctx.shadowBlur = hasMagnet ? 20 : 12;

    let fillA = s.primaryColor;
    let fillB = s.secondaryColor;

    if (species === 'dragon' || species === 'imperial_dragon') {
      const grad = createMetalGradient(ctx, '#fef3c7', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.8, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, -radius * 1.2);
        ctx.lineTo(i * 12 + 5, -radius * 2.0);
        ctx.lineTo(i * 12 + 10, -radius * 1.2);
        ctx.fill();
      }
      applyScales(ctx, radius, fillA, fillB, s.accent, 10);
    } else if (species === 'frog') {
      const grad = createMetalGradient(ctx, '#bef264', s.primaryColor, '#14532d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ecfccb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 1.3, radius * 0.2);
      ctx.quadraticCurveTo(0, radius * 1.7, radius * 1.3, radius * 0.2);
      ctx.stroke();
    } else if (species === 'anaconda') {
      const grad = createMetalGradient(ctx, '#ddd6fe', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.1, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-radius * 1.8, i * 8);
        ctx.lineTo(radius * 1.8, i * 8 + 4);
        ctx.stroke();
      }
    } else if (species === 'gator') {
      const grad = createMetalGradient(ctx, '#fef3c7', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.1, radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.accent;
      ctx.fillRect(-radius * 0.5, -radius * 0.18, radius * 1.0, radius * 0.38);
    } else {
      const grad = createMetalGradient(ctx, '#fff7d6', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.9, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      applyScales(ctx, radius, s.primaryColor, s.secondaryColor, s.accent, 8);
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(radius * 0.66, -radius * 0.28, 4.8, 0, Math.PI * 2);
    ctx.arc(radius * 0.66, radius * 0.28, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = s.eyeColor || '#ff4d5a';
    ctx.beginPath();
    ctx.arc(radius * 0.92, -radius * 0.28, 2.2, 0, Math.PI * 2);
    ctx.arc(radius * 0.92, radius * 0.28, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet) {
    const s = normalizeSkin(skin);
    const species = s.species;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.shadowColor = hasMagnet ? '#ec4899' : s.glow;
    ctx.shadowBlur = hasMagnet ? 26 : 14;

    if (species === 'dragon' || species === 'imperial_dragon') {
      const grad = createMetalGradient(ctx, '#fef3c7', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(radius * 1.5, 0);
      ctx.lineTo(radius * 2.8, -radius * 1.2);
      ctx.lineTo(radius * 3.4, 0);
      ctx.lineTo(radius * 2.8, radius * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = s.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, -radius * 1.3);
        ctx.lineTo(i * 12 + 6, -radius * 2.0);
        ctx.lineTo(i * 12 + 12, -radius * 1.3);
        ctx.fill();
      }
    } else if (species === 'frog') {
      const grad = createMetalGradient(ctx, '#bbf7d0', s.primaryColor, '#14532d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(radius * 0.7, 0, radius * 1.2, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (species === 'anaconda') {
      const grad = createMetalGradient(ctx, '#ddd6fe', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(radius * 1.3, 0);
      ctx.lineTo(radius * 2.8, -radius * 1.0);
      ctx.lineTo(radius * 3.1, 0);
      ctx.lineTo(radius * 2.8, radius * 1.0);
      ctx.closePath();
      ctx.fill();
    } else if (species === 'gator') {
      const grad = createMetalGradient(ctx, '#fef3c7', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(radius * 1.0, 0);
      ctx.lineTo(radius * 2.5, -radius * 0.9);
      ctx.lineTo(radius * 3.1, 0);
      ctx.lineTo(radius * 2.5, radius * 0.9);
      ctx.closePath();
      ctx.fill();
    } else {
      const grad = createMetalGradient(ctx, '#fff7d6', s.primaryColor, s.secondaryColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(radius * 0.6, 0, radius * 1.15, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(radius * 0.45, -radius * 0.3, 5.4, 0, Math.PI * 2);
    ctx.arc(radius * 0.45, radius * 0.3, 5.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = s.eyeColor || '#ff4d5a';
    ctx.beginPath();
    ctx.arc(radius * 0.7, -radius * 0.3, 2.2, 0, Math.PI * 2);
    ctx.arc(radius * 0.7, radius * 0.3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    const labelText = `$${Number(score || 0).toFixed(2)}`;
    ctx.font = 'bold 12px sans-serif';
    const textWidth = ctx.measureText(labelText).width + 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = hasMagnet ? '#ec4899' : '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2, y - radius - 28, textWidth, 18, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hasMagnet ? '#ec4899' : '#10b981';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, y - radius - 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(name || s.name, x, y - radius - 40);
    ctx.restore();
  }

  function installFantasyRender() {
    if (!window.skinCatalog) return;
    Object.assign(window.skinCatalog, fantasySpecies);

    window.drawOrganicBody = function (ctx, trail, fixedRadius, skin, hasMagnet = false) {
      if (!trail || !Array.isArray(trail)) return;
      for (let i = trail.length - 1; i >= 0; i -= 2) {
        const point = trail[i];
        if (!point) continue;
        drawSegment(ctx, point.x, point.y, fixedRadius, skin, hasMagnet);
      }
    };

    window.drawAdvancedHead = function (ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
      drawHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet);
    };
  }

  function installSkinCards() {
    const gallery = document.querySelector('.skin-grid');
    if (!gallery) return;
    const extra = [
      ['royal_serpent', '🐍', 'Royal Serpent'],
      ['sun_dragon', '🐉', 'Sun Dragon'],
      ['emerald_frog', '🐸', 'Emerald Frog'],
      ['jungle_anaconda', '🐍', 'Jungle Anaconda'],
      ['imperial_drake', '👑', 'Imperial Drake'],
      ['swamp_gator', '🐊', 'Swamp Gator']
    ];

    extra.forEach(([key, icon, label]) => {
      if (gallery.querySelector(`[data-fantasy-skin="${key}"]`)) return;
      const el = document.createElement('div');
      el.className = 'skin-card';
      el.setAttribute('data-fantasy-skin', key);
      el.setAttribute('onclick', `selectSkin('${key}')`);
      el.innerHTML = `<div style="font-size: 24px;">${icon}</div><label>${label}</label>`;
      gallery.appendChild(el);
    });
  }

  function init() {
    if (window.skinCatalog) {
      Object.assign(window.skinCatalog, fantasySpecies);
    }
    installFantasyRender();
    installSkinCards();
    if (window.player && window.player.skin) {
      const selected = window.player.skin;
      if (!selected.species) {
        window.player.skin = fantasySpecies.royal_serpent;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
