(function () {
    if (typeof skinCatalog === 'undefined' || typeof player === 'undefined') return;

    const extraSkins = {
        royal_serpent: {
            name: 'Royal Serpent',
            primaryColor: '#7dd3fc',
            secondaryColor: '#14532d',
            species: 'snake',
            accent: '#dcfce7'
        },
        sun_dragon: {
            name: 'Sun Dragon',
            primaryColor: '#f59e0b',
            secondaryColor: '#7c2d12',
            species: 'dragon',
            accent: '#fef3c7'
        },
        emerald_frog: {
            name: 'Emerald Frog',
            primaryColor: '#34d399',
            secondaryColor: '#064e3b',
            species: 'frog',
            accent: '#ecfccb'
        },
        jungle_anaconda: {
            name: 'Jungle Anaconda',
            primaryColor: '#a78bfa',
            secondaryColor: '#4c1d95',
            species: 'anaconda',
            accent: '#ddd6fe'
        },
        imperial_drake: {
            name: 'Imperial Drake',
            primaryColor: '#e2e8f0',
            secondaryColor: '#475569',
            species: 'imperial_dragon',
            accent: '#f8fafc'
        },
        swamp_gator: {
            name: 'Swamp Gator',
            primaryColor: '#f59e0b',
            secondaryColor: '#78350f',
            species: 'gator',
            accent: '#fef3c7'
        }
    };

    Object.assign(skinCatalog, extraSkins);
    player.skin = skinCatalog.royal_serpent || skinCatalog.cyber_dragon;

    function drawCreatureSegment(ctx, x, y, radius, skin, species) {
        ctx.save();
        ctx.translate(x, y);

        switch (species) {
            case 'snake': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.8, radius * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.2, radius * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = skin.accent;
                ctx.lineWidth = 2;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-radius * 1.5 + i * 12, -radius * 0.2);
                    ctx.lineTo(-radius * 0.7 + i * 12, radius * 0.2);
                    ctx.stroke();
                }
                break;
            }
            case 'dragon': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.8, radius * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.2, radius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.accent;
                for (let i = -2; i <= 2; i++) {
                    const xSpike = i * 12;
                    ctx.beginPath();
                    ctx.moveTo(xSpike, -radius * 0.8);
                    ctx.lineTo(xSpike + 5, -radius * 1.5);
                    ctx.lineTo(xSpike + 10, -radius * 0.8);
                    ctx.fill();
                }
                break;
            }
            case 'frog': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.7, radius * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.15, radius * 0.72, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = skin.accent;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-radius * 1.05, radius * 0.2);
                ctx.quadraticCurveTo(0, radius * 1.6, radius * 1.05, radius * 0.2);
                ctx.stroke();
                break;
            }
            case 'anaconda': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 2.1, radius * 1.0, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.35, radius * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = skin.accent;
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = -2; i <= 2; i++) {
                    const yPos = i * 8;
                    ctx.moveTo(-radius * 1.8, yPos);
                    ctx.lineTo(radius * 1.8, yPos + 4);
                }
                ctx.stroke();
                break;
            }
            case 'imperial_dragon': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 2.0, radius * 0.95, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.26, radius * 0.62, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.accent;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 14, -radius * 1.05);
                    ctx.lineTo(i * 14 + 6, -radius * 1.7);
                    ctx.lineTo(i * 14 + 12, -radius * 1.05);
                    ctx.fill();
                }
                break;
            }
            case 'gator': {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 2.0, radius * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.3, radius * 0.58, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = skin.accent;
                ctx.fillRect(-radius * 0.5, -radius * 0.18, radius * 1.0, radius * 0.36);
                break;
            }
            default: {
                ctx.fillStyle = skin.secondaryColor;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }

        ctx.restore();
    }

    function drawCreatureHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (hasMagnet) {
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = skin.primaryColor;
            ctx.shadowBlur = 10;
        }

        switch (skin.species) {
            case 'snake': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.moveTo(radius * 1.2, 0);
                ctx.lineTo(radius * 2.3, -radius * 0.8);
                ctx.lineTo(radius * 2.3, radius * 0.8);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(radius * 0.5, -radius * 0.3, 4.5, 0, Math.PI * 2);
                ctx.arc(radius * 0.5, radius * 0.3, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(radius * 0.7, -radius * 0.3, 2.2, 0, Math.PI * 2);
                ctx.arc(radius * 0.7, radius * 0.3, 2.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'dragon': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.moveTo(radius * 1.3, 0);
                ctx.lineTo(radius * 2.5, -radius * 1.1);
                ctx.lineTo(radius * 2.9, 0);
                ctx.lineTo(radius * 2.5, radius * 1.1);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(radius * 0.52, -radius * 0.38, 5, 0, Math.PI * 2);
                ctx.arc(radius * 0.52, radius * 0.38, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(radius * 0.75, -radius * 0.38, 2.3, 0, Math.PI * 2);
                ctx.arc(radius * 0.75, radius * 0.38, 2.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'frog': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.ellipse(radius * 0.8, 0, radius * 1.1, radius * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(radius * 0.35, -radius * 0.38, 5, 0, Math.PI * 2);
                ctx.arc(radius * 0.35, radius * 0.38, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'anaconda': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.moveTo(radius * 1.1, 0);
                ctx.lineTo(radius * 2.6, -radius * 1.0);
                ctx.lineTo(radius * 2.8, 0);
                ctx.lineTo(radius * 2.6, radius * 1.0);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(radius * 0.52, -radius * 0.35, 5, 0, Math.PI * 2);
                ctx.arc(radius * 0.52, radius * 0.35, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'imperial_dragon': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.moveTo(radius * 1.2, 0);
                ctx.lineTo(radius * 2.8, -radius * 1.2);
                ctx.lineTo(radius * 3.1, 0);
                ctx.lineTo(radius * 2.8, radius * 1.2);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'gator': {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.moveTo(radius * 1.0, 0);
                ctx.lineTo(radius * 2.5, -radius * 0.8);
                ctx.lineTo(radius * 2.8, 0);
                ctx.lineTo(radius * 2.5, radius * 0.8);
                ctx.closePath();
                ctx.fill();
                break;
            }
            default: {
                ctx.fillStyle = skin.primaryColor;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function drawOrganicBody(ctx, trail, fixedRadius, skin, hasMagnet = false) {
        for (let i = trail.length - 1; i >= 0; i -= 2) {
            const p = trail[i];
            if (!p) continue;
            drawCreatureSegment(ctx, p.x, p.y, fixedRadius, skin, skin.species || 'snake');
        }
    }

    function drawAdvancedHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet = false) {
        drawCreatureHead(ctx, x, y, radius, angle, skin, name, score, hasMagnet);

        ctx.save();
        const labelText = `$${score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        ctx.font = 'bold 13px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = hasMagnet ? '#ec4899' : '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - textWidth / 2 - 12, y - radius - 34, textWidth + 24, 24, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hasMagnet ? '#ec4899' : '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, x, y - radius - 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(hasMagnet ? `${name} (🧲)` : name, x, y - radius - 42);
        ctx.restore();
    }
})();
