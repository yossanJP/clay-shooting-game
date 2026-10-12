const container = document.getElementById('game-container');
const crosshair = document.getElementById('crosshair');
const fpsGun = document.getElementById('fps-gun');
const gunImage = document.getElementById('gun-image');
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
const resultHitCountEl = document.getElementById('result-hit-count');
const resultAccuracyEl = document.getElementById('result-accuracy');
const resultGoldCountEl = document.getElementById('result-gold-count');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const reloadHud = document.getElementById('reload-hud');
const reloadHudStatus = document.getElementById('reload-hud-status');
const shell1 = document.getElementById('shell-1');
const shell2 = document.getElementById('shell-2');
const hitMarker = document.getElementById('hit-marker');
const coachStats = document.getElementById('coach-stats');
const coachAdvice = document.getElementById('coach-advice');
const goldFlash = document.getElementById('gold-flash');

let score = 0;
let time = 60;
let ammo = 2;
let combo = 0;
let maxCombo = 0;
let isReloading = false;
let reloadTimer = null;
let isPlaying = false;
let activeClays = [];
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight * 0.72;
let pendingAimFrame = 0;
let roundFrame = null;
let roundStartedAt = 0;
let spawnPlan = [];
let nextSpawnIndex = 0;
const ROUND_SECONDS = 60;
// Gentle v18 adjustment: a few extra pixels while remaining far stricter than v16.
const HITBOX_HALF_WIDTH = 28;  // v17: 26; slightly wider to feel fair
const HITBOX_HALF_HEIGHT = 15; // v19: +2px vertical tolerance compared with v18
const HITBOX_PADDING = 3;      // fixed screen-pixel aiming tolerance
const SPECIAL_TIMES = [15, 30, 45];
const GOLD_MULTIPLIER = 3;
const stats = {
    shots: 0, hits: 0, goldHits: 0, totalHitTime: 0,
    hitsLeft: 0, hitsRight: 0, lostLeft: 0, lostRight: 0, escaped: 0
};
let gunRecoilAnimation = null;
let hitMarkerAnimation = null;

let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Load the user-provided shot audio once. Web Audio avoids creating and seeking
// new <audio> elements on every mouse click. Use pooled Audio as a fallback.
const shotAudioPool = Array.from({length: 3}, () => {
    const sound = new Audio('sounds/gunshot.mp3');
    sound.preload = 'auto';
    sound.volume = 1;
    return sound;
});
let shotPoolIndex = 0;
let shotBuffer = null;
let shotDecodeStarted = false;
const shotBytes = fetch('sounds/gunshot.mp3')
    .then(response => response.ok ? response.arrayBuffer() : null)
    .catch(() => null);
const reloadSound = new Audio('sounds/reload.wav');
reloadSound.preload = 'auto';
reloadSound.volume = 0.78;
const breakSoundPool = Array.from({length: 3}, () => {
    const sound = new Audio('sounds/clay_break.wav');
    sound.preload = 'auto';
    sound.volume = 0.67;
    return sound;
});
let breakPoolIndex = 0;

function prepareGunshot() {
    if (shotDecodeStarted) return;
    shotDecodeStarted = true;
    const ctx = getAudioContext();
    shotBytes.then(bytes => {
        if (!bytes) return;
        return ctx.decodeAudioData(bytes);
    }).then(buffer => { if (buffer) shotBuffer = buffer; }).catch(() => {});
}

function playGunshot() {
    if (shotBuffer && audioCtx) {
        const source = audioCtx.createBufferSource();
        source.buffer = shotBuffer;
        source.playbackRate.value = 0.96;
        source.connect(audioCtx.destination);
        source.onended = () => { try { source.disconnect(); } catch (_) {} };
        source.start();
        return;
    }
    const sound = shotAudioPool[shotPoolIndex++ % shotAudioPool.length];
    try { sound.currentTime = 0; sound.playbackRate = 0.96; sound.play().catch(() => {}); } catch (_) {}
}

function playBreakSound() {
    const sound = breakSoundPool[breakPoolIndex++ % breakSoundPool.length];
    try { sound.currentTime = 0; sound.play().catch(() => {}); } catch (_) {}
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function setCrosshair(x, y) {
    // Composited transform avoids moving layout-positioned properties.
    crosshair.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
}

function updateGunAim(x, y) {
    // The stage fills the viewport; avoid a layout read on every mouse event.
    const nx = clamp((x / window.innerWidth - 0.5) * 2, -1, 1);
    const ny = clamp((y / window.innerHeight - 0.72) * 1.7, -1, 1);

    // Wider swing: lateral travel, visible barrel tilt and 3D yaw.
    // The gun is slightly smaller/lower in CSS to leave room at viewport edges.
    fpsGun.style.setProperty('--aim-x', `${(nx * 50).toFixed(1)}px`);
    fpsGun.style.setProperty('--aim-y', `${(ny * 20).toFixed(1)}px`);
    fpsGun.style.setProperty('--aim-rot', `${(nx * 14).toFixed(2)}deg`);
    fpsGun.style.setProperty('--aim-yaw', `${(-nx * 18).toFixed(2)}deg`);
    fpsGun.style.setProperty('--aim-pitch', `${(-ny * 9).toFixed(2)}deg`);
}

// PC aim and mobile aim use the same shot coordinates.
// Touches use direct positioning, not an accumulated relative offset.
let lastTouchAt = 0;
const mobileFireButton = document.getElementById('mobile-fire');
const mobileReloadButton = document.getElementById('mobile-reload');
const mobileJoystick = document.getElementById('mobile-joystick');
const mobileJoystickRing = document.getElementById('mobile-joystick-ring');
const mobileJoystickThumb = document.getElementById('mobile-joystick-thumb');
const mobileSensitivityButton = document.getElementById('mobile-sensitivity');
// Trackpad aim: gain is pixels of crosshair motion per pixel of finger motion.
// Pointer held still means zero movement, regardless of how far from center.
const TRACKPAD_GAINS = [1.1, 1.4, 1.75];
const JOYSTICK_SPEED_LABELS = ['LOW', 'MID', 'HIGH'];
let joystickSensitivityIndex = 0;
let joystickPointerId = null;
let joystickCenterX = 0, joystickCenterY = 0, joystickTravel = 37;
let joystickLastX = 0, joystickLastY = 0;
let joystickSafeRight = 0, joystickSafeTop = 0;

function limitMobileAim(x, y) {
    // Prevent the reticle from vanishing behind the left controller.
    // A gradual edge over 70px avoids an abrupt snap when moving right.
    const safeMaxX = Math.max(12, innerWidth - 12);
    const safeMaxY = Math.max(12, innerHeight - 12);
    const posX = clamp(x, 12, safeMaxX);
    const spread = clamp((posX - joystickSafeRight) / 70, 0, 1);
    const maxY = joystickSafeTop + (safeMaxY - joystickSafeTop) * spread;
    return [posX, clamp(y, 12, Math.max(12, maxY))];
}

function scheduleAim() {
    if (pendingAimFrame) return;
    pendingAimFrame = requestAnimationFrame(() => {
        pendingAimFrame = 0;
        setCrosshair(pointerX, pointerY);
        updateGunAim(pointerX, pointerY);
    });
}
function handleMouseMove(e) {
    if (Date.now() - lastTouchAt < 650) return; // Ignore simulated mouse events after touch.
    pointerX = e.clientX;
    pointerY = e.clientY;
    scheduleAim();
}
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('resize', () => scheduleAim());
document.addEventListener('contextmenu', e => e.preventDefault());

// Mobile uses the LEFT PAD ONLY for aiming. A touch on the field should
// neither teleport the reticle nor synthesize a mouse shot.
container.addEventListener('touchstart', e => {
    if (!isPlaying) return;
    if (e.target.closest('#mobile-controls, #mobile-joystick, #start-screen, #game-over-screen')) return;
    lastTouchAt = Date.now();
    e.preventDefault();
}, {passive:false});

window.addEventListener('blur', () => { resetMobileJoystick(); });
document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetMobileJoystick();
});

// Left thumb controller behaves as a trackpad, not a velocity stick:
// delta of finger displacement -> matching reticle displacement, no inertia.
function resetMobileJoystick() {
    joystickPointerId = null;
    joystickLastX = 0;
    joystickLastY = 0;
    mobileJoystick.classList.remove('active');
    mobileJoystickThumb.style.transform = 'translate3d(0,0,0)';
}
function paintMobileJoystickThumb(e) {
    // Visual knob follows the thumb but is contained inside the circular ring.
    // Dragging beyond the ring still moves the crosshair via pointer capture.
    const dx = e.clientX - joystickCenterX;
    const dy = e.clientY - joystickCenterY;
    const length = Math.hypot(dx, dy);
    const ratio = length > joystickTravel ? joystickTravel / length : 1;
    mobileJoystickThumb.style.transform = 'translate3d(' +
        (dx * ratio).toFixed(1) + 'px,' +
        (dy * ratio).toFixed(1) + 'px,0)';
}
mobileJoystick.addEventListener('pointerdown', e => {
    if (e.target.closest('#mobile-sensitivity')) return;
    if (!isPlaying || joystickPointerId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchAt = Date.now();
    joystickPointerId = e.pointerId;
    joystickLastX = e.clientX;
    joystickLastY = e.clientY;
    mobileJoystick.classList.add('active');
    const box = mobileJoystickRing.getBoundingClientRect();
    joystickCenterX = box.left + box.width / 2;
    joystickCenterY = box.top + box.height / 2;
    joystickTravel = Math.max(24, (box.width - 48) / 2);
    const guard = mobileJoystick.getBoundingClientRect();
    joystickSafeRight = guard.right + 5;
    joystickSafeTop = guard.top - 9;
    try { mobileJoystick.setPointerCapture(e.pointerId); } catch (_) {}
    paintMobileJoystickThumb(e);
    // No movement on press, even if the thumb is off-center.
});
mobileJoystick.addEventListener('pointermove', e => {
    if (!isPlaying || joystickPointerId !== e.pointerId) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    const dx = e.clientX - joystickLastX;
    const dy = e.clientY - joystickLastY;
    joystickLastX = e.clientX;
    joystickLastY = e.clientY;
    paintMobileJoystickThumb(e);
    if (dx === 0 && dy === 0) return;
    const gain = TRACKPAD_GAINS[joystickSensitivityIndex];
    [pointerX, pointerY] = limitMobileAim(
        pointerX + dx * gain,
        pointerY + dy * gain
    );
    setCrosshair(pointerX, pointerY);
    scheduleAim();
});
function stopJoystick(e) {
    if (joystickPointerId !== e.pointerId) return;
    lastTouchAt = Date.now();
    resetMobileJoystick();
}
mobileJoystick.addEventListener('pointerup', stopJoystick);
mobileJoystick.addEventListener('pointercancel', stopJoystick);
mobileJoystick.addEventListener('lostpointercapture', stopJoystick);

// Adjustable distance scaling; scoring, hitbox, and PC input stay unchanged.
mobileSensitivityButton.addEventListener('pointerdown', e => {
    e.stopPropagation();
});
mobileSensitivityButton.addEventListener('click', e => {
    e.stopPropagation();
    joystickSensitivityIndex = (joystickSensitivityIndex + 1) % TRACKPAD_GAINS.length;
    const label = JOYSTICK_SPEED_LABELS[joystickSensitivityIndex];
    mobileSensitivityButton.textContent = 'SENS ' + label;
    mobileSensitivityButton.setAttribute('aria-label', 'Trackpad sensitivity: ' + label.toLowerCase() + '. Tap to change.');
});

function mobileShoot() {
    if (!isPlaying) return;
    getAudioContext();
    shoot({clientX: pointerX, clientY: pointerY});
}
mobileFireButton.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); lastTouchAt = Date.now();
    mobileShoot();
});
mobileReloadButton.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); lastTouchAt = Date.now();
    if (isPlaying) { getAudioContext(); reload(); }
});
// Keyboard accessibility for button activation.
mobileFireButton.addEventListener('click', e => { e.stopPropagation(); if (e.detail === 0) mobileShoot(); });
mobileReloadButton.addEventListener('click', e => { e.stopPropagation(); if (e.detail === 0 && isPlaying) reload(); });

document.addEventListener('mousedown', e => {
    if (!isPlaying || e.target.closest('#mobile-controls, #mobile-joystick')) return;
    if (Date.now() - lastTouchAt < 650) return;
    getAudioContext();
    if (e.button === 0) shoot(e);
    else if (e.button === 2) reload();
});
document.addEventListener('keydown', e => {
    if (!isPlaying) return;
    if (e.key.toLowerCase() === 'r') reload();
});

function playGunRecoil() {
    // Animate the *image*, leaving parent gun aim + reload transforms intact.
    if (gunRecoilAnimation) gunRecoilAnimation.cancel();
    gunRecoilAnimation = gunImage.animate([
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', offset: 0 },
        { transform: 'translate3d(0, 16px, 0) rotate(-1.2deg)', offset: 0.28 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', offset: 1 }
    ], { duration: 150, easing: 'ease-out' });
}


function showHitMarker() {
    if (!hitMarker) return;
    if (hitMarkerAnimation) hitMarkerAnimation.cancel();
    hitMarkerAnimation = hitMarker.animate([
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.35)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.08)', offset: 0.2 },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.88)' }
    ], { duration: 240, easing: 'ease-out' });
}

function showFloatingScore(x, y, value, special = false) {
    const tag = document.createElement('div');
    tag.className = special ? 'floating-score floating-score-gold' : 'floating-score';
    tag.style.left = x + 'px';
    tag.style.top = y + 'px';
    tag.textContent = special ? `GOLD ×3  +${value}` : `+${value}`;
    container.appendChild(tag);
    setTimeout(() => tag.remove(), 720);
}

function animateShellReload() {
    [shell1, shell2].forEach((shell, index) => {
        if (!shell) return;
        shell.classList.remove('shell-refill');
        setTimeout(() => {
            shell.classList.add('shell-refill');
            setTimeout(() => shell.classList.remove('shell-refill'), 360);
        }, index * 80);
    });
}

function shoot(e) {
    if (isReloading || ammo <= 0) return;
    ammo--;
    stats.shots++;
    updateUI();

    playGunshot();
    playGunRecoil();
    // Animate a small composited flash instead of shaking the whole stage.
    flashOverlay.animate([{opacity: 0.6}, {opacity: 0}], {duration: 110, easing: 'ease-out'});

    let target = null;
    let closest = 1;
    // Elliptical hit region follows the clay's actual scale on screen.
    // Only a close, intentional center-aligned shot counts.
    for (const item of activeClays) {
        const scale = item.scale ?? 1;
        const rx = HITBOX_HALF_WIDTH * scale + HITBOX_PADDING;
        const ry = HITBOX_HALF_HEIGHT * scale + HITBOX_PADDING;
        const dx = (e.clientX - item.x) / rx;
        const dy = (e.clientY - item.y) / ry;
        const normalized = dx * dx + dy * dy;
        if (normalized <= closest) { closest = normalized; target = item; }
    }
    const hit = Boolean(target);
    if (target) {
        activeClays = activeClays.filter(item => item !== target);
        shatterClay(target.el, e.clientX, e.clientY, target.special);

        const flightTime = Math.max(0, (performance.now() - target.spawnTime) / 1000);
        const speedBonus = Math.max(50, Math.floor(250 - flightTime * 100));
        const firstShotBonus = (ammo === 1) ? 100 : 50;
        const mult = 1 + combo * 0.2;
        const gained = Math.floor((speedBonus + firstShotBonus) * mult * (target.special ? GOLD_MULTIPLIER : 1));

        score += gained;
        combo++;
        maxCombo = Math.max(maxCombo, combo);
        stats.hits++;
        stats.totalHitTime += flightTime;
        if (target.side === 'left') stats.hitsLeft++;
        else stats.hitsRight++;
        if (target.special) {
            stats.goldHits++;
            showGoldFlash(e.clientX, e.clientY);
        }
        showHitMarker();
        showFloatingScore(e.clientX, e.clientY, gained, target.special);
        updateUI();
    }

    if (!hit) {
        resetCombo();
    }

}

function reload() {
    if (isReloading || ammo === 2) return;
    isReloading = true;
    ammoEl.innerText = 'Reloading...';
    updateReloadHud();

    try { reloadSound.currentTime = 0; reloadSound.play().catch(() => {}); } catch (_) {}

    // Animate the child gun image only, never the aim container.
    if (gunRecoilAnimation) gunRecoilAnimation.cancel();
    gunRecoilAnimation = gunImage.animate([
        { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
        { transform: 'translate3d(0, 26px, 0) rotate(3deg)', offset: 0.4 },
        { transform: 'translate3d(0, 10px, 0) rotate(1deg)', offset: 0.8 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)' }
    ], { duration: 760, easing: 'ease-in-out' });

    reloadTimer = setTimeout(() => {
        reloadTimer = null;
        if (!isPlaying) return;
        ammo = 2;
        isReloading = false;
        fpsGun.classList.remove('gun-reload');
        updateGunAim(pointerX, pointerY);
        updateUI();
        animateShellReload();
    }, 760);
}

function resetCombo() {
    if (combo === 0) return;
    combo = 0;
    updateUI();
}



function updateReloadHud() {
    if (!reloadHud || !reloadHudStatus) return;
    let stateClass = 'hud-ready';
    let statusText = 'R / RMB';

    const loadedCount = isReloading ? 0 : ammo;
    const shells = [shell1, shell2];
    shells.forEach((shell, index) => {
        if (!shell) return;
        const isLoaded = index < loadedCount;
        shell.classList.remove('shell-loaded', 'shell-spent');
        shell.classList.add(isLoaded ? 'shell-loaded' : 'shell-spent');
    });

    if (isReloading) {
        stateClass = 'hud-reloading';
        statusText = 'RELOADING...';
    } else if (ammo <= 0) {
        stateClass = 'hud-empty';
        statusText = 'RELOAD • R / RMB';
    } else if (ammo === 1) {
        stateClass = 'hud-low';
        statusText = '1 / 2 • R / RMB';
    }

    reloadHud.className = stateClass;
    reloadHudStatus.innerText = statusText;
}

function updateUI() {
    timeEl.innerText = time;
    scoreEl.innerText = score;
    comboEl.innerText = combo;
    multEl.innerText = (1 + combo * 0.2).toFixed(1);
    if (!isReloading) ammoEl.innerText = ammo;
    updateReloadHud();
}

function shatterClay(el, x, y, special = false) {
    el.remove();
    playBreakSound();
    // Use compositor animations. Previously each fragment scheduled its own
    // requestAnimationFrame callback 34 times, causing spikes on successful hits.
    const group = document.createDocumentFragment();
    const fragments = [];
    const particleCount = window.matchMedia('(pointer:coarse)').matches ? 5 : 9;
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = special ? 'particle particle-gold' : 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        group.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 62;
        fragments.push({p, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist + 35});
    }
    container.appendChild(group);
    fragments.forEach(({p, dx, dy}) => {
        const animation = p.animate([
            {transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1},
            {transform: `translate3d(${dx}px, ${dy}px, 0) rotate(110deg)`, opacity: 0}
        ], {duration: 260 + Math.random() * 150, easing: 'cubic-bezier(.15,.6,.5,1)'});
        animation.onfinish = () => p.remove();
        animation.oncancel = () => p.remove();
    });
}

// Fixed, seeded wave schedule: identical target times, directions, speeds and gold waves
// for every run, independent of score, combo or how often a player fires.
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function makeSpawnPlan() {
    const rand = seededRandom(20261012);
    const plan = [];
    for (let i = 0, at = 0.9; at < 57.9; i++, at = 0.9 + i * 1.42) {
        // Give a gold wave its own visual breathing room.
        if (SPECIAL_TIMES.some(t => Math.abs(t - at) < 0.48)) continue;
        plan.push(makeWave(at, false, rand));
        // Identical double-target waves for every player.
        if (i > 0 && i % 10 === 0 && at + 0.24 < 58) {
            plan.push(makeWave(at + 0.24, false, rand));
        }
    }
    for (const at of SPECIAL_TIMES) {
        plan.push(makeWave(at, true, rand));
    }
    return plan.sort((a, b) => a.at - b.at);
}

function makeWave(at, special, rand) {
    const startX = 0.42 + rand() * 0.16;
    const targetX = 0.5 + (rand() - 0.5) * 0.96;
    const targetY = 0.15 + rand() * 0.20;
    return {
        at, special, startX, targetX, targetY,
        duration: special ? 1.85 : 2.15,
        side: targetX < 0.5 ? 'left' : 'right'
    };
}

function spawnClay(wave) {
    if (!isPlaying) return;
    const el = document.createElement('div');
    el.className = wave.special ? 'clay clay-gold' : 'clay';
    container.appendChild(el);
    activeClays.push({
        ...wave, el, x: wave.startX * innerWidth, y: innerHeight * 0.85, scale: 1,
        spawnTime: roundStartedAt + wave.at * 1000
    });
}

function retireClay(target) {
    target.el.remove();
    stats.escaped++;
    if (target.side === 'left') stats.lostLeft++;
    else stats.lostRight++;
    resetCombo();
}

function roundLoop(frameTime) {
    if (!isPlaying) return;
    const elapsed = (frameTime - roundStartedAt) / 1000;
    if (elapsed >= ROUND_SECONDS) { endGame(); return; }

    const remaining = Math.ceil(ROUND_SECONDS - elapsed);
    if (remaining !== time) {
        time = remaining;
        timeEl.textContent = time;
    }

    while (nextSpawnIndex < spawnPlan.length && spawnPlan[nextSpawnIndex].at <= elapsed) {
        const wave = spawnPlan[nextSpawnIndex++];
        if (elapsed - wave.at >= wave.duration) {
            // Do not flood DOM after a suspended/throttled tab resumes.
            stats.escaped++;
            if (wave.side === 'left') stats.lostLeft++;
            else stats.lostRight++;
            resetCombo();
        } else spawnClay(wave);
    }

    const width = innerWidth;
    const height = innerHeight;
    for (let i = activeClays.length - 1; i >= 0; i--) {
        const item = activeClays[i];
        const p = Math.max(0, (elapsed - item.at) / item.duration);
        if (p >= 1) { activeClays.splice(i, 1); retireClay(item); continue; }
        const x = (item.startX + (item.targetX - item.startX) * p) * width;
        const y = (0.85 - 4 * (0.85 - item.targetY) * p * (1 - p)) * height;
        item.x = x;
        item.y = y;
        const scale = 1 - p * 0.62;
        item.scale = scale;
        item.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
    }
    roundFrame = requestAnimationFrame(roundLoop);
}

function showGoldFlash(x, y) {
    if (!goldFlash) return;
    goldFlash.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    goldFlash.animate(
        [{ opacity: 0.85, scale: 0.6 }, { opacity: 0, scale: 2.4 }],
        { duration: 360, easing: 'ease-out' }
    );
}

function coachReport() {
    const {shots, hits, goldHits, totalHitTime, hitsLeft, hitsRight, lostLeft, lostRight, escaped} = stats;
    const precision = shots ? Math.round(hits / shots * 100) : 0;
    const avg = hits ? Math.round(totalHitTime * 1000 / hits) : null;
    const leftTotal = hitsLeft + lostLeft;
    const rightTotal = hitsRight + lostRight;
    const leftRate = leftTotal ? Math.round(hitsLeft / leftTotal * 100) : null;
    const rightRate = rightTotal ? Math.round(hitsRight / rightTotal * 100) : null;
    const number = n => n === null ? '—' : `${n}%`;

    coachStats.innerHTML = `
        <div><strong>${precision}%</strong><span>SHOT ACCURACY</span></div>
        <div><strong>${avg === null ? '—' : avg + 'ms'}</strong><span>AVG HIT TIME</span></div>
        <div><strong>${goldHits} / ${SPECIAL_TIMES.length}</strong><span>GOLD HITS</span></div>
        <div><strong>${number(leftRate)} / ${number(rightRate)}</strong><span>LEFT / RIGHT CLEAR</span></div>`;

    const tips = [];
    if (!shots) tips.push('Take your first shot as soon as a target appears.');
    else if (precision < 45) tips.push('Hold your aim until the reticle reaches the clay; avoid rushing the trigger.');
    else if (precision < 70) tips.push('Good start. Focus on controlled first shots to improve precision.');
    else tips.push('Strong accuracy! Maintain this rhythm while tracking faster targets.');

    if (leftTotal >= 4 && rightTotal >= 4 && Math.abs(leftRate - rightRate) >= 20) {
        tips.push(leftRate < rightRate ? 'Your left-side targets need more practice.' : 'Your right-side targets need more practice.');
    } else if (avg !== null && avg > 1100) {
        tips.push('Track the target earlier: shorter time to hit also increases speed bonus.');
    } else if (hits >= 5) {
        tips.push('Keep the gun moving smoothly and reload before the next pair.');
    } else if (escaped >= 3) {
        tips.push('Watch for targets crossing the side of the screen before they disappear.');
    }
    if (goldHits < SPECIAL_TIMES.length) {
        tips.push('Gold clays appear at 15s, 30s and 45s for triple points.');
    }
    coachAdvice.textContent = tips.slice(0, 3).join(' ');
}


// On-demand performance diagnostics: add ?perf=1 to the URL.
// No analytics, storage, API calls, or changes to scoring.
function installPerfMonitor() {
    if (!new URLSearchParams(window.location.search).has('perf')) return;
    const panel = document.createElement('div');
    panel.id = 'perf-monitor';
    panel.style.cssText = [
        'position:fixed', 'left:12px', 'bottom:12px', 'z-index:300',
        'padding:8px 10px', 'border:1px solid #d4aa5b',
        'border-radius:5px', 'background:rgba(0,0,0,.83)',
        'font:12px/1.5 monospace', 'color:#f2d9a6',
        'pointer-events:none', 'white-space:pre'
    ].join(';');
    panel.textContent = 'PERFORMANCE MONITOR';
    document.body.appendChild(panel);
    const deltas = [];
    let previous = 0, lastPaint = 0, longTasks = 0;
    if (typeof PerformanceObserver !== 'undefined') {
        try {
            const observer = new PerformanceObserver(list => {
                longTasks += list.getEntries().length;
            });
            observer.observe({entryTypes:['longtask']});
        } catch (_) {}
    }
    function sample(now) {
        if (previous) {
            deltas.push(now - previous);
            if (deltas.length > 120) deltas.shift();
        }
        previous = now;
        if (now - lastPaint >= 1000 && deltas.length) {
            const total = deltas.reduce((sum, value) => sum + value, 0);
            const fps = Math.round(deltas.length * 1000 / total);
            const slow = deltas.filter(value => value > 33.4).length;
            const worst = Math.round(Math.max(...deltas));
            const heap = performance.memory?.usedJSHeapSize;
            const memory = heap ? (heap / 1048576).toFixed(1) + 'MB' : 'N/A';
            panel.textContent = 'FPS: ' + fps + ' | Slow: ' + slow + '/' + deltas.length +
                '\nWorst: ' + worst + 'ms | Long tasks: ' + longTasks +
                '\nDOM: ' + document.getElementsByTagName('*').length +
                ' | Anim: ' + document.getAnimations().length + ' | JS: ' + memory;
            lastPaint = now;
        }
        requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
}
installPerfMonitor();

function startGame() {
    if (roundFrame !== null) cancelAnimationFrame(roundFrame);
    roundFrame = null;
    if (reloadTimer !== null) {
        clearTimeout(reloadTimer);
        reloadTimer = null;
    }
    fpsGun.classList.remove('gun-reload');
    getAudioContext();
    prepareGunshot();
    score = 0;
    time = ROUND_SECONDS;
    ammo = 2;
    combo = 0;
    maxCombo = 0;
    isReloading = false;
    isPlaying = true;
    resetMobileJoystick();
    if (window.matchMedia('(pointer:coarse)').matches) {
        pointerX = innerWidth * 0.5;
        pointerY = innerHeight * 0.45;
        setCrosshair(pointerX, pointerY);
        updateGunAim(pointerX, pointerY);
    }
    container.classList.add('mobile-playing');
    activeClays.forEach(c => c.el.remove());
    activeClays = [];
    Object.keys(stats).forEach(key => { stats[key] = 0; });
    document.querySelectorAll('.floating-score,.particle').forEach(el => el.remove());
    spawnPlan = makeSpawnPlan();
    nextSpawnIndex = 0;
    roundStartedAt = performance.now();

    updateUI();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    roundFrame = requestAnimationFrame(roundLoop);
}

function endGame() {
    if (!isPlaying) return;
    isPlaying = false;
    resetMobileJoystick();
    container.classList.remove('mobile-playing');
    if (roundFrame !== null) cancelAnimationFrame(roundFrame);
    roundFrame = null;
    if (reloadTimer !== null) {
        clearTimeout(reloadTimer);
        reloadTimer = null;
    }
    isReloading = false;
    fpsGun.classList.remove('gun-reload');
    activeClays.forEach(c => c.el.remove());
    activeClays = [];

    time = 0;
    updateUI();
    finalScoreEl.innerText = score.toLocaleString('en-US');
    maxComboEl.innerText = maxCombo;
    if (resultHitCountEl) resultHitCountEl.textContent = String(stats.hits);
    if (resultAccuracyEl) resultAccuracyEl.textContent = `${stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0}%`;
    if (resultGoldCountEl) resultGoldCountEl.textContent = `${stats.goldHits}/${SPECIAL_TIMES.length}`;
    coachReport();
    gameOverScreen.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

setCrosshair(pointerX, pointerY);
updateGunAim(pointerX, pointerY);
