import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignPath } from './CampaignPath.js';

/**
 * BoundaryForest: Dense, layered evergreen and broadleaf forest following both sides
 * of the curved CampaignPath. Completely occludes the outer map perimeter.
 */
export class BoundaryForest {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'BoundaryForest_Group';
    this.scene.add(this.group);

    this.treeModels = [];
    this.bushModels = [];
    this.loadAndGenerate();
  }

  loadAndGenerate() {
    const loader = new GLTFLoader();
    loader.load('/models/world/tree_set.glb', (gltf) => {
      const treeNames = ['Pine_A', 'Pine_B', 'Pine_C', 'Broadleaf_A', 'Broadleaf_B', 'DeadTree_A'];
      const bushNames = ['Bush_A', 'Bush_B', 'Shrub_A'];
      gltf.scene.traverse((child) => {
        if (treeNames.includes(child.name)) {
          this.treeModels.push(child);
        }
        if (bushNames.includes(child.name)) {
          this.bushModels.push(child);
        }
      });

      if (this.bushModels.length === 0 && this.treeModels.length > 0) {
        this.bushModels = this.treeModels;
      }

      if (this.treeModels.length > 0) {
        this.generateForest();
      }
    });
  }

  generateForest() {
    const depthBands = [20.0, 23.5, 28.0, 34.0, 42.0]; // Outside the 18.0m fence
    const totalPathLen = campaignPath.totalLength;
    const stepCount = Math.floor(totalPathLen / 4.2);

    let seed = 107;
    const pseudoRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const centerPos = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      depthBands.forEach((bandOffset, bIdx) => {
        const jitterT = (pseudoRand() - 0.5) * 2.2;
        const jitterN = (pseudoRand() - 0.5) * 1.8;

        // Left forest band
        const leftPos = centerPos.clone()
          .addScaledVector(normal, -(bandOffset + jitterN))
          .addScaledVector(tangent, jitterT);
        this.spawnTree(leftPos, pseudoRand, this.treeModels);

        // Right forest band
        const rightPos = centerPos.clone()
          .addScaledVector(normal, (bandOffset + jitterN))
          .addScaledVector(tangent, jitterT);
        this.spawnTree(rightPos, pseudoRand, this.treeModels);
      });

      // Shrub band at 19.0m (dense)
      const shrubT = (pseudoRand() - 0.5) * 1.5;
      const shrubN = (pseudoRand() - 0.5) * 0.8;
      
      const leftShrubPos = centerPos.clone()
        .addScaledVector(normal, -(19.0 + shrubN))
        .addScaledVector(tangent, shrubT);
      this.spawnTree(leftShrubPos, pseudoRand, this.bushModels, 0.6);

      const rightShrubPos = centerPos.clone()
        .addScaledVector(normal, (19.0 + shrubN))
        .addScaledVector(tangent, shrubT);
      this.spawnTree(rightShrubPos, pseudoRand, this.bushModels, 0.6);
    }

    // South perimeter dense back woods
    const startCenter = campaignPath.getWorldPointAt(0);
    const startTangent = campaignPath.getWorldTangentAt(0);
    const startNormal = new THREE.Vector3(-startTangent.z, 0, startTangent.x).normalize();

    for (let d = -60.0; d <= 60.0; d += 4.5) {
      for (let back = 6.0; back <= 35.0; back += 5.5) {
        const p = startCenter.clone()
          .addScaledVector(startNormal, d + (pseudoRand() - 0.5) * 2.0)
          .addScaledVector(startTangent, -back + (pseudoRand() - 0.5) * 2.0);
        this.spawnTree(p, pseudoRand, this.treeModels);
      }
    }
  }

  spawnTree(worldPos, randFn, modelArray = this.treeModels, scaleMulti = 1.0) {
    const modelIdx = Math.floor(randFn() * modelArray.length);
    const baseModel = modelArray[modelIdx];
    if (!baseModel) return;

    const tree = baseModel.clone(true);
    tree.position.copy(worldPos);

    const scale = (0.85 + randFn() * 0.45) * scaleMulti;
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
