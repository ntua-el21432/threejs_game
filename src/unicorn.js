import * as THREE from 'three';

export class Unicorn {
    constructor() {
        // Create a group to hold all unicorn parts
        this.model = new THREE.Group();

        // Body (elongated box)
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 1.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.model.add(body);

        // Head (box)
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(1.2, 0.5, 0);
        this.model.add(head);

        // Horn (cone)
        const hornGeometry = new THREE.ConeGeometry(0.1, 0.5, 8);
        const hornMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const horn = new THREE.Mesh(hornGeometry, hornMaterial);
        horn.position.set(1.4, 1.1, 0);
        horn.rotation.x = -Math.PI / 2;
        this.model.add(horn);

        // Wings (two flat triangular shapes)
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(0, 1.5);
        wingShape.lineTo(1, 0.75);
        wingShape.lineTo(0, 0);

        const wingGeometry = new THREE.ShapeGeometry(wingShape);
        const wingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFC0CB,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.leftWing.position.set(0, 0.5, -0.8);
        this.leftWing.rotation.y = Math.PI / 4;
        this.model.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.rightWing.position.set(0, 0.5, 0.8);
        this.rightWing.rotation.y = -Math.PI / 4;
        this.model.add(this.rightWing);

        // Legs (4 cylinders)
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        
        const legpositions = [
            [-0.5, -0.5, 0.4], // Front right
            [-0.5, -0.5, -0.4], // Front left
            [0.5, -0.5, 0.4],  // Back right
            [0.5, -0.5, -0.4]  // Back left
        ];

        this.legs = legpositions.map(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            this.model.add(leg);
            return leg;
        });

        // Tail (curved cylinder)
        const tailCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(-1.2, 0.3, 0),
            new THREE.Vector3(-1.4, 0, 0)
        );
        const tailGeometry = new THREE.TubeGeometry(tailCurve, 8, 0.1, 8, false);
        const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB });
        this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
        this.model.add(this.tail);

        // Mane (several small boxes)
        const maneGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const maneMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB });
        
        this.mane = [];
        for (let i = 0; i < 8; i++) {
            const mane = new THREE.Mesh(maneGeometry, maneMaterial);
            mane.position.set(0.8 - i * 0.2, 0.6, 0);
            mane.rotation.z = Math.random() * 0.2 - 0.1;
            this.model.add(mane);
            this.mane.push(mane);
        }

        // Particle system for flying effect
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = Math.random() * 2 - 1; // x
            positions[i + 1] = Math.random() * 2 - 1; // y
            positions[i + 2] = Math.random() * 2 - 1; // z

            colors[i] = Math.random(); // r
            colors[i + 1] = Math.random(); // g
            colors[i + 2] = Math.random(); // b
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.model.add(this.particles);

        // Center the model
        this.model.position.y = 1;

        // Animation properties
        this.flyingHeight = 0;
        this.wingAngle = 0;
    }

    // Method to get the model
    getModel() {
        return this.model;
    }

    // Method to update the model's position
    setPosition(x, y, z) {
        this.model.position.set(x, y, z);
    }

    // Method to update the model's rotation
    setRotation(x, y, z) {
        this.model.rotation.set(x, y, z);
    }

    // Method to animate flying
    animate(isFlying, velocity) {
        // Wing animation
        if (isFlying) {
            this.wingAngle += 0.1;
            const wingFlap = Math.sin(this.wingAngle) * 0.5;
            this.leftWing.rotation.z = wingFlap;
            this.rightWing.rotation.z = -wingFlap;
        } else {
            this.leftWing.rotation.z *= 0.95;
            this.rightWing.rotation.z *= 0.95;
        }

        // Particle animation
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;

        for (let i = 0; i < positions.length; i += 3) {
            // Update particle positions
            positions[i + 1] -= 0.02; // Move down
            
            // Reset particles that fall below
            if (positions[i + 1] < -1) {
                positions[i] = Math.random() * 2 - 1;
                positions[i + 1] = 1;
                positions[i + 2] = Math.random() * 2 - 1;

                // Rainbow colors
                colors[i] = Math.random();
                colors[i + 1] = Math.random();
                colors[i + 2] = Math.random();
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;

        // Make particles visible only when flying
        this.particles.visible = isFlying;

        // Leg animation based on movement
        const legSpeed = 0.1;
        if (velocity.length() > 0) {
            this.legs.forEach((leg, i) => {
                const offset = i * Math.PI / 2;
                leg.position.y = -0.5 + Math.sin(this.wingAngle + offset) * 0.1;
            });
        }
    }
} 