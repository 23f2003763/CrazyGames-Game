import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sector } from './Sector.js';
import { CAMPAIGN_CHAPTERS } from './CampaignData.js';
import { SECTOR_DRESSING } from './SectorDressingData.js';
import { campaignFrame } from './CampaignFrame.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * SectorManager: Assembles authored sectors, props, and solid colliders.
 */
export class SectorManager {
  constructor(scene, collisionRegistry, interactionSystem, lootSystem, npcSystem, cutsceneDirector, fenceSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.interactionSystem = interactionSystem;
    this.lootSystem = lootSystem;
    this.npcSystem = npcSystem;
    this.cutsceneDirector = cutsceneDirector;
    this.fenceSystem = fenceSystem;

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

    this.initSectors();
  }

  initSectors() {
    const chapter1 = CAMPAIGN_CHAPTERS[0];
    chapter1.sectors.forEach((secCfg) => {
      const sector = new Sector(secCfg);
      this.sectors.set(sector.id, sector);
      this.rootGroup.add(sector.group);
    });

    const firstSec = this.sectors.get('sector_01_relay');
    if (firstSec) {
      firstSec.activate();
      this.activeSectorId = firstSec.id;
    }
  }

  async loadAllAssetsAndBuild() {
    const [fenceGLTF, arcPropsGLTF] = await Promise.all([
      this.loadGLTFPromise('/models/world/electric_fence_set.glb'),
      this.loadGLTFPromise('/models/world/arc_props.glb')
    ]);

    this.storeModelParts(fenceGLTF.scene);
    this.storeModelParts(arcPropsGLTF.scene);

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

    // 1. Buildings & Landmarks
    if (data.buildings) {
      data.buildings.forEach((b) => {
        this.loadBuilding(b, sector.group);
      });
    }

    // 2. Props
    if (data.props) {
      data.props.forEach((p) => {
        this.loadQuaterniusProp(p, sector.group);
      });
    }

    // 3. Loot / Salvage Chests
    if (data.loot && this.lootSystem) {
      data.loot.forEach((l) => {
        const worldPos = campaignFrame.toWorld(l.localX, l.localZ, 0);
        this.lootSystem.registerChest({
          id: l.id,
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          rotY: l.rotY || 0,
          isQuestChest: l.isQuestChest
        }, sector.group);
      });
    }

    // 4. NPCs
    if (data.npc && this.npcSystem) {
      data.npc.forEach((n) => {
        const worldPos = campaignFrame.toWorld(n.localX, n.localZ, 0);
        this.npcSystem.registerNPC({
          id: n.id,
          name: n.name,
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          rotY: n.rotY || 0
        }, sector.group);
      });
    }

    // 5. Solid Colliders
    if (data.colliders && this.collision) {
      data.colliders.forEach((c) => {
        const worldPos = campaignFrame.toWorld(c.localX, c.localZ, 0);
        const baseYaw = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
        this.collision.addBox(worldPos.x, worldPos.z, c.width, c.depth, baseYaw + (c.rotation || 0), c.id);
      });
    }

    // Wire Interactive Terminals
    if (sector.id === 'sector_01_relay') {
      this.wireRelayInteractiveElements(sector.group);
    }

    if (sector.id === 'sector_03_repeater') {
      this.wireRepeaterInteractiveElements(sector.group);
    }
  }

  loadBuilding(b, parentGroup) {
    const worldPos = campaignFrame.toWorld(b.localX, b.localZ, 0);

    let path = '';
    if (b.model === 'RelayCabin') {
      path = '/models/relay_hub.glb';
    } else {
      const part = this.getModel(b.model);
      if (part) {
        part.position.copy(worldPos);
        const baseYaw = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
        part.rotation.y = baseYaw + (b.rotY || 0);
        if (b.scale) part.scale.setScalar(b.scale);
        parentGroup.add(part);
        return;
      }
    }

    if (path) {
      this.loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.position.copy(worldPos);
        const baseYaw = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
        model.rotation.y = baseYaw + (b.rotY || 0);
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

  loadQuaterniusProp(p, parentGroup) {
    const worldPos = campaignFrame.toWorld(p.localX, p.localZ, 0);
    const path = `/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/${p.model}.gltf`;

    this.loader.load(path, (gltf) => {
      const model = gltf.scene;
      model.position.copy(worldPos);
      const baseYaw = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
      model.rotation.y = baseYaw + (p.rotY || 0);
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

  wireRelayInteractiveElements(sectorGroup) {
    setTimeout(() => {
      sectorGroup.traverse((child) => {
        if (child.name === 'GateDoor_L_Root' || child.name === 'GateDoor_L') this.gateDoorL = child;
        if (child.name === 'GateDoor_R_Root' || child.name === 'GateDoor_R') this.gateDoorR = child;
      });
    }, 800);

    const consolePos = campaignFrame.getAnchorWorld('signal_console');
    this.interactionSystem.registerInteractable({
      id: 'signal_console',
      position: consolePos,
      radius: 3.2,
      text: 'Read Signal Telemetry',
      promptOffsetY: 1.4,
      onInteract: () => {
        this.interactionSystem.unregisterInteractable('signal_console');
        this.openNorthGate();
        missionEvents.emit('objectInteracted', 'signal_console');
      }
    });
  }

  openNorthGate() {
    if (this.isGateOpen) return;
    this.isGateOpen = true;

    // Remove closed-gate collider barrier
    if (this.fenceSystem) {
      this.fenceSystem.unlockGate();
    }

    const gatePos = campaignFrame.getAnchorWorld('relay_gate');
    if (this.cutsceneDirector) {
      this.cutsceneDirector.playShot({
        targetPos: gatePos,
        duration: 3.2,
        subtitle: {
          speaker: 'MARA',
          text: 'Gate unlocked. Something heard us out there.'
        }
      });
    }

    let progress = 0;
    const openInterval = setInterval(() => {
      progress += 0.04;
      if (this.gateDoorL) this.gateDoorL.rotation.y = -progress * Math.PI * 0.45;
      if (this.gateDoorR) this.gateDoorR.rotation.y = progress * Math.PI * 0.45;
      if (progress >= 1.0) clearInterval(openInterval);
    }, 30);
  }

  wireRepeaterInteractiveElements(sectorGroup) {
    const repeaterPos = campaignFrame.getAnchorWorld('signal_repeater_console');
    this.interactionSystem.registerInteractable({
      id: 'signal_repeater_console',
      position: repeaterPos,
      radius: 3.5,
      text: 'Insert Signal Shard',
      promptOffsetY: 1.8,
      onInteract: () => {
        this.interactionSystem.unregisterInteractable('signal_repeater_console');
        
        // Ending sequence
        if (this.cutsceneDirector) {
          this.cutsceneDirector.playShot({
            targetPos: repeaterPos,
            duration: 4.0,
            subtitle: {
              speaker: 'MARA',
              text: "Whatever sent it knows we're here."
            }
          }, () => {
            missionEvents.emit('objectInteracted', 'signal_repeater_console');
          });
        } else {
          missionEvents.emit('objectInteracted', 'signal_repeater_console');
        }
      }
    });
  }

  update(playerPos) {
    for (const [id, sector] of this.sectors) {
      if (sector.contains(playerPos.x, playerPos.z)) {
        if (this.activeSectorId !== id) {
          this.activeSectorId = id;
          sector.activate();
        }
        break;
      }
    }
  }
}
