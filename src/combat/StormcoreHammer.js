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
    this.chargeGroup = new THREE.Group();
    this.scene.add(this.chargeGroup);

    // 1. Sparks
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(18 * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00f0ff, size: 0.18, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    });
    this.chargePoints = new THREE.Points(sparkGeo, sparkMat);
    this.chargeGroup.add(this.chargePoints);

    // 2. Wrap lines (electricity wrapping around hammer)
    const wrapGeo = new THREE.BufferGeometry();
    const wrapPos = new Float32Array(40 * 3);
    wrapGeo.setAttribute('position', new THREE.BufferAttribute(wrapPos, 3));
    const wrapMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, linewidth: 2
    });
    this.wrapLines = new THREE.Line(wrapGeo, wrapMat);
    this.chargeGroup.add(this.wrapLines);

    // 3. Corona (expanding glow sphere)
    const coronaGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xe0ffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.coronaSphere = new THREE.Mesh(coronaGeo, coronaMat);
    this.chargeGroup.add(this.coronaSphere);

    this.chargeGroup.visible = false;
  }

  startCharging() {
    this.isCharging = true;
    this.chargeTime = 0;
    this.chargeGroup.visible = true;
  }

  updateCharge(dt, hammerWorldPos) {
    if (!this.isCharging) return;

    this.chargeTime = Math.min(this.maxChargeTime, this.chargeTime + dt);
    const chargeNorm = this.chargeTime / this.maxChargeTime;

    if (hammerWorldPos && this.chargeGroup) {
      this.chargeGroup.position.copy(hammerWorldPos);

      // 0-0.3s: small sparks
      if (this.chargeTime > 0) {
        this.chargePoints.visible = true;
        const posAttr = this.chargePoints.geometry.attributes.position;
        const count = 18;
        const radius = 0.15 + chargeNorm * 0.25;
        for (let i = 0; i < count; i++) {
          const theta = (Date.now() * 0.012) + (i * (Math.PI * 2 / count));
          const phi = Math.sin(Date.now() * 0.008 + i) * Math.PI;
          posAttr.setXYZ(i, Math.sin(phi) * Math.cos(theta) * radius, Math.cos(phi) * radius, Math.sin(phi) * Math.sin(theta) * radius);
        }
        posAttr.needsUpdate = true;
        this.chargePoints.material.color.setHex(chargeNorm > 0.8 ? 0xffffff : 0x00f0ff);
        this.chargePoints.material.size = 0.15 + chargeNorm * 0.15;
      }

      // 0.3-0.7s: electricity wraps
      if (this.chargeTime > 0.3) {
        this.wrapLines.material.opacity = Math.min((this.chargeTime - 0.3) * 2.5, 0.8);
        const wrapAttr = this.wrapLines.geometry.attributes.position;
        const wrapRadius = 0.4;
        for (let i = 0; i < 40; i++) {
          const t = i / 40;
          const jitterX = (Math.random() - 0.5) * 0.15;
          const jitterY = (Math.random() - 0.5) * 0.15;
          const jitterZ = (Math.random() - 0.5) * 0.15;
          const angle = t * Math.PI * 4 + Date.now() * 0.02;
          wrapAttr.setXYZ(i, Math.cos(angle) * wrapRadius + jitterX, (t - 0.5) * 1.5 + jitterY, Math.sin(angle) * wrapRadius + jitterZ);
        }
        wrapAttr.needsUpdate = true;
      } else {
        this.wrapLines.material.opacity = 0;
      }

      // 0.7-1.2s: corona
      if (this.chargeTime > 0.7) {
        const coronaProg = Math.min((this.chargeTime - 0.7) * 2.0, 1.0);
        this.coronaSphere.material.opacity = coronaProg * 0.6;
        this.coronaSphere.scale.setScalar(0.5 + coronaProg * 1.2);
        
        // Ground arcs at full charge
        if (chargeNorm >= 0.95 && Math.random() < 0.1) {
          const groundHit = hammerWorldPos.clone();
          groundHit.y = 0; // simple ground assumption
          groundHit.x += (Math.random() - 0.5) * 2.0;
          groundHit.z += (Math.random() - 0.5) * 2.0;
          this.spawnLightningBeam(hammerWorldPos, groundHit, false, 0.08);
        }
      } else {
        this.coronaSphere.material.opacity = 0;
      }
    }
  }

  discharge(hammerWorldPos, target, candidateTargets) {
    if (!this.isCharging) return;
    this.isCharging = false;
    this.chargeGroup.visible = false;

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

  spawnLightningBeam(startPos, endPos, isPrimary = true, customLifetime = 0.12) {
    const group = new THREE.Group();
    const segments = isPrimary ? 12 : 8;
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const points = [startPos.clone()];

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const pt = startPos.clone().addScaledVector(dir, t);
      const jitter = (isPrimary ? 0.4 : 0.2);
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
      linewidth: 3,
      blending: THREE.AdditiveBlending
    });
    group.add(new THREE.Line(geo.clone(), matGlow));
    
    // Add 1 or 2 small branches
    if (isPrimary) {
      const branches = 2;
      for (let b = 0; b < branches; b++) {
        const branchStart = points[Math.floor(points.length / 2) + b];
        const branchEnd = branchStart.clone();
        branchEnd.x += (Math.random() - 0.5) * 1.5;
        branchEnd.y += (Math.random() - 0.5) * 1.5;
        branchEnd.z += (Math.random() - 0.5) * 1.5;
        const branchGeo = new THREE.BufferGeometry().setFromPoints([branchStart, branchEnd]);
        group.add(new THREE.Line(branchGeo, matGlow.clone()));
      }
    }

    this.scene.add(group);
    this.activeBeams.push({ group, lifetime: customLifetime, maxLifetime: customLifetime });
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
        const alpha = beam.lifetime / beam.maxLifetime;
        beam.group.traverse(c => { if (c.material) c.material.opacity = alpha; });
      }
    }
  }
}
