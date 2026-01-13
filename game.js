// ================= CONFIGURAÇÃO =================
        const BASE_W = 160;
        const BASE_H = 144;
        const SCALE = Math.min(
            Math.floor(window.innerWidth / BASE_W),
            Math.floor(window.innerHeight / BASE_H)
        ) || 3;
        
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

        // Carregar paletas desbloqueadas do localStorage
        function loadUnlockedPalettes() {
            const unlockedPalettes = JSON.parse(localStorage.getItem("unlockedPalettes")) || [0];
            palettes.forEach(palette => {
                palette.unlocked = unlockedPalettes.includes(palette.id);
            });
            
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
        }

        // Função para obter paleta atual
        function getCurrentPalette() {
            return palettes[paletteIndex].colors;
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
        
        const touchState = {
            left: false,
            right: false,
            jump: false,
            action: false,
            start: false,
            menu: false,
            shop: false
        };

        // Estado do touch
        let touchActive = false;
        let leftPadTouchId = null;
        let rightPadTouchId = null;

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

        // ================= TOUCH CONTROLS =================
        function setupTouchControls() {
            const leftPad = document.getElementById("leftPad");
            const rightPad = document.getElementById("rightPad");
            
            leftPad.addEventListener("touchstart", handleLeftPadTouch);
            leftPad.addEventListener("touchmove", handleLeftPadTouch);
            leftPad.addEventListener("touchend", handleLeftPadEnd);
            leftPad.addEventListener("touchcancel", handleLeftPadEnd);
            
            rightPad.addEventListener("touchstart", handleRightPadTouch);
            rightPad.addEventListener("touchmove", handleRightPadTouch);
            rightPad.addEventListener("touchend", handleRightPadEnd);
            rightPad.addEventListener("touchcancel", handleRightPadEnd);
            
            document.getElementById("jumpBtn").addEventListener("touchstart", (e) => {
                touchState.jump = true;
                keys.jump = true;
                touchActive = true;
                activeControl = "touch";
                updateControlIndicator();
                lastInputTime = Date.now();
                e.preventDefault();
            });
            
            document.getElementById("jumpBtn").addEventListener("touchend", (e) => {
                touchState.jump = false;
                keys.jump = false;
                e.preventDefault();
            });
            
            document.getElementById("actionBtn").addEventListener("touchstart", (e) => {
                touchState.action = true;
                keys.action = true;
                keys.a = true;
                touchActive = true;
                activeControl = "touch";
                updateControlIndicator();
                lastInputTime = Date.now();
                handleControlInput("action", true);
                e.preventDefault();
            });
            
            document.getElementById("actionBtn").addEventListener("touchend", (e) => {
                touchState.action = false;
                keys.action = false;
                keys.a = false;
                e.preventDefault();
            });
            
            document.getElementById("touchStart").addEventListener("touchstart", (e) => {
                touchState.start = true;
                keys.start = true;
                touchActive = true;
                activeControl = "touch";
                updateControlIndicator();
                lastInputTime = Date.now();
                handleControlInput("start", true);
                e.preventDefault();
            });
            
            document.getElementById("touchMenu").addEventListener("touchstart", (e) => {
                touchState.menu = true;
                keys.select = true;
                touchActive = true;
                activeControl = "touch";
                updateControlIndicator();
                lastInputTime = Date.now();
                handleControlInput("select", true);
                e.preventDefault();
            });
            
            document.getElementById("touchShop").addEventListener("touchstart", (e) => {
                touchState.shop = true;
                keys.y = true;
                touchActive = true;
                activeControl = "touch";
                updateControlIndicator();
                lastInputTime = Date.now();
                e.preventDefault();
            });
            
            ["touchend", "touchcancel"].forEach(event => {
                document.getElementById("touchStart").addEventListener(event, () => {
                    touchState.start = false;
                    keys.start = false;
                });
                document.getElementById("touchMenu").addEventListener(event, () => {
                    touchState.menu = false;
                    keys.select = false;
                });
                document.getElementById("touchShop").addEventListener(event, () => {
                    touchState.shop = false;
                    keys.y = false;
                });
            });
        }
        
        function handleLeftPadTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = touch.clientX - centerX;
            
            touchActive = true;
            if (activeControl !== "touch") {
                activeControl = "touch";
                updateControlIndicator();
            }
            lastInputTime = Date.now();
            
            if (Math.abs(deltaX) > 20) {
                if (deltaX < 0) {
                    touchState.left = true;
                    keys.left = true;
                    touchState.right = false;
                    keys.right = false;
                } else {
                    touchState.right = true;
                    keys.right = true;
                    touchState.left = false;
                    keys.left = false;
                }
            }
            
            if (!leftPadTouchId) {
                leftPadTouchId = touch.identifier;
            }
        }
        
        function handleRightPadTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = touch.clientX - centerX;
            const deltaY = touch.clientY - centerY;
            
            touchActive = true;
            if (activeControl !== "touch") {
                activeControl = "touch";
                updateControlIndicator();
            }
            lastInputTime = Date.now();
            
            if (Math.abs(deltaX) > 20) {
                if (deltaX < 0) {
                    touchState.left = true;
                    keys.left = true;
                } else {
                    touchState.right = true;
                    keys.right = true;
                }
            }
            
            if (deltaY < -30) {
                touchState.jump = true;
                keys.jump = true;
            }
            
            if (!rightPadTouchId) {
                rightPadTouchId = touch.identifier;
            }
        }
        
        function handleLeftPadEnd(e) {
            touchState.left = false;
            touchState.right = false;
            keys.left = false;
            keys.right = false;
            leftPadTouchId = null;
        }
        
        function handleRightPadEnd(e) {
            touchState.left = false;
            touchState.right = false;
            touchState.jump = false;
            keys.left = false;
            keys.right = false;
            keys.jump = false;
            rightPadTouchId = null;
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
                    menuIndex = Math.min(3, menuIndex + 1); // Agora tem 4 opções
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
                    shopIndex = Math.min(3, shopIndex + 1); // 4 itens na loja
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
                    menuIndex = Math.min(3, menuIndex + 1);
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
                    startGame();
                    break;
                case 1: // LOJA
                    state = "shop";
                    shopIndex = 0;
                    break;
                case 2: // PALETAS
                    state = "palettes";
                    // Garantir que comece em uma paleta desbloqueada
                    while (paletteIndex < palettes.length && !palettes[paletteIndex].unlocked) {
                        paletteIndex++;
                    }
                    if (paletteIndex >= palettes.length) {
                        paletteIndex = 0;
                    }
                    break;
                case 3: // SAIR
                    state = "launch";
                    document.getElementById("overlay").style.display = "flex";
                    break;
            }
        }

        // Itens da loja
        const shopItems = [
            { id: "doubleLife", name: "+2 VIDAS", price: 20, type: "powerup" },
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
                        lives += 2;
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
            if (boss || score < 30) return;
            
            boss = {
                x: BASE_W/2 - 40,
                y: -30,
                w: 80,
                h: 16,
                vx: 1.5,
                health: 10,
                attackTimer: 0,
                glitchPhase: 0
            };
            
            beep(200, 0.5);
            beep(150, 0.5);
            beep(100, 0.5);
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
            
            if (boss) {
                glitchTimer++;
                glitchEffect = glitchTimer % 20 < 10;
            }
            
            if (state !== "game" && state !== "pause") return;
            if (state === "pause") return;
            
            player.vx = 0;
            
            if (keys.left) {
                player.vx = -PLAYER_SPEED;
                player.facing = -1;
            }
            if (keys.right) {
                player.vx = PLAYER_SPEED;
                player.facing = 1;
            }
            
            player.x += player.vx;
            
            if (player.x < 0) player.x = 0;
            if (player.x + player.w > BASE_W) player.x = BASE_W - player.w;
            
            if (keys.jump && player.onGround) {
                player.vy = JUMP_FORCE;
                if (player.jumpBoost > 0) {
                    player.vy *= 1.4;
                    player.jumpBoost--;
                }
                beep(700);
                createParticles(player.x + player.w/2, player.y + player.h, 5, getCurrentPalette().main);
                keys.jump = false;
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
                            lives += 4;
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
                    
                    if (score % 30 === 0 && !boss) {
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
                    items.push({
                        x: boss.x + boss.w/2,
                        y: boss.y + boss.h,
                        type: "bossAttack",
                        vx: (Math.random() - 0.5) * 2,
                        vy: 2,
                        life: 180
                    });
                    boss.attackTimer = 0;
                    beep(100, 0.1);
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
                const menuItems = ["INICIAR", "LOJA", "PALETAS", "VOLTAR"];
                
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
                    if (item.id === "doubleLife") ctx.fillText("+2 vidas extras", 35, y + 8);
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
                            ctx.fillText("+4 VIDAS", item.x - 6, item.y - yOffset);
                        }
                    });
                    
                    if (boss) {
                        ctx.fillStyle = glitchEffect ? "#ff00ff" : pal.main;
                        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
                        
                        ctx.fillStyle = "#ff0000";
                        const healthWidth = (boss.health / 10) * (boss.w - 4);
                        ctx.fillRect(boss.x + 2, boss.y - 5, healthWidth, 2);
                        
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(boss.x + 10, boss.y + 4, 4, 4);
                        ctx.fillRect(boss.x + boss.w - 14, boss.y + 4, 4, 4);
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
        
        window.addEventListener("touchstart", () => {
            if (activeControl !== "touch") {
                activeControl = "touch";
                updateControlIndicator();
            }
            lastInputTime = Date.now();
        });

        // ================= INICIALIZAÇÃO =================
        function init() {
            // Carregar paletas desbloqueadas
            loadUnlockedPalettes();
            
            // Configurar controles touch
            if ('ontouchstart' in window || navigator.maxTouchPoints) {
                setupTouchControls();
            }
            
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