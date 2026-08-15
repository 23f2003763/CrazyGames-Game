import * as THREE from 'three';

/**
 * CombatSystem: Global coordinator of projectiles, damageable targets, and hit effects.
 */
export class CombatSystem {
  constructor(scene, audioSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem;

    this.projectiles = [];
    this.targets = [];
    this.sparkPool = [];

    this.createSparkMaterials();
  }

  createSparkMaterials() {
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkMat = new THREE.PointsMaterial({
      color: 0x80f0ff,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
  }

  registerTarget(target) {
    // target must have: position (Vector3), radius (number), damageable (Damageable)
    if (!this.targets.includes(target)) {
      this.targets.push(target);
    }
  }

  unregisterTarget(target) {
    const idx = this.targets.indexOf(target);
    if (idx !== -1) {
      this.targets.splice(idx, 1);
    }
  }

  addProjectile(proj) {
    this.projectiles.push(proj);
  }

  spawnHitSparks(hitPoint) {
    const particleCount = 12;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = hitPoint.x;
      positions[i * 3 + 1] = hitPoint.y + 0.3;
      positions[i * 3 + 2] = hitPoint.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 4.0,
        Math.random() * 3.5 + 1.0,
        (Math.random() - 0.5) * 4.0
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, this.sparkMat.clone());
    this.scene.add(points);

    this.sparkPool.push({ points, velocities, lifetime: 0.25 });
  }

  update(dt) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.targets, (hitTarget, hitPoint, sourceWeapon) => {
        this.spawnHitSparks(hitPoint);
        if (this.audioSystem) {
          this.audioSystem.playMachineHit();
        }

        // Trigger chain lightning if applicable
        if (sourceWeapon && sourceWeapon.triggerChainLightning) {
          sourceWeapon.triggerChainLightning(hitTarget, hitPoint, this.targets);
        }
      });

      if (p.isDead) {
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Hit Sparks
    for (let i = this.sparkPool.length - 1; i >= 0; i--) {
      const spark = this.sparkPool[i];
      spark.lifetime -= dt;

      if (spark.lifetime <= 0) {
        this.scene.remove(spark.points);
        spark.points.geometry.dispose();
        this.sparkPool.splice(i, 1);
      } else {
        const posAttr = spark.points.geometry.attributes.position;
        for (let j = 0; j < spark.velocities.length; j++) {
          const vel = spark.velocities[j];
          vel.y -= 9.8 * dt; // Gravity
          posAttr.setXYZ(
            j,
            posAttr.getX(j) + vel.x * dt,
            posAttr.getY(j) + vel.y * dt,
            posAttr.getZ(j) + vel.z * dt
          );
        }
        posAttr.needsUpdate = true;
        spark.points.material.opacity = spark.lifetime / 0.25;
      }
    }
  }
}
