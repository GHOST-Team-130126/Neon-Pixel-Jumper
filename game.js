// ================= CONFIGURAÇÃO =================
const BASE_W = 160;
const BASE_H = 144;

// Detectar se é mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Ajustar escala baseado no dispositivo
let SCALE;
if (isMobile) {
    SCALE = Math.floor(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H));
    if (SCALE < 2) SCALE = 2;
    if (SCALE > 4) SCALE = 4;
} else {
    SCALE = Math.min(
        Math.floor(window.innerWidth / BASE_W),
        Math.floor(window.innerHeight / BASE_H)
    ) || 3;
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = BASE_W * SCALE;
canvas.height = BASE_H * SCALE;
ctx.imageSmoothingEnabled = false;

// Física
const GRAVITY = 0.25;
const JUMP_FORCE = -5.5;
const PLAYER_SPEED = 1.6;

// ================= ESTADO DO JOGO =================
let state = "launch"; // launch, menu, game, shop, pause, palettes
let menuIndex = 0;
let shopIndex = 0;
let paletteIndex = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let coins = parseInt(localStorage.getItem("coins")) || 0;
let lives = 1;
let shield = 0;
let boss = null;
let particles = [];
let collectedItems = [];

// Controle do menu
let menuCooldown = 0;
const MENU_COOLDOWN_TIME = 15;

// Detecção de controle ativo
let activeControl = "none"; // "keyboard", "gamepad", "touch"
let lastInputTime = Date.now();
const INPUT_TIMEOUT = 2000; // 2 segundos sem input

// ================= SISTEMA DE USUÁRIO E RANKING =================
let currentUser = null;
let userList = JSON.parse(localStorage.getItem("userList")) || [];
let friendList = JSON.parse(localStorage.getItem("friendList")) || [];

// ================= SISTEMA DE PALETAS =================
// Paletas disponíveis no jogo
const palettes = [
    {
        id: 0,
        name: "NEON VERDE",
        colors: {
            bg: "#000000",
            main: "#00ff88",
            player: "#ffffff",
            accent: "#00ccff",
            ui: "#00ff88"
        },
        price: 0, // Gratuita
        unlocked: true,
        description: "Paleta padrão do jogo"
    },
    {
        id: 1,
        name: "CYBER PINK",
        colors: {
            bg: "#000000",
            main: "#ff00ff",
            player: "#00ffff",
            accent: "#ffff00",
            ui: "#ff00ff"
        },
        price: 10,
        unlocked: false,
        description: "Rosa cybernético"
    },
    {
        id: 2,
        name: "GOLDEN SUN",
        colors: {
            bg: "#111111",
            main: "#ffd700",
            player: "#ffffff",
            accent: "#ff5555",
            ui: "#ffd700"
        },
        price: 15,
        unlocked: false,
        description: "Dourado brilhante"
    },
    {
        id: 3,
        name: "AQUA BLUE",
        colors: {
            bg: "#001122",
            main: "#00ffff",
            player: "#ff88ff",
            accent: "#88ff88",
            ui: "#00ffff"
        },
        price: 12,
        unlocked: false,
        description: "Azul aquático"
    },
    {
        id: 4,
        name: "RETRO RED",
        colors: {
            bg: "#220000",
            main: "#ff4444",
            player: "#ffff44",
            accent: "#44ffff",
            ui: "#ff4444"
        },
        price: 18,
        unlocked: false,
        description: "Vermelho retrô"
    },
    {
        id: 5,
        name: "PURPLE DREAM",
        colors: {
            bg: "#110022",
            main: "#aa00ff",
            player: "#ffaa00",
            accent: "#00ffaa",
            ui: "#aa00ff"
        },
        price: 20,
        unlocked: false,
        description: "Roxo psicodélico"
    },
    {
        id: 6,
        name: "MATRIX",
        colors: {
            bg: "#000000",
            main: "#00ff00",
            player: "#ffffff",
            accent: "#009900",
            ui: "#00ff00"
        },
        price: 25,
        unlocked: false,
        description: "Estilo Matrix"
    },
    {
        id: 7,
        name: "ICE COLD",
        colors: {
            bg: "#000033",
            main: "#88ddff",
            player: "#ffffff",
            accent: "#ff8888",
            ui: "#88ddff"
        },
        price: 15,
        unlocked: false,
        description: "Frio glacial"
    }
];

// ================= CHEFES DIFERENTES =================
const bossTypes = [
    {
        name: "GLITCHER",
        w: 80, h: 16,
        vx: 1.5, health: 10,
        color: "#ff00ff",
        attackPattern: "single",
        special: "glitch"
    },
    {
        name: "CRUSHER",
        w: 70, h: 20,
        vx: 0.8, health: 15,
        color: "#ff4444",
        attackPattern: "triple",
        special: "heavy"
    },
    {
        name: "SPEEDER",
        w: 60, h: 12,
        vx: 2.5, health: 8,
        color: "#00ffff",
        attackPattern: "rapid",
        special: "fast"
    },
    {
        name: "WALLER",
        w: 90, h: 14,
        vx: 0.6, health: 20,
        color: "#ffff00",
        attackPattern: "wall",
        special: "wide"
    },
    {
        name: "BOUNCER",
        w: 65, h: 18,
        vx: 1.2, health: 12,
        color: "#ff8800",
        attackPattern: "bounce",
        special: "bouncy"
    },
    {
        name: "SNIPER",
        w: 50, h: 10,
        vx: 1.0, health: 9,
        color: "#00ff88",
        attackPattern: "aimed",
        special: "accurate"
    },
    {
        name: "MINER",
        w: 85, h: 22,
        vx: 0.7, health: 18,
        color: "#aa00ff",
        attackPattern: "mine",
        special: "traps"
    },
    {
        name: "CHASER",
        w: 60, h: 15,
        vx: 1.8, health: 11,
        color: "#ff5555",
        attackPattern: "chase",
        special: "tracking"
    },
    {
        name: "SPLITTER",
        w: 75, h: 13,
        vx: 1.3, health: 13,
        color: "#88ff88",
        attackPattern: "split",
        special: "multiply"
    },
    {
        name: "DEFLECTOR",
        w: 70, h: 16,
        vx: 1.1, health: 14,
        color: "#8888ff",
        attackPattern: "reflect",
        special: "shielded"
    },
    {
        name: "TELEPORTER",
        w: 55, h: 12,
        vx: 0, health: 10,
        color: "#ff88ff",
        attackPattern: "teleport",
        special: "warp"
    },
    {
        name: "SPINNER",
        w: 65, h: 65,
        vx: 0, health: 16,
        color: "#00aaff",
        attackPattern: "spin",
        special: "rotating"
    },
    {
        name: "BURSTER",
        w: 60, h: 14,
        vx: 1.4, health: 12,
        color: "#ffaa00",
        attackPattern: "burst",
        special: "explosive"
    },
    {
        name: "LASER",
        w: 80, h: 10,
        vx: 0.9, health: 17,
        color: "#ff0066",
        attackPattern: "laser",
        special: "beam"
    },
    {
        name: "TITAN",
        w: 100, h: 25,
        vx: 0.5, health: 25,
        color: "#6666ff",
        attackPattern: "multiwave",
        special: "massive"
    }
];

// Carregar paletas desbloqueadas do localStorage
function loadUnlockedPalettes() {
    // Se tiver usuário, carregar paletas do usuário
    if (currentUser && currentUser.palettes) {
        palettes.forEach(palette => {
            palette.unlocked = currentUser.palettes.includes(palette.id);
        });
    } else {
        const unlockedPalettes = JSON.parse(localStorage.getItem("unlockedPalettes")) || [0];
        palettes.forEach(palette => {
            palette.unlocked = unlockedPalettes.includes(palette.id);
        });
    }
    
    // Carregar paleta selecionada
    paletteIndex = parseInt(localStorage.getItem("selectedPalette")) || 0;
    // Garantir que a paleta selecionada esteja desbloqueada
    if (!palettes[paletteIndex].unlocked) {
        paletteIndex = 0;
        localStorage.setItem("selectedPalette", 0);
    }
}

// Salvar paletas desbloqueadas
function saveUnlockedPalettes() {
    const unlockedIds = palettes.filter(p => p.unlocked).map(p => p.id);
    localStorage.setItem("unlockedPalettes", JSON.stringify(unlockedIds));
    
    // Salvar também no perfil do usuário se existir
    if (currentUser) {
        currentUser.palettes = unlockedIds;
        saveUserProgress();
    }
}

// Função para obter paleta atual
function getCurrentPalette() {
    return palettes[paletteIndex].colors;
}

// ================= FUNÇÕES DE USUÁRIO =================
function createUser() {
    const username = prompt("Digite seu nome de usuário (3-12 caracteres):");
    
    if (!username || username.length < 3 || username.length > 12) {
        alert("Nome deve ter entre 3 e 12 caracteres!");
        return false;
    }
    
    // Verificar se usuário já existe
    if (userList.some(user => user.name.toLowerCase() === username.toLowerCase())) {
        alert("Nome já existe! Escolha outro.");
        return false;
    }
    
    // Gerar ID único
    const userId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const newUser = {
        id: userId,
        name: username,
        highScore: 0,
        coins: 0,
        created: new Date().toISOString(),
        palettes: [0]
    };
    
    userList.push(newUser);
    localStorage.setItem("userList", JSON.stringify(userList));
    
    currentUser = newUser;
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    
    // Atualizar dados do jogo
    highScore = 0;
    coins = 0;
    loadUnlockedPalettes();
    
    alert(`Usuário criado!\nNome: ${username}\nID: ${userId}\nGuarde seu ID para amigos!`);
    
    // Atualizar display do usuário
    updateUserDisplay();
    return true;
}

function loginUser() {
    const userId = prompt("Digite seu ID de usuário:");
    
    if (!userId) return false;
    
    const user = userList.find(u => u.id === userId);
    
    if (!user) {
        alert("Usuário não encontrado!");
        return false;
    }
    
    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
    
    // Atualizar dados do jogo
    highScore = user.highScore;
    coins = user.coins;
    loadUnlockedPalettes();
    
    // Atualizar display do usuário
    updateUserDisplay();
    
    alert(`Bem-vindo de volta, ${user.name}!`);
    return true;
}

function saveUserProgress() {
    if (!currentUser) return;
    
    const userIndex = userList.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        userList[userIndex].highScore = Math.max(userList[userIndex].highScore, score);
        userList[userIndex].coins = coins;
        
        // Salvar paletas desbloqueadas do usuário
        const unlockedIds = palettes.filter(p => p.unlocked).map(p => p.id);
        userList[userIndex].palettes = unlockedIds;
        
        localStorage.setItem("userList", JSON.stringify(userList));
    }
}

function updateUserDisplay() {
    const userInfo = document.getElementById("userInfo");
    const userName = document.getElementById("userName");
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (currentUser && userInfo && userName) {
        userName.textContent = `User: ${currentUser.name}`;
        userInfo.style.display = 'flex';
        
        // Adicionar event listener para logout se não existir
        if (logoutBtn && !logoutBtn.hasEventListener) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Deseja fazer logout?')) {
                    logoutUser();
                }
            });
            logoutBtn.hasEventListener = true;
        }
    } else if (userInfo) {
        userInfo.style.display = 'none';
    }
}

function showRanking() {
    if (!currentUser) {
        alert("Você precisa criar um usuário para ver o ranking!");
        return;
    }
    
    // Ordenar por score
    const sortedRanking = [...userList].sort((a, b) => b.highScore - a.highScore);
    
    let rankingText = "🏆 RANKING 🏆\n\n";
    rankingText += "POS | NOME | SCORE | MOEDAS\n";
    rankingText += "--------------------------------\n";
    
    sortedRanking.slice(0, 10).forEach((user, index) => {
        const pos = index + 1;
        const isCurrent = user.id === currentUser.id;
        const prefix = isCurrent ? "> " : "  ";
        rankingText += `${prefix}${pos}. ${user.name} - ${user.highScore} pts - ${user.coins} moedas\n`;
    });
    
    // Mostrar sua posição se não estiver no top 10
    const userPosition = sortedRanking.findIndex(u => u.id === currentUser.id) + 1;
    if (userPosition > 10) {
        rankingText += `\n...\nSua posição: ${userPosition}º`;
    }
    
    alert(rankingText);
}

function showFriendSystem() {
    if (!currentUser) {
        alert("Crie um usuário primeiro!");
        return;
    }
    
    const option = prompt(
        "SISTEMA DE AMIZADES\n\n" +
        "1. Adicionar amigo por ID\n" +
        "2. Ver lista de amigos\n" +
        "3. Ver pedidos de amizade\n" +
        "4. Ver amigos online\n\n" +
        "Escolha uma opção (1-4):"
    );
    
    switch(option) {
        case "1":
            addFriendById();
            break;
        case "2":
            showFriendList();
            break;
        case "3":
            showFriendRequests();
            break;
        case "4":
            showOnlineFriends();
            break;
        default:
            alert("Opção inválida!");
    }
}

function addFriendById() {
    const friendId = prompt("Digite o ID do amigo:");
    
    if (!friendId) return;
    
    if (friendId === currentUser.id) {
        alert("Você não pode adicionar a si mesmo!");
        return;
    }
    
    const friend = userList.find(u => u.id === friendId);
    
    if (!friend) {
        alert("Usuário não encontrado!");
        return;
    }
    
    // Verificar se já são amigos
    const existingFriend = friendList.find(f => 
        (f.userId === currentUser.id && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === currentUser.id)
    );
    
    if (existingFriend) {
        alert(`Você e ${friend.name} já são amigos!`);
        return;
    }
    
    // Criar pedido de amizade
    const request = {
        id: Date.now().toString(),
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: friendId,
        toUserName: friend.name,
        status: "pending",
        date: new Date().toISOString()
    };
    
    // Carregar pedidos existentes
    const friendRequests = JSON.parse(localStorage.getItem("friendRequests")) || [];
    friendRequests.push(request);
    localStorage.setItem("friendRequests", JSON.stringify(friendRequests));
    
    alert(`Pedido de amizade enviado para ${friend.name}!`);
}

function showFriendList() {
    const userFriends = friendList.filter(f => 
        f.userId === currentUser.id || f.friendId === currentUser.id
    );
    
    if (userFriends.length === 0) {
        alert("Você ainda não tem amigos :(");
        return;
    }
    
    let friendText = "👥 SEUS AMIGOS 👥\n\n";
    
    userFriends.forEach(friendReq => {
        const friendId = friendReq.userId === currentUser.id ? friendReq.friendId : friendReq.userId;
        const friend = userList.find(u => u.id === friendId);
        
        if (friend) {
            const status = friendReq.status === "accepted" ? "✅" : "⏳";
            friendText += `${status} ${friend.name} (ID: ${friend.id.substr(0, 8)}...)\n`;
            friendText += `   Score: ${friend.highScore} | Moedas: ${friend.coins}\n\n`;
        }
    });
    
    alert(friendText);
}

function showFriendRequests() {
    const requests = JSON.parse(localStorage.getItem("friendRequests")) || [];
    const userRequests = requests.filter(r => r.toUserId === currentUser.id && r.status === "pending");
    
    if (userRequests.length === 0) {
        alert("Nenhum pedido de amizade pendente!");
        return;
    }
    
    userRequests.forEach(request => {
        const accept = confirm(
            `Pedido de amizade de ${request.fromUserName}\n` +
            `ID: ${request.fromUserId}\n\n` +
            `Aceitar amizade?`
        );
        
        if (accept) {
            // Atualizar status do pedido
            request.status = "accepted";
            localStorage.setItem("friendRequests", JSON.stringify(requests));
            
            // Adicionar à lista de amigos
            friendList.push({
                userId: request.fromUserId,
                friendId: currentUser.id,
                date: new Date().toISOString()
            });
            localStorage.setItem("friendList", JSON.stringify(friendList));
            
            alert(`Agora você e ${request.fromUserName} são amigos!`);
        } else {
            // Recusar pedido
            request.status = "rejected";
            localStorage.setItem("friendRequests", JSON.stringify(requests));
        }
    });
}

function showOnlineFriends() {
    // Simulação - em um sistema real, isso viria de um servidor
    const userFriends = friendList.filter(f => 
        f.userId === currentUser.id || f.friendId === currentUser.id
    );
    
    if (userFriends.length === 0) {
        alert("Você ainda não tem amigos :(");
        return;
    }
    
    const onlineFriends = userFriends.filter(() => Math.random() > 0.5).slice(0, 5);
    
    if (onlineFriends.length === 0) {
        alert("Nenhum amigo online no momento :(");
        return;
    }
    
    let onlineText = "🟢 AMIGOS ONLINE 🟢\n\n";
    
    onlineFriends.forEach(friendReq => {
        const friendId = friendReq.userId === currentUser.id ? friendReq.friendId : friendReq.userId;
        const friend = userList.find(u => u.id === friendId);
        
        if (friend) {
            onlineText += `👤 ${friend.name}\n`;
            onlineText += `   Score: ${friend.highScore}\n`;
            onlineText += `   Jogando: ${Math.random() > 0.5 ? "Sim" : "Não"}\n\n`;
        }
    });
    
    alert(onlineText);
}

function logoutUser() {
    if (currentUser) {
        saveUserProgress();
        currentUser = null;
        localStorage.removeItem("currentUser");
        alert("Logout realizado! Os dados foram salvos.");
        state = "launch";
        document.getElementById("overlay").style.display = "flex";
        updateUserDisplay();
    }
}

// ================= JOGADOR =================
const player = {
    x: 0,
    y: 0,
    w: 6,
    h: 8,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    animation: 0,
    invincible: 0,
    jumpBoost: 0
};

// ================= MUNDO =================
let platforms = [];
let items = [];
let glitchEffect = false;
let glitchTimer = 0;

// ================= SISTEMA DE ÁUDIO =================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let canPlayAudio = false;

function beep(frequency, duration = 0.1) {
    if (!canPlayAudio || !audioCtx) return;
    
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = "square";
        
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Erro de áudio:", e);
    }
}

// ================= SISTEMA DE CONTROLES =================
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false,
    start: false,
    back: false,
    select: false,
    a: false,
    b: false,
    x: false,
    y: false
};

// Estado do touch
let touchState = {
    left: false,
    right: false,
    jump: false,
    action: false,
    start: false,
    menu: false,
    shop: false
};

// Variáveis para controle analógico único
let movePadActive = false;
let movePadStartX = 0;
let movePadStartY = 0;
let movePadCurrentX = 0;
let movePadCurrentY = 0;
const MOVE_PAD_THRESHOLD = 20; // Sensibilidade do controle analógico

// ================= TOUCH CONTROLS - REESCRITO PARA UM ÚNICO CONTROLE =================
function setupTouchControls() {
    console.log("Configurando controles touch (único controle)...");
    
    // Verificar se é dispositivo com touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        // Mostrar controles touch otimizados
        document.getElementById("mobileControls").style.display = "block";
        document.getElementById("controlIndicator").style.display = "flex";
        
        // Configurar controle analógico único
        setupMovePad();
        
        // Configurar botões touch
        setupTouchButtons();
        
        // Configurar touch no canvas
        setupCanvasTouch();
        
        activeControl = "touch";
        updateControlIndicator();
        console.log("Controles touch otimizados configurados com sucesso!");
    }
}

function setupMovePad() {
    const movePad = document.getElementById("movePad");
    if (!movePad) return;
    
    let activeTouchId = null;
    
    movePad.addEventListener("touchstart", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (activeTouchId !== null) return;
        
        const touch = e.touches[0];
        activeTouchId = touch.identifier;
        
        const rect = this.getBoundingClientRect();
        movePadStartX = rect.left + rect.width / 2;
        movePadStartY = rect.top + rect.height / 2;
        movePadCurrentX = touch.clientX;
        movePadCurrentY = touch.clientY;
        
        movePadActive = true;
        updateMovementFromPad();
        
        // Feedback visual
        this.classList.add("active");
        activeControl = "touch";
        updateControlIndicator();
        lastInputTime = Date.now();
    }, { passive: false });
    
    movePad.addEventListener("touchmove", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!movePadActive || activeTouchId === null) return;
        
        // Encontrar o toque ativo
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === activeTouchId) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (!touch) return;
        
        movePadCurrentX = touch.clientX;
        movePadCurrentY = touch.clientY;
        
        updateMovementFromPad();
        lastInputTime = Date.now();
    }, { passive: false });
    
    movePad.addEventListener("touchend", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Verificar se o toque ativo foi liberado
        let touchEnded = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) {
                touchEnded = true;
                break;
            }
        }
        
        if (touchEnded) {
            movePadActive = false;
            activeTouchId = null;
            
            // Resetar movimento
            keys.left = false;
            keys.right = false;
            touchState.left = false;
            touchState.right = false;
            
            // Feedback visual
            this.classList.remove("active");
            
            // Resetar posição do centro visual
            const touchCenter = this.querySelector('.touch-center');
            if (touchCenter) {
                touchCenter.style.transform = 'translate(0, 0)';
            }
        }
    }, { passive: false });
    
    movePad.addEventListener("touchcancel", function(e) {
        e.preventDefault();
        movePadActive = false;
        activeTouchId = null;
        
        keys.left = false;
        keys.right = false;
        touchState.left = false;
        touchState.right = false;
        
        this.classList.remove("active");
        
        const touchCenter = this.querySelector('.touch-center');
        if (touchCenter) {
            touchCenter.style.transform = 'translate(0, 0)';
        }
    }, { passive: false });
}

function updateMovementFromPad() {
    if (!movePadActive) return;
    
    const deltaX = movePadCurrentX - movePadStartX;
    const deltaY = movePadCurrentY - movePadStartY;
    
    // Resetar estados
    keys.left = false;
    keys.right = false;
    touchState.left = false;
    touchState.right = false;
    
    // Atualizar visual do centro do controle
    const movePad = document.getElementById("movePad");
    const touchCenter = movePad.querySelector('.touch-center');
    
    // Limitar movimento do centro visual
    const maxOffset = 30;
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5));
    const offsetY = Math.max(-maxOffset, Math.min(maxOffset, deltaY * 0.5));
    
    if (touchCenter) {
        touchCenter.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
    
    // Determinar direção baseada no movimento
    if (Math.abs(deltaX) > MOVE_PAD_THRESHOLD) {
        if (deltaX < 0) {
            keys.left = true;
            touchState.left = true;
        } else {
            keys.right = true;
            touchState.right = true;
        }
    }
    
    // Se mover para cima, considerar como pulo
    if (deltaY < -MOVE_PAD_THRESHOLD * 0.8) {
        keys.jump = true;
        touchState.jump = true;
        keys.a = true;
    }
}

function setupTouchButtons() {
    // Botão START/MENU (centro inferior)
    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
        startBtn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.start = true;
            keys.start = true;
            keys.action = true;
            activeControl = "touch";
            updateControlIndicator();
            lastInputTime = Date.now();
            
            // Processar ação baseada no estado atual
            handleStartButton();
            
            // Feedback visual
            this.classList.add("active");
        }, { passive: false });
        
        startBtn.addEventListener("touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.start = false;
            keys.start = false;
            keys.action = false;
            
            // Feedback visual
            this.classList.remove("active");
        }, { passive: false });
        
        startBtn.addEventListener("touchcancel", function(e) {
            e.preventDefault();
            touchState.start = false;
            keys.start = false;
            keys.action = false;
            
            this.classList.remove("active");
        }, { passive: false });
    }
    
    // Botão AÇÃO (direito inferior)
    const actionBtn = document.getElementById("actionBtn");
    if (actionBtn) {
        actionBtn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.action = true;
            keys.action = true;
            keys.a = true;
            activeControl = "touch";
            updateControlIndicator();
            lastInputTime = Date.now();
            
            // Processar ação
            handleActionButton();
            
            // Feedback visual
            this.classList.add("active");
        }, { passive: false });
        
        actionBtn.addEventListener("touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.action = false;
            keys.action = false;
            keys.a = false;
            
            // Feedback visual
            this.classList.remove("active");
        }, { passive: false });
        
        actionBtn.addEventListener("touchcancel", function(e) {
            e.preventDefault();
            touchState.action = false;
            keys.action = false;
            keys.a = false;
            
            this.classList.remove("active");
        }, { passive: false });
    }
    
    // Botões de menu touch superiores (mantidos para compatibilidade)
    const touchStartBtn = document.getElementById("touchStart");
    const touchMenuBtn = document.getElementById("touchMenu");
    const touchShopBtn = document.getElementById("touchShop");
    
    // START (menu superior)
    if (touchStartBtn) {
        touchStartBtn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.start = true;
            keys.start = true;
            activeControl = "touch";
            updateControlIndicator();
            lastInputTime = Date.now();
            
            handleStartButton();
            
            // Feedback visual
            this.classList.add("active");
        }, { passive: false });
        
        touchStartBtn.addEventListener("touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.start = false;
            keys.start = false;
            
            // Feedback visual
            this.classList.remove("active");
        }, { passive: false });
        
        touchStartBtn.addEventListener("touchcancel", function(e) {
            e.preventDefault();
            touchState.start = false;
            keys.start = false;
            
            this.classList.remove("active");
        }, { passive: false });
    }
    
    // MENU (menu superior)
    if (touchMenuBtn) {
        touchMenuBtn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.menu = true;
            keys.select = true;
            activeControl = "touch";
            updateControlIndicator();
            lastInputTime = Date.now();
            
            if (state === "game") {
                state = "pause";
                beep(300);
            } else if (state === "pause") {
                state = "menu";
                beep(300);
            }
            
            // Feedback visual
            this.classList.add("active");
        }, { passive: false });
        
        touchMenuBtn.addEventListener("touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.menu = false;
            keys.select = false;
            
            // Feedback visual
            this.classList.remove("active");
        }, { passive: false });
        
        touchMenuBtn.addEventListener("touchcancel", function(e) {
            e.preventDefault();
            touchState.menu = false;
            keys.select = false;
            
            this.classList.remove("active");
        }, { passive: false });
    }
    
    // LOJA (menu superior)
    if (touchShopBtn) {
        touchShopBtn.addEventListener("touchstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.shop = true;
            keys.b = true;
            keys.back = true;
            activeControl = "touch";
            updateControlIndicator();
            lastInputTime = Date.now();
            
            if (state === "menu") {
                state = "shop";
                shopIndex = 0;
                beep(300);
            } else if (state === "shop" || state === "palettes") {
                state = "menu";
                beep(200);
            }
            
            // Feedback visual
            this.classList.add("active");
        }, { passive: false });
        
        touchShopBtn.addEventListener("touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            touchState.shop = false;
            keys.b = false;
            keys.back = false;
            
            // Feedback visual
            this.classList.remove("active");
        }, { passive: false });
        
        touchShopBtn.addEventListener("touchcancel", function(e) {
            e.preventDefault();
            touchState.shop = false;
            keys.b = false;
            keys.back = false;
            
            this.classList.remove("active");
        }, { passive: false });
    }
}

function setupCanvasTouch() {
    // Permitir toque no canvas para iniciar
    canvas.addEventListener("touchstart", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (state === "launch") {
            hideOverlay();
            state = "menu";
            beep(600);
        }
        
        activeControl = "touch";
        updateControlIndicator();
        lastInputTime = Date.now();
        
        // Em dispositivos menores, permitir toque para pular
        if (state === "game" && window.innerWidth < 768) {
            touchState.jump = true;
            keys.jump = true;
            keys.a = true;
            
            // Liberar após 200ms
            setTimeout(() => {
                touchState.jump = false;
                keys.jump = false;
                keys.a = false;
            }, 200);
        }
    }, { passive: false });
    
    // Prevenir eventos de rolagem e zoom
    canvas.addEventListener("touchmove", function(e) {
        e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener("touchend", function(e) {
        e.preventDefault();
    }, { passive: false });
}

// Função para processar botão START
function handleStartButton() {
    switch(state) {
        case "launch":
            hideOverlay();
            state = "menu";
            beep(600);
            break;
            
        case "menu":
            handleMenuSelect();
            break;
            
        case "game":
            // No jogo, START pausa
            state = "pause";
            beep(300);
            break;
            
        case "pause":
            state = "game";
            beep(300);
            break;
            
        case "shop":
            handleShopPurchase();
            break;
            
        case "palettes":
            selectPalette();
            break;
    }
}

// Função para processar botão AÇÃO
function handleActionButton() {
    switch(state) {
        case "launch":
            hideOverlay();
            state = "menu";
            beep(600);
            break;
            
        case "menu":
            handleMenuSelect();
            break;
            
        case "game":
            // No jogo, botão A é para pular
            if (!keys.jump && !touchState.jump) {
                keys.jump = true;
                touchState.jump = true;
                
                // Auto-release after 100ms
                setTimeout(() => {
                    keys.jump = false;
                    touchState.jump = false;
                }, 100);
            }
            break;
            
        case "shop":
            handleShopPurchase();
            break;
            
        case "palettes":
            selectPalette();
            break;
            
        case "pause":
            state = "game";
            beep(300);
            break;
    }
}

// ================= TECLADO =================
const keyMap = {
    'arrowleft': 'left',
    'arrowright': 'right',
    'arrowup': 'up',
    'arrowdown': 'down',
    'a': 'left',
    'd': 'right',
    'w': 'up',
    's': 'down',
    ' ': 'jump',
    'enter': 'action',
    'escape': 'back',
    'z': 'a',
    'x': 'b',
    'c': 'x',
    'v': 'y',
    '1': 'a',
    '2': 'b',
    '3': 'x',
    '4': 'y'
};

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    
    if (!canPlayAudio && audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
            canPlayAudio = true;
            beep(600);
        });
    }
    
    if (activeControl !== "keyboard") {
        activeControl = "keyboard";
        updateControlIndicator();
    }
    lastInputTime = Date.now();
    
    if (keyMap[key]) {
        keys[keyMap[key]] = true;
        e.preventDefault();
        handleControlInput(keyMap[key], true);
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
        keys[keyMap[key]] = false;
        e.preventDefault();
    }
}

// ================= GAMEPAD =================
let gamepadConnected = false;
let gamepadLastState = {};
let gamepadCooldown = 0;
let currentGamepad = null;

const GAMEPAD_MAPPING = {
    0: 'a', 1: 'b', 2: 'x', 3: 'y',
    4: 'l1', 5: 'r1', 6: 'l2', 7: 'r2',
    8: 'select', 9: 'start'
};

function updateGamepad() {
    const gamepads = navigator.getGamepads();
    
    if (!gamepads || !gamepads[0]) {
        if (gamepadConnected) {
            gamepadConnected = false;
            currentGamepad = null;
        }
        return;
    }
    
    const gamepad = gamepads[0];
    currentGamepad = gamepad;
    
    if (!gamepadConnected) {
        gamepadConnected = true;
        activeControl = "gamepad";
        updateControlIndicator();
        beep(800, 0.1);
    }
    
    lastInputTime = Date.now();
    
    if (gamepadCooldown > 0) {
        gamepadCooldown--;
    }
    
    const deadZone = 0.15;
    const axisX = Math.abs(gamepad.axes[0]) > deadZone ? gamepad.axes[0] : 0;
    const axisY = Math.abs(gamepad.axes[1]) > deadZone ? gamepad.axes[1] : 0;
    
    keys.left = axisX < -deadZone;
    keys.right = axisX > deadZone;
    
    if (state === "menu" || state === "shop" || state === "palettes") {
        if (gamepadCooldown === 0) {
            if (axisY < -deadZone) {
                handleMenuNavigation("up");
                gamepadCooldown = 15;
            } else if (axisY > deadZone) {
                handleMenuNavigation("down");
                gamepadCooldown = 15;
            }
        }
    }
    
    if (gamepad.axes.length >= 8) {
        const dpadX = gamepad.axes[6];
        const dpadY = gamepad.axes[7];
        
        if (Math.abs(dpadX) > 0.5) {
            keys.left = dpadX < 0;
            keys.right = dpadX > 0;
        }
        
        if ((state === "menu" || state === "shop" || state === "palettes") && gamepadCooldown === 0) {
            if (dpadY < -0.5) {
                handleMenuNavigation("up");
                gamepadCooldown = 15;
            } else if (dpadY > 0.5) {
                handleMenuNavigation("down");
                gamepadCooldown = 15;
            }
        }
    }
    
    gamepad.buttons.forEach((button, index) => {
        if (!button.pressed) return;
        
        const mappedKey = GAMEPAD_MAPPING[index];
        if (!mappedKey) return;
        
        if (gamepadLastState[index] === button.pressed) return;
        gamepadLastState[index] = button.pressed;
        
        handleGamepadButton(mappedKey);
    });
    
    gamepad.buttons.forEach((button, index) => {
        if (!button.pressed && gamepadLastState[index]) {
            gamepadLastState[index] = false;
            
            const mappedKey = GAMEPAD_MAPPING[index];
            if (!mappedKey) return;
            
            switch(mappedKey) {
                case 'a': keys.a = false; keys.jump = false; break;
                case 'b': keys.b = false; keys.back = false; break;
                case 'start': keys.start = false; break;
                case 'select': keys.select = false; break;
                case 'x': keys.x = false; break;
                case 'y': keys.y = false; break;
            }
        }
    });
}

function handleGamepadButton(button) {
    switch(button) {
        case 'a':
            keys.a = true;
            keys.jump = true;
            handleControlInput("a", true);
            break;
        case 'b':
            keys.b = true;
            keys.back = true;
            handleControlInput("b", true);
            break;
        case 'start':
            keys.start = true;
            handleControlInput("start", true);
            break;
        case 'select':
            keys.select = true;
            handleControlInput("select", true);
            break;
        case 'x':
            keys.x = true;
            handleControlInput("x", true);
            break;
        case 'y':
            keys.y = true;
            handleControlInput("y", true);
            break;
    }
}

// ================= MANIPULAÇÃO DE INPUT UNIFICADA =================
function handleControlInput(input, isPressed) {
    if (!isPressed) return;
    
    // Tela inicial
    if (state === "launch") {
        if (input === "start" || input === "a" || input === "jump" || input === "action") {
            hideOverlay();
            state = "menu";
            beep(600);
        }
        return;
    }
    
    // Menu principal
    if (state === "menu") {
        if (input === "up") {
            menuIndex = Math.max(0, menuIndex - 1);
            beep(300);
        } else if (input === "down") {
            menuIndex = Math.min(5, menuIndex + 1);
            beep(300);
        } else if (input === "a" || input === "action" || input === "start") {
            handleMenuSelect();
        } else if (input === "b" || input === "back") {
            state = "launch";
            document.getElementById("overlay").style.display = "flex";
            beep(200);
        }
        return;
    }
    
    // Loja
    if (state === "shop") {
        if (input === "up") {
            shopIndex = Math.max(0, shopIndex - 1);
            beep(300);
        } else if (input === "down") {
            shopIndex = Math.min(3, shopIndex + 1);
            beep(300);
        } else if (input === "a" || input === "action") {
            handleShopPurchase();
        } else if (input === "b" || input === "back") {
            state = "menu";
            shopIndex = 0;
            beep(200);
        }
        return;
    }
    
    // Seleção de paletas
    if (state === "palettes") {
        if (input === "up") {
            paletteIndex = Math.max(0, paletteIndex - 1);
            beep(300);
        } else if (input === "down") {
            paletteIndex = Math.min(palettes.length - 1, paletteIndex + 1);
            beep(300);
        } else if (input === "a" || input === "action") {
            selectPalette();
        } else if (input === "b" || input === "back") {
            state = "menu";
            beep(200);
        }
        return;
    }
    
    // Jogo
    if (state === "game") {
        if (input === "start" || input === "select") {
            state = "pause";
            beep(300);
        }
        return;
    }
    
    // Pausa
    if (state === "pause") {
        if (input === "start" || input === "a") {
            state = "game";
            beep(300);
        } else if (input === "b" || input === "select") {
            state = "menu";
            beep(200);
        }
        return;
    }
}

function handleMenuNavigation(direction) {
    if (state === "menu") {
        if (direction === "up") {
            menuIndex = Math.max(0, menuIndex - 1);
        } else if (direction === "down") {
            menuIndex = Math.min(5, menuIndex + 1);
        }
        beep(300);
    } else if (state === "shop") {
        if (direction === "up") {
            shopIndex = Math.max(0, shopIndex - 1);
        } else if (direction === "down") {
            shopIndex = Math.min(3, shopIndex + 1);
        }
        beep(300);
    } else if (state === "palettes") {
        if (direction === "up") {
            paletteIndex = Math.max(0, paletteIndex - 1);
        } else if (direction === "down") {
            paletteIndex = Math.min(palettes.length - 1, paletteIndex + 1);
        }
        beep(300);
    }
}

// ================= INDICADOR DE CONTROLE =================
function updateControlIndicator() {
    const indicator = document.getElementById("currentControl");
    const keyboardIcon = document.getElementById("keyboardIcon");
    const gamepadIcon = document.getElementById("gamepadIcon");
    const touchIcon = document.getElementById("touchIcon");
    
    keyboardIcon.style.opacity = "0.3";
    gamepadIcon.style.opacity = "0.3";
    touchIcon.style.opacity = "0.3";
    
    switch(activeControl) {
        case "keyboard":
            indicator.textContent = "TECLADO ATIVO";
            keyboardIcon.style.opacity = "1";
            break;
        case "gamepad":
            indicator.textContent = "GAMEPAD ATIVO";
            gamepadIcon.style.opacity = "1";
            break;
        case "touch":
            indicator.textContent = "TOUCH ATIVO";
            touchIcon.style.opacity = "1";
            break;
        default:
            indicator.textContent = "AGUARDANDO CONTROLE...";
    }
}

function checkInactiveControl() {
    const now = Date.now();
    if (now - lastInputTime > INPUT_TIMEOUT) {
        if (state === "game" && activeControl !== "none") {
            return;
        }
        activeControl = "none";
        updateControlIndicator();
    }
}

// ================= FUNÇÕES DO JOGO =================
function hideOverlay() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("loading").style.display = "none";
    if (audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
            canPlayAudio = true;
        });
    }
}

function handleMenuSelect() {
    beep(600);
    switch(menuIndex) {
        case 0: // INICIAR
            if (!currentUser) {
                if (!createUser()) return;
            }
            startGame();
            break;
        case 1: // LOJA
            if (!currentUser) {
                alert("Crie um usuário primeiro!");
                return;
            }
            state = "shop";
            shopIndex = 0;
            break;
        case 2: // PALETAS
            if (!currentUser) {
                alert("Crie um usuário primeiro!");
                return;
            }
            state = "palettes";
            // Garantir que comece em uma paleta desbloqueada
            while (paletteIndex < palettes.length && !palettes[paletteIndex].unlocked) {
                paletteIndex++;
            }
            if (paletteIndex >= palettes.length) {
                paletteIndex = 0;
            }
            break;
        case 3: // RANKING
            if (!currentUser) {
                alert("Crie um usuário primeiro!");
                return;
            }
            showRanking();
            break;
        case 4: // AMIGOS
            if (!currentUser) {
                alert("Crie um usuário primeiro!");
                return;
            }
            showFriendSystem();
            break;
        case 5: // SAIR
            if (currentUser) {
                saveUserProgress();
            }
            state = "launch";
            document.getElementById("overlay").style.display = "flex";
            break;
    }
}

// Itens da loja - MODIFICADO: +2 VIDAS -> +1 VIDA
const shopItems = [
    { id: "doubleLife", name: "+1 VIDA", price: 20, type: "powerup" },
    { id: "jumpBoost", name: "SALTO DUPLO", price: 25, type: "powerup" },
    { id: "shield", name: "ESCUDO", price: 30, type: "powerup" },
    { id: "paletteToken", name: "TOKEN PALETA", price: 50, type: "token" }
];

function handleShopPurchase() {
    const item = shopItems[shopIndex];
    
    if (coins >= item.price) {
        coins -= item.price;
        localStorage.setItem("coins", coins);
        
        switch(item.id) {
            case "doubleLife":
                lives += 1; // MODIFICADO: 2 -> 1
                beep(500, 0.1);
                break;
            case "jumpBoost":
                player.jumpBoost = 3;
                beep(600, 0.1);
                break;
            case "shield":
                shield = 3;
                beep(700, 0.1);
                break;
            case "paletteToken":
                // Token para desbloquear uma paleta aleatória
                unlockRandomPalette();
                break;
        }
        
        createParticles(BASE_W/2, 70, 10, "#ffd700");
        beep(800, 0.1);
    } else {
        beep(200, 0.3);
    }
}

function unlockRandomPalette() {
    // Encontrar paletas ainda não desbloqueadas
    const lockedPalettes = palettes.filter(p => !p.unlocked && p.price > 0);
    
    if (lockedPalettes.length > 0) {
        // Escolher uma paleta aleatória para desbloquear
        const randomIndex = Math.floor(Math.random() * lockedPalettes.length);
        const paletteToUnlock = lockedPalettes[randomIndex];
        paletteToUnlock.unlocked = true;
        
        // Salvar no localStorage
        saveUnlockedPalettes();
        
        // Mostrar mensagem
        beep(1000, 0.2);
        beep(800, 0.2);
        createParticles(BASE_W/2, 70, 20, paletteToUnlock.colors.main);
        
        // Atualizar para a paleta desbloqueada
        paletteIndex = paletteToUnlock.id;
        localStorage.setItem("selectedPalette", paletteIndex);
    } else {
        // Todas as paletas já desbloqueadas
        coins += 50; // Devolve as moedas
        beep(300, 0.3);
    }
}

function selectPalette() {
    const palette = palettes[paletteIndex];
    
    if (palette.unlocked) {
        // Salvar paleta selecionada
        localStorage.setItem("selectedPalette", paletteIndex);
        beep(800, 0.1);
        createParticles(BASE_W/2, 70, 15, palette.colors.main);
    } else {
        // Tentar comprar a paleta
        if (coins >= palette.price) {
            coins -= palette.price;
            palette.unlocked = true;
            localStorage.setItem("coins", coins);
            saveUnlockedPalettes();
            localStorage.setItem("selectedPalette", paletteIndex);
            beep(1000, 0.2);
            createParticles(BASE_W/2, 70, 20, palette.colors.main);
        } else {
            beep(200, 0.3);
        }
    }
}

function startGame() {
    state = "game";
    score = 0;
    lives = 1;
    shield = 0;
    player.jumpBoost = 0;
    boss = null;
    platforms = [];
    items = [];
    particles = [];
    collectedItems = [];
    
    const startPlatform = {
        x: 68,
        y: 110,
        w: 24,
        h: 4,
        glitch: false,
        id: Date.now()
    };
    platforms.push(startPlatform);
    
    for (let i = 1; i < 7; i++) {
        createPlatform(Math.random() * (BASE_W - 24), startPlatform.y - i * 18);
    }
    
    player.x = startPlatform.x + 9;
    player.y = startPlatform.y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.facing = 1;
    
    beep(800, 0.2);
}

function createPlatform(x, y) {
    const glitch = Math.random() < 0.3;
    const id = Date.now() + Math.random();
    const platform = { x, y, w: 24, h: 4, glitch, id };
    platforms.push(platform);
    
    if (Math.random() < 0.4) {
        const itemType = Math.random() < 0.7 ? "coin" : "doubleLife";
        items.push({
            x: platform.x + platform.w/2 - 2,
            y: platform.y - 8,
            type: itemType,
            platformId: platform.id,
            collected: false,
            animation: 0
        });
    }
    
    return platform;
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2,
            life: 1,
            color: color || "#ffffff",
            size: Math.random() * 2 + 1
        });
    }
}

function spawnBoss() {
    if (boss || score < 17) return; // MODIFICADO: 30 -> 17
    
    // Escolher tipo de chefe baseado no score
    const bossTypeIndex = Math.floor((score / 17) % bossTypes.length);
    const bossType = bossTypes[bossTypeIndex];
    
    boss = {
        x: BASE_W/2 - bossType.w/2,
        y: -30,
        w: bossType.w,
        h: bossType.h,
        vx: bossType.vx,
        health: bossType.health,
        attackTimer: 0,
        glitchPhase: 0,
        type: bossType,
        attackPattern: bossType.attackPattern,
        special: bossType.special
    };
    
    // Efeitos sonoros diferentes para cada chefe
    beep(200 + bossTypeIndex * 50, 0.3);
    beep(150 + bossTypeIndex * 50, 0.3);
    beep(100 + bossTypeIndex * 50, 0.3);
}

// ================= UPDATE =================
function update() {
    checkInactiveControl();
    updateGamepad();
    
    if (menuCooldown > 0) {
        menuCooldown--;
    }
    
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.02;
        return p.life > 0;
    });
    
    if (boss && boss.type.special === "glitch") {
        glitchTimer++;
        glitchEffect = glitchTimer % 15 < 8;
    }
    
    if (state !== "game" && state !== "pause") return;
    if (state === "pause") return;
    
    player.vx = 0;
    
    // Controles de movimento - verifica touchState, movePad e teclado
    if (keys.left || touchState.left) {
        player.vx = -PLAYER_SPEED;
        player.facing = -1;
    }
    if (keys.right || touchState.right) {
        player.vx = PLAYER_SPEED;
        player.facing = 1;
    }
    
    player.x += player.vx;
    
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > BASE_W) player.x = BASE_W - player.w;
    
    // Pulo - verifica tanto touch quanto teclado
    if ((keys.jump || touchState.jump) && player.onGround) {
        player.vy = JUMP_FORCE;
        if (player.jumpBoost > 0) {
            player.vy *= 1.4;
            player.jumpBoost--;
        }
        beep(700);
        createParticles(player.x + player.w/2, player.y + player.h, 5, getCurrentPalette().main);
        // Resetar estado do pulo
        keys.jump = false;
        touchState.jump = false;
    }
    
    player.vy += GRAVITY;
    player.y += player.vy;
    player.onGround = false;
    
    platforms.forEach(platform => {
        if (platform.glitch && Date.now() % 600 < 300) return;
        
        if (player.x < platform.x + platform.w &&
            player.x + player.w > platform.x &&
            player.y + player.h > platform.y &&
            player.y + player.h < platform.y + platform.h + 4 &&
            player.vy >= 0) {
            
            player.y = platform.y - player.h;
            player.vy = 0;
            player.onGround = true;
            player.animation = (player.animation + 1) % 4;
        }
    });
    
    if (player.y < 60) {
        const delta = 60 - player.y;
        player.y = 60;
        
        platforms.forEach(p => p.y += delta);
        items.forEach(i => i.y += delta);
        if (boss) boss.y += delta;
    }
    
    items.forEach(item => {
        if (!item.collected) {
            item.animation = (item.animation || 0) + 0.1;
            
            if (player.x < item.x + 4 &&
                player.x + player.w > item.x &&
                player.y < item.y + 4 &&
                player.y + player.h > item.y) {
                
                item.collected = true;
                collectedItems.push({...item, collectTime: Date.now()});
                
                if (item.type === "coin") {
                    coins++;
                    beep(900, 0.05);
                    createParticles(item.x + 2, item.y + 2, 8, "#ffd700");
                } else if (item.type === "doubleLife") {
                    lives += 2; // MODIFICADO: 4 -> 2
                    beep(400, 0.15);
                    createParticles(item.x + 2, item.y + 2, 12, "#ff5555");
                }
                
                localStorage.setItem("coins", coins);
            }
        }
    });
    
    platforms = platforms.filter(platform => {
        if (platform.y > BASE_H) {
            score++;
            
            if (score % 17 === 0 && !boss) { // MODIFICADO: 30 -> 17
                spawnBoss();
            }
            
            items = items.filter(item => item.platformId !== platform.id);
            return false;
        }
        return true;
    });
    
    while (platforms.length < 8) {
        createPlatform(Math.random() * (BASE_W - 24), Math.random() * -20);
    }
    
    if (boss) {
        boss.x += boss.vx;
        if (boss.x <= 0 || boss.x + boss.w >= BASE_W) {
            boss.vx *= -1;
        }
        
        boss.attackTimer++;
        if (boss.attackTimer > 120) {
            // Diferentes padrões de ataque baseados no tipo de chefe
            switch(boss.type.attackPattern) {
                case "single":
                    items.push({
                        x: boss.x + boss.w/2,
                        y: boss.y + boss.h,
                        type: "bossAttack",
                        vx: (Math.random() - 0.5) * 2,
                        vy: 2,
                        life: 180
                    });
                    break;
                    
                case "triple":
                    for (let i = -1; i <= 1; i++) {
                        items.push({
                            x: boss.x + boss.w/2 + i * 10,
                            y: boss.y + boss.h,
                            type: "bossAttack",
                            vx: i * 1.5,
                            vy: 2,
                            life: 180
                        });
                    }
                    break;
                    
                case "rapid":
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            if (boss) {
                                items.push({
                                    x: boss.x + boss.w/2,
                                    y: boss.y + boss.h,
                                    type: "bossAttack",
                                    vx: (Math.random() - 0.5) * 3,
                                    vy: 2.5,
                                    life: 120
                                });
                            }
                        }, i * 15);
                    }
                    break;
                    
                case "wall":
                    for (let i = 0; i < 5; i++) {
                        items.push({
                            x: boss.x + i * 15,
                            y: boss.y + boss.h,
                            type: "bossAttack",
                            vx: 0,
                            vy: 1.8,
                            life: 200
                        });
                    }
                    break;
                    
                case "bounce":
                    items.push({
                        x: boss.x + boss.w/2,
                        y: boss.y + boss.h,
                        type: "bossAttack",
                        vx: (Math.random() - 0.5) * 2,
                        vy: 2,
                        life: 240,
                        bounce: true
                    });
                    break;
                    
                default:
                    items.push({
                        x: boss.x + boss.w/2,
                        y: boss.y + boss.h,
                        type: "bossAttack",
                        vx: (Math.random() - 0.5) * 2,
                        vy: 2,
                        life: 180
                    });
            }
            
            boss.attackTimer = 0;
            beep(100, 0.1);
        }
        
        // Comportamentos especiais
        if (boss.type.special === "teleport" && boss.attackTimer % 90 === 0) {
            boss.x = Math.random() * (BASE_W - boss.w);
        } else if (boss.type.special === "chase") {
            const playerCenter = player.x + player.w/2;
            const bossCenter = boss.x + boss.w/2;
            if (Math.abs(playerCenter - bossCenter) > 20) {
                boss.vx = playerCenter > bossCenter ? 1.8 : -1.8;
            }
        }
        
        if (player.x < boss.x + boss.w &&
            player.x + player.w > boss.x &&
            player.y < boss.y + boss.h &&
            player.y + player.h > boss.y &&
            player.invincible <= 0) {
            
            if (shield > 0) {
                shield--;
                beep(300, 0.1);
            } else {
                lives--;
                beep(200, 0.3);
            }
            player.invincible = 60;
            createParticles(player.x + player.w/2, player.y + player.h/2, 15, "#ff0000");
        }
        
        if (player.y + player.h < boss.y && 
            player.y + player.h + player.vy > boss.y &&
            player.x + player.w > boss.x &&
            player.x < boss.x + boss.w) {
            
            boss.health--;
            player.vy = JUMP_FORCE * 0.8;
            beep(800, 0.1);
            createParticles(boss.x + boss.w/2, boss.y, 20, getCurrentPalette().main);
            
            if (boss.health <= 0) {
                score += 50;
                coins += 10;
                boss = null;
                glitchEffect = false;
                beep(1000, 0.2);
                beep(800, 0.2);
                beep(600, 0.2);
                createParticles(BASE_W/2, 50, 30, "#ffd700");
            }
        }
    }
    
    if (player.y > BASE_H) {
        if (lives > 0) {
            lives--;
            player.y = 60;
            player.vy = 0;
            player.invincible = 30;
            beep(200, 0.3);
            createParticles(player.x + player.w/2, player.y + player.h/2, 20, "#ff5555");
        } else {
            if (score > highScore) {
                highScore = score;
                localStorage.setItem("highScore", highScore);
                
                // Salvar no perfil do usuário
                if (currentUser) {
                    saveUserProgress();
                }
            }
            localStorage.setItem("coins", coins);
            state = "menu";
            menuIndex = 0;
            beep(120, 0.5);
            beep(80, 0.5);
        }
    }
    
    if (player.invincible > 0) {
        player.invincible--;
    }
    
    collectedItems = collectedItems.filter(item => {
        return Date.now() - item.collectTime < 1000;
    });
}

// ================= RENDER =================
function render() {
    const pal = getCurrentPalette();
    
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    
    if (glitchEffect && boss) {
        ctx.fillStyle = `rgba(255, 0, 255, 0.1)`;
        ctx.fillRect(0, 0, BASE_W, BASE_H);
    }
    
    if (state === "launch") {
        ctx.fillStyle = pal.main;
        ctx.font = "10px monospace";
        ctx.fillText("NEXUS", 55, 55);
        ctx.font = "8px monospace";
        ctx.fillText("NEON PIXEL", 45, 75);
        ctx.fillText("PRESS START", 35, 100);
        
        if (activeControl !== "none") {
            ctx.fillStyle = pal.accent;
            ctx.fillText(`CONTROLE: ${activeControl.toUpperCase()}`, 25, 120);
        }
        return;
    }
    
    if (state === "menu") {
        ctx.fillStyle = pal.main;
        ctx.font = "10px monospace";
        ctx.fillText("MENU", 60, 30);
        
        ctx.font = "8px monospace";
        const menuItems = ["INICIAR", "LOJA", "PALETAS", "RANKING", "AMIGOS", "SAIR"];
        
        menuItems.forEach((item, index) => {
            const y = 55 + index * 15;
            const isSelected = menuIndex === index;
            
            if (isSelected) {
                ctx.fillStyle = pal.accent;
                ctx.fillRect(45, y - 8, 70, 10);
            }
            
            ctx.fillStyle = isSelected ? "#000" : pal.main;
            const prefix = isSelected ? "> " : "  ";
            ctx.fillText(prefix + item, 50, y);
        });
        
        ctx.fillStyle = "#666";
        if (activeControl === "gamepad") {
            ctx.fillText("USE ↑↓ OU ANALÓGICO", 20, 115);
            ctx.fillText("A PARA SELECIONAR", 25, 125);
        } else if (activeControl === "touch") {
            ctx.fillText("TOQUE NAS OPÇÕES", 25, 115);
            ctx.fillText("OU USE BOTÕES", 35, 125);
        } else {
            ctx.fillText("USE ↑↓ PARA NAVEGAR", 20, 115);
            ctx.fillText("ENTER PARA SELECIONAR", 15, 125);
        }
        
        // Adicionar info do usuário se logado
        if (currentUser) {
            ctx.fillStyle = pal.accent;
            ctx.fillText(`USER: ${currentUser.name}`, 5, 20);
            ctx.fillText(`ID: ${currentUser.id.substr(0, 10)}...`, 5, 30);
        }
        
        ctx.fillStyle = pal.accent;
        ctx.fillText(`RECORDE: ${highScore}`, 5, 140);
        ctx.fillText(`MOEDAS: ${coins}`, 85, 140);
        ctx.fillText(`PALETA: ${palettes[paletteIndex].name}`, 5, 150);
        
        return;
    }
    
    if (state === "shop") {
        ctx.fillStyle = pal.main;
        ctx.font = "10px monospace";
        ctx.fillText("LOJA", 60, 20);
        
        ctx.font = "8px monospace";
        ctx.fillStyle = pal.accent;
        ctx.fillText(`MOEDAS: ${coins}`, 50, 35);
        
        shopItems.forEach((item, index) => {
            const y = 55 + index * 18;
            const isSelected = shopIndex === index;
            const canBuy = coins >= item.price;
            
            if (isSelected) {
                ctx.fillStyle = canBuy ? pal.accent : "#ff5555";
                ctx.fillRect(25, y - 8, 110, 12);
            }
            
            ctx.fillStyle = isSelected ? "#000" : (canBuy ? pal.main : "#666");
            ctx.fillText(`${index + 1}) ${item.name} - ${item.price}`, 30, y);
            
            ctx.fillStyle = isSelected ? "#000" : "#888";
            if (item.id === "doubleLife") ctx.fillText("+1 vida extra", 35, y + 8);
            if (item.id === "jumpBoost") ctx.fillText("3 saltos altos", 35, y + 8);
            if (item.id === "shield") ctx.fillText("3 escudos", 35, y + 8);
            if (item.id === "paletteToken") ctx.fillText("Desbloqueia paleta", 35, y + 8);
        });
        
        ctx.fillStyle = "#666";
        ctx.fillText("A - COMPRAR  B - VOLTAR", 15, 135);
        ctx.fillText("TOKEN PALETA DESBLOQUEIA", 10, 145);
        ctx.fillText("UMA PALETA ALEATÓRIA!", 15, 155);
        
        return;
    }
    
    if (state === "palettes") {
        ctx.fillStyle = pal.main;
        ctx.font = "10px monospace";
        ctx.fillText("PALETAS DE CORES", 40, 20);
        
        ctx.font = "8px monospace";
        ctx.fillStyle = pal.accent;
        ctx.fillText(`MOEDAS: ${coins}`, 50, 35);
        ctx.fillText(`SELECIONADA: ${palettes[paletteIndex].name}`, 20, 45);
        
        // Mostrar paletas disponíveis
        const startY = 60;
        const itemsPerScreen = 5;
        const startIndex = Math.max(0, Math.min(paletteIndex - 2, palettes.length - itemsPerScreen));
        
        for (let i = 0; i < Math.min(itemsPerScreen, palettes.length - startIndex); i++) {
            const index = startIndex + i;
            const palette = palettes[index];
            const y = startY + i * 18;
            const isSelected = paletteIndex === index;
            const isCurrent = paletteIndex === index;
            const isUnlocked = palette.unlocked;
            
            if (isSelected) {
                ctx.fillStyle = isUnlocked ? pal.accent : "#ff5555";
                ctx.fillRect(10, y - 8, 140, 16);
            }
            
            // Preview da paleta
            const colors = palette.colors;
            for (let c = 0; c < 4; c++) {
                let color;
                switch(c) {
                    case 0: color = colors.bg; break;
                    case 1: color = colors.main; break;
                    case 2: color = colors.player; break;
                    case 3: color = colors.accent; break;
                }
                ctx.fillStyle = color;
                ctx.fillRect(15 + c * 10, y - 6, 8, 4);
            }
            
            // Nome e status
            ctx.fillStyle = isSelected ? "#000" : (isUnlocked ? pal.main : "#666");
            ctx.fillText(palette.name, 60, y);
            
            // Preço ou status
            if (!isUnlocked) {
                ctx.fillStyle = isSelected ? "#000" : "#ff5555";
                ctx.fillText(`${palette.price} moedas`, 110, y);
            } else if (isCurrent) {
                ctx.fillStyle = isSelected ? "#000" : "#00ff00";
                ctx.fillText("ATIVA", 110, y);
            } else {
                ctx.fillStyle = isSelected ? "#000" : "#00aa00";
                ctx.fillText("DISPONÍVEL", 100, y);
            }
        }
        
        ctx.fillStyle = "#666";
        ctx.fillText("A - SELECIONAR/COMPRAR", 10, 155);
        ctx.fillText("B - VOLTAR AO MENU", 20, 165);
        
        return;
    }
    
    if (state === "pause") {
        ctx.globalAlpha = 0.5;
        platforms.forEach(platform => {
            if (platform.glitch && Date.now() % 600 < 300) return;
            ctx.fillStyle = pal.main;
            ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        });
        ctx.fillStyle = pal.player;
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        
        ctx.fillStyle = pal.main;
        ctx.font = "10px monospace";
        ctx.fillText("PAUSADO", 55, 60);
        ctx.font = "8px monospace";
        ctx.fillText("A - CONTINUAR", 40, 80);
        ctx.fillText("B - MENU", 45, 95);
        
        ctx.fillStyle = pal.accent;
        ctx.fillText(`SCORE: ${score}`, 50, 130);
        ctx.fillText(`LIVES: ${lives}`, 50, 140);
        ctx.fillText(`PALETA: ${palettes[paletteIndex].name}`, 40, 150);
    }
    
    if (state === "game" || state === "pause") {
        if (state === "game") {
            platforms.forEach(platform => {
                if (platform.glitch && Date.now() % 600 < 300) return;
                
                ctx.fillStyle = pal.main;
                ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
                
                ctx.fillStyle = pal.accent;
                ctx.fillRect(platform.x + 2, platform.y, 1, 1);
                ctx.fillRect(platform.x + platform.w - 3, platform.y, 1, 1);
            });
            
            items.forEach(item => {
                if (item.collected) return;
                
                if (item.type === "coin") {
                    const anim = Math.sin(item.animation) * 2;
                    ctx.fillStyle = "#ffd700";
                    ctx.fillRect(item.x, item.y + anim, 4, 4);
                    ctx.fillStyle = "#ffaa00";
                    ctx.fillRect(item.x + 1, item.y + 1 + anim, 2, 2);
                } else if (item.type === "doubleLife") {
                    const pulse = Math.sin(item.animation * 2) * 0.5 + 0.5;
                    ctx.fillStyle = `rgb(255, ${85 + pulse * 100}, ${85 + pulse * 100})`;
                    ctx.fillRect(item.x, item.y, 4, 4);
                    ctx.fillStyle = "#ff0000";
                    ctx.fillRect(item.x + 1, item.y + 1, 2, 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(item.x + 1, item.y, 2, 1);
                    ctx.fillRect(item.x, item.y + 1, 1, 2);
                    ctx.fillRect(item.x + 3, item.y + 1, 1, 2);
                }
            });
            
            collectedItems.forEach(item => {
                const time = Date.now() - item.collectTime;
                const progress = time / 1000;
                const alpha = 1 - progress;
                const yOffset = progress * 20;
                
                if (item.type === "coin") {
                    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                    ctx.fillText("+1", item.x - 2, item.y - yOffset);
                } else if (item.type === "doubleLife") {
                    ctx.fillStyle = `rgba(255, 85, 85, ${alpha})`;
                    ctx.fillText("+2 VIDAS", item.x - 6, item.y - yOffset);
                }
            });
            
            if (boss) {
                ctx.fillStyle = glitchEffect ? "#ff00ff" : boss.type.color;
                ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
                
                // Desenhar detalhes baseados no tipo
                ctx.fillStyle = "#ffffff";
                if (boss.type.name === "SPINNER") {
                    // Desenhar spinner
                    const angle = Date.now() / 100;
                    const radius = boss.w/2;
                    const spikes = 8;
                    for (let i = 0; i < spikes; i++) {
                        const a = angle + (i * Math.PI * 2 / spikes);
                        const x1 = boss.x + boss.w/2;
                        const y1 = boss.y + boss.h/2;
                        const x2 = x1 + Math.cos(a) * radius;
                        const y2 = y1 + Math.sin(a) * radius;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                } else {
                    // Olhos padrão para outros chefes
                    ctx.fillRect(boss.x + 10, boss.y + 4, 4, 4);
                    ctx.fillRect(boss.x + boss.w - 14, boss.y + 4, 4, 4);
                }
                
                // Barra de vida
                ctx.fillStyle = "#ff0000";
                const healthWidth = (boss.health / boss.type.health) * (boss.w - 4);
                ctx.fillRect(boss.x + 2, boss.y - 5, healthWidth, 2);
                
                // Nome do chefe
                ctx.fillStyle = "#ffffff";
                ctx.font = "6px monospace";
                ctx.fillText(boss.type.name, boss.x + 5, boss.y - 8);
            }
            
            if (player.invincible <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.fillStyle = pal.player;
                ctx.fillRect(player.x, player.y, player.w, player.h);
                
                ctx.fillStyle = "#000000";
                const eyeX = player.facing > 0 ? player.x + 4 : player.x + 1;
                ctx.fillRect(eyeX, player.y + 2, 1, 1);
            }
            
            if (shield > 0) {
                ctx.strokeStyle = "#00ffff";
                ctx.lineWidth = 1;
                ctx.strokeRect(player.x - 2, player.y - 2, player.w + 4, player.h + 4);
                ctx.fillStyle = "#00ffff";
                ctx.font = "6px monospace";
                ctx.fillText(`ESC:${shield}`, player.x - 2, player.y - 4);
            }
            
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.globalAlpha = 1;
        }
        
        ctx.fillStyle = pal.ui;
        ctx.font = "8px monospace";
        ctx.fillText(`SCORE ${score}`, 4, 10);
        ctx.fillText(`LIVES ${lives}`, 4, 20);
        ctx.fillText(`COINS ${coins}`, 4, 30);
        if (shield > 0) ctx.fillText(`SHIELD ${shield}`, 4, 40);
        if (player.jumpBoost > 0) ctx.fillText(`JUMP x${player.jumpBoost}`, 4, 50);
        
        ctx.fillStyle = pal.accent;
        ctx.fillText(`${palettes[paletteIndex].name}`, BASE_W - 50, 10);
        
        if (activeControl !== "none") {
            let controlSymbol = "⌨️";
            if (activeControl === "gamepad") controlSymbol = "🎮";
            if (activeControl === "touch") controlSymbol = "👆";
            ctx.fillText(controlSymbol, BASE_W - 15, 10);
        }
    }
}

// ================= EVENTOS =================
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad conectado:", e.gamepad.id);
    gamepadConnected = true;
    activeControl = "gamepad";
    updateControlIndicator();
    beep(800, 0.1);
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad desconectado");
    gamepadConnected = false;
    if (activeControl === "gamepad") {
        activeControl = "none";
        updateControlIndicator();
    }
});

window.addEventListener("touchstart", (e) => {
    if (activeControl !== "touch") {
        activeControl = "touch";
        updateControlIndicator();
    }
    lastInputTime = Date.now();
    
    // Prevenir zoom com dois dedos
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// ================= INICIALIZAÇÃO =================
function init() {
    // Carregar usuário atual
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Atualizar dados do jogo do usuário
        highScore = currentUser.highScore;
        coins = currentUser.coins;
    }
    
    // Carregar listas
    userList = JSON.parse(localStorage.getItem("userList")) || [];
    friendList = JSON.parse(localStorage.getItem("friendList")) || [];
    
    // Carregar paletas desbloqueadas
    loadUnlockedPalettes();
    
    // Configurar controles touch otimizados
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        setupTouchControls();
    } else {
        // Se não for touch, mostrar indicador de controle
        document.getElementById("controlIndicator").style.display = "flex";
    }
    
    // Atualizar display do usuário
    updateUserDisplay();
    
    // Esconder loading
    setTimeout(() => {
        document.getElementById("loading").style.display = "none";
    }, 1000);
    
    // Focar no canvas
    canvas.focus();
    canvas.addEventListener("click", () => {
        if (audioCtx.state === "suspended") {
            audioCtx.resume().then(() => {
                canPlayAudio = true;
                beep(600);
            });
        }
        canvas.focus();
    });
    
    // Prevenir comportamento padrão do touch
    document.addEventListener('touchstart', function(e) {
        if (e.target === canvas || e.target.closest('#mobileControls') || 
            e.target.closest('#actionButtons') || e.target.closest('#menuTouch')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        if (e.target === canvas || e.target.closest('#mobileControls') || 
            e.target.closest('#actionButtons') || e.target.closest('#menuTouch')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevenir menu de contexto em toque prolongado
    document.addEventListener('contextmenu', function(e) {
        if (e.target === canvas || e.target.closest('#mobileControls') || 
            e.target.closest('#actionButtons') || e.target.closest('#menuTouch')) {
            e.preventDefault();
        }
    });
    
    // Iniciar loop
    gameLoop();
}

// ================= LOOP PRINCIPAL =================
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Iniciar quando carregado
window.addEventListener("load", init);