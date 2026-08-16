import * as THREE from 'three';

/**
 * StormcoreHammer: Original sci-fi Arc weapon.
 * Holds LMB to build charge, releases instant jagged lightning directly to target core.
 */
export class StormcoreHammer {
  constructor(scene, audioSystem, combatSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.id = 'stormcore_hammer';
    this.name = 'Stormcore Hammer';

    this.isCharging = false;
    this.chargeTime = 0;
    this.maxChargeTime = 1.25;

    this.activeBeams = [];
    this.chargeSparks = [];

    this.createChargeSparksMesh();
  }

  createChargeSparksMesh() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(18 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.chargePoints = new THREE.Points(geo, mat);
    this.chargePoints.visible = false;
    this.scene.add(this.chargePoints);
  }

  startCharging() {
    this.isCharging = true;
    this.chargeTime = 0;
    this.chargePoints.visible = true;
  }

  updateCharge(dt, hammerWorldPos) {
    if (!this.isCharging) return;

    this.chargeTime = Math.min(this.maxChargeTime, this.chargeTime + dt);
    const chargeNorm = this.chargeTime / this.maxChargeTime;

    // Update charge spark particles orbiting the hammer head
    if (hammerWorldPos && this.chargePoints) {
      this.chargePoints.position.copy(hammerWorldPos);
      const posAttr = this.chargePoints.geometry.attributes.position;
      const count = 18;
      const radius = 0.15 + chargeNorm * 0.25;

      for (let i = 0; i < count; i++) {
        const theta = (Date.now() * 0.012) + (i * (Math.PI * 2 / count));
        const phi = Math.sin(Date.now() * 0.008 + i) * Math.PI;
        posAttr.setXYZ(
          i,
          Math.sin(phi) * Math.cos(theta) * radius,
          Math.cos(phi) * radius,
          Math.sin(phi) * Math.sin(theta) * radius
        );
      }
      posAttr.needsUpdate = true;
      this.chargePoints.material.color.setHex(chargeNorm > 0.8 ? 0xffffff : 0x00f0ff);
      this.chargePoints.material.size = 0.15 + chargeNorm * 0.15;
    }
  }

  discharge(hammerWorldPos, target, candidateTargets) {
    if (!this.isCharging) return;
    this.isCharging = false;
    this.chargePoints.visible = false;

    const chargeNorm = this.chargeTime / this.maxChargeTime;
    let baseDamage = 24.0;
    let chainCount = 0;
    let knockbackForce = 1.2;

    if (chargeNorm >= 0.8) {
      // Full Charge
      baseDamage = 85.0;
      chainCount = 2;
      knockbackForce = 4.5;
    } else if (chargeNorm >= 0.35) {
      // Medium Charge
      baseDamage = 48.0;
      chainCount = 1;
      knockbackForce = 2.8;
    }

    if (!target || !target.damageable || target.damageable.isDead) return;

    // 1. Direct Instant Lightning Beam (Hammer -> Target Core)
    const targetCorePos = target.position.clone().add(new THREE.Vector3(0, 0.45, 0));
    this.spawnLightningBeam(hammerWorldPos, targetCorePos, true);

    // Apply Damage and Electrification
    target.damageable.takeDamage(baseDamage, 'arc', targetCorePos, null, knockbackForce);
    if (target.electrify) {
      target.electrify(0.35);
    }

    if (this.combatSystem) {
      this.combatSystem.spawnHitSparks(targetCorePos);
    }

    if (this.audioSystem) {
      this.audioSystem.playVoltCasterFire();
    }

    // 2. Branching Chain Lightning to Nearby Enemies
    if (chainCount > 0 && candidateTargets) {
      this.triggerChains(target, targetCorePos, candidateTargets, chainCount, baseDamage * 0.6);
    }

    this.chargeTime = 0;
  }

  triggerChains(sourceTarget, sourcePos, candidateTargets, maxChains, chainDamage) {
    let chained = 0;
    for (const other of candidateTargets) {
      if (other === sourceTarget || !other.damageable || other.damageable.isDead || other.damageable.faction === 'player') {
        continue;
      }

      const dist = sourcePos.distanceTo(other.position);
      if (dist <= 5.5) {
        const otherCorePos = other.position.clone().add(new THREE.Vector3(0, 0.45, 0));
        this.spawnLightningBeam(sourcePos, otherCorePos, false);
        other.damageable.takeDamage(chainDamage, 'arc_chain', otherCorePos, null, 1.8);
        if (other.electrify) other.electrify(0.3);

        chained++;
        if (chained >= maxChains) break;
      }
    }
    if (chained > 0 && this.audioSystem) {
      this.audioSystem.playChainLightning();
    }
  }

  spawnLightningBeam(startPos, endPos, isPrimary = true) {
    const group = new THREE.Group();
    const segments = 10;
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const points = [startPos.clone()];

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const pt = startPos.clone().addScaledVector(dir, t);
      const jitter = (isPrimary ? 0.35 : 0.25);
      pt.x += (Math.random() - 0.5) * jitter;
      pt.y += (Math.random() - 0.5) * jitter;
      pt.z += (Math.random() - 0.5) * jitter;
      points.push(pt);
    }
    points.push(endPos.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    // White-hot core line
    const matCore = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    group.add(new THREE.Line(geo, matCore));

    // Cyan additive energy glow line
    const matGlow = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      linewidth: 3
    });
    group.add(new THREE.Line(geo.clone(), matGlow));

    this.scene.add(group);
    this.activeBeams.push({ group, lifetime: 0.18 });
  }

  update(dt, hammerWorldPos) {
    if (this.isCharging) {
      this.updateCharge(dt, hammerWorldPos);
    }

    // Update active discharge beams
    for (let i = this.activeBeams.length - 1; i >= 0; i--) {
      const beam = this.activeBeams[i];
      beam.lifetime -= dt;
      if (beam.lifetime <= 0) {
        this.scene.remove(beam.group);
        beam.group.traverse(c => { if (c.geometry) c.geometry.dispose(); });
        this.activeBeams.splice(i, 1);
      } else {
        const alpha = beam.lifetime / 0.18;
        beam.group.traverse(c => { if (c.material) c.material.opacity = alpha; });
      }
    }
  }
}
