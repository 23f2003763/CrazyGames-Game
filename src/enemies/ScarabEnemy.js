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
    this.elecGroup = new THREE.Group();

    // 1. Arc Sparks (Points)
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(16 * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.arcSparks = new THREE.Points(sparkGeo, sparkMat);
    this.elecGroup.add(this.arcSparks);

    // 2. Crawling Line Segments
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(10 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, linewidth: 2
    });
    this.crawlLines = new THREE.LineSegments(lineGeo, lineMat);
    this.elecGroup.add(this.crawlLines);

    this.elecGroup.visible = false;
    this.group.add(this.elecGroup);
  }

  electrify(duration = 0.35) {
    this.electrifiedTimer = duration;
    this.elecGroup.visible = true;
    
    // Small metal fragments jump (2-3 tiny boxes)
    const fragCount = 2 + Math.floor(Math.random() * 2);
    const fragGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const fragMat = new THREE.MeshStandardMaterial({ color: 0x8b949e, roughness: 0.6, metalness: 0.8 });
    for (let i = 0; i < fragCount; i++) {
      const mesh = new THREE.Mesh(fragGeo, fragMat);
      mesh.position.copy(this.position).add(new THREE.Vector3(0, 0.4, 0));
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.0,
        Math.random() * 2.5 + 1.0,
        (Math.random() - 0.5) * 3.0
      );
      let life = 0.4;
      const animFrag = () => {
        life -= 0.03;
        vel.y -= 9.8 * 0.03;
        mesh.position.addScaledVector(vel, 0.03);
        mesh.rotation.x += 0.3;
        mesh.rotation.y += 0.3;
        if (life > 0) requestAnimationFrame(animFrag);
        else { this.scene.remove(mesh); mesh.geometry.dispose(); }
      };
      animFrag();
    }
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
      if (this.elecGroup) {
        // Sparks
        const posAttr = this.arcSparks.geometry.attributes.position;
        for (let i = 0; i < 16; i++) {
          posAttr.setXYZ(i, (Math.random() - 0.5) * 0.9, Math.random() * 0.6 + 0.1, (Math.random() - 0.5) * 0.9);
        }
        posAttr.needsUpdate = true;
        
        // Crawling lines
        const lineAttr = this.crawlLines.geometry.attributes.position;
        for (let i = 0; i < 10; i++) {
          lineAttr.setXYZ(i, (Math.random() - 0.5) * 0.9, Math.random() * 0.6 + 0.1, (Math.random() - 0.5) * 0.9);
        }
        lineAttr.needsUpdate = true;
        
        // Model Jitter & Lean
        if (this.model) {
          this.model.position.x = (Math.random() - 0.5) * 0.1;
          this.model.position.z = (Math.random() - 0.5) * 0.1;
          this.model.rotation.z = (Math.random() - 0.5) * 0.2;
        }

        // Eye Flicker
        if (this.eyeMesh && this.originalMaterials.has(this.eyeMesh.uuid)) {
          const eyeMat = this.originalMaterials.get(this.eyeMesh.uuid);
          eyeMat.emissiveIntensity = Math.random() > 0.5 ? 0 : 2.0;
        }
      }
      
      if (this.electrifiedTimer <= 0) {
        this.elecGroup.visible = false;
        if (this.model) {
          this.model.position.set(0, 0, 0);
          this.model.rotation.z = 0;
        }
        if (this.eyeMesh && this.originalMaterials.has(this.eyeMesh.uuid)) {
          this.originalMaterials.get(this.eyeMesh.uuid).emissiveIntensity = 1.0;
        }
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
