import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ScarabEnemy } from './ScarabEnemy.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { missionEvents } from '../missions/MissionEvents.js';
import { inputRouter } from '../input/InputRouter.js';

/**
 * EnemySystem: Strictly armed encounter system with input-driven combat tutorial
 * and wave reinforcements.
 */
export class EnemySystem {
  constructor(scene, combatSystem, lootSystem, audioSystem, dialogueUI, cameraController, missionSystem) {
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.lootSystem = lootSystem;
    this.audioSystem = audioSystem;
    this.dialogueUI = dialogueUI;
    this.cameraController = cameraController;
    this.missionSystem = missionSystem;

    this.enemies = [];
    this.scarabModel = null;
    this.isArmed = false;
    this.isEncounterActive = false;
    this.combatTutorialCompleted = false;
    this.isTutorialPaused = false;
    this.waveNumber = 0;
    this.killedInEncounter = 0;
    this.totalInEncounter = 4;

    this.loadAssets();
  }

  loadAssets() {
    const loader = new GLTFLoader();
    loader.load('/models/enemies/scarab.glb', (gltf) => {
      this.scarabModel = gltf.scene;
    });
  }

  armEncounter(encounterId) {
    if (encounterId === 'scarab_ambush') {
      this.isArmed = true;
    }
  }

  startFirstEncounter() {
    if (this.isEncounterActive || !this.isArmed) return;

    const currentObj = this.missionSystem?.getCurrentObjective();
    console.assert(
      currentObj?.id === 'obj_follow_trace',
      'AMBUSH STARTED BEFORE FOLLOW TRACE OBJECTIVE'
    );

    this.isEncounterActive = true;
    this.waveNumber = 1;
    this.killedInEncounter = 0;

    if (this.audioSystem) {
      this.audioSystem.playScarabWarning();
    }

    // Spawn 2 initial Scarabs
    this.spawnScarab('scarab_spawn_1', false);
    this.spawnScarab('scarab_spawn_2', false);

    // Trigger Input-Driven Combat Tutorial
    if (!this.combatTutorialCompleted) {
      this.triggerInteractiveCombatTutorial();
    }
  }

  triggerInteractiveCombatTutorial() {
    this.isTutorialPaused = true;
    inputRouter.setLayer('combat_tutorial', true);

    const card = document.createElement('div');
    card.id = 'interactive-combat-tut';
    card.style.cssText = `
      position: absolute;
      top: 24%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(12, 18, 24, 0.96);
      border: 1px solid #00f0ff;
      border-radius: 8px;
      padding: 14px 28px;
      box-shadow: 0 8px 32px rgba(0, 240, 255, 0.3);
      text-align: center;
      z-index: 4500;
      color: #ffffff;
      font-family: monospace, sans-serif;
    `;

    card.innerHTML = `
      <div id="tut-step-tag" style="font-size:11px; color:#00f0ff; letter-spacing:2px; font-weight:bold; margin-bottom:4px;">COMBAT INTEL &bull; STEP 1</div>
      <div id="tut-step-instruction" style="font-size:17px; font-weight:bold; margin-bottom:8px;">AIM AT TARGET MACHINE</div>
      <div id="tut-step-sub" style="font-size:13px; color:#8b949e;">Move your cursor over the highlighted Scarab</div>
      <div id="tut-meter-container" style="display:none; width:220px; height:8px; background:rgba(255,255,255,0.15); border-radius:4px; margin:10px auto 0; overflow:hidden;">
        <div id="tut-charge-meter" style="width:0%; height:100%; background:#00f0ff; transition:width 0.05s linear;"></div>
      </div>
    `;

    document.body.appendChild(card);

    const tagEl = card.querySelector('#tut-step-tag');
    const titleEl = card.querySelector('#tut-step-instruction');
    const subEl = card.querySelector('#tut-step-sub');
    const meterContainer = card.querySelector('#tut-meter-container');
    const meterEl = card.querySelector('#tut-charge-meter');

    let tutStage = 1; // 1: AIM, 2: HOLD LMB
    let holdDuration = 0;

    const checkAimHandler = (e) => {
      if (tutStage === 1 && this.enemies.length > 0) {
        // Project first enemy to screen
        const target = this.enemies[0];
        const screenPos = target.position.clone().project(this.cameraController.camera);
        const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        const dist = Math.hypot(e.clientX - screenX, e.clientY - screenY);
        if (dist < 180) {
          tutStage = 2;
          tagEl.textContent = 'COMBAT INTEL • STEP 2';
          titleEl.textContent = 'HOLD [LMB] TO CHARGE HAMMER';
          subEl.textContent = 'Hold left mouse button to build Arc power';
          meterContainer.style.display = 'block';
        }
      }
    };

    let isHolding = false;
    const downHandler = (e) => {
      if (tutStage === 2 && e.button === 0) isHolding = true;
    };
    const upHandler = (e) => {
      if (e.button === 0) isHolding = false;
    };

    window.addEventListener('mousemove', checkAimHandler);
    window.addEventListener('mousedown', downHandler);
    window.addEventListener('mouseup', upHandler);

    const pollInterval = setInterval(() => {
      if (tutStage === 2 && isHolding) {
        holdDuration += 0.05;
        const pct = Math.min(100, Math.floor((holdDuration / 0.55) * 100));
        meterEl.style.width = `${pct}%`;

        if (holdDuration >= 0.55) {
          clearInterval(pollInterval);
          window.removeEventListener('mousemove', checkAimHandler);
          window.removeEventListener('mousedown', downHandler);
          window.removeEventListener('mouseup', upHandler);

          titleEl.textContent = 'RELEASE TO DISCHARGE!';
          titleEl.style.color = '#30d158';

          setTimeout(() => {
            card.remove();
            this.isTutorialPaused = false;
            this.combatTutorialCompleted = true;
            inputRouter.setLayer('combat_tutorial', false);
          }, 350);
        }
      }
    }, 50);
  }

  spawnScarab(anchorName, isFinal = false) {
    if (!this.scarabModel) {
      setTimeout(() => this.spawnScarab(anchorName, isFinal), 100);
      return;
    }

    const spawnPos = campaignFrame.requireAnchor(anchorName);
    const scarab = new ScarabEnemy(this.scene, this.scarabModel, {
      id: anchorName,
      maxHealth: 60,
      position: spawnPos,
      isFinalScarab: isFinal
    });

    scarab.onDeathCallback = (deadScarab) => this.handleEnemyDeath(deadScarab);

    this.enemies.push(scarab);
    if (this.combatSystem) {
      this.combatSystem.registerTarget(scarab);
    }
  }

  handleEnemyDeath(deadEnemy) {
    if (this.combatSystem) {
      this.combatSystem.unregisterTarget(deadEnemy);
    }

    const idx = this.enemies.indexOf(deadEnemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.killedInEncounter++;

    if (this.audioSystem) {
      this.audioSystem.playMachineDeath();
    }

    const dropPos = deadEnemy.position.clone();

    // Trigger reinforcements after first kill
    if (this.killedInEncounter === 1 && this.waveNumber === 1) {
      this.waveNumber = 2;
      setTimeout(() => {
        this.spawnScarab('scarab_spawn_4', false);
        this.spawnScarab('scarab_spawn_5', true);
        if (this.audioSystem) {
          this.audioSystem.playScarabWarning();
        }
      }, 600);
    }

    // Encounter completed
    if (this.killedInEncounter >= this.totalInEncounter || deadEnemy.isFinalScarab) {
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Signal Shard', 1, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 25, dropPos);
      }

      if (this.dialogueUI) {
        this.dialogueUI.showRadioSubtitle('UNKNOWN', '...Runner signature confirmed...', 3500);
      }

      missionEvents.emit('allEnemiesDefeated', 'scarab_ambush');
    } else {
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Scrap', 10, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 6, dropPos);
      }
    }
  }

  update(dt, playerPos) {
    if (this.isTutorialPaused) return;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, playerPos);
    }

    // Trigger ambush only if armed and in ambush zone
    if (this.isArmed && !this.isEncounterActive && playerPos) {
      const local = campaignFrame.toLocal(playerPos);
      if (local.z >= 78.0 && local.z <= 118.0) {
        this.startFirstEncounter();
      }
    }
  }
}
