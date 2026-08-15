/**
 * ObjectiveHUD: Minimal, clean top-left objective card & level complete banner.
 */
export class ObjectiveHUD {
  constructor() {
    this.createHUD();
  }

  createHUD() {
    // 1. Objective Card Container
    this.card = document.createElement('div');
    this.card.id = 'objective-card';
    this.card.style.position = 'absolute';
    this.card.style.top = '24px';
    this.card.style.left = '24px';
    this.card.style.padding = '12px 18px';
    this.card.style.background = 'rgba(18, 22, 28, 0.88)';
    this.card.style.borderLeft = '4px solid #dfb438';
    this.card.style.borderRadius = '4px';
    this.card.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
    this.card.style.color = '#ffffff';
    this.card.style.fontFamily = 'monospace, sans-serif';
    this.card.style.zIndex = '2000';
    this.card.style.pointerEvents = 'none';
    this.card.style.transition = 'all 0.3s ease';

    this.card.innerHTML = `
      <div id="hud-mission-title" style="font-size:11px; color:#dfb438; text-transform:uppercase; letter-spacing:1.5px; font-weight:bold; margin-bottom:4px;">
        LEVEL 1 — ROAD OUT
      </div>
      <div id="hud-objective-text" style="font-size:14px; font-weight:bold; color:#f0f6fc;">
        Speak with Mara
      </div>
    `;
    document.body.appendChild(this.card);

    this.missionTitleEl = this.card.querySelector('#hud-mission-title');
    this.objectiveTextEl = this.card.querySelector('#hud-objective-text');

    // 2. Level Complete Banner Container
    this.banner = document.createElement('div');
    this.banner.id = 'level-complete-banner';
    this.banner.style.position = 'absolute';
    this.banner.style.top = '25%';
    this.banner.style.left = '50%';
    this.banner.style.transform = 'translate(-50%, -50%) scale(0.9)';
    this.banner.style.padding = '24px 48px';
    this.banner.style.background = 'linear-gradient(180deg, rgba(20, 26, 33, 0.98) 0%, rgba(10, 14, 18, 0.98) 100%)';
    this.banner.style.border = '2px solid #dfb438';
    this.banner.style.borderRadius = '8px';
    this.banner.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.8)';
    this.banner.style.textAlign = 'center';
    this.banner.style.zIndex = '5000';
    this.banner.style.display = 'none';
    this.banner.style.opacity = '0';
    this.banner.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.banner.innerHTML = `
      <div style="font-size:12px; color:#dfb438; text-transform:uppercase; letter-spacing:3px; font-weight:bold; margin-bottom:6px;">MISSION ACCOMPLISHED</div>
      <div style="font-size:26px; font-weight:bold; color:#ffffff; letter-spacing:1px; margin-bottom:12px;">ROAD OUT COMPLETE</div>
      <div style="font-size:14px; color:#a371f7; font-family:monospace; margin-bottom:4px;">REWARDS: +25 SCRAP &bull; +10 PARTS</div>
      <div style="font-size:12px; color:#8b949e; margin-top:8px;">CHECKPOINT SAVED</div>
    `;
    document.body.appendChild(this.banner);
  }

  setObjective(objective, mission) {
    if (mission) {
      this.missionTitleEl.textContent = mission.title || 'CAMPAIGN MISSION';
    }
    if (objective) {
      this.objectiveTextEl.textContent = objective.title || 'Explore Area';
      
      // Pulse animation
      this.card.style.transform = 'scale(1.05)';
      this.card.style.borderLeftColor = '#ffffff';
      setTimeout(() => {
        this.card.style.transform = 'scale(1.0)';
        this.card.style.borderLeftColor = '#dfb438';
      }, 300);
    }
  }

  showLevelComplete(missionTitle = 'ROAD OUT') {
    this.banner.style.display = 'block';
    setTimeout(() => {
      this.banner.style.opacity = '1';
      this.banner.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }, 50);

    setTimeout(() => {
      this.banner.style.opacity = '0';
      this.banner.style.transform = 'translate(-50%, -50%) scale(0.9)';
      setTimeout(() => {
        this.banner.style.display = 'none';
      }, 400);
    }, 4000);
  }
}
