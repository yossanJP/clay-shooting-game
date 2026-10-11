const container = document.getElementById('game-container');
const crosshair = document.getElementById('crosshair');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const ammoEl = document.getElementById('ammo');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let time = 60;
let ammo = 2;
let isReloading = false;
let gameInterval;
let spawnInterval;
let isPlaying = false;

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
    if (isReloading) return;
    if (ammo <= 0) return;
    
    ammo--;
    updateUI();
    
    crosshair.style.borderColor = '#fff';
    setTimeout(() => crosshair.style.borderColor = '#0f0', 50);

    const clays = document.querySelectorAll('.clay');
    let hit = false;
    clays.forEach(clay => {
        if(hit) return;
        const rect = clay.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            
            hit = true;
            if (clay.classList.contains('red')) {
                score = Math.max(0, score - 50);
            } else if (clay.classList.contains('gold')) {
                score += 100;
            } else {
                score += 10;
            }
            clay.remove();
            updateUI();
        }
    });
}

function reload() {
    if (isReloading || ammo === 2) return;
    isReloading = true;
    ammoEl.innerText = "Reloading...";
    setTimeout(() => {
        ammo = 2;
        isReloading = false;
        updateUI();
    }, 1000);
}

function updateUI() {
    if(!isReloading) ammoEl.innerText = ammo;
    scoreEl.innerText = score;
    timeEl.innerText = time;
}

function spawnClay(isDouble = false) {
    if (!isPlaying) return;
    createSingleClay();
    if (isDouble) setTimeout(createSingleClay, 200);
}

function createSingleClay() {
    const clay = document.createElement('div');
    clay.classList.add('clay');
    
    const rand = Math.random();
    if (rand < 0.1) clay.classList.add('gold');
    else if (rand < 0.25) clay.classList.add('red');
    
    const isLeft = Math.random() < 0.5;
    const startX = isLeft ? -60 : window.innerWidth;
    const endX = isLeft ? window.innerWidth + 60 : -60;
    
    const startY = window.innerHeight * 0.7; 
    const peakY = window.innerHeight * (0.1 + Math.random() * 0.3);
    
    clay.style.left = startX + 'px';
    clay.style.top = startY + 'px';
    container.appendChild(clay);
    
    let startTime = null;
    const duration = 2000 + Math.random() * 1000;
    
    function animate(t) {
        if (!startTime) startTime = t;
        const progress = (t - startTime) / duration;
        
        if (progress >= 1) {
            clay.remove();
            return;
        }
        
        const currentX = startX + (endX - startX) * progress;
        const currentY = startY - 4 * (startY - peakY) * progress * (1 - progress);
        
        clay.style.left = currentX + 'px';
        clay.style.top = currentY + 'px';
        
        if (document.body.contains(clay)) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

function startGame() {
    score = 0;
    time = 60;
    ammo = 2;
    isReloading = false;
    isPlaying = true;
    updateUI();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    document.querySelectorAll('.clay').forEach(c => c.remove());
    
    gameInterval = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);
    
    spawnInterval = setInterval(() => {
        const isDouble = Math.random() < 0.3;
        spawnClay(isDouble);
    }, 1500);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
