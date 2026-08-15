import * as THREE from 'three';

/**
 * Projectile: Fast luminous Arc energy bolt.
 */
export class Projectile {
  constructor(scene, config) {
    this.scene = scene;
    this.position = config.origin.clone();
    this.direction = config.direction.clone().normalize();
    this.speed = config.speed || 38.0;
    this.damage = config.damage || 25.0;
    this.faction = config.faction || 'player';
    this.maxDistance = config.maxDistance || 35.0;
    this.traveled = 0;
    this.isDead = false;
    this.sourceWeapon = config.sourceWeapon || null;

    this.createMesh();
  }

  createMesh() {
    const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6);
    geo.rotateX(Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.95
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.direction);
    this.scene.add(this.mesh);
  }

  update(dt, targets, onHitCallback) {
    if (this.isDead) return;

    const stepDist = this.speed * dt;
    const nextPos = this.position.clone().addScaledVector(this.direction, stepDist);

    // Collision check against candidate targets
    for (const target of targets) {
      if (!target.damageable || target.damageable.isDead || target.damageable.faction === this.faction) {
        continue;
      }

      const tPos = target.position;
      const targetRadius = target.radius || 0.8;
      const distToLine = new THREE.Line3(this.position, nextPos).closestPointToPoint(tPos, true, new THREE.Vector3()).distanceTo(tPos);

      if (distToLine <= targetRadius) {
        // Hit confirmed!
        const hitPoint = nextPos.clone();
        const knockbackDir = this.direction.clone();
        target.damageable.takeDamage(this.damage, 'arc', hitPoint, knockbackDir, 1.8);
        
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
      this.mesh.position.copy(this.position);
    }
  }

  destroy() {
    this.isDead = true;
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
