class Game {
    constructor() {
        console.log('Initialisation du jeu');
        this.setupPseudoDialog();
    }

    setupPseudoDialog() {
        const dialog = document.getElementById('pseudoDialog');
        const input = document.getElementById('pseudoInput');
        const startButton = document.getElementById('startButton');

        startButton.addEventListener('click', () => {
            const pseudo = input.value.trim();
            if (pseudo) {
                dialog.style.display = 'none';
                this.initGame(pseudo);
            } else {
                alert('Veuillez entrer un pseudo!');
            }
        });

        // Permettre l'utilisation de la touche Entrée
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startButton.click();
            }
        });
    }

    initGame(pseudo) {
        // Supprimer l'ancien canvas s'il existe
        const oldCanvas = document.getElementById('gameCanvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }

        // Créer un nouveau canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'gameCanvas';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Adapter la taille du canvas à la fenêtre
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Configuration du capybara
        this.capybara = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 50,
            height: 40,
            speed: 5,
            direction: 'right',
            hunger: 100,
            happiness: 100,
            isEating: false,
            frameCount: 0,
            isOnFire: false,
            wasOnFire: false,
            baseSpeed: 5,
            speed: 5,
            speedBoostEnd: 0,
            isSpeedBoosted: false,
            pseudo: pseudo
        };

        // Configuration de l'anaconda avec une queue plus longue
        this.anaconda = {
            x: 100,
            y: 100,
            width: 60,
            height: 30,
            speed: 1.5,
            direction: 'right',
            segments: [],
            tailLength: 25,
            history: [],
            maxHistory: 30,
            targetPos: null,
            lastUpdate: Date.now(),
            updateInterval: 500
        };

        // Initialiser les segments de l'anaconda avec une longueur plus importante
        for (let i = 0; i < this.anaconda.tailLength; i++) {
            this.anaconda.segments.push({
                x: this.anaconda.x - (i * 20),
                y: this.anaconda.y,
                width: this.anaconda.width * (1 - i/this.anaconda.tailLength * 0.7),
                height: this.anaconda.height * (1 - i/this.anaconda.tailLength * 0.5)
            });
        }

        // Taux de dégâts
        this.fireDamageRate = 0.1;
        this.snakeDamageRate = this.fireDamageRate * 5;

        // Obstacles et zones
        this.obstacles = [
            { x: this.canvas.width * 0.1, y: this.canvas.height * 0.2, width: 60, height: 60, type: 'rock' },
            { x: this.canvas.width * 0.7, y: this.canvas.height * 0.6, width: 80, height: 40, type: 'tree' },
            { x: this.canvas.width * 0.4, y: this.canvas.height * 0.3, width: 70, height: 70, type: 'rock' },
            { x: this.canvas.width * 0.2, y: this.canvas.height * 0.7, width: 60, height: 50, type: 'tree' }
        ];

        this.foodZones = [
            { x: this.canvas.width * 0.15, y: this.canvas.height * 0.15, width: 40, height: 40, food: 50 },
            { x: this.canvas.width * 0.85, y: this.canvas.height * 0.85, width: 40, height: 40, food: 50 }
        ];

        // Autres joueurs
        this.otherPlayers = new Map();

        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        this.socket = io();
        this.setupSocketEvents();
        this.setupEventListeners();

        // État du jeu
        this.gameOver = false;
        this.score = {
            foodEaten: 0,
            friendsMade: 0,
            timeAlive: 0
        };

        // Système météo
        this.weather = {
            current: 'sunny',
            intensity: 0,
            timeUntilChange: 1000,
            particles: []
        };

        // Sons (optionnels)
        this.sounds = {};
        this.initSounds();

        // État d'interaction
        this.isInteracting = false;
        this.interactionTarget = null;

        this.startWeatherCycle();
        this.startScoreTimer();

        // Configuration des fruits
        this.fruitsConfig = {
            salade: { pv: 5, color: '#1B4D21', radius: 8, weight: 2 },
            tomate: { pv: 3, color: '#FF6347', radius: 6, weight: 3 },
            pomme: { pv: 2, color: '#FF0800', radius: 5, weight: 4 },
            mangue: { pv: 10, color: '#FFD700', radius: 10, weight: 1 },
            boost: { pv: 0, color: '#FF69B4', radius: 12, weight: 1, isBoost: true }
        };

        this.fruits = [];
        this.generateFruits();

        // Ajouter les plaques de feu
        this.firePlates = [
            { x: this.canvas.width * 0.3, y: this.canvas.height * 0.3, width: 60, height: 60 },
            { x: this.canvas.width * 0.6, y: this.canvas.height * 0.5, width: 80, height: 40 },
            { x: this.canvas.width * 0.2, y: this.canvas.height * 0.8, width: 50, height: 50 }
        ];

        this.fireParticles = [];

        // Charger l'image du capybara
        // this.capybaraImage = new Image();
        // this.capybaraImage.src = 'assets/images/capybara.png';
        
        // Ajouter des logs pour débugger
        // this.capybaraImage.onload = () => {
        //     console.log('Image chargée avec succès');
        //     this.imageLoaded = true;
        // };

        // this.capybaraImage.onerror = () => {
        //     console.error('Erreur de chargement de l\'image');
        //     // Revenir au dessin par défaut si l'image ne charge pas
        //     this.imageLoaded = false;
        // };

        this.walls = [
            // Nouveau mur horizontal au tiers supérieur de la map
            {
                x: this.canvas.width * 0.2,  // Commence à 20% de la largeur
                y: this.canvas.height * 0.3, // À 30% de la hauteur
                width: 200,
                height: 20,
                color: '#808080' // Gris
            },
            
            // Nouveau mur vertical aux deux-tiers de la map
            {
                x: this.canvas.width * 0.7,  // À 70% de la largeur
                y: this.canvas.height * 0.4, // Commence à 40% de la hauteur
                width: 20,
                height: 180,
                color: '#808080' // Gris
            }
        ];

        this.gameLoop();
    }

    initSounds() {
        // Gestion des sons avec gestion d'erreur
        const soundFiles = {
            eat: 'assets/sounds/eat.mp3',
            rain: 'assets/sounds/rain.mp3',
            friend: 'assets/sounds/friend.mp3'
        };

        for (const [key, path] of Object.entries(soundFiles)) {
            try {
                const sound = new Audio(path);
                sound.volume = 0.3;
                this.sounds[key] = sound;
            } catch (error) {
                console.log(`Son non chargé: ${key}`);
                this.sounds[key] = { play: () => {}, pause: () => {} }; // Objet muet
            }
        }
    }

    setupSocketEvents() {
        this.socket.emit('playerJoin', {
            x: this.capybara.x,
            y: this.capybara.y,
            direction: this.capybara.direction,
            pseudo: this.capybara.pseudo
        });

        this.socket.on('playerUpdate', (players) => {
            this.otherPlayers = new Map(Object.entries(players));
            this.otherPlayers.delete(this.socket.id);
        });
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });

        // Touche E pour interagir avec d'autres capybaras
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                this.tryInteract();
            }
        });

        // Ajouter l'écouteur pour recommencer le jeu
        window.addEventListener('keydown', (e) => {
            if (this.gameOver && e.code === 'Space') {
                this.resetGame();
            }
        });
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    update() {
        if (this.gameOver) return;

        // Mettre à jour l'état du boost de vitesse
        this.updateSpeedBoost();

        let newX = this.capybara.x;
        let newY = this.capybara.y;

        // Mouvement
        if (this.keys.ArrowUp) newY -= this.capybara.speed;
        if (this.keys.ArrowDown) newY += this.capybara.speed;
        if (this.keys.ArrowLeft) {
            newX -= this.capybara.speed;
            this.capybara.direction = 'left';
        }
        if (this.keys.ArrowRight) {
            newX += this.capybara.speed;
            this.capybara.direction = 'right';
        }

        // Vérification des collisions avec les obstacles
        const newPosition = {
            x: newX,
            y: newY,
            width: this.capybara.width,
            height: this.capybara.height
        };

        let canMove = true;
        for (let obstacle of this.obstacles) {
            if (this.checkCollision(newPosition, obstacle)) {
                canMove = false;
                break;
            }
        }

        // Mise à jour de la position si pas de collision
        if (canMove) {
            this.capybara.x = Math.max(0, Math.min(newX, this.canvas.width - this.capybara.width));
            this.capybara.y = Math.max(0, Math.min(newY, this.canvas.height - this.capybara.height));
        }

        // Vérification des zones de nourriture
        this.capybara.isEating = false;
        for (let zone of this.foodZones) {
            if (this.checkCollision(this.capybara, zone) && this.keys.Space && zone.food > 0) {
                this.capybara.isEating = true;
                this.capybara.hunger = Math.min(100, this.capybara.hunger + 0.5);
                zone.food -= 0.5;
            }
        }

        // Vérification des collisions avec les fruits
        let fruitEaten = false;
        let eatenFruitIndex = -1;

        for (let i = 0; i < this.fruits.length; i++) {
            const fruit = this.fruits[i];
            const distance = Math.hypot(
                this.capybara.x + this.capybara.width/2 - fruit.x,
                this.capybara.y + this.capybara.height/2 - fruit.y
            );

            if (distance < fruit.radius + this.capybara.width/3) {
                if (fruit.isBoost) {
                    // Activer le boost de vitesse
                    this.activateSpeedBoost();
                } else {
                    // Effet normal des fruits
                    this.capybara.hunger = Math.min(100, this.capybara.hunger + fruit.pv);
                    this.score.foodEaten += fruit.pv;
                }

                this.createEatingEffect(fruit);
                fruitEaten = true;
                eatenFruitIndex = i;
                break;
            }
        }

        // Si un fruit a été mangé, générer un nouveau fruit pour le remplacer
        if (fruitEaten) {
            this.replaceSingleFruit(eatenFruitIndex);
        }

        // Vérifier si le capybara est sur une plaque de feu
        this.capybara.isOnFire = false;
        for (let plate of this.firePlates) {
            if (this.checkCollision(this.capybara, plate)) {
                this.capybara.isOnFire = true;
                // Dégâts de feu accélérés
                this.capybara.hunger = Math.max(0, this.capybara.hunger - this.fireDamageRate);
                this.createFireDamageEffect();
                break;
            }
        }

        // Vérifier si le capybara est mort
        if (this.capybara.hunger <= 0) {
            this.gameOver = true;
            this.handleGameOver();
        }

        // Mettre à jour les particules de feu
        this.updateFireParticles();

        // Diminution naturelle de la faim
        this.capybara.hunger = Math.max(0, this.capybara.hunger - 0.02);

        // Animation
        this.capybara.frameCount = (this.capybara.frameCount + 1) % 60;

        // Envoi de la position aux autres joueurs
        this.socket.emit('updatePosition', {
            x: this.capybara.x,
            y: this.capybara.y,
            direction: this.capybara.direction
        });

        this.updateWeather();

        // Effets de la météo sur le capybara
        if (this.weather.current === 'rainy') {
            this.capybara.speed = 4; // Plus lent sous la pluie
            this.capybara.hunger -= 0.03; // Plus faim sous la pluie
        } else if (this.weather.current === 'foggy') {
            this.capybara.speed = 3; // Encore plus lent dans le brouillard
        } else {
            this.capybara.speed = 5; // Vitesse normale au soleil
        }

        // Mettre à jour l'anaconda
        this.updateAnaconda();

        // Vérifier la collision avec l'anaconda
        if (this.checkCollisionWithAnaconda()) {
            this.capybara.hunger = Math.max(0, this.capybara.hunger - this.snakeDamageRate);
            this.createSnakeDamageEffect();
        }
    }

    drawCapybara(x, y, direction, isMainPlayer = false, isEating = false, pseudo = '') {
        const breathingOffset = Math.sin(this.capybara.frameCount * 0.1) * 2;
        
        // Corps principal
        this.ctx.fillStyle = '#8B4513'; // Marron plus réaliste
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + this.capybara.width / 2,
            y + this.capybara.height / 2 + breathingOffset,
            this.capybara.width / 1.8,
            this.capybara.height / 1.8,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Ventre plus clair
        this.ctx.fillStyle = '#DEB887'; // Beige clair
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + this.capybara.width / 2,
            y + this.capybara.height / 1.7 + breathingOffset,
            this.capybara.width / 2.2,
            this.capybara.height / 2.5,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Tête
        const headX = x + (direction === 'right' ? this.capybara.width * 0.7 : this.capybara.width * 0.3);
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.arc(
            headX,
            y + this.capybara.height * 0.4 + breathingOffset,
            this.capybara.width * 0.25,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Museau
        const snoutX = headX + (direction === 'right' ? 15 : -15);
        this.ctx.fillStyle = '#6B4423';
        this.ctx.beginPath();
        this.ctx.ellipse(
            snoutX,
            y + this.capybara.height * 0.45 + breathingOffset,
            12,
            8,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Nez
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(
            snoutX + (direction === 'right' ? 5 : -5),
            y + this.capybara.height * 0.43 + breathingOffset,
            3,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Yeux
        this.ctx.fillStyle = '#000000';
        const eyeBaseX = headX + (direction === 'right' ? -5 : 5);
        const eyeY = y + this.capybara.height * 0.35 + breathingOffset;
        
        // Œil principal
        this.ctx.beginPath();
        this.ctx.arc(
            eyeBaseX,
            eyeY,
            4,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Reflet dans l'œil
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(
            eyeBaseX + (direction === 'right' ? 1 : -1),
            eyeY - 1,
            1.5,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Oreilles
        this.ctx.fillStyle = '#8B4513';
        const earX = headX + (direction === 'right' ? -10 : 10);
        this.ctx.beginPath();
        this.ctx.arc(
            earX,
            y + this.capybara.height * 0.25 + breathingOffset,
            6,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Pattes avant
        this.ctx.fillStyle = '#8B4513';
        const frontLegX = x + (direction === 'right' ? this.capybara.width * 0.6 : this.capybara.width * 0.4);
        this.ctx.fillRect(
            frontLegX,
            y + this.capybara.height * 0.7,
            10,
            20
        );

        // Pattes arrière
        const backLegX = x + (direction === 'right' ? this.capybara.width * 0.3 : this.capybara.width * 0.7);
        this.ctx.fillRect(
            backLegX,
            y + this.capybara.height * 0.7,
            10,
            20
        );

        // Animation de manger
        if (isEating) {
            this.ctx.fillStyle = '#228B22';
            this.ctx.beginPath();
            this.ctx.arc(
                snoutX + (direction === 'right' ? 10 : -10),
                y + this.capybara.height * 0.5 + breathingOffset,
                5,
                0, Math.PI * 2
            );
            this.ctx.fill();
        }

        // Barre de PV pour le joueur principal
        if (isMainPlayer) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x, y - 15, this.capybara.width, 5);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(x, y - 15, this.capybara.width * (this.capybara.hunger / 100), 5);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            const pvText = `${Math.floor(this.capybara.hunger)}/100 PV`;
            this.ctx.strokeText(pvText, x + this.capybara.width + 5, y - 10);
            this.ctx.fillText(pvText, x + this.capybara.width + 5, y - 10);

            // Ajouter le pseudo au-dessus du capybara
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            
            const pseudoToShow = isMainPlayer ? this.capybara.pseudo : pseudo;
            this.ctx.strokeText(pseudoToShow, x + this.capybara.width/2, y - 30);
            this.ctx.fillText(pseudoToShow, x + this.capybara.width/2, y - 30);
        }

        // Effet visuel pour le boost de vitesse
        if (this.capybara.isSpeedBoosted && isMainPlayer) {
            // Aura rose plus intense
            const gradient = this.ctx.createRadialGradient(
                x + this.capybara.width/2,
                y + this.capybara.height/2,
                this.capybara.width/2,
                x + this.capybara.width/2,
                y + this.capybara.height/2,
                this.capybara.width
            );
            gradient.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 105, 180, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                x - this.capybara.width/2,
                y - this.capybara.height/2,
                this.capybara.width * 2,
                this.capybara.height * 2
            );

            // Afficher le temps restant du boost
            if (isMainPlayer) {
                const timeLeft = Math.ceil((this.capybara.speedBoostEnd - Date.now()) / 1000);
                if (timeLeft > 0) {
                    this.ctx.fillStyle = '#FF69B4';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(`Boost: ${timeLeft}s`, x, y - 25);
                }
            }
        }
    }

    draw() {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessiner l'herbe
        for (let i = 0; i < 50; i++) {
            this.ctx.fillStyle = '#228B22';
            this.ctx.fillRect(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                5, 10
            );
        }

        // Dessiner les obstacles
        for (let obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.type === 'rock' ? '#808080' : '#4a2810';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }

        // Dessiner les zones de nourriture
        for (let zone of this.foodZones) {
            this.ctx.fillStyle = `rgba(34, 139, 34, ${zone.food / 50})`;
            this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        }

        // Dessiner les autres joueurs avec leurs pseudos
        for (let [id, player] of this.otherPlayers) {
            this.drawCapybara(
                player.x,
                player.y,
                player.direction,
                false,
                false,
                player.pseudo // Passer le pseudo du joueur
            );
        }

        // Dessiner le capybara principal
        this.drawCapybara(
            this.capybara.x,
            this.capybara.y,
            this.capybara.direction,
            true,
            this.capybara.isEating,
            this.capybara.pseudo
        );

        // Dessiner les fruits
        for (let fruit of this.fruits) {
            // Ajuster la taille pour les pommes
            let fruitRadius = fruit.type === 'pomme' ? fruit.radius * 2 : fruit.radius;

            // Ombre du fruit
            this.ctx.beginPath();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            
            if (fruit.type === 'mangue') {
                // Ombre ovale pour la mangue
                this.ctx.ellipse(
                    fruit.x, 
                    fruit.y + fruitRadius/2, 
                    fruitRadius * 1.3, // Plus large
                    fruitRadius * 0.8, // Plus court
                    Math.PI / 4, // Rotation de 45 degrés
                    0, 
                    Math.PI * 2
                );
            } else {
                // Ombre ronde pour les autres fruits
                this.ctx.ellipse(
                    fruit.x, 
                    fruit.y + fruitRadius/2, 
                    fruitRadius, 
                    fruitRadius/3, 
                    0, 
                    0, 
                    Math.PI * 2
                );
            }
            this.ctx.fill();

            // Fruit
            this.ctx.beginPath();
            this.ctx.fillStyle = fruit.color;
            
            if (fruit.type === 'mangue') {
                // Forme ovale pour la mangue
                this.ctx.ellipse(
                    fruit.x, 
                    fruit.y, 
                    fruitRadius * 1.3, // Plus large
                    fruitRadius * 0.8, // Plus court
                    Math.PI / 4, // Rotation de 45 degrés
                    0, 
                    Math.PI * 2
                );
            } else {
                // Forme ronde pour les autres fruits
                this.ctx.arc(
                    fruit.x, 
                    fruit.y, 
                    fruitRadius, 
                    0, 
                    Math.PI * 2
                );
            }
            this.ctx.fill();

            // Reflet sur le fruit
            this.ctx.beginPath();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            if (fruit.type === 'mangue') {
                // Reflet ovale pour la mangue
                this.ctx.ellipse(
                    fruit.x - fruitRadius/3,
                    fruit.y - fruitRadius/3,
                    fruitRadius/3,
                    fruitRadius/5,
                    Math.PI / 4,
                    0,
                    Math.PI * 2
                );
            } else {
                // Reflet rond pour les autres fruits
                this.ctx.arc(
                    fruit.x - fruitRadius/3,
                    fruit.y - fruitRadius/3,
                    fruitRadius/4,
                    0,
                    Math.PI * 2
                );
            }
            this.ctx.fill();

            // Ajouter la feuille verte pour les pommes
            if (fruit.type === 'pomme') {
                this.ctx.beginPath();
                this.ctx.fillStyle = '#2D5A27'; // Vert foncé pour la feuille
                this.ctx.arc(
                    fruit.x, 
                    fruit.y - fruitRadius - 2, // Ajusté la position verticale
                    2.7, // Réduit de 8 à environ 2.7 (divisé par 3)
                    0, 
                    Math.PI * 2
                );
                this.ctx.fill();
            }

            // Ajouter l'éclair pour le fruit boost
            if (fruit.isBoost) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('⚡', fruit.x, fruit.y);
            }
        }

        // Dessiner les plaques de feu
        for (let plate of this.firePlates) {
            // Fond de la plaque
            this.ctx.fillStyle = '#8B0000';
            this.ctx.fillRect(plate.x, plate.y, plate.width, plate.height);

            // Effet de lave
            this.ctx.fillStyle = '#FF4500';
            for (let i = 0; i < 5; i++) {
                const x = plate.x + Math.random() * plate.width;
                const y = plate.y + Math.random() * plate.height;
                const size = Math.random() * 8 + 4;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Dessiner les particules de feu
        for (let particle of this.fireParticles) {
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Effet visuel quand le capybara est sur le feu
        if (this.capybara.isOnFire) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            this.ctx.fillRect(
                this.capybara.x,
                this.capybara.y,
                this.capybara.width,
                this.capybara.height
            );
        }

        this.drawWeather();
        this.drawScore();

        // Dessiner l'anaconda
        this.drawAnaconda();

        // Si game over, afficher l'écran de fin
        if (this.gameOver) {
            this.drawGameOver();
        }
    }

    gameLoop() {
        console.log('Game loop en cours');
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    startWeatherCycle() {
        setInterval(() => {
            this.weather.timeUntilChange--;
            if (this.weather.timeUntilChange <= 0) {
                this.changeWeather();
            }
        }, 1000);
    }

    changeWeather() {
        const weathers = ['sunny', 'rainy', 'foggy'];
        const oldWeather = this.weather.current;
        do {
            this.weather.current = weathers[Math.floor(Math.random() * weathers.length)];
        } while (this.weather.current === oldWeather);

        this.weather.intensity = 0;
        this.weather.timeUntilChange = Math.random() * 300 + 300; // 5-10 minutes

        if (this.weather.current === 'rainy') {
            // this.rainSound.play();
        } else {
            // this.rainSound.pause();
        }
    }

    startScoreTimer() {
        setInterval(() => {
            this.score.timeAlive++;
            // Bonus de score pour rester en vie
            if (this.capybara.hunger > 50) {
                this.score.foodEaten += 0.1;
            }
        }, 1000);
    }

    tryInteract() {
        for (let [id, player] of this.otherPlayers) {
            const distance = Math.hypot(
                player.x - this.capybara.x,
                player.y - this.capybara.y
            );

            if (distance < 100) { // Distance d'interaction
                this.isInteracting = true;
                this.interactionTarget = id;
                this.score.friendsMade++;
                this.capybara.happiness += 10;
                // this.friendSound.play();
                
                // Émission de l'interaction
                this.socket.emit('interaction', {
                    targetId: id
                });

                // Animation d'amitié
                this.createFriendshipParticles();
                break;
            }
        }
    }

    createFriendshipParticles() {
        for (let i = 0; i < 10; i++) {
            this.weather.particles.push({
                x: this.capybara.x + this.capybara.width / 2,
                y: this.capybara.y,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 5 - 2,
                life: 60,
                color: '#ff69b4'
            });
        }
    }

    updateWeather() {
        if (this.weather.current === 'rainy') {
            // Ajouter des gouttes de pluie
            if (Math.random() < 0.3) {
                this.weather.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: 0,
                    vx: 0,
                    vy: 7,
                    life: 100,
                    color: '#add8e6'
                });
            }
        }

        // Mettre à jour les particules
        this.weather.particles = this.weather.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0;
        });
    }

    drawWeather() {
        if (this.weather.current === 'foggy') {
            this.ctx.fillStyle = `rgba(200, 200, 200, 0.3)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Dessiner les particules
        for (let particle of this.weather.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawScore() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${Math.floor(this.score.foodEaten + this.score.friendsMade * 10)}`, 10, 30);
        this.ctx.fillText(`Amis: ${this.score.friendsMade}`, 10, 50);
        this.ctx.fillText(`Temps: ${this.score.timeAlive}s`, 10, 70);
        this.ctx.fillText(`Météo: ${this.weather.current}`, 10, 90);
    }

    generateFruits() {
        this.fruits = [];
        const totalFruits = 20;
        let fruitsToGenerate = [];

        // Créer la liste des fruits selon leur poids
        for (let [fruitName, config] of Object.entries(this.fruitsConfig)) {
            for (let i = 0; i < config.weight; i++) {
                fruitsToGenerate.push(fruitName);
            }
        }

        // Générer 20 fruits aléatoires
        for (let i = 0; i < totalFruits; i++) {
            let validPosition = false;
            let newFruit;

            while (!validPosition) {
                const x = Math.random() * (this.canvas.width - 20) + 10;
                const y = Math.random() * (this.canvas.height - 20) + 10;
                
                const randomFruit = fruitsToGenerate[Math.floor(Math.random() * fruitsToGenerate.length)];
                
                newFruit = {
                    x: x,
                    y: y,
                    type: randomFruit,
                    ...this.fruitsConfig[randomFruit]
                };

                validPosition = true;
                
                // Vérifier collision avec obstacles
                for (let obstacle of this.obstacles) {
                    if (this.checkCollision({
                        x: newFruit.x - newFruit.radius,
                        y: newFruit.y - newFruit.radius,
                        width: newFruit.radius * 2,
                        height: newFruit.radius * 2
                    }, obstacle)) {
                        validPosition = false;
                        break;
                    }
                }

                // Vérifier collision avec autres fruits
                for (let fruit of this.fruits) {
                    const distance = Math.hypot(fruit.x - newFruit.x, fruit.y - newFruit.y);
                    if (distance < (fruit.radius + newFruit.radius) * 2) {
                        validPosition = false;
                        break;
                    }
                }
            }

            this.fruits.push(newFruit);
        }
    }

    createEatingEffect(fruit) {
        // Créer des particules quand on mange un fruit
        for (let i = 0; i < 5; i++) {
            this.weather.particles.push({
                x: fruit.x,
                y: fruit.y,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2 - 1,
                life: 30,
                color: fruit.color
            });
        }
    }

    createFireParticles(plate) {
        if (Math.random() < 0.3) {
            this.fireParticles.push({
                x: plate.x + Math.random() * plate.width,
                y: plate.y + plate.height,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 2,
                life: 30,
                size: Math.random() * 3 + 2
            });
        }
    }

    updateFireParticles() {
        this.fireParticles = this.fireParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy -= 0.1; // Les particules montent plus vite
            particle.life--;
            return particle.life > 0;
        });
    }

    createFireDamageEffect() {
        // Effet visuel plus intense pour les dégâts de feu
        for (let i = 0; i < 12; i++) {
            this.weather.particles.push({
                x: this.capybara.x + this.capybara.width/2,
                y: this.capybara.y + this.capybara.height/2,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4 - 2,
                life: 30,
                color: `hsl(${Math.random() * 30 + 10}, 100%, 50%)`  // Couleurs de feu
            });
        }
    }

    handleGameOver() {
        // Arrêter les sons si présents
        Object.values(this.sounds).forEach(sound => {
            if (sound.pause) sound.pause();
        });
    }

    drawGameOver() {
        // Assombrir l'écran
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Texte "GAME OVER"
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);

        // Score final
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(
            `Score final: ${Math.floor(this.score.foodEaten + this.score.friendsMade * 10)}`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 50
        );
        this.ctx.fillText(
            `Temps de survie: ${this.score.timeAlive} secondes`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 80
        );

        // Message pour recommencer
        this.ctx.font = '20px Arial';
        this.ctx.fillText(
            'Appuyez sur ESPACE pour recommencer',
            this.canvas.width / 2,
            this.canvas.height / 2 + 120
        );
    }

    resetGame() {
        // Réinitialiser les propriétés du jeu
        this.gameOver = false;
        this.capybara = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 50,
            height: 40,
            speed: 5,
            direction: 'right',
            hunger: 100,
            happiness: 100,
            isEating: false,
            frameCount: 0,
            baseSpeed: 5,
            speed: 5,
            speedBoostEnd: 0,
            isSpeedBoosted: false,
            pseudo: ''
        };

        this.score = {
            foodEaten: 0,
            friendsMade: 0,
            timeAlive: 0
        };

        // Régénérer les fruits
        this.generateFruits();

        // Réinitialiser la météo
        this.weather.current = 'sunny';
        this.weather.timeUntilChange = 1000;
        this.weather.particles = [];

        // Réinitialiser l'anaconda
        this.anaconda.x = 100;
        this.anaconda.y = 100;
        this.anaconda.segments = [];
        for (let i = 0; i < this.anaconda.tailLength; i++) {
            this.anaconda.segments.push({
                x: this.anaconda.x - (i * 20),
                y: this.anaconda.y,
                width: this.anaconda.width * (1 - i/this.anaconda.tailLength * 0.7),
                height: this.anaconda.height * (1 - i/this.anaconda.tailLength * 0.5)
            });
        }
    }

    updateAnaconda() {
        const now = Date.now();
        
        // Mettre à jour le chemin vers le capybara
        if (now - this.anaconda.lastUpdate > this.anaconda.updateInterval) {
            this.anaconda.targetPos = {
                x: this.capybara.x,
                y: this.capybara.y
            };
            this.anaconda.lastUpdate = now;
        }

        // Calculer la direction vers le capybara
        if (this.anaconda.targetPos) {
            const dx = this.capybara.x - this.anaconda.x;
            const dy = this.capybara.y - this.anaconda.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                const speed = this.anaconda.speed;
                const vx = (dx / distance) * speed;
                const vy = (dy / distance) * speed;

                // Mettre à jour la position de la tête
                this.anaconda.x += vx;
                this.anaconda.y += vy;
                this.anaconda.direction = dx > 0 ? 'right' : 'left';

                // Ajouter la position actuelle à l'historique
                this.anaconda.history.unshift({ x: this.anaconda.x, y: this.anaconda.y });
                
                // Limiter la taille de l'historique
                if (this.anaconda.history.length > this.anaconda.maxHistory) {
                    this.anaconda.history.pop();
                }

                // Mettre à jour les segments avec un effet de suivi fluide
                for (let i = 0; i < this.anaconda.segments.length; i++) {
                    const segment = this.anaconda.segments[i];
                    const historyIndex = Math.min(i * 2, this.anaconda.history.length - 1);
                    
                    if (this.anaconda.history[historyIndex]) {
                        const target = this.anaconda.history[historyIndex];
                        segment.x += (target.x - segment.x) * 0.5;
                        segment.y += (target.y - segment.y) * 0.5;
                    }
                }
            }
        }
    }

    checkCollisionWithAnaconda() {
        // Vérifier la collision avec la tête et les segments
        for (let segment of [this.anaconda, ...this.anaconda.segments]) {
            if (this.checkCollision(this.capybara, {
                x: segment.x - this.anaconda.width/2,
                y: segment.y - this.anaconda.height/2,
                width: this.anaconda.width,
                height: this.anaconda.height
            })) {
                return true;
            }
        }
        return false;
    }

    createSnakeDamageEffect() {
        // Effet visuel pour les dégâts du serpent
        for (let i = 0; i < 15; i++) {
            this.weather.particles.push({
                x: this.capybara.x + this.capybara.width/2,
                y: this.capybara.y + this.capybara.height/2,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 5 - 3,
                life: 40,
                color: '#32CD32' // Vert pour le poison du serpent
            });
        }
    }

    drawAnaconda() {
        // Dessiner la queue en premier (de l'arrière vers l'avant)
        for (let i = this.anaconda.segments.length - 1; i >= 0; i--) {
            const segment = this.anaconda.segments[i];
            const ratio = 1 - i / this.anaconda.segments.length;
            
            // Couleur qui devient plus foncée vers la queue
            const green = Math.floor(139 + (34 - 139) * ratio);
            this.ctx.fillStyle = `rgb(0, ${green}, 0)`;

            // Corps du segment avec effet d'ondulation plus prononcé
            const wave = Math.sin(Date.now() * 0.005 + i * 0.5) * 5;
            this.ctx.beginPath();
            this.ctx.ellipse(
                segment.x,
                segment.y + wave,
                segment.width / 2,
                segment.height / 2,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();

            // Écailles (motif plus détaillé)
            if (i < this.anaconda.segments.length - 1) {
                this.ctx.fillStyle = `rgba(0, ${green - 20}, 0, 0.5)`;
                this.ctx.beginPath();
                this.ctx.arc(
                    segment.x,
                    segment.y + wave,
                    segment.width / 4,
                    0, Math.PI * 2
                );
                this.ctx.fill();
            }
        }

        // Dessiner la tête
        const head = this.anaconda.segments[0];
        this.ctx.fillStyle = '#006400';
        this.ctx.beginPath();
        this.ctx.ellipse(
            this.anaconda.x,
            this.anaconda.y,
            this.anaconda.width / 2,
            this.anaconda.height / 2,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Yeux
        this.ctx.fillStyle = 'yellow';
        const eyeOffsetX = this.anaconda.direction === 'right' ? 15 : -15;
        this.ctx.beginPath();
        this.ctx.arc(
            this.anaconda.x + eyeOffsetX,
            this.anaconda.y - 5,
            5,
            0, Math.PI * 2
        );
        this.ctx.fill();

        // Langue avec animation plus fluide
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        const tongueWave = Math.sin(Date.now() * 0.01) * 5;
        this.ctx.beginPath();
        const tongueX = this.anaconda.direction === 'right' ? 20 : -20;
        this.ctx.moveTo(this.anaconda.x + eyeOffsetX, this.anaconda.y + 5);
        this.ctx.lineTo(this.anaconda.x + eyeOffsetX + tongueX/2, this.anaconda.y + 15 + tongueWave);
        this.ctx.lineTo(this.anaconda.x + eyeOffsetX + tongueX, this.anaconda.y + 5);
        this.ctx.stroke();
    }

    replaceSingleFruit(indexToReplace) {
        // Créer la liste pondérée des fruits
        let fruitsToChooseFrom = [];
        for (let [fruitName, config] of Object.entries(this.fruitsConfig)) {
            for (let i = 0; i < config.weight; i++) {
                fruitsToChooseFrom.push(fruitName);
            }
        }

        let validPosition = false;
        let newFruit;

        while (!validPosition) {
            // Position aléatoire
            const x = Math.random() * (this.canvas.width - 20) + 10;
            const y = Math.random() * (this.canvas.height - 20) + 10;
            
            // Choisir un fruit aléatoire selon la distribution pondérée
            const randomFruit = fruitsToChooseFrom[Math.floor(Math.random() * fruitsToChooseFrom.length)];
            
            newFruit = {
                x: x,
                y: y,
                type: randomFruit,
                ...this.fruitsConfig[randomFruit]
            };

            // Vérifier qu'il n'y a pas de collision avec d'autres éléments
            validPosition = true;
            
            // Vérifier collision avec obstacles
            for (let obstacle of this.obstacles) {
                if (this.checkCollision({
                    x: newFruit.x - newFruit.radius,
                    y: newFruit.y - newFruit.radius,
                    width: newFruit.radius * 2,
                    height: newFruit.radius * 2
                }, obstacle)) {
                    validPosition = false;
                    break;
                }
            }

            // Vérifier collision avec autres fruits
            for (let i = 0; i < this.fruits.length; i++) {
                if (i !== indexToReplace) {
                    const fruit = this.fruits[i];
                    const distance = Math.hypot(fruit.x - newFruit.x, fruit.y - newFruit.y);
                    if (distance < (fruit.radius + newFruit.radius) * 2) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }

        // Remplacer uniquement le fruit mangé par le nouveau
        this.fruits[indexToReplace] = newFruit;
    }

    updateSpeedBoost() {
        if (this.capybara.isSpeedBoosted) {
            if (Date.now() >= this.capybara.speedBoostEnd) {
                // Fin du boost
                this.capybara.isSpeedBoosted = false;
                this.capybara.speed = this.capybara.baseSpeed;
            }
        }
    }

    activateSpeedBoost() {
        this.capybara.isSpeedBoosted = true;
        this.capybara.speed = this.capybara.baseSpeed * 2; // Multiplier par 2 au lieu de 1.7
        this.capybara.speedBoostEnd = Date.now() + 10000; // 10 secondes de boost
        this.createBoostEffect();
    }

    createBoostEffect() {
        // Effet visuel plus intense pour le doublement de vitesse
        for (let i = 0; i < 20; i++) {
            this.weather.particles.push({
                x: this.capybara.x + this.capybara.width/2,
                y: this.capybara.y + this.capybara.height/2,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 5 - 2,
                life: 50,
                color: '#FF69B4'
            });
        }
    }
}

// Démarrer le jeu quand la page est chargée
window.onload = () => {
    console.log('Page chargée, démarrage du jeu');
    new Game();
}; 