import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Unicorn } from './src/unicorn.js';

//mouse tracking
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE0B0FF); // Mauve/magical purple sky
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Slightly reduced ambient light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
scene.add(directionalLight);

const foodItems=[];
const isFartEffectPending=false; 

const ambientSound=new Audio('./sounds/swan_lake.mp3');
ambientSound.volume=0.6;
ambientSound.play();

let boss = null;
let griphon=null;
let bossHP = 300;
let bossProjectiles = [];
let playerProjectiles = [];
let bossAttackInterval = 1200;
let phase2=false;
let bossHitbox=null;

async function initBossFight() {
    try {
        // Load the boss model (Dark Magician)
        boss = await loadModel(
            './models/dark_magician.glb',
            { x: 20, y: 204, z: 0 },  
            { x: 0, y: -Math.PI / 2, z: 0 }, 
            { x: 3, y: 3, z: 3 }
        );
        // Create hitbox geometry and material
        const hitboxGeometry = new THREE.SphereGeometry(3);
        const hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.3,
            visible: false
        });

        // Boss hitbox
        bossHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        bossHitbox.position.y = 6;
        boss.add(bossHitbox);
        scene.add(bossHitbox);
        // Play boss intro sound
        playSoundEffect('./sounds/boss_intro.mp3', 0.5);

        // Add both models to the scene
        scene.add(boss);

        // Create boss health bar
        createBossHPBar();

        // Start boss attack loop
        bossAttackInterval = setInterval(bossAttack, 1200);
    } catch (error) {
        console.error('Failed to load boss or griphon model:', error);
    }
}

function rotateBossToFacePlayer() {
    // Calculate direction vector from boss to player
    const direction = new THREE.Vector3().subVectors(
        player.position,
        boss.position
    ).normalize();
    
    // Calculate target rotation (ignore Y-axis for grounded enemies)
    direction.y = 0;
    const targetRotation = Math.atan2(direction.x, direction.z);
    
    // Smooth rotation using lerp
    const rotationSpeed = 0.1;
    boss.rotation.y = THREE.MathUtils.lerp(
        boss.rotation.y,
        targetRotation,
        rotationSpeed
    );
    
    // Optional: Add slight head tilt for more dynamic look
    if (boss.children[0]) { // Assuming head is first child
        const headTilt = direction.clone().cross(new THREE.Vector3(0, 1, 0));
        boss.children[0].rotation.z = headTilt.x * 0.2;
    }
}

function createBossHPBar() {
    const bossHPContainer = document.createElement('div');
    bossHPContainer.id = 'bossHPContainer';
    bossHPContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
        height: 30px;
        background: rgba(0,0,0,0.7);
        border-radius: 5px;
        border: 2px solid #FF0000;
        z-index: 1000;
    `;
    const bossName = document.createElement('div');
    bossName.textContent = 'EVIL LE BAGUETTE';
    bossName.style.cssText = `
        color: #FF0000;
        font-weight: bold;
        text-align: center;
        font-size: 16px;
        margin-bottom: 2px;
        text-shadow: 0 0 5px #000;
    `;
    bossHPContainer.appendChild(bossName);
    const bossHPBar = document.createElement('div');
    bossHPBar.id = 'bossHPBar';
    bossHPBar.style.cssText = `
        height: 100%;
        width: 100%;
        background: linear-gradient(to right, #FF0000, #FF4500);
        border-radius: 3px;
        transition: width 0.3s;
    `;  
    bossHPContainer.appendChild(bossHPBar);
    document.body.appendChild(bossHPContainer);
}

function updateBossHP() {
    const bossHPBar = document.getElementById('bossHPBar');
    if (bossHPBar) {
        const hpPercent  = (bossHP / 300) * 100;
        bossHPBar.style.width = `${hpPercent}%`;
    }
    if (bossHP <= 150 && !phase2) {
        phase2 = true;
        playSoundEffect('./sounds/bill_voiceline2.mp3', 0.8);
        clearInterval(bossAttackInterval);
        bossAttackInterval = setInterval(bossAttack, 800);
    }
    if (bossHP <= 0) {
        bossDefeated();
    }
}

function bossAttack() {
    if (!boss || bossHP <= 0) return;  
    // Create multiple projectiles in phase 2
    const projectileCount = phase2 ? 3 : 1;
    
    for (let i = 0; i < projectileCount; i++) {
        const projectileGeometry = new THREE.SphereGeometry(2, 16, 16);
        const projectileMaterial = new THREE.MeshBasicMaterial({ 
            color: phase2 ? 0xFF0000 : 0x00FF00 
        });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

        const bossWorldPos = new THREE.Vector3();
        bossWorldPos.y+=3;
        boss.getWorldPosition(bossWorldPos);
        projectile.position.copy(bossWorldPos);
        
        // Add slight spread to projectiles in phase 2
        const spread = phase2 ? 0.2 : 0;
        const direction = new THREE.Vector3().subVectors(
            player.position, 
            bossWorldPos
        ).normalize();
        direction.x += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        
        projectile.userData = {
            velocity: direction.multiplyScalar(phase2 ? 0.5 : 0.3),
            damage: phase2 ? 40 : 25,
            isBossProjectile: true,
            createdAt: Date.now()
        };
        
        scene.add(projectile);
        bossProjectiles.push(projectile);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (projectile.parent) {
                scene.remove(projectile);
                bossProjectiles = bossProjectiles.filter(p => p !== projectile);
            }
        }, 7000);
    }
}

function bossDefeated() {
    playSoundEffect('./sounds/bill_voiceline3.mp3', 0.8);
    clearInterval(bossAttackInterval);
    bossProjectiles.forEach(p => scene.remove(p));
    playerProjectiles.forEach(p => scene.remove(p));
    bossProjectiles = [];
    playerProjectiles = [];

    const hpBar = document.getElementById('bossHPContainer');
    if (hpBar) hpBar.remove(); 
    showVictoryMessage();
}

function showVictoryMessage() {
    const victoryMessage = showMessageBox(
        "You defeated Le Baguette! The villagers are freed from the curse!",
        true
    );
    setTimeout(() => {
        removeMessageBox(victoryMessage);
    }, 2000);
}

let canAttack=true;
let attackCooldown=1500;

function playerAttack() {
    if(!canAttack) return;
    updateFartUI();
    const projectileGeometry = new THREE.SphereGeometry(2, 10, 10);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xFF69B4 });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    // Calculate position in front of the player
    const headOffset = new THREE.Vector3(0, 1.5, 0);
    projectile.position.copy(player.position).add(headOffset);  
    raycaster.setFromCamera(mouse,camera);
    const direction = raycaster.ray.direction.clone(); // Calculate direction based on player's rotation
    direction.normalize(); 
    projectile.userData = {
        velocity: direction.multiplyScalar(0.5),  // Increased speed
        damage: 25,
        isBossProjectile: false,
        createdAt: Date.now()
    };
    scene.add(projectile);
    playerProjectiles.push(projectile);
    
    canAttack=false;
    setTimeout(() => {
        canAttack=true;
    }, attackCooldown);
    // Auto-remove after 10 seconds if it doesn't hit anything
    setTimeout(() => {
        if (projectile.parent) {
            scene.remove(projectile);
            playerProjectiles = playerProjectiles.filter(p => p !== projectile);
        }
    }, 10000);
}

let currentSound=null;
function playSoundEffect(effectFile,volume=1.0) {
    if (!effectFile) return;

    if (currentSound) {
        currentSound.pause();
        currentSound.currentTime = 0;
    }

    ambientSound.pause();   
    const soundEffect = new Audio(effectFile);
    soundEffect.volume = volume;
    soundEffect.play();
    currentSound=soundEffect;

    soundEffect.onended = () => {
      ambientSound.play();
      currentSound=null;
    };
    return soundEffect;
  }
// Add secondary fill light for better depth
const fillLight = new THREE.DirectionalLight(0xE0B0FF, 0.3); // Purple tinted fill light
fillLight.position.set(-10, 15, -10);
scene.add(fillLight);

// Create floating platforms with enhanced materials
const platforms = [];
const createPlatform = (x, y, z, width, depth) => {
    const geometry = new THREE.BoxGeometry(width, 1, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x90EE90,  // Light green
        roughness: 0.8,   // Increased roughness
        metalness: 0.2,   // Slight metalness
        flatShading: true // Enable flat shading for more detail
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);

    // Add subtle grass effect
    const grassGeometry = new THREE.PlaneGeometry(width, depth);
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x3CB371,  // Medium sea green
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.51; // Slightly above platform
    platform.add(grass);

    scene.add(platform);
    platforms.push(platform);
    return platform;
};

const createArena = (x, y, z, width, depth) => {
    const geometry = new THREE.BoxGeometry(width, 1, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x000000,  // Black color
        roughness: 0.8,   // Increased roughness
        metalness: 0.2,   // Slight metalness
        flatShading: true // Enable flat shading for more detail
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);

    // Add surrounding larger spikes
    const spikeGeometry = new THREE.ConeGeometry(0.6, 2, 8); // Larger cone spike
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,  // Dark gray
        roughness: 0.7,
        metalness: 0.4
    });

    const spikeCount = 40;
    for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const radius = Math.max(width, depth) / 2 - 0.3;
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.position.set(Math.cos(angle) * radius, 1, Math.sin(angle) * radius);
        spike.rotation.x = Math.PI / 2; // Pointing upwards
        platform.add(spike);
    }

    scene.add(platform);
    platforms.push(platform);
    return platform;
};


function createIceRink(x, y, z, size = 15) {
    const rink = new THREE.Group();
    
    // Solid white ice surface
    const iceGeometry = new THREE.BoxGeometry(size, 0.8, size);
    const iceMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // Pure white ice
        roughness: 0.3,  // Slight roughness for realism
        metalness: 0.1   // Low metalness to avoid reflections
    });
    const ice = new THREE.Mesh(iceGeometry, iceMaterial);
    ice.position.set(x, y, z); // Place directly on the ground
    rink.add(ice);

    // Border walls
    const wallHeight = 1;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // White walls
        roughness: 0.3,
        metalness: 0.2
    });

    // Create 4 walls around the rink
    const walls = [
        { position: [x, y + wallHeight / 2, z - size / 2], size: [size, wallHeight, 0.2] }, // North
        { position: [x, y + wallHeight / 2, z + size / 2], size: [size, wallHeight, 0.2] }, // South
        { position: [x - size / 2, y + wallHeight / 2, z], size: [0.2, wallHeight, size] }, // West
        { position: [x + size / 2, y + wallHeight / 2, z], size: [0.2, wallHeight, size] }  // East
    ];
    walls.forEach(wall => {
        const wallGeometry = new THREE.BoxGeometry(...wall.size);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(...wall.position);
        rink.add(wallMesh);
    });

    return rink;
}
// Enhanced cloud creation with more detail
function createCloud(x, y, z) {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        roughness: 0.9,  // Increased roughness
        metalness: 0.1,
    });
    // Create more varied cloud shapes
    const baseShape = new THREE.SphereGeometry(2, 8, 8);
    baseShape.scale(1, 0.3, 1);
    
    // Main cloud body with more detail
    const mainCloud = new THREE.Mesh(baseShape, cloudMaterial);
    cloud.add(mainCloud);

    // Add more varied sections for natural look
    const numSections = Math.floor(Math.random() * 5) + 4; // More sections
    for (let i = 0; i < numSections; i++) {
        const section = new THREE.Mesh(baseShape, cloudMaterial);
        
        // More varied positioning
        section.position.x = (Math.random() - 0.5) * 4;
        section.position.y = (Math.random() - 0.5) * 0.5; // More vertical variation
        section.position.z = (Math.random() - 0.5) * 3;
        
        // More varied scaling
        const scale = Math.random() * 0.6 + 0.4;
        section.scale.set(scale, scale * 0.3, scale);
        
        // Random rotation for more natural look
        section.rotation.x = Math.random() * Math.PI;
        section.rotation.y = Math.random() * Math.PI;
        section.rotation.z = Math.random() * Math.PI;
        
        cloud.add(section);
    }

    cloud.position.set(x, y, z);
    cloud.rotation.y = Math.random() * Math.PI * 2;
    return cloud;
}
// Add more clouds with varied heights and sizes
const clouds = [];
for (let i = 0; i < 30; i++) {  // Increased number of clouds
    const x = Math.random() * 120 - 60;
    const y = Math.random() * 50 + 10;   // More varied heights
    const z = Math.random() * 120 - 60;
    const cloud = createCloud(x, y, z);
    cloud.scale.set(
        Math.random() * 0.5 + 0.5,  // Random scale for each cloud
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5
    );
    scene.add(cloud);
    clouds.push(cloud);
}
// Create decorative elements
function createTree(x, z) {
    const tree = new THREE.Group();

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    tree.add(trunk);

    // Tree leaves (multiple layers for fuller look)
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    for (let i = 0; i < 3; i++) {
        const leafGeometry = new THREE.ConeGeometry(1.5 - i * 0.3, 2, 8);
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.position.y = 1 + i * 1.2;
        leaves.castShadow = true;
        tree.add(leaves);
    }

    tree.position.set(x, 1, z);
    return tree;
}
const ground = createPlatform(0, 0, 0, 50, 50);  // Keep only the ground platform
const iceRink = createIceRink(8, 0.2, 6, 15); // Slightly above ground
scene.add(iceRink);
// Add to scene during initialization
const skyPlatform = createArena(0,200,0,200,50);
scene.add(skyPlatform);
platforms.push(skyPlatform); // Add to collision detection
//create a small house
function createHouse(x, y, z, rotation = 0) {
    const house = new THREE.Group();
    // House base
    const baseGeometry = new THREE.BoxGeometry(3, 2.5, 3);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0xE6CCB3,
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    house.add(base);
    // Roof
    const roofGeometry = new THREE.ConeGeometry(2.5, 2, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.8
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);

    // Door
    const doorGeometry = new THREE.PlaneGeometry(0.8, 1.5);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A3B24,
        roughness: 0.9
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, -0.5, 1.51);
    house.add(door);

    // Windows
    const windowGeometry = new THREE.PlaneGeometry(0.6, 0.6);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0xADD8E6,
        metalness: 0.3,
        roughness: 0.2
    });

    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(-1, 0.2, 1.51);
    house.add(window1);

    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(1, 0.2, 1.51);
    house.add(window2);

    house.position.set(x, y, z);
    house.rotation.y = rotation;
    house.castShadow = true;
    house.receiveShadow = true;
    return house;
}

// Create a petrified villager
function createPetrifiedVillager(x, y, z, rotation = 0) {
    const villager = new THREE.Group();
    // Crystal material for petrified effect
    const crystalMaterial = new THREE.MeshStandardMaterial({
        color: 0xB0C4DE,  // Light steel blue
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
    });

    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 4, 8);
    const body = new THREE.Mesh(bodyGeometry, crystalMaterial);
    body.position.y = 0.5;
    villager.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeometry, crystalMaterial);
    head.position.y = 1.1;
    villager.add(head);

    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8);
    
    const leftArm = new THREE.Mesh(armGeometry, crystalMaterial);
    leftArm.position.set(-0.35, 0.8, 0);
    leftArm.rotation.z = Math.PI / 4;
    villager.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, crystalMaterial);
    rightArm.position.set(0.35, 0.8, 0);
    rightArm.rotation.z = -Math.PI / 4;
    villager.add(rightArm);

    // Add some crystal shards around the base
    const shardGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
    for (let i = 0; i < 5; i++) {
        const shard = new THREE.Mesh(shardGeometry, crystalMaterial);
        const angle = (i / 5) * Math.PI * 2;
        shard.position.set(
            Math.cos(angle) * 0.3,
            0.1,
            Math.sin(angle) * 0.3
        );
        shard.rotation.x = Math.random() * 0.3;
        shard.rotation.z = Math.random() * 0.3;
        villager.add(shard);
    }

    villager.position.set(x, y, z);
    villager.rotation.y = rotation;
    villager.castShadow = true;
    return villager;
}

// Create decorative walls
function createWall(x, z, width, height = 2.5, rotation = 0) {  // Changed default height to 2.5 to match houses
    const wall = new THREE.Group();

    // Main wall structure
    const wallGeometry = new THREE.BoxGeometry(width, height, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xE6CCB3,  // Matching house color
        roughness: 0.7,
        metalness: 0.1
    });
    const mainWall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.add(mainWall);

    // Decorative top
    const topGeometry = new THREE.BoxGeometry(width + 0.4, 0.5, 1.4);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,  // Matching roof color
        roughness: 0.8
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = height / 2 + 0.25;
    wall.add(top);

    wall.position.set(x, height / 2, z);
    wall.rotation.y = rotation;
    // Add collision box data
    wall.userData = {
        isWall: true,
        width: width,
        height: height,
        depth: 1
    };

    return wall;
}
// Add decorative walls around the ground
const walls = [
    // North wall (with opening for entrance)
    createWall(-15, -25, 20, 2.5, 0),  // Changed height to 2.5
    createWall(15, -25, 20, 2.5, 0),   // Changed height to 2.5
    // South wall
    createWall(0, 25, 50, 2.5, 0),     // Changed height to 2.5
    // East wall
    createWall(25, 0, 50, 2.5, Math.PI / 2),  // Changed height to 2.5
    // West wall
    createWall(-25, 0, 50, 2.5, Math.PI / 2)  // Changed height to 2.5
];
walls.forEach(wall => scene.add(wall));
// Add village to the starting area
const village = new THREE.Group();
// Add houses
const houses = [
    { x: -12, z: -12, rotation: Math.PI / 6 },    // Moved further out
    { x: -5, z: -8, rotation: -Math.PI / 4 },     // Adjusted position
    { x: -9, z: -3, rotation: Math.PI / 3 },      // Moved slightly
    { x: -3, z: -12, rotation: Math.PI / 5 },     // Moved further out
    { x: -15, z: -6, rotation: -Math.PI / 3 },     // Moved further out
    { x: 12, z: -12, rotation: Math.PI / 6 }     // Moved further out
];

houses.forEach(({ x, z, rotation }) => {
    const house = createHouse(x, 1, z, rotation);  // Keep height at 1
    village.add(house);
});

// Add petrified villagers in various poses with more spread out positions
const villagers = [
    { x: -8, z: -9, rotation: Math.PI / 3 },      // Adjusted position
    { x: -4, z: -10, rotation: -Math.PI / 6 },    // Moved slightly
    { x: -13, z: -5, rotation: Math.PI / 2 },     // Moved further out
    { x: -6, z: -4, rotation: -Math.PI / 4 },     // Adjusted position
    { x: -11, z: -8, rotation: Math.PI / 5 },     // Spread out
    { x: -3, z: -6, rotation: -Math.PI / 2 },     // Kept position
    { x: -10, z: -3, rotation: Math.PI / 6 },     // Adjusted position
    { x: -12, z: -12, rotation: Math.PI / 6 },    // Moved further out
    { x: -21, z: -8, rotation: Math.PI / 5 },
    { x: 8, z: 9, rotation: Math.PI / 6 },    // Moved further out
    { x: -17, z: -12, rotation: Math.PI / 6 },    // Moved further out
    { x: 21, z: -15, rotation: Math.PI / 6 },    // Moved further out
    { x: -17, z: -7, rotation: Math.PI / 6 },    // Moved further out
    { x: 26, z: -4, rotation: Math.PI / 6 },    // Moved further out
    { x: -20, z: -20, rotation: Math.PI / 6 },    // Moved further out
    { x: 8, z: 6, rotation: Math.PI / 6 },    // Moved further out
    { x: 7, z: 8, rotation: Math.PI / 2 },    // Moved further out
    { x: 6, z: 6, rotation: Math.PI / 3 },    // Moved further out
];

villagers.forEach(({ x, z, rotation }) => {
    const villager = createPetrifiedVillager(x, 0.5, z, rotation);  // Keep height at 0.5
    village.add(villager);
});
scene.add(village);

// Add more trees around the village and starting area
const treePositions = [
    // Dense forest around village but avoiding house positions
    { x: -14, z: -14 }, { x: -13, z: -10 },
    { x: -7, z: -11 }, { x: -4, z: -13 },
    { x: -16, z: -8 }, { x: -14, z: -4 },
    { x: -8, z: -7 }, { x: -4, z: -5 },
    { x: -7, z: -2 },
    // Additional trees in other areas
    { x: 5, z: -5 }, { x: 8, z: -8 }, { x: 12, z: -3 },
    { x: -5, z: 5 }, { x: -8, z: 8 }, { x: -3, z: 12 },
    { x: 15, z: 15 }, { x: -15, z: 15 }, { x: 15, z: -15 },
    // Random scattered trees
    { x: 20, z: 0 }, { x: -20, z: 0 }, { x: 0, z: 20 }, { x: 0, z: -20 }
];

// Add some randomization to tree positions and create them
treePositions.forEach(({ x, z }) => {
    // Check if the tree position is too close to any house
    const isTooCloseToHouse = houses.some(house => {
        const dx = x - house.x;
        const dz = z - house.z;
        return Math.sqrt(dx * dx + dz * dz) < 3; // Minimum distance of 3 units from houses
    });

    if (!isTooCloseToHouse) {
        // Add slight random offset to each position
        const offsetX = x + (Math.random() - 0.5) * 3;
        const offsetZ = z + (Math.random() - 0.5) * 3;
        const tree = createTree(offsetX, offsetZ);
        tree.position.y = 0.5;  // Adjusted tree height
        // Random rotation and scale for variety
        tree.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.8 + Math.random() * 0.4;  // Random scale between 0.8 and 1.2
        tree.scale.set(scale, scale, scale);
        scene.add(tree);
    }
});

// Create collectibles
const collectibles = [];
const createCollectible = (x, y, z) => {
    const group = new THREE.Group();

    // Main ring
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.3, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4,  // Hot pink
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xFF1493, // Deep pink
        emissiveIntensity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(ring);

    // Inner circle
    const innerGeometry = new THREE.CircleGeometry(1.2, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFB6C1,  // Light pink
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        emissive: 0xFF69B4,
        emissiveIntensity: 0.8
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.rotation.y = Math.PI / 2;
    group.add(inner);

    // Add sparkle effect
    const sparkleGeometry = new THREE.TorusGeometry(1.7, 0.05, 8, 16);
    const sparkleMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 1,
        roughness: 0,
        transparent: true,
        opacity: 0.6,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.5
    });
    const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
    group.add(sparkle);

    // Position and add to scene
    group.position.set(x, y, z);
    group.rotation.x = Math.PI / 4;  // Tilt for better visibility
    group.castShadow = true;
    scene.add(group);
    collectibles.push(group);
    return group;
};

// Create portal
function createPortal() {
    const portal = new THREE.Group();

    // Main portal ring
    const ringGeometry = new THREE.TorusGeometry(3, 0.5, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF8C00,  // Orange
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xFFA500,
        emissiveIntensity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    portal.add(ring);

    // Portal effect (inner circle)
    const innerGeometry = new THREE.CircleGeometry(2.5, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFA500,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        emissive: 0xFFA500,
        emissiveIntensity: 0.8
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.rotation.y = Math.PI / 2;
    portal.add(inner);

    // Position the portal high in the sky
    portal.position.set(0, 30, 0);
    portal.rotation.x = Math.PI / 2;
    portal.visible = false;  // Start invisible

    portal.userData = {
        isFinalPortal: false,
        glowIntensity: 1.0
      };
    scene.add(portal);
    return portal;
}

// Create the portal
const portal = createPortal();

// Replace previous crystal creation with one sky crystal
const crystalPositions = [
    { x: 0, y: 20, z: 0 }  // Single crystal in the center of the sky
];

crystalPositions.forEach(pos => {
    createCollectible(pos.x, pos.y, pos.z);
});

// Create our unicorn player
const unicorn = new Unicorn();
const player = unicorn.getModel();
player.castShadow = true;
scene.add(player);

// Position camera
camera.position.set(0, 5, 10);
camera.lookAt(player.position);

// Camera follow parameters
const cameraOffset = new THREE.Vector3(0, 12, 26);
const cameraLookOffset = new THREE.Vector3(0, 2, 0);
const cameraSmoothness = 0.1;
let cameraRotation = 0;

// Mouse control parameters
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
const mouseSensitivity = 0.003;

// Mouse controls for camera rotation
window.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button
        isMouseDown = false;
    }
});

window.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        const deltaX = event.clientX - lastMouseX;
        cameraRotation -= deltaX * mouseSensitivity;
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f' ) {
        playerAttack();
    }
});
// Physics variables
const gravity = 0.005;  // Reduced from 0.015 to 0.005
const maxFallSpeed = 0.2;  // Reduced from 0.5 to 0.2
const flyingForce = 0.2;  // Keep same flying force
const moveSpeed = 0.2;  // Keep same move speed
let velocity = new THREE.Vector3();

// Player movement variables
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false  // Changed from 'space' to ' ' for actual spacebar
};

// Event listeners for keyboard input
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    // Special handling for spacebar
    if (key === ' ' || key === 'spacebar') {
        keys[' '] = true;
    } else if (key in keys) {
        keys[key] = true;
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    // Special handling for spacebar
    if (key === ' ' || key === 'spacebar') {
        keys[' '] = false;
    } else if (key in keys) {
        keys[key] = false;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// HP System
const maxHP = 150;
let currentHP = maxHP;
const hpBar = document.getElementById('hpFill');
const hpText = document.getElementById('hpText');

function updateHP(amount) {
    currentHP = Math.max(0, Math.min(maxHP, currentHP + amount));
    hpBar.style.width = `${(currentHP / maxHP) * 100}%`;
    hpText.textContent = `${currentHP}/${maxHP}`;
}

function takeDamage(amount) {
    updateHP(-amount);
    if (currentHP <= 0) {
        respawnPlayer();
    }
}

function healPlayer(amount) {
    updateHP(amount);
}

function respawnPlayer() {
    // Reset position to start
    player.position.set(0, 2, 0);
    velocity.set(0, 0, 0);
    currentHP = maxHP;
    updateHP(0); // Update display
}

// Collision detection
function checkCollisions() {
    // Check platform collisions first
    let onPlatform = false;
    platforms.forEach(platform => {
        const platformWorldPos = new THREE.Vector3();
        platform.getWorldPosition(platformWorldPos);
        const playerBottom = player.position.y - 1;
        const playerTop = player.position.y + 1;
        const platformTop = platformWorldPos.y + 0.5;
        const platformBottom = platformWorldPos.y - 0.5;
        const width = platform.geometry.parameters.width;
        const depth = platform.geometry.parameters.depth;
        
        // Horizontal bounds check with proper world position
        const withinX = Math.abs(player.position.x - platformWorldPos.x) < width / 2 + 0.5;
        const withinZ = Math.abs(player.position.z - platformWorldPos.z) < depth / 2 + 0.5;
        
        if (withinX && withinZ) {
            // Landing on top of platform
            if (playerBottom <= platformTop && playerBottom > platformBottom && velocity.y <= 0) {
                player.position.y = platformTop + 1;
                velocity.y = 0;
                onPlatform = true;
            }
            // Hitting platform from below
            else if (playerTop >= platformBottom && playerTop < platformTop && velocity.y > 0) {
                player.position.y = platformBottom - 1;
                velocity.y = 0;
            }
        }
        return onPlatform;
    });

    // Check castle and tower collisions
    scene.traverse(function(object) {
        if (object.userData && object.userData.collisionBox) {
            const box = object.userData.collisionBox;
            const playerBox = new THREE.Box3(
                new THREE.Vector3(player.position.x - 1, player.position.y - 2, player.position.z - 1),
                new THREE.Vector3(player.position.x + 1, player.position.y + 2, player.position.z + 1)
            );

            if (playerBox.intersectsBox(box)) {
                // Calculate collision response
                const prevX = player.position.x - velocity.x;
                const prevZ = player.position.z - velocity.z;
                const prevY = player.position.y - velocity.y;

                // Determine which side was hit
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Check X-axis collision
                if (prevX < center.x - size.x/2 || prevX > center.x + size.x/2) {
                    player.position.x = prevX;
                    velocity.x = 0;
                }

                // Check Z-axis collision
                if (prevZ < center.z - size.z/2 || prevZ > center.z + size.z/2) {
                    player.position.z = prevZ;
                    velocity.z = 0;
                }

                // Check Y-axis collision
                if (prevY < center.y - size.y/2 || prevY > center.y + size.y/2) {
                    player.position.y = prevY;
                    velocity.y = 0;
                    if (prevY < center.y) {
                        onPlatform = true;
                    }
                }
            }
        }
    });

    // Check wall collisions with improved response
    scene.traverse(function(object) {
        if (object.userData && object.userData.isWall) {
            const wallWorldPos = new THREE.Vector3();
            object.getWorldPosition(wallWorldPos);

            const width = object.userData.width;
            const height = object.userData.height;
            const depth = object.userData.depth;

            // Calculate bounds with world position and increased collision area
            const minX = wallWorldPos.x - width / 2 - 1;  // Added padding
            const maxX = wallWorldPos.x + width / 2 + 1;
            const minY = wallWorldPos.y - height / 2 - 1;
            const maxY = wallWorldPos.y + height / 2 + 1;
            const minZ = wallWorldPos.z - depth / 2 - 1;
            const maxZ = wallWorldPos.z + depth / 2 + 1;

            // Previous position for better collision response
            const prevX = player.position.x - velocity.x;
            const prevY = player.position.y - velocity.y;
            const prevZ = player.position.z - velocity.z;

            // Check if player is within bounds with increased collision area
            if (player.position.x > minX && player.position.x < maxX &&
                player.position.y > minY && player.position.y < maxY &&
                player.position.z > minZ && player.position.z < maxZ) {

                // Determine which side was hit by checking previous position
                if (prevX <= minX || prevX >= maxX) {
                    player.position.x = prevX;
                    velocity.x = 0;
                }
                if (prevZ <= minZ || prevZ >= maxZ) {
                    player.position.z = prevZ;
                    velocity.z = 0;
                }
                if (prevY <= minY || prevY >= maxY) {
                    player.position.y = prevY;
                    velocity.y = 0;
                    if (prevY < wallWorldPos.y) {
                        onPlatform = true;
                    }
                }
            }
        }
    });
    // Check collectible collisions
    let allCrystalsCollected = true;
    collectibles.forEach((collectible, index) => {
        if (collectible.visible && player.position.distanceTo(collectible.position) < 1.5) {
            collectible.visible = false;
            healPlayer(10);
            if (tutorial.isActive) {
                tutorial.updateCrystals();
            }
        }
        if (collectible.visible) {
            allCrystalsCollected = false;
        }
    });

    // Show portal when all crystals are collected
    if (allCrystalsCollected && !portal.visible) {
        portal.visible = true;
        showQuizPrompt();
    }

    // Check portal collision if visible
    if (portal.visible && player.position.distanceTo(portal.position) < 3) {
        startQuiz();
    }

    // Check if player fell too far (increased fall distance)
    if (player.position.y < -50) {  // Changed from -10 to -50
        takeDamage(currentHP); // Kill player if they fall off the map
    }
  }
// Inventory System
const inventory = {
    wings: {
        active: true,
        name: "Pegasus Wings",
        toggle: function() {
            this.active = !this.active;
            const slot = document.querySelector('.inventory-slot[data-item="wings"]');
            const tooltip = slot.querySelector('.item-tooltip');
            if (this.active) {
                slot.classList.add('active');
                tooltip.textContent = "Pegasus Wings (Active)";
            } else {
                slot.classList.remove('active');
                tooltip.textContent = "Pegasus Wings (Inactive)";
            }
        }
    },
    wand: {
        active: false,
        name: "Magic Wand",
        toggle: function() {
            this.active = !this.active;
            const slot = document.querySelector('.inventory-slot[data-item="wand"]');
            const tooltip = slot.querySelector('.item-tooltip');
            if (this.active) {
                slot.classList.add('active');
                tooltip.textContent = "Magic Wand (Active)";
                createSparkleEffect();
            } else {
                slot.classList.remove('active');
                tooltip.textContent = "Magic Wand (Inactive)";
            }
        }
    },
    guide: {
        name: "Guide Book",
        toggle: function() {
            const tutorial = document.getElementById('tutorial');
            if (tutorial.style.display === 'none' || !tutorial.style.display) {
                tutorial.style.display = 'block';
            } else {
                tutorial.style.display = 'none';
            }
        }
    },
    magicalFart: {
        active: true,
        name: "Magical Fart",
        charges: 10000,
        toggle: function() {
            const slot = document.querySelector('.inventory-slot[data-item="fart"]');
            const tooltip = slot.querySelector('.item-tooltip');
            slot.classList.add('active');  // Always show as active
            tooltip.textContent = `${this.name} (Active) - Unlimited charges`;
        },
        updateUI: function() {
            const slot = document.querySelector('.inventory-slot[data-item="fart"]');
            if (slot) {
                const tooltip = slot.querySelector('.item-tooltip');
                slot.classList.add('active');
                tooltip.textContent = `${this.name} (Active) - Unlimited charges`;
            }
        }
    }   
};

// Add tooltip and click functionality
document.querySelectorAll('.inventory-slot').forEach(slot => {
    const tooltip = slot.querySelector('.item-tooltip');
    
    slot.addEventListener('mouseover', () => {
        tooltip.style.display = 'block';
    });
    
    slot.addEventListener('mouseout', () => {
        tooltip.style.display = 'none';
    });
    
    slot.addEventListener('click', () => {
        const itemName = slot.getAttribute('data-item');
        if (inventory[itemName]) {
            inventory[itemName].toggle();
        }
    });
});

// Add close button functionality for tutorial
document.getElementById('tutorial-close').addEventListener('click', () => {
    document.getElementById('tutorial').style.display = 'none';
});
// Remove intro message after animation completes
setTimeout(() => {
    const intro = document.getElementById('intro-message');
    if (intro) intro.remove();
  }, 12000); 
// Create magical sparkle effect
function createSparkleEffect() {
    const sparkleGeometry = new THREE.BufferGeometry();
    const sparkleCount = 50;
    const positions = new Float32Array(sparkleCount * 3);
    const colors = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount * 3; i += 3) {
        // Random position around the player
        positions[i] = (Math.random() - 0.5) * 4;
        positions[i + 1] = Math.random() * 4;
        positions[i + 2] = (Math.random() - 0.5) * 4;

        // Random colors (pink and purple)
        colors[i] = Math.random() * 0.5 + 0.5; // Red
        colors[i + 1] = Math.random() * 0.3; // Green
        colors[i + 2] = Math.random() * 0.5 + 0.5; // Blue
    }

    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sparkleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    sparkles.position.copy(player.position);
    scene.add(sparkles);

    // Animate sparkles
    const animate = () => {
        if (!inventory.wand.active) {
            scene.remove(sparkles);
            return;
        }

        sparkles.position.copy(player.position);
        const positions = sparkleGeometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += Math.sin(Date.now() * 0.005 + i) * 0.01;
            positions[i + 1] += Math.cos(Date.now() * 0.005 + i) * 0.01;
            positions[i + 2] += Math.sin(Date.now() * 0.005 + i) * 0.01;
        }
        
        sparkleGeometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(animate);
    };
    
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Check distance to pegasi and show dialogue
    scene.traverse(function(object) {
        if (object.userData && object.userData.isPegasus) {
            const distance = player.position.distanceTo(object.position);
            if (distance < 15 && !object.userData.hasSpoken) { // Within 15 units
                showPegasusDialogue(object);
                object.userData.hasSpoken = true;
            }
        }
    });

    // Existing animation code...
    // Apply gravity if not flying
    if (!keys[' '] || !inventory.wings.active) {  // Check if wings are active
        velocity.y -= gravity;
        if (velocity.y < -maxFallSpeed) velocity.y = -maxFallSpeed;
    } else {
        velocity.y = flyingForce;
    }

    // Calculate movement direction relative to camera
    const moveVector = new THREE.Vector3(0, 0, 0);
    if (keys.w || keys.s || keys.a || keys.d) {
        // Get forward and right vectors from the camera
        const forward = new THREE.Vector3(
            Math.sin(cameraRotation),
            0,
            Math.cos(cameraRotation)
        );
        const right = new THREE.Vector3(
            Math.sin(cameraRotation + Math.PI / 2),
            0,
            Math.cos(cameraRotation + Math.PI / 2)
        );

        // Add movement based on key presses (reverted to original)
        if (keys.s) moveVector.add(forward);     // S moves forward
        if (keys.w) moveVector.sub(forward);     // W moves backward
        if (keys.d) moveVector.add(right);       // D moves right
        if (keys.a) moveVector.sub(right);       // A moves left

        // Normalize movement vector to maintain consistent speed in all directions
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(moveSpeed);
            
            // Update player rotation to face movement direction
            player.rotation.y = Math.atan2(moveVector.x, moveVector.z)-Math.PI/2;
            
            // Apply movement
            velocity.x = moveVector.x;
            velocity.z = moveVector.z;
        }
    } else {
        // Apply friction when not moving
        velocity.x *= 0.95;
        velocity.z *= 0.95;
    }

    // Update position
    player.position.add(velocity);

    // Check collisions
    const onPlatform = checkCollisions();

    // Animate unicorn
    unicorn.animate(keys[' '] || !onPlatform, velocity);

    // Animate collectibles
    collectibles.forEach((collectible, index) => {
        if (collectible.visible) {
            // Rotate the entire portal
            collectible.rotation.z += 0.01;
            
            // Counter-rotate the inner circle for interesting effect
            collectible.children[1].rotation.z -= 0.02;
            
            // Rotate sparkle ring independently
            collectible.children[2].rotation.z += 0.015;
            
            // Floating motion
            collectible.position.y += Math.sin(Date.now() * 0.002 + index) * 0.02;
            
            // Pulse scale effect
            const scale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.1;
            collectible.scale.set(scale, scale, scale);
        }
    });

    // Animate clouds
    clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(Date.now() * 0.001 + index) * 0.01;
        cloud.position.z += Math.cos(Date.now() * 0.001 + index) * 0.01;
    });

    // Calculate desired camera position
    const idealOffset = new THREE.Vector3(
        Math.sin(cameraRotation) * cameraOffset.z,
        cameraOffset.y,
        Math.cos(cameraRotation) * cameraOffset.z
    );

    // Calculate actual camera position with smoothing
    camera.position.lerp(player.position.clone().add(idealOffset), cameraSmoothness);

    // Make the camera look at a point slightly above the player
    const lookAtPosition = player.position.clone().add(cameraLookOffset);
    camera.lookAt(lookAtPosition);

    //food animation
    let nearFood = false;
    foodItems.forEach(item => {
        if(isPlayerNear(item)){
            nearFood = true;
        }
    });
    const prompt = document.getElementById('eatPrompt');
    if(nearFood && !prompt){
        showEatPrompt();
    }else if(!nearFood && prompt){
        prompt.remove();
    }

    // Animate portal
    if (portal.visible) {
        portal.rotation.z += 0.01;
        portal.children[1].rotation.z -= 0.02;  // Rotate inner circle opposite direction
        portal.scale.x = 1 + Math.sin(Date.now() * 0.001) * 0.1;
        portal.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.1;
        portal.scale.z = 1 + Math.sin(Date.now() * 0.001) * 0.1;
    }
    else if (portal.visible && portal.userData.isFinalPortal) {
        portal.rotation.z += 0.02;
        portal.scale.x = 3 + Math.sin(Date.now() * 0.005) * 0.5;
        portal.scale.y = 3 + Math.cos(Date.now() * 0.005) * 0.5;
        // Pulsing glow effect
        portal.children[0].material.emissiveIntensity = 
          Math.abs(Math.sin(Date.now() * 0.002)) * 2;
      }
      if(boss && bossHP > 0) {
        rotateBossToFacePlayer();
        updateProjectiles();
      }
    // Render scene
    renderer.render(scene, camera);
}

// Start animation
animate();

function updateProjectiles() {
    // Update boss projectiles
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const projectile = bossProjectiles[i];
        projectile.position.add(projectile.userData.velocity);

        if (projectile.position.distanceTo(player.position) < 1.5) {
            takeDamage(projectile.userData.damage);
            scene.remove(projectile);
            bossProjectiles.splice(i, 1);
            continue;
        }
        if (Date.now() - projectile.userData.createdAt > 10000) {
            scene.remove(projectile);
            playerProjectiles.splice(i, 1);
        }
    }
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const projectile = playerProjectiles[i];
        projectile.position.add(projectile.userData.velocity);
        // Check collision with boss
        if (boss && bossHP > 0) {
            const bossHitboxPos = boss.position.clone();
            bossHitboxPos.y += 6; // Match the hitbox offset
            const bossHitbox = new THREE.Sphere(bossHitboxPos, 3);
            const projectileHitbox = new THREE.Sphere(projectile.position.clone(), 1);
            
            if (bossHitbox.intersectsSphere(projectileHitbox)) {
                bossHP -= projectile.userData.damage;
                updateBossHP(); // This will handle the HP check and phase transitions
                scene.remove(projectile);
                playerProjectiles.splice(i, 1);
                createHitEffect(boss.position);
                continue;
            }
        }
        // Remove old projectiles
        if (Date.now() - projectile.userData.createdAt > 10000) {
            scene.remove(projectile);
            playerProjectiles.splice(i, 1);
        }
    }
}
function createHitEffect(position) {
    // Create a quick flash effect
    const hitGeometry = new THREE.SphereGeometry(2, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.7
    });
    const hitEffect = new THREE.Mesh(hitGeometry, hitMaterial);
    hitEffect.position.copy(position);
    scene.add(hitEffect);
    
    // Auto-remove after short time
    setTimeout(() => {
        scene.remove(hitEffect);
    }, 200);
}
// Tutorial System
const tutorial = {
    currentStep: 0,
    isActive: true,
    crystalsCollected: 0,
    totalCrystals: 0,
    steps: [
        {
            title: "Welcome to the Magical Village!",
            content: "The villagers have been turned to crystal by an evil spell. Help break the curse by collecting all the magical crystals!",
            controls: ""
        },
        {
            title: "Basic Movement",
            content: "Let's learn how to move around:",
            controls: `
                W - Move Forward
                S - Move Backward
                A - Move Left
                D - Move Right
                Mouse (Hold Left Button) - Rotate Camera
            `
        },
        {
            title: "Flying",
            content: "Your Pegasus Wings allow you to fly!",
            controls: `
                SPACEBAR - Hold to fly upward
                Wings must be active in your inventory
            `
        },
        {
            title: "Magic Items",
            content: "Check your inventory in the bottom-left corner:",
            controls: `
                Pegasus Wings - Click to toggle flying ability
                Magic Wand - Click to toggle magical effects
                Hover over items to see their status
            `
        },
        {
            title: "Your Quest",
            content: "Collect all the magical crystals floating above the platforms to complete your training!",
            controls: "Watch your HP bar when falling from heights!"
        }
    ],

    init() {
        // Wait for DOM to be fully loaded
        if (!document.getElementById('tutorial')) {
            console.error('Tutorial elements not found, retrying in 100ms');
            setTimeout(() => this.init(), 100);
            return;
        }
        this.totalCrystals = collectibles.length;
        document.getElementById('total-crystals').textContent = this.totalCrystals;
        document.getElementById('crystals-collected').textContent = this.crystalsCollected;
        document.getElementById('tutorial-progress').style.display = 'block';
        
        const nextButton = document.getElementById('tutorial-next');
        nextButton.addEventListener('click', () => this.nextStep());

        // Force display of first step
        this.currentStep = 0;
        this.showStep();

        // Make sure tutorial is visible
        document.getElementById('tutorial').style.display = 'block';
        document.getElementById('tutorial-progress').style.display = 'block';
    },

    showStep() {
        const tutorial = document.getElementById('tutorial');
        const stepDiv = document.getElementById('tutorial-step');
        const controlsDiv = document.getElementById('tutorial-controls');
        const nextButton = document.getElementById('tutorial-next');
        
        if (this.currentStep < this.steps.length) {
            const step = this.steps[this.currentStep];
            stepDiv.innerHTML = `<h2>${step.title}</h2><p>${step.content}</p>`;
            controlsDiv.innerHTML = step.controls ? `<pre>${step.controls}</pre>` : '';
            tutorial.style.display = 'block';
            
            // Show next button except for last step
            nextButton.style.display = this.currentStep < this.steps.length - 1 ? 'block' : 'none';
        } else {
            // Don't hide tutorial when steps are done, wait for crystal collection
            tutorial.style.display = 'block';
            this.isActive = true;
        }
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep();
        }
    },

    updateCrystals() {
        this.crystalsCollected++;
        document.getElementById('crystals-collected').textContent = this.crystalsCollected;
        
        // Check if all crystals are collected
        if (this.crystalsCollected === this.totalCrystals) {
            this.complete();
        }
    },

    complete() {
        const tutorial = document.getElementById('tutorial');
        const stepDiv = document.getElementById('tutorial-step');
        const controlsDiv = document.getElementById('tutorial-controls');
        const nextButton = document.getElementById('tutorial-next');
        
        stepDiv.innerHTML = `<h2>Tutorial Complete!</h2>
            <p>Congratulations! You've collected all the crystals and completed your training.</p>
            <p>Now continue exploring the magical world!</p>`;
        controlsDiv.innerHTML = '';
        nextButton.style.display = 'none';
        tutorial.style.display = 'block';
        
        setTimeout(() => {
            tutorial.style.display = 'none';
            document.getElementById('tutorial-progress').style.display = 'none';
        }, 5000);
    }
};

// Initialize tutorial after scene setup
window.addEventListener('load', () => {
    tutorial.init();
});

// Quiz System
function showQuizPrompt() {
    const message = document.createElement('div');
    message.id = 'portalPrompt';  // Add ID for easy removal
    message.style.position = 'fixed';
    message.style.top = '20px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';
    message.style.background = 'rgba(0, 0, 0, 0.8)';
    message.style.color = 'white';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';s
    message.style.textAlign = 'center';
    message.style.zIndex = '1000';
    message.innerHTML = 'Ωχ μια πύλη εμφανίστηκε στον ουρανό!<br>Πέρνα από την πύλη για να συνεχίσεις!';
    document.body.appendChild(message);
    
    // Remove after 5 seconds or when portal is entered
    setTimeout(() => {
        const prompt = document.getElementById('portalPrompt');
        if (prompt) prompt.remove();
    }, 5000);
}

function startQuiz() {
    // Remove portal prompt if it still exists
    const portalPrompt = document.getElementById('portalPrompt');
    if (portalPrompt) portalPrompt.remove();
    
    showQuizBox();
}

function showQuizBox() {
    // Remove any existing quiz boxes or messages
    const existingQuiz = document.getElementById('quizBox');
    if (existingQuiz) existingQuiz.remove();

    // Create quiz container
    const quizContainer = document.createElement('div');
    quizContainer.id = 'quizBox';  // Add ID for easy removal
    quizContainer.style.position = 'fixed';
    quizContainer.style.top = '50%';
    quizContainer.style.left = '50%';
    quizContainer.style.transform = 'translate(-50%, -50%)';
    quizContainer.style.background = 'rgba(0, 0, 0, 0.9)';
    quizContainer.style.color = 'white';
    quizContainer.style.padding = '30px';
    quizContainer.style.borderRadius = '15px';
    quizContainer.style.textAlign = 'center';
    quizContainer.style.minWidth = '400px';
    quizContainer.style.border = '2px solid #FF8C00';
    quizContainer.style.fontFamily = 'Arial, sans-serif';
    quizContainer.style.zIndex = '1000';

    // Add question
    const question = document.createElement('h2');
    question.textContent = 'Ποιά τικτόκερ μας κάνει να γελάμε περισσότερο? Δύσκολο αλλά υπάρχει αντικειμενικά μία απάντηση';
    question.style.marginBottom = '20px';
    question.style.color = '#FF8C00';
    quizContainer.appendChild(question);

    // Add answers
    const answers = ['Alexandra Ber', 'Amalia T', 'NIKI CLEANTOK', 'Nefeli'];
    answers.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.padding = '10px';
        button.style.margin = '10px 0';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.background = '#444';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.transition = 'background 0.3s';

        // Hover effect
        button.onmouseover = () => button.style.background = '#666';
        button.onmouseout = () => button.style.background = '#444';

        // Click handler
        button.onclick = () => {
            quizContainer.remove();  // Remove quiz immediately
            if (answer === 'NIKI CLEANTOK') {
                portal.visible = false;  // Hide portal first
                // Show success message
                const successMessage = showMessageBox(
                    "Σωστή απάντηση μπράβο!! Πρέπει να σταματήσει το μπρεινροτ",
                    true // Enable sparkly effect
                );
                successMessage.id = 'successMessage';
                document.body.appendChild(successMessage);
                successMessage.onclick = () => {
                    successMessage.remove();
                    player.position.set(-70, 124, 0);  // Positioned on the left platform
                    velocity.set(0, 0, 0);  // Reset velocity
                    // Position camera behind and above player, looking at castle
                    cameraRotation = Math.PI;  // Face the castle
                    camera.position.set(-70, 125, 20);  // Position camera slightly behind and above player
                    camera.lookAt(new THREE.Vector3(0, 100, 0));  // Look at castle center
                };
            } else {
                // Wrong answer
                takeDamage(25);
                const failureMessage = showMessageBox(
                    `Είπα μία απάντηση υπάρχει μόνο τελέιωνε... Πάρε -25 HP. ${currentHP <= 0 ? 'You have perished!' : 'Try again!'}`
                );
                failureMessage.id = 'failureMessage';
                document.body.appendChild(failureMessage);
                failureMessage.onclick = () => {
                    failureMessage.remove();
                    if (currentHP <= 0) {
                        respawnPlayer();
                    } else {
                        showQuizBox(); // Show quiz again
                    }
                };
            }
        };

        quizContainer.appendChild(button);
    });

    document.body.appendChild(quizContainer);
}

// Create a styled message box
function showMessageBox(message, isSparkly = false) {
    const box = document.createElement('div');
    box.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        min-width: 400px;
        cursor: pointer;
        z-index: 1001;
        border: 2px solid #FF8C00;
        font-family: Arial, sans-serif;
    `;

    if (isSparkly) {
        box.innerHTML = `
            <style>
                @keyframes sparkle {
                    0% { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #FF69B4; }
                    50% { text-shadow: 0 0 15px #fff, 0 0 25px #fff, 0 0 35px #FF69B4; }
                    100% { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #FF69B4; }
                }
                .sparkly-text {
                    animation: sparkle 2s infinite;
                    color: #FFB6C1;
                }
            </style>
            <h2 class="sparkly-text">${message}</h2>
            <p style="margin-top: 20px; font-size: 14px;">(Click to continue)</p>
        `;
    } else {
        box.innerHTML = `
            <h2 style="color: #FF8C00; margin-bottom: 20px;">${message}</h2>
            <p style="margin-top: 20px; font-size: 14px;">(Click to continue)</p>
        `;
    }

    document.body.appendChild(box);
    return box;
}

// Create a castle for Cloud Kingdom
async function createCastle() {
    const castle = new THREE.Group();

    try {
        // Load the castle model
        const castleLoader = new GLTFLoader();
        const castleGLTF = await new Promise((resolve, reject) => {
            castleLoader.load(
                './models/Castle BLEND.glb',
                resolve,
                undefined,
                reject
            );
        });
        const castleModel = castleGLTF.scene;
        
        // Position and scale the castle
        castleModel.position.set(0, 0, 0);
        castleModel.scale.set(2, 2, 2); // Adjust scale as needed
        
        // Add castle to the group
        castle.add(castleModel);

        // Add the entire castle group to the scene
        scene.add(castle);

        // Create thick collision walls around the castle
        const wallThickness = 2; // Thickness of the collision walls
        const wallHeight = 20;   // Height of the collision walls
        const wallOffset = 15;   // Distance from castle center

        // Create collision walls with increased thickness and better positioning
        const walls = [
            // Front wall
            createWall(0, wallOffset, 50, wallHeight, 0),
            // Back wall
            createWall(0, -wallOffset, 50, wallHeight, 0),
            // Left wall
            createWall(-wallOffset, 0, 50, wallHeight, Math.PI / 2),
            // Right wall
            createWall(wallOffset, 0, 50, wallHeight, Math.PI / 2)
        ];

        // Add collision data to walls with increased thickness
        walls.forEach(wall => {
            wall.userData.isWall = true;
            wall.userData.width = 50;  // Increased width
            wall.userData.height = wallHeight;
            wall.userData.depth = wallThickness * 2;  // Doubled thickness
            wall.userData.isSolid = true;  // Added flag for solid collision
        });

        console.log('Castle loaded successfully');
        return castle;

    } catch (error) {
        console.error('Error loading castle model:', error);
        // Show error message to user
        const errorMessage = showMessageBox(
            "Oops! Something went wrong loading the castle. Please check the console for details.",
            false
        );
        document.body.appendChild(errorMessage);
        return null;
    }
}

// Modify Cloud Kingdom creation to handle async castle creation
async function createCloudKingdom() {
    const cloudKingdom = new THREE.Group();

    // Main platform with collision matching starting platform (smaller size)
    const platformGeometry = new THREE.BoxGeometry(40, 1, 40); // Reduced from 80 to 40
    const platformMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xE6E6FA,
        roughness: 0.3,
        metalness: 0.7
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.receiveShadow = true;
    platform.castShadow = true;
    platform.position.set(0, 100, 0);
    scene.add(platform);
    platforms.push(platform);

    // Add castle
    const castle = await createCastle();
    castle.position.set(0, 101, 0);  // Adjusted Y position to be just above platform
    scene.add(castle);

    // Add pegasi with enhanced sparkle effects
    try {
        // Load pink pegasus with larger scale and position it on a platform near the player spawn
        const pinkPegasus = await loadModel(
            './models/base_basic_pbr.glb',
            { x: -30, y: 133, z: 0 },  // Positioned on the diagonal platform near player spawn
            { x: 0, y: -Math.PI / 4, z: 0 },  // Changed rotation to face the opposite direction
            { x: 12, y: 12, z: 12 }  // Keep size at 12
        );

        // Add enhanced sparkle effect similar to magic wand
        const sparkleGeometry = new THREE.BufferGeometry();
        const sparkleCount = 150; // Increased for more particles
        const positions = new Float32Array(sparkleCount * 3);
        const colors = new Float32Array(sparkleCount * 3);

        for (let i = 0; i < sparkleCount * 3; i += 3) {
            // Random position around the pegasus with larger spread
            positions[i] = (Math.random() - 0.5) * 12;     // Increased spread
            positions[i + 1] = Math.random() * 12;         // Increased height spread
            positions[i + 2] = (Math.random() - 0.5) * 12; // Increased spread

            // Bright white sparkle colors with slight blue tint
            colors[i] = Math.random() * 0.2 + 0.8;     // High red (0.8-1.0)
            colors[i + 1] = Math.random() * 0.2 + 0.8; // High green (0.8-1.0)
            colors[i + 2] = 1.0;                       // Full blue for slight blue tint
        }

        sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const sparkleMaterial = new THREE.PointsMaterial({
            size: 0.2,              // Larger size
            transparent: true,
            opacity: 0.9,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false       // Prevent z-fighting
        });

        const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
        pinkPegasus.add(sparkles);

        // Enhanced sparkle animation with more complex movement
        const animateSparkles = () => {
            const positions = sparkleGeometry.attributes.position.array;
            const time = Date.now() * 0.001; // Slower time factor
            
            for (let i = 0; i < positions.length; i += 3) {
                // More complex movement pattern
                positions[i] += Math.sin(time + i * 0.1) * 0.02;
                positions[i + 1] += Math.cos(time + i * 0.05) * 0.02;
                positions[i + 2] += Math.sin(time * 0.8 + i * 0.05) * 0.02;
                
                // Reset particles that drift too far
                if (Math.abs(positions[i]) > 6) positions[i] *= 0.95;
                if (Math.abs(positions[i + 1]) > 6) positions[i + 1] *= 0.95;
                if (Math.abs(positions[i + 2]) > 6) positions[i + 2] *= 0.95;
            }
            
            sparkleGeometry.attributes.position.needsUpdate = true;
            requestAnimationFrame(animateSparkles);
        };
        animateSparkles();

        pinkPegasus.userData = {
            isPegasus: true,
            name: 'Rose',
            hasSpoken: false,
            dialogue: [
                "Καλωσήρθες στο βασίλειο των συννέφων πριγκίπισσα!",
                "Λυπάμαι πολύ για το χωριό σου που καταστράφηκε από το ξόρκι του κακού Γάλλου...",
                "Ο Le Baguette είναι πανίσχυρος και αδίστακτος. Είναι τίγκα ρίεργος ο μπρο",
                "Μόνο αν καταφέρεις να δαμάσεις τις δυνάμεις σου θα έχεις ελπίδα!",
                "Πρέπει πρώτα όμως να φας για να ανακτήσεις τις δυνάμεις σου!",
                "Τι ψήνεις να φας μπροκολόκο?"
            ],
            showFoodQuiz: true  // Add flag to show food quiz after dialogue
        };
        scene.add(pinkPegasus);
    } catch (error) {
        console.error('Failed to load pegasus model:', error);
    }

    // Add floating platforms with consistent physics
    const floatingPlatformPositions = [
        { x: -40, y: 125, z: 0 },      // Right platform
        { x: -30, y: 127, z: 0 },     // Left platform (player spawn)
        { x: -50, y: 123, z: 0 },      // Forward platform
        { x: 0, y: 123, z: 0 },     // Back platform
        { x: -60, y: 121, z: 0 },     // Diagonal platform
        { x: -70, y: 120, z: 0 }    // Diagonal platform (pegasus platform)
    ];

    floatingPlatformPositions.forEach(pos => {
        const floatGeometry = new THREE.BoxGeometry(8, 1, 8);  // Changed height to 1
        const floatMaterial = new THREE.MeshStandardMaterial({
            color: 0xB19CD9,
            metalness: 0.6,
            roughness: 0.2
        });
        const floatingPlatform = new THREE.Mesh(floatGeometry, floatMaterial);
        floatingPlatform.position.set(pos.x, pos.y, pos.z);
        floatingPlatform.receiveShadow = true;
        floatingPlatform.castShadow = true;
        scene.add(floatingPlatform);
        platforms.push(floatingPlatform);  // This ensures it uses the same collision logic as starting platform
    });
    // Add decorative clouds around castle (adjusted height)
    for (let i = 0; i < 80; i++) {
        const radius = Math.random() * 80 + 40;  // Increased from 60+30 to 80+40
        const angle = (i / 80) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 105;  // Adjusted to be closer to castle
        
        const cloud = createCloud(x, y, z);
        cloud.scale.set(3 + Math.random() * 2, 1.5, 3 + Math.random() * 2);
        cloud.position.y += 72;  // Adjusted to be closer to castle
        scene.add(cloud);
        clouds.push(cloud);
    }

    for (let i = 0; i < 80; i++) {
        const radius = Math.random() * 80 + 40;  // Increased from 60+30 to 80+40
        const angle = (i / 80) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 75;  // Adjusted to be closer to castle
        
        const cloud = createCloud(x, y, z);
        cloud.scale.set(3 + Math.random() * 2, 1.5, 3 + Math.random() * 2);
        cloud.position.y += 42;  // Adjusted to be closer to castle
        scene.add(cloud);
        clouds.push(cloud);
    }
    return platform;
}

// Create the Cloud Kingdom but handle async creation
async function initializeWorld() {
    try {
        await createCloudKingdom();
        console.log('Cloud Kingdom created successfully');
    } catch (error) {
        console.error('Error creating Cloud Kingdom:', error);
    }
}

// Initialize the world
initializeWorld();

// After scene setup, before creating other objects

// Create a GLTF loader
const loader = new GLTFLoader();

async function loadModel(path, position, rotation, scale) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            function (gltf) {
                const model = gltf.scene;
                
                // Apply position
                if (position) {
                    model.position.set(position.x, position.y, position.z);
                }
                
                // Apply rotation (in radians)
                if (rotation) {
                    model.rotation.set(rotation.x, rotation.y, rotation.z);
                }
                
                // Apply scale
                if (scale) {
                    model.scale.set(scale.x, scale.y, scale.z);
                }

                // Enable shadows for all meshes in the model
                model.traverse(function (node) {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                resolve(model);
            },
            // Progress callback
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // Error callback
            function (error) {
                console.error('Error loading model:', error);
                reject(error);
            }
        );
    });
}


// Add pegasus dialogue function
function showPegasusDialogue(pegasus) {
    let currentDialogue = 0;

    function showNextDialogue() {
        if (currentDialogue < pegasus.userData.dialogue.length) {
            const messageBox = showMessageBox(
                `${pegasus.userData.name}: ${pegasus.userData.dialogue[currentDialogue]}`,
                true // Enable sparkly effect
            );
            messageBox.style.borderColor = pegasus.userData.name === 'Rose' ? '#FF69B4' : '#90EE90';
            document.body.appendChild(messageBox);
            
            messageBox.onclick = () => {
                messageBox.remove();
                currentDialogue++;
                if (currentDialogue < pegasus.userData.dialogue.length) {
                    setTimeout(showNextDialogue, 500); // Short delay between messages
                } else if (pegasus.userData.showFoodQuiz) {
                    setTimeout(showFoodQuiz, 500); // Show food quiz after dialogue
                }
            };
        }
    }

    showNextDialogue();
}

// Add food quiz function
function showFoodQuiz() {
    // Create quiz container
    const quizContainer = document.createElement('div');
    quizContainer.id = 'foodQuizBox';
    quizContainer.style.position = 'fixed';
    quizContainer.style.top = '50%';
    quizContainer.style.left = '50%';
    quizContainer.style.transform = 'translate(-50%, -50%)';
    quizContainer.style.background = 'rgba(0, 0, 0, 0.9)';
    quizContainer.style.color = 'white';
    quizContainer.style.padding = '30px';
    quizContainer.style.borderRadius = '15px';
    quizContainer.style.textAlign = 'center';
    quizContainer.style.minWidth = '400px';
    quizContainer.style.border = '2px solid #FF69B4';
    quizContainer.style.fontFamily = 'Arial, sans-serif';
    quizContainer.style.zIndex = '1000';

    // Add question
    const question = document.createElement('h2');
    question.textContent = 'What is your favorite food?';
    question.style.marginBottom = '20px';
    question.style.color = '#FF69B4';
    quizContainer.appendChild(question);

    // Add answers
    const answers = ['ΜΠΟΥΤΙ ΚΟΤΟΠΟΥΛΟΥ', 'ΝΟΥΝΤΛ+ΚΟΤΟΜΠΟΥΚΙΕΣ', 'ΣΟΛΩΜΟΣ', 'ΣΤΡΑΓΓΙΣΤΟ ΓΙΑΟΥΡΤΙ ΜΑΡΑΤΑ'];
    answers.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.padding = '10px';
        button.style.margin = '10px 0';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.background = '#444';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.transition = 'background 0.3s';

        // Hover effect
        button.onmouseover = () => button.style.background = '#666';
        button.onmouseout = () => button.style.background = '#444';

        // Click handler
        button.onclick = async () => {
            quizContainer.remove();  // Remove quiz immediately
            if (answer === 'ΝΟΥΝΤΛ+ΚΟΤΟΜΠΟΥΚΙΕΣ') {
                // Show success message
                const successMessage = showMessageBox(
                    "Τέλεια επιλογή κούκλα! Ορίστε το φαγητό σου! Φάε μέχρι να σκάσεις",
                    true // Enable sparkly effect
                );
                document.body.appendChild(successMessage);
            try {
                const nuggetPositions = [
                    { x: -71, y: 124, z: 0 },
                    { x: -72, y: 124, z: 0 },
                    { x: -70, y: 123, z: 0 }
                ];
                for (const pos of nuggetPositions) {
                    const nuggetModel = await loadModel(
                        './models/chicken_nugget.glb',
                        pos,
                        { x: 0, y: -Math.PI / 4, z: 0 },
                        { x: 12, y: 12, z: 12 }
                    );
                    foodItems.push(nuggetModel); // Store the model for later reference
                    scene.add(nuggetModel);
                }
                console.log('Chicken nugget models loaded successfully');
                // Load a single ramen noodle model
                const ramenPosition = { x: -71, y: 120, z: 0 };
                const ramenModel = await loadModel(
                    './models/ramen_noodles.glb',
                    ramenPosition,
                    { x: 0, y: -Math.PI / 4, z: 0 },
                    { x: 1.2, y: 1.2, z: 1.2 }
                );
                foodItems.push(ramenModel); // Store the model for later reference
                scene.add(ramenModel);
                console.log('Ramen noodle model loaded successfully');
        } catch (error) {
                    console.error('Error loading chicken nugget models:', error);
                    const errorMessage = showMessageBox(
                        "Oops! Something went wrong loading the chicken nuggets. Please check the console for details.",
                        false
                    );
                    document.body.appendChild(errorMessage);
                }
                // Make success message clickable to dismiss
                successMessage.onclick = () => {
                    successMessage.remove();
                };
            } else {
                // Wrong answer
                takeDamage(25);
                const failureMessage = showMessageBox(
                    `ΤΙ ΛΕΣ ΡΕ ΜΠΡΟ ΟΥΤΕ ΚΑΝ... ΓΙΑ ΤΗΝ ΜΑΛΑΚΙΑ ΠΟΥ ΕΙΠΕΣ ΕΧΑΣΕΣ 25 HP. ${currentHP <= 0 ? 'You have perished!' : 'Try again!'}`
                );
                document.body.appendChild(failureMessage);
                failureMessage.onclick = () => {
                    failureMessage.remove();
                    if (currentHP <= 0) {
                        respawnPlayer();
                    } else {
                        showFoodQuiz(); // Show quiz again
                    }
                };
            }
        };

        quizContainer.appendChild(button);
    });

    document.body.appendChild(quizContainer);
}
// Function to show the eat prompt
function showEatPrompt() {
    const message = document.createElement('div');
    message.id = 'eatPrompt';  // Add ID for easy removal
    message.style.position = 'fixed';
    message.style.top = '20px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';
    message.style.background = 'rgba(0, 0, 0, 0.8)';
    message.style.color = 'white';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';
    message.style.textAlign = 'center';
    message.style.zIndex = '1000';
    message.innerHTML = 'Press E to eat';
    document.body.appendChild(message);           

    // Remove after 5 seconds
    setTimeout(() => {
        const prompt = document.getElementById('eatPrompt');
        if (prompt) prompt.remove();
    }, 5000);
}
function isPlayerNear(model) {
    const playerPosition = player.position; 
    const distance = model.position.distanceTo(playerPosition);
    return distance < 6; // Adjust the distance threshold as needed
}
let isEatingSoundPlaying = false;
function eatFood(model) {
    scene.remove(model);
    const index = foodItems.indexOf(model);
    if(index > -1) foodItems.splice(index, 1);
    if(!isFartEffectPending) {
        if(!isEatingSoundPlaying) {
            isEatingSoundPlaying = true;
            playSoundEffect('./sounds/eating-a-sandwich-102449.mp3',0.7).onended = () => {
                isEatingSoundPlaying = false;
            }; 
        }
        showDelayedEffectMessage();
        isFartEffectPending = true;
    }
    healPlayer(25);
}

document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'e') {
        foodItems.forEach(food => {
            if(isPlayerNear(food)) {
                eatFood(food);
            }
        });
    }
});
let fart_pending=true;
function showDelayedEffectMessage() {
    const existing = document.getElementById('stomachMessage');
    if (existing) existing.remove();

    // Create stomach message
    const stomachMsg = document.createElement('div');
    stomachMsg.id = 'stomachMessage';
    stomachMsg.innerHTML = `
        <div style="position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: #FF69B4; padding: 20px; border-radius: 10px;
            border: 2px solid #4B0082; font-family: Arial; text-align: center; z-index: 1000;">
            <h3>Μες στην καύλα ήταν το φαί</h3>
            <p>Ωχ το στομάχι μου νιώθει περιέργα...Θα με πάει σερπαντίνα σήμερα</p>
        </div>
    `;
    document.body.appendChild(stomachMsg);
    console.log('Stomach message shown');

    setTimeout(() => {
        console.log('15 seconds elapsed - starting transition');
        stomachMsg.remove();
        
        try {
            createFartEffect();
            if(!fart_pending)playSoundEffect('./sounds/fart_placeholder.mp3', 0.7);
            fart_pending=false;
            addMagicalFartToInventory();
            console.log('Fart effect completed');
        } catch (e) {
            console.error('Error in fart effect:', e);
        }
        setTimeout(() => {
            console.log('Showing Rose message');
            showRosePortalMessage();
        }, 500);
    }, 15000);
} 
let isVoiceLinePlaying=false;
let currentRoseMessage=null;
function showRosePortalMessage() {
    if (currentRoseMessage && currentRoseMessage.parentNode) {
        currentRoseMessage.parentNode.removeChild(currentRoseMessage);
    }
    console.log('Attempting to show Rose message');
    const message = document.createElement('div');
    currentRoseMessage=message;
    message.id = 'roseMessage';
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(45deg, #4B0082, #8A2BE2);
        color: #FFB6C1;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        min-width: 400px;
        cursor: pointer;
        z-index: 1001;
        border: 2px solid #FF69B4;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 20px rgba(255,105,180,0.5);
    `;

    message.innerHTML = `
        <h2 style="margin: 0; animation: sparkle 2s infinite;">
            Rose: Χριστέ μου δεν έχω ξανακούσει πιο δυνατή κλανιά!!!<br>
            Είσαι η μοναδική μας ελπίδα κατά του Le Baguette!<br>
        </h2>
        <p style="margin-top: 20px; font-size: 14px; color: #FFFFFF;">(Click to continue)</p>
        <style>
            @keyframes sparkle {
                0% { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #FF69B4; }
                50% { text-shadow: 0 0 15px #fff, 0 0 25px #fff, 0 0 35px #FF69B4; }
                100% { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #FF69B4; }
            }
        </style>
    `;
    document.body.appendChild(message);

    const handleClick = (e) => {
        if(isVoiceLinePlaying) return;
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.3s';
        message.style.pointerEvents = 'none';
        isVoiceLinePlaying=true;

        setTimeout(() => {
            if(message.parentNode) {
                message.parentNode.removeChild(message);
                currentRoseMessage=null;
            }
            const voiceline= playSoundEffect('./sounds/bill_voiceline1.mp3',0.6);
            voiceline.onended = () => {
                showFinalQuiz();
            };
        },300);
    }; 
    message.addEventListener('click', handleClick);
}

let currentQuizBox = null;
function showFinalQuiz() {
    // Remove any existing quiz box first
    if (currentQuizBox && currentQuizBox.parentNode) {
        currentQuizBox.parentNode.removeChild(currentQuizBox);
    }

    // Create quiz container
    const quizContainer = document.createElement('div');
    currentQuizBox = quizContainer; // Store reference
    
    quizContainer.id = 'finalQuizBox';
    quizContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        min-width: 400px;
        border: 2px solid #FF0000;
        font-family: Arial, sans-serif;
        z-index: 1000;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;

    // Add question
    const question = document.createElement('h2');
    question.textContent = 'Για να δούμε τι έχεις μάθει μικρούλα. Ποιά είναι η πιο σύνηθης αντίδραση στην click χημεία?';
    question.style.cssText = `
        color: #FF0000;
        margin-bottom: 20px;
    `;
    quizContainer.appendChild(question);

    // Add answers
    const answers = ['Diels-Alder', 'Friedel-Crafts', 'Grignard', 'CuAAC (Huisgen cycloaddition)'];
    answers.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.style.cssText = `
            display: block;
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: none;
            border-radius: 5px;
            background: #444;
            color: white;
            cursor: pointer;
            transition: background 0.3s;
        `;

        button.onclick = () => {
            // Fade out quiz container
            quizContainer.style.opacity = '0';
            quizContainer.style.pointerEvents = 'none';
            
            setTimeout(() => {
                // Remove quiz container
                if (quizContainer.parentNode) {
                    quizContainer.parentNode.removeChild(quizContainer);
                    currentQuizBox = null;
                }

                if (answer === 'CuAAC (Huisgen cycloaddition)') {
                    const successMessage = showMessageBox(
                        "Θα σέβομαι. Πήγαινε τώρα να καταστρέψεις τον Le Baguette και να βάλεις ένα τέλος στα ξόρκια του!",
                        true
                    );
                    // Make success message clickable
                    successMessage.onclick = () => {
                        if (successMessage.parentNode) {
                            successMessage.parentNode.removeChild(successMessage);
                        }
                    };
                    player.position.set(0, 210, 0);
                    velocity.set(0, 0, 0);
                    initBossFight();
                } else {
                    takeDamage(50);
                    const failureMessage = showMessageBox(
                        'Τι τσουτσέκι παριστάνεις εκεί πέρα μου λες?', 
                        false
                    );
                    // Make failure message clickable
                    failureMessage.onclick = () => {
                        if (failureMessage.parentNode) {
                            failureMessage.parentNode.removeChild(failureMessage);
                        }
                    };
                }
            }, 300);
        };

        quizContainer.appendChild(button);
    });

    document.body.appendChild(quizContainer);
}
function addMagicalFartToInventory() {
    const fartSlot = document.querySelector('[data-item="fart"]');
    fartSlot.style.display = 'flex';
    
    // Proper event listener setup
    fartSlot.addEventListener('click', () => {
        if(inventory.magicalFart.charges > 0) {
            inventory.magicalFart.active = !inventory.magicalFart.active;
            updateFartUI();
        }
    }); 
    inventory.magicalFart.updateUI();
}
function updateFartUI() {
    inventory.magicalFart.updateUI();
}
function createFartEffect() {
    if (!inventory.magicalFart.active || inventory.magicalFart.charges <= 0) return;

    // Create particle system
    const particles = new THREE.BufferGeometry();
    const particleCount = 100;
    const posArray = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x00FF00,
        transparent: true,
        opacity: 0.8
    });

    const fartCloud = new THREE.Points(particles, material);
    fartCloud.position.copy(player.position);
    scene.add(fartCloud);

    // Animate particles
    const clock = new THREE.Clock();
    const animate = () => {
        const time = clock.getElapsedTime();
        
        // Update particle positions
        const positions = fartCloud.geometry.attributes.position.array;
        for(let i = 0; i < positions.length; i += 3) {
            positions[i] += Math.sin(time * 5 + i) * 0.1;
            positions[i + 1] += Math.cos(time * 3 + i) * 0.1;
            positions[i + 2] += Math.sin(time * 2 + i) * 0.1;
        }
        
        fartCloud.geometry.attributes.position.needsUpdate = true;
        
        // Fade out
        material.opacity *= 0.97;
        
        if(material.opacity > 0.1) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(fartCloud);
        }
    };
    //playSoundEffect('./sounds/fart_placeholder.mp3',0.5);
    animate();
}
