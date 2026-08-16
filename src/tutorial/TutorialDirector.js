import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';

/**
 * TutorialDirector: High-speed 2-step Calibration Tutorial (Move -> Dodge).
 * Target duration: 20-25 seconds.
 */
export class TutorialDirector {
  constructor(scene, player, dialogueUI, audioSystem, onCompleteCallback) {
    this.scene = scene;
    this.player = player;
    this.dialogueUI = dialogueUI;
    this.audioSystem = audioSystem;
    this.onComplete = onCompleteCallback;

    this.step = 1; // 1: Move | 2: Dodge | 3: Done
    this.isCompleted = false;

    this.pulsesHit = 0;
    this.pulseMeshes = [];
    this.emitterMesh = null;
    this.scanWave = null;
    this.waveProgress = 0;

    this.createUI();
    this.initStep1();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'tutorial-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 72px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 3500;
      pointer-events: none;
    `;

    this.container.innerHTML = `
      <div id="tut-prompt-card" style="background:rgba(12, 18, 24, 0.94); border:1px solid #00f0ff; padding:10px 24px; border-radius:6px; box-shadow:0 6px 20px rgba(0, 240, 255, 0.2); text-align:center;">
        <div id="tut-action-title" style="color:#00f0ff; font-family:monospace; font-weight:bold; font-size:15px; letter-spacing:2px; text-transform:uppercase;">CALIBRATION: MOVE</div>
        <div id="tut-action-sub" style="color:#f0f6fc; font-family:monospace; font-size:13px; margin-top:4px;">Use <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">W A S D</span> to step through the cyan calibration nodes</div>
      </div>
      <div style="pointer-events:auto; cursor:pointer; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#8b949e; font-family:monospace; font-size:11px; padding:3px 10px; border-radius:4px;" id="tut-skip-btn">
        PRESS [TAB] TO SKIP CALIBRATION
      </div>
    `;

    document.body.appendChild(this.container);

    const skipBtn = this.container.querySelector('#tut-skip-btn');
    skipBtn.addEventListener('click', () => this.skipTutorial());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && !this.isCompleted) {
        e.preventDefault();
        this.skipTutorial();
      }
    });

    this.titleEl = this.container.querySelector('#tut-action-title');
    this.subEl = this.container.querySelector('#tut-action-sub');
  }

  initStep1() {
    const pulsePositions = [
      campaignFrame.getAnchorWorld('tutorial_pulse_1'),
      campaignFrame.getAnchorWorld('tutorial_pulse_2'),
      campaignFrame.getAnchorWorld('tutorial_pulse_3')
    ];

    const geo = new THREE.RingGeometry(0.5, 0.8, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

    pulsePositions.forEach((pos, idx) => {
      const ring = new THREE.Mesh(geo, mat.clone());
      ring.position.set(pos.x, 0.05, pos.z);
      this.scene.add(ring);
      this.pulseMeshes.push({ mesh: ring, pos: pos, isHit: false, id: idx });
    });
  }

  initStep2() {
    this.step = 2;
    this.titleEl.textContent = 'CALIBRATION: EVADE';
    this.subEl.innerHTML = 'Press <span style="background:#ff7733; color:#111; padding:1px 8px; border-radius:3px; font-weight:bold;">SPACE</span> to dodge through the approaching scan wave';

    // 1. Load & place physical training emitter
    const loader = new GLTFLoader();
    loader.load('/models/tutorial/calibration_emitter.glb', (gltf) => {
      this.emitterMesh = gltf.scene;
      const emitterPos = campaignFrame.getAnchorWorld('tutorial_pulse_3').clone().add(new THREE.Vector3(0, 0, -4.5));
      this.emitterMesh.position.copy(emitterPos);
      this.scene.add(this.emitterMesh);
    });

    // 2. Vertical Laser Scanner (Calibration Sweeper)
    this.scanWave = new THREE.Group();
    
    // Create 3 thin red/orange scanning laser lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    const halfW = 1.75;
    for (let i = 0; i < 3; i++) {
      const yOffset = 0.4 + (i * 0.35);
      const points = [
        new THREE.Vector3(-halfW, yOffset, 0),
        new THREE.Vector3( halfW, yOffset, 0)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMesh = new THREE.Line(lineGeo, lineMat.clone());
      this.scanWave.add(lineMesh);
    }

    this.scanWave.position.copy(campaignFrame.getAnchorWorld('tutorial_pulse_3'));
    this.scene.add(this.scanWave);

    this.startScanPos = campaignFrame.getAnchorWorld('tutorial_pulse_3').clone().add(new THREE.Vector3(0, 0, -3.0));
    this.endScanPos = campaignFrame.getAnchorWorld('tutorial_pulse_1').clone().add(new THREE.Vector3(0, 0, 3.0));
  }

  finishTutorial() {
    this.isCompleted = true;
    if (this.scanWave) this.scene.remove(this.scanWave);
    if (this.emitterMesh) this.scene.remove(this.emitterMesh);

    this.titleEl.textContent = 'CALIBRATION COMPLETE';
    this.titleEl.style.color = '#30d158';
    this.subEl.textContent = 'Initiating Level 1: WAKE SIGNAL...';

    if (this.audioSystem) {
      this.audioSystem.playObjectiveUpdate();
    }

    setTimeout(() => {
      this.container.remove();
      if (this.onComplete) {
        this.onComplete();
      }
    }, 600);
  }

  skipTutorial() {
    if (this.isCompleted) return;
    this.pulseMeshes.forEach(p => this.scene.remove(p.mesh));
    this.finishTutorial();
  }

  update(dt, playerController) {
    if (this.isCompleted) return;

    const pPos = this.player.position;

    if (this.step === 1) {
      this.pulseMeshes.forEach((pulse) => {
        if (!pulse.isHit && pPos.distanceTo(pulse.pos) < 1.2) {
          pulse.isHit = true;
          this.scene.remove(pulse.mesh);
          this.pulsesHit++;
          if (this.audioSystem) this.audioSystem.playLootPickup();
        }
      });

      if (this.pulsesHit >= 3) {
        this.initStep2();
      }
    } else if (this.step === 2) {
      // Animate moving scan wave back and forth toward player
      this.waveProgress += dt * 0.75;
      const t = (Math.sin(this.waveProgress * Math.PI * 2) + 1.0) * 0.5;
      if (this.scanWave) {
        this.scanWave.position.lerpVectors(this.startScanPos, this.endScanPos, t);
      }

      // Complete step 2 when player executes a dodge roll
      if (playerController && playerController.state === 'dodge') {
        this.finishTutorial();
      }
    }
  }
}
