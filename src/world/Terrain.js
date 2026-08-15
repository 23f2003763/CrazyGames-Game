import * as THREE from 'three';
import { MAP_CONFIG, getTerrainHeight, CLEARINGS, roadSpline, dirtSplines, getClosestPointOnSpline } from './MapData.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';
import { terrainFoundations } from './TerrainFoundationSystem.js';

/**
 * Procedural low-poly stylized terrain generator with rich biome color blending,
 * procedural detail mapping, and seamless foundation integration.
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.waterMesh = null;
    this.generate();
  }

  generate() {
    const { totalWidth, totalDepth, gridResolutionX, gridResolutionZ } = MAP_CONFIG;
    
    // Create large plane geometry covering entire camera frustum + horizon
    const geometry = new THREE.PlaneGeometry(totalWidth, totalDepth, gridResolutionX, gridResolutionZ);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const vertexCount = positions.count;
    const colors = new Float32Array(vertexCount * 3);

    // Color definitions for calibrated stylized post-apocalyptic terrain biomes
    const colorLushGrass    = new THREE.Color(0x4c7532);  // Rich valley grass
    const colorMeadowGrass  = new THREE.Color(0x5c883e);  // Sunlit meadow green
    const colorDryGrass     = new THREE.Color(0x768244);  // Golden-green dry verge
    const colorDustyGrass   = new THREE.Color(0x7c784e);  // Roadside dusty verge
    const colorDirtPath     = new THREE.Color(0x785c3c);  // Warm earthy dirt path
    const colorRoadShoulder = new THREE.Color(0x565045);  // Weathered gravel/rubble
    const colorRiverBed     = new THREE.Color(0x42382c);  // Dark damp riverbed clay/gravel
    const colorRiverGrass   = new THREE.Color(0x38682a);  // Lush riverbank vegetation
    const colorScorched     = new THREE.Color(0x36302a);  // Military outpost scorched earth
    const colorCliffRock    = new THREE.Color(0x52585c);  // Slate cliff stone
    const colorHighPeak     = new THREE.Color(0x666e70);  // Weathered mountain peak rock
    const colorAlpineForest = new THREE.Color(0x344e2e);  // Alpine pine slope ground

    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Height from unified height function (incorporating foundations)
      const h = getTerrainHeight(x, z);
      positions.setY(i, h);

      // Road distance
      const roadInfo = getClosestPointOnSpline(roadSpline, x, z, 30);
      const roadDist = roadInfo.distance;

      // Dirt path distance
      let minDirtDist = Infinity;
      for (const dSpline of dirtSplines) {
        const dInfo = getClosestPointOnSpline(dSpline, x, z, 20);
        if (dInfo.distance < minDirtDist) minDirtDist = dInfo.distance;
      }

      // Proximity to riverbed (running roughly north-south around x = -8)
      const riverDist = Math.abs(x - (-8 + Math.sin(z * 0.04) * 12));
      const inRiver = riverDist < 16 && Math.abs(z) < 110;

      // Foundation zone sampling
      const foundSample = terrainFoundations.sampleFoundation(x, z, h);

      // Base grass pattern with organic frequency noise
      const noise = (Math.sin(x * 0.08) * 0.6 + Math.cos(z * 0.08) * 0.6 + Math.sin(x * 0.2 + z * 0.15) * 0.3);
      if (noise > 0.4) {
        tempColor.copy(colorMeadowGrass);
      } else if (noise < -0.3) {
        tempColor.copy(colorDryGrass);
      } else {
        tempColor.copy(colorLushGrass);
      }

      // 1. Riverbed Biome: Darker soil and greener moisture-rich foliage
      if (inRiver) {
        const rFactor = 1.0 - Math.min(1.0, riverDist / 14);
        if (riverDist < 7) {
          tempColor.lerp(colorRiverBed, rFactor * 0.95);
        } else {
          tempColor.lerp(colorRiverGrass, rFactor * 0.75);
        }
      }

      // 2. Road Proximity Biome: Dry dusty grass & worn shoulders
      if (roadDist < MAP_CONFIG.roadWidth * 1.6) {
        const dustFactor = 1.0 - (roadDist / (MAP_CONFIG.roadWidth * 1.6));
        tempColor.lerp(colorDustyGrass, dustFactor * 0.7);
      }
      if (roadDist < MAP_CONFIG.roadWidth * 0.9) {
        const rBlend = 1.0 - (roadDist / (MAP_CONFIG.roadWidth * 0.9));
        tempColor.lerp(colorRoadShoulder, rBlend * 0.92);
      }

      // 3. Dirt Path Biome
      if (minDirtDist < MAP_CONFIG.dirtPathWidth * 1.2) {
        const dBlend = 1.0 - (minDirtDist / (MAP_CONFIG.dirtPathWidth * 1.2));
        tempColor.lerp(colorDirtPath, dBlend * 0.88);
      }

      // 4. Foundation / Clearing Biome Blending
      if (foundSample && foundSample.weight > 0) {
        const w = foundSample.weight;
        if (foundSample.foundationId === 'outpostOmega') {
          tempColor.lerp(colorScorched, w * 0.85);
        } else if (foundSample.foundationId === 'gasStation') {
          tempColor.lerp(colorRoadShoulder, w * 0.80);
        } else if (foundSample.foundationId === 'relay') {
          tempColor.lerp(colorDirtPath, w * 0.75);
        } else {
          tempColor.lerp(colorDirtPath, w * 0.65);
        }
      }

      // 5. Mountain / Alpine slope coloring
      if (h > 5.5) {
        const alpineFactor = Math.min(1.0, (h - 5.5) / 6.0);
        tempColor.lerp(colorAlpineForest, alpineFactor * 0.8);
      }
      if (h > 10.0) {
        const cliffFactor = Math.min(1.0, (h - 10.0) / 8.0);
        tempColor.lerp(colorCliffRock, cliffFactor * 0.9);
      }
      if (h > 18.0) {
        const peakFactor = Math.min(1.0, (h - 18.0) / 10.0);
        tempColor.lerp(colorHighPeak, peakFactor * 0.95);
      }

      colors[i * 3]     = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const grassMaps = proceduralTextures.getGrassTexture(256);
    grassMaps.diffuse.repeat.set(40, 32);
    grassMaps.roughness.repeat.set(40, 32);

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grassMaps.diffuse,
      roughnessMap: grassMaps.roughness,
      flatShading: true,
      roughness: 0.88,
      metalness: 0.03,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'TerrainMesh';
    this.mesh.userData.isWalkable = true;
    this.mesh.userData.surfaceType = 'terrain';
    this.scene.add(this.mesh);

    // Create shallow river water stream in valley
    this.createRiverWater();
  }

  createRiverWater() {
    const waterGeom = new THREE.PlaneGeometry(28, 160, 16, 40);
    waterGeom.rotateX(-Math.PI / 2);

    const pos = waterGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setX(i, x - 8 + Math.sin(z * 0.04) * 10);
      pos.setY(i, -0.65 + Math.sin(z * 0.1) * 0.08);
    }
    waterGeom.computeVertexNormals();

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2e8b94,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.75,
      flatShading: true,
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.name = 'RiverWater';
    this.scene.add(this.waterMesh);
  }
}
