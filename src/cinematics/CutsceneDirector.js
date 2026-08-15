import * as THREE from 'three';
import { campaignFrame } from '../campaign/CampaignFrame.js';

/**
 * CutsceneDirector: Multi-shot cinematic camera sequencing, camera interpolation,
 * and subtitle synchronization.
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

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.isPlaying && (e.code === 'Space' || e.code === 'Escape')) {
        this.skip();
      }
    });
  }

  playSequence(shots, onComplete) {
    this.isPlaying = true;
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
    this.duration = shot.duration || 2.5;

    this.startCamPos.copy(this.cameraController.camera.position);
    this.startTargetPos.copy(this.cameraController.target);

    this.endTargetPos = shot.targetPos.clone();
    this.endCamPos = shot.camOffset
      ? shot.targetPos.clone().add(shot.camOffset)
      : shot.targetPos.clone().add(new THREE.Vector3(12, 16, 12));

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
    const cb = this.onSequenceComplete;
    this.onSequenceComplete = null;
    if (cb) cb();
  }

  playOpeningSequence(onComplete) {
    const mastPos = campaignFrame.requireAnchor('relay_mast');
    const consolePos = campaignFrame.requireAnchor('signal_console');
    const hubPos = campaignFrame.requireAnchor('mara_hub');

    this.playSequence([
      {
        targetPos: mastPos,
        duration: 1.6,
        subtitle: { speaker: 'MARA', text: 'Telemetry alert... Relay antenna picking up unexpected frequency.' }
      },
      {
        targetPos: consolePos,
        duration: 1.4,
        subtitle: { speaker: 'MARA', text: 'Console just powered on with an incoming packet.' }
      },
      {
        targetPos: hubPos,
        duration: 1.5,
        subtitle: { speaker: 'MARA', text: 'Ryder. I just got something impossible.' }
      }
    ], onComplete);
  }

  update(dt) {
    if (!this.isPlaying || !this.currentShot) return;

    this.shotTimer += dt;
    const rawT = THREE.MathUtils.clamp(this.shotTimer / this.duration, 0, 1);
    const t = 0.5 - 0.5 * Math.cos(rawT * Math.PI); // Smooth cosine ease

    this.cameraController.target.lerpVectors(this.startTargetPos, this.endTargetPos, t);
    this.cameraController.camera.position.lerpVectors(this.startCamPos, this.endCamPos, t);

    if (this.shotTimer >= this.duration) {
      this.nextShot();
    }
  }
}
