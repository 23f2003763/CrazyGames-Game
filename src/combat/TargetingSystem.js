import * as THREE from 'three';

/**
 * TargetingSystem: Intelligent auto-aim, cursor attraction, and lock-on targeting.
 */
export class TargetingSystem {
  constructor(scene, camera, player) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;

    this.maxRange = 24.0;
    this.cursorAttractionPx = 150.0;
    this.lockedTarget = null;

    this.createLockRing();
  }

  createLockRing() {
    const geo = new THREE.RingGeometry(0.55, 0.7, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.lockRing = new THREE.Mesh(geo, mat);
    this.lockRing.visible = false;
    this.scene.add(this.lockRing);
  }

  findBestTarget(candidateTargets, mouseVec2) {
    if (!candidateTargets || candidateTargets.length === 0) {
      this.clearLock();
      return null;
    }

    const mousePx = new THREE.Vector2(
      (mouseVec2.x * 0.5 + 0.5) * window.innerWidth,
      (-mouseVec2.y * 0.5 + 0.5) * window.innerHeight
    );

    let bestTarget = null;
    let minScreenDist = this.cursorAttractionPx;

    const pPos = this.player.position;

    for (const target of candidateTargets) {
      if (!target.damageable || target.damageable.isDead || target.damageable.faction === 'player') {
        continue;
      }

      const tPos = target.position;
      const worldDist = pPos.distanceTo(tPos);
      if (worldDist > this.maxRange) continue;

      // Project target to screen
      const screenPos = tPos.clone().add(new THREE.Vector3(0, 0.5, 0)).project(this.camera);
      if (screenPos.z > 1.0) continue; // Behind camera

      const targetPx = new THREE.Vector2(
        (screenPos.x * 0.5 + 0.5) * window.innerWidth,
        (-screenPos.y * 0.5 + 0.5) * window.innerHeight
      );

      const screenDist = mousePx.distanceTo(targetPx);
      if (screenDist < minScreenDist) {
        minScreenDist = screenDist;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      this.lockedTarget = bestTarget;
      this.lockRing.visible = true;
      this.lockRing.position.set(bestTarget.position.x, 0.06, bestTarget.position.z);
      this.lockRing.rotation.y += 0.05;
      return bestTarget;
    }

    this.clearLock();
    return null;
  }

  clearLock() {
    this.lockedTarget = null;
    this.lockRing.visible = false;
  }

  update(dt) {
    if (this.lockedTarget) {
      if (this.lockedTarget.damageable && this.lockedTarget.damageable.isDead) {
        this.clearLock();
      } else {
        this.lockRing.position.set(this.lockedTarget.position.x, 0.06, this.lockedTarget.position.z);
        this.lockRing.rotation.y += dt * 3.0;
      }
    }
  }
}
