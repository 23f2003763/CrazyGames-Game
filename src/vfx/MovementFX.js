import * as THREE from 'three';
import { getTerrainHeight } from '../world/MapData.js';

export class MovementFX {
  constructor(scene) {
    this.scene = scene;
    
    // Create dust particle pool
    this.particleCount = 50;
    this.particles = [];
    
    const geom = new THREE.PlaneGeometry(0.6, 0.6);
    // Orient to face up slightly but mostly camera facing (billboarded in update)
    // We'll actually just use a simple material and rotate it in update
    
    this.material = new THREE.MeshBasicMaterial({
      color: 0x8a7a63,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    
    for (let i = 0; i < this.particleCount; i++) {
      const mesh = new THREE.Mesh(geom, this.material.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      
      this.particles.push({
        mesh,
        life: 0,
        maxLife: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scaleSpeed: 0,
        baseScale: 1
      });
    }
    
    this.lastStepTime = 0;
  }
  
  emitDust(x, z, intensity = 1.0, count = 1) {
    const y = getTerrainHeight(x, z) + 0.1;
    
    let emitted = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        // Activate
        p.life = 1.0;
        p.maxLife = 0.5 + Math.random() * 0.4;
        
        // Random offset
        const ox = (Math.random() - 0.5) * 0.4 * intensity;
        const oz = (Math.random() - 0.5) * 0.4 * intensity;
        
        p.mesh.position.set(x + ox, y, z + oz);
        p.mesh.rotation.x = -Math.PI / 2; // Flat on ground
        p.mesh.rotation.z = Math.random() * Math.PI * 2; // Random spin
        
        p.baseScale = 0.5 + Math.random() * 0.5 * intensity;
        p.mesh.scale.setScalar(p.baseScale);
        
        p.vx = (Math.random() - 0.5) * 0.8 * intensity;
        p.vy = 0.2 + Math.random() * 0.5 * intensity;
        p.vz = (Math.random() - 0.5) * 0.8 * intensity;
        
        p.scaleSpeed = 1.0 + Math.random() * 2.0;
        
        p.mesh.material.opacity = 0.4 + Math.random() * 0.3;
        p.mesh.visible = true;
        
        emitted++;
        if (emitted >= count) break;
      }
    }
  }
  
  updateWalkSteps(x, z, speed, dt, time) {
    // Only emit when moving fast enough
    if (speed < 1.0) return;
    
    // Step frequency based on speed
    const stepInterval = speed > 4 ? 0.2 : 0.35; 
    
    if (time - this.lastStepTime > stepInterval) {
      this.emitDust(x, z, speed > 4 ? 1.0 : 0.5, 1);
      this.lastStepTime = time;
    }
  }
  
  update(dt, camera) {
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          // Physics
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          
          p.vy -= 1.5 * dt; // Gravity/drag
          p.vx *= 0.9;
          p.vz *= 0.9;
          
          // Animation
          const lifePct = p.life / p.maxLife;
          const currentScale = p.baseScale + (1.0 - lifePct) * p.scaleSpeed;
          p.mesh.scale.setScalar(currentScale);
          
          // Fade out
          p.mesh.material.opacity = lifePct * 0.5;
          
          // Slowly rotate to face camera slightly
          if (camera) {
             p.mesh.quaternion.slerp(camera.quaternion, dt * 2);
          }
        }
      }
    }
  }
}
