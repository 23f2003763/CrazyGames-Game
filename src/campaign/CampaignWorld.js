import * as THREE from 'three';
import { CampaignRoad } from './CampaignRoad.js';
import { SectorManager } from './SectorManager.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

/**
 * CampaignWorld: Authored, linear semi-open world structure (+Z campaign axis).
 * 
 * Rules:
 * - Playable corridor (-35 <= X <= 35, -30 <= Z <= 270) is mostly flat (Y = 0.0 +- 0.1m).
 * - Scenic mountain ridges rise outside the electric fence perimeter (|X| > 38).
 * - Deliberate pacing, road navigation, and sector management.
 */
export class CampaignWorld {
  constructor(scene, interactionSystem, lootSystem, npcSystem) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'CampaignWorld_Root';
    this.scene.add(this.group);

    // 1. Terrain Mesh
    this.buildCampaignTerrain();

    // 2. Authored Highway Ribbon
    this.road = new CampaignRoad(this.scene);

    // 3. Sector & Entity Manager
    this.sectorManager = new SectorManager(
      this.scene, 
      interactionSystem, 
      lootSystem, 
      npcSystem
    );
    this.sectorManager.loadAllAssetsAndBuild();
  }

  buildCampaignTerrain() {
    const width = 160;  // X: -80 to +80
    const depth = 340;  // Z: -40 to +300
    const segX = 80;
    const segZ = 120;

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    // Shift center so Z spans from -40 to +300
    geo.translate(0, 0, 130);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cLush = new THREE.Color(0x4c7532);
    const cDry = new THREE.Color(0x768244);
    const cShoulder = new THREE.Color(0x565045);
    const cCliff = new THREE.Color(0x4e5458);
    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = this.sampleHeight(x, z);
      pos.setY(i, h);

      // Vertex color blending
      const distFromCenter = Math.abs(x);
      if (distFromCenter < 5.5) {
        // Road shoulder proximity
        tempCol.copy(cShoulder);
      } else if (distFromCenter < 24.0) {
        // Playable meadow
        const n = Math.sin(x * 0.3) * Math.cos(z * 0.2);
        tempCol.lerpColors(cLush, cDry, (n + 1) * 0.4);
      } else {
        // Outer ridge forest / rock cliff
        tempCol.lerpColors(cLush, cCliff, Math.min(1.0, (distFromCenter - 24) / 30));
      }

      colors[i * 3]     = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const grassMaps = proceduralTextures.getGrassTexture(256);
    grassMaps.diffuse.repeat.set(24, 40);
    grassMaps.roughness.repeat.set(24, 40);

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
    mesh.userData.surfaceType = 'terrain';
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  /**
   * Fast unified height evaluator for the Campaign Corridor
   */
  sampleHeight(x, z) {
    const absX = Math.abs(x);
    if (absX <= 34.0) {
      // Flat central corridor with subtle organic micro-variation (< 0.12m)
      return Math.sin(x * 0.15 + z * 0.1) * 0.06 + Math.cos(x * 0.1 - z * 0.12) * 0.04;
    }

    // Mountain ridges rise sharply outside the electric fence perimeter (beyond |X| = 34m)
    const excess = absX - 34.0;
    const ridgeRise = Math.pow(Math.min(excess / 28.0, 1.8), 2.0) * 18.0;
    const noise = Math.sin(x * 0.1 + z * 0.08) * 1.8;
    return Math.max(0, ridgeRise + noise);
  }

  update(playerPos) {
    if (this.sectorManager) {
      this.sectorManager.update(playerPos);
    }
  }
}
