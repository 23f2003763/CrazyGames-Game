import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getTerrainHeight } from './MapData.js';

/**
 * AuthoredDressing: Curates the vertical slice traversal route between
 * The Relay (Spawn) and Octane Mart using official Quaternius CC0 models.
 * 
 * 5 Deliberate Visual Beats:
 * 1. Relay Exit & Perimeter Highway Junction
 * 2. Abandoned Pickup Roadside Scene
 * 3. Highway Checkpoint Choke Point
 * 4. Open Wilderness Road Corridor
 * 5. Octane Mart Forecourt Approach & Turnoff
 */
export class AuthoredDressing {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'AuthoredDressing_VerticalSlice';
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.modelsCache = {};

    this.buildDeliberateBeats();
  }

  loadModel(path, onLoad) {
    if (this.modelsCache[path]) {
      onLoad(this.modelsCache[path].clone(true));
      return;
    }

    this.loader.load(path, (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = THREE.MathUtils.clamp(child.material.roughness ?? 0.8, 0.4, 0.95);
            child.material.metalness = THREE.MathUtils.clamp(child.material.metalness ?? 0.0, 0.0, 0.4);
          }
        }
      });
      this.modelsCache[path] = model;
      onLoad(model.clone(true));
    });
  }

  buildDeliberateBeats() {
    this.buildBeat1_RelayExit();
    this.buildBeat2_AbandonedPickup();
    this.buildBeat3_CheckpointChoke();
    this.buildBeat4_WildernessCorridor();
    this.buildBeat5_OctaneApproach();
  }

  // =========================================================================
  // BEAT 1: RELAY EXIT & PERIMETER ROAD JUNCTION (X: -88 .. -80, Z: 64 .. 56)
  // =========================================================================
  buildBeat1_RelayExit() {
    // 1. Streetlight illuminating the exit gate
    const slX = -86.5;
    const slZ = 64.0;
    const slY = getTerrainHeight(slX, slZ);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/StreetLights.gltf', (m) => {
      m.position.set(slX, slY, slZ);
      m.rotation.y = Math.PI * 0.25;
      m.scale.setScalar(0.9);
      this.group.add(m);
    });

    // 2. Concrete Traffic Barriers framing the road shoulder
    const barrierPositions = [
      { x: -84.0, z: 62.0, rot: 0.3 },
      { x: -82.2, z: 59.5, rot: 0.4 },
    ];
    barrierPositions.forEach((bp) => {
      const y = getTerrainHeight(bp.x, bp.z);
      this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficBarrier_1.gltf', (m) => {
        m.position.set(bp.x, y, bp.z);
        m.rotation.y = bp.rot;
        this.group.add(m);
      });
    });

    // 3. Wooden Pallet with Water Drum & Warning Cone
    const pX = -87.0;
    const pZ = 61.5;
    const pY = getTerrainHeight(pX, pZ);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Pallet.gltf', (m) => {
      m.position.set(pX, pY, pZ);
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Barrel.gltf', (m) => {
      m.position.set(pX + 0.2, pY + 0.14, pZ + 0.2);
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficCone_1.gltf', (m) => {
      m.position.set(pX - 0.5, pY, pZ - 0.4);
      this.group.add(m);
    });
  }

  // =========================================================================
  // BEAT 2: ABANDONED PICKUP ROADSIDE SCENE (X: -78 .. -70, Z: 54 .. 44)
  // =========================================================================
  buildBeat2_AbandonedPickup() {
    // 1. Quaternius Pickup Truck parked on the east shoulder
    const truckX = -75.5;
    const truckZ = 49.0;
    const truckY = getTerrainHeight(truckX, truckZ) + 0.05;
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Vehicles/glTF/Vehicle_Pickup.gltf', (m) => {
      m.position.set(truckX, truckY, truckZ);
      m.rotation.set(0.06, -0.45, -0.04); // Tilted on ditch edge
      m.scale.setScalar(0.85); // Matches 1.8m player
      this.group.add(m);
    });

    // 2. Broken Pallet and spilled chest near pickup bed
    const bPalletY = getTerrainHeight(-73.5, 50.2);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Pallet_Broken.gltf', (m) => {
      m.position.set(-73.5, bPalletY, 50.2);
      m.rotation.y = 0.5;
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Chest.gltf', (m) => {
      m.position.set(-74.0, bPalletY + 0.1, 51.0);
      m.rotation.y = -0.3;
      this.group.add(m);
    });

    // 3. Plastic Orange Safety Barriers guiding navigation
    const pbY = getTerrainHeight(-79.0, 47.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/PlasticBarrier.gltf', (m) => {
      m.position.set(-79.0, pbY, 47.0);
      m.rotation.y = -0.2;
      this.group.add(m);
    });
  }

  // =========================================================================
  // BEAT 3: HIGHWAY CHECKPOINT CHOKE POINT (X: -66 .. -58, Z: 40 .. 28)
  // =========================================================================
  buildBeat3_CheckpointChoke() {
    // Slalom Barrier Left (Leaves 6.5m clear center passage)
    const bLeftY = getTerrainHeight(-64.5, 36.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficBarrier_1.gltf', (m) => {
      m.position.set(-64.5, bLeftY, 36.0);
      m.rotation.y = 0.2;
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Barrel.gltf', (m) => {
      m.position.set(-65.8, bLeftY, 35.5);
      this.group.add(m);
    });

    // Slalom Barrier Right
    const bRightY = getTerrainHeight(-57.5, 32.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficBarrier_2.gltf', (m) => {
      m.position.set(-57.5, bRightY, 32.0);
      m.rotation.y = -0.3;
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficCone_2.gltf', (m) => {
      m.position.set(-56.5, bRightY, 31.2);
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/CinderBlock.gltf', (m) => {
      m.position.set(-58.5, bRightY, 33.0);
      this.group.add(m);
    });
  }

  // =========================================================================
  // BEAT 4: OPEN WILDERNESS ROAD CORRIDOR (X: -63 .. -65, Z: 20 .. -2)
  // =========================================================================
  buildBeat4_WildernessCorridor() {
    // 1. Streetlight along straight section
    const slY = getTerrainHeight(-67.5, 10.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/StreetLights.gltf', (m) => {
      m.position.set(-67.5, slY, 10.0);
      m.rotation.y = Math.PI * 0.5;
      m.scale.setScalar(0.9);
      this.group.add(m);
    });

    // 2. Stack of tires and trash bags on overgrown verge
    const tY = getTerrainHeight(-66.8, 2.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Wheels_Stack.gltf', (m) => {
      m.position.set(-66.8, tY, 2.0);
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrashBag_1.gltf', (m) => {
      m.position.set(-67.5, tY, 2.8);
      this.group.add(m);
    });
  }

  // =========================================================================
  // BEAT 5: OCTANE MART FORECOURT APPROACH & TURNOFF (X: -65 .. -68, Z: -12 .. -26)
  // =========================================================================
  buildBeat5_OctaneApproach() {
    // 1. Quaternius Sports Car abandoned by gas station turnoff
    const carX = -62.5;
    const carZ = -16.0;
    const carY = getTerrainHeight(carX, carZ) + 0.05;
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Vehicles/glTF/Vehicle_Sports.gltf', (m) => {
      m.position.set(carX, carY, carZ);
      m.rotation.set(-0.04, 0.65, 0.06);
      m.scale.setScalar(0.85); // Matches 1.8m player
      this.group.add(m);
    });

    // 2. Town / Highway Junction Overhead Sign
    const signY = getTerrainHeight(-58.0, -10.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TownSign.gltf', (m) => {
      m.position.set(-58.0, signY, -10.0);
      m.rotation.y = -0.4;
      m.scale.setScalar(0.85);
      this.group.add(m);
    });

    // 3. Concrete barrier & safety cones marking forecourt curb
    const cbY = getTerrainHeight(-66.0, -22.0);
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficBarrier_1.gltf', (m) => {
      m.position.set(-66.0, cbY, -22.0);
      m.rotation.y = 0.15;
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrafficCone_1.gltf', (m) => {
      m.position.set(-65.0, cbY, -20.5);
      this.group.add(m);
    });
    this.loadModel('/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/TrashBag_2.gltf', (m) => {
      m.position.set(-67.2, cbY, -23.5);
      this.group.add(m);
    });
  }
}
