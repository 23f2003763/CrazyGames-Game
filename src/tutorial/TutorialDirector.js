import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { Damageable } from '../combat/Damageable.js';

/**
 * TutorialDirector: 45-60s calibration yard tutorial teaching Move, Dodge, and Arc Caster aim & fire.
 */
export class TutorialDirector {
  constructor(scene, player, weaponSystem, combatSystem, dialogueUI, audioSystem, onCompleteCallback) {
    this.scene = scene;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.combatSystem = combatSystem;
    this.dialogueUI = dialogueUI;
    this.audioSystem = audioSystem;
    this.onComplete = onCompleteCallback;

    this.step = 1; // 1: Move | 2: Dodge | 3: Shoot Coils | 4: Done
    this.isCompleted = false;

    this.pulsesHit = 0;
    this.coilsDestroyed = 0;
    this.pulseMeshes = [];
    this.coils = [];
    this.coilModel = null;

    this.createUI();
    this.loadAssets();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'tutorial-overlay';
    this.container.style.position = 'absolute';
    this.container.style.top = '80px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '8px';
    this.container.style.zIndex = '3500';
    this.container.style.pointerEvents = 'none';

    this.container.innerHTML = `
      <div id="tut-prompt-card" style="background:rgba(12, 18, 24, 0.94); border:1px solid #00f0ff; padding:10px 24px; border-radius:6px; box-shadow:0 6px 20px rgba(0, 240, 255, 0.2); text-align:center;">
        <div id="tut-action-title" style="color:#00f0ff; font-family:monospace; font-weight:bold; font-size:16px; letter-spacing:2px; text-transform:uppercase;">CALIBRATION: MOVE</div>
        <div id="tut-action-sub" style="color:#f0f6fc; font-family:monospace; font-size:13px; margin-top:4px;">Use <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">W A S D</span> to step through the cyan calibration nodes</div>
      </div>
      <div style="pointer-events:auto; cursor:pointer; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#8b949e; font-family:monospace; font-size:11px; padding:3px 10px; border-radius:4px;" id="tut-skip-btn">
        PRESS [TAB] OR CLICK TO SKIP CALIBRATION
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

  loadAssets() {
    const loader = new GLTFLoader();
    loader.load('/models/world/arc_props.glb', (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.name === 'Arc_Calibration_Coil') {
          this.coilModel = child;
        }
      });
      this.initStep1();
    });
  }

  initStep1() {
    // Spawn 3 cyan floor pulses
    const pulsePositions = [
      campaignFrame.getAnchorWorld('tutorial_pulse_1'),
      campaignFrame.getAnchorWorld('tutorial_pulse_2'),
      campaignFrame.getAnchorWorld('tutorial_pulse_3')
    ];

    const geo = new THREE.RingGeometry(0.5, 0.8, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

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
    this.subEl.innerHTML = 'Press <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">SPACE</span> to perform an Arc Evade roll';

    // Harmless scanner beam
    const geo = new THREE.PlaneGeometry(16, 0.3);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.5 });
    this.scannerMesh = new THREE.Mesh(geo, mat);
    const centerPos = campaignFrame.getAnchorWorld('tutorial_pulse_2');
    this.scannerMesh.position.set(centerPos.x, 0.06, centerPos.z);
    this.scene.add(this.scannerMesh);
  }

  initStep3() {
    this.step = 3;
    if (this.scannerMesh) {
      this.scene.remove(this.scannerMesh);
    }

    // Equip Volt Caster
    if (this.weaponSystem) {
      this.weaponSystem.equipWeapon('volt_caster');
    }

    if (this.dialogueUI) {
      this.dialogueUI.showRadioSubtitle('MARA', "Let's make sure the Caster still knows you.", 3000);
    }

    this.titleEl.textContent = 'CALIBRATION: ARC CASTER';
    this.subEl.innerHTML = 'Aim with <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">MOUSE</span> & Hold <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">LMB</span> to fire and destroy the 3 Arc Pylons';

    // Spawn 3 stationary training coils
    ['target_coil_1', 'target_coil_2', 'target_coil_3'].forEach((anchorName) => {
      this.spawnCalibrationCoil(anchorName);
    });
  }

  spawnCalibrationCoil(anchorName) {
    if (!this.coilModel) return;

    const coil = this.coilModel.clone(true);
    const pos = campaignFrame.getAnchorWorld(anchorName);
    coil.position.copy(pos);

    coil.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(coil);

    const coilData = {
      position: pos,
      radius: 0.9,
      mesh: coil,
      damageable: new Damageable({
        maxHealth: 40,
        faction: 'prop',
        onKilled: () => {
          this.handleCoilDestroyed(coilData);
        }
      })
    };

    this.coils.push(coilData);
    if (this.combatSystem) {
      this.combatSystem.registerTarget(coilData);
    }
  }

  handleCoilDestroyed(coilData) {
    if (this.combatSystem) {
      this.combatSystem.unregisterTarget(coilData);
    }

    this.scene.remove(coilData.mesh);
    this.coilsDestroyed++;

    if (this.audioSystem) {
      this.audioSystem.playMachineDeath();
    }

    if (this.coilsDestroyed >= 3) {
      this.finishTutorial();
    }
  }

  finishTutorial() {
    this.isCompleted = true;
    this.container.remove();

    if (this.dialogueUI) {
      this.dialogueUI.showRadioSubtitle('MARA', "Good. Now we've got a real problem.", 3500);
    }

    if (this.audioSystem) {
      this.audioSystem.playObjectiveUpdate();
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  skipTutorial() {
    if (this.isCompleted) return;

    // Cleanup any spawned tutorial meshes
    this.pulseMeshes.forEach(p => this.scene.remove(p.mesh));
    if (this.scannerMesh) this.scene.remove(this.scannerMesh);
    this.coils.forEach(c => {
      this.scene.remove(c.mesh);
      if (this.combatSystem) this.combatSystem.unregisterTarget(c);
    });

    if (this.weaponSystem) {
      this.weaponSystem.equipWeapon('volt_caster');
    }

    this.finishTutorial();
  }

  update(dt, playerController) {
    if (this.isCompleted) return;

    const pPos = this.player.position;

    if (this.step === 1) {
      // Check pulse node contacts
      this.pulseMeshes.forEach((pulse) => {
        if (!pulse.isHit && pPos.distanceTo(pulse.pos) < 1.1) {
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
      if (playerController && playerController.state === 'dodge') {
        this.initStep3();
      }
    }
  }
}
