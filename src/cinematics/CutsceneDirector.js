import * as THREE from 'three';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { inputRouter } from '../input/InputRouter.js';

/**
 * CutsceneDirector: Multi-shot timeline camera sequencing with letterbox bars,
 * easing, world actions, and exact restoration of normal gameplay camera state.
 */
export class CutsceneDirector {
  constructor(cameraController, dialogueUI) {
    this.cameraController = cameraController;
    this.dialogueUI = dialogueUI;

    this.isPlaying = false;
    this.shotQueue = [];
    this.currentShot = null;
    this.shotTimer = 0;
    this.onSequenceComplete = null;

    this.startCamPos = new THREE.Vector3();
    this.startTargetPos = new THREE.Vector3();
    this.endCamPos = new THREE.Vector3();
    this.endTargetPos = new THREE.Vector3();

    this.savedGameplayCamPos = new THREE.Vector3();
    this.savedGameplayTarget = new THREE.Vector3();

    this.createLetterbox();
    this.bindInputs();
  }

  createLetterbox() {
    this.letterboxTop = document.createElement('div');
    this.letterboxTop.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100vw; height: 6vh;
      background: #000; z-index: 4000; transform: translateY(-100%);
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); pointer-events: none;
    `;
    this.letterboxBottom = document.createElement('div');
    this.letterboxBottom.style.cssText = `
      position: absolute; bottom: 0; left: 0; width: 100vw; height: 6vh;
      background: #000; z-index: 4000; transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); pointer-events: none;
    `;
    document.body.appendChild(this.letterboxTop);
    document.body.appendChild(this.letterboxBottom);
  }

  setLetterbox(active) {
    this.letterboxTop.style.transform = active ? 'translateY(0)' : 'translateY(-100%)';
    this.letterboxBottom.style.transform = active ? 'translateY(0)' : 'translateY(100%)';
  }

  bindInputs() {
    inputRouter.registerKeyConsumer('cutscene', (e) => {
      if (this.isPlaying && (e.code === 'Space' || e.code === 'Escape')) {
        this.skip();
      }
    });
  }

  playSequence(shots, onComplete) {
    this.isPlaying = true;
    inputRouter.setLayer('cutscene', true);
    this.setLetterbox(true);

    // Save gameplay camera state
    this.savedGameplayCamPos.copy(this.cameraController.camera.position);
    this.savedGameplayTarget.copy(this.cameraController.target);

    this.shotQueue = [...shots];
    this.onSequenceComplete = onComplete;
    this.nextShot();
  }

  playShot(shotConfig, onComplete) {
    this.playSequence([shotConfig], onComplete);
  }

  nextShot() {
    if (this.shotQueue.length === 0) {
      this.finishSequence();
      return;
    }

    const shot = this.shotQueue.shift();
    this.currentShot = shot;
    this.shotTimer = 0;
    this.duration = shot.duration || 2.0;

    this.startCamPos.copy(this.cameraController.camera.position);
    this.startTargetPos.copy(this.cameraController.target);

    this.endTargetPos = shot.targetPos.clone();
    this.endCamPos = shot.camPos
      ? shot.camPos.clone()
      : (shot.camOffset
        ? shot.targetPos.clone().add(shot.camOffset)
        : shot.targetPos.clone().add(new THREE.Vector3(10, 14, 10)));

    if (shot.onStart) {
      shot.onStart();
    }

    if (shot.subtitle && this.dialogueUI) {
      this.dialogueUI.showRadioSubtitle(shot.subtitle.speaker, shot.subtitle.text, this.duration * 1000);
    }
  }

  skip() {
    if (!this.isPlaying) return;
    this.shotQueue = [];
    this.finishSequence();
  }

  finishSequence() {
    this.isPlaying = false;
    this.currentShot = null;
    this.setLetterbox(false);
    inputRouter.setLayer('cutscene', false);

    // Restore gameplay camera tracking smoothly
    if (this.cameraController.player) {
      this.cameraController.target.copy(this.cameraController.player.position);
      this.cameraController.camera.position.copy(this.cameraController.player.position).add(this.cameraController.offset);
    }

    const cb = this.onSequenceComplete;
    this.onSequenceComplete = null;
    if (cb) cb();
  }

  playOpeningSequence(onComplete) {
    try {
      const camAntenna = campaignFrame.requireAnchor('CAM_OPEN_ANTENNA');
      const targetAntenna = campaignFrame.requireAnchor('TARGET_ANTENNA');
      const camConsole = campaignFrame.requireAnchor('CAM_OPEN_CONSOLE');
      const targetConsole = campaignFrame.requireAnchor('TARGET_SIGNAL_CONSOLE');
      const camMara = campaignFrame.requireAnchor('CAM_OPEN_MARA');
      const targetMara = campaignFrame.requireAnchor('TARGET_MARA');

      this.playSequence([
        {
          targetPos: targetAntenna,
          camPos: camAntenna,
          duration: 1.5,
          subtitle: { speaker: 'MARA', text: 'Telemetry alert... External antenna picking up unknown carrier wave.' }
        },
        {
          targetPos: targetConsole,
          camPos: camConsole,
          duration: 1.5,
          subtitle: { speaker: 'MARA', text: 'Console just powered itself on with an incoming packet.' }
        },
        {
          targetPos: targetMara,
          camPos: camMara,
          duration: 1.5,
          subtitle: { speaker: 'MARA', text: 'Ryder. I need you in here.' }
        }
      ], onComplete);
    } catch (e) {
      throw new Error(`Required cinematic socket missing: ${e.message}`);
    }
  }

  update(dt) {
    if (!this.isPlaying || !this.currentShot) return;

    this.shotTimer += dt;
    const rawT = THREE.MathUtils.clamp(this.shotTimer / this.duration, 0, 1);
    const t = 0.5 - 0.5 * Math.cos(rawT * Math.PI); // Cosine ease

    this.cameraController.target.lerpVectors(this.startTargetPos, this.endTargetPos, t);
    this.cameraController.camera.position.lerpVectors(this.startCamPos, this.endCamPos, t);

    if (this.shotTimer >= this.duration) {
      this.nextShot();
    }
  }
}
