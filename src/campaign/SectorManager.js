import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sector } from './Sector.js';
import { CAMPAIGN_CHAPTERS } from './CampaignData.js';
import { LEVEL_1_PROPS } from './Level1LayoutData.js';
import { campaignFrame } from './CampaignFrame.js';
import { campaignPath } from './CampaignPath.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * SectorManager: Orchestrates authored Relay HQ, Repeater Site, and path prop dressing.
 */
export class SectorManager {
  constructor(scene, collisionRegistry, interactionSystem, lootSystem, npcSystem, cutsceneDirector, fenceSystem, interiorRevealSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.interactionSystem = interactionSystem;
    this.lootSystem = lootSystem;
    this.npcSystem = npcSystem;
    this.cutsceneDirector = cutsceneDirector;
    this.fenceSystem = fenceSystem;
    this.interiorRevealSystem = interiorRevealSystem;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'CampaignSectors_Root';
    this.scene.add(this.rootGroup);

    this.sectors = new Map();
    this.activeSectorId = null;
    this.loader = new GLTFLoader();
    this.isGateOpen = false;

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
    const [relayHQGLTF, repeaterSiteGLTF] = await Promise.all([
      this.loadGLTFPromise('/models/world/relay_hq.glb'),
      this.loadGLTFPromise('/models/world/repeater_site.glb')
    ]);

    this.buildRelayHQ(relayHQGLTF.scene);
    this.buildRepeaterSite(repeaterSiteGLTF.scene);
    this.buildAuthoredProps();
    this.setupInteractions();
  }

  loadGLTFPromise(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  buildRelayHQ(hqScene) {
    const hqWorldPos = campaignFrame.requireAnchor('relay_mast').clone().add(new THREE.Vector3(-6.0, 0, -2.0));
    hqScene.position.copy(hqWorldPos);
    hqScene.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);

    hqScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.rootGroup.add(hqScene);
    hqScene.updateMatrixWorld(true);

    // Build colliders from authored markers
    if (this.collision) {
      this.collision.buildFromRoots({ relay_hq: hqScene });
      console.assert(this.collision.has('COL_BOX_WALL_N'), 'RELAY COLLIDERS NOT BUILT FROM MARKERS');
    }

    // Register Interior Reveal with Approach and Interior Trigger Boxes
    if (this.interiorRevealSystem) {
      const triggerBox = new THREE.Box3().setFromCenterAndSize(
        hqWorldPos.clone().add(new THREE.Vector3(0, 1.6, 0)),
        new THREE.Vector3(8.6, 4.0, 6.4)
      );
      const approachBox = new THREE.Box3().setFromCenterAndSize(
        hqWorldPos.clone().add(new THREE.Vector3(0, 1.6, -3.2)),
        new THREE.Vector3(7.0, 4.0, 4.5)
      );
      this.interiorRevealSystem.registerBuilding({
        id: 'relay_hq',
        rootGroup: hqScene,
        triggerBox,
        approachBox
      });
    }

    // Place Mara inside communications room beside terminal console
    if (this.npcSystem) {
      const maraPos = hqWorldPos.clone().add(new THREE.Vector3(2.4, 0, 1.2));
      this.npcSystem.registerNPC({
        id: 'mara',
        name: 'Mara',
        x: maraPos.x,
        y: maraPos.y,
        z: maraPos.z,
        rotY: hqScene.rotation.y + Math.PI
      }, this.rootGroup);
    }
  }

  buildRepeaterSite(repScene) {
    const repPos = campaignFrame.requireAnchor('repeater_outpost');
    repScene.position.copy(repPos);
    repScene.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);

    repScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.rootGroup.add(repScene);

    if (this.interiorRevealSystem) {
      const triggerBox = new THREE.Box3().setFromCenterAndSize(
        repPos.clone().add(new THREE.Vector3(1.8, 1.4, 0)),
        new THREE.Vector3(5.5, 3.5, 4.8)
      );
      this.interiorRevealSystem.registerBuilding({
        id: 'repeater_hut',
        rootGroup: repScene,
        triggerBox
      });
    }

    if (this.collision) {
      this.collision.addBox(repPos.x - 3.5, repPos.z + 3.0, 2.5, 2.5, 0, 'col_rep_tower');
      this.collision.addBox(repPos.x + 1.8, repPos.z + 1.8, 4.6, 0.6, 0, 'col_rep_hut_n');
      this.collision.addBox(repPos.x + 3.9, repPos.z, 0.6, 3.6, 0, 'col_rep_hut_e');
      this.collision.addBox(repPos.x - 0.3, repPos.z, 0.6, 3.6, 0, 'col_rep_hut_w');
    }
  }

  buildAuthoredProps() {
    LEVEL_1_PROPS.forEach((p) => {
      const t = p.s / Math.max(1, campaignPath.totalLength);
      const centerPos = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const worldPos = centerPos.clone().addScaledVector(normal, p.lateral);
      const yaw = Math.atan2(tangent.x, tangent.z) + (p.rotY || 0);

      const path = `/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/${p.model}.gltf`;
      this.loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.position.copy(worldPos);
        model.rotation.y = yaw;
        if (p.scale) model.scale.setScalar(p.scale);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.rootGroup.add(model);
      });
    });

    // Optional Salvage Crate in Muddy Bend pocket (s = 62m, lateral = +13m)
    if (this.lootSystem) {
      const cachePos = campaignFrame.requireAnchor('salvage_cache_1');
      this.lootSystem.registerChest({
        id: 'salvage_cache_1',
        x: cachePos.x,
        y: cachePos.y,
        z: cachePos.z,
        rotY: 0.3,
        isQuestChest: false
      }, this.rootGroup);
    }
  }

  setupInteractions() {
    // 1. Signal Console (inside Relay HQ)
    const consolePos = campaignFrame.requireAnchor('signal_console');
    this.interactionSystem.registerInteractable({
      id: 'signal_console',
      position: consolePos,
      radius: 2.8,
      text: 'Inspect Signal Telemetry',
      promptOffsetY: 1.4,
      onInteract: () => {
        this.interactionSystem.unregisterInteractable('signal_console');
        this.openNorthGate();
        missionEvents.emit('objectInteracted', 'signal_console');
      }
    });

    // 2. Dead Repeater Terminal
    const repeaterPos = campaignFrame.requireAnchor('signal_repeater_console');
    this.interactionSystem.registerInteractable({
      id: 'signal_repeater_console',
      position: repeaterPos,
      radius: 3.2,
      text: 'Insert Signal Shard',
      promptOffsetY: 1.6,
      onInteract: () => {
        this.interactionSystem.unregisterInteractable('signal_repeater_console');
        this.playEndingSequence();
      }
    });
  }

  openNorthGate() {
    if (this.isGateOpen) return;
    this.isGateOpen = true;

    if (this.fenceSystem) {
      this.fenceSystem.unlockGate();
    }

    const gatePos = campaignFrame.requireAnchor('relay_gate');
    if (this.cutsceneDirector) {
      this.cutsceneDirector.playShot({
        targetPos: gatePos,
        duration: 2.8,
        subtitle: {
          speaker: 'MARA',
          text: "Handshake verified. North perimeter gate unlocked."
        }
      });
    }
  }

  playEndingSequence() {
    const repeaterPos = campaignFrame.requireAnchor('signal_repeater_console');
    const spirePos = campaignFrame.requireAnchor('distant_spire_poi');

    if (this.cutsceneDirector) {
      this.cutsceneDirector.playSequence([
        {
          targetPos: repeaterPos,
          duration: 2.2,
          subtitle: { speaker: 'MARA', text: "Signal Shard engaged. Repeater array powering up." }
        },
        {
          targetPos: spirePos,
          duration: 3.0,
          subtitle: { speaker: 'UNKNOWN', text: "...Runner signature confirmed. Grid response initiated..." }
        },
        {
          targetPos: repeaterPos,
          duration: 2.0,
          subtitle: { speaker: 'MARA', text: "Ryder... get back to the Relay right now." }
        }
      ], () => {
        missionEvents.emit('objectInteracted', 'signal_repeater_console');
      });
    } else {
      missionEvents.emit('objectInteracted', 'signal_repeater_console');
    }
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
