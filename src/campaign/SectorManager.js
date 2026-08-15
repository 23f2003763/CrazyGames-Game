import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sector } from './Sector.js';
import { CAMPAIGN_CHAPTERS } from './CampaignData.js';
import { SECTOR_DRESSING } from './SectorDressingData.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * SectorManager: Manages sector lifecycles, loads authored models,
 * and assembles the 100% deterministic campaign scene graph.
 */
export class SectorManager {
  constructor(scene, interactionSystem, lootSystem, npcSystem) {
    this.scene = scene;
    this.interactionSystem = interactionSystem;
    this.lootSystem = lootSystem;
    this.npcSystem = npcSystem;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'CampaignSectors_Root';
    this.scene.add(this.rootGroup);

    this.sectors = new Map();
    this.activeSectorId = null;
    this.loader = new GLTFLoader();
    this.modelsCache = new Map();

    this.isGateOpen = false;
    this.gateDoorL = null;
    this.gateDoorR = null;

    this.onSectorChanged = null;

    this.initSectors();
  }

  initSectors() {
    const chapter1 = CAMPAIGN_CHAPTERS[0];
    chapter1.sectors.forEach((secCfg) => {
      const sector = new Sector(secCfg);
      this.sectors.set(sector.id, sector);
      this.rootGroup.add(sector.group);
    });

    // Default to first sector
    const firstSec = this.sectors.get('sector_01_relay');
    if (firstSec) {
      firstSec.activate();
      this.activeSectorId = firstSec.id;
    }
  }

  async loadAllAssetsAndBuild() {
    // 1. Load Modular Asset GLBs
    const [fenceGLTF, treeGLTF, rockGLTF] = await Promise.all([
      this.loadGLTFPromise('/models/world/electric_fence_set.glb'),
      this.loadGLTFPromise('/models/world/tree_set.glb'),
      this.loadGLTFPromise('/models/world/rock_set.glb')
    ]);

    // Extract named parts
    this.storeModelParts(fenceGLTF.scene);
    this.storeModelParts(treeGLTF.scene);
    this.storeModelParts(rockGLTF.scene);

    // 2. Build each sector's deterministic dressing
    this.sectors.forEach((sector) => {
      this.buildSectorContent(sector);
    });
  }

  loadGLTFPromise(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  storeModelParts(rootScene) {
    rootScene.traverse((child) => {
      if (child.name && child.name.length > 2 && !this.modelsCache.has(child.name)) {
        this.modelsCache.set(child.name, child);
      }
    });
  }

  getModel(name) {
    const cached = this.modelsCache.get(name);
    if (cached) {
      const clone = cached.clone(true);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      return clone;
    }
    return null;
  }

  buildSectorContent(sector) {
    const data = SECTOR_DRESSING[sector.id];
    if (!data) return;

    // 1. Electric Fences
    if (data.fences) {
      data.fences.forEach((f) => {
        const mesh = this.getModel(f.model);
        if (mesh) {
          mesh.position.set(f.x, f.y, f.z);
          mesh.rotation.y = f.rotY || 0;
          sector.group.add(mesh);
        }
      });
    }

    // 2. Trees
    if (data.trees) {
      data.trees.forEach((t) => {
        const mesh = this.getModel(t.model);
        if (mesh) {
          mesh.position.set(t.x, t.y, t.z);
          mesh.rotation.y = t.rotY || 0;
          if (t.scale) mesh.scale.setScalar(t.scale);
          sector.group.add(mesh);
        }
      });
    }

    // 3. Rocks
    if (data.rocks) {
      data.rocks.forEach((r) => {
        const mesh = this.getModel(r.model);
        if (mesh) {
          mesh.position.set(r.x, r.y, r.z);
          mesh.rotation.y = r.rotY || 0;
          if (r.scale) mesh.scale.setScalar(r.scale);
          sector.group.add(mesh);
        }
      });
    }

    // 4. Quaternius Props & Vehicles
    if (data.props) {
      data.props.forEach((p) => {
        this.loadQuaterniusProp(p, sector.group);
      });
    }

    // 5. Buildings & Interactive Gate
    if (data.buildings) {
      data.buildings.forEach((b) => {
        this.loadBuilding(b, sector.group);
      });
    }

    // Special wiring for Sector 1 Exit Gate & Power Box
    if (sector.id === 'sector_01_relay') {
      this.wireRelayGateInteractivity(sector.group);
    }

    // 6. Loot & Chests
    if (data.loot && this.lootSystem) {
      data.loot.forEach((l) => {
        this.lootSystem.registerChest(l, sector.group);
      });
    }

    // 7. NPCs
    if (data.npc && this.npcSystem) {
      data.npc.forEach((n) => {
        this.npcSystem.registerNPC(n, sector.group);
      });
    }
  }

  loadQuaterniusProp(p, parentGroup) {
    let path = '';
    if (p.model.startsWith('Vehicle_')) {
      path = `/assets/vendor/quaternius/zombie-apocalypse/Vehicles/glTF/${p.model}.gltf`;
    } else {
      path = `/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/${p.model}.gltf`;
    }

    this.loader.load(path, (gltf) => {
      const model = gltf.scene;
      model.position.set(p.x, p.y, p.z);
      model.rotation.y = p.rotY || 0;
      if (p.scale) model.scale.setScalar(p.scale);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      parentGroup.add(model);
    }, undefined, (err) => {
      console.warn(`Could not load prop ${p.model}:`, err);
    });
  }

  loadBuilding(b, parentGroup) {
    let path = '';
    if (b.model === 'RelayCabin') {
      path = '/models/relay_hub.glb';
    } else if (b.model === 'AbandonedGasStation') {
      path = '/models/abandoned_gas_station.glb';
    } else {
      // Local part from fence set
      const part = this.getModel(b.model);
      if (part) {
        part.position.set(b.x, b.y, b.z);
        part.rotation.y = b.rotY || 0;
        if (b.scale) part.scale.setScalar(b.scale);
        parentGroup.add(part);
        return;
      }
    }

    if (path) {
      this.loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.position.set(b.x, b.y, b.z);
        model.rotation.y = b.rotY || 0;
        if (b.scale) model.scale.setScalar(b.scale);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        parentGroup.add(model);
      });
    }
  }

  wireRelayGateInteractivity(sectorGroup) {
    setTimeout(() => {
      sectorGroup.traverse((child) => {
        if (child.name === 'GateDoor_L') this.gateDoorL = child;
        if (child.name === 'GateDoor_R') this.gateDoorR = child;
      });
    }, 600);

    this.interactionSystem.registerInteractable({
      id: 'gate_power_box',
      position: new THREE.Vector3(3.8, 1.2, 48.5),
      radius: 2.8,
      text: 'Power Road Exit Gate',
      promptOffsetY: 1.6,
      onInteract: () => {
        if (this.isGateOpen) {
          if (this.lootSystem) this.lootSystem.showToast('Exit Gate is already powered & open.');
          return;
        }

        if (this.lootSystem && this.lootSystem.inventory.questItems.has('Road Gate Fuse')) {
          this.isGateOpen = true;
          this.lootSystem.inventory.questItems.delete('Road Gate Fuse');
          this.lootSystem.showToast('Fuse Inserted! Exit Gate Unlocked.', '#a371f7');

          // Animate gate doors opening
          let progress = 0;
          const openInterval = setInterval(() => {
            progress += 0.05;
            if (this.gateDoorL) this.gateDoorL.rotation.y = -progress * Math.PI * 0.45;
            if (this.gateDoorR) this.gateDoorR.rotation.y = progress * Math.PI * 0.45;
            if (progress >= 1.0) clearInterval(openInterval);
          }, 30);

          missionEvents.emit('objectInteracted', 'gate_power_box');
        } else {
          if (this.lootSystem) {
            this.lootSystem.showToast('Gate Offline: Requires Road Gate Fuse.', '#ff5555');
          }
        }
      }
    });
  }

  update(playerPos) {
    // Check which sector player is currently inside
    for (const [id, sector] of this.sectors) {
      if (sector.contains(playerPos.x, playerPos.z)) {
        if (this.activeSectorId !== id) {
          this.activeSectorId = id;
          sector.activate();
          if (this.onSectorChanged) {
            this.onSectorChanged(sector);
          }
        }
        break;
      }
    }
  }
}
