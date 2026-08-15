import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MAP_CONFIG, CLEARINGS, roadSpline, dirtSplines, getTerrainHeight, getClosestPointOnSpline } from './MapData.js';
import { Terrain } from './Terrain.js';
import { RoadSystem } from './RoadSystem.js';
import { PropFactory } from './PropFactory.js';

/**
 * World: Orchestrates the terrain, road network, environmental props,
 * foliage, and reserved clearing zones.
 * Step 2.1: Loads and integrates the custom Blender low-poly Abandoned Gas Station.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.factory = new PropFactory();
    
    // Core systems
    this.terrain = new Terrain(this.scene);
    this.roadSystem = new RoadSystem(this.scene);
    
    // Instanced prop containers
    this.instancedMeshes = [];
    this.spawnEnvironmentalProps();

    // Load handcrafted GLB structures
    this.loadGasStation();
  }

  loadGasStation() {
    const loader = new GLTFLoader();
    loader.load('/models/abandoned_gas_station.glb', (gltf) => {
      const model = gltf.scene;
      model.name = 'AbandonedGasStation';
      
      const posX = -66;
      const posZ = -34;
      const posY = getTerrainHeight(posX, posZ) + 0.02;
      
      model.position.set(posX, posY, posZ);
      // Rotate 148 degrees to face storefront and pump island directly into isometric view
      model.rotation.y = Math.PI * 0.82;
      model.scale.set(1.15, 1.15, 1.15); // Exaggerated chunky landmark scale

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.flatShading = true;
            child.material.roughness = Math.max(0.4, child.material.roughness || 0.7);
            child.material.needsUpdate = true;
          }
        }
      });

      this.scene.add(model);
      console.log('Landmark Abandoned Gas Station loaded successfully at (-66, -34)');
    }, undefined, (error) => {
      console.error('Error loading gas station GLB:', error);
    });
  }

  spawnEnvironmentalProps() {
    const dummy = new THREE.Object3D();

    // 1. DENSE PERIMETER RIDGE & INTERIOR FOREST
    this.populateTrees(dummy);

    // 2. CLIFF BLUFFS, MOUNTAIN FORMATIONS & RIVERBED ROCKS
    this.populateRocks(dummy);

    // 3. BUSHES & UNDERGROWTH
    this.populateBushes(dummy);

    // 4. WILDFLOWERS & GRASS TUFTS
    this.populateGroundFoliage(dummy);

    // 5. ROAD DEBRIS, BARRIERS, BARRELS, SIGNS & FORTIFICATIONS
    this.populateEnvironmentalDebris(dummy);
  }

  populateTrees(dummy) {
    const pineCount = 750;
    const oakCount = 280;
    const birchCount = 200;
    const deadTreeCount = 80;

    // Multi-tier Pine Tree Instanced Group
    const pineTrunkMesh = new THREE.InstancedMesh(this.factory.geometries.pineTrunk, this.factory.materials.woodTrunk, pineCount);
    const pineT1Mesh = new THREE.InstancedMesh(this.factory.geometries.pineTierBottom, this.factory.materials.pineFoliageDark, pineCount);
    const pineT2Mesh = new THREE.InstancedMesh(this.factory.geometries.pineTierMid, this.factory.materials.pineFoliageLight, pineCount);
    const pineT3Mesh = new THREE.InstancedMesh(this.factory.geometries.pineTierTop, this.factory.materials.pineFoliageDark, pineCount);

    pineTrunkMesh.castShadow = true;
    pineT1Mesh.castShadow = true;
    pineT2Mesh.castShadow = true;
    pineT3Mesh.castShadow = true;

    let pIdx = 0;
    // Distribute pine trees across valley copses and dense perimeter mountain slopes (out to distance 240)
    for (let i = 0; i < pineCount * 3 && pIdx < pineCount; i++) {
      const rx = (Math.random() - 0.5) * 440;
      const rz = (Math.random() - 0.5) * 360;

      const isPerimeter = (Math.abs(rx) > 95 || Math.abs(rz) > 75);

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 8, minDirtDist: 4.5, allowInClearing: false, minRiverDist: 3.5 })) {
        continue;
      }

      // Higher density on outer mountain slopes
      if (!isPerimeter && Math.random() > 0.35) continue;

      const y = getTerrainHeight(rx, rz);
      // Scale up mountain pine trees slightly for dramatic silhouette
      const scale = (isPerimeter ? 1.0 + Math.random() * 0.9 : 0.8 + Math.random() * 0.6);
      const rotY = Math.random() * Math.PI * 2;
      const tiltX = (Math.random() - 0.5) * 0.08;
      const tiltZ = (Math.random() - 0.5) * 0.08;

      // Trunk
      dummy.position.set(rx, y + 1.6 * scale, rz);
      dummy.rotation.set(tiltX, rotY, tiltZ);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      pineTrunkMesh.setMatrixAt(pIdx, dummy.matrix);

      // Tier 1
      dummy.position.set(rx, y + 2.8 * scale, rz);
      dummy.updateMatrix();
      pineT1Mesh.setMatrixAt(pIdx, dummy.matrix);

      // Tier 2
      dummy.position.set(rx, y + 4.2 * scale, rz);
      dummy.updateMatrix();
      pineT2Mesh.setMatrixAt(pIdx, dummy.matrix);

      // Tier 3
      dummy.position.set(rx, y + 5.4 * scale, rz);
      dummy.updateMatrix();
      pineT3Mesh.setMatrixAt(pIdx, dummy.matrix);

      pIdx++;
    }

    pineTrunkMesh.count = pIdx;
    pineT1Mesh.count = pIdx;
    pineT2Mesh.count = pIdx;
    pineT3Mesh.count = pIdx;

    [pineTrunkMesh, pineT1Mesh, pineT2Mesh, pineT3Mesh].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });

    // Chunky Broadleaf / Oak Trees
    const oakTrunkMesh = new THREE.InstancedMesh(this.factory.geometries.oakTrunk, this.factory.materials.woodTrunk, oakCount);
    const oakCanopyMesh = new THREE.InstancedMesh(this.factory.geometries.oakCanopyMain, this.factory.materials.oakFoliageGreen, oakCount);
    const oakAutumnMesh = new THREE.InstancedMesh(this.factory.geometries.oakCanopySub, this.factory.materials.oakFoliageAutumn, oakCount);

    oakTrunkMesh.castShadow = true;
    oakCanopyMesh.castShadow = true;
    oakAutumnMesh.castShadow = true;

    let oIdx = 0;
    for (let i = 0; i < oakCount * 3 && oIdx < oakCount; i++) {
      const rx = (Math.random() - 0.5) * 320;
      const rz = (Math.random() - 0.5) * 260;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 9, minDirtDist: 5, allowInClearing: false, minRiverDist: 4 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.85 + Math.random() * 0.55;
      const rotY = Math.random() * Math.PI * 2;

      dummy.position.set(rx, y + 1.5 * scale, rz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      oakTrunkMesh.setMatrixAt(oIdx, dummy.matrix);

      dummy.position.set(rx, y + 3.8 * scale, rz);
      dummy.updateMatrix();
      oakCanopyMesh.setMatrixAt(oIdx, dummy.matrix);

      dummy.position.set(rx + 0.8 * scale, y + 4.6 * scale, rz + 0.6 * scale);
      dummy.scale.set(scale * 0.9, scale * 0.9, scale * 0.9);
      dummy.updateMatrix();
      oakAutumnMesh.setMatrixAt(oIdx, dummy.matrix);

      oIdx++;
    }

    oakTrunkMesh.count = oIdx;
    oakCanopyMesh.count = oIdx;
    oakAutumnMesh.count = oIdx;

    [oakTrunkMesh, oakCanopyMesh, oakAutumnMesh].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });

    // Birch Trees (slender white trunk with golden-green canopy)
    const birchTrunkMesh = new THREE.InstancedMesh(this.factory.geometries.birchTrunk, this.factory.materials.birchTrunk, birchCount);
    const birchCanopyMesh = new THREE.InstancedMesh(this.factory.geometries.birchCanopy, this.factory.materials.birchFoliage, birchCount);
    birchTrunkMesh.castShadow = true;
    birchCanopyMesh.castShadow = true;

    let bIdx = 0;
    for (let i = 0; i < birchCount * 3 && bIdx < birchCount; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 280;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 8, minDirtDist: 4, allowInClearing: false, minRiverDist: 3.5 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.8 + Math.random() * 0.5;
      const rotY = Math.random() * Math.PI * 2;

      dummy.position.set(rx, y + 2.1 * scale, rz);
      dummy.rotation.set((Math.random() - 0.5) * 0.06, rotY, (Math.random() - 0.5) * 0.06);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      birchTrunkMesh.setMatrixAt(bIdx, dummy.matrix);

      dummy.position.set(rx, y + 4.6 * scale, rz);
      dummy.updateMatrix();
      birchCanopyMesh.setMatrixAt(bIdx, dummy.matrix);

      bIdx++;
    }

    birchTrunkMesh.count = bIdx;
    birchCanopyMesh.count = bIdx;
    [birchTrunkMesh, birchCanopyMesh].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });

    // Dead / Gnarled Post-Apoc Trees
    const deadMesh = new THREE.InstancedMesh(this.factory.geometries.deadTrunk, this.factory.materials.deadWood, deadTreeCount);
    deadMesh.castShadow = true;
    let dIdx = 0;
    for (let i = 0; i < deadTreeCount * 4 && dIdx < deadTreeCount; i++) {
      const rx = (Math.random() - 0.5) * 280;
      const rz = (Math.random() - 0.5) * 220;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 7, minDirtDist: 3.5, allowInClearing: false, minRiverDist: 2 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.75 + Math.random() * 0.6;
      dummy.position.set(rx, y + 1.7 * scale, rz);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      deadMesh.setMatrixAt(dIdx++, dummy.matrix);
    }
    deadMesh.count = dIdx;
    deadMesh.instanceMatrix.needsUpdate = true;
    deadMesh.receiveShadow = true;
    this.scene.add(deadMesh);
    this.instancedMeshes.push(deadMesh);
  }

  populateRocks(dummy) {
    const largeRockCount = 180;
    const medRockCount = 200;
    const smallRockCount = 280;

    const largeRockMesh = new THREE.InstancedMesh(this.factory.geometries.boulderLarge, this.factory.materials.rockGrey, largeRockCount);
    const medRockMesh = new THREE.InstancedMesh(this.factory.geometries.boulderMed, this.factory.materials.rockMossy, medRockCount);
    const smallRockMesh = new THREE.InstancedMesh(this.factory.geometries.rockSmall, this.factory.materials.rockDark, smallRockCount);

    largeRockMesh.castShadow = true;
    medRockMesh.castShadow = true;
    smallRockMesh.castShadow = true;

    // Large Mountain Cliff Bluffs & Perimeter Formations
    let lIdx = 0;
    for (let i = 0; i < largeRockCount * 3 && lIdx < largeRockCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 300;

      const isPerimeter = (Math.abs(rx) > 90 || Math.abs(rz) > 70);

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 7, minDirtDist: 4, allowInClearing: false, minRiverDist: 1 })) {
        continue;
      }

      if (!isPerimeter && Math.random() > 0.4) continue;

      const y = getTerrainHeight(rx, rz);
      const scaleMultiplier = isPerimeter ? 1.8 + Math.random() * 1.6 : 1.0 + Math.random() * 0.8;
      const scaleX = scaleMultiplier * (0.9 + Math.random() * 0.3);
      const scaleY = scaleMultiplier * (0.8 + Math.random() * 0.6);
      const scaleZ = scaleMultiplier * (0.9 + Math.random() * 0.3);

      dummy.position.set(rx, y + (scaleY * 0.7), rz);
      dummy.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.updateMatrix();
      largeRockMesh.setMatrixAt(lIdx++, dummy.matrix);
    }
    largeRockMesh.count = lIdx;
    largeRockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(largeRockMesh);
    this.instancedMeshes.push(largeRockMesh);

    // Medium Rocks
    let mIdx = 0;
    for (let i = 0; i < medRockCount * 3 && mIdx < medRockCount; i++) {
      const rx = (Math.random() - 0.5) * 280;
      const rz = (Math.random() - 0.5) * 220;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 5.5, minDirtDist: 3, allowInClearing: false, minRiverDist: 0.5 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.7 + Math.random() * 0.7;

      dummy.position.set(rx, y + (scale * 0.5), rz);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI);
      dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.4), scale);
      dummy.updateMatrix();
      medRockMesh.setMatrixAt(mIdx++, dummy.matrix);
    }
    medRockMesh.count = mIdx;
    medRockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(medRockMesh);
    this.instancedMeshes.push(medRockMesh);

    // Small Scatter Rocks
    let sIdx = 0;
    for (let i = 0; i < smallRockCount * 2 && sIdx < smallRockCount; i++) {
      const rx = (Math.random() - 0.5) * 260;
      const rz = (Math.random() - 0.5) * 200;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 4, minDirtDist: 2, allowInClearing: true, minRiverDist: 0 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.6 + Math.random() * 0.6;

      dummy.position.set(rx, y + 0.2, rz);
      dummy.rotation.set(Math.random() * 2, Math.random() * Math.PI * 2, Math.random() * 2);
      dummy.scale.set(scale, scale * 0.6, scale);
      dummy.updateMatrix();
      smallRockMesh.setMatrixAt(sIdx++, dummy.matrix);
    }
    smallRockMesh.count = sIdx;
    smallRockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(smallRockMesh);
    this.instancedMeshes.push(smallRockMesh);
  }

  populateBushes(dummy) {
    const bushCount = 280;
    const greenBushMesh = new THREE.InstancedMesh(this.factory.geometries.bushRound, this.factory.materials.bushGreen, bushCount);
    const autumnBushMesh = new THREE.InstancedMesh(this.factory.geometries.bushCluster, this.factory.materials.bushAutumn, bushCount);

    greenBushMesh.castShadow = true;
    autumnBushMesh.castShadow = true;

    let gIdx = 0;
    let aIdx = 0;

    for (let i = 0; i < bushCount * 3 && (gIdx < bushCount || aIdx < bushCount); i++) {
      const rx = (Math.random() - 0.5) * 280;
      const rz = (Math.random() - 0.5) * 220;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 6.5, minDirtDist: 3.5, allowInClearing: false, minRiverDist: 2 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.75 + Math.random() * 0.65;
      const isAutumn = Math.random() > 0.65;

      dummy.position.set(rx, y + 0.6 * scale, rz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.4), scale);
      dummy.updateMatrix();

      if (isAutumn && aIdx < bushCount) {
        autumnBushMesh.setMatrixAt(aIdx++, dummy.matrix);
      } else if (gIdx < bushCount) {
        greenBushMesh.setMatrixAt(gIdx++, dummy.matrix);
      }
    }

    greenBushMesh.count = gIdx;
    greenBushMesh.instanceMatrix.needsUpdate = true;
    autumnBushMesh.count = aIdx;
    autumnBushMesh.instanceMatrix.needsUpdate = true;

    [greenBushMesh, autumnBushMesh].forEach(m => {
      m.receiveShadow = true;
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });
  }

  populateGroundFoliage(dummy) {
    const grassCount = 500;
    const flowerCount = 200;

    const grassMesh = new THREE.InstancedMesh(this.factory.geometries.grassBlade, this.factory.materials.grassTuft, grassCount);
    const flowerGoldMesh = new THREE.InstancedMesh(this.factory.geometries.flowerHead, this.factory.materials.flowerPetals, flowerCount);
    const flowerCyanMesh = new THREE.InstancedMesh(this.factory.geometries.flowerHead, this.factory.materials.flowerCyan, flowerCount);

    let grIdx = 0;
    let fgIdx = 0;
    let fcIdx = 0;

    for (let i = 0; i < grassCount * 2 && grIdx < grassCount; i++) {
      const rx = (Math.random() - 0.5) * 260;
      const rz = (Math.random() - 0.5) * 200;

      if (!this.isValidPropLocation(rx, rz, { minRoadDist: 5.5, minDirtDist: 2.8, allowInClearing: true, minRiverDist: 1 })) {
        continue;
      }

      const y = getTerrainHeight(rx, rz);
      const scale = 0.7 + Math.random() * 0.7;

      dummy.position.set(rx, y + 0.4 * scale, rz);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      grassMesh.setMatrixAt(grIdx++, dummy.matrix);

      if (Math.random() > 0.65) {
        dummy.position.set(rx, y + 0.85 * scale, rz);
        dummy.scale.setScalar(0.7 + Math.random() * 0.5);
        dummy.updateMatrix();

        if (Math.random() > 0.35 && fgIdx < flowerCount) {
          flowerGoldMesh.setMatrixAt(fgIdx++, dummy.matrix);
        } else if (fcIdx < flowerCount) {
          flowerCyanMesh.setMatrixAt(fcIdx++, dummy.matrix);
        }
      }
    }

    grassMesh.count = grIdx;
    grassMesh.instanceMatrix.needsUpdate = true;
    flowerGoldMesh.count = fgIdx;
    flowerGoldMesh.instanceMatrix.needsUpdate = true;
    flowerCyanMesh.count = fcIdx;
    flowerCyanMesh.instanceMatrix.needsUpdate = true;

    [grassMesh, flowerGoldMesh, flowerCyanMesh].forEach(m => {
      m.receiveShadow = true;
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });
  }

  populateEnvironmentalDebris(dummy) {
    // 1. Concrete Highway Jersey Barriers
    const barrierCount = 35;
    const barrierMesh = new THREE.InstancedMesh(this.factory.geometries.jerseyBarrier, this.factory.materials.concreteBarrier, barrierCount);
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;

    const barrierLocs = [
      // Starting overlook
      { x: -108, z: 82, rotY: 0.7 },
      { x: -106, z: 80, rotY: 0.75 },
      { x: -104, z: 78, rotY: 0.8 },
      { x: -90, z: 66, rotY: 0.4 },
      { x: -88, z: 64, rotY: 0.45 },
      // Road bend near Gas Station turnoff
      { x: -55, z: 54, rotY: 0.9 },
      { x: -53, z: 52, rotY: 0.95 },
      { x: -51, z: 50, rotY: 1.0 },
      // Road approach to riverbed
      { x: -22, z: 26, rotY: 0.3 },
      { x: -20, z: 24, rotY: 0.35 },
      // East road bend
      { x: 50, z: -14, rotY: -0.6 },
      { x: 52, z: -16, rotY: -0.65 },
      { x: 54, z: -18, rotY: -0.7 },
      // Military Checkpoint entrance roadblock
      { x: 88, z: -68, rotY: 1.2 },
      { x: 91, z: -66, rotY: 1.15 },
      { x: 96, z: -62, rotY: 0.5 },
      { x: 99, z: -60, rotY: 0.45 },
      { x: 104, z: -76, rotY: -0.8 },
      { x: 106, z: -78, rotY: -0.85 },
    ];

    let bIdx = 0;
    barrierLocs.forEach((loc) => {
      const y = getTerrainHeight(loc.x, loc.z) + 0.45;
      dummy.position.set(loc.x, y, loc.z);
      dummy.rotation.set((Math.random() - 0.5) * 0.08, loc.rotY + (Math.random() - 0.5) * 0.15, 0);
      dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      barrierMesh.setMatrixAt(bIdx++, dummy.matrix);
    });
    barrierMesh.count = bIdx;
    barrierMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(barrierMesh);
    this.instancedMeshes.push(barrierMesh);

    // 2. Barrels
    const barrelCount = 40;
    const barrelYMesh = new THREE.InstancedMesh(this.factory.geometries.metalBarrel, this.factory.materials.barrelYellow, barrelCount);
    const barrelRMesh = new THREE.InstancedMesh(this.factory.geometries.metalBarrel, this.factory.materials.barrelRed, barrelCount);
    const barrelBMesh = new THREE.InstancedMesh(this.factory.geometries.metalBarrel, this.factory.materials.barrelBlue, barrelCount);

    [barrelYMesh, barrelRMesh, barrelBMesh].forEach(m => {
      m.castShadow = true;
      m.receiveShadow = true;
    });

    const barrelClusters = [
      { cx: -60, cz: -30, count: 6 },
      { cx: 95, cz: -65, count: 8 },
      { cx: -15, cz: 35, count: 4 },
      { cx: -98, cz: 65, count: 4 },
      { cx: 30, cz: -55, count: 4 },
      { cx: 70, cz: 40, count: 3 },
    ];

    let byIdx = 0, brIdx = 0, bbIdx = 0;
    barrelClusters.forEach(cluster => {
      for (let k = 0; k < cluster.count; k++) {
        const bx = cluster.cx + (Math.random() - 0.5) * 4;
        const bz = cluster.cz + (Math.random() - 0.5) * 4;
        const by = getTerrainHeight(bx, bz) + 0.65;
        const isKnockedOver = Math.random() > 0.65;

        dummy.position.set(bx, isKnockedOver ? by - 0.35 : by, bz);
        if (isKnockedOver) {
          dummy.rotation.set(Math.PI / 2, Math.random() * Math.PI, Math.random() * 0.4);
        } else {
          dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        }
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();

        const roll = Math.random();
        if (roll < 0.45 && byIdx < barrelCount) {
          barrelYMesh.setMatrixAt(byIdx++, dummy.matrix);
        } else if (roll < 0.8 && brIdx < barrelCount) {
          barrelRMesh.setMatrixAt(brIdx++, dummy.matrix);
        } else if (bbIdx < barrelCount) {
          barrelBMesh.setMatrixAt(bbIdx++, dummy.matrix);
        }
      }
    });

    barrelYMesh.count = byIdx;
    barrelYMesh.instanceMatrix.needsUpdate = true;
    barrelRMesh.count = brIdx;
    barrelRMesh.instanceMatrix.needsUpdate = true;
    barrelBMesh.count = bbIdx;
    barrelBMesh.instanceMatrix.needsUpdate = true;

    [barrelYMesh, barrelRMesh, barrelBMesh].forEach(m => {
      this.scene.add(m);
      this.instancedMeshes.push(m);
    });

    // 3. Wooden Crates
    const crateCount = 30;
    const crateMesh = new THREE.InstancedMesh(this.factory.geometries.woodenCrate, this.factory.materials.woodenCrate, crateCount);
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;

    let crIdx = 0;
    barrelClusters.forEach(cluster => {
      const numCrates = Math.floor(Math.random() * 3) + 1;
      for (let k = 0; k < numCrates && crIdx < crateCount; k++) {
        const cx = cluster.cx + (Math.random() - 0.5) * 5;
        const cz = cluster.cz + (Math.random() - 0.5) * 5;
        const cy = getTerrainHeight(cx, cz) + 0.55;

        dummy.position.set(cx, cy, cz);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.setScalar(0.85 + Math.random() * 0.4);
        dummy.updateMatrix();
        crateMesh.setMatrixAt(crIdx++, dummy.matrix);
      }
    });
    crateMesh.count = crIdx;
    crateMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(crateMesh);
    this.instancedMeshes.push(crateMesh);

    // 4. Tires
    const tireCount = 35;
    const tireMesh = new THREE.InstancedMesh(this.factory.geometries.tire, this.factory.materials.tireRubber, tireCount);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;

    let tIdx = 0;
    for (let i = 0; i < 10; i++) {
      const pt = roadSpline.getPoint(0.1 + (i / 10) * 0.8);
      const tx = pt.x + (Math.random() - 0.5) * 12;
      const tz = pt.z + (Math.random() - 0.5) * 12;
      const th = getTerrainHeight(tx, tz);

      const stackHeight = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < stackHeight && tIdx < tireCount; s++) {
        dummy.position.set(tx + (s * 0.05), th + 0.2 + s * 0.4, tz);
        dummy.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        tireMesh.setMatrixAt(tIdx++, dummy.matrix);
      }
    }
    tireMesh.count = tIdx;
    tireMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(tireMesh);
    this.instancedMeshes.push(tireMesh);

    // 5. Road Signs
    this.createRoadSigns(dummy);

    // 6. Farm Fences
    this.createFarmFencing(dummy);

    // 7. Checkpoint Sandbag Fortifications
    this.createSandbagFortifications(dummy);
  }

  createRoadSigns(dummy) {
    const signGroup = new THREE.Group();
    signGroup.name = 'RoadSigns';

    const signLocations = [
      { x: -96, z: 62, rotY: 0.5, type: 'diamond', tilt: 0.12 },
      { x: -58, z: 42, rotY: 1.1, type: 'rect', tilt: -0.08 },
      { x: -22, z: 28, rotY: 0.4, type: 'diamond', tilt: 0.2 },
      { x: 22, z: 6, rotY: 1.8, type: 'rect', tilt: 0.05 },
      { x: 48, z: -12, rotY: -0.8, type: 'rect', tilt: -0.15 },
      { x: 86, z: -58, rotY: 1.0, type: 'rect', tilt: 0.08 },
      { x: 118, z: -82, rotY: -0.7, type: 'diamond', tilt: 0.25 },
    ];

    signLocations.forEach(loc => {
      const pole = new THREE.Mesh(this.factory.geometries.signPole, this.factory.materials.signPole);
      const signY = getTerrainHeight(loc.x, loc.z);
      pole.position.set(loc.x, signY + 1.3, loc.z);
      pole.rotation.set(loc.tilt, loc.rotY, (Math.random() - 0.5) * 0.1);
      pole.castShadow = true;
      signGroup.add(pole);

      const plateGeom = loc.type === 'diamond' ? this.factory.geometries.signPlateDiamond : this.factory.geometries.signPlateRect;
      const plate = new THREE.Mesh(plateGeom, this.factory.materials.signPlate);
      plate.position.set(0, 0.8, 0.08);
      if (loc.type === 'diamond') {
        plate.rotation.z = Math.PI / 4;
      }
      plate.castShadow = true;
      pole.add(plate);
    });

    this.scene.add(signGroup);
  }

  createFarmFencing(dummy) {
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'FarmFences';

    const farmOriginX = 78;
    const farmOriginZ = 48;
    const fencePosts = 16;
    const fenceRadius = 24;

    for (let i = 0; i < fencePosts; i++) {
      if (i >= 12 && i <= 14) continue;

      const angle = (i / fencePosts) * Math.PI * 2;
      const fx = farmOriginX + Math.cos(angle) * fenceRadius;
      const fz = farmOriginZ + Math.sin(angle) * fenceRadius;

      if (Math.random() > 0.85) continue;

      const fy = getTerrainHeight(fx, fz);
      const post = new THREE.Mesh(this.factory.geometries.fencePost, this.factory.materials.woodTrunk);
      post.position.set(fx, fy + 0.8, fz);
      post.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI, (Math.random() - 0.5) * 0.15);
      post.castShadow = true;
      fenceGroup.add(post);

      if (i < fencePosts - 1 && Math.random() > 0.25) {
        const nextAngle = ((i + 1) / fencePosts) * Math.PI * 2;
        const nfx = farmOriginX + Math.cos(nextAngle) * fenceRadius;
        const nfz = farmOriginZ + Math.sin(nextAngle) * fenceRadius;
        const midX = (fx + nfx) / 2;
        const midZ = (fz + nfz) / 2;
        const midY = getTerrainHeight(midX, midZ) + 0.7;

        const rail = new THREE.Mesh(this.factory.geometries.fenceRail, this.factory.materials.woodTrunk);
        rail.position.set(midX, midY, midZ);
        rail.rotation.y = -Math.atan2(nfz - fz, nfx - fx);
        rail.castShadow = true;
        fenceGroup.add(rail);
      }
    }

    this.scene.add(fenceGroup);
  }

  createSandbagFortifications(dummy) {
    const sandbagGroup = new THREE.Group();
    sandbagGroup.name = 'CheckpointSandbags';

    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x9b8e72,
      roughness: 0.9,
      flatShading: true,
    });

    const cpX = 98;
    const cpZ = -70;
    const bunkerWidth = 6;

    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < bunkerWidth; i++) {
        const sx = cpX + (i - bunkerWidth / 2) * 0.85;
        const sz = cpZ;
        const sy = getTerrainHeight(sx, sz) + 0.18 + (row * 0.3);

        const sb = new THREE.Mesh(this.factory.geometries.sandbag, sandbagMat);
        sb.position.set(sx, sy, sz);
        sb.rotation.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.1, 0);
        sb.castShadow = true;
        sb.receiveShadow = true;
        sandbagGroup.add(sb);
      }
    }

    this.scene.add(sandbagGroup);
  }

  isValidPropLocation(x, z, opts = {}) {
    const {
      minRoadDist = 7,
      minDirtDist = 4,
      allowInClearing = false,
      minRiverDist = 2
    } = opts;

    const roadInfo = getClosestPointOnSpline(roadSpline, x, z, 30);
    if (roadInfo.distance < minRoadDist) return false;

    for (const dSpline of dirtSplines) {
      const dInfo = getClosestPointOnSpline(dSpline, x, z, 20);
      if (dInfo.distance < minDirtDist) return false;
    }

    if (!allowInClearing) {
      for (const cl of CLEARINGS) {
        const dist = Math.hypot(x - cl.x, z - cl.z);
        if (dist < cl.radius * 0.85) return false;
      }
    }

    const riverDist = Math.abs(x - (-8 + Math.sin(z * 0.04) * 12));
    if (riverDist < minRiverDist && Math.abs(z) < 110) return false;

    return true;
  }
}
