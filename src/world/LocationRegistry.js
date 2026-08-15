import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

export class LocationRegistry {
  constructor(scene) {
    this.scene = scene;
    
    // Create root groups for all 5 major locations
    this.roots = {
      relay: new THREE.Group(),
      gasStation: new THREE.Group(),
      brokenSpan: new THREE.Group(),
      survivorCamp: new THREE.Group(),
      outpostOmega: new THREE.Group()
    };
    
    this.roots.relay.name = 'RelayRoot';
    this.roots.gasStation.name = 'GasStationRoot';
    this.roots.brokenSpan.name = 'BrokenSpanRoot';
    this.roots.survivorCamp.name = 'SurvivorCampRoot';
    this.roots.outpostOmega.name = 'OutpostOmegaRoot';
    
    // Add all roots to scene
    Object.values(this.roots).forEach(root => {
      this.scene.add(root);
    });
    
    this.initializeTransforms();
    this.buildColliders();
  }
  
  initializeTransforms() {
    // 1. Relay Hub (Clearing 1) - Natural 1:1 metric gameplay scale
    this.roots.relay.position.set(-95.0, getTerrainHeight(-95, 70) + 0.02, 70.0);
    this.roots.relay.rotation.y = Math.PI * 0.42;
    this.roots.relay.scale.set(1.0, 1.0, 1.0);
    
    // 2. Gas Station / Octane Mart (Clearing 2) - Natural 1:1 metric gameplay scale
    this.roots.gasStation.position.set(-66.0, getTerrainHeight(-66, -34) + 0.02, -34.0);
    this.roots.gasStation.rotation.y = Math.PI * 0.82;
    this.roots.gasStation.scale.set(1.0, 1.0, 1.0);
    
    // 3. Broken Span Bridge (Clearing 3)
    this.roots.brokenSpan.position.set(-5.0, getTerrainHeight(-5, 22) + 0.02, 22.0);
    this.roots.brokenSpan.rotation.y = Math.PI * 0.18;
    this.roots.brokenSpan.scale.set(1.12, 1.12, 1.12);
    
    // 4. Survivor Camp (Clearing 4)
    this.roots.survivorCamp.position.set(45.0, getTerrainHeight(45, -32), -32.0);
    this.roots.survivorCamp.rotation.y = 0.0;
    this.roots.survivorCamp.scale.set(1.0, 1.0, 1.0);
    
    // 5. Outpost Omega (Clearing 5)
    this.roots.outpostOmega.position.set(100.0, getTerrainHeight(100, -72) + 0.02, -72.0);
    this.roots.outpostOmega.rotation.y = -Math.PI * 0.28;
    this.roots.outpostOmega.scale.set(1.15, 1.15, 1.15);
  }

  addColliderBox(root, name, x, y, z, sx, sz, rotY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, 2.4, sz);
    mesh.rotation.y = rotY;
    mesh.visible = false;
    root.add(mesh);
  }

  addColliderCircle(root, name, x, y, z, radius) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(radius * 2, 2.4, radius * 2);
    mesh.visible = false;
    root.add(mesh);
  }

  buildColliders() {
    // ----------------------------------------------------
    // Clearing 3: The Broken Span
    // ----------------------------------------------------
    this.addColliderBox(this.roots.brokenSpan, 'COL_BOX_BridgeRailN', -11.0, 0, 4.0, 14.0, 1.0, 0);
    this.addColliderBox(this.roots.brokenSpan, 'COL_BOX_BridgeRailS', -11.0, 0, -4.0, 14.0, 1.0, 0);
    this.addColliderBox(this.roots.brokenSpan, 'COL_BOX_FallenCar', -0.8, 0, 2.2, 2.2, 3.8, 0.4);
    this.addColliderBox(this.roots.brokenSpan, 'COL_BOX_PierW', -4.5, 0, -1.8, 3.0, 3.0, 0);
    this.addColliderBox(this.roots.brokenSpan, 'COL_BOX_EastTruck', 18.5, 0, 0.8, 3.0, 6.0, 0.12);

    // ----------------------------------------------------
    // Clearing 4: Survivor Camp
    // ----------------------------------------------------
    this.addColliderBox(this.roots.survivorCamp, 'COL_BOX_CampTentA', -8.0, 0, -4.0, 4.0, 4.5, Math.PI / 6);
    this.addColliderBox(this.roots.survivorCamp, 'COL_BOX_CampShelter1', 4.0, 0, -8.0, 3.5, 4.0, -Math.PI / 4);
    this.addColliderBox(this.roots.survivorCamp, 'COL_BOX_CampShelter2', 8.0, 0, 2.0, 3.5, 4.0, -Math.PI * 0.8);
    this.addColliderBox(this.roots.survivorCamp, 'COL_BOX_Campfire', 0.0, 0, 0.0, 2.4, 2.4, 0);

    // ----------------------------------------------------
    // Clearing 5: Outpost Omega
    // ----------------------------------------------------
    this.addColliderBox(this.roots.outpostOmega, 'COL_BOX_OmegaBunker', -13.2, 0, 8.2, 10.0, 8.0, Math.PI * 0.5);
    this.addColliderBox(this.roots.outpostOmega, 'COL_BOX_OmegaTowerW', -16.0, 0, -18.0, 5.0, 5.0, 0);
    this.addColliderBox(this.roots.outpostOmega, 'COL_BOX_OmegaTowerE', 21.0, 0, -5.0, 5.0, 5.0, 0);
    this.addColliderBox(this.roots.outpostOmega, 'COL_BOX_OmegaAPC', 4.0, 0, 15.0, 4.0, 8.5, -0.6);
    this.addColliderBox(this.roots.outpostOmega, 'COL_BOX_OmegaContainers', 14.0, 0, 12.0, 4.5, 9.0, 0.3);
  }
}
