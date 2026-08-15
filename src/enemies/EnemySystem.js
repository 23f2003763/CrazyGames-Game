import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ScarabEnemy } from './ScarabEnemy.js';
import { campaignFrame } from '../campaign/CampaignFrame.js';
import { missionEvents } from '../missions/MissionEvents.js';

/**
 * EnemySystem: Manages machine enemy spawns, encounters, and death loot drops.
 */
export class EnemySystem {
  constructor(scene, combatSystem, lootSystem, audioSystem) {
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.lootSystem = lootSystem;
    this.audioSystem = audioSystem;

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

    // Wave 1: 3 Scarabs
    this.spawnScarab('scarab_spawn_1', false);
    this.spawnScarab('scarab_spawn_2', false);
    this.spawnScarab('scarab_spawn_3', false);

    if (this.audioSystem) {
      this.audioSystem.playScarabWarning();
    }
  }

  spawnScarab(anchorName, isFinal = false) {
    if (!this.scarabModel) {
      // Retry in 100ms if model loading
      setTimeout(() => this.spawnScarab(anchorName, isFinal), 100);
      return;
    }

    const spawnPos = campaignFrame.getAnchorWorld(anchorName);
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

    // Check if final enemy of the encounter
    if (this.killedInEncounter === this.totalInEncounter || deadEnemy.isFinalScarab) {
      // Final Scarab drops the SIGNAL SHARD!
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Signal Shard', 1, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 15, dropPos);
      }
      missionEvents.emit('allEnemiesDefeated', 'scarab_ambush');
    } else {
      // Regular loot drop
      if (this.lootSystem) {
        this.lootSystem.spawnPickup('Scrap', 8, dropPos);
        this.lootSystem.spawnPickup('Arc Dust', 5, dropPos);
      }

      // Trigger Wave 2 when Wave 1 (3 enemies) is cleared
      if (this.killedInEncounter === 3 && this.waveNumber === 1) {
        this.waveNumber = 2;
        setTimeout(() => {
          this.spawnScarab('scarab_spawn_4', false);
          this.spawnScarab('scarab_spawn_5', true); // Final scarab
          if (this.audioSystem) {
            this.audioSystem.playScarabWarning();
          }
        }, 1200);
      }
    }
  }

  update(dt, playerPos) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, playerPos);
    }

    // Trigger encounter when player approaches the ambush zone (local Z >= 75)
    if (!this.isEncounterActive && playerPos) {
      const local = campaignFrame.toLocal(playerPos);
      if (local.z >= 75.0 && local.z <= 120.0) {
        this.startFirstEncounter();
      }
    }
  }
}
