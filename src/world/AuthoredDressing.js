import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MapData.js';
import { PropFactory } from './PropFactory.js';

/**
 * Authored Dressing System for Step 2.3:
 * Explicit, handcrafted environmental composition around the 40–50 meter
 * approach to the Abandoned Gas Station landmark.
 * 
 * Features:
 * - Utility poles with sagging electrical catenary wires
 * - 2 Abandoned Vehicles (Wrecked Delivery Van with cargo & Police Cruiser with lightbar)
 * - Broken corrugated guardrail sections along curved road edge
 * - Highway turnoff roadblock / quarantine checkpoint with clear 6.5m navigation lane
 * - Roadside warning signs & distance markers
 * - Clustered weed tufts, cracked asphalt transitions, and tire stacks
 * - Framing background trees providing cinematic depth without occluding camera
 */
export class AuthoredDressing {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'AuthoredDressing_GasStationApproach';
    this.scene.add(this.group);

    this.propFactory = new PropFactory();

    this.buildApproachScene();
  }

  buildApproachScene() {
    this.spawnUtilityPolesAndWires();
    this.spawnApproachVehicles();
    this.spawnRoadBlockade();
    this.spawnGuardrails();
    this.spawnRoadsideSigns();
    this.spawnTirePilesAndDebris();
    this.spawnCrackedAsphaltTransitions();
    this.spawnFramingTrees();
    this.spawnClusteredWeeds();
  }

  // =========================================================================
  // 1. LEANING UTILITY POLES WITH SAGGING CATENARY WIRES
  // =========================================================================
  spawnUtilityPolesAndWires() {
    // Explicit pole placements along eastern road shoulder
    const poleData = [
      { x: -58.0, z: 46.0, tiltX: 0.08, tiltZ: -0.12 },
      { x: -60.5, z: 22.0, tiltX: -0.06, tiltZ: 0.10 },
      { x: -62.8, z: -2.0, tiltX: 0.05, tiltZ: -0.08 },
      { x: -65.2, z: -24.0, tiltX: -0.04, tiltZ: 0.12 },
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x48321e, roughness: 0.9, flatShading: true });
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x362516, roughness: 0.85, flatShading: true });
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.6, metalness: 0.4 });
    const transMat = new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.5, metalness: 0.6, flatShading: true });

    const wireConnectionPoints = [];

    poleData.forEach((p, idx) => {
      const y = getTerrainHeight(p.x, p.z);
      const poleGrp = new THREE.Group();
      poleGrp.position.set(p.x, y, p.z);
      poleGrp.rotation.set(p.tiltX, 0, p.tiltZ);

      // Main timber pole (8.5m high)
      const poleGeo = new THREE.CylinderGeometry(0.18, 0.24, 8.5, 6);
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.y = 4.25;
      poleMesh.castShadow = true;
      poleMesh.receiveShadow = true;
      poleGrp.add(poleMesh);

      // Cross-arms
      const crossGeo = new THREE.BoxGeometry(2.4, 0.16, 0.16);
      const cross1 = new THREE.Mesh(crossGeo, crossMat);
      cross1.position.set(0, 7.8, 0);
      cross1.castShadow = true;
      poleGrp.add(cross1);

      // Transformer cylinder on pole #2
      if (idx === 1) {
        const transGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8);
        const transMesh = new THREE.Mesh(transGeo, transMat);
        transMesh.position.set(0.45, 6.2, 0);
        transMesh.castShadow = true;
        poleGrp.add(transMesh);
      }

      this.group.add(poleGrp);

      // Record world position of the top cross-arm for wire spans
      const wireTipL = new THREE.Vector3(p.x - 1.0, y + 7.8, p.z);
      const wireTipR = new THREE.Vector3(p.x + 1.0, y + 7.8, p.z);
      wireConnectionPoints.push({ left: wireTipL, right: wireTipR });
    });

    // Add termination point at the gas station building
    const stationWireTermL = new THREE.Vector3(-68.5, getTerrainHeight(-68.5, -34.0) + 5.5, -34.0);
    const stationWireTermR = new THREE.Vector3(-66.5, getTerrainHeight(-66.5, -34.0) + 5.5, -34.0);
    wireConnectionPoints.push({ left: stationWireTermL, right: stationWireTermR });

    // Generate catenary sagging wires between poles
    for (let i = 0; i < wireConnectionPoints.length - 1; i++) {
      const pA = wireConnectionPoints[i];
      const pB = wireConnectionPoints[i + 1];

      ['left', 'right'].forEach((side) => {
        const start = pA[side];
        const end = pB[side];
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y -= 1.6; // Sag depth

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.025, 4, false);
        const tubeMesh = new THREE.Mesh(tubeGeo, wireMat);
        tubeMesh.castShadow = true;
        this.group.add(tubeMesh);
      });
    }
  }

  // =========================================================================
  // 2. ABANDONED VEHICLES (Delivery Van & Police Patrol Cruiser)
  // =========================================================================
  spawnApproachVehicles() {
    const loader = new GLTFLoader();
    loader.load('/models/approach_vehicles.glb', (gltf) => {
      const model = gltf.scene;

      // Extract Van and Police cruiser children
      const vanGroup = new THREE.Group();
      const copGroup = new THREE.Group();

      const children = [...model.children];
      children.forEach((child) => {
        if (child.name.startsWith('Van_')) {
          vanGroup.add(child);
        } else if (child.name.startsWith('Cop_')) {
          copGroup.add(child);
        }
      });

      // Apply shadow and material parameters
      [vanGroup, copGroup].forEach((grp) => {
        grp.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.material) {
              c.material.flatShading = true;
              c.material.roughness = THREE.MathUtils.clamp(c.material.roughness ?? 0.6, 0.3, 0.95);
            }
          }
        });
      });

      // 1. Place Abandoned Delivery Van on roadside ditch at (-61.0, 14.0)
      const vanX = -61.0;
      const vanZ = 14.0;
      const vanY = getTerrainHeight(vanX, vanZ) + 0.05;
      vanGroup.position.set(vanX, vanY, vanZ);
      vanGroup.rotation.set(0.12, -0.65, -0.08); // Tilted in ditch
      vanGroup.scale.set(1.1, 1.1, 1.1);
      this.group.add(vanGroup);

      // 2. Place Abandoned Police Cruiser on road shoulder at (-63.0, -16.0)
      // Note: model's Cop_ group has built-in +12 X offset in Blender, counteract it
      const copX = -63.0 - 12.0 * 1.05;
      const copZ = -16.0;
      const copY = getTerrainHeight(-63.0, copZ) + 0.05;
      copGroup.position.set(copX, copY, copZ);
      copGroup.rotation.set(-0.06, 0.75, 0.08);
      copGroup.scale.set(1.05, 1.05, 1.05);
      this.group.add(copGroup);

      console.log('Authored approach vehicles loaded successfully');
    }, undefined, (err) => {
      console.error('Error loading approach vehicles GLB:', err);
    });
  }

  // =========================================================================
  // 3. ROADBLOCK / CHECKPOINT BARRIER AT MAIN ROAD TURNOFF
  // =========================================================================
  spawnRoadBlockade() {
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85, flatShading: true });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdf4812, roughness: 0.6, flatShading: true });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x9c825a, roughness: 0.9, flatShading: true });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 0.5, metalness: 0.6 });

    // Barrier 1 (Left flank at -63.5, 45.5)
    const b1Y = getTerrainHeight(-63.5, 45.5);
    const b1 = this.createJerseyBarrier(barrierMat, stripeMat);
    b1.position.set(-63.5, b1Y, 45.5);
    b1.rotation.set(0, 0.35, 0);
    this.group.add(b1);

    // Sandbag stack next to Barrier 1
    for (let sy = 0; sy < 3; sy++) {
      for (let sx = 0; sx < 2; sx++) {
        const bagGeo = new THREE.BoxGeometry(0.7, 0.28, 0.45);
        const bag = new THREE.Mesh(bagGeo, sandbagMat);
        bag.position.set(-65.0 + sx * 0.4, b1Y + 0.14 + sy * 0.26, 46.2);
        bag.rotation.set(0, 0.2, 0);
        bag.castShadow = true;
        bag.receiveShadow = true;
        this.group.add(bag);
      }
    }

    // Barrier 2 (Right flank at -56.5, 43.5 - leaving 7.0m clear gap in middle)
    const b2Y = getTerrainHeight(-56.5, 43.5);
    const b2 = this.createJerseyBarrier(barrierMat, stripeMat);
    b2.position.set(-56.5, b2Y, 43.5);
    b2.rotation.set(0, -0.4, 0);
    this.group.add(b2);

    // Wood & metal striped warning saw-horse barrier tilted in ditch
    const sawGeo = new THREE.BoxGeometry(2.4, 0.9, 0.2);
    const sawMesh = new THREE.Mesh(sawGeo, stripeMat);
    sawMesh.position.set(-66.2, b1Y + 0.45, 44.2);
    sawMesh.rotation.set(0.2, 0.6, -0.15);
    sawMesh.castShadow = true;
    this.group.add(sawMesh);
  }

  createJerseyBarrier(bodyMat, stripeMat) {
    const grp = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(3.0, 0.4, 0.8);
    const topGeo = new THREE.BoxGeometry(2.8, 0.7, 0.4);
    const stripeGeo = new THREE.BoxGeometry(2.82, 0.25, 0.42);

    const base = new THREE.Mesh(baseGeo, bodyMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;

    const top = new THREE.Mesh(topGeo, bodyMat);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;

    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.75;
    stripe.castShadow = true;

    grp.add(base, top, stripe);
    return grp;
  }

  // =========================================================================
  // 4. BROKEN CORRUGATED GUARDRAIL SECTIONS
  // =========================================================================
  spawnGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8a9296, roughness: 0.6, metalness: 0.5, flatShading: true });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x72361e, roughness: 0.85, metalness: 0.3, flatShading: true });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x363a3d, roughness: 0.7, metalness: 0.4 });

    const guardrailSegments = [
      { x: -55.0, z: 40.0, rotY: 0.4, length: 4.5, bent: false },
      { x: -56.5, z: 35.0, rotY: 0.35, length: 4.5, bent: false },
      { x: -58.0, z: 30.0, rotY: 0.3, length: 4.5, bent: true },  // Vehicle impact point!
      { x: -60.0, z: 24.5, rotY: 0.25, length: 4.5, bent: false },
      { x: -62.0, z: 5.0, rotY: 0.15, length: 4.0, bent: false },
      { x: -63.5, z: 0.0, rotY: 0.1, length: 4.0, bent: true },
    ];

    guardrailSegments.forEach((seg, sIdx) => {
      const y = getTerrainHeight(seg.x, seg.z);
      const grp = new THREE.Group();
      grp.position.set(seg.x, y, seg.z);
      grp.rotation.y = seg.rotY;

      // 2 I-Beam Steel Posts
      [-seg.length * 0.4, seg.length * 0.4].forEach((px) => {
        const postGeo = new THREE.BoxGeometry(0.14, 1.2, 0.14);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0.6, 0);
        post.castShadow = true;
        grp.add(post);
      });

      // Horizontal W-Beam
      const beamMat = seg.bent ? rustMat : railMat;
      const beamGeo = new THREE.BoxGeometry(seg.length, 0.45, 0.12);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 0.75, 0.06);
      if (seg.bent) {
        beam.rotation.set(0.25, 0.15, 0.1);
        beam.position.z += 0.2;
      }
      beam.castShadow = true;
      beam.receiveShadow = true;
      grp.add(beam);

      this.group.add(grp);
    });
  }

  // =========================================================================
  // 5. ROADSIDE WARNING & DISTANCE SIGNAGE
  // =========================================================================
  spawnRoadsideSigns() {
    const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x126834, roughness: 0.5, flatShading: true }); // Highway Green
    const signBorderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const signYellowMat = new THREE.MeshStandardMaterial({ color: 0xf5b812, roughness: 0.4, flatShading: true });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2e3235, roughness: 0.6, metalness: 0.6 });

    // 1. Large Highway Turnoff Sign: "GAS & REPAIR 500m" at (-57.0, 48.0)
    const sign1Y = getTerrainHeight(-57.0, 48.0);
    const sign1Grp = new THREE.Group();
    sign1Grp.position.set(-57.0, sign1Y, 48.0);
    sign1Grp.rotation.set(0.08, -0.45, -0.15); // Tilted

    // Dual steel legs
    [-1.1, 1.1].forEach((px) => {
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 6);
      const leg = new THREE.Mesh(legGeo, poleMat);
      leg.position.set(px, 1.9, 0);
      leg.castShadow = true;
      sign1Grp.add(leg);
    });

    const boardGeo = new THREE.BoxGeometry(2.8, 1.6, 0.1);
    const board = new THREE.Mesh(boardGeo, signBoardMat);
    board.position.set(0, 3.0, 0.06);
    board.castShadow = true;

    const boardTrimGeo = new THREE.BoxGeometry(2.86, 1.66, 0.06);
    const boardTrim = new THREE.Mesh(boardTrimGeo, signBorderMat);
    boardTrim.position.set(0, 3.0, 0.04);

    // 3D Directional arrow bar
    const arrowGeo = new THREE.BoxGeometry(1.6, 0.22, 0.06);
    const arrow = new THREE.Mesh(arrowGeo, signBorderMat);
    arrow.position.set(0, 2.6, 0.12);

    sign1Grp.add(boardTrim, board, arrow);
    this.group.add(sign1Grp);

    // 2. Yellow Diamond Warning Sign: "BIO-HAZARD DETOUR" at (-60.5, 28.0)
    const sign2Y = getTerrainHeight(-60.5, 28.0);
    const sign2Grp = new THREE.Group();
    sign2Grp.position.set(-60.5, sign2Y, 28.0);
    sign2Grp.rotation.set(-0.06, 0.6, 0.12);

    const pole2Geo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6);
    const pole2 = new THREE.Mesh(pole2Geo, poleMat);
    pole2.position.y = 1.6;
    pole2.castShadow = true;

    const diamondGeo = new THREE.BoxGeometry(1.3, 1.3, 0.08);
    const diamond = new THREE.Mesh(diamondGeo, signYellowMat);
    diamond.position.set(0, 2.5, 0.06);
    diamond.rotation.z = Math.PI * 0.25; // 45 degree diamond
    diamond.castShadow = true;

    sign2Grp.add(pole2, diamond);
    this.group.add(sign2Grp);
  }

  // =========================================================================
  // 6. TIRE PILES, DISCARDED BARRELS & DEBRIS TRAILS
  // =========================================================================
  spawnTirePilesAndDebris() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x161819, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x583a1e, roughness: 0.88, flatShading: true });
    const barrelRedMat = new THREE.MeshStandardMaterial({ color: 0x981e14, roughness: 0.5, metalness: 0.3, flatShading: true });
    const barrelYellowMat = new THREE.MeshStandardMaterial({ color: 0xdaa518, roughness: 0.5, metalness: 0.3, flatShading: true });

    // Explicit tire stacks along the road verge
    const tireClusterLocations = [
      { x: -59.5, z: 38.0, count: 4 },
      { x: -62.5, z: 18.5, count: 3 },
      { x: -60.0, z: -8.0, count: 5 },
      { x: -67.5, z: -18.0, count: 4 }
    ];

    tireClusterLocations.forEach((tc) => {
      const y = getTerrainHeight(tc.x, tc.z);
      for (let t = 0; t < tc.count; t++) {
        const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 8);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.position.set(tc.x + Math.sin(t * 1.4) * 0.08, y + 0.13 + t * 0.24, tc.z + Math.cos(t * 1.4) * 0.08);
        tire.rotation.set(0.04 * t, t * 0.3, -0.03 * t);
        tire.castShadow = true;
        tire.receiveShadow = true;
        this.group.add(tire);
      }
      // Add a loose flat tire nearby
      const flatTireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.24, 8);
      const flatTire = new THREE.Mesh(flatTireGeo, tireMat);
      flatTire.position.set(tc.x + 0.8, y + 0.12, tc.z - 0.5);
      flatTire.rotation.set(0.1, 0, 0.3);
      flatTire.castShadow = true;
      this.group.add(flatTire);
    });

    // Discarded Barrels & Pallets near Van Cargo Spill
    const debrisData = [
      { type: 'barrel_red', x: -62.5, z: 12.0, rot: [1.57, 0, 0.6] },
      { type: 'barrel_yellow', x: -59.2, z: 15.5, rot: [0, 0, 0] },
      { type: 'pallet', x: -63.0, z: 15.0, rot: [0, 0.2, 0.1] },
      { type: 'pallet', x: -60.5, z: -10.0, rot: [0.1, -0.3, 0] },
      { type: 'barrel_red', x: -64.0, z: -12.0, rot: [0, 0, 0] }
    ];

    debrisData.forEach((d) => {
      const y = getTerrainHeight(d.x, d.z);
      if (d.type === 'barrel_red' || d.type === 'barrel_yellow') {
        const bMat = d.type === 'barrel_red' ? barrelRedMat : barrelYellowMat;
        const bGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 8);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(d.x, y + 0.6, d.z);
        bMesh.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        this.group.add(bMesh);
      } else if (d.type === 'pallet') {
        const pGeo = new THREE.BoxGeometry(1.4, 0.16, 1.4);
        const pMesh = new THREE.Mesh(pGeo, woodMat);
        pMesh.position.set(d.x, y + 0.1, d.z);
        pMesh.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
        pMesh.castShadow = true;
        pMesh.receiveShadow = true;
        this.group.add(pMesh);
      }
    });
  }

  // =========================================================================
  // 7. CRACKED ASPHALT TRANSITION INTO STATION
  // =========================================================================
  spawnCrackedAsphaltTransitions() {
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.92, flatShading: true });
    
    // Explicit fractured asphalt patches leading from main road turnoff toward the station forecourt
    const patchData = [
      { x: -59.5, z: 46.0, sx: 4.5, sz: 3.2, rot: 0.1 },
      { x: -61.0, z: 36.0, sx: 4.2, sz: 3.8, rot: -0.08 },
      { x: -62.5, z: 26.0, sx: 4.6, sz: 3.6, rot: 0.12 },
      { x: -64.0, z: 16.0, sx: 4.4, sz: 3.5, rot: -0.05 },
      { x: -65.0, z: 6.0, sx: 4.8, sz: 3.8, rot: 0.08 },
      { x: -66.0, z: -4.0, sx: 5.2, sz: 4.2, rot: -0.1 },
      { x: -66.5, z: -14.0, sx: 5.6, sz: 4.5, rot: 0.05 }
    ];

    patchData.forEach((pd, pIdx) => {
      const y = getTerrainHeight(pd.x, pd.z) + 0.03;
      const patchGeo = new THREE.BoxGeometry(pd.sx, 0.12, pd.sz);
      const patch = new THREE.Mesh(patchGeo, asphaltMat);
      patch.position.set(pd.x, y, pd.z);
      patch.rotation.y = pd.rot;
      patch.userData.isWalkable = true;
      patch.userData.surfaceType = 'ground';
      patch.receiveShadow = true;
      this.group.add(patch);
    });
  }

  // =========================================================================
  // 8. COMPOSITIONAL FRAMING TREES (Background & Flanks, No Camera Blocking)
  // =========================================================================
  spawnFramingTrees() {
    // Explicit background tree cluster behind gas station (North & West)
    const treeData = [
      // Behind station (North-West backdrop: X = -88..-72, Z = -52..-32)
      { type: 'pine', x: -84.0, z: -46.0, s: 1.35 },
      { type: 'pine', x: -78.0, z: -50.0, s: 1.25 },
      { type: 'oak',  x: -74.0, z: -44.0, s: 1.2 },
      { type: 'pine', x: -88.0, z: -38.0, s: 1.4 },
      { type: 'birch',x: -82.0, z: -36.0, s: 1.15 },
      { type: 'pine', x: -86.0, z: -28.0, s: 1.3 },
      { type: 'dead', x: -76.0, z: -22.0, s: 1.1 },

      // West flank ridge (Framing left edge: X = -78..-72, Z = -5..25)
      { type: 'pine', x: -76.0, z: -2.0, s: 1.25 },
      { type: 'oak',  x: -74.0, z: 12.0, s: 1.15 },
      { type: 'pine', x: -77.0, z: 24.0, s: 1.3 },
      { type: 'birch',x: -72.0, z: 34.0, s: 1.1 },

      // East framing woods (Right flank behind utility poles: X = -50..-44, Z = -15..35)
      { type: 'pine', x: -48.0, z: -12.0, s: 1.3 },
      { type: 'oak',  x: -46.0, z: 4.0,  s: 1.2 },
      { type: 'pine', x: -47.0, z: 18.0, s: 1.25 },
      { type: 'birch',x: -45.0, z: 32.0, s: 1.15 },
    ];

    treeData.forEach((td) => {
      const y = getTerrainHeight(td.x, td.z);
      const treeGrp = this.propFactory.createTree(td.type, td.s);
      treeGrp.position.set(td.x, y, td.z);
      treeGrp.rotation.y = (td.x * 1.7 + td.z * 2.3) % 6.28;
      this.group.add(treeGrp);
    });
  }

  // =========================================================================
  // 9. CLUSTERED WEEDS & WILDFLOWERS
  // =========================================================================
  spawnClusteredWeeds() {
    const weedMat = new THREE.MeshStandardMaterial({ color: 0x386e22, roughness: 0.8, flatShading: true });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xe09822, roughness: 0.6, flatShading: true });

    // Explicit weed clusters hugging road verge, guardrail footings, and pole bases
    const weedLocations = [
      { x: -58.2, z: 45.0, r: 0.9 },
      { x: -55.8, z: 38.0, r: 1.1 },
      { x: -57.2, z: 32.0, r: 1.3 },
      { x: -60.8, z: 20.5, r: 1.2 },
      { x: -61.2, z: 12.0, r: 1.4 },
      { x: -63.2, z: 2.0,  r: 1.0 },
      { x: -63.0, z: -14.0, r: 1.2 },
      { x: -66.5, z: -20.0, r: 1.5 },
      { x: -58.5, z: 43.0, r: 0.8 },
      { x: -64.5, z: 44.5, r: 1.0 }
    ];

    weedLocations.forEach((wl, wIdx) => {
      const y = getTerrainHeight(wl.x, wl.z);
      const weedGeo = new THREE.BoxGeometry(wl.r * 1.2, 0.65, wl.r * 1.2);
      const weed = new THREE.Mesh(weedGeo, weedMat);
      weed.position.set(wl.x, y + 0.32, wl.z);
      weed.rotation.y = wIdx * 0.75;
      weed.castShadow = true;
      weed.receiveShadow = true;
      this.group.add(weed);

      // Yellow blossom tuft
      if (wIdx % 2 === 0) {
        const flowGeo = new THREE.BoxGeometry(wl.r * 0.5, 0.25, wl.r * 0.5);
        const flower = new THREE.Mesh(flowGeo, flowerMat);
        flower.position.set(wl.x + 0.1, y + 0.68, wl.z - 0.1);
        flower.rotation.y = wIdx * 0.5;
        this.group.add(flower);
      }
    });
  }
}
