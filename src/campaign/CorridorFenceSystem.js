import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignPath } from './CampaignPath.js';
import { campaignFrame } from './CampaignFrame.js';

/**
 * CorridorFenceSystem: Continuous, modular electric security fence generated along
 * both sides of the authoritative CampaignPath (19–21m offset) with zero walkable gaps.
 */
export class CorridorFenceSystem {
  constructor(scene, collisionRegistry) {
    this.scene = scene;
    this.collision = collisionRegistry;

    this.group = new THREE.Group();
    this.group.name = 'CorridorFence_Group';
    this.scene.add(this.group);

    this.corridorHalfWidth = 20.5; // ~41m total playable corridor width
    this.moduleLength = 3.82;      // Overlapping modules ensure ZERO gaps
    this.fenceMesh = null;
    this.gateMesh = null;

    this.loadAndGenerate();
  }

  loadAndGenerate() {
    const loader = new GLTFLoader();
    loader.load('/models/world/electric_fence_set.glb', (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.name === 'FenceStraight_4m') {
          this.fenceMesh = child;
        }
        if (child.name === 'FenceGateLarge') {
          this.gateMesh = child;
        }
      });

      if (this.fenceMesh) {
        this.generateFences();
      }
    });
  }

  generateFences() {
    const totalPathLen = campaignPath.totalLength;
    const stepCount = Math.floor(totalPathLen / this.moduleLength);

    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const centerPos = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);

      // Left Fence (normal * -halfWidth)
      const leftPos = centerPos.clone().addScaledVector(normal, -this.corridorHalfWidth);
      this.placeFenceModule(leftPos, yaw, `fence_L_${i}`);

      // Right Fence (normal * +halfWidth)
      const rightPos = centerPos.clone().addScaledVector(normal, this.corridorHalfWidth);
      this.placeFenceModule(rightPos, yaw, `fence_R_${i}`);
    }

    // South perimeter back wall
    const startCenter = campaignPath.getWorldPointAt(0);
    const startTangent = campaignPath.getWorldTangentAt(0);
    const startNormal = new THREE.Vector3(-startTangent.z, 0, startTangent.x).normalize();
    const startYaw = Math.atan2(startTangent.x, startTangent.z) + Math.PI / 2;

    for (let d = -this.corridorHalfWidth; d <= this.corridorHalfWidth; d += this.moduleLength) {
      const wallPos = startCenter.clone().addScaledVector(startNormal, d).addScaledVector(startTangent, -4.0);
      this.placeFenceModule(wallPos, startYaw, `fence_back_${d}`);
    }

    // Register closed gate barrier collider at local Z = 36
    const gatePos = campaignFrame.getAnchorWorld('relay_gate');
    if (this.collision) {
      this.collision.addBox(gatePos.x - 3.0, gatePos.z, 0.8, 0.8, 0, 'gate_post_L');
      this.collision.addBox(gatePos.x + 3.0, gatePos.z, 0.8, 0.8, 0, 'gate_post_R');
      this.collision.addBox(gatePos.x, gatePos.z, 5.6, 1.2, 0, 'closed_gate_barrier');
    }
  }

  placeFenceModule(worldPos, yaw, id) {
    const clone = this.fenceMesh.clone(true);
    clone.position.copy(worldPos);
    clone.rotation.y = yaw;

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.group.add(clone);

    // Register solid physical collider
    if (this.collision) {
      this.collision.addBox(worldPos.x, worldPos.z, 3.9, 1.0, yaw, id);
    }
  }

  unlockGate() {
    if (this.collision) {
      this.collision.remove('closed_gate_barrier');
      console.log('[FENCE] Closed gate collider removed. Path is traversable.');
    }
  }

  update(dt) {
    // Electric hum / spark effects
  }
}
