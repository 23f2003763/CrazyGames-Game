import * as THREE from 'three';

export class PlayerAnimator {
  constructor(player) {
    this.player = player;
    
    // Animation state
    this.time = 0;
    this.speed = 0;
    this.isDodging = false;
    this.dodgeTime = 0;
    
    // Procedural blend weights
    this.walkWeight = 0;
    this.sprintWeight = 0;
  }
  
  update(dt, velocity, state) {
    this.time += dt;
    this.speed = velocity.length();
    
    // Determine state weights
    const targetSprint = state === 'sprint' ? 1 : 0;
    const targetWalk = state === 'walk' ? 1 : 0;
    
    // Lerp weights for smooth transitions
    const blendSpeed = 10 * dt;
    this.walkWeight += (targetWalk - this.walkWeight) * blendSpeed;
    this.sprintWeight += (targetSprint - this.sprintWeight) * blendSpeed;
    
    // Dodge state
    if (state === 'dodge') {
      if (!this.isDodging) {
        this.isDodging = true;
        this.dodgeTime = 0;
      }
      this.dodgeTime += dt;
    } else {
      this.isDodging = false;
    }
    
    this.applyProceduralAnimation(dt);
  }
  
  applyProceduralAnimation(dt) {
    const p = this.player;
    if (!p.parts.torso) return; // Not loaded yet
    
    // Base frequency and amplitude based on speed/weight
    // Sprinting is faster and more exaggerated
    const baseFreq = 15;
    const sprintFreq = 22;
    const freq = baseFreq * this.walkWeight + sprintFreq * this.sprintWeight;
    
    // Calculate phase
    const phase = this.time * freq;
    
    // ---------------------------------------------
    // Idle Breathing (Applied when not moving much)
    // ---------------------------------------------
    const idleWeight = 1.0 - Math.min(1.0, this.walkWeight + this.sprintWeight);
    const breathePhase = this.time * 2;
    const breatheY = Math.sin(breathePhase) * 0.02 * idleWeight;
    const breatheRot = Math.sin(breathePhase) * 0.02 * idleWeight;
    
    // ---------------------------------------------
    // Locomotion (Walk / Sprint)
    // ---------------------------------------------
    // Leg swinging (opposite phases)
    const legRotAmp = 0.5 * this.walkWeight + 0.9 * this.sprintWeight;
    const legLRot = Math.sin(phase) * legRotAmp;
    const legRRot = Math.sin(phase + Math.PI) * legRotAmp;
    
    // Arm swinging (opposite to legs)
    const armRotAmp = 0.4 * this.walkWeight + 0.8 * this.sprintWeight;
    const armLRot = Math.sin(phase + Math.PI) * armRotAmp;
    const armRRot = Math.sin(phase) * armRotAmp;
    
    // Torso bobbing (twice per cycle)
    const bobAmp = 0.05 * this.walkWeight + 0.12 * this.sprintWeight;
    const bobY = Math.abs(Math.sin(phase)) * bobAmp;
    
    // Torso twisting
    const twistAmp = 0.1 * this.walkWeight + 0.25 * this.sprintWeight;
    const torsoTwist = Math.sin(phase) * twistAmp;
    
    // ---------------------------------------------
    // Dodge Animation (Overrides locomotion)
    // ---------------------------------------------
    let dodgePitch = 0;
    let dodgeBob = 0;
    
    if (this.isDodging) {
      // Fast pitch forward and drop down
      const dodgeProgress = Math.min(1.0, this.dodgeTime / 0.4); // 0.4s dodge
      
      // Sine curve for the jump/squash
      dodgeBob = -Math.sin(dodgeProgress * Math.PI) * 0.4;
      dodgePitch = Math.sin(dodgeProgress * Math.PI) * 0.5;
    }
    
    // ---------------------------------------------
    // Apply Transforms
    // ---------------------------------------------
    
    // Torso (Root of animation)
    p.parts.torso.position.y = p.baseTorsoY + bobY + breatheY + dodgeBob;
    p.parts.torso.rotation.z = torsoTwist; // Twist around up axis (blender Z is Y in three)
    p.parts.torso.rotation.x = dodgePitch; // Pitch forward during dodge
    
    // Head (Counter-rotate to look forward, plus slight breathing)
    if (p.parts.head) {
      p.parts.head.rotation.z = -torsoTwist * 0.5;
      p.parts.head.rotation.x = breatheRot - dodgePitch * 0.8;
    }
    
    // Arms
    if (p.parts.arm_l) p.parts.arm_l.rotation.x = armLRot;
    if (p.parts.arm_r) p.parts.arm_r.rotation.x = armRRot;
    
    // Legs
    if (p.parts.leg_l) p.parts.leg_l.rotation.x = legLRot;
    if (p.parts.leg_r) p.parts.leg_r.rotation.x = legRRot;
    
    // Forearms (bend slightly while running)
    const elbowBend = 0.2 * this.walkWeight + 0.6 * this.sprintWeight;
    if (p.parts.forearm_l) p.parts.forearm_l.rotation.x = -elbowBend; // Negative to bend forward
    if (p.parts.forearm_r) p.parts.forearm_r.rotation.x = -elbowBend;
    
    // Boots (counter rotate slightly so feet stay flatter)
    if (p.parts.boot_l) p.parts.boot_l.rotation.x = -legLRot * 0.3;
    if (p.parts.boot_r) p.parts.boot_r.rotation.x = -legRRot * 0.3;
    
    // Backpack (bounce slightly offset from torso)
    if (p.parts.backpack) {
      p.parts.backpack.position.y = -Math.abs(Math.sin(phase - 0.5)) * (0.05 * this.sprintWeight);
    }
  }
}
