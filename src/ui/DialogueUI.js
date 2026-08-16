import { inputRouter } from '../input/InputRouter.js';

// Custom Stylized SVG Character Portraits
const PORTRAITS = {
  MARA: `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="6" fill="#0D161F"/>
      <circle cx="24" cy="20" r="11" fill="#E8B89A"/>
      <!-- Dark hair with tech headset -->
      <path d="M13 18C13 11 18 8 24 8C30 8 35 11 35 18C35 21 34 24 33 25C31 21 28 17 24 17C20 17 17 21 15 25C14 24 13 21 13 18Z" fill="#1C2127"/>
      <!-- Teal Engineer Cowl / Collar -->
      <path d="M11 40C11 32 17 30 24 30C31 30 37 32 37 40V44H11V40Z" fill="#178582"/>
      <!-- Orange Harness Accent -->
      <path d="M19 31L16 44H20L22 31H19Z" fill="#FF7733"/>
      <!-- Headset Comm Diode -->
      <circle cx="34" cy="20" r="3" fill="#00F0FF"/>
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" stroke="#00F0FF" stroke-opacity="0.6"/>
    </svg>
  `,
  RYDER: `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="6" fill="#0E1719"/>
      <circle cx="24" cy="19" r="11" fill="#DEAC8A"/>
      <!-- Brown Survivor Hair -->
      <path d="M13 17C13 10 18 7 24 7C30 7 35 10 35 17C35 19 33 18 31 16C28 14 26 15 24 15C21 15 19 14 17 16C15 18 13 19 13 17Z" fill="#2E1F18"/>
      <!-- Dark Olive Jacket -->
      <path d="M11 40C11 33 17 31 24 31C31 31 37 33 37 40V44H11V40Z" fill="#2D3B2E"/>
      <!-- Bright Burnt Orange Scarf -->
      <path d="M16 28C19 32 29 32 32 28C33 31 30 35 24 35C18 35 15 31 16 28Z" fill="#E65100"/>
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" stroke="#E65100" stroke-opacity="0.6"/>
    </svg>
  `
};

/**
 * DialogueUI: Action-game style dialogue banner with custom portraits and input routing.
 */
export class DialogueUI {
  constructor() {
    this.isModalOpen = false;
    this.currentLineCallback = null;
    this.radioTimer = null;

    this.createUI();
    this.setupInputRouting();
  }

  setupInputRouting() {
    inputRouter.registerKeyConsumer('dialogue', (e) => {
      if (this.isModalOpen) {
        this.advanceModal();
      }
    });
  }

  createUI() {
    // 1. Radio Subtitle Banner (Non-blocking lower-left for comms during gameplay)
    this.radioContainer = document.createElement('div');
    this.radioContainer.id = 'radio-subtitle-banner';
    this.radioContainer.style.cssText = `
      position: absolute;
      bottom: 28px;
      left: 28px;
      width: min(520px, 86vw);
      background: linear-gradient(135deg, rgba(13, 20, 26, 0.96) 0%, rgba(7, 11, 15, 0.98) 100%);
      border-left: 3px solid #00f0ff;
      border-radius: 4px;
      padding: 12px 18px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
      color: #ffffff;
      font-family: monospace, sans-serif;
      z-index: 3000;
      display: none;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;

    this.radioContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
        <span style="display:inline-block; width:8px; height:8px; background:#00f0ff; border-radius:50%; box-shadow:0 0 8px #00f0ff;"></span>
        <span id="radio-speaker-tag" style="color:#00f0ff; font-weight:bold; font-size:11px; letter-spacing:1.5px;">MARA // COMMS</span>
      </div>
      <div id="radio-subtitle-content" style="font-size:14px; color:#f0f6fc; line-height:1.45;"></div>
    `;
    document.body.appendChild(this.radioContainer);

    this.radioSpeakerEl = this.radioContainer.querySelector('#radio-speaker-tag');
    this.radioTextEl = this.radioContainer.querySelector('#radio-subtitle-content');

    // 2. Interactive Modal Dialogue Banner (Bottom-center with character portrait)
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-dialogue-banner';
    this.modalContainer.style.cssText = `
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      width: min(660px, 92vw);
      background: linear-gradient(180deg, rgba(16, 22, 28, 0.98) 0%, rgba(9, 13, 17, 0.98) 100%);
      border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: 8px;
      padding: 14px 20px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.85);
      color: #ffffff;
      font-family: monospace, sans-serif;
      z-index: 4500;
      display: none;
      transition: transform 0.15s ease, opacity 0.15s ease;
    `;

    this.modalContainer.innerHTML = `
      <div style="display:flex; gap:16px; align-items:center;">
        <div id="modal-portrait-slot" style="width:48px; height:48px; flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span id="modal-speaker-name" style="color:#00f0ff; font-weight:bold; font-size:13px; letter-spacing:1.5px;">MARA</span>
            <span style="font-size:11px; color:#00f0ff; background:rgba(0,240,255,0.12); border:1px solid rgba(0,240,255,0.3); padding:2px 8px; border-radius:3px; font-weight:bold;">
              [E] <span style="font-size:10px;">▶</span>
            </span>
          </div>
          <div id="modal-dialogue-body" style="font-size:15px; color:#f0f6fc; line-height:1.45; transition:opacity 0.12s ease;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalContainer);

    this.portraitSlot = this.modalContainer.querySelector('#modal-portrait-slot');
    this.speakerNameEl = this.modalContainer.querySelector('#modal-speaker-name');
    this.dialogueBodyEl = this.modalContainer.querySelector('#modal-dialogue-body');
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
      }, 200);
    }, durationMs);
  }

  showModalDialogue(speaker, text, onAdvance) {
    this.isModalOpen = true;
    this.currentLineCallback = onAdvance;
    inputRouter.setLayer('dialogue', true);

    const sUpper = speaker.toUpperCase();
    this.speakerNameEl.textContent = sUpper;
    this.speakerNameEl.style.color = sUpper === 'RYDER' ? '#FF7733' : '#00F0FF';

    // Insert SVG portrait
    this.portraitSlot.innerHTML = PORTRAITS[sUpper] || PORTRAITS.MARA;

    // Quick text fade transition
    this.dialogueBodyEl.style.opacity = '0';
    setTimeout(() => {
      this.dialogueBodyEl.textContent = `"${text}"`;
      this.dialogueBodyEl.style.opacity = '1';
    }, 80);

    this.modalContainer.style.display = 'block';
  }

  advanceModal() {
    if (!this.isModalOpen) return;
    const cb = this.currentLineCallback;
    this.currentLineCallback = null;
    if (cb) {
      cb();
    } else {
      this.closeModal();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.currentLineCallback = null;
    this.modalContainer.style.display = 'none';
    inputRouter.setLayer('dialogue', false);
  }
}
