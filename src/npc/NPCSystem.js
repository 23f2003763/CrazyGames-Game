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

    const worldPos = new THREE.Vector3(config.x, config.y, config.z);
    this.interactionSystem.registerInteractable({
      id: config.id,
      position: worldPos,
      radius: 3.2,
      text: `Talk to ${config.name}`,
      promptOffsetY: 2.1,
      onInteract: () => this.talkTo(config.id)
    });
  }

  getNPC(id) {
    return this.npcs.get(id);
  }

  getNPCWorldPosition(id) {
    const npc = this.npcs.get(id);
    if (!npc) return null;
    const pos = new THREE.Vector3();
    npc.group.getWorldPosition(pos);
    return pos;
  }

  talkTo(npcId) {
    if (npcId === 'mara') {
      const dialogueLines = [
        { speaker: 'MARA', text: "That signal crossed a channel that's been dead for nine years." },
        { speaker: 'RYDER', text: "Machine signal?" },
        { speaker: 'MARA', text: "No. That's the problem. It authenticated as human." },
        { speaker: 'RYDER', text: "Where?" },
        { speaker: 'MARA', text: "North perimeter. Check the signal terminal for the waveform." }
      ];

      let lineIdx = 0;
      const showNextLine = () => {
        if (lineIdx < dialogueLines.length) {
          const line = dialogueLines[lineIdx++];
          this.dialogueUI.showModalDialogue(line.speaker, line.text, showNextLine);
        } else {
          this.dialogueUI.closeModal();
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
