import * as THREE from 'three';
import { getTerrainHeight } from '../world/MapData.js';
import { SlopeLimiter } from '../physics/SlopeLimiter.js';

export class PlayerController {
  constructor(player, cameraController, collisionSystem, walkableSurfaceSystem) {
    this.player = player;
    this.cameraController = cameraController;
    this.collisionSystem = collisionSystem;
    this.walkableSurfaceSystem = walkableSurfaceSystem;

    this.slopeLimiter = new SlopeLimiter((x, z) => {
      if (this.walkableSurfaceSystem) {
        return this.walkableSurfaceSystem.sampleHeight(x, z);
      }
      return getTerrainHeight(x, z);
    });
    
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
    this.walkSpeed = 4.8;
    this.sprintSpeed = 8.8;
    this.acceleration = 38.0;
    this.friction = 14.0;
    
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
    }
  }
  
  update(dt) {
    if (this.isDodging) {
      this.updateDodge(dt);
    } else {
      this.updateMovement(dt);
    }
    
    // Apply collision resolution
    if (this.collisionSystem) {
      this.collisionSystem.resolvePosition(this.player.position, 0.45);
    }
    
    // Smooth height interpolation over walkable surfaces and terrain
    let targetGroundY = 0;
    if (this.walkableSurfaceSystem) {
      targetGroundY = this.walkableSurfaceSystem.sampleHeight(
        this.player.position.x, 
        this.player.position.z, 
        this.player.position.y
      );
    } else {
      targetGroundY = getTerrainHeight(this.player.position.x, this.player.position.z);
    }

    if (this.currentGroundY === undefined || Number.isNaN(this.currentGroundY)) {
      this.currentGroundY = targetGroundY;
    }

    const deltaY = targetGroundY - this.currentGroundY;
    const absDelta = Math.abs(deltaY);

    if (absDelta < 0.35) {
      // Small ordinary elevation changes: smooth natural damp
      this.currentGroundY += deltaY * Math.min(1.0, 14.0 * dt);
    } else if (absDelta <= 0.90) {
      // Medium steps: fast smooth step
      this.currentGroundY += deltaY * Math.min(1.0, 22.0 * dt);
    } else {
      // Steep vertical cliff / bridge ledge > 0.90m: reject sudden teleport
      if (absDelta > 3.5) {
        // Only allow teleport if respawning or falling off map
        this.currentGroundY = targetGroundY;
      } else {
        this.currentGroundY += Math.sign(deltaY) * 0.90 * Math.min(1.0, 10.0 * dt);
      }
    }

    this.player.position.y = this.currentGroundY;
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
      this.velocity.copy(dodgeVel).multiplyScalar(0.3);
    }
    
    this.updateRotation(dt * 15);
  }
  
  updateMovement(dt) {
    let ix = 0;
    let iz = 0;
    
    if (this.keys.w) iz -= 1;
    if (this.keys.s) iz += 1;
    if (this.keys.a) ix -= 1;
    if (this.keys.d) ix += 1;
    
    const inputVec = new THREE.Vector3(ix, 0, iz);
    
    if (inputVec.lengthSq() > 0) {
      inputVec.normalize();
      
      // Camera-relative movement
      const camYaw = this.cameraController.pivot ? this.cameraController.pivot.rotation.y : 0;
      inputVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);
      
      this.moveDirection.copy(inputVec);
      if (!this.hasFacingOverride) {
        this.targetRotation = Math.atan2(-inputVec.x, -inputVec.z);
      }
      
      const targetSpeed = this.keys.shift ? this.sprintSpeed : this.walkSpeed;
      this.state = this.keys.shift ? 'sprint' : 'walk';
      
      const targetVelocity = inputVec.clone().multiplyScalar(targetSpeed);
      this.velocity.lerp(targetVelocity, this.acceleration * dt);
      
      if (this.slopeLimiter) {
        const res = this.slopeLimiter.filterMovement(this.player.position, this.velocity, dt);
        this.velocity.copy(res.allowedVelocity);
      }
    } else {
      this.velocity.lerp(new THREE.Vector3(), this.friction * dt);
      this.state = 'idle';
    }
    
    this.player.position.add(this.velocity.clone().multiplyScalar(dt));
    this.updateRotation(dt * 12);
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
    
    this.player.rotation.y += diff * speed;
  }
}
