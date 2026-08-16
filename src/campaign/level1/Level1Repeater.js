import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../CampaignFrame.js';
import { missionEvents } from '../../missions/MissionEvents.js';

/**
 * Level1Repeater: Landmark destination for Level 1 (WAKE SIGNAL).
 * Features:
 * - Tall 15m asymmetric communications mast with transceiver dishes and blinking beacon.
 * - Technical operations hut with signal console.
 * - 3 external Arc capacitors with cyan glow.
 * - Sealed northern Lattice blast barrier (impassable).
 * - Shard insertion sequence with animated power cables and generator spin-up.
 * - 3-shot finale cinematic revealing distant Lattice machine silhouette.
 */
export class Level1Repeater {
  constructor(scene, collisionRegistry, interactionSystem, cutsceneDirector, audioSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.interactionSystem = interactionSystem;
    this.cutsceneDirector = cutsceneDirector;
    this.audioSystem = audioSystem;

    this.group = new THREE.Group();
    this.group.name = 'Level1_Repeater_Root';
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.ambientTime = 0;
    this.isActivating = false;
    this.activationTime = 0;
    this.glowElements = [];

    this.loadAndBuild();
  }

  async loadAndBuild() {
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load('/models/world/repeater_site_v2.glb', resolve, undefined, reject);
    });

    this.siteMesh = gltf.scene;
    const repPos = campaignFrame.requireAnchor('repeater_site');
    this.siteMesh.position.copy(repPos);
    this.siteMesh.rotation.y = 0;
    this.group.add(this.siteMesh);
    this.siteMesh.updateMatrixWorld(true);

    // 1. Extract Named Sockets & Cameras
    this.extractSocketsAndMarkers();

    // 2. Register Console Interaction
    this.setupConsoleInteraction();

    // 3. Collect Animated Glow Elements
    this.siteMesh.traverse((child) => {
      if (child.isMesh && (child.name.includes('Beacon') || child.name.includes('Capacitor_Core') || child.name.includes('Panel'))) {
        this.glowElements.push(child);
      }
    });

    // 4. Build Physical Colliders
    this.buildColliders();
  }

  extractSocketsAndMarkers() {
    this.siteMesh.traverse((child) => {
      if (child.name.startsWith('SOCKET_') || child.name.startsWith('CAM_') || child.name.startsWith('TARGET_')) {
        const worldP = new THREE.Vector3();
        child.getWorldPosition(worldP);
        campaignFrame.setAnchorWorld(child.name, worldP);
      }
    });
  }

  setupConsoleInteraction() {
    const repPos = campaignFrame.requireAnchor('repeater_site');
    const consolePos = campaignFrame.getAnchorWorld('SOCKET_REPEATER_CONSOLE') || repPos.clone().add(new THREE.Vector3(-1.7, 0.35, -0.4));
    campaignFrame.setAnchorWorld('signal_repeater_console', consolePos);

    if (this.interactionSystem) {
      this.interactionSystem.registerInteractable({
        id: 'signal_repeater_console',
        type: 'OBJECT',
        position: consolePos,
        radius: 2.5,
        prompt: 'Press [E] Insert Signal Shard',
        onInteract: () => this.triggerShardActivation(consolePos)
      });
    }
  }

  buildColliders() {
    if (!this.collision) return;

    const repPos = campaignFrame.requireAnchor('repeater_site');

    // Mast center collision
    this.collision.addBox('col_repeater_mast', repPos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(3.0, 4.0, 3.0));
    // Technical hut
    this.collision.addBox('col_repeater_hut', repPos.clone().add(new THREE.Vector3(-3.8, 1.4, 0.5)), new THREE.Vector3(4.4, 3.0, 3.6));
    // Capacitors bank
    this.collision.addBox('col_repeater_caps', repPos.clone().add(new THREE.Vector3(3.8, 1.0, 0)), new THREE.Vector3(1.8, 2.5, 4.5));
    // Sealed Northern Blast Gate (Heavy impassable barrier at z = -4.5m)
    this.collision.addBox('col_repeater_blast_barrier', repPos.clone().add(new THREE.Vector3(0, 2.0, -4.5)), new THREE.Vector3(14.0, 4.5, 1.2));
  }

  triggerShardActivation(consolePos) {
    if (this.isActivating) return;
    this.isActivating = true;
    this.activationTime = 0;

    // 1. Shard Visual Prop: Glowing Cyan Shard rises into console socket
    const shardGeo = new THREE.OctahedronGeometry(0.18, 0);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: false
    });
    this.shardMesh = new THREE.Mesh(shardGeo, shardMat);
    this.shardMesh.position.copy(consolePos).add(new THREE.Vector3(0, 0.6, 0.8));
    this.scene.add(this.shardMesh);

    if (this.audioSystem) {
      this.audioSystem.playVoltCasterCharge();
    }
  }

  update(dt, playerPos) {
    this.ambientTime += dt;

    // Pulse beacon and capacitors
    const pulse = 2.0 + Math.sin(this.ambientTime * 2.5) * 1.0;
    for (const el of this.glowElements) {
      if (el.material && el.material.emissiveIntensity !== undefined) {
        el.material.emissiveIntensity = pulse;
      }
    }

    // Shard Activation Animation Sequence (~3.5s)
    if (this.isActivating && this.shardMesh) {
      this.activationTime += dt;
      const t = this.activationTime;

      const consolePos = campaignFrame.requireAnchor('signal_repeater_console');
      const socketTarget = consolePos.clone().add(new THREE.Vector3(0, 0.95, 0.1));

      // Shard rises and slots into console
      if (t < 1.2) {
        this.shardMesh.position.lerp(socketTarget, dt * 4.0);
        this.shardMesh.rotation.y += dt * 6.0;
      } else if (t >= 1.2 && this.shardMesh.visible) {
        this.shardMesh.visible = false;
        // Overcharge capacitor glows
        for (const el of this.glowElements) {
          if (el.material && el.material.emissiveIntensity !== undefined) {
            el.material.emissiveIntensity = 6.0;
          }
        }
      }

      // Conclude sequence and trigger 3-shot finale
      if (t >= 2.6) {
        this.isActivating = false;
        this.scene.remove(this.shardMesh);
        this.shardMesh = null;
        this.playFinalCutscene();
      }
    }
  }

  playFinalCutscene() {
    const repPos = campaignFrame.requireAnchor('repeater_site');
    const consolePos = campaignFrame.getAnchorWorld('SOCKET_REPEATER_CONSOLE') || repPos.clone().add(new THREE.Vector3(-1.7, 0.35, -0.4));
    const towerTopPos = repPos.clone().add(new THREE.Vector3(0, 14.0, 0));
    const forestLookPos = repPos.clone().add(new THREE.Vector3(0, 3.0, -25.0));

    if (this.cutsceneDirector) {
      this.cutsceneDirector.playSequence([
        {
          camPos: consolePos.clone().add(new THREE.Vector3(0, 1.8, 1.6)),
          targetPos: consolePos.clone().add(new THREE.Vector3(0, 0.9, 0)),
          duration: 2.2,
          subtitle: { speaker: 'SYSTEM', text: 'SIGNAL SHARD RECOGNIZED. GRID ROUTING INITIATED.' }
        },
        {
          camPos: repPos.clone().add(new THREE.Vector3(4.0, 3.5, 8.0)),
          targetPos: towerTopPos,
          duration: 2.8,
          subtitle: { speaker: '', text: '' }
        },
        {
          camPos: repPos.clone().add(new THREE.Vector3(0, 3.2, -2.5)),
          targetPos: forestLookPos,
          duration: 3.5,
          subtitle: { speaker: 'UNKNOWN', text: '...Runner signature confirmed...' }
        },
        {
          camPos: repPos.clone().add(new THREE.Vector3(0, 3.2, -2.5)),
          targetPos: forestLookPos,
          duration: 3.5,
          subtitle: { speaker: 'MARA', text: 'Ryder... whatever that is in the forest, it knows where we are.' }
        }
      ], () => {
        missionEvents.emit('objectInteracted', 'signal_repeater_console');
      });
    } else {
      missionEvents.emit('objectInteracted', 'signal_repeater_console');
    }
  }
}
