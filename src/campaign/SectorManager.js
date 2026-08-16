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
    this.ambientTime = 0;
    this.ambientObjects = { screens: [], generators: [], antennas: [] };

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
      this.loadGLTFPromise('/models/world/relay_operations.glb'),
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

    hqScene.traverse((child) => {
      if (child.name.startsWith('SOCKET_') || child.name.startsWith('TARGET_') || child.name.startsWith('CAM_') || child.name.startsWith('COL_BOX_')) {
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        campaignFrame.setAnchorWorld(child.name, worldPos);
        child.visible = false;
      }
      if (child.isMesh) {
        const lowerName = child.name.toLowerCase();
        if (lowerName.includes('screen') || lowerName.includes('monitor')) {
          this.ambientObjects.screens.push(child);
        } else if (lowerName.includes('generator')) {
          this.ambientObjects.generators.push({ mesh: child, baseY: child.position.y });
        } else if (lowerName.includes('antenna_indicator')) {
          this.ambientObjects.antennas.push(child);
        }
      }
    });

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
      const maraPos = campaignFrame.requireAnchor('SOCKET_MARA');
      const npcModel = this.npcSystem.registerNPC({
        id: 'mara',
        name: 'Mara',
        x: maraPos.x,
        y: hqWorldPos.y, // Feet must touch the floor (Y=0 relative to building)
        z: maraPos.z,
        rotY: hqScene.rotation.y + Math.PI
      }, this.rootGroup);
      
      // Calculate her Box3 bounds and check intersection if applicable (C3)
      if (npcModel && npcModel.mesh) {
        npcModel.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(npcModel.mesh);
        console.log("Mara Box3 bounds:", box);
      }
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

  createProceduralProp(type) {
    let geo, mat, mesh;
    const group = new THREE.Group();
    switch (type) {
      case 'PROCEDURAL_CABLE_DANGLING':
      case 'PROCEDURAL_SEVERED_CABLES':
      case 'PROCEDURAL_CABLE_CONDUIT':
        geo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        geo.rotateX(Math.PI / 2);
        mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.1;
        group.add(mesh);
        break;
      case 'PROCEDURAL_PUDDLE':
      case 'PROCEDURAL_DRAG_MARK':
      case 'PROCEDURAL_ARC_BURN':
      case 'PROCEDURAL_CABLE_TRENCH':
        geo = new THREE.PlaneGeometry(2, 4);
        mat = new THREE.MeshStandardMaterial({ 
          color: type === 'PROCEDURAL_PUDDLE' ? 0x444444 : 0x111111,
          roughness: type === 'PROCEDURAL_PUDDLE' ? 0.1 : 0.9,
          transparent: true,
          opacity: 0.8
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.02; // slightly above ground
        group.add(mesh);
        break;
      case 'PROCEDURAL_DEAD_TREE':
        geo = new THREE.CylinderGeometry(0.2, 0.4, 4, 8);
        mat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 2;
        group.add(mesh);
        break;
      case 'PROCEDURAL_SMOKING_CORE':
        geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        mat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x00aaff, emissiveIntensity: 2.0 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.4;
        group.add(mesh);
        break;
      case 'PROCEDURAL_SCARAB_HUSK':
      case 'PROCEDURAL_ROBOT_TORSO':
      case 'PROCEDURAL_ANTENNA_FRAGMENTS':
        geo = new THREE.BoxGeometry(1.5, 0.5, 1);
        mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.25;
        group.add(mesh);
        break;
      case 'PROCEDURAL_ARC_BATTERY':
        geo = new THREE.BoxGeometry(1, 1.5, 1);
        mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x00f0ff, emissiveIntensity: 1.5 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.75;
        group.add(mesh);
        break;
      case 'PROCEDURAL_RED_NODE':
        geo = new THREE.SphereGeometry(0.2, 16, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff0000, emissiveIntensity: 2.0 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 1.5;
        
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.75;
        
        group.add(mesh);
        group.add(pole);
        break;
    }
    
    group.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    
    return group;
  }

  buildAuthoredProps() {
    LEVEL_1_PROPS.forEach((p) => {
      const t = p.s / Math.max(1, campaignPath.totalLength);
      const centerPos = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const worldPos = centerPos.clone().addScaledVector(normal, p.lateral);
      const yaw = Math.atan2(tangent.x, tangent.z) + (p.rotY || 0);

      if (p.model.startsWith('PROCEDURAL_')) {
        const mesh = this.createProceduralProp(p.model);
        if (mesh) {
          mesh.position.copy(worldPos);
          mesh.rotation.y = yaw;
          if (p.scale) mesh.scale.setScalar(p.scale);
          this.rootGroup.add(mesh);
        }
        return;
      }

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

    // Add Lattice blast barrier at Level 1 End (s = ~170m)
    if (this.collision) {
      const pathEndPos = campaignPath.getWorldPointAt(1.0);
      const endTangent = campaignPath.getWorldTangentAt(1.0);
      
      const extraDist = Math.max(0, 170 - campaignPath.totalLength);
      const barrierPos = pathEndPos.clone().addScaledVector(endTangent, extraDist);
      const yaw = Math.atan2(endTangent.x, endTangent.z);
      
      this.collision.addBox(barrierPos.x, barrierPos.z, 40.0, 4.0, yaw, 'col_lattice_barrier');
    }
  }

  setupInteractions() {
    // 1. Signal Console (inside Relay HQ)
    const consolePos = campaignFrame.requireAnchor('SOCKET_SIGNAL_CONSOLE');
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
    if (this.endingSequenceActive) return;
    this.endingSequenceActive = true;
    this.endingSequenceTime = 0;
    this.endingStage = 0;

    const repeaterPos = campaignFrame.requireAnchor('signal_repeater_console');
    
    // Create animated shard
    this.animatedShard = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0 })
    );
    this.animatedShard.position.copy(repeaterPos).add(new THREE.Vector3(0, 1, 1));
    this.rootGroup.add(this.animatedShard);

    // Create procedural cables
    this.endingCables = [];
    for(let i=0; i<3; i++) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 2),
            new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x00f0ff, emissiveIntensity: 0.0 })
        );
        mesh.position.copy(repeaterPos).add(new THREE.Vector3(-1 + i, 0.1, -1));
        mesh.rotation.x = Math.PI / 2;
        this.rootGroup.add(mesh);
        this.endingCables.push(mesh);
    }
  }

  triggerFinalCutscene() {
    const repeaterPos = campaignFrame.requireAnchor('signal_repeater_console');
    const socketPos = repeaterPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const towerTopPos = repeaterPos.clone().add(new THREE.Vector3(0, 15, 0));
    const forestLookPos = repeaterPos.clone().add(new THREE.Vector3(0, 8, 30)); 

    // Create distant red lights
    for(let i=0; i<5; i++) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 5.0 })
        );
        mesh.position.copy(repeaterPos).add(new THREE.Vector3(-10 + i*5, 2 + Math.random()*5, 40 + Math.random()*10));
        this.rootGroup.add(mesh);
    }
    // Large machine silhouette
    const silhouette = new THREE.Mesh(
        new THREE.BoxGeometry(8, 12, 4),
        new THREE.MeshStandardMaterial({ color: 0x050505 })
    );
    silhouette.position.copy(repeaterPos).add(new THREE.Vector3(0, 6, 45));
    this.rootGroup.add(silhouette);

    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 10.0 })
    );
    eye.position.set(0, 4, -2);
    silhouette.add(eye);

    if (this.cutsceneDirector) {
      this.cutsceneDirector.playSequence([
        {
          targetPos: socketPos,
          duration: 2.0,
          subtitle: { speaker: '', text: "" }
        },
        {
          targetPos: towerTopPos,
          duration: 3.0,
          subtitle: { speaker: '', text: "" }
        },
        {
          targetPos: forestLookPos,
          duration: 3.0,
          subtitle: { speaker: 'UNKNOWN', text: "Runner signature confirmed." }
        },
        {
          targetPos: forestLookPos,
          duration: 3.0,
          subtitle: { speaker: 'MARA', text: "Ryder... whatever that is, it knows where we are." }
        }
      ], () => {
        missionEvents.emit('objectInteracted', 'signal_repeater_console');
      });
    } else {
      missionEvents.emit('objectInteracted', 'signal_repeater_console');
    }
  }

  update(playerPos, dt = 0.016) {
    this.ambientTime += dt;
    
    // Ambient animations
    const screenEmissive = 1.0 + 0.5 * Math.sin(this.ambientTime * 3.0);
    this.ambientObjects.screens.forEach(s => {
      if (s.material && s.material.emissiveIntensity !== undefined) {
        s.material.emissiveIntensity = screenEmissive;
      }
    });
    
    this.ambientObjects.generators.forEach(g => {
      g.mesh.position.y = g.baseY + Math.sin(this.ambientTime * 50.0) * 0.005;
    });
    
    const antennaEmissive = 1.0 + Math.sin(this.ambientTime * 2.0);
    this.ambientObjects.antennas.forEach(a => {
      if (a.material && a.material.emissiveIntensity !== undefined) {
        a.material.emissiveIntensity = antennaEmissive;
      }
    });

    if (this.endingSequenceActive && this.endingSequenceTime < 4.0) {
      this.endingSequenceTime += dt;
      const t = this.endingSequenceTime;
      
      const repeaterPos = campaignFrame.requireAnchor('signal_repeater_console');
      const socketPos = repeaterPos.clone().add(new THREE.Vector3(0, 1.2, 0));

      if (t < 1.0) {
         this.animatedShard.position.lerp(socketPos, 0.1);
      } else if (t >= 1.0 && this.endingStage === 0) {
         this.endingStage = 1;
         this.animatedShard.visible = false;
      }
      
      if (t >= 1.5 && t < 2.5) {
         if (t > 1.5) this.endingCables[0].material.emissiveIntensity = 2.0;
         if (t > 1.8) this.endingCables[1].material.emissiveIntensity = 2.0;
         if (t > 2.1) this.endingCables[2].material.emissiveIntensity = 2.0;
      }
      
      if (t >= 2.5 && t < 4.0) {
         this.ambientObjects.generators.forEach(g => {
            g.mesh.rotation.y += 10.0 * dt;
         });
      }

      if (t >= 4.0 && this.endingStage === 1) {
         this.endingStage = 2;
         this.triggerFinalCutscene();
      }
    }

    const localPos = campaignFrame.toLocal(playerPos);
    for (const [id, sector] of this.sectors) {
      if (sector.contains(localPos.x, localPos.z)) {
        if (this.activeSectorId !== id) {
          this.activeSectorId = id;
          sector.activate();
        }
        break;
      }
    }
  }
}
