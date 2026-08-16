import * as THREE from 'three';
import { ArcTrail } from './ArcTrail.js';
import { CorridorFenceSystem } from './CorridorFenceSystem.js';
import { BoundaryForest } from './BoundaryForest.js';
import { SectorManager } from './SectorManager.js';
import { InteriorRevealSystem } from '../world/InteriorRevealSystem.js';
import { campaignFrame } from './CampaignFrame.js';
import { campaignPath } from './CampaignPath.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';
import { createCampaignGroundMaterial } from '../rendering/CampaignGroundMaterial.js';
import { GroundDetailSystem } from '../rendering/GroundDetailSystem.js';

/**
 * CampaignWorld: High-quality campaign environment with muddy Arc trail ribbon,
 * continuous electric fence perimeter, dense boundary forest, and Zomboid-style interior reveals.
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

    // 2. Authored Muddy Arc Trail Ribbon
    this.trail = new ArcTrail(this.scene);
    console.assert(this.trail, 'Campaign trail missing');

    // 2.5 Ground Detail Scatter
    this.groundDetailSystem = new GroundDetailSystem(this.scene, this.sampleHeight.bind(this));

    // 3. Interior Reveal System
    this.interiorRevealSystem = new InteriorRevealSystem();

    // 4. Continuous Electric Security Fence System
    this.fenceSystem = new CorridorFenceSystem(this.scene, this.collision);

    // 5. Dense Boundary Forest
    this.boundaryForest = new BoundaryForest(this.scene);

    // 6. Sector & Entity Manager
    this.sectorManager = new SectorManager(
      this.scene, 
      this.collision,
      interactionSystem, 
      lootSystem, 
      npcSystem,
      cutsceneDirector,
      this.fenceSystem,
      this.interiorRevealSystem
    );
    this.sectorManager.loadAllAssetsAndBuild();
  }

  buildCampaignTerrain() {
    const size = 340;
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cLush = new THREE.Color(0.0, 0.0, 0.0); // R=0 means grass
    const cTrailEarth = new THREE.Color(1.0, 0.0, 0.0); // R=1 means dirt
    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = this.sampleHeight(x, z);
      pos.setY(i, h);

      const worldP = new THREE.Vector3(x, 0, z);
      const t = campaignPath.getClosestProgress(worldP);
      const pathP = campaignPath.getWorldPointAt(t);
      const distFromPath = Math.sqrt((x - pathP.x) * (x - pathP.x) + (z - pathP.z) * (z - pathP.z));

      if (distFromPath < 6.0) {
        tempCol.copy(cTrailEarth);
      } else {
        tempCol.lerpColors(cTrailEarth, cLush, Math.min(1.0, (distFromPath - 6.0) / 16.0));
      }

      colors[i * 3]     = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = createCampaignGroundMaterial();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'CampaignTerrain_Mesh';
    mesh.userData.isWalkable = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  sampleHeight(x, z) {
    const worldP = new THREE.Vector3(x, 0, z);
    const t = campaignPath.getClosestProgress(worldP);
    const pathP = campaignPath.getWorldPointAt(t);
    const distFromPath = Math.sqrt((x - pathP.x) * (x - pathP.x) + (z - pathP.z) * (z - pathP.z));

    let h = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.12;

    if (distFromPath > 18.0) {
      const excess = distFromPath - 18.0;
      h += Math.min(excess, 20.0) * 0.25;
    }

    return h;
  }

  update(dt, playerPos) {
    if (this.interiorRevealSystem) {
      this.interiorRevealSystem.update(dt, playerPos);
    }
    if (this.sectorManager) {
      this.sectorManager.update(playerPos, dt);
    }
  }
}
