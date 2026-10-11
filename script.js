const container = document.getElementById('game-container');
const crosshair = document.getElementById('crosshair');
const flashOverlay = document.getElementById('flash-overlay');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const multEl = document.getElementById('multiplier');
const ammoEl = document.getElementById('ammo');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const maxComboEl = document.getElementById('max-combo');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let time = 60;
let ammo = 2;
let combo = 0;
let maxCombo = 0;
let isReloading = false;
let isPlaying = false;
let gameInterval;
let activeClays = [];

// フリー音源（ショットガン射撃・リロード・破砕音）
const shootSound = new Audio('https://assets.mixkit.co/active_storage/sfx/214/214-preview.mp3');
const reloadSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1672/1672-preview.mp3');
const breakSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2497/2497-preview.mp3');

document.addEventListener('mousemove', (e) => {
    crosshair.style.left = e.clientX + 'px';
    crosshair.style.top = e.clientY + 'px';
});

document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('mousedown', (e) => {
    if (!isPlaying) return;
    if (e.button === 0) {
        shoot(e);
    } else if (e.button === 2) {
        reload();
    }
});

function shoot(e) {
    if (isReloading || ammo <= 0) return;
    ammo--;
    updateUI();

    // 銃声再生
    const sound = shootSound.cloneNode();
    sound.volume = 0.8;
    sound.play().catch(() => {});

    // マズルフラッシュ＆画面揺れ
    flashOverlay.style.opacity = '1';
    setTimeout(() => flashOverlay.style.opacity = '0', 60);
    shakeScreen();

    let hit = false;
    for (let i = activeClays.length - 1; i >= 0; i--) {
        const item = activeClays[i];
        const rect = item.el.getBoundingClientRect();
        const dist = Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));

        if (dist <= 40) {
            hit = true;
            shatterClay(item.el, e.clientX, e.clientY);
            activeClays.splice(i, 1);

            // スコア計算: スピード判定 + 初弾ボーナス + コンボ倍率
            const flightTime = (Date.now() - item.spawnTime) / 1000;
            const speedBonus = Math.max(50, Math.floor(250 - flightTime * 100));
            const firstShotBonus = (ammo === 1) ? 100 : 50;
            const mult = 1 + combo * 0.2;
            const gained = Math.floor((speedBonus + firstShotBonus) * mult);

            score += gained;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            updateUI();
            break;
        }
    }

    if (!hit && activeClays.length === 0) {
        resetCombo();
    }

    checkRoundEnd();
}

function reload() {
    if (isReloading || ammo === 2) return;
    isReloading = true;
    ammoEl.innerText = "装填中...";
    const sound = reloadSound.cloneNode();
    sound.volume = 0.7;
    sound.play().catch(() => {});

    setTimeout(() => {
        ammo = 2;
        isReloading = false;
        updateUI();
    }, 900);
}

function resetCombo() {
    combo = 0;
    updateUI();
}

function updateUI() {
    timeEl.innerText = time;
    scoreEl.innerText = score;
    comboEl.innerText = combo;
    multEl.innerText = (1 + combo * 0.2).toFixed(1);
    if (!isReloading) ammoEl.innerText = ammo;
}

function shakeScreen() {
    const rx = (Math.random() - 0.5) * 10;
    const ry = (Math.random() - 0.5) * 10;
    container.style.transform = `translate(${rx}px, ${ry}px)`;
    setTimeout(() => container.style.transform = 'translate(0, 0)', 50);
}

function shatterClay(el, x, y) {
    el.remove();
    const sound = breakSound.cloneNode();
    sound.volume = 0.7;
    sound.play().catch(() => {});

    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        container.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        let px = x, py = y;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let life = 30;

        function animP() {
            px += vx;
            py += vy;
            vy += 0.2; // 重力
            p.style.left = px + 'px';
            p.style.top = py + 'px';
            life--;
            if (life > 0) requestAnimationFrame(animP);
            else p.remove();
        }
        requestAnimationFrame(animP);
    }
}

function nextTurn() {
    if (!isPlaying) return;
    setTimeout(() => {
        if (!isPlaying) return;
        // コンボに応じてダブル出現
        const isDouble = combo >= 5 || Math.random() < 0.25;
        spawnClay();
        if (isDouble) setTimeout(spawnClay, 250);
    }, 700);
}

function spawnClay() {
    const el = document.createElement('div');
    el.className = 'clay';
    container.appendChild(el);

    const startX = window.innerWidth * (0.35 + Math.random() * 0.3);
    const startY = window.innerHeight * 0.9;
    const targetX = (Math.random() - 0.5) * window.innerWidth * 1.2 + window.innerWidth * 0.5;
    const targetY = window.innerHeight * (0.15 + Math.random() * 0.2);

    // コンボ連動速度
    const speedFactor = Math.min(2.0, 1 + combo * 0.08);
    const duration = Math.max(1200, 2400 / speedFactor);

    const clayObj = { el, spawnTime: Date.now() };
    activeClays.push(clayObj);

    let startT = null;
    function anim(t) {
        if (!startT) startT = t;
        const p = (t - startT) / duration;
        if (p >= 1 || !document.body.contains(el)) {
            if (document.body.contains(el)) {
                el.remove();
                activeClays = activeClays.filter(c => c !== clayObj);
                resetCombo();
                checkRoundEnd();
            }
            return;
        }

        const curX = startX + (targetX - startX) * p;
        const curY = startY - 4 * (startY - targetY) * p * (1 - p);
        const scale = 1 - p * 0.6; // 遠ざかり演出

        el.style.left = curX + 'px';
        el.style.top = curY + 'px';
        el.style.transform = `translate(-50%, -50%) scale(${scale})`;

        requestAnimationFrame(anim);
    }
    requestAnimationFrame(anim);
}

function checkRoundEnd() {
    if (activeClays.length === 0) {
        nextTurn();
    }
}

function startGame() {
    score = 0;
    time = 60;
    ammo = 2;
    combo = 0;
    maxCombo = 0;
    isReloading = false;
    isPlaying = true;
    activeClays.forEach(c => c.el.remove());
    activeClays = [];

    updateUI();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    gameInterval = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);

    nextTurn();
}

function endGame() {
    isPlaying = false;
    clearInterval(gameInterval);
    activeClays.forEach(c => c.el.remove());
    activeClays = [];

    finalScoreEl.innerText = score;
    maxComboEl.innerText = maxCombo;
    gameOverScreen.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
