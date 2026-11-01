(function () {
  const fantasySpecies = {
    royal_serpent: { name: 'Royal Serpent', primaryColor: '#7dd3fc', secondaryColor: '#14532d', accent: '#dcfce7', species: 'snake' },
    sun_dragon: { name: 'Sun Dragon', primaryColor: '#f59e0b', secondaryColor: '#7c2d12', accent: '#fef3c7', species: 'dragon' },
    emerald_frog: { name: 'Emerald Frog', primaryColor: '#34d399', secondaryColor: '#064e3b', accent: '#ecfccb', species: 'frog' },
    jungle_anaconda: { name: 'Jungle Anaconda', primaryColor: '#a78bfa', secondaryColor: '#4c1d95', accent: '#ddd6fe', species: 'anaconda' },
    imperial_drake: { name: 'Imperial Drake', primaryColor: '#e2e8f0', secondaryColor: '#475569', accent: '#f8fafc', species: 'imperial_dragon' },
    swamp_gator: { name: 'Swamp Gator', primaryColor: '#f59e0b', secondaryColor: '#78350f', accent: '#fef3c7', species: 'gator' }
  };

  function normalizeSkin(skin) {
    const base = skin && typeof skin === 'object' ? skin : { primaryColor: '#7dd3fc', secondaryColor: '#14532d', accent: '#dcfce7', species: 'snake' };
    return {
      name: base.name || 'Creature',
      primaryColor: base.primaryColor || '#7dd3fc',
      secondaryColor: base.secondaryColor || '#14532d',
      accent: base.accent || '#dcfce7',
      species: base.species || 'snake'
    };
  }

  function drawSegment(ctx, x, y, radius, skin, hasMagnet) {
    const s = normalizeSkin(skin);
    const species = s.species;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = hasMagnet ? '#ec4899' : s.primaryColor;
    ctx.shadowBlur = hasMagnet ? 18 : 10;

    if (species === 'dragon' || species === 'imperial_dragon') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.9, radius * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.2, radius * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.accent;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, -radius * 1.2);
        ctx.lineTo(i * 12 + 6, -radius * 2.1);
        ctx.lineTo(i * 12 + 12, -radius * 1.2);
        ctx.fill();
      }
    } else if (species === 'frog') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.8, radius * 1.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.15, radius * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 1.1, radius * 0.2);
      ctx.quadraticCurveTo(0, radius * 1.6, radius * 1.1, radius * 0.2);
      ctx.stroke();
    } else if (species === 'anaconda') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 2.2, radius * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.45, radius * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const yOff = i * 8;
        ctx.moveTo(-radius * 1.85, yOff);
        ctx.lineTo(radius * 1.85, yOff + 3);
      }
      ctx.stroke();
    } else if (species === 'gator') {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 2.0, radius * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.32, radius * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.accent;
      ctx.fillRect(-radius * 0.45, -radius * 0.18, radius * 1.1, radius * 0.36);
    } else {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.8, radius * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.15, radius * 0.56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-radius * 1.4 + i * 12, -radius * 0.18);
        ctx.lineTo(-radius * 0.6 + i * 12, radius * 0.18);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(radius * 0.7, -radius * 0.28, 4, 0, Math.PI * 2);
    ctx.arc(radius * 0.7, radius * 0.28, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(radius * 0.9, -radius * 0.28, 2.0, 0, Math.PI * 2);
    ctx.arc(radius * 0.9, radius * 0.28, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet) {
    const s = normalizeSkin(skin);
    const species = s.species;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.shadowColor = hasMagnet ? '#ec4899' : s.primaryColor;
    ctx.shadowBlur = hasMagnet ? 22 : 12;

    if (species === 'dragon' || species === 'imperial_dragon') {
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.moveTo(radius * 1.3, 0);
      ctx.lineTo(radius * 2.8, -radius * 1.1);
      ctx.lineTo(radius * 3.2, 0);
      ctx.lineTo(radius * 2.8, radius * 1.1);
      ctx.closePath();
      ctx.fill();
    } else if (species === 'frog') {
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(radius * 0.8, 0, radius * 1.1, radius * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    } else if (species === 'anaconda') {
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.moveTo(radius * 1.2, 0);
      ctx.lineTo(radius * 2.7, -radius * 0.9);
      ctx.lineTo(radius * 3.0, 0);
      ctx.lineTo(radius * 2.7, radius * 0.9);
      ctx.closePath();
      ctx.fill();
    } else if (species === 'gator') {
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.moveTo(radius * 1.0, 0);
      ctx.lineTo(radius * 2.6, -radius * 0.8);
      ctx.lineTo(radius * 2.9, 0);
      ctx.lineTo(radius * 2.6, radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath(); ctx.ellipse(radius * 0.55, 0, radius * 1.15, radius * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(radius * 0.35, -radius * 0.35, 5.2, 0, Math.PI * 2);
    ctx.arc(radius * 0.35, radius * 0.35, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(radius * 0.55, -radius * 0.35, 2.3, 0, Math.PI * 2);
    ctx.arc(radius * 0.55, radius * 0.35, 2.3, 0, Math.PI * 2);
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
