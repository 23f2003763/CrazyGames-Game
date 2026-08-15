/**
 * DialogueUI: Upgraded cinematic subtitle & dialogue system for ARCFALL PROTOCOL.
 * Features speaker portrait frame, typewriter text, and non-blocking radio transmission banners.
 */
export class DialogueUI {
  constructor() {
    this.isModalOpen = false;
    this.onCompleteCallback = null;
    this.createUI();
  }

  createUI() {
    // 1. Radio Subtitle Container (Non-blocking lower-left banner)
    this.radioContainer = document.createElement('div');
    this.radioContainer.id = 'radio-subtitle-banner';
    this.radioContainer.style.position = 'absolute';
    this.radioContainer.style.bottom = '32px';
    this.radioContainer.style.left = '32px';
    this.radioContainer.style.width = 'min(500px, 85vw)';
    this.radioContainer.style.background = 'linear-gradient(135deg, rgba(14, 20, 26, 0.96) 0%, rgba(8, 12, 16, 0.98) 100%)';
    this.radioContainer.style.borderLeft = '3px solid #00f0ff';
    this.radioContainer.style.borderRadius = '4px';
    this.radioContainer.style.padding = '12px 18px';
    this.radioContainer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.7)';
    this.radioContainer.style.color = '#ffffff';
    this.radioContainer.style.fontFamily = 'monospace, sans-serif';
    this.radioContainer.style.zIndex = '3000';
    this.radioContainer.style.display = 'none';
    this.radioContainer.style.pointerEvents = 'none';
    this.radioContainer.style.transition = 'all 0.25s ease';

    this.radioContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
        <span style="display:inline-block; width:8px; height:8px; background:#00f0ff; border-radius:50%; box-shadow:0 0 8px #00f0ff;"></span>
        <span id="radio-speaker" style="color:#00f0ff; font-weight:bold; font-size:12px; letter-spacing:1.5px;">MARA // COMMS</span>
      </div>
      <div id="radio-text" style="font-size:14px; color:#f0f6fc; line-height:1.4;"></div>
    `;
    document.body.appendChild(this.radioContainer);

    this.radioSpeakerEl = this.radioContainer.querySelector('#radio-speaker');
    this.radioTextEl = this.radioContainer.querySelector('#radio-text');

    // 2. Interactive Modal Dialogue Banner (Centered bottom with portrait)
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-dialogue-banner';
    this.modalContainer.style.position = 'absolute';
    this.modalContainer.style.bottom = '36px';
    this.modalContainer.style.left = '50%';
    this.modalContainer.style.transform = 'translateX(-50%)';
    this.modalContainer.style.width = 'min(640px, 90vw)';
    this.modalContainer.style.background = 'linear-gradient(180deg, rgba(16, 22, 28, 0.98) 0%, rgba(10, 14, 18, 0.98) 100%)';
    this.modalContainer.style.border = '1px solid rgba(0, 240, 255, 0.35)';
    this.modalContainer.style.borderRadius = '8px';
    this.modalContainer.style.padding = '16px 22px';
    this.modalContainer.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.8)';
    this.modalContainer.style.color = '#ffffff';
    this.modalContainer.style.fontFamily = 'monospace, sans-serif';
    this.modalContainer.style.zIndex = '4000';
    this.modalContainer.style.display = 'none';

    this.modalContainer.innerHTML = `
      <div style="display:flex; gap:16px; align-items:center;">
        <div style="width:48px; height:48px; border:2px solid #00f0ff; border-radius:6px; background:rgba(0, 240, 255, 0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span style="font-size:22px; color:#00f0ff;">⚙️</span>
        </div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span id="modal-speaker" style="color:#00f0ff; font-weight:bold; font-size:13px; letter-spacing:1px;">MARA</span>
            <span style="font-size:11px; color:#8b949e; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:3px;">[E] TO CONTINUE</span>
          </div>
          <div id="modal-text" style="font-size:15px; color:#f0f6fc; line-height:1.45;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalContainer);

    this.modalSpeakerEl = this.modalContainer.querySelector('#modal-speaker');
    this.modalTextEl = this.modalContainer.querySelector('#modal-text');

    window.addEventListener('keydown', (e) => {
      if (this.isModalOpen && (e.code === 'KeyE' || e.code === 'Space')) {
        this.closeModal();
      }
    });
  }

  showRadioSubtitle(speaker, text, durationMs = 3500) {
    this.radioSpeakerEl.textContent = `${speaker.toUpperCase()} // COMMS`;
    this.radioTextEl.textContent = `"${text}"`;
    this.radioContainer.style.display = 'block';
    this.radioContainer.style.opacity = '1';

    if (this.radioTimer) clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => {
      this.radioContainer.style.opacity = '0';
      setTimeout(() => {
        this.radioContainer.style.display = 'none';
      }, 300);
    }, durationMs);
  }

  showModalDialogue(speaker, text, onComplete) {
    this.isModalOpen = true;
    this.modalSpeakerEl.textContent = speaker.toUpperCase();
    this.modalTextEl.textContent = `"${text}"`;
    this.modalContainer.style.display = 'block';
    this.onCompleteCallback = onComplete;
  }

  closeModal() {
    if (!this.isModalOpen) return;
    this.isModalOpen = false;
    this.modalContainer.style.display = 'none';
    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }
}
