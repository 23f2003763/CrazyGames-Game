import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignFrame } from '../CampaignFrame.js';
import { ScarabEnemy } from '../../enemies/ScarabEnemy.js';
import { missionEvents } from '../../missions/MissionEvents.js';
import { inputRouter } from '../../input/InputRouter.js';

/**
 * Level1Encounter: Orchestrates the 4-Scarab Lattice Ambush and Step-by-Step Interactive Combat Tutorial.
 * Flow:
 * 1. Armed only when active objective is 'obj_follow_trace'.
 * 2. Triggers when player enters s=82-110m zone.
 * 3. First 2 Scarabs emerge.
 * 4. Auto-pauses simulation and presents interactive 3-step tutorial:
 *    - STEP 1: AIM (Player points cursor over highlighted Scarab).
 *    - STEP 2: HOLD TO CHARGE (Hold LMB to charge Stormcore Hammer for 0.55s).
 *    - STEP 3: RELEASE (Player releases LMB -> lightning discharges -> gameplay resumes).
 * 5. Wave 2 (2 reinforcements) spawns upon first kill (4 total).
 * 6. Defeating all 4 drops the Signal Shard and updates the mission.
 */
export class Level1Encounter {
  constructor(scene, combatSystem, lootSystem, audioSystem, dialogueUI, cameraController, missionSystem) {
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.lootSystem = lootSystem;
    this.audioSystem = audioSystem;
    this.dialogueUI = dialogueUI;
    this.cameraController = cameraController;
    this.missionSystem = missionSystem;

    this.enemies = [];
    this.isArmed = false;
    this.hasTriggered = false;
    this.isTutorialPaused = false;
    this.combatTutorialCompleted = false;

    this.waveNumber = 1;
    this.killedInEncounter = 0;
    this.totalInEncounter = 4;

    this.loader = new GLTFLoader();
    this.loadScarabModel();
    this.initMissionListeners();
  }

  loadScarabModel() {
    this.loader.load('/models/enemies/scarab.glb', (gltf) => {
      this.scarabModel = gltf.scene;
    });
  }

  initMissionListeners() {
    missionEvents.on('objectiveChanged', (obj) => {
      if (obj?.id === 'obj_follow_trace') {
        this.isArmed = true;
      }
    });
  }

  armEncounter() {
    this.isArmed = true;
  }

  spawnScarab(anchorName) {
    if (!this.scarabModel) {
      setTimeout(() => this.spawnScarab(anchorName), 100);
      return;
    }

    const spawnPos = campaignFrame.getAnchorWorld(anchorName) || campaignFrame.requireAnchor('ambush_trigger').clone().add(new THREE.Vector3((Math.random() - 0.5) * 6.0, 0, (Math.random() - 0.5) * 4.0));
    
    const scarab = new ScarabEnemy(this.scene, this.scarabModel, {
      id: anchorName,
      maxHealth: 60,
      position: spawnPos
    });

    scarab.onDeathCallback = (dead) => this.handleEnemyDeath(dead);
    this.enemies.push(scarab);

    if (this.combatSystem) {
      this.combatSystem.registerTarget(scarab);
    }
  }

  triggerAmbush() {
    if (this.hasTriggered) return;
    this.hasTriggered = true;

    if (this.audioSystem) {
      this.audioSystem.playScarabWarning();
    }

    // Spawn initial 2 Scarabs
    this.spawnScarab('scarab_spawn_1');
    this.spawnScarab('scarab_spawn_2');

    // Launch Step-by-Step Combat Tutorial
    if (!this.combatTutorialCompleted) {
      this.startCombatTutorial();
    }
  }

  startCombatTutorial() {
    this.isTutorialPaused = true;
    inputRouter.setLayer('combat_tutorial', true);

    const card = document.createElement('div');
    card.id = 'interactive-combat-tut';
    card.style.cssText = `
      position: absolute;
      top: 22%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10, 16, 22, 0.96);
      border: 1px solid #00f0ff;
      border-radius: 8px;
      padding: 16px 32px;
      box-shadow: 0 10px 36px rgba(0, 240, 255, 0.35);
      text-align: center;
      z-index: 4500;
      color: #ffffff;
      font-family: monospace, sans-serif;
    `;

    card.innerHTML = `
      <div id="tut-step-tag" style="font-size:11px; color:#00f0ff; letter-spacing:2.5px; font-weight:bold; margin-bottom:4px;">COMBAT PROTOCOL &bull; STEP 1</div>
      <div id="tut-step-instruction" style="font-size:18px; font-weight:bold; margin-bottom:6px; letter-spacing:1px;">AIM</div>
      <div id="tut-step-sub" style="font-size:13px; color:#8b949e;">Move your cursor over the highlighted Lattice Scout</div>
      <div id="tut-meter-container" style="display:none; width:220px; height:8px; background:rgba(255,255,255,0.15); border-radius:4px; margin:12px auto 0; overflow:hidden;">
        <div id="tut-charge-meter" style="width:0%; height:100%; background:#00f0ff; transition:width 0.05s linear;"></div>
      </div>
    `;
    document.body.appendChild(card);

    const tagEl = card.querySelector('#tut-step-tag');
    const titleEl = card.querySelector('#tut-step-instruction');
    const subEl = card.querySelector('#tut-step-sub');
    const meterContainer = card.querySelector('#tut-meter-container');
    const meterEl = card.querySelector('#tut-charge-meter');

    let stage = 1; // 1: AIM, 2: HOLD, 3: RELEASE
    let holdDuration = 0;

    // Highlight first enemy
    if (this.enemies.length > 0) {
      this.enemies[0].mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive.setHex(0x00f0ff);
          child.material.emissiveIntensity = 2.5;
        }
      });
    }

    const checkAimHandler = (e) => {
      if (stage === 1 && this.enemies.length > 0) {
        const target = this.enemies[0];
        const screenPos = target.position.clone().project(this.cameraController.camera);
        const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        const dist = Math.hypot(e.clientX - screenX, e.clientY - screenY);
        if (dist < 190) {
          stage = 2;
          tagEl.textContent = 'COMBAT PROTOCOL • STEP 2';
          titleEl.textContent = 'HOLD LMB TO CHARGE';
          subEl.textContent = 'Hold Left Mouse Button to build Arc energy';
          meterContainer.style.display = 'block';
        }
      }
    };

    let chargeInterval = null;

    const mouseDownHandler = (e) => {
      if (stage === 2 && e.button === 0) {
        chargeInterval = setInterval(() => {
          holdDuration += 0.05;
          const pct = Math.min(100, (holdDuration / 0.55) * 100);
          meterEl.style.width = `${pct}%`;

          if (holdDuration >= 0.55) {
            stage = 3;
            tagEl.textContent = 'COMBAT PROTOCOL • STEP 3';
            titleEl.textContent = 'RELEASE TO DISCHARGE';
            titleEl.style.color = '#30d158';
            subEl.textContent = 'Release Left Mouse Button to unleash lightning';
          }
        }, 50);
      }
    };

    const mouseUpHandler = (e) => {
      if (chargeInterval) {
        clearInterval(chargeInterval);
        chargeInterval = null;
      }

      if (stage === 3 && e.button === 0) {
        // Complete Tutorial
        window.removeEventListener('mousemove', checkAimHandler);
        window.removeEventListener('mousedown', mouseDownHandler);
        window.removeEventListener('mouseup', mouseUpHandler);

        card.remove();
        this.isTutorialPaused = false;
        this.combatTutorialCompleted = true;
        inputRouter.setLayer('combat_tutorial', false);

        // Reset enemy highlight
        if (this.enemies.length > 0) {
          this.enemies[0].mesh.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.emissive.setHex(0x000000);
              child.material.emissiveIntensity = 0;
            }
          });
        }
      } else if (stage === 2 && e.button === 0) {
        holdDuration = 0;
        meterEl.style.width = '0%';
      }
    };

    window.addEventListener('mousemove', checkAimHandler);
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);
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

    // Wave 2 Reinforcements after 1st kill
    if (this.killedInEncounter === 1 && this.waveNumber === 1) {
      this.waveNumber = 2;
      setTimeout(() => {
        this.spawnScarab('scarab_spawn_4');
        this.spawnScarab('scarab_spawn_5');
        if (this.audioSystem) {
          this.audioSystem.playScarabWarning();
        }
      }, 700);
    }

    // All 4 defeated -> Drop Signal Shard & complete objective
    if (this.killedInEncounter >= this.totalInEncounter) {
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
      }
    }
  }

  update(dt, playerPos) {
    if (!playerPos) return;

    // Check Trigger Zone at s=82-110m
    if (this.isArmed && !this.hasTriggered) {
      const ambushPos = campaignFrame.requireAnchor('ambush_trigger');
      if (playerPos.distanceTo(ambushPos) <= 12.0) {
        this.triggerAmbush();
      }
    }

    // Update active Scarabs
    const updateDt = this.isTutorialPaused ? 0 : dt;
    for (const enemy of this.enemies) {
      enemy.update(updateDt, playerPos);
    }
  }
}
