import * as THREE from 'three';
import { NPC } from './NPC.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * NPCSystem: Orchestrates survivor NPCs, proximity triggers, and dialogue sequences.
 */
export class NPCSystem {
  constructor(scene, interactionSystem, dialogueUI) {
    this.scene = scene;
    this.interactionSystem = interactionSystem;
    this.dialogueUI = dialogueUI;
    this.npcs = new Map();
  }

  registerNPC(config, parentGroup) {
    // config: { id, name, x, y, z, rotY }
    const npc = new NPC(this.scene, config, this.dialogueUI);
    parentGroup.add(npc.group);
    this.npcs.set(config.id, npc);

    this.interactionSystem.registerInteractable({
      id: config.id,
      position: new THREE.Vector3(config.x, config.y, config.z),
      radius: 3.0,
      text: `Talk to ${config.name}`,
      promptOffsetY: 2.1,
      onInteract: () => this.talkTo(config.id)
    });
  }

  talkTo(npcId) {
    const npc = this.npcs.get(npcId);

    if (npcId === 'mara') {
      const dialogueLines = [
        { speaker: 'MARA', text: "That signal crossed a channel that's been dead for nine years." },
        { speaker: 'RYDER', text: "Machine signal?" },
        { speaker: 'MARA', text: "No. That's the problem. It authenticated as human." },
        { speaker: 'RYDER', text: "Where?" },
        { speaker: 'MARA', text: "North perimeter. Follow the trace." }
      ];

      let lineIdx = 0;
      const showNextLine = () => {
        if (lineIdx < dialogueLines.length) {
          const line = dialogueLines[lineIdx++];
          this.dialogueUI.showModalDialogue(line.speaker, line.text, showNextLine);
        } else {
          missionEvents.emit('npcTalked', 'mara');
        }
      };

      showNextLine();
    }
  }

  update(dt, playerPos) {
    this.npcs.forEach((npc) => {
      npc.update(dt, playerPos);
    });
  }
}
