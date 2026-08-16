import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * ScarabEnemy: Four-legged reconnaissance machine of The Lattice.
 * Features red eye telegraphs, rapid scuttling pursuit, electrification VFX,
 * and satisfying mechanical debris destruction.
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
    this.electrifiedTimer = 0;
    this.walkCycle = 0;

    this.originalMaterials = new Map();
    this.hitFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.electrifiedMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });

    this.initModel(gltfModel);
    this.createElectrificationVFX();
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

  createElectrificationVFX() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(12 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.16,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.arcSparks = new THREE.Points(geo, mat);
    this.arcSparks.visible = false;
    this.group.add(this.arcSparks);
  }

  electrify(duration = 0.35) {
    this.electrifiedTimer = duration;
    this.arcSparks.visible = true;
  }

  handleDamaged(damage, damageType, hitPoint, knockbackDir, knockbackForce) {
    this.triggerHitFlash();

    if (knockbackDir && knockbackForce > 0) {
      this.position.addScaledVector(knockbackDir, knockbackForce * 0.4);
      this.group.position.copy(this.position);
    }

    this.staggerTimer = 0.10;
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
    this.spawnDebrisExplosion();
    super.handleKilled(damageType, hitPoint);

    if (this.onDeathCallback) {
      this.onDeathCallback(this);
    }
  }

  spawnDebrisExplosion() {
    // Spawn 5-6 mechanical shell shards with outward impulse
    const shardCount = 6;
    const shardGeo = new THREE.BoxGeometry(0.25, 0.12, 0.2);
    const shardMat = new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.6, metalness: 0.8 });

    for (let i = 0; i < shardCount; i++) {
      const mesh = new THREE.Mesh(shardGeo, shardMat);
      mesh.position.copy(this.position).add(new THREE.Vector3(0, 0.3, 0));
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5.0,
        Math.random() * 4.0 + 2.0,
        (Math.random() - 0.5) * 5.0
      );

      let life = 0.45;
      const animateDebris = () => {
        life -= 0.03;
        vel.y -= 9.8 * 0.03;
        mesh.position.addScaledVector(vel, 0.03);
        mesh.rotation.x += 0.2;
        mesh.rotation.y += 0.2;
        if (life > 0) {
          requestAnimationFrame(animateDebris);
        } else {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
        }
      };
      animateDebris();
    }
  }

  update(dt, playerPos) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.electrifiedTimer > 0) {
      this.electrifiedTimer -= dt;
      if (this.arcSparks) {
        const posAttr = this.arcSparks.geometry.attributes.position;
        for (let i = 0; i < 12; i++) {
          posAttr.setXYZ(
            i,
            (Math.random() - 0.5) * 0.8,
            Math.random() * 0.5 + 0.1,
            (Math.random() - 0.5) * 0.8
          );
        }
        posAttr.needsUpdate = true;
      }
      if (this.electrifiedTimer <= 0) {
        this.arcSparks.visible = false;
      }
    }

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
        this.alertTimer = 0.45; // Telegraph red eye
        if (this.eyeMesh) this.eyeMesh.scale.set(1.5, 1.5, 1.5);
      }
    } else if (this.state === 'alert') {
      this.alertTimer -= dt;
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
        this.state = 'attack';
        this.attackCooldown = 1.4;
      } else if (distToPlayer > this.attackRange) {
        toPlayer.normalize();
        this.position.addScaledVector(toPlayer, this.speed * dt);
        this.group.position.copy(this.position);

        this.walkCycle += dt * 14.0;
        if (this.model) {
          this.model.position.y = Math.sin(this.walkCycle) * 0.05;
          this.model.rotation.z = Math.cos(this.walkCycle * 0.5) * 0.04;
        }
      }
    } else if (this.state === 'attack') {
      if (this.attackCooldown < 1.0) {
        this.state = 'chase';
      }
    }
  }
}
