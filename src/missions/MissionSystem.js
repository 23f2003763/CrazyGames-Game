import { MISSIONS } from './MissionData.js';
import { missionEvents } from './MissionEvents.js';

/**
 * MissionSystem: Event-driven campaign mission orchestrator.
 */
export class MissionSystem {
  constructor(audioSystem, checkpointSystem) {
    this.audioSystem = audioSystem;
    this.checkpointSystem = checkpointSystem;

    this.missions = MISSIONS;
    this.currentMissionIndex = 0;
    this.currentMission = this.missions[0];
    this.currentObjectiveIndex = 0;

    this.onObjectiveChanged = null;
    this.onMissionCompleted = null;

    this.initEventListeners();
  }

  getCurrentObjective() {
    if (!this.currentMission) return null;
    return this.currentMission.objectives[this.currentObjectiveIndex] || null;
  }

  initEventListeners() {
    // 1. NPC Interaction Event
    missionEvents.on('npcTalked', (npcId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'TALK' && obj.targetId === npcId) {
        this.advanceObjective();
      }
    });

    // 2. Loot Collected Event
    missionEvents.on('chestOpened', (chestId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'LOOT' && obj.targetId === chestId) {
        this.advanceObjective();
      }
    });

    // 3. Object Interacted Event
    missionEvents.on('objectInteracted', (targetId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'INTERACT' && obj.targetId === targetId) {
        this.advanceObjective();
      }
    });

    // 4. Zone Entered Event
    missionEvents.on('zoneReached', (zoneId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'REACH' && obj.targetId === zoneId) {
        this.advanceObjective();
      }
    });
  }

  advanceObjective() {
    const prevObj = this.getCurrentObjective();
    this.currentObjectiveIndex++;

    if (this.audioSystem) {
      this.audioSystem.playObjectiveUpdate();
    }

    if (this.currentObjectiveIndex >= this.currentMission.objectives.length - 1 && prevObj?.id === 'obj_follow_highway') {
      // Level 1 Complete set-piece moment!
      if (this.onMissionCompleted) {
        this.onMissionCompleted(this.currentMission);
      }
      if (this.checkpointSystem) {
        this.checkpointSystem.saveCheckpoint(
          this.currentMission.chapterId,
          'sector_02_highway',
          this.currentMission.id,
          this.currentObjectiveIndex
        );
      }
    }

    const nextObj = this.getCurrentObjective();
    if (this.onObjectiveChanged) {
      this.onObjectiveChanged(nextObj, this.currentMission);
    }
  }

  update(playerPos) {
    const obj = this.getCurrentObjective();
    if (!obj) return;

    if (obj.type === 'REACH') {
      const dist = playerPos.distanceTo(obj.targetPos);
      const reachRad = obj.reachRadius || 8.0;
      if (dist <= reachRad) {
        missionEvents.emit('zoneReached', obj.targetId);
      }
    }
  }
}
