import * as THREE from 'three';

/**
 * CutsceneDirector: Smooth cinematic camera sequencing, camera interpolation, and subtitle cues.
 */
export class CutsceneDirector {
  constructor(cameraController, dialogueUI) {
    this.cameraController = cameraController;
    this.dialogueUI = dialogueUI;

    this.isPlaying = false;
    this.currentShot = null;
    this.shotTimer = 0;
    this.onShotComplete = null;

    this.startCamPos = new THREE.Vector3();
    this.startTargetPos = new THREE.Vector3();

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.isPlaying && (e.code === 'Space' || e.code === 'Escape')) {
        this.skip();
      }
    });
  }

  playShot(config, onComplete) {
    // config: { targetPos, camOffset, duration, subtitle: { speaker, text }, onStart }
    this.isPlaying = true;
    this.currentShot = config;
    this.shotTimer = 0;
    this.duration = config.duration || 3.0;
    this.onShotComplete = onComplete;

    // Capture starting camera state
    this.startCamPos.copy(this.cameraController.camera.position);
    this.startTargetPos.copy(this.cameraController.target);

    // Compute target end states
    this.endTargetPos = config.targetPos.clone();
    this.endCamPos = config.camOffset 
      ? config.targetPos.clone().add(config.camOffset)
      : config.targetPos.clone().add(new THREE.Vector3(14, 18, 14));

    if (config.onStart) {
      config.onStart();
    }

    if (config.subtitle && this.dialogueUI) {
      this.dialogueUI.showRadioSubtitle(config.subtitle.speaker, config.subtitle.text, this.duration * 1000);
    }
  }

  skip() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    const cb = this.onShotComplete;
    this.currentShot = null;
    this.onShotComplete = null;
    if (cb) cb();
  }

  update(dt) {
    if (!this.isPlaying || !this.currentShot) return;

    this.shotTimer += dt;
    const rawT = THREE.MathUtils.clamp(this.shotTimer / this.duration, 0, 1);
    // Smooth cosine ease in/out
    const t = 0.5 - 0.5 * Math.cos(rawT * Math.PI);

    this.cameraController.target.lerpVectors(this.startTargetPos, this.endTargetPos, t);
    this.cameraController.camera.position.lerpVectors(this.startCamPos, this.endCamPos, t);

    if (this.shotTimer >= this.duration) {
      this.isPlaying = false;
      const cb = this.onShotComplete;
      this.currentShot = null;
      this.onShotComplete = null;
      if (cb) cb();
    }
  }
}
