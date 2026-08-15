import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * ScarabEnemy: Four/six-legged scout machine of The Lattice.
 * Features red eye telegraphs, rapid scuttling pursuit, and electric melee strikes.
 */
export class ScarabEnemy extends Enemy {
  constructor(scene, gltfModel, config = {}) {
    super(scene, {
      id: config.id || 'Scarab',
      maxHealth: config.maxHealth || 60,
      radius: 0.85,
      position: config.position
    });

    this.isFinalScarab = config.isFinalScarab || false;
    this.speed = 5.2;
    this.state = 'idle'; // idle | alert | chase | attack | stagger | dead
    this.detectionRange = 16.0;
    this.attackRange = 1.9;
    this.attackCooldown = 0;
    this.alertTimer = 0;
    this.staggerTimer = 0;
    this.walkCycle = 0;

    this.originalMaterials = new Map();
    this.hitFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.initModel(gltfModel);
  }

  initModel(gltfModel) {
    if (gltfModel) {
      this.model = gltfModel.clone(true);
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          this.originalMaterials.set(child.uuid, child.material);
          if (child.name === 'SensorEye') {
            this.eyeMesh = child;
          }
        }
      });
      this.group.add(this.model);
    }
  }

  handleDamaged(damage, damageType, hitPoint, knockbackDir, knockbackForce) {
    // Flash white for hit-stop visual response
    this.triggerHitFlash();

    if (knockbackDir && knockbackForce > 0) {
      this.position.addScaledVector(knockbackDir, knockbackForce * 0.4);
      this.group.position.copy(this.position);
    }

    this.staggerTimer = 0.08;
    if (this.state === 'idle') {
      this.state = 'chase';
    }
  }

  triggerHitFlash() {
    if (!this.model) return;
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.material = this.hitFlashMat;
      }
    });

    setTimeout(() => {
      if (!this.isDead && this.model) {
        this.model.traverse((child) => {
          if (child.isMesh && this.originalMaterials.has(child.uuid)) {
            child.material = this.originalMaterials.get(child.uuid);
          }
        });
      }
    }, 60);
  }

  handleKilled(damageType, hitPoint) {
    super.handleKilled(damageType, hitPoint);

    if (this.onDeathCallback) {
      this.onDeathCallback(this);
    }
  }

  update(dt, playerPos) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.staggerTimer > 0) {
      this.staggerTimer -= dt;
      return;
    }

    if (!playerPos) return;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    if (this.state === 'idle') {
      if (distToPlayer <= this.detectionRange) {
        this.state = 'alert';
        this.alertTimer = 0.35; // Brief telegraph
        if (this.eyeMesh) {
          this.eyeMesh.scale.set(1.4, 1.4, 1.4);
        }
      }
    } else if (this.state === 'alert') {
      this.alertTimer -= dt;
      // Face player
      const yaw = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = yaw;

      if (this.alertTimer <= 0) {
        this.state = 'chase';
        if (this.eyeMesh) this.eyeMesh.scale.set(1.0, 1.0, 1.0);
      }
    } else if (this.state === 'chase') {
      const yaw = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = yaw;

      if (distToPlayer <= this.attackRange && this.attackCooldown <= 0) {
        // Strike!
        this.state = 'attack';
        this.attackCooldown = 1.4;
      } else if (distToPlayer > this.attackRange) {
        // Move towards player
        toPlayer.normalize();
        this.position.addScaledVector(toPlayer, this.speed * dt);
        this.group.position.copy(this.position);

        // Procedural leg / body scuttle bob
        this.walkCycle += dt * 14.0;
        if (this.model) {
          this.model.position.y = Math.sin(this.walkCycle) * 0.05;
          this.model.rotation.z = Math.cos(this.walkCycle * 0.5) * 0.04;
        }
      }
    } else if (this.state === 'attack') {
      // Short lunge strike recovery
      if (this.attackCooldown < 1.0) {
        this.state = 'chase';
      }
    }
  }
}
