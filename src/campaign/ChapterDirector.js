import { CAMPAIGN_CHAPTERS } from './CampaignData.js';

/**
 * ChapterDirector: Coordinates high-level chapter state and progression.
 */
export class ChapterDirector {
  constructor(campaignWorld, missionSystem) {
    this.campaignWorld = campaignWorld;
    this.missionSystem = missionSystem;

    this.chapters = CAMPAIGN_CHAPTERS;
    this.currentChapterIndex = 0;
    this.currentChapter = this.chapters[0];
  }

  getCurrentChapter() {
    return this.currentChapter;
  }

  advanceToNextChapter() {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      this.currentChapterIndex++;
      this.currentChapter = this.chapters[this.currentChapterIndex];
      console.log(`[CHAPTER] Advanced to: ${this.currentChapter.name}`);
    }
  }
}
