import * as THREE from 'three';
import { MAP_CONFIG, getTerrainHeight, CLEARINGS, roadSpline, dirtSplines, getClosestPointOnSpline } from './MapData.js';

/**
 * Procedural low-poly stylized terrain generator
 * Step 1.1: Generates expansive continuous terrain spanning the core valley
 * and surrounding mountain ranges with zero visible rectangular boundaries.
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

    // Color definitions for vibrant stylized post-apocalyptic terrain
    const colorLushGrass = new THREE.Color(0x5ca338);     // Vibrant olive green
    const colorMeadowGrass = new THREE.Color(0x6eb844);   // Sunlit bright grass
    const colorDryGrass = new THREE.Color(0x8fae3e);      // Golden-green weeds
    const colorDirtPath = new THREE.Color(0x856942);      // Warm earthy dirt
    const colorRoadShoulder = new THREE.Color(0x5a544b);  // Weathered gravel/rubble
    const colorCliffRock = new THREE.Color(0x596461);     // Slate cliff stone
    const colorHighPeak = new THREE.Color(0x6e7878);      // Weathered mountain peak rock
    const colorAlpineForest = new THREE.Color(0x3e5e34);  // Alpine pine slope ground
    const colorRiverBed = new THREE.Color(0x615b49);      // Dry river gravel & clay
    const colorClearingDirt = new THREE.Color(0x7c694a);  // Cleared dirt pad

    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Height from unified height function
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

      // Proximity to designated clearings
      let clearingFactor = 0;
      for (const cl of CLEARINGS) {
        const dist = Math.hypot(x - cl.x, z - cl.z);
        if (dist < cl.radius) {
          clearingFactor = Math.max(clearingFactor, 1 - (dist / cl.radius));
        }
      }

      // Sunken riverbed proximity
      const riverDist = Math.abs(x - (-8 + Math.sin(z * 0.04) * 12));
      const inRiver = riverDist < 12 && Math.abs(z) < 110;

      // Base grass pattern with organic variation
      const noise = (Math.sin(x * 0.15) + Math.cos(z * 0.15)) * 0.5;
      if (noise > 0.3) {
        tempColor.copy(colorMeadowGrass);
      } else if (noise < -0.3) {
        tempColor.copy(colorDryGrass);
      } else {
        tempColor.copy(colorLushGrass);
      }

      // Riverbed coloring
      if (inRiver) {
        const rFactor = 1 - (riverDist / 12);
        tempColor.lerp(colorRiverBed, rFactor * 0.9);
      }

      // Mountain / Alpine slope coloring based on height and distance
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

      // Clearing dirt blending inside playable valley
      if (clearingFactor > 0) {
        tempColor.lerp(colorClearingDirt, clearingFactor * 0.65);
      }

      // Dirt path blending
      if (minDirtDist < MAP_CONFIG.dirtPathWidth * 1.1) {
        const dBlend = 1 - (minDirtDist / (MAP_CONFIG.dirtPathWidth * 1.1));
        tempColor.lerp(colorDirtPath, dBlend * 0.88);
      }

      // Main road shoulder & gravel blending
      if (roadDist < MAP_CONFIG.roadWidth * 0.95) {
        const rBlend = 1 - (roadDist / (MAP_CONFIG.roadWidth * 0.95));
        tempColor.lerp(colorRoadShoulder, rBlend * 0.92);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.84,
      metalness: 0.05,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'TerrainMesh';
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
      color: 0x3bb3b8,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
      flatShading: true,
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.name = 'RiverWater';
    this.scene.add(this.waterMesh);
  }
}
