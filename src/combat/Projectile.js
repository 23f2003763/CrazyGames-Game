import * as THREE from 'three';

/**
 * Projectile: High-speed Arc energy bolt with cyan core and electrical glow.
 */
export class Projectile {
  constructor(scene, config) {
    this.scene = scene;
    this.position = config.origin.clone();
    this.direction = config.direction.clone().normalize();
    this.speed = config.speed || 58.0; // 58m/s
    this.damage = config.damage || 26.0;
    this.faction = config.faction || 'player';
    this.maxDistance = config.maxDistance || 32.0;
    this.traveled = 0;
    this.isDead = false;
    this.sourceWeapon = config.sourceWeapon || null;

    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.direction);

    // 1. Bright white-cyan core bolt
    const coreGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.65, 6);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(coreMesh);

    // 2. Cyan additive energy sheath
    const sheathGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.75, 6);
    sheathGeo.rotateX(Math.PI / 2);
    const sheathMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const sheathMesh = new THREE.Mesh(sheathGeo, sheathMat);
    this.group.add(sheathMesh);

    this.scene.add(this.group);
  }

  update(dt, targets, onHitCallback) {
    if (this.isDead) return;

    const stepDist = this.speed * dt;
    const nextPos = this.position.clone().addScaledVector(this.direction, stepDist);

    // Raycast/sphere collision check against targets
    for (const target of targets) {
      if (!target.damageable || target.damageable.isDead || target.damageable.faction === this.faction) {
        continue;
      }

      const tPos = target.position;
      const targetRadius = target.radius || 0.85;
      const dist = new THREE.Line3(this.position, nextPos).closestPointToPoint(tPos, true, new THREE.Vector3()).distanceTo(tPos);

      if (dist <= targetRadius) {
        // Hit target!
        const hitPoint = nextPos.clone();
        const knockbackDir = this.direction.clone();
        target.damageable.takeDamage(this.damage, 'arc', hitPoint, knockbackDir, 1.6);

        if (onHitCallback) {
          onHitCallback(target, hitPoint, this.sourceWeapon);
        }

        this.destroy();
        return;
      }
    }

    this.position.copy(nextPos);
    this.traveled += stepDist;

    if (this.traveled >= this.maxDistance) {
      this.destroy();
    } else {
      this.group.position.copy(this.position);
    }
  }

  destroy() {
    this.isDead = true;
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
