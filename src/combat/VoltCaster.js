import * as THREE from 'three';
import { Projectile } from './Projectile.js';

/**
 * VoltCaster: Signature Arc weapon.
 * Fast rate of fire, crisp muzzle flash, and signature chain lightning to nearby machine enemies.
 */
export class VoltCaster {
  constructor(scene, audioSystem, combatSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.id = 'volt_caster';
    this.name = 'Volt Caster';
    this.damage = 26.0;
    this.fireRate = 0.22; // 4.5 shots per second
    this.cooldown = 0;
    this.chainRange = 3.8;
    this.chainDamagePercent = 0.60;

    this.createChainVFXPool();
  }

  createChainVFXPool() {
    this.activeBolts = [];
    this.chainMat = new THREE.LineBasicMaterial({
      color: 0x80f0ff,
      linewidth: 2,
      transparent: true,
      opacity: 1.0
    });
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }

    // Update active chain lightning bolt durations
    for (let i = this.activeBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeBolts[i];
      bolt.lifetime -= dt;
      if (bolt.lifetime <= 0) {
        this.scene.remove(bolt.mesh);
        bolt.mesh.geometry.dispose();
        this.activeBolts.splice(i, 1);
      } else {
        bolt.mesh.material.opacity = bolt.lifetime / 0.12;
      }
    }
  }

  canFire() {
    return this.cooldown <= 0;
  }

  fire(originPos, aimDirection) {
    if (!this.canFire()) return null;

    this.cooldown = this.fireRate;

    // Spawn projectile
    const proj = new Projectile(this.scene, {
      origin: originPos.clone().add(new THREE.Vector3(0, 0.9, 0)),
      direction: aimDirection.clone(),
      speed: 40.0,
      damage: this.damage,
      faction: 'player',
      sourceWeapon: this
    });

    if (this.audioSystem) {
      this.audioSystem.playVoltCasterFire();
    }

    return proj;
  }

  triggerChainLightning(hitEntity, hitPosition, candidateTargets) {
    if (!candidateTargets || candidateTargets.length === 0) return;

    let nearest = null;
    let minDistance = this.chainRange;

    for (const target of candidateTargets) {
      if (target === hitEntity || !target.damageable || target.damageable.isDead || target.damageable.faction === 'player') {
        continue;
      }

      const dist = hitPosition.distanceTo(target.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = target;
      }
    }

    if (nearest) {
      // Chain hit!
      const chainDmg = this.damage * this.chainDamagePercent;
      nearest.damageable.takeDamage(chainDmg, 'arc_chain', nearest.position.clone(), null, 0.8);

      // Render branching electric bolt line
      this.spawnArcBoltMesh(hitPosition, nearest.position.clone().add(new THREE.Vector3(0, 0.5, 0)));

      if (this.audioSystem) {
        this.audioSystem.playChainLightning();
      }
    }
  }

  spawnArcBoltMesh(startPos, endPos) {
    const points = [];
    const segments = 6;
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const dist = dir.length();

    points.push(startPos.clone());
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const pt = startPos.clone().addScaledVector(dir, t);
      // Lateral lightning jitter
      pt.x += (Math.random() - 0.5) * 0.35;
      pt.y += (Math.random() - 0.5) * 0.35;
      pt.z += (Math.random() - 0.5) * 0.35;
      points.push(pt);
    }
    points.push(endPos.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mesh = new THREE.Line(geo, this.chainMat.clone());
    this.scene.add(mesh);

    this.activeBolts.push({ mesh, lifetime: 0.12 });
  }
}
