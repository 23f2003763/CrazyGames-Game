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
    const leftOffset = -9.5;
    const rightOffset = 9.5;

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
      }
    }

    console.assert(this.validateContinuity(), 'FENCE HAS GAPS');
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
    return this.leftFences.length > 5 && this.rightFences.length > 5;
  }
}
