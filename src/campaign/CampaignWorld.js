import * as THREE from 'three';
import { CorridorFenceSystem } from './CorridorFenceSystem.js';
import { BoundaryForest } from './BoundaryForest.js';
import { SectorManager } from './SectorManager.js';
import { campaignFrame } from './CampaignFrame.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

/**
 * CampaignWorld: Flat, polished campaign terrain corridor orientated along
 * the screen-up forward vector (-0.707, 0, -0.707).
 */
export class CampaignWorld {
  constructor(scene, collisionRegistry, interactionSystem, lootSystem, npcSystem, cutsceneDirector) {
    this.scene = scene;
    this.collision = collisionRegistry;

    this.group = new THREE.Group();
    this.group.name = 'CampaignWorld_Root';
    this.scene.add(this.group);

    // 1. Terrain Mesh
    this.buildCampaignTerrain();

    // 2. Continuous Electric Security Fence System
    this.fenceSystem = new CorridorFenceSystem(this.scene, this.collision, null);

    // 3. Dense Boundary Forest
    this.boundaryForest = new BoundaryForest(this.scene);

    // 4. Sector & Entity Manager
    this.sectorManager = new SectorManager(
      this.scene, 
      interactionSystem, 
      lootSystem, 
      npcSystem,
      cutsceneDirector
    );
    this.sectorManager.loadAllAssetsAndBuild();
  }

  buildCampaignTerrain() {
    const size = 320; // 320x320m ground plane
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cLush = new THREE.Color(0x3e5e2e);
    const cTrail = new THREE.Color(0x565045);
    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = this.sampleHeight(x, z);
      pos.setY(i, h);

      // Vertex color gradient based on local lateral distance
      const local = campaignFrame.toLocal(new THREE.Vector3(x, 0, z));
      const distFromCenter = Math.abs(local.x);

      if (distFromCenter < 6.0) {
        tempCol.copy(cTrail);
      } else {
        tempCol.lerpColors(cTrail, cLush, Math.min(1.0, (distFromCenter - 6.0) / 18.0));
      }

      colors[i * 3]     = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const grassMaps = proceduralTextures.getGrassTexture(256);
    grassMaps.diffuse.repeat.set(30, 30);
    grassMaps.roughness.repeat.set(30, 30);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grassMaps.diffuse,
      roughnessMap: grassMaps.roughness,
      roughness: 0.88,
      metalness: 0.03,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'CampaignTerrain_Mesh';
    mesh.userData.isWalkable = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  sampleHeight(x, z) {
    const local = campaignFrame.toLocal(new THREE.Vector3(x, 0, z));
    const absX = Math.abs(local.x);

    if (absX <= 24.0) {
      // Flat corridor with subtle organic micro-variation (< 0.08m)
      return Math.sin(x * 0.15 + z * 0.1) * 0.04;
    }

    // Outer scenic ridge rise beyond electric fences
    const excess = absX - 24.0;
    return Math.pow(Math.min(excess / 24.0, 1.6), 2.0) * 14.0;
  }

  update(playerPos) {
    if (this.sectorManager) {
      this.sectorManager.update(playerPos);
    }
  }
}
