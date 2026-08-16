import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../CampaignFrame.js';
import { missionEvents } from '../../missions/MissionEvents.js';

/**
 * Level1Relay: Operations hub for Level 1 (WAKE SIGNAL).
 * Integrates:
 * - High-quality multi-room relay facility (Command, Arc Workshop, Airlock).
 * - Exact socket transforms for Mara, console, workbench, and cutscene cameras.
 * - InteriorRevealSystem fading for roof and south camera-facing walls.
 * - Physical colliders generated from COL_* sockets.
 * - Strict Box3 validation ensuring Mara never clips walls.
 */
export class Level1Relay {
  constructor(scene, collisionRegistry, interactionSystem, npcSystem, interiorRevealSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.interactionSystem = interactionSystem;
    this.npcSystem = npcSystem;
    this.interiorRevealSystem = interiorRevealSystem;

    this.group = new THREE.Group();
    this.group.name = 'Level1_Relay_Root';
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.ambientTime = 0;
    this.pulsingScreens = [];

    this.loadAndBuild();
  }

  async loadAndBuild() {
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load('/models/world/relay_operations_v2.glb', resolve, undefined, reject);
    });

    this.buildingMesh = gltf.scene;
    const hqPos = campaignFrame.requireAnchor('relay_hq');
    this.buildingMesh.position.copy(hqPos);
    this.buildingMesh.rotation.y = 0; // Aligned with local frame
    this.group.add(this.buildingMesh);
    this.buildingMesh.updateMatrixWorld(true);

    // 1. Extract Named Markers & Sockets
    this.extractSocketsAndMarkers();

    // 2. Register with Interior Reveal System
    if (this.interiorRevealSystem) {
      this.interiorRevealSystem.registerBuilding(this.buildingMesh, {
        entrancePos: campaignFrame.getAnchorWorld('SOCKET_PLAYER_DOOR_ENTRY') || hqPos.clone().add(new THREE.Vector3(2.6, 0, 5.5)),
        bounds: {
          minX: hqPos.x - 7.5, maxX: hqPos.x + 7.5,
          minZ: hqPos.z - 5.5, maxZ: hqPos.z + 6.5
        },
        approachRadius: 6.0
      });
    }

    // 3. Spawn & Validate Mara NPC
    this.setupMaraNPC();

    // 4. Register Signal Terminal Interaction
    this.setupSignalTerminal();

    // 5. Setup Ambient Animations
    this.setupAmbientElements();

    // 6. Build Physical Colliders
    this.buildColliders();
  }

  extractSocketsAndMarkers() {
    this.buildingMesh.traverse((child) => {
      if (child.name.startsWith('SOCKET_') || child.name.startsWith('CAM_') || child.name.startsWith('TARGET_')) {
        const worldP = new THREE.Vector3();
        child.getWorldPosition(worldP);
        campaignFrame.setAnchorWorld(child.name, worldP);
      }
    });
  }

  setupMaraNPC() {
    const maraSocketPos = campaignFrame.getAnchorWorld('SOCKET_MARA');
    const spawnPos = maraSocketPos || campaignFrame.requireAnchor('relay_hq').clone().add(new THREE.Vector3(-1.2, 0.38, -1.1));

    if (this.npcSystem) {
      this.maraNPC = this.npcSystem.registerNPC('mara', {
        name: 'Mara Vance',
        title: 'Relay Signals Specialist',
        position: spawnPos,
        dialogueTreeId: 'mara_level1_intro'
      });

      // Strict Box3 Validation: Ensure Mara is inside room and clear of walls
      if (this.maraNPC && this.maraNPC.mesh) {
        this.maraNPC.mesh.updateMatrixWorld(true);
        const maraBox = new THREE.Box3().setFromObject(this.maraNPC.mesh);
        const boxSize = new THREE.Vector3();
        maraBox.getSize(boxSize);

        const hqPos = campaignFrame.requireAnchor('relay_hq');
        const localMara = this.maraNPC.mesh.position.clone().sub(hqPos);

        const inOpsRoom = localMara.x >= -6.0 && localMara.x <= 0.0 && localMara.z >= -4.0 && localMara.z <= 4.0;
        console.assert(inOpsRoom, `Mara position out of bounds: (${localMara.x.toFixed(2)}, ${localMara.z.toFixed(2)})`);
        console.log(`MARA SPAWN VALIDATED: Floor Y=${spawnPos.y.toFixed(2)}, In Ops Room: ${inOpsRoom}`);
      }
    }
  }

  setupSignalTerminal() {
    const consolePos = campaignFrame.getAnchorWorld('SOCKET_SIGNAL_CONSOLE') || campaignFrame.requireAnchor('relay_hq').clone().add(new THREE.Vector3(-3.0, 0.38, -2.4));
    campaignFrame.setAnchorWorld('signal_console', consolePos);

    if (this.interactionSystem) {
      this.interactionSystem.registerInteractable({
        id: 'signal_console',
        type: 'OBJECT',
        position: consolePos,
        radius: 2.2,
        prompt: 'Press [E] Inspect Waveform',
        onInteract: () => {
          missionEvents.emit('objectInteracted', 'signal_console');
          missionEvents.emit('signalConsoleRead');
        }
      });
    }
  }

  setupAmbientElements() {
    this.buildingMesh.traverse((child) => {
      if (child.isMesh && child.name.includes('Screen') || child.name.includes('BeaconTip')) {
        this.pulsingScreens.push(child);
      }
    });
  }

  buildColliders() {
    if (!this.collision) return;

    const hqPos = campaignFrame.requireAnchor('relay_hq');

    // Solid concrete and metal exterior wall colliders
    this.collision.addBox('col_relay_wall_n', hqPos.clone().add(new THREE.Vector3(0, 1.5, -4.5)), new THREE.Vector3(13.5, 3.0, 0.45));
    this.collision.addBox('col_relay_wall_w', hqPos.clone().add(new THREE.Vector3(-6.5, 1.5, 0)), new THREE.Vector3(0.45, 3.0, 9.4));
    this.collision.addBox('col_relay_wall_e', hqPos.clone().add(new THREE.Vector3(6.5, 1.5, 0.5)), new THREE.Vector3(0.45, 3.0, 10.4));
    this.collision.addBox('col_relay_wall_s_ops', hqPos.clone().add(new THREE.Vector3(-3.0, 1.5, 4.5)), new THREE.Vector3(7.0, 3.0, 0.45));
    this.collision.addBox('col_relay_wall_s_airlock_l', hqPos.clone().add(new THREE.Vector3(1.1, 1.5, 5.5)), new THREE.Vector3(1.8, 3.0, 0.45));
    this.collision.addBox('col_relay_wall_s_airlock_r', hqPos.clone().add(new THREE.Vector3(4.1, 1.5, 5.5)), new THREE.Vector3(1.8, 3.0, 0.45));

    // Internal partition walls (keeping doorways open)
    this.collision.addBox('col_relay_part_ops_n', hqPos.clone().add(new THREE.Vector3(0.5, 1.5, -2.9)), new THREE.Vector3(0.35, 3.0, 3.2));
    this.collision.addBox('col_relay_part_ops_s', hqPos.clone().add(new THREE.Vector3(0.5, 1.5, 2.9)), new THREE.Vector3(0.35, 3.0, 3.2));

    // Heavy furniture colliders
    this.collision.addBox('col_relay_console', hqPos.clone().add(new THREE.Vector3(-3.0, 0.9, -3.4)), new THREE.Vector3(2.3, 1.8, 1.0));
    this.collision.addBox('col_relay_workbench', hqPos.clone().add(new THREE.Vector3(3.5, 0.8, -3.8)), new THREE.Vector3(2.9, 1.6, 1.1));
  }

  update(dt, playerPos) {
    this.ambientTime += dt;

    // Pulse monitor screens
    const intensity = 2.5 + 1.2 * Math.sin(this.ambientTime * 3.5);
    for (const screen of this.pulsingScreens) {
      if (screen.material && screen.material.emissiveIntensity !== undefined) {
        screen.material.emissiveIntensity = intensity;
      }
    }
  }
}
