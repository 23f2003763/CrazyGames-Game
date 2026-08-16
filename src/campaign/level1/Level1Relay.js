import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../CampaignFrame.js';
import { missionEvents } from '../../missions/MissionEvents.js';

/**
 * Level1Relay: authoritative Relay HQ runtime integration.
 *
 * This module deliberately uses the public APIs of NPCSystem and
 * InteriorRevealSystem correctly. The previous V2 implementation passed the wrong
 * argument shapes to BOTH systems, so Mara/interior setup could fail even though
 * the GLB itself loaded.
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
    this.ready = this.loadAndBuild();
  }

  async loadAndBuild() {
    const gltf = await this.loadGLTF('/models/world/relay_operations_v2.glb');
    this.buildingMesh = gltf.scene;

    const hqPos = campaignFrame.requireAnchor('relay_hq');
    this.buildingMesh.position.copy(hqPos);
    this.buildingMesh.rotation.y = 0;
    this.group.add(this.buildingMesh);
    this.buildingMesh.updateMatrixWorld(true);

    this.prepareMaterials();
    this.extractSocketsAndMarkers();
    this.registerInteriorReveal();
    this.buildColliders();
    await this.setupMaraNPC();
    this.setupSignalTerminal();
    this.setupAmbientElements();

    console.log('[Level1Relay] READY');
    return this;
  }

  loadGLTF(url) {
    return new Promise((resolve, reject) => this.loader.load(url, resolve, undefined, reject));
  }

  prepareMaterials() {
    this.buildingMesh.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      // Clone shared materials because the reveal system changes opacity.
      if (Array.isArray(child.material)) child.material = child.material.map(m => m.clone());
      else if (child.material) child.material = child.material.clone();
    });
  }

  extractSocketsAndMarkers() {
    this.markers = new Map();

    this.buildingMesh.traverse(child => {
      if (!child.name) return;
      if (
        child.name.startsWith('SOCKET_') ||
        child.name.startsWith('CAM_') ||
        child.name.startsWith('TARGET_')
      ) {
        const worldP = new THREE.Vector3();
        child.getWorldPosition(worldP);
        campaignFrame.setAnchorWorld(child.name, worldP);
        this.markers.set(child.name, child);
        child.visible = false;
      }
    });

    for (const required of [
      'SOCKET_MARA',
      'SOCKET_PLAYER_DOOR_ENTRY',
      'SOCKET_SIGNAL_CONSOLE',
      'CAM_OPEN_ANTENNA',
      'CAM_OPEN_CONSOLE',
      'CAM_OPEN_MARA',
      'TARGET_ANTENNA',
      'TARGET_SIGNAL_CONSOLE',
      'TARGET_MARA'
    ]) {
      if (!this.markers.has(required)) {
        throw new Error(`[Level1Relay] Required marker missing: ${required}`);
      }
    }
  }

  markerWorld(name) {
    const marker = this.markers.get(name);
    if (!marker) throw new Error(`[Level1Relay] Missing marker ${name}`);
    const p = new THREE.Vector3();
    marker.getWorldPosition(p);
    return p;
  }

  registerInteriorReveal() {
    if (!this.interiorRevealSystem) return;

    const fullBox = new THREE.Box3().setFromObject(this.buildingMesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    fullBox.getCenter(center);
    fullBox.getSize(size);

    // Interior trigger covers the building footprint. The approach zone expands the
    // doorway side so the player sees Mara before trying to enter.
    const triggerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(center.x, center.y, center.z),
      new THREE.Vector3(Math.max(8, size.x * 0.88), 5.0, Math.max(7, size.z * 0.84))
    );

    const door = this.markerWorld('SOCKET_PLAYER_DOOR_ENTRY');
    const approachCenter = door.clone().lerp(center, 0.18);
    const approachBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(approachCenter.x, center.y, approachCenter.z),
      new THREE.Vector3(7.5, 5.0, 7.5)
    );

    this.interiorRevealSystem.registerBuilding({
      id: 'relay_hq',
      rootGroup: this.buildingMesh,
      triggerBox,
      approachBox
    });
  }

  buildColliders() {
    if (!this.collision) return;

    // Prefer authored markers if the GLB contains them.
    const authored = {};
    this.buildingMesh.traverse(child => {
      if (child.name?.startsWith('COL_')) authored[child.name] = child;
    });

    if (Object.keys(authored).length > 0) {
      this.collision.buildFromRoots({ relay: this.buildingMesh });
      return;
    }

    // Safe fallback for older GLB exports. Door gap remains clear.
    const h = campaignFrame.requireAnchor('relay_hq');
    this.collision.addBox(h.x, h.z - 4.5, 13.5, 0.45, 0, 'col_relay_wall_n');
    this.collision.addBox(h.x - 6.5, h.z, 0.45, 9.4, 0, 'col_relay_wall_w');
    this.collision.addBox(h.x + 6.5, h.z + 0.5, 0.45, 10.4, 0, 'col_relay_wall_e');
    this.collision.addBox(h.x - 3.0, h.z + 4.5, 7.0, 0.45, 0, 'col_relay_wall_s_ops');
    this.collision.addBox(h.x + 1.1, h.z + 5.5, 1.8, 0.45, 0, 'col_relay_wall_s_airlock_l');
    this.collision.addBox(h.x + 4.1, h.z + 5.5, 1.8, 0.45, 0, 'col_relay_wall_s_airlock_r');
  }

  async setupMaraNPC() {
    if (!this.npcSystem) return;

    const maraPos = this.markerWorld('SOCKET_MARA');
    campaignFrame.setAnchorWorld('mara_hub', maraPos);

    // Correct NPCSystem API: registerNPC(config, parentGroup).
    this.npcSystem.registerNPC({
      id: 'mara',
      name: 'Mara',
      x: maraPos.x,
      y: maraPos.y,
      z: maraPos.z,
      rotY: Math.PI
    }, this.group);

    // Give the async character GLTF time to attach, then validate visibly useful bounds.
    await new Promise(resolve => setTimeout(resolve, 250));
    const mara = this.npcSystem.getNPC('mara');
    if (!mara) throw new Error('[Level1Relay] Mara failed to register');

    const roomBox = new THREE.Box3().setFromObject(this.buildingMesh);
    const maraPosNow = new THREE.Vector3();
    mara.group.getWorldPosition(maraPosNow);

    if (!roomBox.containsPoint(maraPosNow)) {
      throw new Error(`[Level1Relay] Mara socket is outside Relay bounds: ${maraPosNow.toArray().join(', ')}`);
    }
  }

  setupSignalTerminal() {
    const consolePos = this.markerWorld('SOCKET_SIGNAL_CONSOLE');
    campaignFrame.setAnchorWorld('signal_console', consolePos);

    if (!this.interactionSystem) return;

    this.interactionSystem.registerInteractable({
      id: 'signal_console',
      position: consolePos,
      radius: 2.4,
      text: 'Inspect Signal Terminal',
      promptOffsetY: 1.35,
      onInteract: () => {
        // Visible feedback before mission events fire.
        this.flashSignalScreens();
        missionEvents.emit('objectInteracted', 'signal_console');
        missionEvents.emit('signalConsoleRead');
      }
    });
  }

  flashSignalScreens() {
    this.pulsingScreens.forEach(screen => {
      const mats = Array.isArray(screen.material) ? screen.material : [screen.material];
      mats.forEach(mat => {
        if (mat && 'emissiveIntensity' in mat) mat.emissiveIntensity = 6.0;
      });
    });
  }

  setupAmbientElements() {
    this.buildingMesh.traverse(child => {
      if (!child.isMesh) return;
      const n = child.name.toLowerCase();
      if (n.includes('screen') || n.includes('monitor') || n.includes('beacontip') || n.includes('indicator')) {
        this.pulsingScreens.push(child);
      }
    });
  }

  update(dt) {
    this.ambientTime += dt;
    const intensity = 2.0 + 0.9 * (0.5 + 0.5 * Math.sin(this.ambientTime * 3.2));

    for (const screen of this.pulsingScreens) {
      const mats = Array.isArray(screen.material) ? screen.material : [screen.material];
      mats.forEach(mat => {
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, intensity, Math.min(1, dt * 5));
        }
      });
    }
  }
}
