/**
 * InputRouter: Single unified authority for keyboard & mouse inputs.
 * Priority: CUTSCENE > DIALOGUE > COMBAT_TUTORIAL > TUTORIAL > GAMEPLAY
 */
export class InputRouter {
  constructor() {
    this.activeLayers = new Set(['gameplay']);
    this.keyConsumers = new Map();

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      // 1. Cutscene Layer
      if (this.hasLayer('cutscene')) {
        if (e.code === 'Space' || e.code === 'Escape') {
          const handler = this.keyConsumers.get('cutscene');
          if (handler) handler(e);
          e.stopPropagation();
          return;
        }
      }

      // 2. Dialogue Layer
      if (this.hasLayer('dialogue')) {
        if (e.code === 'KeyE' || e.code === 'Space') {
          const handler = this.keyConsumers.get('dialogue');
          if (handler) handler(e);
          e.stopPropagation();
          return;
        }
      }

      // 3. Combat Tutorial Layer
      if (this.hasLayer('combat_tutorial')) {
        // Blocks standard combat/interact while tutorial input runs
        return;
      }

      // 4. Gameplay Interaction (only if not in cutscene/dialogue/tutorial)
      if (this.canInteract() && (e.code === 'KeyE' || e.key === 'e' || e.key === 'E')) {
        const handler = this.keyConsumers.get('interaction');
        if (handler) handler(e);
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
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue') && !this.hasLayer('combat_tutorial');
  }

  canCombat() {
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue') && !this.hasLayer('combat_tutorial') && !this.hasLayer('tutorial');
  }

  canInteract() {
    return !this.hasLayer('cutscene') && !this.hasLayer('dialogue') && !this.hasLayer('combat_tutorial') && !this.hasLayer('tutorial');
  }
}

export const inputRouter = new InputRouter();
