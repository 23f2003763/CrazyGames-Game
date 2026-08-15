import * as THREE from 'three';
import { MAP_CONFIG, getTerrainHeight, CLEARINGS, roadSpline, dirtSplines, getClosestPointOnSpline } from './MapData.js';

/**
 * Procedural low-poly stylized terrain generator
 * Features rich vertex coloring for biomes, paths, cliff rocks, and lush meadows
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.waterMesh = null;
    this.generate();
  }

  generate() {
    const { width, depth, gridResolutionX, gridResolutionZ } = MAP_CONFIG;
    
    // Create Plane geometry with segments
    const geometry = new THREE.PlaneGeometry(width, depth, gridResolutionX, gridResolutionZ);
    // Rotate to lie in XZ plane
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
    const colorCliffRock = new THREE.Color(0x596461);     // Slate rock
    const colorRiverBed = new THREE.Color(0x615b49);      // Dry river gravel & clay
    const colorClearingDirt = new THREE.Color(0x7c694a);  // Cleared dirt pad

    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Height
      const h = getTerrainHeight(x, z);
      positions.setY(i, h);

      // Determine blend factor for road proximity
      const roadInfo = getClosestPointOnSpline(roadSpline, x, z, 30);
      const roadDist = roadInfo.distance;

      // Determine blend factor for branching dirt paths
      let minDirtDist = Infinity;
      for (const dSpline of dirtSplines) {
        const dInfo = getClosestPointOnSpline(dSpline, x, z, 20);
        if (dInfo.distance < minDirtDist) minDirtDist = dInfo.distance;
      }

      // Check proximity to clearings
      let clearingFactor = 0;
      for (const cl of CLEARINGS) {
        const dist = Math.hypot(x - cl.x, z - cl.z);
        if (dist < cl.radius) {
          clearingFactor = Math.max(clearingFactor, 1 - (dist / cl.radius));
        }
      }

      // Check riverbed proximity
      const riverDist = Math.abs(x - (-8 + Math.sin(z * 0.04) * 12));
      const inRiver = riverDist < 12;

      // Base grass color with organic patchiness
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

      // Steep cliff slope coloring
      if (h > 6.0) {
        const cliffFactor = Math.min(1.0, (h - 6.0) / 5.0);
        tempColor.lerp(colorCliffRock, cliffFactor * 0.85);
      }

      // Clearing dirt blending
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
      roughness: 0.82,
      metalness: 0.05,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'TerrainMesh';
    this.scene.add(this.mesh);

    // Create stylized low-poly shallow water / creek stream
    this.createRiverWater();
  }

  createRiverWater() {
    // Stylized translucent water plane with soft ripples
    const waterGeom = new THREE.PlaneGeometry(28, 140, 16, 40);
    waterGeom.rotateX(-Math.PI / 2);

    // Bend water slightly to follow the river channel
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
