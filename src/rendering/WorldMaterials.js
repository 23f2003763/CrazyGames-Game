import * as THREE from 'three';
import { proceduralTextures } from './ProceduralTextures.js';

/**
 * WorldMaterials: Single authoritative material registry providing calibrated PBR
 * materials with procedural diffuse & roughness maps across all terrain, props, and landmarks.
 */
class MaterialRegistry {
  constructor() {
    this.initMaterials();
  }

  initMaterials() {
    const dirtMaps = proceduralTextures.getDirtTexture(256);
    const grassMaps = proceduralTextures.getGrassTexture(256);
    const asphaltMaps = proceduralTextures.getAsphaltTexture(256);
    const concreteMaps = proceduralTextures.getConcreteTexture(256);
    const rockMaps = proceduralTextures.getRockTexture(256);

    // =========================================================================
    // 1. GROUND MATERIAL FAMILY
    // =========================================================================
    this.GROUND_GRASS = new THREE.MeshStandardMaterial({
      color: 0x587a38,
      map: grassMaps.diffuse,
      roughnessMap: grassMaps.roughness,
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
    });

    this.GROUND_DRY_GRASS = new THREE.MeshStandardMaterial({
      color: 0x7a8244,
      map: grassMaps.diffuse,
      roughnessMap: grassMaps.roughness,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    });

    this.GROUND_DIRT = new THREE.MeshStandardMaterial({
      color: 0x68543e,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.92,
      metalness: 0.03,
      flatShading: true,
    });

    this.GROUND_MUD = new THREE.MeshStandardMaterial({
      color: 0x483625,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.45, // Glossy / wet mud
      metalness: 0.08,
      flatShading: true,
    });

    this.GROUND_GRAVEL = new THREE.MeshStandardMaterial({
      color: 0x6e685c,
      map: concreteMaps.diffuse,
      roughnessMap: concreteMaps.roughness,
      roughness: 0.95,
      metalness: 0.04,
      flatShading: true,
    });

    this.GROUND_ASPHALT = new THREE.MeshStandardMaterial({
      color: 0x383a3d,
      map: asphaltMaps.diffuse,
      roughnessMap: asphaltMaps.roughness,
      roughness: 0.82,
      metalness: 0.06,
      flatShading: true,
    });

    this.GROUND_CRACKED_ASPHALT = new THREE.MeshStandardMaterial({
      color: 0x303235,
      map: asphaltMaps.diffuse,
      roughnessMap: asphaltMaps.roughness,
      roughness: 0.86,
      metalness: 0.05,
      flatShading: true,
    });

    this.GROUND_CONCRETE = new THREE.MeshStandardMaterial({
      color: 0x76797c,
      map: concreteMaps.diffuse,
      roughnessMap: concreteMaps.roughness,
      roughness: 0.84,
      metalness: 0.05,
      flatShading: true,
    });

    this.GROUND_SCORCHED = new THREE.MeshStandardMaterial({
      color: 0x242220,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    });

    // =========================================================================
    // 2. ROCK MATERIAL FAMILY (Geological variation)
    // =========================================================================
    this.ROCK_GREY = new THREE.MeshStandardMaterial({
      color: 0x60656a,
      map: rockMaps.diffuse,
      roughnessMap: rockMaps.roughness,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: true,
    });

    this.ROCK_WARM = new THREE.MeshStandardMaterial({
      color: 0x746658,
      map: rockMaps.diffuse,
      roughnessMap: rockMaps.roughness,
      roughness: 0.85,
      metalness: 0.04,
      flatShading: true,
    });

    this.ROCK_DARK = new THREE.MeshStandardMaterial({
      color: 0x383a3e,
      map: rockMaps.diffuse,
      roughnessMap: rockMaps.roughness,
      roughness: 0.78,
      metalness: 0.08,
      flatShading: true,
    });

    this.ROCK_MOSSY = new THREE.MeshStandardMaterial({
      color: 0x546648,
      map: rockMaps.diffuse,
      roughnessMap: rockMaps.roughness,
      roughness: 0.88,
      metalness: 0.03,
      flatShading: true,
    });

    // Array of geological rock materials for deterministic instancing
    this.ROCK_VARIATIONS = [
      this.ROCK_GREY,
      this.ROCK_WARM,
      this.ROCK_DARK,
      this.ROCK_MOSSY
    ];

    // =========================================================================
    // 3. STRUCTURES & HARD SURFACE MATERIALS
    // =========================================================================
    this.WOOD_DRY = new THREE.MeshStandardMaterial({
      color: 0x786048,
      map: dirtMaps.diffuse,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: true,
    });

    this.WOOD_DARK = new THREE.MeshStandardMaterial({
      color: 0x48382c,
      map: dirtMaps.diffuse,
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
    });

    this.METAL_RUSTED = new THREE.MeshStandardMaterial({
      color: 0x7c4228,
      roughness: 0.85,
      metalness: 0.35,
      flatShading: true,
    });

    this.METAL_PAINTED = new THREE.MeshStandardMaterial({
      color: 0x3e5868,
      roughness: 0.65,
      metalness: 0.40,
      flatShading: true,
    });

    this.CONCRETE_AGED = new THREE.MeshStandardMaterial({
      color: 0x6e7175,
      map: concreteMaps.diffuse,
      roughnessMap: concreteMaps.roughness,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
    });
  }
}

export const WORLD_MATERIALS = new MaterialRegistry();
