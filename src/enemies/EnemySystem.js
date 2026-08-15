import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ScarabEnemy } from './ScarabEnemy.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * EnemySystem: Manages authored machine enemy spawns, multi-wave encounters,
 * and narrative loot drops.
 */
export class EnemySystem {
  constructor(scene, combatSystem, lootSystem, audioSystem, dialogueUI) {
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.lootSystem = lootSystem;
    this.audioSystem = audioSystem;
    this.dialogueUI = dialogueUI;

    this.enemies = [];
    this.scarabModel = null;
    this.isEncounterActive = false;
    this.waveNumber = 0;
    this.killedInEncounter = 0;
    this.totalInEncounter = 5;

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

    if (this.dialogueUI) {
      this.dialogueUI.showRadioSubtitle('MARA', 'Contact! Lattice scouts detected ahead.', 3000);
    }

    if (this.audioSystem) {
      this.audioSystem.playScarabWarning();
    }

    // Wave 1: 3 Scarabs from cover
    setTimeout(() => {
      this.spawnScarab('scarab_spawn_1', false);
      this.spawnScarab('scarab_spawn_2', false);
      this.spawnScarab('scarab_spawn_3', false);
    }, 600);
  }

  spawnScarab(anchorName, isFinal = false) {
    if (!this.scarabModel) {
      setTimeout(() => this.spawnScarab(anchorName, isFinal), 100);
      return;
    }

    const spawnPos = campaignFrame.requireAnchor(anchorName);
    const scarab = new ScarabEnemy(this.scene, this.scarabModel, {
      id: anchorName,
      maxHealth: 55,
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
      }, 1000);
    }

    // Check if encounter completed
    if (this.killedInEncounter >= this.totalInEncounter || deadEnemy.isFinalScarab) {
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Signal Shard', 1, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 20, dropPos);
      }

      if (this.dialogueUI) {
        this.dialogueUI.showRadioSubtitle('UNKNOWN', '...Runner identified... Relay location acquired...', 4000);
      }

      missionEvents.emit('allEnemiesDefeated', 'scarab_ambush');
    } else {
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Scrap', 8, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 6, dropPos);
      }
    }
  }

  update(dt, playerPos) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, playerPos);
    }

    // Trigger ambush when player reaches local Z >= 75
    if (!this.isEncounterActive && playerPos) {
      const local = campaignFrame.toLocal(playerPos);
      if (local.z >= 75.0 && local.z <= 118.0) {
        this.startFirstEncounter();
      }
    }
  }
}
