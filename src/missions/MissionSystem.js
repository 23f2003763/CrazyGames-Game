import { MISSIONS } from './MissionData.js';
import { missionEvents } from './MissionEvents.js';

/**
 * MissionSystem: Event-driven campaign mission orchestrator.
 */
export class MissionSystem {
  constructor(audioSystem, checkpointSystem, enemySystem) {
    this.audioSystem = audioSystem;
    this.checkpointSystem = checkpointSystem;
    this.enemySystem = enemySystem;

    this.missions = MISSIONS;
    this.currentMissionIndex = 0;
    this.currentMission = this.missions[0];
    this.currentObjectiveIndex = 0;
    this.completedObjectiveIds = new Set();

    this.onObjectiveChanged = null;
    this.onMissionCompleted = null;

    this.initEventListeners();
  }

  setEnemySystem(enemySystem) {
    this.enemySystem = enemySystem;
  }

  getCurrentObjective() {
    if (!this.currentMission) return null;
    return this.currentMission.objectives[this.currentObjectiveIndex] || null;
  }

  hasCompletedObjective(objectiveId) {
    return this.completedObjectiveIds.has(objectiveId);
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
    missionEvents.on('itemCollected', (itemId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'LOOT' && obj.targetId === itemId) {
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

    // 5. Enemies Defeated Event
    missionEvents.on('allEnemiesDefeated', (encounterId) => {
      const obj = this.getCurrentObjective();
      if (obj && obj.type === 'DEFEAT' && obj.targetId === encounterId) {
        this.advanceObjective();
      }
    });
  }

  advanceObjective() {
    const prevObj = this.getCurrentObjective();
    if (prevObj) {
      this.completedObjectiveIds.add(prevObj.id);
    }

    this.currentObjectiveIndex++;

    if (this.audioSystem) {
      this.audioSystem.playObjectiveUpdate();
    }

    const nextObj = this.getCurrentObjective();

    // Arm scarab ambush only when follow trace becomes active
    if (nextObj?.id === 'obj_follow_trace' && this.enemySystem) {
      this.enemySystem.armEncounter('scarab_ambush');
    }

    if (prevObj?.id === 'obj_reach_repeater') {
      if (this.onMissionCompleted) {
        this.onMissionCompleted(this.currentMission);
      }
      if (this.checkpointSystem) {
        this.checkpointSystem.saveCheckpoint(
          this.currentMission.chapterId,
          'sector_01_relay',
          this.currentMission.id,
          this.currentObjectiveIndex
        );
      }
    }

    if (this.onObjectiveChanged) {
      this.onObjectiveChanged(nextObj, this.currentMission);
    }
  }

  update(playerPos) {
    const obj = this.getCurrentObjective();
    if (!obj || !playerPos) return;

    // Check distance-based REACH objectives
    if (obj.type === 'REACH' && obj.targetPos) {
      const rad = obj.reachRadius || 6.0;
      if (playerPos.distanceTo(obj.targetPos) <= rad) {
        missionEvents.emit('zoneReached', obj.targetId);
      }
    }
  }
}
