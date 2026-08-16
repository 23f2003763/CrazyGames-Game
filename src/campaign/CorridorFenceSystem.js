import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignPath } from './CampaignPath.js';
import { campaignFrame } from './CampaignFrame.js';

/**
 * CorridorFenceSystem: Places continuous modular electric perimeter fences along
 * both flanks of the CampaignPath using standalone centered GLB assets and exact matrix colliders.
 */
export class CorridorFenceSystem {
  constructor(scene, collisionRegistry) {
    this.scene = scene;
    this.collision = collisionRegistry;

    this.group = new THREE.Group();
    this.group.name = 'CorridorFence_Group';
    this.scene.add(this.group);

    this.fenceMesh = null;
    this.gateScene = null;
    this.isGateLocked = true;
    this.gateColliderId = null;

    this.leftFences = [];
    this.rightFences = [];

    this.loadAssetsAndGenerate();
  }

  async loadAssetsAndGenerate() {
    const loader = new GLTFLoader();
    const [fenceGLTF, gateGLTF] = await Promise.all([
      new Promise((res, rej) => loader.load('/models/world/fence_straight_4m.glb', res, undefined, rej)),
      new Promise((res, rej) => loader.load('/models/world/relay_gate.glb', res, undefined, rej))
    ]);

    this.fenceTemplate = fenceGLTF.scene;
    this.gateTemplate = gateGLTF.scene;

    this.buildPerimeterFences();
    this.buildRelayGate();
  }

  buildPerimeterFences() {
    const totalLen = campaignPath.totalLength;
    const moduleSpacing = 3.92; // 4.0m fence with 0.08m overlap for zero visual gaps
    const steps = Math.floor(totalLen / moduleSpacing);

    // Left and Right offsets from corridor centerline
    const leftOffset = -18.0;
    const rightOffset = 18.0;

    for (let i = 0; i <= steps; i++) {
      const s = i * moduleSpacing;
      const t = Math.min(1.0, s / totalLen);

      const centerPos = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Yaw: Since fence length is local +X, yaw = atan2(-tangent.z, tangent.x)
      const yaw = Math.atan2(-tangent.z, tangent.x);

      // Left Flank Module
      const posL = centerPos.clone().addScaledVector(normal, leftOffset);
      const modL = this.fenceTemplate.clone(true);
      modL.position.set(posL.x, 0, posL.z);
      modL.rotation.y = yaw;
      this.group.add(modL);
      this.leftFences.push(modL);

      if (this.collision) {
        this.collision.addBoxFromObject(modL, { x: 4.0, z: 0.28 }, `col_fence_l_${i}`);
        
        // Add safety backstop
        const posBackL = centerPos.clone().addScaledVector(normal, leftOffset - 0.35);
        this.collision.addBox(posBackL.x, posBackL.z, 4.0, 0.5, yaw, `col_backstop_l_${i}`);
      }

      // Right Flank Module (skip near Relay HQ open yard if needed, else place consistently)
      // Relay gate gap is at s ~ 28m on centerline, not flanks
      const posR = centerPos.clone().addScaledVector(normal, rightOffset);
      const modR = this.fenceTemplate.clone(true);
      modR.position.set(posR.x, 0, posR.z);
      modR.rotation.y = yaw;
      this.group.add(modR);
      this.rightFences.push(modR);

      if (this.collision) {
        this.collision.addBoxFromObject(modR, { x: 4.0, z: 0.28 }, `col_fence_r_${i}`);
        
        // Add safety backstop
        const posBackR = centerPos.clone().addScaledVector(normal, rightOffset + 0.35);
        this.collision.addBox(posBackR.x, posBackR.z, 4.0, 0.5, yaw, `col_backstop_r_${i}`);
      }
    }

    const validation = this.validateContinuity();
    console.assert(validation.valid, 'FENCE HAS GAPS');
  }

  buildRelayGate() {
    const gatePos = campaignFrame.requireAnchor('relay_gate');
    this.gateScene = this.gateTemplate.clone(true);
    this.gateScene.position.copy(gatePos);
    this.gateScene.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);

    this.group.add(this.gateScene);

    // Initial closed-door solid collider
    if (this.collision) {
      this.gateColliderId = this.collision.addBox(
        gatePos.x,
        gatePos.z,
        5.6,
        0.8,
        this.gateScene.rotation.y,
        'col_relay_gate_door'
      );
    }
  }

  unlockGate() {
    this.isGateLocked = false;
    if (this.gateColliderId && this.collision) {
      this.collision.remove(this.gateColliderId);
      this.gateColliderId = null;
    }

    if (this.gateScene) {
      // Animate swing open
      const doorL = this.gateScene.getObjectByName('GateDoor_L_Root');
      const doorR = this.gateScene.getObjectByName('GateDoor_R_Root');
      if (doorL) doorL.rotation.y = -Math.PI * 0.45;
      if (doorR) doorR.rotation.y = Math.PI * 0.45;
    }
  }

  validateContinuity() {
    let valid = true;
    let maxGap = 0;
    const gaps = [];

    for (let i = 0; i < this.leftFences.length - 1; i++) {
      const end1 = new THREE.Vector3(2.0, 0, 0).applyEuler(this.leftFences[i].rotation).add(this.leftFences[i].position);
      const start2 = new THREE.Vector3(-2.0, 0, 0).applyEuler(this.leftFences[i+1].rotation).add(this.leftFences[i+1].position);
      const dist = end1.distanceTo(start2);
      maxGap = Math.max(maxGap, dist);
      if (dist > 0.12) valid = false;
      gaps.push(dist);
    }

    for (let i = 0; i < this.rightFences.length - 1; i++) {
      const end1 = new THREE.Vector3(2.0, 0, 0).applyEuler(this.rightFences[i].rotation).add(this.rightFences[i].position);
      const start2 = new THREE.Vector3(-2.0, 0, 0).applyEuler(this.rightFences[i+1].rotation).add(this.rightFences[i+1].position);
      const dist = end1.distanceTo(start2);
      maxGap = Math.max(maxGap, dist);
      if (dist > 0.12) valid = false;
      gaps.push(dist);
    }
    
    console.log('LEFT/RIGHT FENCE MAX GAP:', maxGap);
    return { valid, maxGap, gaps };
  }
}
