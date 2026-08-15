import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from './CampaignFrame.js';

/**
 * CorridorFenceSystem: Continuous, modular electric security fence generated along
 * both boundaries of the campaign corridor with zero walkable gaps.
 */
export class CorridorFenceSystem {
  constructor(scene, collisionRegistry, pathSpline) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.pathSpline = pathSpline;

    this.group = new THREE.Group();
    this.group.name = 'CorridorFence_Group';
    this.scene.add(this.group);

    this.corridorHalfWidth = 23.0; // 46m total playable width
    this.moduleLength = 3.85;      // Slight overlap with 4m mesh prevents gaps
    this.fenceMesh = null;
    this.sparks = [];

    this.loadAndGenerate();
  }

  loadAndGenerate() {
    const loader = new GLTFLoader();
    loader.load('/models/world/electric_fence_set.glb', (gltf) => {
      let baseMesh = null;
      gltf.scene.traverse((child) => {
        if (child.name === 'FenceStraight_4m') {
          baseMesh = child;
        }
      });

      if (baseMesh) {
        this.fenceMesh = baseMesh;
        this.generateFences();
      }
    });
  }

  generateFences() {
    if (!this.pathSpline || !this.fenceMesh) return;

    const totalLength = 160.0; // Length along local campaign Z
    const stepCount = Math.floor(totalLength / this.moduleLength);

    for (let i = 0; i <= stepCount; i++) {
      const localZ = -15.0 + i * this.moduleLength;

      // Skip a gap where the North Security Gate sits (localZ: 34 to 38)
      if (localZ >= 33.5 && localZ <= 38.5) {
        continue;
      }

      // Left Fence (local X = -corridorHalfWidth)
      this.placeFenceModule(-this.corridorHalfWidth, localZ, -1);
      // Right Fence (local X = +corridorHalfWidth)
      this.placeFenceModule(this.corridorHalfWidth, localZ, 1);
    }

    // Back wall at southern start (local Z = -16)
    for (let x = -this.corridorHalfWidth; x <= this.corridorHalfWidth; x += this.moduleLength) {
      this.placeFenceModule(x, -16.0, 0, Math.PI / 2);
    }
  }

  placeFenceModule(localX, localZ, side, extraRot = 0) {
    const clone = this.fenceMesh.clone(true);
    const worldPos = campaignFrame.toWorld(localX, localZ, 0);
    clone.position.copy(worldPos);

    // Calculate rotation aligned with campaign forward vector
    // Forward vector is (-0.707, 0, -0.707), yaw is -3*PI/4
    const baseYaw = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
    clone.rotation.y = baseYaw + extraRot;

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.group.add(clone);

    // Register physical blocker in collision registry
    if (this.collision) {
      this.collision.addBoxCollider({
        center: worldPos.clone().add(new THREE.Vector3(0, 1.3, 0)),
        size: new THREE.Vector3(3.9, 2.6, 0.6),
        rotation: clone.rotation.y,
        isStatic: true
      });
    }
  }

  update(dt) {
    // Subtle periodic blue-white spark discharge
    if (Math.random() < 0.04 && this.group.children.length > 0) {
      const randomModule = this.group.children[Math.floor(Math.random() * this.group.children.length)];
      if (randomModule) {
        const sparkPos = randomModule.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.0, 2.3, (Math.random() - 0.5) * 0.2));
        // Spark flashes can be rendered or hooked to audio
      }
    }
  }
}
