import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pickup } from './Pickup.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * LootSystem: Tracks resources, spawns chests, triggers item magnetism.
 */
export class LootSystem {
  constructor(scene, interactionSystem, audioSystem) {
    this.scene = scene;
    this.interactionSystem = interactionSystem;
    this.audioSystem = audioSystem;

    this.loader = new GLTFLoader();
    this.chests = new Map();
    this.pickups = [];

    this.inventory = {
      scrap: 0,
      parts: 0,
      medkit: 0,
      ammo: 0,
      questItems: new Set()
    };

    this.createToastElement();
  }

  createToastElement() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'loot-toast-container';
    this.toastContainer.style.position = 'absolute';
    this.toastContainer.style.bottom = '80px';
    this.toastContainer.style.right = '24px';
    this.toastContainer.style.display = 'flex';
    this.toastContainer.style.flexDirection = 'column-reverse';
    this.toastContainer.style.gap = '8px';
    this.toastContainer.style.pointerEvents = 'none';
    this.toastContainer.style.zIndex = '3000';
    document.body.appendChild(this.toastContainer);
  }

  showToast(text, color = '#dfb438') {
    const toast = document.createElement('div');
    toast.style.padding = '8px 16px';
    toast.style.background = 'rgba(15, 20, 24, 0.94)';
    toast.style.borderLeft = `4px solid ${color}`;
    toast.style.borderRadius = '4px';
    toast.style.color = '#ffffff';
    toast.style.fontFamily = 'monospace, sans-serif';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 4px 14px rgba(0,0,0,0.6)';
    toast.style.transition = 'all 0.3s ease';
    toast.innerHTML = text;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  registerChest(config, parentGroup) {
    // config: { id, x, y, z, rotY, isQuestChest }
    const chestGroup = new THREE.Group();
    chestGroup.position.set(config.x, config.y, config.z);
    chestGroup.rotation.y = config.rotY || 0;
    parentGroup.add(chestGroup);

    const path = config.isQuestChest 
      ? '/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Chest_Special.gltf'
      : '/assets/vendor/quaternius/zombie-apocalypse/Environment/glTF/Chest.gltf';

    this.loader.load(path, (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      chestGroup.add(model);
    });

    const chestData = {
      id: config.id,
      group: chestGroup,
      isOpened: false,
      isQuestChest: config.isQuestChest
    };
    this.chests.set(config.id, chestData);

    // Register with Interaction System
    this.interactionSystem.registerInteractable({
      id: config.id,
      position: new THREE.Vector3(config.x, config.y, config.z),
      radius: 2.5,
      text: config.isQuestChest ? 'Search Road Supply Kit' : 'Search Supply Crate',
      onInteract: () => this.openChest(config.id)
    });
  }

  openChest(chestId) {
    const chest = this.chests.get(chestId);
    if (!chest || chest.isOpened) return;

    chest.isOpened = true;
    this.interactionSystem.unregisterInteractable(chestId);

    if (this.audioSystem) {
      this.audioSystem.playChestOpen();
    }

    const pos = chest.group.position;

    // Spawn rewards
    if (chest.isQuestChest) {
      this.spawnPickup('Scrap', 15, pos);
      this.spawnPickup('Parts', 5, pos);
      this.spawnPickup('Medkit', 1, pos);
      this.spawnPickup('Road Gate Fuse', 1, pos);

      this.inventory.questItems.add('Road Gate Fuse');
      this.showToast('+ Road Gate Fuse (Key Item)', '#a371f7');
    } else {
      this.spawnPickup('Scrap', 10, pos);
      this.spawnPickup('Parts', 3, pos);
      this.spawnPickup('Ammo', 12, pos);
    }

    missionEvents.emit('chestOpened', chestId);
  }

  spawnPickup(type, amount, originPos) {
    const pickup = new Pickup(this.scene, type, amount, originPos);
    this.pickups.push(pickup);
  }

  update(dt, playerPos) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt, playerPos);

      if (p.isCollected) {
        if (p.type === 'Scrap') this.inventory.scrap += p.amount;
        if (p.type === 'Parts') this.inventory.parts += p.amount;
        if (p.type === 'Medkit') this.inventory.medkit += p.amount;
        if (p.type === 'Ammo') this.inventory.ammo += p.amount;

        this.showToast(`+${p.amount} ${p.type}`);
        if (this.audioSystem) {
          this.audioSystem.playLootPickup();
        }
        this.pickups.splice(i, 1);
      }
    }
  }
}
