import * as THREE from 'three';

/**
 * InteractionSystem: Proximity-based interaction manager with floating prompt.
 */
export class InteractionSystem {
  constructor(camera) {
    this.camera = camera;
    this.interactables = [];
    this.currentNearest = null;

    this.createPromptElement();
    this.bindInput();
  }

  createPromptElement() {
    this.promptEl = document.createElement('div');
    this.promptEl.id = 'interaction-prompt';
    this.promptEl.style.position = 'absolute';
    this.promptEl.style.display = 'none';
    this.promptEl.style.padding = '6px 14px';
    this.promptEl.style.background = 'rgba(20, 24, 28, 0.92)';
    this.promptEl.style.border = '1px solid #dfb438';
    this.promptEl.style.borderRadius = '6px';
    this.promptEl.style.color = '#ffffff';
    this.promptEl.style.fontFamily = 'monospace, sans-serif';
    this.promptEl.style.fontSize = '13px';
    this.promptEl.style.fontWeight = 'bold';
    this.promptEl.style.pointerEvents = 'none';
    this.promptEl.style.transform = 'translate(-50%, -100%)';
    this.promptEl.style.zIndex = '2000';
    this.promptEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    this.promptEl.innerHTML = '<span style="background:#dfb438; color:#111; padding:2px 6px; border-radius:3px; margin-right:6px;">E</span> <span id="prompt-action-text">Interact</span>';
    document.body.appendChild(this.promptEl);
    this.textEl = this.promptEl.querySelector('#prompt-action-text');
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && this.currentNearest) {
        if (this.currentNearest.onInteract) {
          this.currentNearest.onInteract();
        }
      }
    });
  }

  registerInteractable(config) {
    // config: { id, object, radius, text, onInteract, position }
    this.interactables.push(config);
  }

  unregisterInteractable(id) {
    this.interactables = this.interactables.filter(item => item.id !== id);
    if (this.currentNearest?.id === id) {
      this.currentNearest = null;
      this.promptEl.style.display = 'none';
    }
  }

  update(playerPos) {
    let nearest = null;
    let minDistance = Infinity;

    for (const item of this.interactables) {
      const targetPos = item.position || (item.object ? item.object.position : null);
      if (!targetPos) continue;

      const dist = Math.hypot(playerPos.x - targetPos.x, playerPos.z - targetPos.z);
      const rad = item.radius || 2.4;

      if (dist <= rad && dist < minDistance) {
        minDistance = dist;
        nearest = item;
      }
    }

    this.currentNearest = nearest;

    if (nearest && this.camera) {
      const targetPos = nearest.position || nearest.object.position;
      const screenPos = targetPos.clone();
      screenPos.y += (nearest.promptOffsetY || 1.8);
      screenPos.project(this.camera);

      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = -(screenPos.y * 0.5 - 0.5) * window.innerHeight;

      this.promptEl.style.left = `${x}px`;
      this.promptEl.style.top = `${y}px`;
      this.textEl.textContent = nearest.text || 'Interact';
      this.promptEl.style.display = 'block';
    } else {
      this.promptEl.style.display = 'none';
    }
  }
}
