import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const infoElement = document.getElementById('info');
infoElement.textContent = 'Initialisation...';

//Scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x88BBEE, 0.01);

//Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

//Renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

function loadHDRBackground() {
    const hdrLoader = new RGBELoader();
    hdrLoader.setDataType(THREE.FloatType);
    
    infoElement.textContent = 'Chargement du fond...';
    
    hdrLoader.load('assets/background/rogland_moonlit_night_4k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        scene.background = texture;
        scene.environment = texture;
        
        infoElement.textContent = 'Fond chargé avec succès!';
        
        adjustLightsForHDR();
    }, 
    (xhr) => {
        const percent = xhr.loaded / xhr.total * 100;
        infoElement.textContent = `Chargement du fond: ${percent.toFixed(0)}%`;
    },
    (error) => {
        console.error('Erreur lors du chargement du fond HDR:', error);
        infoElement.textContent = 'Erreur lors du chargement du fond. Utilisation du fond par défaut.';
        scene.background = new THREE.Color(0x87ceeb);
    });
}

function adjustLightsForHDR() {
    ambientLight.intensity = 0.2;
    
    directionalLight.intensity = 0.7;
    
    fillLight.intensity = 0.2;
}

loadHDRBackground();

const GROUND_SIZE = 100;
const BOUNDARY_SIZE = GROUND_SIZE / 2;
const PLAYER_SIZE = 1.0;

const textureLoader = new THREE.TextureLoader();

const defaultGroundMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });

const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1);
const ground = new THREE.Mesh(groundGeometry, defaultGroundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

textureLoader.load(
    'assets/jungle_trees/textures/Jungle_Floor_Material_diffuse.png',
    function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            map: texture,
            color: 0x999999,
        });
        
        ground.material = groundMaterial;
        ground.material.needsUpdate = true;
    },
    undefined,
    function(error) {
        console.error('Erreur lors du chargement de la texture du sol:', error);
        infoElement.textContent = "Impossible de charger la texture du sol";
        
        ground.material = new THREE.MeshPhongMaterial({ 
            color: 0x4CAF50, 
            flatShading: false 
        });
    }
);

function createBoundaryWall(width, height, depth, x, y, z) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wallMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        transparent: true,
        opacity: 0.3
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, y, z);
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
}

// Créer les quatre murs
const wallHeight = 5;
const wallThickness = 2;
// Mur nord
createBoundaryWall(GROUND_SIZE + wallThickness*2, wallHeight, wallThickness, 0, wallHeight/2, -BOUNDARY_SIZE - wallThickness/2);
// Mur sud
createBoundaryWall(GROUND_SIZE + wallThickness*2, wallHeight, wallThickness, 0, wallHeight/2, BOUNDARY_SIZE + wallThickness/2);
// Mur est
createBoundaryWall(wallThickness, wallHeight, GROUND_SIZE + wallThickness*2, BOUNDARY_SIZE + wallThickness/2, wallHeight/2, 0);
// Mur ouest
createBoundaryWall(wallThickness, wallHeight, GROUND_SIZE + wallThickness*2, -BOUNDARY_SIZE - wallThickness/2, wallHeight/2, 0);

// Tableaux pour stocker les obstacles
const trees = [];
const rocks = [];

// Fonction pour créer un arbre simple
function createTree(x, z, scale) {
    const treeGroup = new THREE.Group();
    
    // Tronc
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);
    
    // Feuillage
    const foliageGeometry = new THREE.ConeGeometry(2, 6, 8);
    const foliageMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 7;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    treeGroup.add(foliage);
    
    // Position et échelle
    treeGroup.position.set(x, 0, z);
    treeGroup.scale.set(scale, scale, scale);
    
    // détection de collision
    treeGroup.userData.collisionRadius = 1.5 * scale; 
    
    scene.add(treeGroup);
    trees.push(treeGroup);
    return treeGroup;
}

// Créer des rochers
function createRock(x, z, scale) {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    
    // Position et rotation aléatoire
    rock.position.set(x, 0.5, z);
    rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    rock.scale.set(scale, scale * 0.7, scale);
    
    // détection de collision
    rock.userData.collisionRadius = 1.0 * scale;
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    scene.add(rock);
    rocks.push(rock);
    return rock;
}

// Créer des herbes hautes
function createTallGrass(x, z) {
    const grassGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const grassMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4CAF50,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    
    const grassBlade = new THREE.Mesh(grassGeometry, grassMaterial);
    grassBlade.position.set(x, 0.75, z);
    grassBlade.rotation.x = Math.PI / 2;
    
    const grassBlade2 = grassBlade.clone();
    grassBlade2.rotation.z = Math.PI / 2;
    
    const grassGroup = new THREE.Group();
    grassGroup.add(grassBlade);
    grassGroup.add(grassBlade2);
    
    scene.add(grassGroup);
    return grassGroup;
}

// Tableau pour stocker les rats
let rats = [];

// Modifier les variables globales pour le rat
let currentRat = null;
let ratMixer = null;
let ratAnimations = [];
let ratAction = null;

// Variables de jeu
const gameState = {
    level: 2,  // Commencer au niveau 2 pour plus de vitesse
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    ratSpeed: 0.15,  // Vitesse de base du rat plus élevée
    ratsNeededForNextLevel: 5
};

const gameUI = document.createElement('div');
gameUI.style.position = 'absolute';
gameUI.style.top = '10px';
gameUI.style.left = '10px';
gameUI.style.color = 'white';
gameUI.style.fontFamily = 'Arial, sans-serif';
gameUI.style.fontSize = '18px';
gameUI.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
gameUI.innerHTML = `
    <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 5px;">
        <div>Niveau: <span id="levelDisplay">1</span></div>
        <div>Score: <span id="scoreDisplay">0</span></div>
        <div>Record: <span id="highScoreDisplay">${gameState.highScore}</span></div>
        <div>Rats restants: <span id="ratsLeftDisplay">${gameState.ratsNeededForNextLevel}</span></div>
    </div>
`;
document.body.appendChild(gameUI);

// Fonction pour mettre à jour l'interface
function updateGameUI() {
    document.getElementById('levelDisplay').textContent = gameState.level;
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('highScoreDisplay').textContent = gameState.highScore;
    document.getElementById('ratsLeftDisplay').textContent = 
        Math.max(0, gameState.ratsNeededForNextLevel - (gameState.score % gameState.ratsNeededForNextLevel));
}

// Fonction pour passer au niveau suivant
function levelUp() {
    gameState.level++;
    gameState.ratSpeed += 0.04; // Augmenter davantage la vitesse des rats à chaque niveau
    ratMovement.speed = gameState.ratSpeed;
    
    // Effet visuel pour le changement de niveau
    const levelUpText = document.createElement('div');
    levelUpText.style.position = 'absolute';
    levelUpText.style.top = '50%';
    levelUpText.style.left = '50%';
    levelUpText.style.transform = 'translate(-50%, -50%)';
    levelUpText.style.color = '#FFD700';
    levelUpText.style.fontSize = '48px';
    levelUpText.style.fontWeight = 'bold';
    levelUpText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    levelUpText.textContent = `Niveau ${gameState.level}!`;
    document.body.appendChild(levelUpText);
    
    // Animation de l'effet
    let opacity = 1;
    const fadeOut = setInterval(() => {
        opacity -= 0.02;
        levelUpText.style.opacity = opacity;
        if (opacity <= 0) {
            document.body.removeChild(levelUpText);
            clearInterval(fadeOut);
        }
    }, 20);
}

// Fonction pour charger le rat
function loadRat() {
    if (currentRat) {
        scene.remove(currentRat);
        currentRat = null;
    }

    infoElement.textContent = 'Chargement du rat...';
    
    const ratLoader = new GLTFLoader();
    ratLoader.load(
        'assets/rat/rat.glb',
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.3, 0.3, 0.3);
            
            let ratX, ratZ;
            let positionValid = false;
            let attempts = 0;
            
            while (!positionValid && attempts < 50) {
                ratX = (Math.random() * 2 - 1) * (BOUNDARY_SIZE - 10);
                ratZ = (Math.random() * 2 - 1) * (BOUNDARY_SIZE - 10);
                
                const distanceToPlayer = player ? 
                    Math.sqrt(Math.pow(ratX - player.position.x, 2) + Math.pow(ratZ - player.position.z, 2)) : 
                    Infinity;
                
                const testPosition = new THREE.Vector3(ratX, 0, ratZ);
                positionValid = !checkCollision(testPosition, 1.0) && distanceToPlayer > 15;
                
                attempts++;
            }
            
            if (!positionValid) {
                ratX = 20;
                ratZ = 20;
            }
            
            model.position.set(ratX, 0, ratZ);
            
            // Configuration du modèle
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    node.material = new THREE.MeshPhongMaterial({
                        color: 0x8B4513,
                        emissive: 0x331100,
                        shininess: 30,
                        specular: 0x111111
                    });
                }
            });
            
            // Configuration de l'animation
            if (gltf.animations && gltf.animations.length > 0) {
                ratMixer = new THREE.AnimationMixer(model);
                ratAnimations = gltf.animations;
                
                if (ratAnimations.length >= 1) {
                    ratAction = ratMixer.clipAction(ratAnimations[0]);
                    ratAction.play();
                }
            }
            
            // Sauvegarder la référence au rat actuel
            currentRat = model;
            scene.add(currentRat);
            
            // Initialiser le mouvement
            initRatMovement();
            
            // Mettre à jour la vitesse du rat en fonction du niveau
            ratMovement.speed = gameState.ratSpeed;
            
            infoElement.textContent = 'Rat chargé avec succès!';
        },
        (xhr) => {
            const percent = xhr.loaded / xhr.total * 100;
            infoElement.textContent = `Chargement du rat: ${percent.toFixed(0)}%`;
        },
        (error) => {
            console.error('Erreur lors du chargement du rat:', error);
            infoElement.textContent = `Erreur de chargement du rat: ${error.message}`;
        }
    );
}

// Variables pour le mouvement du rat
const ratMovement = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1),
    speed: 0.2,
    changeDirectionTime: 0,
    changeDirectionInterval: 3
};

// Initialiser le mouvement du rat
function initRatMovement() {
    // Normaliser la direction
    ratMovement.direction.normalize();
}

// Mettre à jour le mouvement du rat
function updateRatMovement(delta) {
    if (!currentRat) return;
    
    // Mettre à jour le temps et changer de direction si nécessaire
    ratMovement.changeDirectionTime += delta;
    if (ratMovement.changeDirectionTime >= ratMovement.changeDirectionInterval) {
        ratMovement.direction.x = Math.random() * 2 - 1;
        ratMovement.direction.y = Math.random() * 2 - 1;
        ratMovement.direction.normalize();
        
        ratMovement.changeDirectionTime = 0;
        ratMovement.changeDirectionInterval = 2 + Math.random() * 3;
    }
    
    // Déplacer le rat avec delta normalisé pour consistance
    const normalizedDelta = Math.min(delta, 0.05) * 60; // Normalisation basée sur 60fps
    const moveSpeed = ratMovement.speed * normalizedDelta;
    
    currentRat.position.x += ratMovement.direction.x * moveSpeed;
    currentRat.position.z += ratMovement.direction.y * moveSpeed;
    
    // Orienter le rat dans la direction du mouvement
    currentRat.rotation.y = Math.atan2(ratMovement.direction.x, ratMovement.direction.y);
    
    // Vérifier les limites
    const limit = BOUNDARY_SIZE - 5;
    let hitBoundary = false;
    
    if (currentRat.position.x > limit) {
        currentRat.position.x = limit;
        hitBoundary = true;
    } else if (currentRat.position.x < -limit) {
        currentRat.position.x = -limit;
        hitBoundary = true;
    }
    
    if (currentRat.position.z > limit) {
        currentRat.position.z = limit;
        hitBoundary = true;
    } else if (currentRat.position.z < -limit) {
        currentRat.position.z = -limit;
        hitBoundary = true;
    }
    
    if (hitBoundary) {
        ratMovement.direction.x = -ratMovement.direction.x;
        ratMovement.direction.y = -ratMovement.direction.y;
        ratMovement.direction.normalize();
    }
}

// Placer des objets de manière aléatoire
function placeObjectsRandomly() {
    // Arbres
    const numTrees = 15;
    for (let i = 0; i < numTrees; i++) {
        const x = (Math.random() - 0.5) * (GROUND_SIZE - 10);
        const z = (Math.random() - 0.5) * (GROUND_SIZE - 10);
        const scale = 0.7 + Math.random() * 0.6;
        createTree(x, z, scale);
    }
    
    // Rochers
    const numRocks = 20;
    for (let i = 0; i < numRocks; i++) {
        const x = (Math.random() - 0.5) * (GROUND_SIZE - 5);
        const z = (Math.random() - 0.5) * (GROUND_SIZE - 5);
        const scale = 0.5 + Math.random() * 1.5;
        createRock(x, z, scale);
    }
    
    // Herbes hautes
    const numGrass = 40;
    for (let i = 0; i < numGrass; i++) {
        const x = (Math.random() - 0.5) * (GROUND_SIZE - 5);
        const z = (Math.random() - 0.5) * (GROUND_SIZE - 5);
        createTallGrass(x, z);
    }
}

// Placer les objets
placeObjectsRandomly();

// Charger les rats
loadRat();

const playerPlaceholder = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshPhongMaterial({ color: 0xFF0000 })
);
playerPlaceholder.position.y = 1;
scene.add(playerPlaceholder);

let player = playerPlaceholder;
let mixer = null; 
let animations = []; 
let currentAction = null; 
let idleAction = null;
let moveAction = null;

// Ajuster les paramètres de déplacement pour un contrôle plus précis
const movementControls = {
    velocity: new THREE.Vector3(0, 0, 0),  // Vélocité actuelle
    direction: new THREE.Vector3(0, 0, 0),  // Direction souhaitée
    speed: 0.065,                          // Augmenter davantage pour une meilleure réactivité
    maxSpeed: 0.25,                        // Augmenter pour un déplacement plus rapide
    turnSpeed: 0.15,                       // Augmenter pour une rotation plus rapide
    friction: 0.85,                        // Maintenir la même friction
    isMoving: false,
    threshold: 0.001,
    hitBoundary: false,
    targetRotation: 0,                     // Rotation cible
    currentRotation: 0,                    // Rotation actuelle
    followCamera: true
};

const cameraControls = {
    distance: 15,
    minDistance: 5,
    maxDistance: 30,
    height: 8,
    minHeight: 2,
    maxHeight: 20,
    rotationX: 0,
    rotationY: 0,
    minRotationY: -Math.PI / 4,
    maxRotationY: Math.PI / 4,
    sensitivity: 0.005,
    zoomSensitivity: 0.1,
    smoothing: 0.1,
    isLocked: false,
    isFreeMode: false
};

infoElement.textContent = 'Chargement du modèle...';

const loader = new GLTFLoader();
loader.load(
    'assets/predator/four-legged-frost-predator..glb',
    (gltf) => {
        infoElement.textContent = 'Modèle chargé avec succès!';
        
        const model = gltf.scene;
        model.scale.set(2, 2, 2); // Échelle fixe
        model.position.y = 0;
        
        // Simplifier la gestion du modèle - juste s'assurer qu'il est visible
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Stocker juste la rotation d'origine pour un mouvement simple
                node.userData.originalRotation = node.rotation.clone();
            }
        });
        
        console.log("Modèle chargé:", model);
        
        // Désactiver les animations intégrées
        mixer = null;
        animations = [];
        moveAction = null;
        idleAction = null;
        currentAction = null;
        
        infoElement.textContent = `Modèle chargé avec succès!`;
        
        scene.remove(playerPlaceholder);
        player = model;
        scene.add(player);
        
        console.log("Prédateur positionné à:", player.position);
        
        // Vérifier et corriger la position du joueur au chargement
        setTimeout(rescuePlayerIfStuck, 1000);
    },
    (xhr) => {
        const percent = xhr.loaded / xhr.total * 100;
        infoElement.textContent = `Chargement: ${percent.toFixed(2)}%`;
    },
    (error) => {
        infoElement.textContent = `Erreur: ${error.message}`;
        console.error('Erreur lors du chargement du modèle:', error);
    }
);

//Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Lumière directionnelle principale (soleil)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(30, 100, 30);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -70;
directionalLight.shadow.camera.right = 70;
directionalLight.shadow.camera.top = 70;
directionalLight.shadow.camera.bottom = -70;
scene.add(directionalLight);

// Lumière d'appoint pour adoucir les ombres
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
fillLight.position.set(-30, 10, -30);
scene.add(fillLight);

//Movement
const keys = {
    z: false,
    q: false,
    s: false,
    d: false,
    shift: false  // Pour un mouvement plus rapide
};

//Event - Keyboard
window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'z': keys.z = true; break;
        case 'q': keys.q = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case 'shift': keys.shift = true; break;
        case 'c': 
            // Basculer entre le mode caméra libre et caméra fixe
            cameraControls.isFreeMode = !cameraControls.isFreeMode;
            infoElement.textContent = cameraControls.isFreeMode ? 
                "Mode caméra libre (souris pour tourner)" : 
                "Mode caméra fixe";
            break;
        case 'r':
            if (currentRat && player) {
                // Trouver une position sûre près du rat
                const nearRatPosition = new THREE.Vector3(
                    currentRat.position.x + 5, 
                    0, 
                    currentRat.position.z + 5
                );
                
                // Vérifier si cette position est sûre, sinon trouver une position sûre
                const playerCollisionRadius = PLAYER_SIZE / 2;
                const teleportPosition = checkCollision(nearRatPosition, playerCollisionRadius) ?
                    findSafePosition(currentRat.position, playerCollisionRadius) : nearRatPosition;
                
                player.position.copy(teleportPosition);
                infoElement.textContent = "Téléporté près du rat!";
                setTimeout(() => {
                    infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";
                }, 2000);
            }
            break;
        case ' ': // Touche Espace
            // Activer la fonction de sauvetage
            rescuePlayerIfStuck();
            break;
        case 'Escape':
            togglePause();
            break;
    }
    updateMovementState();
});

window.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'z': keys.z = false; break;
        case 'q': keys.q = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case 'shift': keys.shift = false; break;
    }
    updateMovementState();
});

// Event - Mouse
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
        // Calculer le déplacement de la souris
        const deltaX = e.clientX - lastMouseX;
        
        // En mode caméra libre, permettre aussi de modifier l'angle vertical
        if (cameraControls.isFreeMode) {
            const deltaY = e.clientY - lastMouseY;
            cameraControls.rotationY -= deltaY * cameraControls.sensitivity;
            
            // Limiter la rotation verticale pour éviter les inversions
            cameraControls.rotationY = Math.max(
                cameraControls.minRotationY,
                Math.min(cameraControls.maxRotationY, cameraControls.rotationY)
            );
        }
        
        // Mettre à jour la rotation horizontale de la caméra
        cameraControls.rotationX -= deltaX * cameraControls.sensitivity;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        // Actualiser l'état du mouvement pour s'aligner avec la nouvelle direction de la caméra
        updateMovementState();
    }
});

// Event - Molette de la souris pour le zoom
window.addEventListener('wheel', (e) => {
    if (cameraControls.isFreeMode) {
        // Zoom avant/arrière avec la molette
        cameraControls.distance += e.deltaY * cameraControls.zoomSensitivity;
        
        // Limiter la distance
        cameraControls.distance = Math.max(
            cameraControls.minDistance,
            Math.min(cameraControls.maxDistance, cameraControls.distance)
        );
    }
});

// Instructions
infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";

// Mettre à jour l'état du mouvement en fonction des touches appuyées
function updateMovementState() {
    // Réinitialiser la direction souhaitée
    movementControls.direction.set(0, 0, 0);
    
    // Obtenir la direction de la caméra
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    cameraDirection.y = 0; // Garder le mouvement horizontal
    cameraDirection.normalize();
    
    // Obtenir le vecteur latéral
    const cameraRight = new THREE.Vector3(1, 0, 0);
    cameraRight.applyQuaternion(camera.quaternion);
    cameraRight.y = 0;
    cameraRight.normalize();
    
    // Force du mouvement
    const moveForce = 1.0;
    
    // Appliquer les entrées clavier avec des poids plus prononcés
    if (keys.z) {
        movementControls.direction.add(cameraDirection.clone().multiplyScalar(moveForce));
    }
    if (keys.s) {
        movementControls.direction.add(cameraDirection.clone().multiplyScalar(-moveForce));
    }
    if (keys.q) {
        movementControls.direction.add(cameraRight.clone().multiplyScalar(-moveForce));
    }
    if (keys.d) {
        movementControls.direction.add(cameraRight.clone().multiplyScalar(moveForce));
    }
    
    // Normaliser la direction, mais conserver l'intensité des touches
    if (movementControls.direction.length() > 0) {
        // Normaliser mais conserver une partie de l'intensité
        if (movementControls.direction.length() > 1.5) {
            movementControls.direction.normalize().multiplyScalar(1.2);
        }
        movementControls.isMoving = true;
        
        // Calculer la rotation cible
        movementControls.targetRotation = Math.atan2(
            movementControls.direction.x,
            movementControls.direction.z
        );
        
        // Nous n'utilisons plus les animations de mouvement
    } else {
        movementControls.isMoving = false;
        
        // Nous n'utilisons plus les animations d'idle
    }
}

//Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Débogage pour vérifier que les rats sont correctement instanciés
function checkRats() {
    console.log(`===== VÉRIFICATION DES RATS =====`);
    console.log(`Nombre de rats: ${rats.length}`);
    
    if (rats.length === 0) {
        console.warn("Aucun rat n'a été créé!");
        return;
    }
    
    for (let i = 0; i < rats.length; i++) {
        const rat = rats[i];
        console.log(`Rat ${i+1}:`);
        console.log(` - Position: (${rat.model.position.x.toFixed(2)}, ${rat.model.position.y.toFixed(2)}, ${rat.model.position.z.toFixed(2)})`);
        console.log(` - Direction: (${rat.direction.x.toFixed(2)}, ${rat.direction.y.toFixed(2)})`);
        console.log(` - Vitesse: ${rat.speed.toFixed(5)}`);
        console.log(` - Animation: ${rat.action ? "Active" : "Non définie"}`);
    }
    console.log(`================================`);
}

// Horloge pour suivre le temps écoulé
const clock = new THREE.Clock();

// Programme débogage rats après 2 secondes
setTimeout(checkRats, 2000);

//Animation
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameControls.isPaused) {
        const delta = clock.getDelta();
        
        // Nous n'avons plus besoin de mettre à jour les animations du prédateur
        // Le mixer est maintenant null
        
        // Mettre à jour l'animation du rat
        if (ratMixer) {
            ratMixer.update(delta);
        }
        
        // Mettre à jour le mouvement du rat
        updateRatMovement(delta);
        
        // Gérer le mouvement du personnage
        updateMovement(delta);
        
        // Mettre à jour la caméra
        updateCamera();
        
        renderer.render(scene, camera);
    }
}

// Simplifier la fonction updateMovement pour une animation basique
function updateMovement(delta) {
    if (!player) return;

    // Normaliser delta pour éviter les problèmes liés à la fréquence d'images
    const normalizedDelta = Math.min(delta, 0.05);
    const deltaFactor = normalizedDelta * 60; // Facteur basé sur 60fps pour constance

    // Rotation plus directe et rapide
    if (movementControls.isMoving) {
        // Calculer la différence d'angle pour le chemin le plus court
        let angleDiff = movementControls.targetRotation - movementControls.currentRotation;
        
        // Normaliser la différence d'angle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Rotation plus rapide et plus directe
        movementControls.currentRotation += angleDiff * movementControls.turnSpeed * 20 * normalizedDelta;
    }
    
    // Appliquer la rotation au modèle
    player.rotation.y = movementControls.currentRotation;

    // Appliquer une friction adaptée à delta
    movementControls.velocity.multiplyScalar(Math.pow(movementControls.friction, deltaFactor));
    
    // Animation très simple: faire bouger légèrement le modèle quand il se déplace
    if (player && movementControls.isMoving) {
        const time = Date.now() * 0.001; // Temps en secondes
        const bobAmount = 0.05; // Légère oscillation verticale
        
        // Faire bouger légèrement le joueur de haut en bas pendant le déplacement
        player.position.y = Math.sin(time * 5) * bobAmount;
    } else if (player) {
        // Remettre à la position normale quand immobile
        player.position.y = 0;
    }
    
    if (movementControls.isMoving) {
        // Calculer la force de mouvement
        const speed = keys.shift ? movementControls.maxSpeed * 1.8 : movementControls.speed;
        
        // Accélération plus directe et plus forte
        const acceleration = movementControls.direction.clone().multiplyScalar(speed * deltaFactor * 1.5);
        movementControls.velocity.add(acceleration);
        
        // Limiter la vitesse maximale avec une transition plus douce
        const currentSpeed = movementControls.velocity.length();
        const maxSpeed = keys.shift ? movementControls.maxSpeed * 1.8 : movementControls.maxSpeed;
        
        if (currentSpeed > maxSpeed) {
            const scaleFactor = 1.0 - Math.min(1.0, (currentSpeed - maxSpeed) / maxSpeed * 10 * normalizedDelta);
            movementControls.velocity.multiplyScalar(scaleFactor);
        }
    } else {
        // Arrêt plus rapide quand on ne bouge pas
        movementControls.velocity.multiplyScalar(Math.pow(0.6, deltaFactor));
        
        // Arrêter complètement sous le seuil
        if (movementControls.velocity.length() < movementControls.threshold) {
            movementControls.velocity.set(0, 0, 0);
        }
    }
    
    // Appliquer la vélocité avec une petite prédiction
    const newPosition = player.position.clone().add(
        movementControls.velocity.clone().multiplyScalar(1.0 + normalizedDelta * 15)
    );
    
    // Vérifier les collisions
    const playerCollisionRadius = PLAYER_SIZE / 2;
    if (!checkCollision(newPosition, playerCollisionRadius)) {
        // Déplacement fluide
        const currentY = player.position.y; // Sauvegarder la position Y (animation de bobbing)
        player.position.add(movementControls.velocity);
        player.position.y = currentY; // Restaurer la position Y pour préserver l'animation
    } else {
        // Rebond plus efficace sur collision
        const reboundStrength = 0.5;
        movementControls.velocity.multiplyScalar(-reboundStrength);
        
        // Message occasionnel
        if (Math.random() < 0.05) {
            infoElement.textContent = "Obstacle détecté";
            setTimeout(() => {
                infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";
            }, 1500);
        }
    }
    
    // Vérifier si le prédateur mange le rat
    if (checkRatEaten()) {
        eatRatAndReset();
    }
    
    // Vérifier les limites
    checkBoundaries();
}

// Fonction pour animer une patte selon le cycle de marche
function animateLeg(leg, phase, liftAmount, swingAmount) {
    // Cycle de la patte: lorsque sin(phase) > 0, la patte est en l'air, sinon au sol
    const cycleProgress = Math.sin(phase);
    const isLiftPhase = cycleProgress > 0;
    
    // Partie supérieure de la patte (épaule/hanche)
    if (leg.upper && leg.upper.userData.originalRotation) {
        // Mouvement avant/arrière
        leg.upper.rotation.x = leg.upper.userData.originalRotation.x + 
            Math.sin(phase) * swingAmount;
        
        // Légère rotation latérale
        leg.upper.rotation.z = leg.upper.userData.originalRotation.z + 
            (isLiftPhase ? 0.1 : 0) * Math.abs(cycleProgress);
    }
    
    // Partie inférieure de la patte (coude/genou)
    if (leg.lower && leg.lower.userData.originalRotation) {
        // Plier quand la patte est levée, tendre quand elle touche le sol
        leg.lower.rotation.x = leg.lower.userData.originalRotation.x + 
            (isLiftPhase ? -0.3 : 0.1) * Math.abs(cycleProgress);
    }
    
    // Pied
    if (leg.foot && leg.foot.userData.originalRotation) {
        // Ajuster l'angle du pied selon la phase
        leg.foot.rotation.x = leg.foot.userData.originalRotation.x + 
            (isLiftPhase ? 0.2 : -0.1) * Math.abs(cycleProgress);
    }
    
    // Ajustement vertical de l'ensemble de la patte
    if (leg.upper && leg.upper.userData.originalPosition) {
        // Lever la patte du sol pendant la phase de levée
        leg.upper.position.y = leg.upper.userData.originalPosition.y + 
            (isLiftPhase ? liftAmount * cycleProgress : 0);
    }
}

// Fonction pour réinitialiser toutes les parties du corps à leur position d'origine
function resetBodyParts(bodyParts) {
    // Corps
    if (bodyParts.body) {
        resetNodeTransform(bodyParts.body);
    }
    
    // Tête
    if (bodyParts.head) {
        resetNodeTransform(bodyParts.head);
    }
    
    // Queue
    if (bodyParts.tail) {
        resetNodeTransform(bodyParts.tail);
    }
    
    // Pattes
    for (const legPosition of ['frontLeft', 'frontRight', 'backLeft', 'backRight']) {
        for (const part of ['upper', 'lower', 'foot']) {
            const legPart = bodyParts.legs[legPosition][part];
            if (legPart) {
                resetNodeTransform(legPart);
            }
        }
    }
}

// Fonction pour réinitialiser la transformation d'un nœud
function resetNodeTransform(node) {
    if (node.userData.originalPosition) {
        node.position.copy(node.userData.originalPosition);
    }
    
    if (node.userData.originalRotation) {
        node.rotation.copy(node.userData.originalRotation);
    }
    
    if (node.userData.originalScale) {
        node.scale.copy(node.userData.originalScale);
    }
}

// Fonction pour vérifier si des pattes ont été identifiées
function hasIdentifiedLegs(legs) {
    return Object.values(legs).some(leg => 
        leg.upper !== null || leg.lower !== null || leg.foot !== null
    );
}

// Fonction pour identifier les pattes par position si l'identification par nom échoue
function identifyLegsByPosition(model, bodyParts) {
    // Collecter tous les meshes
    const meshes = [];
    model.traverse(node => {
        if (node.isMesh) {
            meshes.push(node);
        }
    });
    
    if (meshes.length <= 1) return; // Pas assez de meshes pour identifier des pattes
    
    // Trouver le centre approximatif du modèle
    const center = new THREE.Vector3(0, 0, 0);
    meshes.forEach(mesh => {
        center.add(mesh.position);
    });
    center.divideScalar(meshes.length);
    
    // Trier les meshes par distance au centre
    meshes.sort((a, b) => {
        const distA = a.position.distanceTo(center);
        const distB = b.position.distanceTo(center);
        return distB - distA; // Les plus éloignés d'abord (potentiellement des pattes)
    });
    
    // Les 4 meshes les plus éloignés pourraient être des pattes
    for (let i = 0; i < Math.min(4, meshes.length); i++) {
        const mesh = meshes[i];
        const pos = mesh.position;
        
        // Déterminer quelle patte c'est en fonction de sa position relative au centre
        if (pos.z > center.z) { // Avant
            if (pos.x < center.x) { // Gauche
                bodyParts.legs.frontLeft.upper = mesh;
            } else { // Droite
                bodyParts.legs.frontRight.upper = mesh;
            }
        } else { // Arrière
            if (pos.x < center.x) { // Gauche
                bodyParts.legs.backLeft.upper = mesh;
            } else { // Droite
                bodyParts.legs.backRight.upper = mesh;
            }
        }
    }
}

// Modifier la fonction checkRatEaten pour une détection plus précise
function checkRatEaten() {
    if (!player || !currentRat) return false;
    
    // Calculer la distance entre le serpent et le rat
    const dx = player.position.x - currentRat.position.x;
    const dz = player.position.z - currentRat.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Distance plus petite pour une détection plus précise
    const eatDistance = 2.0; // Distance réduite
    
    return distance < eatDistance;
}

// Modifier la fonction eatRatAndReset pour ne pas réinitialiser la position du joueur
function eatRatAndReset() {
    // Incrémenter le score
    gameState.score++;
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    
    // Vérifier si on passe au niveau suivant
    if (gameState.score % gameState.ratsNeededForNextLevel === 0) {
        levelUp();
    }
    
    // Mettre à jour l'interface
    updateGameUI();
    
    // Supprimer le rat actuel
    if (currentRat) {
        scene.remove(currentRat);
        currentRat = null;
    }
    
    // Afficher un message
    infoElement.textContent = "Rat mangé ! Un nouveau rat apparaît...";
    
    // Générer un nouveau rat après un délai
    setTimeout(() => {
        loadRat();
        
        // Réinitialiser le message
        setTimeout(() => {
            infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";
        }, 2000);
    }, 1000);
}

// Ajouter les variables de contrôle du jeu
const gameControls = {
    isPaused: false,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    touchStartX: 0,
    touchStartY: 0
};

// Créer le menu de pause
const pauseMenu = document.createElement('div');
pauseMenu.style.position = 'absolute';
pauseMenu.style.top = '50%';
pauseMenu.style.left = '50%';
pauseMenu.style.transform = 'translate(-50%, -50%)';
pauseMenu.style.background = 'rgba(0, 0, 0, 0.8)';
pauseMenu.style.padding = '20px';
pauseMenu.style.borderRadius = '10px';
pauseMenu.style.display = 'none';
pauseMenu.style.textAlign = 'center';
pauseMenu.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px;">Jeu en Pause</h2>
    <button id="resumeButton" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
    ">Reprendre</button>
    <button id="restartButton" style="
        background: #f44336;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
    ">Recommencer</button>
    <div style="color: white; margin-top: 20px;">
        <h3>Contrôles:</h3>
        <p>ZQSD - Déplacements</p>
        <p>C - Changer la vue caméra</p>
        <p>R - Se téléporter au rat</p>
        <p>Espace - Se débloquer</p>
        <p>Échap - Pause</p>
    </div>
`;
document.body.appendChild(pauseMenu);

// Ajouter les contrôles tactiles pour mobile
if (gameControls.isMobile) {
    const touchControls = document.createElement('div');
    touchControls.style.position = 'absolute';
    touchControls.style.bottom = '20px';
    touchControls.style.left = '50%';
    touchControls.style.transform = 'translateX(-50%)';
    touchControls.style.display = 'flex';
    touchControls.style.gap = '20px';
    touchControls.innerHTML = `
        <div id="joystick" style="
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            position: relative;
            touch-action: none;
        ">
            <div id="joystickKnob" style="
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            "></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="cameraButton" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 5px;
            ">Caméra</button>
            <button id="actionButton" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 10px;
                border-radius: 5px;
            ">Action</button>
        </div>
    `;
    document.body.appendChild(touchControls);

    // Gestionnaire du joystick
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    let joystickActive = false;

    joystick.addEventListener('touchstart', handleTouchStart);
    joystick.addEventListener('touchmove', handleTouchMove);
    joystick.addEventListener('touchend', handleTouchEnd);

    function handleTouchStart(e) {
        e.preventDefault();
        joystickActive = true;
        updateJoystickPosition(e.touches[0]);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(e.touches[0]);
        }
    }

    function handleTouchEnd() {
        joystickActive = false;
        joystickKnob.style.top = '50%';
        joystickKnob.style.left = '50%';
        // Réinitialiser les contrôles
        keys.z = false;
        keys.s = false;
        keys.q = false;
        keys.d = false;
        updateMovementState();
    }

    function updateJoystickPosition(touch) {
        const joystickRect = joystick.getBoundingClientRect();
        const centerX = joystickRect.width / 2;
        const centerY = joystickRect.height / 2;
        
        let x = touch.clientX - joystickRect.left - centerX;
        let y = touch.clientY - joystickRect.top - centerY;
        
        // Limiter le déplacement du knob
        const maxDistance = 40;
        const distance = Math.sqrt(x * x + y * y);
        if (distance > maxDistance) {
            x = (x / distance) * maxDistance;
            y = (y / distance) * maxDistance;
        }
        
        joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
        
        // Mettre à jour les touches virtuelles
        keys.z = y < -10;
        keys.s = y > 10;
        keys.q = x < -10;
        keys.d = x > 10;
        updateMovementState();
    }

    // Gestionnaires des boutons
    document.getElementById('cameraButton').addEventListener('click', () => {
        // Simuler l'appui sur la touche C
        const event = new KeyboardEvent('keydown', { key: 'c' });
        window.dispatchEvent(event);
    });

    document.getElementById('actionButton').addEventListener('click', () => {
        // Simuler l'appui sur la touche R
        const event = new KeyboardEvent('keydown', { key: 'r' });
        window.dispatchEvent(event);
    });
}

// Gestionnaires du menu de pause
document.getElementById('resumeButton').addEventListener('click', () => {
    togglePause();
});

document.getElementById('restartButton').addEventListener('click', () => {
    restartGame();
    togglePause();
});

// Fonction pour mettre en pause/reprendre le jeu
function togglePause() {
    gameControls.isPaused = !gameControls.isPaused;
    pauseMenu.style.display = gameControls.isPaused ? 'block' : 'none';
}

// Fonction pour redémarrer le jeu
function restartGame() {
    gameState.level = 1;
    gameState.score = 0;
    gameState.ratSpeed = 0.08;
    
    // Réinitialiser la position du joueur
    player.position.set(0, 0, 0);
    movementControls.velocity.set(0, 0, 0);
    
    // Réinitialiser la caméra
    cameraControls.rotationX = 0;
    cameraControls.rotationY = 0;
    
    // Recharger le rat
    if (currentRat) {
        scene.remove(currentRat);
        currentRat = null;
    }
    loadRat();
    
    updateGameUI();
}

// Fonction pour vérifier les limites et ajuster la position
function checkBoundaries() {
    if (!player) return;
    
    const limitX = BOUNDARY_SIZE - PLAYER_SIZE;
    const limitZ = BOUNDARY_SIZE - PLAYER_SIZE;
    
    // Variable pour savoir si on a touché une limite
    let hitBoundary = false;
    
    // Vérifier les limites en X
    if (player.position.x > limitX) {
        player.position.x = limitX;
        movementControls.velocity.x *= -0.3; // Rebond
        hitBoundary = true;
    } else if (player.position.x < -limitX) {
        player.position.x = -limitX;
        movementControls.velocity.x *= -0.3; // Rebond
        hitBoundary = true;
    }
    
    // Vérifier les limites en Z
    if (player.position.z > limitZ) {
        player.position.z = limitZ;
        movementControls.velocity.z *= -0.3; // Rebond
        hitBoundary = true;
    } else if (player.position.z < -limitZ) {
        player.position.z = -limitZ;
        movementControls.velocity.z *= -0.3; // Rebond
        hitBoundary = true;
    }
    
    // Si on touche une limite, afficher un message
    if (hitBoundary && !movementControls.hitBoundary) {
        infoElement.textContent = "Vous avez atteint la limite de la zone!";
        setTimeout(() => {
            infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";
        }, 2000);
        
        movementControls.hitBoundary = true;
    } else if (!hitBoundary) {
        movementControls.hitBoundary = false;
    }
    
    return hitBoundary;
}

// Fonction de détection de collision
function checkCollision(position, radius) {
    // Vérifier la collision avec les arbres
    for (const tree of trees) {
        const treePos = tree.position;
        const dx = treePos.x - position.x;
        const dz = treePos.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (radius + tree.userData.collisionRadius)) {
            return true; // Collision détectée
        }
    }
    
    // Vérifier la collision avec les rochers
    for (const rock of rocks) {
        const rockPos = rock.position;
        const dx = rockPos.x - position.x;
        const dz = rockPos.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (radius + rock.userData.collisionRadius)) {
            return true; // Collision détectée
        }
    }
    
    return false; // Pas de collision
}

// Fonction pour trouver une position sûre sans collision
function findSafePosition(startPosition, radius) {
    // Tenter plusieurs directions pour trouver une position sans collision
    const directions = [
        new THREE.Vector3(1, 0, 0),   // droite
        new THREE.Vector3(-1, 0, 0),  // gauche
        new THREE.Vector3(0, 0, 1),   // devant
        new THREE.Vector3(0, 0, -1),  // derrière
        new THREE.Vector3(1, 0, 1),   // diagonale avant-droite
        new THREE.Vector3(-1, 0, 1),  // diagonale avant-gauche
        new THREE.Vector3(1, 0, -1),  // diagonale arrière-droite
        new THREE.Vector3(-1, 0, -1)  // diagonale arrière-gauche
    ];
    
    // Essayer à différentes distances
    for (let distance = 2; distance <= 10; distance += 2) {
        for (const dir of directions) {
            const testPosition = startPosition.clone().add(dir.clone().multiplyScalar(distance));
            
            // Vérifier que cette position est dans les limites
            if (Math.abs(testPosition.x) > BOUNDARY_SIZE - PLAYER_SIZE || 
                Math.abs(testPosition.z) > BOUNDARY_SIZE - PLAYER_SIZE) {
                continue; // Position hors limites, essayer une autre
            }
            
            // Vérifier s'il n'y a pas de collision à cette position
            if (!checkCollision(testPosition, radius)) {
                return testPosition; // Position sûre trouvée
            }
        }
    }
    
    // Si aucune position sûre n'est trouvée, retourner une position par défaut
    return new THREE.Vector3(0, 0, 0);
}

// Fonction pour vérifier et corriger la position du joueur si coincé
function rescuePlayerIfStuck() {
    if (!player) return;
    
    const playerCollisionRadius = PLAYER_SIZE / 2;
    
    // Vérifier si le joueur est dans un obstacle
    if (checkCollision(player.position, playerCollisionRadius)) {
        console.log("Joueur coincé dans un obstacle, recherche d'une position sûre...");
        
        // Trouver une position sûre
        const safePosition = findSafePosition(player.position, playerCollisionRadius);
        
        // Téléporter le joueur à cette position
        player.position.copy(safePosition);
        
        // Afficher un message
        infoElement.textContent = "Vous avez été déplacé vers une zone sûre";
        setTimeout(() => {
            infoElement.textContent = "Utilisez ZQSD pour vous déplacer, C pour changer de mode caméra";
        }, 2000);
    }
}

// Fonction pour mettre à jour la caméra
function updateCamera() {
    if (!player) return;
    
    if (cameraControls.isFreeMode) {
        // Mode caméra libre contrôlée par la souris
        const idealOffset = new THREE.Vector3(
            Math.sin(cameraControls.rotationX) * Math.cos(cameraControls.rotationY) * cameraControls.distance,
            Math.sin(cameraControls.rotationY) * cameraControls.distance,
            Math.cos(cameraControls.rotationX) * Math.cos(cameraControls.rotationY) * cameraControls.distance
        );
        
        // Ajouter cette position à celle du joueur
        const targetPosition = new THREE.Vector3().copy(player.position).add(idealOffset);
        
        // Interpoler la position actuelle vers la position cible (mouvement fluide)
        camera.position.lerp(targetPosition, cameraControls.smoothing);
    } else {
        // Mode caméra standard derrière le joueur
        const cameraDistance = 15;
        const cameraHeight = 8;
        
        // Position cible de la caméra (fixe par rapport au joueur)
        const idealOffset = new THREE.Vector3(0, cameraHeight, cameraDistance);
        
        // Faire pivoter le vecteur en fonction de la rotation de la caméra
        idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraControls.rotationX);
        
        // Appliquer le décalage à la position du joueur
        const targetPosition = new THREE.Vector3().copy(player.position).add(idealOffset);
        
        // Interpoler la position actuelle vers la position cible (mouvement fluide)
        camera.position.lerp(targetPosition, cameraControls.smoothing);
    }
    
    // Faire regarder la caméra vers le joueur
    camera.lookAt(player.position);
}

animate();



