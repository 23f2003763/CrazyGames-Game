import * as THREE from 'three';
import { EnemyHealth } from './EnemyHealth.js';

/**
 * Enemy: Base class for machine ecosystem enemies.
 */
export class Enemy {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.position = config.position ? config.position.clone() : new THREE.Vector3();
    this.radius = config.radius || 0.8;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.name = `Enemy_${config.id || 'Unit'}`;
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.damageable = new EnemyHealth({
      maxHealth: config.maxHealth || 50,
      onDamaged: (dmg, type, pt, kDir, kForce) => this.handleDamaged(dmg, type, pt, kDir, kForce),
      onKilled: (type, pt) => this.handleKilled(type, pt)
    });
  }

  handleDamaged(damage, damageType, hitPoint, knockbackDir, knockbackForce) {
    // Override in subclass
  }

  handleKilled(damageType, hitPoint) {
    this.isDead = true;
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  update(dt, playerPos) {
    // Override in subclass
  }
}
