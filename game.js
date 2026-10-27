/**
 * TREINO DE MIRA - VALORANT AIM LAB PRO
 * Motor de física 3D (Three.js), física de rotação autêntica do Valorant,
 * Modos de treino, cálculo em tempo real e relatório de análise de precisão.
 */

// Estado global da aplicação
const state = {
    // Configurações do Valorant
    sens: 0.40,
    dpi: 800,
    invertY: false,
    engineMode: '3d', // '3d' ou '2d'
    
    // Configurações da mira
    crosshair: {
        color: '#00ffff',
        length: 6,
        thickness: 2,
        gap: 4,
        centerDot: false,
        outline: true
    },

    // Configurações de alvos e áudio
    targetColor: '#ff4655',
    targetSize: 'medium', // small, medium, large
    masterVolume: 0.7,
    sfxVolume: 0.8,

    // Sessão de treino ativa
    selectedTime: 30,
    customTime: 45,
    selectedMode: 'gridshot', // 'gridshot', 'spidershot', 'tracking'
    
    isPlaying: false,
    isPaused: false,
    timeLeft: 30,
    timerInterval: null,
    
    // Estatísticas da sessão atual
    totalShots: 0,
    hits: 0,
    misses: 0,
    score: 0,
    currentStreak: 0,
    bestStreak: 0,
    reactionTimes: [],

    // Histórico salvo
    history: []
};

// -------------------------------------------------------------
// INICIALIZAÇÃO & PERSISTÊNCIA (LocalStorage)
// -------------------------------------------------------------

function loadSettings() {
    try {
        const saved = localStorage.getItem('val_aim_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
        }
        const savedHist = localStorage.getItem('val_aim_history');
        if (savedHist) {
            state.history = JSON.parse(savedHist);
        }
    } catch (e) {
        console.warn('Erro ao carregar configurações salvas:', e);
    }
}

function saveSettings() {
    try {
        const toSave = {
            sens: state.sens,
            dpi: state.dpi,
            invertY: state.invertY,
            engineMode: state.engineMode,
            crosshair: state.crosshair,
            targetColor: state.targetColor,
            targetSize: state.targetSize,
            masterVolume: state.masterVolume,
            sfxVolume: state.sfxVolume
        };
        localStorage.setItem('val_aim_settings', JSON.stringify(toSave));
    } catch (e) {
        console.warn('Erro ao salvar configurações:', e);
    }
}

function saveHistorySession(sessionData) {
    state.history.unshift(sessionData);
    if (state.history.length > 20) state.history.pop();
    try {
        localStorage.setItem('val_aim_history', JSON.stringify(state.history));
    } catch (e) {
        console.warn('Erro ao salvar histórico:', e);
    }
}

// -------------------------------------------------------------
// CÁLCULOS DO VALORANT: eDPI & ROTAÇÃO DO MOUSE
// -------------------------------------------------------------

// Valorant m_yaw padrão: 0.07 graus por contagem do mouse
const VALORANT_YAW_DEG_PER_COUNT = 0.07;
const DEG_TO_RAD = Math.PI / 180;

function calculateEDPI() {
    return Math.round(state.sens * state.dpi);
}

function updateEDPIDisplays() {
    const edpi = calculateEDPI();
    const sensFormatted = Number(state.sens).toFixed(2);
    
    // Header
    const hSens = document.getElementById('headerSensDisplay');
    const hEdpi = document.getElementById('headerEdpiDisplay');
    if (hSens) hSens.textContent = sensFormatted;
    if (hEdpi) hEdpi.textContent = edpi;

    // Lobby
    const lSens = document.getElementById('lobbySensVal');
    const lDpi = document.getElementById('lobbyDpiVal');
    const lEdpi = document.getElementById('lobbyEdpiVal');
    if (lSens) lSens.textContent = sensFormatted;
    if (lDpi) lDpi.textContent = state.dpi;
    if (lEdpi) lEdpi.textContent = edpi;

    // Settings Modal
    const sEdpi = document.getElementById('settingEdpi');
    if (sEdpi) sEdpi.textContent = edpi;

    const catText = document.getElementById('edpiCategoryText');
    if (catText) {
        if (edpi < 200) {
            catText.innerHTML = `<strong>Sensibilidade Baixa (${edpi} eDPI):</strong> Excelente estabilidade e micro-ajustes finos a longa distância (estilo Yay). Requer mousepad grande para movimentos com o braço.`;
        } else if (edpi <= 350) {
            catText.innerHTML = `<strong>Faixa dos Profissionais (${edpi} eDPI):</strong> Padrão ideal (estilo aspas, TenZ, Derke). Equilíbrio perfeito entre precisão de headshot e facilidade para virar 180°.`;
        } else if (edpi <= 500) {
            catText.innerHTML = `<strong>Sensibilidade Média-Alta (${edpi} eDPI):</strong> Muito ágil para checar múltiplos cantos e jogar de duelista (Jett/Raze), mas exige excelente controle de pulso para não passar da cabeça.`;
        } else {
            catText.innerHTML = `<strong>Sensibilidade Muito Alta (${edpi} eDPI):</strong> Rápida, porém pode prejudicar a consistência de cliques à distância. Considere reduzir gradualmente se notar muitos tiros errados.`;
        }
    }
}

// -------------------------------------------------------------
// CUSTOMIZAÇÃO DA MIRA (CROSSHAIR)
// -------------------------------------------------------------

function applyCrosshairStyles(crosshairEl) {
    if (!crosshairEl) return;
    const c = state.crosshair;
    
    // Dot central
    const dot = crosshairEl.querySelector('.crosshair-center-dot');
    if (dot) {
        if (c.centerDot) {
            dot.style.display = 'block';
            dot.style.width = '3px';
            dot.style.height = '3px';
            dot.style.backgroundColor = c.color;
            if (c.outline) {
                dot.style.outline = '1px solid #000';
            } else {
                dot.style.outline = 'none';
            }
        } else {
            dot.style.display = 'none';
        }
    }

    // 4 Linhas da mira
    const top = crosshairEl.querySelector('.ch-top');
    const bottom = crosshairEl.querySelector('.ch-bottom');
    const left = crosshairEl.querySelector('.ch-left');
    const right = crosshairEl.querySelector('.ch-right');

    const outlineStyle = c.outline ? '1px solid rgba(0,0,0,0.9)' : 'none';

    if (top && bottom && left && right) {
        // Linhas verticais
        [top, bottom].forEach(el => {
            el.style.width = `${c.thickness}px`;
            el.style.height = `${c.length}px`;
            el.style.backgroundColor = c.color;
            el.style.outline = outlineStyle;
        });
        top.style.transform = `translateY(-${c.gap + c.length}px)`;
        bottom.style.transform = `translateY(${c.gap}px)`;

        // Linhas horizontais
        [left, right].forEach(el => {
            el.style.height = `${c.thickness}px`;
            el.style.width = `${c.length}px`;
            el.style.backgroundColor = c.color;
            el.style.outline = outlineStyle;
        });
        left.style.transform = `translateX(-${c.gap + c.length}px)`;
        right.style.transform = `translateX(${c.gap}px)`;
    }
}

function updateCrosshairs() {
    applyCrosshairStyles(document.getElementById('crosshairElement'));
    applyCrosshairStyles(document.getElementById('previewCrosshair'));
}

// -------------------------------------------------------------
// MOTOR 3D (THREE.JS) - THE RANGE DO VALORANT
// -------------------------------------------------------------

let scene, camera, renderer, raycaster;
let targets3D = [];
let particles3D = [];
let cameraYaw = 0;
let cameraPitch = 0;
let isPointerLocked = false;
let animationFrameId = null;

const TARGET_RADII = {
    small: 0.6,
    medium: 0.9,
    large: 1.3
};

function init3D() {
    const container = document.getElementById('threeContainer');
    if (!container || !window.THREE) return;

    // Limpa se já existir
    container.innerHTML = '';
    targets3D = [];
    particles3D = [];

    // Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f15);
    scene.fog = new THREE.FogExp2(0x0a0f15, 0.015);

    // Câmera com FOV horizontal idêntico ao Valorant (103° horizontal)
    const aspect = window.innerWidth / window.innerHeight;
    const verticalFov = 2 * Math.atan(Math.tan((103 * Math.PI) / 360) / aspect) * (180 / Math.PI);
    camera = new THREE.PerspectiveCamera(verticalFov, aspect, 0.1, 1000);
    camera.position.set(0, 1.8, 0); // Altura de pé do agente
    camera.rotation.order = 'YXZ';

    // Renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    // Luzes da Arena
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(0xff4655, 1.2, 50);
    accentLight.position.set(0, 8, -12);
    scene.add(accentLight);

    const cyanLight = new THREE.PointLight(0x00f5d4, 0.8, 50);
    cyanLight.position.set(0, 8, 12);
    scene.add(cyanLight);

    build3DArena();

    // Redimensionamento
    window.addEventListener('resize', onWindowResize);
}

function build3DArena() {
    // Estande futurista / The Range
    const roomWidth = 50;
    const roomHeight = 22;
    const roomDepth = 40;

    // Piso com grade tecnológica
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth, 30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x121b24,
        roughness: 0.4,
        metalness: 0.6,
        wireframe: false
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Linhas de grid no chão
    const grid = new THREE.GridHelper(roomWidth, 30, 0xff4655, 0x1f2c39);
    grid.position.y = 0.02;
    scene.add(grid);

    // Parede de alvos no fundo (Z = -22)
    const wallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x182430,
        roughness: 0.6,
        metalness: 0.3
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, roomHeight / 2, -22);
    scene.add(backWall);

    // Faixa neon na parede de alvos
    const neonStripeGeo = new THREE.PlaneGeometry(roomWidth, 0.4);
    const neonStripeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const neonStripe = new THREE.Mesh(neonStripeGeo, neonStripeMat);
    neonStripe.position.set(0, 3.2, -21.9);
    scene.add(neonStripe);

    // Paredes laterais
    const sideWallMat = new THREE.MeshStandardMaterial({ color: 0x0e1720 });
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), sideWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), sideWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    scene.add(rightWall);

    // Teto com estrutura
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), sideWallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomHeight;
    scene.add(ceiling);
}

function spawn3DTarget(options = {}) {
    if (!scene) return null;

    const radius = TARGET_RADII[state.targetSize] || 0.9;
    
    // Grupo do alvo para permitir animação de pulso/efeito
    const targetGroup = new THREE.Group();

    // Esfera central brilhante
    const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(state.targetColor),
        emissive: new THREE.Color(state.targetColor),
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    targetGroup.add(sphere);

    // Núcleo central (Headshot bullseye)
    const coreGeo = new THREE.SphereGeometry(radius * 0.4, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    targetGroup.add(core);

    // Anel externo sci-fi
    const ringGeo = new THREE.TorusGeometry(radius * 1.15, 0.04, 16, 40);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    targetGroup.add(ring);

    // Posição no campo de tiro
    const posX = options.x !== undefined ? options.x : (Math.random() * 22 - 11);
    const posY = options.y !== undefined ? options.y : (Math.random() * 6 + 1.2);
    const posZ = options.z !== undefined ? options.z : (Math.random() * 4 - 20); // Profundidade entre -16 e -20

    targetGroup.position.set(posX, posY, posZ);

    targetGroup.userData = {
        isTarget: true,
        spawnTime: Date.now(),
        initialScale: 0.1,
        targetScale: 1,
        mode: state.selectedMode,
        // Propriedades para modo Tracking
        velX: (Math.random() - 0.5) * 4,
        velY: (Math.random() - 0.5) * 2
    };

    targetGroup.scale.set(0.1, 0.1, 0.1); // Animação de spawn (surge crescendo)
    scene.add(targetGroup);
    targets3D.push(targetGroup);

    return targetGroup;
}

function clear3DTargets() {
    if (!scene) return;
    targets3D.forEach(target => scene.remove(target));
    targets3D = [];
    particles3D.forEach(p => scene.remove(p.mesh));
    particles3D = [];
}

function spawnHitParticles(position) {
    if (!scene) return;
    const count = 14;
    for (let i = 0; i < count; i++) {
        const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const pMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(state.targetColor) });
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6 + 2,
            (Math.random() - 0.5) * 6
        );

        particles3D.push({ mesh, velocity, life: 1.0 });
        scene.add(mesh);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    const aspect = window.innerWidth / window.innerHeight;
    const verticalFov = 2 * Math.atan(Math.tan((103 * Math.PI) / 360) / aspect) * (180 / Math.PI);
    camera.fov = verticalFov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const historyModal = document.getElementById('historyModal');
    if (historyModal && !historyModal.classList.contains('hidden')) {
        renderHistory();
    }
}

// Loop de animação 3D
function animate3D() {
    if (!state.isPlaying) return;

    animationFrameId = requestAnimationFrame(animate3D);

    const now = Date.now();

    // Atualização dos alvos 3D
    targets3D.forEach((target, index) => {
        // Animação suave de entrada (pop-in)
        if (target.scale.x < target.userData.targetScale) {
            const newScale = Math.min(target.userData.targetScale, target.scale.x + 0.12);
            target.scale.set(newScale, newScale, newScale);
        }

        // Rotação suave do anel externo
        target.children[2].rotation.z += 0.02;

        // Comportamento no modo Tracking
        if (state.selectedMode === 'tracking') {
            target.position.x += target.userData.velX * 0.016;
            target.position.y += target.userData.velY * 0.016;

            // Limites da parede
            if (target.position.x > 11 || target.position.x < -11) {
                target.userData.velX *= -1;
            }
            if (target.position.y > 7 || target.position.y < 1.2) {
                target.userData.velY *= -1;
            }
        }
    });

    // Atualização das partículas de explosão
    for (let i = particles3D.length - 1; i >= 0; i--) {
        const p = particles3D[i];
        p.life -= 0.04;
        p.mesh.position.addScaledVector(p.velocity, 0.016);
        p.velocity.y -= 0.15; // Gravidade
        p.mesh.scale.setScalar(p.life);

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles3D.splice(i, 1);
        }
    }

    // Atualização da orientação da Câmera (Valorant Yaw/Pitch)
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;

    renderer.render(scene, camera);
}

// -------------------------------------------------------------
// CONTROLE DO MOUSE: POINTER LOCK & SENSIBILIDADE DO VALORANT
// -------------------------------------------------------------

function setupMouseControls() {
    const arena = document.getElementById('gameArena');
    const lockOverlay = document.getElementById('clickToLockOverlay');
    const btnLock = document.getElementById('btnLockPointer');

    // Ao clicar na arena ou botão de lock, bloqueia o ponteiro
    const requestLock = () => {
        if (!state.isPlaying || state.isPaused) return;
        try {
            arena.requestPointerLock = arena.requestPointerLock || arena.mozRequestPointerLock;
            arena.requestPointerLock();
        } catch (e) {
            console.warn('Pointer Lock não permitido:', e);
        }
    };

    if (btnLock) btnLock.addEventListener('click', requestLock);
    if (arena) arena.addEventListener('click', (e) => {
        if (!isPointerLocked && state.isPlaying) {
            requestLock();
        } else if (isPointerLocked && state.isPlaying && !state.isPaused) {
            handleShoot(e);
        }
    });

    // Eventos de alteração de lock
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mozpointerlockchange', onPointerLockChange);

    // Movimentação do mouse
    document.addEventListener('mousemove', onMouseMove);

    // Tecla ESC para pausar/desbloquear
    document.addEventListener('keydown', onKeyDown);
}

function onPointerLockChange() {
    const arena = document.getElementById('gameArena');
    const lockOverlay = document.getElementById('clickToLockOverlay');
    const pauseOverlay = document.getElementById('pauseOverlay');

    if (document.pointerLockElement === arena || document.mozPointerLockElement === arena) {
        isPointerLocked = true;
        if (lockOverlay) lockOverlay.classList.add('hidden');
        if (state.isPaused) resumeGame();
    } else {
        isPointerLocked = false;
        if (state.isPlaying && !state.isPaused) {
            // Se o jogo está rolando e o mouse destravou (ex: apertou ESC ou Alt-Tab), exibe pausa
            pauseGame();
        }
    }
}

function onMouseMove(e) {
    if (!state.isPlaying || state.isPaused || !isPointerLocked) return;

    const movementX = e.movementX || e.mozMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || 0;

    // FÓRMULA AUTÊNTICA DO VALORANT:
    // graus = movimento * sensibilidade * 0.07
    // radianos = graus * (Math.PI / 180)
    const factor = state.sens * VALORANT_YAW_DEG_PER_COUNT * DEG_TO_RAD;

    // Rotação horizontal (Yaw)
    cameraYaw -= movementX * factor;

    // Rotação vertical (Pitch) com limite para não quebrar a câmera
    const pitchFactor = state.invertY ? -factor : factor;
    cameraPitch -= movementY * pitchFactor;

    const maxPitch = (Math.PI / 2) - 0.05; // ~87 graus
    cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraPitch));
}

function onKeyDown(e) {
    if (e.key === 'Escape' || e.code === 'Escape') {
        if (state.isPlaying) {
            if (state.isPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    }
}

// -------------------------------------------------------------
// MECÂNICA DE TIRO, ACERTO E HITMARKER
// -------------------------------------------------------------

function handleShoot(e) {
    if (!state.isPlaying || state.isPaused) return;

    // 1. Som de disparo da arma
    if (window.soundManager) window.soundManager.playShot();

    state.totalShots++;

    let hitSuccess = false;

    if (scene && camera && raycaster) {
        // Disparo central da mira (0, 0 no espaço NDC)
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        // Checa interseção com as esferas dos alvos
        const intersects = raycaster.intersectObjects(targets3D, true);

        if (intersects.length > 0) {
            // Encontra o grupo raiz do alvo
            let hitGroup = intersects[0].object;
            while (hitGroup.parent && hitGroup.parent !== scene) {
                hitGroup = hitGroup.parent;
            }

            const targetIndex = targets3D.indexOf(hitGroup);
            if (targetIndex !== -1) {
                hitSuccess = true;
                const reactionTime = Date.now() - hitGroup.userData.spawnTime;
                state.reactionTimes.push(reactionTime);

                // Partículas 3D no local do impacto
                spawnHitParticles(intersects[0].point);

                // Remove o alvo atingido
                scene.remove(hitGroup);
                targets3D.splice(targetIndex, 1);

                // Respawn dependendo do modo
                onTargetHit(reactionTime);
            }
        }
    }

    if (hitSuccess) {
        state.hits++;
        state.currentStreak++;
        if (state.currentStreak > state.bestStreak) state.bestStreak = state.currentStreak;
        
        // Bônus de pontuação com streak
        const streakMultiplier = Math.min(3, 1 + state.currentStreak * 0.1);
        state.score += Math.round(100 * streakMultiplier);

        // Som de Headshot Ding
        if (window.soundManager) window.soundManager.playHit();

        // Hitmarker X animado
        triggerHitMarker();

        // Floating score indicator
        showFloatingScore('+100');
    } else {
        state.misses++;
        state.currentStreak = 0;
        if (window.soundManager) window.soundManager.playMiss();
    }

    updateHUD();
}

function onTargetHit(reactionTime) {
    if (state.selectedMode === 'gridshot') {
        // No Gridshot sempre mantemos 3 alvos ativos
        spawn3DTarget();
    } else if (state.selectedMode === 'spidershot') {
        // No Spidershot é 1 alvo por vez
        setTimeout(() => {
            if (state.isPlaying) {
                spawn3DTarget();
            }
        }, 80);
    } else if (state.selectedMode === 'tracking') {
        // No Tracking se o alvo for destruído surge outro
        setTimeout(() => {
            if (state.isPlaying) {
                spawn3DTarget();
            }
        }, 100);
    }
}

function triggerHitMarker() {
    const hm = document.getElementById('hitMarker');
    if (!hm) return;
    hm.classList.remove('active');
    void hm.offsetWidth; // Force reflow
    hm.classList.add('active');
    setTimeout(() => {
        hm.classList.remove('active');
    }, 90);
}

function showFloatingScore(text) {
    const arena = document.getElementById('gameArena');
    if (!arena) return;

    const floater = document.createElement('div');
    floater.className = 'score-floater';
    floater.textContent = text;
    floater.style.left = `${window.innerWidth / 2 + (Math.random() * 40 - 20)}px`;
    floater.style.top = `${window.innerHeight / 2 - 30}px`;

    arena.appendChild(floater);
    setTimeout(() => {
        if (floater.parentNode) floater.parentNode.removeChild(floater);
    }, 600);
}

// -------------------------------------------------------------
// FLUXO DO JOGO: START, COUNTDOWN, TIMER, PAUSE, FIM DE JOGO
// -------------------------------------------------------------

function startTrainingSession() {
    // Esconde lobby e resultados
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('resultsModal').classList.add('hidden');
    document.getElementById('settingsModal').classList.add('hidden');
    document.getElementById('historyModal').classList.add('hidden');

    const arena = document.getElementById('gameArena');
    arena.classList.remove('hidden');

    // Inicializa e limpa o estande 3D
    const threeCont = document.getElementById('threeContainer');
    threeCont.classList.remove('hidden');
    if (!scene) init3D();
    clear3DTargets();

    // Reseta métricas
    state.totalShots = 0;
    state.hits = 0;
    state.misses = 0;
    state.score = 0;
    state.currentStreak = 0;
    state.bestStreak = 0;
    state.reactionTimes = [];
    state.isPaused = false;

    // Tempo total selecionado
    state.timeLeft = state.selectedTime === 'custom' ? Number(state.customTime) : Number(state.selectedTime);
    if (!state.timeLeft || state.timeLeft <= 0) state.timeLeft = 30;

    updateHUD();

    // Contagem Regressiva: 3, 2, 1, VAI!
    runCountdown(() => {
        state.isPlaying = true;

        // Reseta rotação da câmera para o centro
        cameraYaw = 0;
        cameraPitch = 0;

        // Spawna alvos iniciais
        if (state.selectedMode === 'gridshot') {
            for (let i = 0; i < 3; i++) {
                spawn3DTarget();
            }
        } else {
            spawn3DTarget();
        }

        // Tenta travar o ponteiro do mouse
        try {
            arena.requestPointerLock = arena.requestPointerLock || arena.mozRequestPointerLock;
            arena.requestPointerLock();
        } catch (e) {
            console.log(e);
        }

        // Inicia loop de renderização e cronômetro
        animate3D();
        startTimer();
    });
}

function runCountdown(onFinish) {
    const overlay = document.getElementById('countdownOverlay');
    const numEl = document.getElementById('countdownNumber');
    overlay.classList.remove('hidden');

    let count = 3;
    numEl.textContent = count;
    if (window.soundManager) window.soundManager.playCountdown(false);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numEl.textContent = count;
            if (window.soundManager) window.soundManager.playCountdown(false);
        } else if (count === 0) {
            numEl.textContent = 'VAI!';
            if (window.soundManager) window.soundManager.playCountdown(true);
        } else {
            clearInterval(interval);
            overlay.classList.add('hidden');
            if (onFinish) onFinish();
        }
    }, 900);
}

function startTimer() {
    clearInterval(state.timerInterval);
    const totalTime = state.timeLeft;

    state.timerInterval = setInterval(() => {
        if (!state.isPaused && state.isPlaying) {
            state.timeLeft = Math.max(0, state.timeLeft - 0.1);
            updateHUD(totalTime);

            if (state.timeLeft <= 0) {
                clearInterval(state.timerInterval);
                finishTrainingSession();
            }
        }
    }, 100);
}

function updateHUD(totalDuration = null) {
    const timerEl = document.getElementById('hudTimer');
    const progressFill = document.getElementById('hudProgressFill');
    const accEl = document.getElementById('hudAccuracy');
    const scoreEl = document.getElementById('hudScore');
    const hitsEl = document.getElementById('hudHits');
    const shotsEl = document.getElementById('hudShots');
    const streakEl = document.getElementById('hudStreak');

    if (timerEl) timerEl.textContent = `${state.timeLeft.toFixed(1)}s`;

    if (progressFill && totalDuration) {
        const pct = (state.timeLeft / totalDuration) * 100;
        progressFill.style.width = `${pct}%`;
    }

    const accuracy = state.totalShots > 0 ? (state.hits / state.totalShots) * 100 : 100;
    if (accEl) accEl.textContent = `${accuracy.toFixed(1)}%`;

    if (scoreEl) scoreEl.textContent = state.score;
    if (hitsEl) hitsEl.textContent = state.hits;
    if (shotsEl) shotsEl.textContent = state.totalShots;
    if (streakEl) streakEl.textContent = `${state.currentStreak}x`;
}

function pauseGame() {
    state.isPaused = true;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
}

function resumeGame() {
    state.isPaused = false;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    const arena = document.getElementById('gameArena');
    if (arena && arena.requestPointerLock) arena.requestPointerLock();
}

function finishTrainingSession() {
    state.isPlaying = false;
    clearInterval(state.timerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Destrava cursor
    if (document.exitPointerLock) document.exitPointerLock();

    // Som de encerramento
    if (window.soundManager) window.soundManager.playRoundEnd();

    // Calcula análise de dados
    showResultsAnalysis();
}

// -------------------------------------------------------------
// RELATÓRIO DE ANÁLISE DE PRECISÃO & CLASSIFICAÇÃO VALORANT
// -------------------------------------------------------------

function calculateValorantRank(accuracy, avgReaction) {
    // Classificação inteligente inspirada nos elos do Valorant
    if (accuracy >= 95 && avgReaction > 0 && avgReaction <= 320) {
        return {
            name: 'RADIANTE',
            badgeClass: 'rank-radiant',
            desc: 'Reflexos de nível mundial e precisão cirúrgica de Vandal. Memória muscular no ápice!',
            status: 'Precisão Impecável (Radiante)'
        };
    } else if (accuracy >= 90 && avgReaction <= 380) {
        return {
            name: 'IMORTAL III',
            badgeClass: 'rank-immortal',
            desc: 'Consistência incrível. Quase nenhum tiro desperdiçado, excelente micro-ajuste.',
            status: 'Precisão Excelente'
        };
    } else if (accuracy >= 84) {
        return {
            name: 'ASCENDENTE',
            badgeClass: 'rank-ascendant',
            desc: 'Mira muito acima da média. Mantendo esse ritmo você domina qualquer lobby ranqueado.',
            status: 'Alto Rendimento'
        };
    } else if (accuracy >= 76) {
        return {
            name: 'DIAMANTE',
            badgeClass: 'rank-diamond',
            desc: 'Bom aproveitamento de tiros e firmeza de crosshair placement.',
            status: 'Consistente'
        };
    } else if (accuracy >= 68) {
        return {
            name: 'PLATINA',
            badgeClass: 'rank-platinum',
            desc: 'Boa agilidade! Com foco em controlar o primeiro clique, você subirá rápido.',
            status: 'Bom Nível'
        };
    } else if (accuracy >= 58) {
        return {
            name: 'OURO',
            badgeClass: 'rank-gold',
            desc: 'Taxa razoável. Tente diminuir ligeiramente a velocidade para garantir o acerto.',
            status: 'Em Desenvolvimento'
        };
    } else if (accuracy >= 45) {
        return {
            name: 'PRATA',
            badgeClass: 'rank-silver',
            desc: 'Muitos tiros no vazio antes de alinhar no alvo. Treine respirar antes do clique.',
            status: 'Calibrando'
        };
    } else {
        return {
            name: 'BRONZE / FERRO',
            badgeClass: 'rank-bronze',
            desc: 'Ajuste sua sensibilidade no menu para encontrar a velocidade certa para seu braço/pulso.',
            status: 'Precisa de Calibração'
        };
    }
}

function generateCoachTip(accuracy, avgReaction, misses) {
    if (accuracy >= 92) {
        return 'Sua taxa de acerto está excelente! Para subir de nível, desafie-se a atirar com mais velocidade mantendo acima de 90%.';
    } else if (misses > 15) {
        return 'Você acumulou muitos disparos perdidos. Lembre-se: no Valorant, o primeiro tiro certeiro na cabeça vale mais do que atirar correndo.';
    } else if (avgReaction > 450) {
        return 'Seu tempo de reação foi um pouco elevado. Experimente fixar a mira perto do surgimento provável do alvo para micro-corrigir.';
    } else {
        return 'Consistência vem com repetição diária de 10 a 15 minutos. Mantenha seu eDPI constante para fixar a memória muscular!';
    }
}

function showResultsAnalysis() {
    const modal = document.getElementById('resultsModal');
    if (!modal) return;

    // Métricas principais
    const accuracy = state.totalShots > 0 ? (state.hits / state.totalShots) * 100 : 0;
    const avgReaction = state.reactionTimes.length > 0 
        ? Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length) 
        : 0;

    const sessionDuration = state.selectedTime === 'custom' ? Number(state.customTime) : Number(state.selectedTime);
    const shotsPerSec = sessionDuration > 0 ? (state.totalShots / sessionDuration).toFixed(1) : 0;

    const rankInfo = calculateValorantRank(accuracy, avgReaction);
    const coachTip = generateCoachTip(accuracy, avgReaction, state.misses);

    // Atualização dos elementos no Modal de Resultados
    document.getElementById('resAccuracy').textContent = accuracy.toFixed(1);
    document.getElementById('resAccuracyStatus').textContent = rankInfo.status;
    document.getElementById('resRankName').textContent = rankInfo.name;
    document.getElementById('resRankDesc').textContent = rankInfo.desc;

    document.getElementById('resHits').textContent = state.hits;
    document.getElementById('resMisses').textContent = state.misses;
    document.getElementById('resTotalShots').textContent = state.totalShots;
    document.getElementById('resAvgReaction').textContent = avgReaction > 0 ? `${avgReaction} ms` : '--';
    document.getElementById('resShotsPerSec').textContent = shotsPerSec;
    document.getElementById('resBestStreak').textContent = `${state.bestStreak}x`;
    document.getElementById('resFinalScore').textContent = state.score;
    document.getElementById('resCoachTip').textContent = coachTip;

    const modeLabels = {
        gridshot: 'GRIDSHOT (FLICK)',
        spidershot: 'MICRO-ADJUST',
        tracking: 'RASTREIO (TRACKING)'
    };
    document.getElementById('resModeBadge').textContent = `${modeLabels[state.selectedMode] || 'TREINO'} - ${sessionDuration}s`;

    // Salva no histórico
    saveHistorySession({
        date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        mode: modeLabels[state.selectedMode] || state.selectedMode,
        duration: sessionDuration,
        accuracy: accuracy.toFixed(1),
        hits: state.hits,
        totalShots: state.totalShots,
        avgReaction,
        rank: rankInfo.name,
        score: state.score
    });

    modal.classList.remove('hidden');
}

// -------------------------------------------------------------
// HISTÓRICO DE TREINOS & GRÁFICO DE EVOLUÇÃO
// -------------------------------------------------------------

let currentChartMetric = 'score'; // 'score' ou 'accuracy'

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    const count = state.history ? state.history.length : 0;

    // Elementos de Resumo
    const bestScoreEl = document.getElementById('histBestScore');
    const bestAccEl = document.getElementById('histBestAcc');
    const bestRankEl = document.getElementById('histBestRank');
    const avgScoreEl = document.getElementById('histAvgScore');
    const avgAccEl = document.getElementById('histAvgAcc');
    const avgReactionEl = document.getElementById('histAvgReaction');
    const totalSessionsEl = document.getElementById('histTotalSessions');
    const consistencyEl = document.getElementById('histConsistencyText');

    if (count === 0) {
        if (bestScoreEl) bestScoreEl.textContent = '0';
        if (bestAccEl) bestAccEl.textContent = '0%';
        if (bestRankEl) bestRankEl.textContent = '--';
        if (avgScoreEl) avgScoreEl.textContent = '0';
        if (avgAccEl) avgAccEl.textContent = '0%';
        if (avgReactionEl) avgReactionEl.textContent = '--';
        if (totalSessionsEl) totalSessionsEl.textContent = '0';
        if (consistencyEl) consistencyEl.textContent = 'Iniciando';

        list.innerHTML = `<div class="empty-history">Nenhum treino realizado ainda. Inicie sua primeira análise para começar a registrar seus recordes e visualizar seu gráfico de evolução!</div>`;
        drawHistoryChart([], 0, 0);
        return;
    }

    // Calcula Estatísticas Globais
    let bestSession = state.history[0];
    let totalScore = 0;
    let totalAcc = 0;
    let totalReaction = 0;
    let validReactions = 0;

    state.history.forEach(item => {
        const itemScore = Number(item.score) || 0;
        const itemAcc = parseFloat(item.accuracy) || 0;
        const itemReact = parseInt(item.avgReaction) || 0;

        if (itemScore > (bestSession.score || 0)) {
            bestSession = item;
        }

        totalScore += itemScore;
        totalAcc += itemAcc;
        if (itemReact > 0) {
            totalReaction += itemReact;
            validReactions++;
        }
    });

    const avgScore = Math.round(totalScore / count);
    const avgAccuracy = (totalAcc / count).toFixed(1);
    const avgReactionTime = validReactions > 0 ? Math.round(totalReaction / validReactions) : 0;

    // Atualiza Cards de Resumo
    if (bestScoreEl) bestScoreEl.textContent = bestSession.score.toLocaleString('pt-BR');
    if (bestAccEl) bestAccEl.textContent = `${bestSession.accuracy}%`;
    if (bestRankEl) bestRankEl.textContent = bestSession.rank || '--';

    if (avgScoreEl) avgScoreEl.textContent = avgScore.toLocaleString('pt-BR');
    if (avgAccEl) avgAccEl.textContent = `${avgAccuracy}%`;
    if (avgReactionEl) avgReactionEl.textContent = avgReactionTime > 0 ? `${avgReactionTime} ms` : '--';

    if (totalSessionsEl) totalSessionsEl.textContent = count;
    if (consistencyEl) {
        if (count >= 10) consistencyEl.textContent = 'Alta (Frequente)';
        else if (count >= 5) consistencyEl.textContent = 'Boa (Constante)';
        else if (count >= 2) consistencyEl.textContent = 'Em Construção';
        else consistencyEl.textContent = 'Iniciando';
    }

    // Renderiza o Gráfico no Canvas
    drawHistoryChart(state.history, avgScore, avgAccuracy, bestSession);

    // Renderiza Lista Detalhada
    list.innerHTML = state.history.map((item, index) => {
        const isBest = item === bestSession || (item.score === bestSession.score && item.date === bestSession.date);
        return `
            <div class="history-item ${isBest ? 'is-record' : ''}">
                <div class="hist-left">
                    <span class="hist-mode">
                        ${item.mode} (${item.duration}s)
                        ${isBest ? '<span class="record-pill">★ RECORDE</span>' : ''}
                    </span>
                    <span class="hist-date">${item.date} • ${item.hits}/${item.totalShots} acertos • ${item.avgReaction ? item.avgReaction + 'ms' : ''}</span>
                </div>
                <div class="hist-right">
                    <span class="hist-score">${item.score} pts</span>
                    <span class="hist-acc">${item.accuracy}%</span>
                    <span class="hist-rank">${item.rank}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Desenha o gráfico de evolução profissional no Canvas
 * com curva de dados, linha de média tracejada e destaque do melhor recorde
 */
function drawHistoryChart(history, avgScore, avgAccuracy, bestSession = null) {
    const canvas = document.getElementById('historyChartCanvas');
    if (!canvas) return;

    // Ajusta tamanho real de tela e densidade de pixels (Retina / High-DPI)
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width > 50 ? rect.width : 700;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (!history || history.length === 0) {
        ctx.fillStyle = 'rgba(236, 232, 225, 0.4)';
        ctx.font = '13px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado registrado para exibir no gráfico ainda.', width / 2, height / 2);
        return;
    }

    // Ordena dados cronologicamente do mais antigo para o mais recente (esquerda para direita)
    const dataPoints = [...history].reverse();
    const isScore = currentChartMetric === 'score';

    const values = dataPoints.map(item => isScore ? Number(item.score) : parseFloat(item.accuracy));
    const avgVal = isScore ? avgScore : parseFloat(avgAccuracy);
    const unit = isScore ? ' pts' : '%';

    // Determina limites do eixo Y
    const maxVal = Math.max(...values, avgVal, isScore ? 500 : 50);
    const minVal = isScore ? 0 : Math.max(0, Math.min(...values, avgVal) - 15);
    const range = (maxVal - minVal) * 1.25 || 1; // Espaço de folga no topo

    // Margens do gráfico
    const padding = { top: 28, right: 35, bottom: 32, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getY = (val) => padding.top + chartH - ((val - minVal) / range) * chartH;
    const getX = (idx) => {
        if (dataPoints.length === 1) return padding.left + chartW / 2;
        return padding.left + (idx / (dataPoints.length - 1)) * chartW;
    };

    // 1. Grade de Fundo Sci-Fi
    const gridLines = 4;
    ctx.strokeStyle = 'rgba(236, 232, 225, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(236, 232, 225, 0.45)';
    ctx.font = '10px Rajdhani, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
        const val = minVal + (range / gridLines) * i;
        const y = padding.top + chartH - (i / gridLines) * chartH;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillText(`${Math.round(val)}${unit}`, padding.left - 8, y + 3);
    }

    // 2. Linha de Média Tracejada (Amarela)
    const avgY = getY(avgVal);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(width - padding.right, avgY);
    ctx.stroke();
    ctx.restore();

    // Rótulo da Média
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`MÉDIA: ${avgVal}${unit}`, width - padding.right, avgY - 6);

    // 3. Preenchimento de Gradiente sob a Curva
    if (dataPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(values[0]));
        for (let i = 1; i < dataPoints.length; i++) {
            ctx.lineTo(getX(i), getY(values[i]));
        }
        ctx.lineTo(getX(dataPoints.length - 1), padding.top + chartH);
        ctx.lineTo(getX(0), padding.top + chartH);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, 'rgba(0, 245, 212, 0.28)');
        gradient.addColorStop(1, 'rgba(0, 245, 212, 0.01)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // 4. Linha Principal de Dados (Ciano Neon)
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 245, 212, 0.6)';
    ctx.shadowBlur = 10;

    dataPoints.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // 5. Nós e Destaque do Melhor Recorde
    dataPoints.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(values[i]);
        const isBest = isScore 
            ? (Number(pt.score) === (bestSession ? bestSession.score : Math.max(...values)))
            : (parseFloat(pt.accuracy) === Math.max(...values));

        // Rótulo no eixo X (#1, #2, #3...)
        ctx.fillStyle = 'rgba(236, 232, 225, 0.6)';
        ctx.font = '11px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${i + 1}`, x, height - 10);

        if (isBest) {
            // Anel pulsante dourado do Melhor Recorde
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(244, 208, 63, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Ponto central dourado
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();

            // Tag "★ RECORDE" acima do ponto
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 11px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`★ RECORDE: ${values[i]}${unit}`, x, y - 14);
            ctx.restore();
        } else {
            // Ponto normal ciano
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#0f1923';
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();

            // Valor acima do ponto
            ctx.fillStyle = 'rgba(236, 232, 225, 0.9)';
            ctx.font = '600 11px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${values[i]}${unit}`, x, y - 9);
        }
    });
}

// -------------------------------------------------------------
// CONVERSOR DE SENSIBILIDADE DE OUTROS JOGOS PARA VALORANT
// -------------------------------------------------------------

function updateSensConverter() {
    const game = document.getElementById('convGameSelect').value;
    const sourceSens = parseFloat(document.getElementById('convSourceSens').value) || 1;
    const resultEl = document.getElementById('convResultVal');

    let converted = 0;
    switch (game) {
        case 'cs2':
            // Sens do CS2 / CS:GO dividida por 3.181818
            converted = sourceSens / 3.181818;
            break;
        case 'apex':
        case 'ow2':
            // Overwatch / Apex dividida por 10.6
            converted = sourceSens / 10.6;
            break;
        case 'fortnite':
            // Fortnite % multiplicada por 0.0396
            converted = sourceSens * 0.0396;
            break;
        case 'r6':
            // Rainbow Six multiplicada por 0.38
            converted = sourceSens * 0.38;
            break;
        default:
            converted = sourceSens;
    }

    resultEl.textContent = converted.toFixed(3);
}

// -------------------------------------------------------------
// LIGAÇÃO DE EVENTOS DA INTERFACE (UI EVENT LISTENERS)
// -------------------------------------------------------------

function setupEventListeners() {
    // 1. Duração do Treino (Lobby)
    const timeBtns = document.querySelectorAll('#timeSelector .btn-choice');
    const customTimeWrapper = document.getElementById('customTimeWrapper');
    const customTimeInput = document.getElementById('customTimeInput');

    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const timeVal = btn.dataset.time;
            state.selectedTime = timeVal;

            if (timeVal === 'custom') {
                customTimeWrapper.classList.remove('hidden');
            } else {
                customTimeWrapper.classList.add('hidden');
            }
        });
    });

    if (customTimeInput) {
        customTimeInput.addEventListener('input', (e) => {
            state.customTime = Math.max(5, Math.min(600, parseInt(e.target.value) || 30));
        });
    }

    // 2. Modos de Análise (Lobby)
    const modeCards = document.querySelectorAll('#modeSelector .mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.selectedMode = card.dataset.mode;
        });
    });

    // 3. Alternador de Métrica do Gráfico de Evolução (Pontuação vs Precisão)
    const chartToggles = document.querySelectorAll('.btn-chart-toggle');
    chartToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            chartToggles.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartMetric = btn.dataset.chart;
            renderHistory();
        });
    });

    // 4. Botão Principal: INICIAR ANÁLISE
    const btnStart = document.getElementById('btnStartTraining');
    if (btnStart) btnStart.addEventListener('click', startTrainingSession);

    // 5. Botões de Navegação & Abertura de Modais
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    const btnQuickEditSens = document.getElementById('btnQuickEditSens');
    const btnSettingsFromResults = document.getElementById('btnSettingsFromResults');
    const settingsModal = document.getElementById('settingsModal');
    const btnCloseSettings = document.getElementById('btnCloseSettings');

    const openSettings = () => {
        settingsModal.classList.remove('hidden');
        syncSettingsToUI();
        updateCrosshairs();
    };

    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
    if (btnQuickEditSens) btnQuickEditSens.addEventListener('click', openSettings);
    if (btnSettingsFromResults) btnSettingsFromResults.addEventListener('click', openSettings);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Histórico
    const btnOpenHistory = document.getElementById('btnOpenHistory');
    const historyModal = document.getElementById('historyModal');
    const btnCloseHistory = document.getElementById('btnCloseHistory');
    const btnCloseHistoryBottom = document.getElementById('btnCloseHistoryBottom');
    const btnClearHistory = document.getElementById('btnClearHistory');

    const openHistory = () => {
        renderHistory();
        historyModal.classList.remove('hidden');
    };

    if (btnOpenHistory) btnOpenHistory.addEventListener('click', openHistory);
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => historyModal.classList.add('hidden'));
    if (btnCloseHistoryBottom) btnCloseHistoryBottom.addEventListener('click', () => historyModal.classList.add('hidden'));
    if (btnClearHistory) btnClearHistory.addEventListener('click', () => {
        state.history = [];
        localStorage.removeItem('val_aim_history');
        renderHistory();
    });

    // 6. Abas de Configurações
    const tabBtns = document.querySelectorAll('.settings-tabs .tab-btn');
    const tabPanels = document.querySelectorAll('.settings-content .tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPanel = document.getElementById(btn.dataset.tab);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // 7. Controles de Sensibilidade (Slider & Input)
    const sensSlider = document.getElementById('sensSlider');
    const sensInput = document.getElementById('sensInput');
    const dpiSelect = document.getElementById('dpiSelect');
    const invertYCheck = document.getElementById('invertYCheck');

    const updateSensFromInput = (val) => {
        state.sens = parseFloat(val) || 0.4;
        sensSlider.value = state.sens;
        sensInput.value = state.sens;
        updateEDPIDisplays();
        saveSettings();
    };

    if (sensSlider) sensSlider.addEventListener('input', (e) => updateSensFromInput(e.target.value));
    if (sensInput) sensInput.addEventListener('input', (e) => updateSensFromInput(e.target.value));
    if (dpiSelect) dpiSelect.addEventListener('change', (e) => {
        state.dpi = parseInt(e.target.value) || 800;
        updateEDPIDisplays();
        saveSettings();
    });
    if (invertYCheck) invertYCheck.addEventListener('change', (e) => {
        state.invertY = e.target.checked;
        saveSettings();
    });

    // 8. Editor de Mira (Crosshair)
    const chColorBtns = document.querySelectorAll('#chColorPresets .color-btn');
    chColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chColorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.crosshair.color = btn.dataset.color;
            updateCrosshairs();
            saveSettings();
        });
    });

    const chLength = document.getElementById('chLength');
    const chThickness = document.getElementById('chThickness');
    const chGap = document.getElementById('chGap');
    const chCenterDot = document.getElementById('chCenterDot');
    const chOutline = document.getElementById('chOutline');

    if (chLength) chLength.addEventListener('input', (e) => {
        state.crosshair.length = parseInt(e.target.value);
        document.getElementById('chLengthVal').textContent = state.crosshair.length;
        updateCrosshairs();
        saveSettings();
    });
    if (chThickness) chThickness.addEventListener('input', (e) => {
        state.crosshair.thickness = parseInt(e.target.value);
        document.getElementById('chThicknessVal').textContent = state.crosshair.thickness;
        updateCrosshairs();
        saveSettings();
    });
    if (chGap) chGap.addEventListener('input', (e) => {
        state.crosshair.gap = parseInt(e.target.value);
        document.getElementById('chGapVal').textContent = state.crosshair.gap;
        updateCrosshairs();
        saveSettings();
    });
    if (chCenterDot) chCenterDot.addEventListener('change', (e) => {
        state.crosshair.centerDot = e.target.checked;
        updateCrosshairs();
        saveSettings();
    });
    if (chOutline) chOutline.addEventListener('change', (e) => {
        state.crosshair.outline = e.target.checked;
        updateCrosshairs();
        saveSettings();
    });

    // 9. Áudio & Alvos
    const masterVolSlider = document.getElementById('masterVolSlider');
    const sfxVolSlider = document.getElementById('sfxVolSlider');
    const targetColorSelect = document.getElementById('targetColorSelect');
    const targetSizeSelect = document.getElementById('targetSizeSelect');

    if (masterVolSlider) masterVolSlider.addEventListener('input', (e) => {
        state.masterVolume = parseFloat(e.target.value);
        document.getElementById('masterVolVal').textContent = `${Math.round(state.masterVolume * 100)}%`;
        if (window.soundManager) window.soundManager.setVolumes(state.masterVolume, state.sfxVolume);
        saveSettings();
    });
    if (sfxVolSlider) sfxVolSlider.addEventListener('input', (e) => {
        state.sfxVolume = parseFloat(e.target.value);
        document.getElementById('sfxVolVal').textContent = `${Math.round(state.sfxVolume * 100)}%`;
        if (window.soundManager) window.soundManager.setVolumes(state.masterVolume, state.sfxVolume);
        saveSettings();
    });
    if (targetColorSelect) targetColorSelect.addEventListener('change', (e) => {
        state.targetColor = e.target.value;
        saveSettings();
    });
    if (targetSizeSelect) targetSizeSelect.addEventListener('change', (e) => {
        state.targetSize = e.target.value;
        saveSettings();
    });

    // 10. Conversor de Jogos
    const convGameSelect = document.getElementById('convGameSelect');
    const convSourceSens = document.getElementById('convSourceSens');
    const btnApplyConvertedSens = document.getElementById('btnApplyConvertedSens');

    if (convGameSelect) convGameSelect.addEventListener('change', updateSensConverter);
    if (convSourceSens) convSourceSens.addEventListener('input', updateSensConverter);
    if (btnApplyConvertedSens) btnApplyConvertedSens.addEventListener('click', () => {
        const converted = parseFloat(document.getElementById('convResultVal').textContent);
        if (converted > 0) {
            updateSensFromInput(converted.toFixed(2));
            alert(`Sensibilidade convertida de ${converted.toFixed(2)} aplicada com sucesso ao Valorant!`);
        }
    });

    // 11. Botões do Modal de Configurações
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const btnResetDefaults = document.getElementById('btnResetDefaults');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
        saveSettings();
        settingsModal.classList.add('hidden');
    });
    if (btnResetDefaults) btnResetDefaults.addEventListener('click', () => {
        if (confirm('Restaurar todas as configurações para os padrões do Valorant?')) {
            state.sens = 0.40;
            state.dpi = 800;
            state.invertY = false;
            state.crosshair = { color: '#00ffff', length: 6, thickness: 2, gap: 4, centerDot: false, outline: true };
            state.targetColor = '#ff4655';
            state.targetSize = 'medium';
            saveSettings();
            syncSettingsToUI();
            updateCrosshairs();
            updateEDPIDisplays();
        }
    });

    // 12. Botões do Modal de Resultados
    const btnRetryTraining = document.getElementById('btnRetryTraining');
    const btnBackToLobby = document.getElementById('btnBackToLobby');

    if (btnRetryTraining) btnRetryTraining.addEventListener('click', startTrainingSession);
    if (btnBackToLobby) btnBackToLobby.addEventListener('click', () => {
        document.getElementById('resultsModal').classList.add('hidden');
        document.getElementById('gameArena').classList.add('hidden');
        document.getElementById('lobbyScreen').classList.remove('hidden');
    });

    // 13. Botões do Menu de Pausa
    const btnResumeGame = document.getElementById('btnResumeGame');
    const btnRestartGame = document.getElementById('btnRestartGame');
    const btnQuitToLobby = document.getElementById('btnQuitToLobby');

    if (btnResumeGame) btnResumeGame.addEventListener('click', resumeGame);
    if (btnRestartGame) btnRestartGame.addEventListener('click', () => {
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) pauseOverlay.classList.add('hidden');
        startTrainingSession();
    });
    if (btnQuitToLobby) btnQuitToLobby.addEventListener('click', () => {
        state.isPlaying = false;
        clearInterval(state.timerInterval);
        if (document.exitPointerLock) document.exitPointerLock();
        document.getElementById('pauseOverlay').classList.add('hidden');
        document.getElementById('gameArena').classList.add('hidden');
        document.getElementById('lobbyScreen').classList.remove('hidden');
    });
}

function syncSettingsToUI() {
    // Sensibilidade & DPI
    const sensSlider = document.getElementById('sensSlider');
    const sensInput = document.getElementById('sensInput');
    const dpiSelect = document.getElementById('dpiSelect');
    const invertYCheck = document.getElementById('invertYCheck');

    if (sensSlider) sensSlider.value = state.sens;
    if (sensInput) sensInput.value = state.sens;
    if (dpiSelect) dpiSelect.value = state.dpi;
    if (invertYCheck) invertYCheck.checked = state.invertY;

    // Crosshair
    const chLength = document.getElementById('chLength');
    const chThickness = document.getElementById('chThickness');
    const chGap = document.getElementById('chGap');
    const chCenterDot = document.getElementById('chCenterDot');
    const chOutline = document.getElementById('chOutline');

    if (chLength) {
        chLength.value = state.crosshair.length;
        document.getElementById('chLengthVal').textContent = state.crosshair.length;
    }
    if (chThickness) {
        chThickness.value = state.crosshair.thickness;
        document.getElementById('chThicknessVal').textContent = state.crosshair.thickness;
    }
    if (chGap) {
        chGap.value = state.crosshair.gap;
        document.getElementById('chGapVal').textContent = state.crosshair.gap;
    }
    if (chCenterDot) chCenterDot.checked = state.crosshair.centerDot;
    if (chOutline) chOutline.checked = state.crosshair.outline;

    // Preset color buttons
    const colorBtns = document.querySelectorAll('#chColorPresets .color-btn');
    colorBtns.forEach(btn => {
        if (btn.dataset.color.toLowerCase() === state.crosshair.color.toLowerCase()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Áudio & Alvos
    const masterVolSlider = document.getElementById('masterVolSlider');
    const sfxVolSlider = document.getElementById('sfxVolSlider');
    const targetColorSelect = document.getElementById('targetColorSelect');
    const targetSizeSelect = document.getElementById('targetSizeSelect');

    if (masterVolSlider) {
        masterVolSlider.value = state.masterVolume;
        document.getElementById('masterVolVal').textContent = `${Math.round(state.masterVolume * 100)}%`;
    }
    if (sfxVolSlider) {
        sfxVolSlider.value = state.sfxVolume;
        document.getElementById('sfxVolVal').textContent = `${Math.round(state.sfxVolume * 100)}%`;
    }
    if (targetColorSelect) targetColorSelect.value = state.targetColor;
    if (targetSizeSelect) targetSizeSelect.value = state.targetSize;

    updateEDPIDisplays();
    updateSensConverter();
}

// -------------------------------------------------------------
// INICIALIZAÇÃO GERAL
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateEDPIDisplays();
    updateCrosshairs();
    setupMouseControls();
    setupEventListeners();
    syncSettingsToUI();

    // Se o navegador já carregou Three.js, pré-inicializa a arena 3D
    if (window.THREE) {
        init3D();
    }
});
