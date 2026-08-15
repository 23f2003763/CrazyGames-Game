import * as THREE from 'three';
import { Projectile } from './Projectile.js';

/**
 * VoltCaster: Signature Arc weapon.
 * Fast rate of fire, crisp muzzle flash, and signature branching chain lightning.
 */
export class VoltCaster {
  constructor(scene, audioSystem, combatSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.id = 'volt_caster';
    this.name = 'Volt Caster';
    this.damage = 26.0;
    this.fireRate = 0.20; // 5 shots/sec
    this.cooldown = 0;
    this.chainRange = 4.2;
    this.chainDamagePercent = 0.60;

    this.activeBolts = [];
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
        this.scene.remove(bolt.group);
        bolt.group.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
        });
        this.activeBolts.splice(i, 1);
      } else {
        const alpha = bolt.lifetime / 0.15;
        bolt.group.traverse((c) => {
          if (c.material) c.material.opacity = alpha;
        });
      }
    }
  }

  canFire() {
    return this.cooldown <= 0;
  }

  fire(muzzlePos, aimDirection) {
    if (!this.canFire()) return null;

    this.cooldown = this.fireRate;

    const proj = new Projectile(this.scene, {
      origin: muzzlePos,
      direction: aimDirection,
      speed: 58.0,
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
      const chainDmg = this.damage * this.chainDamagePercent;
      nearest.damageable.takeDamage(chainDmg, 'arc_chain', nearest.position.clone(), null, 0.8);

      this.spawnBranchingArcMesh(hitPosition, nearest.position.clone().add(new THREE.Vector3(0, 0.45, 0)));

      if (this.audioSystem) {
        this.audioSystem.playChainLightning();
      }
    }
  }

  spawnBranchingArcMesh(startPos, endPos) {
    const group = new THREE.Group();

    // 1. Main Jagged Branch (8-10 points)
    const points = [];
    const segments = 8;
    const dir = new THREE.Vector3().subVectors(endPos, startPos);

    points.push(startPos.clone());
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const pt = startPos.clone().addScaledVector(dir, t);
      pt.x += (Math.random() - 0.5) * 0.45;
      pt.y += (Math.random() - 0.5) * 0.45;
      pt.z += (Math.random() - 0.5) * 0.45;
      points.push(pt);
    }
    points.push(endPos.clone());

    const geoCore = new THREE.BufferGeometry().setFromPoints(points);
    const matCore = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    const lineCore = new THREE.Line(geoCore, matCore);
    group.add(lineCore);

    const matGlow = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, linewidth: 3 });
    const lineGlow = new THREE.Line(geoCore.clone(), matGlow);
    group.add(lineGlow);

    // 2. Secondary Offshoot Branch
    if (points.length >= 5) {
      const midPoint = points[3].clone();
      const offshootEnd = midPoint.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6, (Math.random() - 0.5) * 1.2));
      const geoBranch = new THREE.BufferGeometry().setFromPoints([midPoint, offshootEnd]);
      const lineBranch = new THREE.Line(geoBranch, matGlow.clone());
      group.add(lineBranch);
    }

    this.scene.add(group);
    this.activeBolts.push({ group, lifetime: 0.15 });
  }
}
