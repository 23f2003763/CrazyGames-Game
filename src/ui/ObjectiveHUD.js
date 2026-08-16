/**
 * ObjectiveHUD: Minimal top-left objective card & Level 1 Wake Signal completion banner.
 * Hidden during calibration and opening cinematic.
 */
export class ObjectiveHUD {
  constructor() {
    this.createHUD();
  }

  createHUD() {
    // 1. Objective Card (Hidden by default)
    this.card = document.createElement('div');
    this.card.id = 'objective-card';
    this.card.style.position = 'absolute';
    this.card.style.top = '24px';
    this.card.style.left = '24px';
    this.card.style.padding = '12px 18px';
    this.card.style.background = 'rgba(14, 20, 26, 0.92)';
    this.card.style.borderLeft = '3px solid #00f0ff';
    this.card.style.borderRadius = '4px';
    this.card.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.6)';
    this.card.style.color = '#ffffff';
    this.card.style.fontFamily = 'monospace, sans-serif';
    this.card.style.zIndex = '2000';
    this.card.style.pointerEvents = 'none';
    this.card.style.display = 'none';
    this.card.style.transition = 'all 0.3s ease';

    this.card.innerHTML = `
      <div id="hud-mission-title" style="font-size:11px; color:#00f0ff; text-transform:uppercase; letter-spacing:1.5px; font-weight:bold; margin-bottom:4px;"></div>
      <div id="hud-objective-text" style="font-size:14px; font-weight:bold; color:#f0f6fc;"></div>
    `;
    document.body.appendChild(this.card);

    this.missionTitleEl = this.card.querySelector('#hud-mission-title');
    this.objectiveTextEl = this.card.querySelector('#hud-objective-text');

    // 2. Level Complete Banner
    this.banner = document.createElement('div');
    this.banner.id = 'level-complete-banner';
    this.banner.style.position = 'absolute';
    this.banner.style.top = '25%';
    this.banner.style.left = '50%';
    this.banner.style.transform = 'translate(-50%, -50%) scale(0.9)';
    this.banner.style.padding = '24px 48px';
    this.banner.style.background = 'linear-gradient(180deg, rgba(16, 24, 32, 0.98) 0%, rgba(8, 12, 16, 0.98) 100%)';
    this.banner.style.border = '2px solid #00f0ff';
    this.banner.style.borderRadius = '8px';
    this.banner.style.boxShadow = '0 16px 48px rgba(0, 240, 255, 0.25)';
    this.banner.style.textAlign = 'center';
    this.banner.style.zIndex = '5000';
    this.banner.style.display = 'none';
    this.banner.style.opacity = '0';
    this.banner.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.banner.innerHTML = `
      <div style="font-size:12px; color:#00f0ff; text-transform:uppercase; letter-spacing:3px; font-weight:bold; margin-bottom:6px;">MISSION ACCOMPLISHED</div>
      <div style="font-size:26px; font-weight:bold; color:#ffffff; letter-spacing:1px; margin-bottom:12px;">WAKE SIGNAL COMPLETE</div>
      <div style="font-size:13px; color:#a371f7; font-family:monospace; margin-bottom:4px;">REWARDS: +30 SCRAP &bull; +15 ARC DUST &bull; SIGNAL FRAGMENT</div>
      <div style="font-size:12px; color:#58a6ff; font-family:monospace; margin-top:6px;">UNLOCKED: PULSE GRENADE BLUEPRINT</div>
      <div style="font-size:11px; color:#8b949e; margin-top:10px;">CHECKPOINT RECORDED &bull; RETURN TO THE RELAY</div>
    `;
    document.body.appendChild(this.banner);
  }

  show() {
    this.card.style.display = 'block';
  }

  hide() {
    this.card.style.display = 'none';
  }

  setObjective(objective, mission) {
    if (mission) {
      this.missionTitleEl.textContent = mission.title || 'LEVEL 1 — WAKE SIGNAL';
    }
    if (objective) {
      this.objectiveTextEl.textContent = objective.title || 'Explore Area';
      this.card.style.display = 'block';
      this.card.style.transform = 'scale(1.05)';
      this.card.style.borderLeftColor = '#ffffff';
      setTimeout(() => {
        this.card.style.transform = 'scale(1.0)';
        this.card.style.borderLeftColor = '#00f0ff';
      }, 300);
    }
  }

  showLevelComplete() {
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
    }, 5000);
  }
}
