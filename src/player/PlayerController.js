import * as THREE from 'three';
import { getTerrainHeight } from '../world/MapData.js';

export class PlayerController {
  constructor(player, cameraController, collisionSystem) {
    this.player = player;
    this.cameraController = cameraController;
    this.collisionSystem = collisionSystem;
    
    // Input state
    this.keys = {
      w: false, a: false, s: false, d: false,
      shift: false, space: false
    };
    
    // Physics & Movement
    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.targetRotation = 0;
    
    // Speeds
    this.walkSpeed = 4.5;
    this.sprintSpeed = 8.5;
    this.acceleration = 40.0;
    this.friction = 15.0;
    
    // Dodge state
    this.isDodging = false;
    this.dodgeTime = 0;
    this.dodgeDuration = 0.4;
    this.dodgeSpeed = 15.0;
    this.dodgeDir = new THREE.Vector3();
    
    // Character state (idle, walk, sprint, dodge)
    this.state = 'idle';
    
    this.setupInputs();
  }
  
  setupInputs() {
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }
  
  handleKey(e, isDown) {
    // Only process gameplay inputs if not typing in a UI (optional safeguard)
    if (document.activeElement.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    
    if (key === 'w' || key === 'arrowup') this.keys.w = isDown;
    if (key === 's' || key === 'arrowdown') this.keys.s = isDown;
    if (key === 'a' || key === 'arrowleft') this.keys.a = isDown;
    if (key === 'd' || key === 'arrowright') this.keys.d = isDown;
    if (key === 'shift') this.keys.shift = isDown;
    
    if (key === ' ' && isDown && !this.keys.space) {
      this.keys.space = true;
      this.tryDodge();
    } else if (key === ' ' && !isDown) {
      this.keys.space = false;
    }
  }
  
  tryDodge() {
    if (!this.isDodging && this.moveDirection.lengthSq() > 0.1) {
      this.isDodging = true;
      this.dodgeTime = 0;
      this.dodgeDir.copy(this.moveDirection).normalize();
      this.state = 'dodge';
      
      // We will tell FX to emit a burst here from the main loop
    }
  }
  
  update(dt) {
    if (this.isDodging) {
      this.updateDodge(dt);
    } else {
      this.updateMovement(dt);
    }
    
    // Apply collision
    if (this.collisionSystem) {
      this.collisionSystem.resolvePosition(this.player.position, 0.4);
    }
    
    // Snap to terrain height
    const h = getTerrainHeight(this.player.position.x, this.player.position.z);
    this.player.position.y = h;
  }
  
  updateDodge(dt) {
    this.dodgeTime += dt;
    
    // Move rapidly in dodge direction
    const dodgeVel = this.dodgeDir.clone().multiplyScalar(this.dodgeSpeed);
    this.player.position.add(dodgeVel.clone().multiplyScalar(dt));
    
    // Face dodge direction
    this.targetRotation = Math.atan2(-this.dodgeDir.x, -this.dodgeDir.z);
    
    if (this.dodgeTime >= this.dodgeDuration) {
      this.isDodging = false;
      this.velocity.copy(dodgeVel).multiplyScalar(0.3); // Keep some momentum
    }
    
    this.updateRotation(dt * 15); // Fast rotation during dodge
  }
  
  updateMovement(dt) {
    // 1. Calculate input vector
    let ix = 0;
    let iz = 0;
    
    if (this.keys.w) iz -= 1;
    if (this.keys.s) iz += 1;
    if (this.keys.a) ix -= 1;
    if (this.keys.d) ix += 1;
    
    const inputVec = new THREE.Vector3(ix, 0, iz);
    
    // 2. Make input camera-relative
    if (inputVec.lengthSq() > 0) {
      inputVec.normalize();
      
      // Get camera yaw (rotation around Y)
      // Since IsometricCamera rotates a pivot, we need the pivot's Y rotation
      // Assuming cameraController exposes the current yaw or pivot
      const camYaw = this.cameraController.pivot ? this.cameraController.pivot.rotation.y : 0;
      
      // Rotate input vector by camera yaw
      inputVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);
      
      this.moveDirection.copy(inputVec);
      
      // Set target rotation to face movement direction
      this.targetRotation = Math.atan2(-inputVec.x, -inputVec.z);
      
      // Determine state and speed
      const targetSpeed = this.keys.shift ? this.sprintSpeed : this.walkSpeed;
      this.state = this.keys.shift ? 'sprint' : 'walk';
      
      // Accelerate
      const targetVelocity = inputVec.clone().multiplyScalar(targetSpeed);
      this.velocity.lerp(targetVelocity, this.acceleration * dt);
      
    } else {
      // Decelerate (friction)
      this.velocity.lerp(new THREE.Vector3(), this.friction * dt);
      this.state = 'idle';
    }
    
    // Apply velocity
    this.player.position.add(this.velocity.clone().multiplyScalar(dt));
    
    this.updateRotation(dt * 10);
  }
  
  updateRotation(speed) {
    // Smooth rotation (slerp-like for euler angles)
    let currentRot = this.player.rotation.y;
    
    // Fix wrap-around issues
    let diff = this.targetRotation - currentRot;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    this.player.rotation.y += diff * speed;
  }
}
