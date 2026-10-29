const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// Estructura del Jugador
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    speed: 3.5,
    trail: [],
    alive: true,
    score: 0,
    cashOutGoal: 50 // Meta de puntos para poder hacer Cash Out
};

// Comida pequeña normal (pepitas verdes)
let foodPellets = [];
for (let i = 0; i < 120; i++) {
    spawnPellet();
}

function spawnPellet() {
    foodPellets.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 3,
        color: '#10b981',
        value: 1
    });
}

// Monedas doradas grandes (Botín de muertos)
let goldCoins = [];

// Bots ambulantes
let bots = [];
for (let i = 0; i < 6; i++) {
    spawnBot();
}

function spawnBot() {
    bots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 12,
        speed: 2.2,
        angle: Math.random() * Math.PI * 2,
        changeTimer: 0,
        trail: [],
        color: '#ef4444'
    });
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Soltar monedas doradas al morir
function createGoldCoins(trail) {
    for (let i = 0; i < trail.length; i += 2) {
        goldCoins.push({
            x: trail[i].x + (Math.random() - 0.5) * 10,
            y: trail[i].y + (Math.random() - 0.5) * 10,
            radius: 6,
            color: '#eab308',
            value: 5 // Cada moneda da más puntuación
        });
    }
}

// Actualizar barra de Cash Out en la interfaz
function updateCashOutHUD() {
    let progress = Math.min((player.score / player.cashOutGoal) * 100, 100);
    // Si quieres agregar una barra visual en el HTML, puedes controlarla aquí
    if (progress >= 100) {
        document.getElementById('userBalance').style.color = '#eab308';
    }
}

function attemptCashOut() {
    if (player.score >= player.cashOutGoal) {
        alert(`¡Retirada exitosa! Has cobrado $${(player.score * 0.1).toFixed(2)} USD para tu saldo.`);
        player.score = 0;
        player.radius = 12;
    } else {
        alert("Aún no has llenado la barra para poder retirarte. ¡Sigue comiendo y cazando!");
    }
}

// Bucle principal
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Cuadrícula de fondo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 2. Comida normal (Verde)
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        let p = foodPellets[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (player.alive) {
            let dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < player.radius + p.radius) {
                player.radius += 0.05;
                player.score += p.value;
                foodPellets.splice(i, 1);
                spawnPellet();
                updateCashOutHUD();
            }
        }
    }

    // 3. Monedas Doradas (Crecimiento y Puntuación rápida)
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        let coin = goldCoins[i];
        ctx.fillStyle = coin.color;
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (player.alive) {
            let dist = Math.hypot(player.x - coin.x, player.y - coin.y);
            if (dist < player.radius + coin.radius) {
                player.radius += 0.3;
                player.score += coin.value;
                goldCoins.splice(i, 1);
                updateCashOutHUD();
            }
        }
    }

    // 4. Actualizar Bots
    for (let bIndex = bots.length - 1; bIndex >= 0; bIndex--) {
        let bot = bots[bIndex];
        bot.changeTimer++;
        if (bot.changeTimer > 80) {
            bot.angle += (Math.random() - 0.5) * 1.5;
            bot.changeTimer = 0;
        }

        bot.x += Math.cos(bot.angle) * bot.speed;
        bot.y += Math.sin(bot.angle) * bot.speed;

        if (bot.x < 30 || bot.x > canvas.width - 30) bot.angle = Math.PI - bot.angle;
        if (bot.y < 30 || bot.y > canvas.height - 30) bot.angle = -bot.angle;

        bot.trail.push({ x: bot.x, y: bot.y });
        if (bot.trail.length > Math.floor(bot.radius * 2.5)) bot.trail.shift();

        // Colisión: Bot choca con el Jugador -> Muere el bot
        if (player.alive) {
            for (let segment of player.trail) {
                if (Math.hypot(bot.x - segment.x, bot.y - segment.y) < bot.radius + player.radius * 0.7) {
                    createGoldCoins(bot.trail);
                    bots.splice(bIndex, 1);
                    setTimeout(spawnBot, 3000);
                    break;
                }
            }
        }

        // Dibujar bot
        for (let p of bot.trail) {
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath(); ctx.arc(p.x, p.y, bot.radius * 0.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = bot.color;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2); ctx.fill();
    }

    // 5. Actualizar Jugador
    if (player.alive) {
        let dx = mouse.x - player.x;
        let dy = mouse.y - player.y;
        let angle = Math.atan2(dy, dx);

        if (Math.hypot(dx, dy) > 2) {
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
        }

        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > Math.floor(player.radius * 2.5)) player.trail.shift();

        // Colisión: Jugador choca con un Bot -> Muere el jugador
        for (let bot of bots) {
            for (let segment of bot.trail) {
                if (Math.hypot(player.x - segment.x, player.y - segment.y) < player.radius + bot.radius * 0.7) {
                    player.alive = false;
                    createGoldCoins(player.trail);
                    alert("¡Chocaste contra un rival y perdiste todo tu acumulado!");
                    setTimeout(() => {
                        player.x = canvas.width / 2;
                        player.y = canvas.height / 2;
                        player.radius = 12;
                        player.score = 0;
                        player.trail = [];
                        player.alive = true;
                    }, 1000);
                    break;
                }
            }
        }

        // Dibujar jugador
        for (let i = 0; i < player.trail.length; i++) {
            let p = player.trail[i];
            let size = player.radius * (i / player.trail.length);
            ctx.fillStyle = "#10b981";
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(size, 4), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#34d399";
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
