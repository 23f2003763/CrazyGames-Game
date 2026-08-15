import * as THREE from 'three';

/**
 * Pickup: Floating pickup token that pops up and magnetizes to the player.
 */
export class Pickup {
  constructor(scene, type, amount, startPos) {
    this.scene = scene;
    this.type = type;
    this.amount = amount;
    this.position = new THREE.Vector3().copy(startPos);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.5,
      3.2 + Math.random() * 1.5,
      (Math.random() - 0.5) * 2.5
    );
    this.isMagnetized = false;
    this.isCollected = false;
    this.age = 0;

    this.createMesh();
  }

  createMesh() {
    const colorMap = {
      Scrap: 0xdfb438,
      Parts: 0x58a6ff,
      Medkit: 0x3fb950,
      Ammo: 0xf0883e,
      'Road Gate Fuse': 0xa371f7
    };

    const color = colorMap[this.type] || 0xffffff;
    const geo = new THREE.DodecahedronGeometry(0.2);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.5
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
  }

  update(dt, playerPos) {
    if (this.isCollected) return;
    this.age += dt;

    if (!this.isMagnetized) {
      this.velocity.y -= 9.8 * dt; // Gravity
      this.position.addScaledVector(this.velocity, dt);

      if (this.position.y <= 0.25) {
        this.position.y = 0.25;
        this.velocity.set(0, 0, 0);
        if (this.age > 0.35) {
          this.isMagnetized = true;
        }
      }
    } else {
      // Fly toward player
      const dir = new THREE.Vector3().subVectors(playerPos, this.position);
      const dist = dir.length();

      if (dist < 0.6) {
        this.collect();
        return;
      }

      dir.normalize();
      const speed = Math.min(18.0, 5.0 + this.age * 12.0);
      this.position.addScaledVector(dir, speed * dt);
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += dt * 3.0;
    this.mesh.rotation.x += dt * 2.0;
  }

  collect() {
    this.isCollected = true;
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
