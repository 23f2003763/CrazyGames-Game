/**
 * CheckpointSystem: Records runtime campaign checkpoint progress.
 */
export class CheckpointSystem {
  constructor() {
    this.currentCheckpoint = {
      chapterId: 'chapter_01',
      sectorId: 'sector_01_relay',
      missionId: 'level_01_road_out',
      objectiveIndex: 0,
      timestamp: Date.now()
    };
  }

  saveCheckpoint(chapterId, sectorId, missionId, objectiveIndex) {
    this.currentCheckpoint = {
      chapterId,
      sectorId,
      missionId,
      objectiveIndex,
      timestamp: Date.now()
    };
    console.log('[CHECKPOINT] Progress saved:', this.currentCheckpoint);
  }

  getCheckpoint() {
    return this.currentCheckpoint;
  }
}
