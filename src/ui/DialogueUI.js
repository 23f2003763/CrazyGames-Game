/**
 * DialogueUI: Clean, cinematic dialogue banner near screen bottom.
 */
export class DialogueUI {
  constructor() {
    this.isOpen = false;
    this.createUI();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'cinematic-dialogue-banner';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '36px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.width = 'min(640px, 90vw)';
    this.container.style.background = 'linear-gradient(180deg, rgba(22, 27, 34, 0.96) 0%, rgba(13, 17, 23, 0.98) 100%)';
    this.container.style.border = '1px solid rgba(223, 180, 56, 0.4)';
    this.container.style.borderRadius = '8px';
    this.container.style.padding = '16px 24px';
    this.container.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7)';
    this.container.style.color = '#ffffff';
    this.container.style.fontFamily = 'monospace, sans-serif';
    this.container.style.zIndex = '4000';
    this.container.style.display = 'none';
    this.container.style.transition = 'all 0.25s ease';

    this.container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span id="dialogue-speaker" style="color:#dfb438; font-weight:bold; font-size:14px; text-transform:uppercase; letter-spacing:1px;">MARA</span>
        <span style="font-size:11px; color:#8b949e; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:3px;">E / SPACE TO CONTINUE</span>
      </div>
      <div id="dialogue-text" style="font-size:15px; line-height:1.45; color:#f0f6fc;">
        "Road's gone quiet. Grab the supply kit before you head out."
      </div>
    `;

    document.body.appendChild(this.container);
    this.speakerEl = this.container.querySelector('#dialogue-speaker');
    this.textEl = this.container.querySelector('#dialogue-text');

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && (e.code === 'KeyE' || e.code === 'Space')) {
        this.close();
      }
    });
  }

  show(speaker, text, onComplete) {
    this.speakerEl.textContent = speaker;
    this.textEl.textContent = `"${text}"`;
    this.container.style.display = 'block';
    this.isOpen = true;
    this.onComplete = onComplete;
  }

  close() {
    if (!this.isOpen) return;
    this.container.style.display = 'none';
    this.isOpen = false;
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }
}
