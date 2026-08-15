import * as THREE from 'three';

/**
 * PlayerAnimator: Manages character skeletal animation playback,
 * smooth cross-fading (0.16s), and animation states (Idle, Walk, Run, Dodge).
 */
export class PlayerAnimator {
  constructor(player) {
    this.player = player;
    this.actions = {};
    this.currentAction = null;
    this.currentState = 'idle';
    this.crossFadeDuration = 0.18; // 0.12 - 0.22s

    if (this.player.isLoaded) {
      this.initAnimations();
    } else {
      this.player.onLoaded(() => this.initAnimations());
    }
  }

  initAnimations() {
    if (!this.player.mixer || !this.player.animations.length) return;

    // Map animation clips by name
    this.player.animations.forEach((clip) => {
      const action = this.player.mixer.clipAction(clip);
      
      // Default loop mode
      if (clip.name === 'Duck' || clip.name === 'Jump' || clip.name === 'HitReact' || clip.name === 'Death' || clip.name === 'Punch') {
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
      } else {
        action.loop = THREE.LoopRepeat;
      }
      
      this.actions[clip.name.toLowerCase()] = action;
      this.actions[clip.name] = action; // Case-preserving fallback
    });

    // Start with Idle
    this.playState('idle', true);
  }

  playState(stateName, immediate = false) {
    if (!this.player.mixer) return;

    let targetClipName = 'Idle';
    let timeScale = 1.0;

    switch (stateName) {
      case 'idle':
        targetClipName = 'Idle';
        break;
      case 'walk':
        targetClipName = 'Walk';
        timeScale = 1.1;
        break;
      case 'sprint':
      case 'run':
        targetClipName = 'Run';
        timeScale = 1.15;
        break;
      case 'dodge':
        targetClipName = 'Duck';
        timeScale = 1.8;
        break;
      default:
        targetClipName = 'Idle';
    }

    const nextAction = this.actions[targetClipName.toLowerCase()] || this.actions[targetClipName] || this.actions['idle'];
    if (!nextAction) return;

    if (this.currentAction === nextAction && stateName !== 'dodge') {
      return;
    }

    nextAction.reset();
    nextAction.timeScale = timeScale;

    if (immediate || !this.currentAction) {
      nextAction.play();
    } else {
      this.currentAction.fadeOut(this.crossFadeDuration);
      nextAction.fadeIn(this.crossFadeDuration).play();
    }

    this.currentAction = nextAction;
    this.currentState = stateName;
  }

  update(dt, velocity, state) {
    // Drive mixer
    if (this.player.mixer) {
      this.player.mixer.update(dt);
    }

    // Determine state
    let targetState = 'idle';
    if (state === 'dodge') {
      targetState = 'dodge';
    } else {
      const speed = velocity ? velocity.length() : 0;
      if (speed > 5.5) {
        targetState = 'sprint';
      } else if (speed > 0.2) {
        targetState = 'walk';
      } else {
        targetState = 'idle';
      }
    }

    if (targetState !== this.currentState) {
      this.playState(targetState);
    }
  }
}
