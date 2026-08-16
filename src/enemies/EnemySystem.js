import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ScarabEnemy } from './ScarabEnemy.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { missionEvents } from '../missions/MissionEvents.js';
import { inputRouter } from '../input/InputRouter.js';

/**
 * EnemySystem: Manages machine enemy spawns, first-encounter combat tutorial,
 * and narrative loot drops.
 */
export class EnemySystem {
  constructor(scene, combatSystem, lootSystem, audioSystem, dialogueUI, cameraController) {
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.lootSystem = lootSystem;
    this.audioSystem = audioSystem;
    this.dialogueUI = dialogueUI;
    this.cameraController = cameraController;

    this.enemies = [];
    this.scarabModel = null;
    this.isEncounterActive = false;
    this.combatTutorialShown = false;
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

  startFirstEncounter() {
    if (this.isEncounterActive) return;
    this.isEncounterActive = true;
    this.waveNumber = 1;
    this.killedInEncounter = 0;

    if (this.audioSystem) {
      this.audioSystem.playScarabWarning();
    }

    // Spawn 2 initial Scarabs
    this.spawnScarab('scarab_spawn_1', false);
    this.spawnScarab('scarab_spawn_2', false);

    // Trigger Contextual Combat Tutorial
    if (!this.combatTutorialShown) {
      this.combatTutorialShown = true;
      this.triggerCombatTutorial();
    }
  }

  triggerCombatTutorial() {
    this.isTutorialPaused = true;
    inputRouter.setLayer('combat_tutorial_freeze', true);

    const overlay = document.createElement('div');
    overlay.id = 'combat-tutorial-card';
    overlay.style.cssText = `
      position: absolute;
      top: 25%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(14, 20, 26, 0.96);
      border: 1px solid #00f0ff;
      border-radius: 8px;
      padding: 16px 28px;
      box-shadow: 0 12px 36px rgba(0, 240, 255, 0.25);
      text-align: center;
      z-index: 4000;
      color: #ffffff;
      font-family: monospace, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="font-size:12px; color:#00f0ff; letter-spacing:2px; font-weight:bold; margin-bottom:4px;">COMBAT INTEL</div>
      <div style="font-size:18px; font-weight:bold; margin-bottom:8px;">STORMCORE DISCHARGE</div>
      <div style="font-size:13px; color:#f0f6fc; margin-bottom:6px;">
        1. Point <span style="color:#00f0ff; font-weight:bold;">MOUSE</span> at machine to lock-on
      </div>
      <div style="font-size:13px; color:#f0f6fc;">
        2. Hold <span style="background:#00f0ff; color:#111; padding:1px 6px; border-radius:3px; font-weight:bold;">LMB</span> to charge &bull; Release to strike
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        overlay.remove();
        this.isTutorialPaused = false;
        inputRouter.setLayer('combat_tutorial_freeze', false);
      }, 300);
    }, 2400);
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
        this.spawnScarab('scarab_spawn_5', true); // Final scarab
        if (this.audioSystem) {
          this.audioSystem.playScarabWarning();
        }
      }, 800);
    }

    // Check if encounter completed
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

    // Trigger ambush when player reaches local Z >= 78
    if (!this.isEncounterActive && playerPos) {
      const local = campaignFrame.toLocal(playerPos);
      if (local.z >= 78.0 && local.z <= 118.0) {
        this.startFirstEncounter();
      }
    }
  }
}
