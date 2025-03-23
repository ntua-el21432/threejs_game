import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Unicorn } from './src/unicorn.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE0B0FF); // Mauve/magical purple sky
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add some basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Create floating platforms
const platforms = [];
const createPlatform = (x, y, z, width, depth) => {
    const geometry = new THREE.BoxGeometry(width, 1, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x90EE90,  // Light green
        roughness: 0.7,
        metalness: 0.1
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.receiveShadow = true;
    platform.castShadow = true;

    scene.add(platform);
    platforms.push(platform);
    return platform;
};

// Create clouds
function createCloud(x, y, z) {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,  // Increased opacity
        roughness: 0.8,  // Increased roughness for more matte look
        metalness: 0.1   // Added slight metalness for better light interaction
    });

    // Create a flatter, more natural cloud shape
    const baseShape = new THREE.SphereGeometry(2, 8, 8);
    baseShape.scale(1, 0.3, 1);  // Flatten the spheres
    
    // Create main body of the cloud
    const mainCloud = new THREE.Mesh(baseShape, cloudMaterial);
    cloud.add(mainCloud);

    // Add smaller sections to create natural cloud shape
    const numSections = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < numSections; i++) {
        const section = new THREE.Mesh(baseShape, cloudMaterial);
        
        // Position sections to create elongated cloud shape
        section.position.x = (Math.random() - 0.5) * 3;
        section.position.y = (Math.random() - 0.5) * 0.2;  // Very small Y variation
        section.position.z = (Math.random() - 0.5) * 2;
        
        // Random scale for variety
        const scale = Math.random() * 0.5 + 0.5;
        section.scale.set(scale, scale * 0.3, scale);
        
        cloud.add(section);
    }

    cloud.position.set(x, y, z);
    // Random rotation for variety
    cloud.rotation.y = Math.random() * Math.PI * 2;
    return cloud;
}

// Add clouds to the scene
const clouds = [];
for (let i = 0; i < 30; i++) {  // Increased number of clouds
    const x = Math.random() * 120 - 60;  // Wider spread
    const y = Math.random() * 40 + 10;   // Higher altitude range
    const z = Math.random() * 120 - 60;  // Wider spread
    const cloud = createCloud(x, y, z);
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

function createHill(x, z, radius, height) {
    const segments = 32;
    const hillGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Create vertices
    for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
            const u = i / segments;
            const v = j / segments;
            const theta = u * Math.PI * 2;
            const phi = v * radius;

            const x = Math.cos(theta) * phi;
            const y = Math.exp(-phi * phi / (radius * radius)) * height;
            const z = Math.sin(theta) * phi;

            vertices.push(x, y, z);
        }
    }

    // Create indices
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    hillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    hillGeometry.setIndex(indices);
    hillGeometry.computeVertexNormals();

    const hillMaterial = new THREE.MeshStandardMaterial({
        color: 0x90EE90,
        roughness: 0.8
    });

    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    hill.position.set(x, 0, z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    return hill;
}

// Create a small house
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
    wall.castShadow = true;
    wall.receiveShadow = true;

    // Add collision box data
    wall.userData = {
        isWall: true,
        width: width,
        height: height,
        depth: 1
    };

    return wall;
}

// Create ground platform
const ground = createPlatform(0, 0, 0, 50, 50);  // Keep only the ground platform

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
    { x: -15, z: -6, rotation: -Math.PI / 3 }     // Moved further out
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
    { x: -10, z: -3, rotation: Math.PI / 6 }      // Adjusted position
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
const cameraOffset = new THREE.Vector3(0, 10, 22);
const cameraLookOffset = new THREE.Vector3(0, 1.8, 0);
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
const maxHP = 100;
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
        
        // Get platform dimensions from geometry
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
    });

    // Check castle wall collisions with improved response
    scene.traverse(function(object) {
        if (object.userData && object.userData.isWall) {
            const wallWorldPos = new THREE.Vector3();
            object.getWorldPosition(wallWorldPos);

            const width = object.userData.width;
            const height = object.userData.height;
            const depth = object.userData.depth;

            // Calculate bounds with world position
            const minX = wallWorldPos.x - width / 2;
            const maxX = wallWorldPos.x + width / 2;
            const minY = wallWorldPos.y - height / 2;
            const maxY = wallWorldPos.y + height / 2;
            const minZ = wallWorldPos.z - depth / 2;
            const maxZ = wallWorldPos.z + depth / 2;

            // Previous position for better collision response
            const prevX = player.position.x - velocity.x;
            const prevY = player.position.y - velocity.y;
            const prevZ = player.position.z - velocity.z;

            // Check if player is within bounds
            if (player.position.x > minX - 0.5 && player.position.x < maxX + 0.5 &&
                player.position.y > minY - 0.5 && player.position.y < maxY + 0.5 &&
                player.position.z > minZ - 0.5 && player.position.z < maxZ + 0.5) {

                // Determine which side was hit by checking previous position
                if (prevX <= minX - 0.5 || prevX >= maxX + 0.5) {
                    player.position.x = prevX;
                    velocity.x = 0;
                }
                if (prevZ <= minZ - 0.5 || prevZ >= maxZ + 0.5) {
                    player.position.z = prevZ;
                    velocity.z = 0;
                }
                if (prevY <= minY - 0.5 || prevY >= maxY + 0.5) {
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

    return onPlatform;
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

        // Add movement based on key presses
        if (keys.s) moveVector.add(forward);     // S now moves forward
        if (keys.w) moveVector.sub(forward);     // W now moves backward
        if (keys.d) moveVector.add(right);       // Keep D for right
        if (keys.a) moveVector.sub(right);       // Keep A for left

        // Normalize movement vector to maintain consistent speed in all directions
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(moveSpeed);
            
            // Update player rotation to face movement direction
            player.rotation.y = Math.atan2(moveVector.x, moveVector.z);
            
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

    // Animate portal
    if (portal.visible) {
        portal.rotation.z += 0.01;
        portal.children[1].rotation.z -= 0.02;  // Rotate inner circle opposite direction
        portal.scale.x = 1 + Math.sin(Date.now() * 0.001) * 0.1;
        portal.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.1;
        portal.scale.z = 1 + Math.sin(Date.now() * 0.001) * 0.1;
    }

    // Render scene
    renderer.render(scene, camera);
}

// Start animation
animate();

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
    message.style.borderRadius = '10px';
    message.style.textAlign = 'center';
    message.style.zIndex = '1000';
    message.innerHTML = 'A magical portal has appeared in the sky!<br>Fly through it to begin your magical quiz!';
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
    question.textContent = 'What is the name of the most dangerous polar bear in the whole world!?';
    question.style.marginBottom = '20px';
    question.style.color = '#FF8C00';
    quizContainer.appendChild(question);

    // Add answers
    const answers = ['Gaye', 'Bobos', 'Trompas', 'Shiver'];
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
            if (answer === 'Shiver') {
                portal.visible = false;  // Hide portal first
                // Show success message
                const successMessage = showMessageBox(
                    "Congratulations! You have been granted passage to the cloud kingdom.",
                    true // Enable sparkly effect
                );
                successMessage.id = 'successMessage';
                document.body.appendChild(successMessage);
                successMessage.onclick = () => {
                    successMessage.remove();
                    // Teleport player high above the castle
                    player.position.set(0, 150, 0);  // Positioned 50 units above the castle (castle is at y=100)
                    velocity.set(0, 0, 0);  // Reset velocity
                    // Position camera behind and above player, looking down at castle
                    cameraRotation = Math.PI;  // Face the castle
                    camera.position.set(0, 155, 10);  // Position camera slightly behind and above player
                    camera.lookAt(new THREE.Vector3(0, 100, 0));  // Look at castle center
                };
            } else {
                // Wrong answer
                takeDamage(25);
                const failureMessage = showMessageBox(
                    `Wrong answer! You lost 25 HP. ${currentHP <= 0 ? 'You have perished!' : 'Try again!'}`
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
    // Remove any existing message boxes
    const existingMessages = document.querySelectorAll('[id$="Message"]');
    existingMessages.forEach(msg => msg.remove());

    const messageBox = document.createElement('div');
    messageBox.style.position = 'fixed';
    messageBox.style.top = '50%';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translate(-50%, -50%)';
    messageBox.style.background = 'rgba(0, 0, 0, 0.9)';
    messageBox.style.color = 'white';
    messageBox.style.padding = '30px';
    messageBox.style.borderRadius = '15px';
    messageBox.style.textAlign = 'center';
    messageBox.style.minWidth = '400px';
    messageBox.style.cursor = 'pointer';
    messageBox.style.fontFamily = 'Arial, sans-serif';
    messageBox.style.zIndex = '1000';
    messageBox.style.border = '2px solid #FF8C00';
    messageBox.style.animation = 'fadeIn 0.5s ease-in';

    if (isSparkly) {
        messageBox.style.background = 'linear-gradient(45deg, rgba(0,0,0,0.9), rgba(75,0,130,0.9))';
        messageBox.style.boxShadow = '0 0 20px #FF69B4';
        messageBox.innerHTML = `
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
        messageBox.innerHTML = `
            <h2 style="color: #FF8C00; margin-bottom: 20px;">${message}</h2>
            <p style="margin-top: 20px; font-size: 14px;">(Click to continue)</p>
        `;
    }

    return messageBox;
}

// Create a castle for Cloud Kingdom
async function createCastle() {
    const castle = new THREE.Group();

    // Main castle body - now with thicker walls
    const wallThickness = 4;  // Increased wall thickness
    
    // Create walls separately for proper collision
    const walls = [
        // Front wall (with large opening)
        {
            geometry: new THREE.BoxGeometry(15, 30, wallThickness),  // Left section
            position: { x: -17.5, y: 15, z: 25 }
        },
        {
            geometry: new THREE.BoxGeometry(15, 30, wallThickness),  // Right section
            position: { x: 17.5, y: 15, z: 25 }
        },
        {
            geometry: new THREE.BoxGeometry(50, 10, wallThickness),  // Top section
            position: { x: 0, y: 25, z: 25 }
        },
        // Back wall
        {
            geometry: new THREE.BoxGeometry(50, 30, wallThickness),
            position: { x: 0, y: 15, z: -25 }
        },
        // Left wall
        {
            geometry: new THREE.BoxGeometry(wallThickness, 30, 50),
            position: { x: -25, y: 15, z: 0 }
        },
        // Right wall
        {
            geometry: new THREE.BoxGeometry(wallThickness, 30, 50),
            position: { x: 25, y: 15, z: 0 }
        },
        // Top wall (roof)
        {
            geometry: new THREE.BoxGeometry(50, wallThickness, 50),
            position: { x: 0, y: 30, z: 0 }
        }
    ];

    const stoneMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4,  // Hot pink
        metalness: 0.5,
        roughness: 0.7,
        emissive: 0xFF1493,
        emissiveIntensity: 0.2
    });

    // Add each wall with collision
    walls.forEach(wall => {
        const mesh = new THREE.Mesh(wall.geometry, stoneMaterial);
        mesh.position.set(wall.position.x, wall.position.y, wall.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            isWall: true,
            width: wall.geometry.parameters.width + 1,  // Added buffer to collision
            height: wall.geometry.parameters.height + 1,
            depth: wall.geometry.parameters.depth + 1
        };
        castle.add(mesh);
    });

    // Add interior floor - make it part of the platforms array for consistent physics
    const floorGeometry = new THREE.BoxGeometry(48, 1, 48);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4,
        metalness: 0.3,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, 1, 0);
    floor.receiveShadow = true;
    castle.add(floor);
    platforms.push(floor);  // Add to platforms array for consistent collision

    // Add interior decorative columns
    const columnPositions = [
        { x: -20, z: -20 }, { x: 20, z: -20 },
        { x: -20, z: 20 }, { x: 20, z: 20 }
    ];

    columnPositions.forEach(pos => {
        const columnGeometry = new THREE.CylinderGeometry(2, 2, 28, 8);
        const column = new THREE.Mesh(columnGeometry, stoneMaterial);
        column.position.set(pos.x, 14, pos.z);
        column.castShadow = true;
        column.receiveShadow = true;
        column.userData = {
            isWall: true,
            width: 5,  // Wider collision for columns
            height: 28,
            depth: 5
        };
        castle.add(column);
    });

    // Add windows
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x00BFFF,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x1E90FF,
        emissiveIntensity: 0.8
    });

    const windowPositions = [-18, 18];
    const windowHeights = [10, 20];

    windowPositions.forEach(x => {
        windowHeights.forEach(y => {
            // Front windows
            const windowGeometry = new THREE.BoxGeometry(4, 8, wallThickness + 0.5);
            const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
            window1.position.set(x, y, 25);
            window1.userData = { 
                isWall: true,
                width: 5,  // Wider collision for windows
                height: 9,
                depth: wallThickness + 1.5
            };
            castle.add(window1);

            // Back windows
            const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
            window2.position.set(x, y, -25);
            window2.userData = { 
                isWall: true,
                width: 5,
                height: 9,
                depth: wallThickness + 1.5
            };
            castle.add(window2);

            // Side windows
            const sideWindowGeometry = new THREE.BoxGeometry(wallThickness + 0.5, 8, 4);
            const window3 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
            window3.position.set(25, y, x);
            window3.userData = { 
                isWall: true,
                width: wallThickness + 1.5,
                height: 9,
                depth: 5
            };
            castle.add(window3);

            const window4 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
            window4.position.set(-25, y, x);
            window4.userData = { 
                isWall: true,
                width: wallThickness + 1.5,
                height: 9,
                depth: 5
            };
            castle.add(window4);
        });
    });

    // Add corner towers
    const towerPositions = [
        { x: -25, z: -25 },
        { x: 25, z: -25 },
        { x: -25, z: 25 },
        { x: 25, z: 25 }
    ];

    towerPositions.forEach(pos => {
        // Tower base
        const towerGeometry = new THREE.CylinderGeometry(6, 6, 40, 8);
        const tower = new THREE.Mesh(towerGeometry, stoneMaterial);
        tower.position.set(pos.x, 20, pos.z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        tower.userData = {
            isWall: true,
            width: 13,
            height: 40,
            depth: 13
        };
        castle.add(tower);

        // Tower roof
        const roofGeometry = new THREE.ConeGeometry(8, 15, 8);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF1493,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0xFF1493,
            emissiveIntensity: 0.3
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(pos.x, 47.5, pos.z);
        roof.castShadow = true;
        roof.userData = {
            isWall: true,
            width: 16,
            height: 15,
            depth: 16
        };
        castle.add(roof);
    });

    // Add interior windows
    const interiorWindowMaterial = new THREE.MeshStandardMaterial({
        color: 0x00BFFF,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x1E90FF,
        emissiveIntensity: 0.8
    });

    // Add castle doors
    const doorWidth = 8; // Slightly wider doors
    const doorHeight = 20;
    const doorThickness = 2; // Thicker doors for better collision

    // Create door material with a magical appearance
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4B0082, // Deep indigo color
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x4B0082,
        emissiveIntensity: 0.2
    });

    // Create left door
    const leftDoorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const leftDoor = new THREE.Mesh(leftDoorGeometry, doorMaterial);
    leftDoor.position.set(-8, 10, 24.5); // Adjusted position to be flush with wall
    leftDoor.castShadow = true;
    leftDoor.receiveShadow = true;
    leftDoor.userData = {
        isWall: true,
        width: doorWidth,
        height: doorHeight,
        depth: doorThickness
    };
    castle.add(leftDoor);

    // Create right door
    const rightDoorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const rightDoor = new THREE.Mesh(rightDoorGeometry, doorMaterial);
    rightDoor.position.set(8, 10, 24.5); // Adjusted position to be flush with wall
    rightDoor.castShadow = true;
    rightDoor.receiveShadow = true;
    rightDoor.userData = {
        isWall: true,
        width: doorWidth,
        height: doorHeight,
        depth: doorThickness
    };
    castle.add(rightDoor);

    // Add decorative details to the doors
    const doorDetailMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4, // Hot pink to match castle theme
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xFF1493,
        emissiveIntensity: 0.3
    });

    // Add frame details to each door
    [leftDoor, rightDoor].forEach((door, index) => {
        // Add vertical trim
        const trimGeometry = new THREE.BoxGeometry(1, doorHeight - 2, doorThickness + 0.2);
        const xPos = index === 0 ? 3 : -3; // Position based on left or right door
        
        const verticalTrim = new THREE.Mesh(trimGeometry, doorDetailMaterial);
        verticalTrim.position.set(xPos, 0, 0.2);
        door.add(verticalTrim);

        // Add horizontal trims
        const horizontalTrimGeometry = new THREE.BoxGeometry(doorWidth - 1, 1, doorThickness + 0.2);
        const positions = [-8, -4, 0, 4, 8]; // Multiple horizontal trims

        positions.forEach(y => {
            const horizontalTrim = new THREE.Mesh(horizontalTrimGeometry, doorDetailMaterial);
            horizontalTrim.position.set(0, y, 0.2);
            door.add(horizontalTrim);
        });

        // Add door handle
        const handleGeometry = new THREE.TorusGeometry(1, 0.3, 16, 32);
        const handle = new THREE.Mesh(handleGeometry, doorDetailMaterial);
        handle.position.set(index === 0 ? 2.5 : -2.5, 0, 0.8);
        handle.rotation.y = Math.PI / 2;
        door.add(handle);
    });

    // Add door frame
    const doorFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0xFF1493,
        emissiveIntensity: 0.2
    });

    // Top frame
    const topFrameGeometry = new THREE.BoxGeometry(20, 2, doorThickness + 1);
    const topFrame = new THREE.Mesh(topFrameGeometry, doorFrameMaterial);
    topFrame.position.set(0, 20, 24.5);
    castle.add(topFrame);

    // Side frames
    const sideFrameGeometry = new THREE.BoxGeometry(2, doorHeight + 2, doorThickness + 1);
    const leftFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    leftFrame.position.set(-12, 10, 24.5);
    castle.add(leftFrame);

    const rightFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    rightFrame.position.set(12, 10, 24.5);
    castle.add(rightFrame);

    // Add windows to interior walls
    const interiorWindowPositions = [
        // Left wall interior windows
        { x: -24.5, y: 15, z: -15, rotation: Math.PI / 2 },
        { x: -24.5, y: 15, z: 15, rotation: Math.PI / 2 },
        // Right wall interior windows
        { x: 24.5, y: 15, z: -15, rotation: -Math.PI / 2 },
        { x: 24.5, y: 15, z: 15, rotation: -Math.PI / 2 },
        // Back wall interior windows
        { x: -15, y: 15, z: -24.5, rotation: 0 },
        { x: 15, y: 15, z: -24.5, rotation: 0 }
    ];

    interiorWindowPositions.forEach(pos => {
        const windowGeometry = new THREE.BoxGeometry(6, 12, 1);
        const window = new THREE.Mesh(windowGeometry, interiorWindowMaterial);
        window.position.set(pos.x, pos.y, pos.z);
        window.rotation.y = pos.rotation;
        window.castShadow = true;
        window.receiveShadow = true;
        castle.add(window);

        // Add window frame
        const frameGeometry = new THREE.BoxGeometry(7, 13, 1.5);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF69B4,
            metalness: 0.5,
            roughness: 0.7
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.copy(window.position);
        frame.rotation.copy(window.rotation);
        castle.add(frame);
    });

    return castle;
}

// Modify Cloud Kingdom creation to handle async castle creation
async function createCloudKingdom() {
    const cloudKingdom = new THREE.Group();

    // Main platform with collision matching starting platform
    const platformGeometry = new THREE.BoxGeometry(80, 1, 80);
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

    // Add pegasi
    try {
        // Load pink pegasus with larger scale
        const pinkPegasus = await loadModel(
            './models/base_basic_pbr.glb',
            { x: -10, y: 106, z: 0 },
            { x: 0, y: Math.PI / 4, z: 0 },
            { x: 8, y: 8, z: 8 }  // Increased size to 8
        );
        pinkPegasus.userData = {
            isPegasus: true,
            name: 'Rose',
            hasSpoken: false,
            dialogue: [
                "Welcome, brave one! I am Rose, guardian of the Cloud Kingdom.",
                "I've seen what happened to your family... turned to crystal by the evil French sorcerer, Le Baguette.",
                "Le Baguette's magic is powerful, but it has one weakness...",
                "The Wand of Wine was forged in the finest French vineyards, but turned against him.",
                "To break his curse, you must find this legendary Wand in the Crystal Caverns.",
                "But before you go, you must be extremely hungry!! What is your favorite food?"
            ],
            showFoodQuiz: true  // Add flag to show food quiz after dialogue
        };
        scene.add(pinkPegasus);
    } catch (error) {
        console.error('Failed to load pegasus model:', error);
    }

    // Add floating platforms with consistent physics
    const floatingPlatformPositions = [
        { x: 40, y: 105, z: 0 },
        { x: -40, y: 110, z: 0 },
        { x: 0, y: 115, z: 40 },
        { x: 0, y: 108, z: -40 },
        { x: 30, y: 112, z: 30 },
        { x: -30, y: 107, z: -30 }
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

    // Add dense cloud layer below platform
    for (let i = 0; i < 100; i++) {
        const radius = Math.random() * 100 + 40;
        const angle = (i / 100) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 85 + Math.random() * 10;
        
        const cloud = createCloud(x, y, z);
        cloud.scale.set(5 + Math.random() * 3, 2, 5 + Math.random() * 3);
        cloud.position.y += 100;
        scene.add(cloud);
        clouds.push(cloud);
    }

    // Add decorative clouds around castle (adjusted height)
    for (let i = 0; i < 80; i++) {
        const radius = Math.random() * 60 + 30;
        const angle = (i / 80) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 100 + Math.random() * 10;  // Adjusted to be closer to castle height
        
        const cloud = createCloud(x, y, z);
        cloud.scale.set(3 + Math.random() * 2, 1.5, 3 + Math.random() * 2);
        cloud.position.y += 100;
        scene.add(cloud);
        clouds.push(cloud);
    }

    // Add cloud rings around towers (adjusted height)
    towerPositions.forEach(pos => {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = pos.x + Math.cos(angle) * 8;
            const z = pos.z + Math.sin(angle) * 8;
            const y = 110 + Math.random() * 5;  // Lowered from 130 to 110
            
            const cloud = createCloud(x, y, z);
            cloud.scale.set(2, 1, 2);
            cloud.position.y += 100;
            scene.add(cloud);
            clouds.push(cloud);
        }
    });

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

function loadModel(path, position, rotation, scale) {
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

// Example usage for your pegasus models:
async function loadPegasusModels() {
    try {
        // Load pink pegasus
        const pinkPegasus = await loadModel(
            './models/base_basic_pbr.glb',  // Replace with your actual file name
            { x: -10, y: 5, z: 0 },            // Position
            { x: 0, y: Math.PI / 4, z: 0 },    // Rotation
            { x: 1, y: 1, z: 1 }               // Scale (adjust as needed)
        );
        castle.add(pinkPegasus);

        // Load green pegasus
        const greenPegasus = await loadModel(
            './models/base_basic_pbr.glb',  // Replace with your actual file name
            { x: 10, y: 5, z: 0 },             // Position
            { x: 0, y: -Math.PI / 4, z: 0 },   // Rotation
            { x: 1, y: 1, z: 1 }               // Scale (adjust as needed)
        );
        // Apply green color to the model (if needed)
        greenPegasus.traverse(function(node) {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({
                    color: 0x90EE90,
                    metalness: 0.3,
                    roughness: 0.3,
                    emissive: 0x90EE90,
                    emissiveIntensity: 0.1
                });
            }
        });
        castle.add(greenPegasus);

    } catch (error) {
        console.error('Failed to load pegasus models:', error);
    }
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
    const answers = ['TSIPOURA', 'KOTOMPOUKIES', 'MPOUTI', 'STRAGGISTO GIAOURTI'];
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
            if (answer === 'KOTOMPOUKIES') {
                // Show success message
                const successMessage = showMessageBox(
                    "Correct! Your love for KOTOMPOUKIES has summoned a magical reward!",
                    true // Enable sparkly effect
                );
                document.body.appendChild(successMessage);

                // Load raising canes model
                const loader = new GLTFLoader();
                loader.load('./models/raising_canes.glb', function(gltf) {
                    const canesModel = gltf.scene;
                    canesModel.position.set(0, 106, 0);
                    canesModel.scale.set(1000, 1000, 1000);
                    
                    // Add glow effect
                    canesModel.traverse(function(node) {
                        if (node.isMesh) {
                            node.material = new THREE.MeshStandardMaterial({
                                color: 0xFFD700,
                                metalness: 1.0,
                                roughness: 0.1,
                                emissive: 0xFFA500,
                                emissiveIntensity: 2.0
                            });
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    scene.add(canesModel);
                    console.log('Raising Canes model loaded and added to scene');

                    // Add spotlight
                    const spotLight = new THREE.SpotLight(0xFFFFFF, 10.0);
                    spotLight.position.set(0, 150, 0);
                    spotLight.target = canesModel;
                    spotLight.angle = Math.PI / 2;
                    spotLight.penumbra = 0.5;
                    spotLight.decay = 1;
                    spotLight.distance = 200;
                    scene.add(spotLight);
                }, 
                undefined,
                function(error) {
                    console.error('Error loading raising canes model:', error);
                });

                // Make success message clickable to dismiss
                successMessage.onclick = () => {
                    successMessage.remove();
                };
            } else {
                // Wrong answer
                takeDamage(25);
                const failureMessage = showMessageBox(
                    `Wrong! Everyone knows KOTOMPOUKIES is the best! You lost 25 HP. ${currentHP <= 0 ? 'You have perished!' : 'Try again!'}`
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
