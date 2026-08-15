import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

/**
 * GroundDecalSystem: Spawns lightweight, stylized ground decals
 * (oil stains, tire tracks, mud splatters, scorch marks, crack decals)
 * placed strictly at +0.015 to +0.025 above terrain/ground to avoid z-fighting.
 */
export class GroundDecalSystem {
  constructor(scene, roots) {
    this.scene = scene;
    this.roots = roots;
    this.group = new THREE.Group();
    this.group.name = 'GroundDecals_Group';
    this.scene.add(this.group);

    this.initDecalMaterials();
    this.buildAuthoredDecals();
  }

  initDecalMaterials() {
    // 1. Oil Stain Decal Texture
    const oilCanvas = document.createElement('canvas');
    oilCanvas.width = 128;
    oilCanvas.height = 128;
    const oCtx = oilCanvas.getContext('2d');
    const oGrad = oCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    oGrad.addColorStop(0, 'rgba(15, 18, 20, 0.88)');
    oGrad.addColorStop(0.5, 'rgba(25, 28, 30, 0.65)');
    oGrad.addColorStop(0.8, 'rgba(40, 42, 45, 0.3)');
    oGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    oCtx.fillStyle = oGrad;
    oCtx.beginPath();
    oCtx.arc(64, 64, 60, 0, Math.PI * 2);
    oCtx.fill();

    const oilTex = new THREE.CanvasTexture(oilCanvas);
    this.matOil = new THREE.MeshStandardMaterial({
      map: oilTex,
      transparent: true,
      roughness: 0.25, // Glossy wet oil
      metalness: 0.1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    // 2. Tire Skid Mark Decal Texture
    const tireCanvas = document.createElement('canvas');
    tireCanvas.width = 128;
    tireCanvas.height = 256;
    const tCtx = tireCanvas.getContext('2d');
    tCtx.fillStyle = 'rgba(22, 24, 25, 0.72)';
    // Dual tread lines
    tCtx.fillRect(20, 0, 24, 256);
    tCtx.fillRect(84, 0, 24, 256);
    // Weathering scratches
    for (let i = 0; i < 40; i++) {
      tCtx.clearRect(Math.random() * 128, Math.random() * 256, 12, 4);
    }
    const tireTex = new THREE.CanvasTexture(tireCanvas);
    this.matTire = new THREE.MeshStandardMaterial({
      map: tireTex,
      transparent: true,
      roughness: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    // 3. Mud / Dirt Accumulation Decal Texture
    const mudCanvas = document.createElement('canvas');
    mudCanvas.width = 128;
    mudCanvas.height = 128;
    const mCtx = mudCanvas.getContext('2d');
    const mGrad = mCtx.createRadialGradient(64, 64, 8, 64, 64, 58);
    mGrad.addColorStop(0, 'rgba(75, 55, 36, 0.85)');
    mGrad.addColorStop(0.6, 'rgba(95, 70, 45, 0.45)');
    mGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = mGrad;
    mCtx.fillRect(0, 0, 128, 128);
    const mudTex = new THREE.CanvasTexture(mudCanvas);
    this.matMud = new THREE.MeshStandardMaterial({
      map: mudTex,
      transparent: true,
      roughness: 0.70,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    // 4. Scorch / Ash Burn Decal Texture
    const scorchCanvas = document.createElement('canvas');
    scorchCanvas.width = 128;
    scorchCanvas.height = 128;
    const sCtx = scorchCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 58);
    sGrad.addColorStop(0, 'rgba(20, 18, 16, 0.92)');
    sGrad.addColorStop(0.5, 'rgba(45, 35, 30, 0.55)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.beginPath();
    sCtx.arc(64, 64, 60, 0, Math.PI * 2);
    sCtx.fill();
    const scorchTex = new THREE.CanvasTexture(scorchCanvas);
    this.matScorch = new THREE.MeshStandardMaterial({
      map: scorchTex,
      transparent: true,
      roughness: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
  }

  addDecal(parent, mat, sizeX, sizeZ, posX, posY, posZ, rotY = 0) {
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY + 0.02, posZ);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    mesh.userData.isWalkable = true;
    parent.add(mesh);
    return mesh;
  }

  buildAuthoredDecals() {
    // =========================================================================
    // 1. THE RELAY (Campfire Ash & Exit Gate Tire Tracks)
    // =========================================================================
    if (this.roots.relay) {
      // Scorch mark under campfire
      this.addDecal(this.roots.relay, this.matScorch, 3.2, 3.2, 4.5, 0.0, -2.0, 0.3);
      // Oil leak under diesel generator
      this.addDecal(this.roots.relay, this.matOil, 2.2, 1.8, -7.5, 0.0, 2.0, 0.1);
      // Heavy tire tracks leading through exit gate
      this.addDecal(this.roots.relay, this.matTire, 2.4, 8.0, 0.0, 0.0, 6.0, 0.0);
      // Mud patches around water tank
      this.addDecal(this.roots.relay, this.matMud, 3.0, 3.0, 6.8, 0.0, -6.2, 0.5);
    }

    // =========================================================================
    // 2. OCTANE MART (Oil Stains under Pumps & Forecourt Tire Tracks)
    // =========================================================================
    if (this.roots.gasStation) {
      // Oil stains under 3 fuel pumps
      this.addDecal(this.roots.gasStation, this.matOil, 2.4, 2.4, -2.0, 0.0, 3.2, 0.4);
      this.addDecal(this.roots.gasStation, this.matOil, 2.6, 2.6, 0.0, 0.0, 1.8, -0.2);
      this.addDecal(this.roots.gasStation, this.matOil, 2.4, 2.4, 2.0, 0.0, 3.4, 0.8);
      // Tire skid marks near turnoff curb
      this.addDecal(this.roots.gasStation, this.matTire, 2.6, 9.0, -5.5, 0.0, 12.0, 0.35);
      // Mud splatter near store corner
      this.addDecal(this.roots.gasStation, this.matMud, 3.5, 2.8, 4.8, 0.0, -6.5, 0.1);
    }

    // =========================================================================
    // 3. HIGHWAY TRAVERSAL SLICE (Skid marks & Spills)
    // =========================================================================
    // Slalom checkpoint skid mark at (-62, 34)
    const y1 = getTerrainHeight(-62.0, 34.0);
    this.addDecal(this.group, this.matTire, 2.2, 7.5, -62.0, y1, 34.0, 0.4);

    // Abandoned pickup oil leak at (-75.5, 49.0)
    const y2 = getTerrainHeight(-75.5, 49.0);
    this.addDecal(this.group, this.matOil, 2.8, 2.4, -75.5, y2, 49.0, 0.15);

    // Sports car turnoff skid at (-62.5, -16.0)
    const y3 = getTerrainHeight(-62.5, -16.0);
    this.addDecal(this.group, this.matTire, 2.4, 8.0, -62.5, y3, -16.0, -0.6);
  }
}
