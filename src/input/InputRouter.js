/**
 * InputRouter: Central priority management for keyboard & mouse events.
 * Priority: Dialogue/Cutscene > Tutorial > Interaction > Combat > Movement
 */
export class InputRouter {
  constructor() {
    this.activeLayers = new Set();
    this.keyConsumers = new Map();
    this.consumedKeysThisFrame = new Set();

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.consumedKeysThisFrame.clear();
      
      // If modal dialogue is open, consume E and Space
      if (this.hasLayer('dialogue')) {
        if (e.code === 'KeyE' || e.code === 'Space') {
          const handler = this.keyConsumers.get('dialogue');
          if (handler) {
            handler(e);
          }
          e.stopPropagation();
          return;
        }
      }

      // If cutscene is active, allow skip with Space/Escape
      if (this.hasLayer('cutscene')) {
        if (e.code === 'Space' || e.code === 'Escape') {
          const handler = this.keyConsumers.get('cutscene');
          if (handler) handler(e);
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  setLayer(layerName, isActive) {
    if (isActive) {
      this.activeLayers.add(layerName);
    } else {
      this.activeLayers.delete(layerName);
    }
  }

  hasLayer(layerName) {
    return this.activeLayers.has(layerName);
  }

  registerKeyConsumer(layerName, callback) {
    this.keyConsumers.set(layerName, callback);
  }

  canMove() {
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue_modal') && !this.hasLayer('combat_tutorial_freeze');
  }

  canCombat() {
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue_modal') && !this.hasLayer('combat_tutorial_freeze');
  }

  canInteract() {
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue');
  }
}

export const inputRouter = new InputRouter();
