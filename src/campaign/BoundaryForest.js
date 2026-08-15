import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from './CampaignFrame.js';

/**
 * BoundaryForest: Dense, layered evergreen and broadleaf forest outside the security fences.
 * Completely occludes the outer map perimeter, creating an infinite forest atmosphere.
 */
export class BoundaryForest {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'BoundaryForest_Group';
    this.scene.add(this.group);

    this.treeModels = [];
    this.loadAndGenerate();
  }

  loadAndGenerate() {
    const loader = new GLTFLoader();
    loader.load('/models/world/tree_set.glb', (gltf) => {
      const treeNames = ['Pine_A', 'Pine_B', 'Pine_C', 'Broadleaf_A', 'Broadleaf_B'];
      gltf.scene.traverse((child) => {
        if (treeNames.includes(child.name)) {
          this.treeModels.push(child);
        }
      });

      if (this.treeModels.length > 0) {
        this.generateForest();
      }
    });
  }

  generateForest() {
    const depthBands = [27.0, 32.0, 39.0, 48.0, 58.0]; // Lateral offsets from center (fence is at 23m)
    const zStart = -25.0;
    const zEnd = 165.0;
    const zStep = 4.5;

    let seed = 42;
    const pseudoRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let z = zStart; z <= zEnd; z += zStep) {
      depthBands.forEach((bandOffset, bIdx) => {
        // Left side forest
        const leftJitterX = (pseudoRand() - 0.5) * 2.2;
        const leftJitterZ = (pseudoRand() - 0.5) * 2.5;
        const localLeftX = -(bandOffset + leftJitterX);
        const localLeftZ = z + leftJitterZ;
        this.spawnTree(localLeftX, localLeftZ, pseudoRand);

        // Right side forest
        const rightJitterX = (pseudoRand() - 0.5) * 2.2;
        const rightJitterZ = (pseudoRand() - 0.5) * 2.5;
        const localRightX = (bandOffset + rightJitterX);
        const localRightZ = z + rightJitterZ;
        this.spawnTree(localRightX, localRightZ, pseudoRand);
      });
    }

    // Back dense tree line behind southern wall (local Z < -18)
    for (let z = -32.0; z <= -18.0; z += 4.0) {
      for (let x = -40.0; x <= 40.0; x += 4.5) {
        if (Math.abs(x) < 23.0 && z > -20.0) continue;
        this.spawnTree(x + (pseudoRand() - 0.5) * 1.8, z + (pseudoRand() - 0.5) * 1.8, pseudoRand);
      }
    }
  }

  spawnTree(localX, localZ, randFn) {
    const modelIdx = Math.floor(randFn() * this.treeModels.length);
    const baseModel = this.treeModels[modelIdx];
    if (!baseModel) return;

    const tree = baseModel.clone(true);
    const worldPos = campaignFrame.toWorld(localX, localZ, 0);
    tree.position.copy(worldPos);

    const scale = 0.85 + randFn() * 0.45;
    tree.scale.setScalar(scale);
    tree.rotation.y = randFn() * Math.PI * 2;

    tree.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.group.add(tree);
  }
}
