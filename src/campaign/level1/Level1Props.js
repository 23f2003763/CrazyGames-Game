import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignPath } from '../CampaignPath.js';
import { campaignFrame } from '../CampaignFrame.js';

/**
 * Level1Props: Authored environmental storytelling prop compositions every 8–12 meters.
 * Uses ONLY real GLTF/GLB models (Lattice wrecks, Quaternius vehicles and industrial props).
 * ZERO BoxGeometry / PlaneGeometry / procedural placeholder black slabs.
 */
export class Level1Props {
  constructor(scene, collisionRegistry) {
    this.scene = scene;
    this.collision = collisionRegistry;

    this.group = new THREE.Group();
    this.group.name = 'Level1_Props_Root';
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.loadedPrototypes = new Map();

    this.loadAssetsAndBuild();
  }

  async loadAssetsAndBuild() {
    // Load wreck kit and quaternius environment props
    const [wreckGLTF, fenceGLTF] = await Promise.all([
      this.loadGLTFPromise('/models/lattice/lattice_wrecks.glb'),
      this.loadGLTFPromise('/models/world/electric_fence_set.glb')
    ]);

    // Store wreck models
    ['SurveyBot_Wreck', 'MaintenanceBot_Wreck', 'SensorHead_Wreck', 'MachineArm_Wreck', 'ArcCore_Broken'].forEach((name) => {
      const obj = wreckGLTF.scene.getObjectByName(name);
      if (obj) this.loadedPrototypes.set(name, obj);
    });

    const gateObj = fenceGLTF.scene.getObjectByName('FenceGateLarge');
    if (gateObj) this.loadedPrototypes.set('FenceGateLarge', gateObj);

    const powerBoxObj = fenceGLTF.scene.getObjectByName('FencePowerBox');
    if (powerBoxObj) this.loadedPrototypes.set('FencePowerBox', powerBoxObj);

    // Load Quaternius assets
    const quatModels = [
      'StreetLights', 'Barrel', 'Pallet', 'CinderBlock', 'Pipes',
      'Container_Red', 'Container_Green', 'WaterTower'
    ];
    await Promise.all(quatModels.map(async (name) => {
      try {
        const gltf = await this.loadGLTFPromise(`/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/${name}.gltf`);
        this.loadedPrototypes.set(name, gltf.scene);
      } catch (e) {
        console.warn(`Could not load Quaternius prop ${name}:`, e);
      }
    }));

    try {
      const vehGLTF = await this.loadGLTFPromise('/assets/vendor/quaternius/zombie-apocalypse/Vehicles/glTF/Vehicle_Pickup_Armored.gltf');
      this.loadedPrototypes.set('Vehicle_Pickup_Armored', vehGLTF.scene);
    } catch (e) {
      console.warn('Could not load vehicle:', e);
    }

    this.placeAuthoredCompositions();
  }

  loadGLTFPromise(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  placeAuthoredCompositions() {
    const totalDist = campaignPath.totalLength;

    // Authored Compositions from s=0 to s=165m
    const compositions = [
      // 1. RELAY COMPOUND PERIMETER (s = 12 - 25m)
      { s: 12, lat: -7.5, model: 'Vehicle_Pickup_Armored', rotY: 0.35, scale: 1.1, colSize: [2.2, 1.6, 4.2] },
      { s: 14, lat:  6.8, model: 'Container_Red', rotY: -0.2, scale: 1.0, colSize: [2.5, 2.6, 6.0] },
      { s: 18, lat:  5.2, model: 'Pallet', rotY: 0.5, scale: 1.2 },
      { s: 20, lat: -5.8, model: 'Barrel', rotY: 0.0, scale: 1.1 },
      { s: 22, lat:  6.0, model: 'Pipes', rotY: 1.1, scale: 1.0 },

      // 2. PERIMETER EXIT & SECURITY GATE (s = 28 - 36m)
      { s: 30, lat:  0.0, model: 'FenceGateLarge', rotY: 0.0, scale: 1.0, isGate: true },
      { s: 31, lat:  3.6, model: 'FencePowerBox', rotY: -1.57, scale: 1.0 },
      { s: 34, lat: -6.2, model: 'StreetLights', rotY: 0.4, scale: 1.0, colSize: [0.6, 4.0, 0.6] },
      { s: 38, lat:  5.5, model: 'CinderBlock', rotY: 0.8, scale: 1.3 },

      // 3. WET SERVICE TRAIL (s = 48 - 64m)
      { s: 48, lat: -4.8, model: 'MaintenanceBot_Wreck', rotY: 0.6, scale: 1.2, colSize: [1.6, 1.0, 1.4] },
      { s: 52, lat:  5.2, model: 'Pipes', rotY: -0.4, scale: 1.1 },
      { s: 56, lat: -6.0, model: 'StreetLights', rotY: 1.8, scale: 1.0, colSize: [0.6, 4.0, 0.6] },
      { s: 62, lat:  4.6, model: 'SensorHead_Wreck', rotY: -0.8, scale: 1.3 },

      // 4. DEAD QUIET (s = 70 - 80m)
      { s: 72, lat: -5.5, model: 'MachineArm_Wreck', rotY: 0.9, scale: 1.2 },
      { s: 76, lat:  6.2, model: 'Container_Green', rotY: 0.4, scale: 1.0, colSize: [2.5, 2.6, 6.0] },
      { s: 80, lat: -4.2, model: 'ArcCore_Broken', rotY: -0.5, scale: 1.2 },

      // 5. FIRST COMBAT POCKET FLANKING WRECKS (s = 86 - 108m)
      // Flanks of the open 24m fighting arena
      { s: 88,  lat: -8.5, model: 'SurveyBot_Wreck', rotY: 0.3, scale: 1.3, colSize: [2.8, 1.5, 2.4] },
      { s: 92,  lat:  8.2, model: 'MaintenanceBot_Wreck', rotY: -1.1, scale: 1.2, colSize: [1.6, 1.0, 1.4] },
      { s: 98,  lat: -7.8, model: 'ArcCore_Broken', rotY: 1.2, scale: 1.4 },
      { s: 104, lat:  8.8, model: 'MachineArm_Wreck', rotY: -0.4, scale: 1.3 },
      { s: 108, lat: -6.5, model: 'SensorHead_Wreck', rotY: 0.7, scale: 1.2 },

      // 6. SIGNAL TRAIL AFTERMATH (s = 116 - 134m)
      { s: 118, lat:  5.4, model: 'Pipes', rotY: 0.2, scale: 1.2 },
      { s: 124, lat: -5.8, model: 'StreetLights', rotY: -0.7, scale: 1.0, colSize: [0.6, 4.0, 0.6] },
      { s: 130, lat:  6.0, model: 'MaintenanceBot_Wreck', rotY: 1.4, scale: 1.1, colSize: [1.6, 1.0, 1.4] },
      { s: 134, lat: -4.8, model: 'ArcCore_Broken', rotY: -1.0, scale: 1.1 }
    ];

    for (const comp of compositions) {
      const t = THREE.MathUtils.clamp(comp.s / Math.max(1, totalDist), 0, 1);
      const centerPt = campaignPath.getWorldPointAt(t);
      const tanPt = campaignPath.getWorldTangentAt(t);
      const normalPt = new THREE.Vector3(-tanPt.z, 0, tanPt.x).normalize();

      const worldPos = centerPt.clone().addScaledVector(normalPt, comp.lat);
      worldPos.y = 0;

      const proto = this.loadedPrototypes.get(comp.model);
      if (!proto) continue;

      const inst = proto.clone(true);
      inst.position.copy(worldPos);

      // Base yaw aligned with path + authored rotY
      const pathYaw = Math.atan2(tanPt.x, tanPt.z);
      inst.rotation.y = pathYaw + (comp.rotY || 0);

      const sc = comp.scale || 1.0;
      inst.scale.set(sc, sc, sc);
      inst.name = `Prop_${comp.model}_${comp.s}m`;
      this.group.add(inst);

      // Store gate reference
      if (comp.isGate) {
        this.gateMesh = inst;
        this.setupSecurityGate(worldPos, pathYaw);
      }

      // Add physical collider if specified
      if (this.collision && comp.colSize) {
        const colSize = new THREE.Vector3(comp.colSize[0], comp.colSize[1], comp.colSize[2]);
        this.collision.addBox(`col_prop_${comp.s}_${comp.lat}`, worldPos.clone().add(new THREE.Vector3(0, colSize.y / 2, 0)), colSize, inst.rotation.y);
      }
    }
  }

  setupSecurityGate(gatePos, gateYaw) {
    campaignFrame.setAnchorWorld('gate_position', gatePos);

    // Initial closed gate collider across the 6m trail
    if (this.collision) {
      this.collision.addBox('col_security_gate_doors', gatePos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(5.8, 3.0, 0.6), gateYaw);
    }
  }

  openSecurityGate() {
    if (!this.gateMesh) return;

    const doorL = this.gateMesh.getObjectByName('GateDoor_L_Root');
    const doorR = this.gateMesh.getObjectByName('GateDoor_R_Root');

    if (doorL) doorL.rotation.y = Math.PI / 2.2;
    if (doorR) doorR.rotation.y = -Math.PI / 2.2;

    if (this.collision) {
      this.collision.remove('col_security_gate_doors');
    }
    console.log('Perimeter Security Gate Opened.');
  }
}
