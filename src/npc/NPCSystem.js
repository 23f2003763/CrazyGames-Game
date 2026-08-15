import * as THREE from 'three';
import { NPC } from './NPC.js';
import { DialogueUI } from '../ui/DialogueUI.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * NPCSystem: Orchestrates survivor NPCs, proximity triggers, and dialogue sequences.
 */
export class NPCSystem {
  constructor(scene, interactionSystem) {
    this.scene = scene;
    this.interactionSystem = interactionSystem;
    this.dialogueUI = new DialogueUI();
    this.npcs = new Map();
  }

  registerNPC(config, parentGroup) {
    // config: { id, name, x, y, z, rotY }
    const npc = new NPC(this.scene, config, this.dialogueUI);
    parentGroup.add(npc.group);
    this.npcs.set(config.id, npc);

    // Register with InteractionSystem
    this.interactionSystem.registerInteractable({
      id: config.id,
      position: new THREE.Vector3(config.x, config.y, config.z),
      radius: 2.8,
      text: `Talk to ${config.name}`,
      promptOffsetY: 2.1,
      onInteract: () => this.talkTo(config.id)
    });
  }

  talkTo(npcId) {
    if (npcId === 'mara') {
      this.dialogueUI.show(
        'MARA',
        "Road's gone quiet. Grab the supply kit before you head out.",
        () => {
          missionEvents.emit('npcTalked', 'mara');
        }
      );
    }
  }

  update(dt, playerPos) {
    this.npcs.forEach((npc) => {
      npc.update(dt, playerPos);
    });
  }
}
