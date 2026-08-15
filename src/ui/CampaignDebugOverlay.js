/**
 * CampaignDebugOverlay: F5 debug overlay displaying real-time campaign runtime state.
 */
export class CampaignDebugOverlay {
  constructor(chapterDirector, missionSystem, sectorManager, player) {
    this.chapterDirector = chapterDirector;
    this.missionSystem = missionSystem;
    this.sectorManager = sectorManager;
    this.player = player;

    this.isVisible = false;
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'campaign-debug-overlay';
    this.container.style.position = 'absolute';
    this.container.style.top = '24px';
    this.container.style.right = '24px';
    this.container.style.width = '320px';
    this.container.style.padding = '14px 18px';
    this.container.style.background = 'rgba(10, 14, 18, 0.95)';
    this.container.style.border = '1px solid #58a6ff';
    this.container.style.borderRadius = '6px';
    this.container.style.color = '#58a6ff';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.fontSize = '12px';
    this.container.style.zIndex = '9999';
    this.container.style.display = 'none';
    this.container.style.pointerEvents = 'none';
    this.container.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.7)';

    document.body.appendChild(this.container);
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F5') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
    console.log(`[DEBUG] Campaign debug overlay: ${this.isVisible ? 'ON' : 'OFF'}`);
  }

  update() {
    if (!this.isVisible) return;

    const chapter = this.chapterDirector?.getCurrentChapter();
    const mission = this.missionSystem?.currentMission;
    const obj = this.missionSystem?.getCurrentObjective();
    const activeSecId = this.sectorManager?.activeSectorId || 'None';
    const pos = this.player?.position || { x: 0, y: 0, z: 0 };

    this.container.innerHTML = `
      <div style="color:#ffffff; font-weight:bold; font-size:13px; border-bottom:1px solid #30363d; padding-bottom:4px; margin-bottom:8px;">
        [F5] CAMPAIGN DEBUG OVERLAY
      </div>
      <div><strong>Chapter:</strong> ${chapter?.name || 'N/A'} (${chapter?.id})</div>
      <div><strong>Sector:</strong> ${activeSecId}</div>
      <div><strong>Mission:</strong> ${mission?.title || 'N/A'}</div>
      <div><strong>Objective [${this.missionSystem?.currentObjectiveIndex + 1}/${mission?.objectives?.length}]:</strong> ${obj?.title || 'None'}</div>
      <div style="margin-top:6px; color:#8b949e;"><strong>Player Pos:</strong> (${pos.x.toFixed(1)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(1)})</div>
    `;
  }
}
