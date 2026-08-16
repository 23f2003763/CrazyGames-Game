import * as THREE from 'three';
import { inputRouter } from '../input/InputRouter.js';

/**
 * InteractionSystem: Proximity-based interaction manager with floating prompt
 * and unified InputRouter priority routing.
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
    inputRouter.registerKeyConsumer('interaction', () => {
      this.interactCurrent();
    });
  }

  interactCurrent() {
    if (this.currentNearest && this.currentNearest.onInteract) {
      this.currentNearest.onInteract();
    }
  }

  registerInteractable(config) {
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
    if (!inputRouter.canInteract()) {
      this.promptEl.style.display = 'none';
      return;
    }

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

    if (this.currentNearest) {
      const targetPos = this.currentNearest.position || (this.currentNearest.object ? this.currentNearest.object.position : null);
      const screenPos = this.toScreenPosition(targetPos, this.currentNearest.promptOffsetY || 1.6);

      this.promptEl.style.left = `${screenPos.x}px`;
      this.promptEl.style.top = `${screenPos.y}px`;
      this.textEl.textContent = this.currentNearest.text || 'Interact';
      this.promptEl.style.display = 'block';
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  toScreenPosition(worldPos, offsetY = 1.6) {
    const v = new THREE.Vector3(worldPos.x, worldPos.y + offsetY, worldPos.z);
    v.project(this.camera);

    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    return { x, y };
  }
}
