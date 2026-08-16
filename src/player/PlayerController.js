import * as THREE from 'three';
import { inputRouter } from '../input/InputRouter.js';

function dampAlpha(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

/**
 * PlayerController: Rebuilt for responsive camera-relative movement,
 * substepped swept collision resolution, buffered dodge, and F4 diagnostic telemetry.
 */
export class PlayerController {
  constructor(player, cameraController, collisionSystem, walkableSurfaceSystem) {
    this.player = player;
    this.cameraController = cameraController;
    this.collisionSystem = collisionSystem;
    this.walkableSurfaceSystem = walkableSurfaceSystem;

    // Movement Parameters
    this.walkSpeed = 5.2;
    this.sprintSpeed = 7.6;
    this.accelRate = 14.0;
    this.decelRate = 18.0;

    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.lastNonZeroMoveDir = new THREE.Vector3(0, 0, 1);
    this.facingDirection = new THREE.Vector3(0, 0, 1);
    this.targetRotation = 0;
    this.hasFacingOverride = false;
    this.state = 'idle'; // idle | walk | sprint | dodge

    // Dodge Parameters
    this.isDodging = false;
    this.dodgeDuration = 0.32;
    this.dodgeDistance = 3.0;
    this.dodgeSpeed = this.dodgeDistance / this.dodgeDuration; // ~9.4 m/s
    this.dodgeCooldown = 0.55;
    this.dodgeTimer = 0;
    this.dodgeCooldownTimer = 0;
    this.dodgeBufferTimer = 0;
    this.dodgeDir = new THREE.Vector3();

    // Height & Surface tracking
    this.currentGroundY = 0;

    // F4 Movement Diagnostics
    this.diagMode = false;
    this.createDiagnosticOverlay();

    // Input Tracking
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.bindInputs();
  }

  createDiagnosticOverlay() {
    this.diagEl = document.createElement('div');
    this.diagEl.id = 'movement-diag-card';
    this.diagEl.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(10, 16, 22, 0.94);
      border: 1px solid #00f0ff;
      border-radius: 6px;
      padding: 10px 16px;
      color: #00f0ff;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.5;
      z-index: 5000;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(this.diagEl);
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.keys.w = true;
      if (e.code === 'KeyS') this.keys.s = true;
      if (e.code === 'KeyA') this.keys.a = true;
      if (e.code === 'KeyD') this.keys.d = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.shift = true;

      // Space Dodge (buffered)
      if (e.code === 'Space') {
        if (inputRouter.canMove()) {
          this.requestDodge();
        }
      }

      // F4 Movement Diagnostic Toggle
      if (e.code === 'F4') {
        this.diagMode = !this.diagMode;
        if (this.collisionSystem) {
          this.collisionSystem.collisionEnabled = !this.collisionSystem.collisionEnabled;
        }
        this.diagEl.style.display = this.diagMode ? 'block' : 'none';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.keys.w = false;
      if (e.code === 'KeyS') this.keys.s = false;
      if (e.code === 'KeyA') this.keys.a = false;
      if (e.code === 'KeyD') this.keys.d = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.shift = false;
    });
  }

  requestDodge() {
    if (this.isDodging) return;

    if (this.dodgeCooldownTimer <= 0) {
      this.executeDodge();
    } else if (this.dodgeCooldownTimer <= 0.14) {
      // Buffer dodge input for execution upon cooldown ready
      this.dodgeBufferTimer = 0.15;
    }
  }

  executeDodge() {
    this.isDodging = true;
    this.dodgeTimer = 0;
    this.dodgeCooldownTimer = this.dodgeCooldown;
    this.dodgeBufferTimer = 0;
    this.state = 'dodge';

    if (this.moveDirection.lengthSq() > 0.01) {
      this.dodgeDir.copy(this.moveDirection).normalize();
    } else if (this.lastNonZeroMoveDir.lengthSq() > 0.01) {
      this.dodgeDir.copy(this.lastNonZeroMoveDir).normalize();
    } else {
      this.player.getWorldDirection(this.dodgeDir);
      this.dodgeDir.y = 0;
      this.dodgeDir.normalize();
    }
  }

  update(dt) {
    const moveDt = Math.min(dt, 1 / 30);

    // Update Timers
    if (this.dodgeCooldownTimer > 0) {
      this.dodgeCooldownTimer -= moveDt;
      if (this.dodgeCooldownTimer <= 0 && this.dodgeBufferTimer > 0) {
        this.executeDodge();
      }
    }
    if (this.dodgeBufferTimer > 0) {
      this.dodgeBufferTimer -= moveDt;
    }

    if (this.isDodging) {
      this.updateDodge(moveDt);
    } else {
      this.updateLocomotion(moveDt);
    }

    this.updateElevation(moveDt);
    this.updateDiagnostics();
  }

  updateLocomotion(dt) {
    // 1. Calculate Camera-Relative Basis
    const cam = this.cameraController.camera;
    const camForward = new THREE.Vector3();
    cam.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    // 2. Map Inputs (W = +camForward, S = -camForward, D = +camRight, A = -camRight)
    const inputVec = new THREE.Vector3();
    if (this.keys.w) inputVec.add(camForward);
    if (this.keys.s) inputVec.sub(camForward);
    if (this.keys.d) inputVec.add(camRight);
    if (this.keys.a) inputVec.sub(camRight);

    const hasInput = inputVec.lengthSq() > 0.01;
    if (hasInput) {
      inputVec.normalize();
      this.moveDirection.copy(inputVec);
      this.lastNonZeroMoveDir.copy(inputVec);

      if (!this.hasFacingOverride) {
        this.targetRotation = Math.atan2(-inputVec.x, -inputVec.z);
      }

      const targetSpeed = this.keys.shift ? this.sprintSpeed : this.walkSpeed;
      this.state = this.keys.shift ? 'sprint' : 'walk';

      const targetVelocity = inputVec.clone().multiplyScalar(targetSpeed);
      const alpha = dampAlpha(this.accelRate, dt);
      this.velocity.lerp(targetVelocity, alpha);
    } else {
      this.moveDirection.set(0, 0, 0);
      this.state = 'idle';
      const alpha = dampAlpha(this.decelRate, dt);
      this.velocity.lerp(new THREE.Vector3(), alpha);
    }

    // 3. Move with Swept Substepping
    const displacement = this.velocity.clone().multiplyScalar(dt);
    if (this.collisionSystem && displacement.lengthSq() > 0.00001) {
      const colRes = this.collisionSystem.moveCharacter(this.player.position, displacement, 0.40);
      if (colRes.blockedX) this.velocity.x *= 0.1;
      if (colRes.blockedZ) this.velocity.z *= 0.1;
      this.lastBlockedX = colRes.blockedX;
      this.lastBlockedZ = colRes.blockedZ;
    } else {
      this.player.position.add(displacement);
    }

    this.updateRotation(dt * 14.0);
  }

  updateDodge(dt) {
    this.dodgeTimer += dt;
    const progress = Math.min(1.0, this.dodgeTimer / this.dodgeDuration);
    
    // Ease-out speed curve
    const speedMultiplier = (1.0 - progress) * 1.5;
    const dodgeVel = this.dodgeDir.clone().multiplyScalar(this.dodgeSpeed * speedMultiplier);
    const displacement = dodgeVel.multiplyScalar(dt);

    if (this.collisionSystem) {
      this.collisionSystem.moveCharacter(this.player.position, displacement, 0.40);
    } else {
      this.player.position.add(displacement);
    }

    this.targetRotation = Math.atan2(-this.dodgeDir.x, -this.dodgeDir.z);
    this.updateRotation(dt * 18.0);

    if (this.dodgeTimer >= this.dodgeDuration) {
      this.isDodging = false;
      this.velocity.copy(this.dodgeDir).multiplyScalar(this.walkSpeed * 0.5);
    }
  }

  updateElevation(dt) {
    let targetGroundY = 0;
    if (this.walkableSurfaceSystem) {
      targetGroundY = this.walkableSurfaceSystem.sampleHeight(
        this.player.position.x, 
        this.player.position.z, 
        this.player.position.y
      );
    }

    if (this.currentGroundY === undefined || Number.isNaN(this.currentGroundY)) {
      this.currentGroundY = targetGroundY;
    }

    const deltaY = targetGroundY - this.currentGroundY;
    if (Math.abs(deltaY) < 0.30) {
      this.currentGroundY += deltaY * Math.min(1.0, 16.0 * dt);
    } else {
      this.currentGroundY = targetGroundY;
    }

    this.player.position.y = this.currentGroundY;
  }

  setFacingOverride(dir) {
    if (dir && dir.lengthSq() > 0.001) {
      this.hasFacingOverride = true;
      this.targetRotation = Math.atan2(-dir.x, -dir.z);
    }
  }

  clearFacingOverride() {
    this.hasFacingOverride = false;
  }

  updateRotation(speed) {
    let currentRot = this.player.rotation.y;
    let diff = this.targetRotation - currentRot;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.player.rotation.y += diff * Math.min(1.0, speed);
  }

  updateDiagnostics() {
    if (!this.diagMode || !this.diagEl) return;
    const speed = this.velocity.length().toFixed(2);
    this.diagEl.innerHTML = `
      <div style="font-weight:bold; color:#30d158;">[F4] MOVEMENT DIAGNOSTICS</div>
      <div>Collision: ${this.collisionSystem?.collisionEnabled ? '<span style="color:#30d158">ON</span>' : '<span style="color:#ff3b30">OFF</span>'}</div>
      <div>Speed: ${speed} m/s | State: ${this.state}</div>
      <div>Pos: (${this.player.position.x.toFixed(1)}, ${this.player.position.z.toFixed(1)}, Y:${this.player.position.y.toFixed(2)})</div>
      <div>Blocked: X=${this.lastBlockedX ? 'YES' : 'NO'} Z=${this.lastBlockedZ ? 'YES' : 'NO'}</div>
    `;
  }
}
