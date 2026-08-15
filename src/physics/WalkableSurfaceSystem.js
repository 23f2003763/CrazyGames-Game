import * as THREE from 'three';
import { getTerrainHeight } from '../world/MapData.js';

export class WalkableSurfaceSystem {
  constructor(scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.rayDirection = new THREE.Vector3(0, -1, 0);
    this.rayOrigin = new THREE.Vector3();
    
    // Cached array of authored walkable surface meshes
    this.walkableMeshes = [];
    
    // Debugging state for F9
    this.debugMode = false;
    this.debugMaterials = new Map();
  }

  registerWalkable(mesh) {
    if (mesh && mesh.isMesh && !this.walkableMeshes.includes(mesh)) {
      mesh.userData.isWalkable = true;
      this.walkableMeshes.push(mesh);
    }
  }

  buildFromRoots(roots) {
    this.walkableMeshes = [];
    Object.values(roots).forEach(root => {
      root.traverse((node) => {
        if (node.isMesh && node.userData.isWalkable) {
          this.walkableMeshes.push(node);
        }
      });
    });
  }

  rebuildFromScene() {
    this.walkableMeshes = [];
    this.scene.traverse((node) => {
      if (node.isMesh && node.userData.isWalkable) {
        this.walkableMeshes.push(node);
      }
    });
  }

  toggleDebug(enabled) {
    this.debugMode = enabled !== undefined ? enabled : !this.debugMode;
    
    // Refresh walkable meshes list
    this.rebuildFromScene();

    if (this.debugMode) {
      this.walkableMeshes.forEach(mesh => {
        if (!this.debugMaterials.has(mesh.uuid)) {
          this.debugMaterials.set(mesh.uuid, mesh.material);
        }
        const debugMat = mesh.material.clone();
        debugMat.color.setHex(0x00e5ff);
        debugMat.wireframe = true;
        mesh.material = debugMat;
      });
    } else {
      this.walkableMeshes.forEach(mesh => {
        if (this.debugMaterials.has(mesh.uuid)) {
          mesh.material = this.debugMaterials.get(mesh.uuid);
        }
      });
      this.debugMaterials.clear();
    }
    
    return this.debugMode;
  }

  sampleHeight(x, z, currentY = 0) {
    const terrainHeight = getTerrainHeight(x, z);
    
    if (this.walkableMeshes.length === 0) {
      this.rebuildFromScene();
    }

    // Cast downward from reasonable height above current player location
    const startY = Math.max(currentY + 2.0, terrainHeight + 4.0);
    this.rayOrigin.set(x, startY, z);
    this.raycaster.set(this.rayOrigin, this.rayDirection);
    this.raycaster.far = startY - (terrainHeight - 5.0);

    const intersects = this.raycaster.intersectObjects(this.walkableMeshes, false);
    
    if (intersects.length > 0) {
      // Return highest authored surface point + slight clearance (0.03) to prevent clipping
      return intersects[0].point.y + 0.03;
    }

    // Fallback to terrain height + slight clearance
    return terrainHeight + 0.03;
  }
}
