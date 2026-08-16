import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimator } from './player/PlayerAnimator.js';
import { ColliderRegistry } from './physics/ColliderRegistry.js';
import { WalkableSurfaceSystem } from './physics/WalkableSurfaceSystem.js';
import { MovementFX } from './vfx/MovementFX.js';
import { ElectricFenceFX } from './vfx/ElectricFenceFX.js';

// Arcfall Protocol Core Systems
import { inputRouter } from './input/InputRouter.js';
import { campaignFrame } from './campaign/CampaignFrame.js';
import { campaignPath } from './campaign/CampaignPath.js';
import { Level1WorldV2 } from './campaign/level1/Level1WorldV2.js';
import { CampaignWorld } from './campaign/CampaignWorld.js';
import { CutsceneDirector } from './cinematics/CutsceneDirector.js';
import { TutorialDirector } from './tutorial/TutorialDirector.js';
import { CombatSystem } from './combat/CombatSystem.js';
import { WeaponSystem } from './combat/WeaponSystem.js';
import { EnemySystem } from './enemies/EnemySystem.js';
import { MissionSystem } from './missions/MissionSystem.js';
import { InteractionSystem } from './gameplay/InteractionSystem.js';
import { LootSystem } from './gameplay/LootSystem.js';
import { NPCSystem } from './npc/NPCSystem.js';
import { ArcBreadcrumbSystem } from './ui/ArcBreadcrumbSystem.js';
import { ObjectiveGuidance } from './ui/ObjectiveGuidance.js';
import { ObjectiveHUD } from './ui/ObjectiveHUD.js';
import { CheckpointSystem } from './gameplay/CheckpointSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { CampaignDebugOverlay } from './ui/CampaignDebugOverlay.js';
import { DialogueUI } from './ui/DialogueUI.js';

/**
 * Main Application Orchestrator: ARCFALL PROTOCOL (Vertical Slice)
 */
class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    // 1. Three.js Scene
    this.scene = new THREE.Scene();

    // 2. Isometric Camera Controller (Yaw 45 deg, Pitch 50 deg)
    this.cameraController = new IsometricCamera(this.container);

    // 3. Post-Processing & Rendering Pipeline
    this.renderPipeline = new RenderPipeline(
      this.container,
      this.scene,
      this.cameraController.camera
    );

    // 4. Core Audio, Checkpoints, Dialogue, Interaction, NPCs, Loot
    this.audioSystem = new AudioSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.dialogueUI = new DialogueUI();
    this.interactionSystem = new InteractionSystem(this.cameraController.camera);
    this.lootSystem = new LootSystem(this.scene, this.interactionSystem, this.audioSystem);
    this.npcSystem = new NPCSystem(this.scene, this.interactionSystem, this.dialogueUI);

    // 5. Cinematics Director
    this.cutsceneDirector = new CutsceneDirector(this.cameraController, this.dialogueUI);

    // 6. Physics & Colliders
    this.collision = new ColliderRegistry(this.scene);
    this.walkableSurfaceSystem = new WalkableSurfaceSystem(
      this.scene, 
      (x, z) => this.world.sampleHeight(x, z)
    );

    // 7. Combat System
    this.combatSystem = new CombatSystem(this.scene, this.audioSystem);
    this.missionSystem = new MissionSystem(this.audioSystem, this.checkpointSystem);

    // 8. Level 1 Active World (Level1WorldV2 default, ?legacyLevel=1 fallback)
    const isLegacy = new URLSearchParams(window.location.search).has('legacyLevel');
    if (isLegacy) {
      console.log('Loading Legacy CampaignWorld...');
      this.world = new CampaignWorld(
        this.scene,
        this.collision,
        this.interactionSystem,
        this.lootSystem,
        this.npcSystem,
        this.cutsceneDirector
      );
      this.enemySystem = new EnemySystem(
        this.scene,
        this.combatSystem,
        this.lootSystem,
        this.audioSystem,
        this.dialogueUI,
        this.cameraController,
        this.missionSystem
      );
      this.missionSystem.setEnemySystem(this.enemySystem);
    } else {
      console.log('Loading Clean Level1WorldV2 (Authored Wake Signal)...');
      this.world = new Level1WorldV2(
        this.scene,
        this.collision,
        this.interactionSystem,
        this.lootSystem,
        this.npcSystem,
        this.cutsceneDirector,
        this.combatSystem,
        this.audioSystem,
        this.dialogueUI,
        this.cameraController,
        this.missionSystem
      );
      this.missionSystem.setEnemySystem(this.world.encounter);
    }

    if (this.world.terrainMesh) {
      this.walkableSurfaceSystem.registerSurface(this.world.terrainMesh);
    }

    // 9. Playable Hero (Ryder)
    this.player = new Player(this.scene);
    this.playerController = new PlayerController(
      this.player, 
      this.cameraController, 
      this.collision, 
      this.walkableSurfaceSystem
    );
    this.playerAnimator = new PlayerAnimator(this.player);

    // Spawn Ryder in Calibration Yard facing screen-up (+Z forward)
    const spawnWorldPos = campaignFrame.requireAnchor('player_spawn');
    this.player.position.copy(spawnWorldPos);
    this.player.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
    this.cameraController.setPlayer(this.player);

    // 10. Mission Guidance & HUD
    this.breadcrumbSystem = new ArcBreadcrumbSystem(this.scene);
    this.objectiveGuidance = new ObjectiveGuidance(this.scene, this.cameraController.camera);
    this.objectiveHUD = new ObjectiveHUD();

    // 11. Stormcore Hammer Weapon System
    this.weaponSystem = new WeaponSystem(
      this.scene, 
      this.cameraController.camera, 
      this.player, 
      this.playerController,
      this.audioSystem, 
      this.combatSystem
    );

    // 12. 2-Step Calibration Tutorial (Move -> Dodge)
    this.tutorialDirector = new TutorialDirector(
      this.scene,
      this.player,
      this.dialogueUI,
      this.audioSystem,
      () => this.startMainCampaign()
    );

    // 13. Visual FX & Particles
    this.movementFX = new MovementFX(this.scene);

    // 13. Debug Overlay (F5) & Collision Wireframe Toggle (F7)
    this.debugOverlay = new CampaignDebugOverlay(
      null,
      this.missionSystem,
      this.world.sectorManager,
      this.player
    );

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F7') {
        this.collision.toggleDebug(undefined, this.player);
      }
    });

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start render loop
    this.animate();
  }

  startMainCampaign() {
    // 3-Shot Opening Cutscene
    this.cutsceneDirector.playOpeningSequence(() => {
      const firstObj = this.missionSystem.getCurrentObjective();
      this.objectiveHUD.setObjective(firstObj, this.missionSystem.currentMission);
      this.objectiveHUD.show();
      this.objectiveGuidance.setObjective(firstObj, this.npcSystem);
      this.breadcrumbSystem.setObjective(firstObj);

      this.missionSystem.onObjectiveChanged = (obj, mission) => {
        this.objectiveHUD.setObjective(obj, mission);
        this.objectiveGuidance.setObjective(obj, this.npcSystem);
        this.breadcrumbSystem.setObjective(obj);
      };

      this.missionSystem.onMissionCompleted = () => {
        this.objectiveHUD.showLevelComplete();
        if (this.audioSystem) {
          this.audioSystem.playLevelComplete();
        }
      };
    });
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderPipeline.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const realDeltaTime = Math.min(this.clock.getDelta(), 0.1);
    const encounterRef = this.world.encounter || this.enemySystem;
    const isPaused = encounterRef && encounterRef.isTutorialPaused;
    const gameplayDelta = isPaused ? 0 : realDeltaTime;

    // 1. Cutscene Director (letterbox & camera control)
    if (this.cutsceneDirector.isPlaying) {
      this.cutsceneDirector.update(gameplayDelta);
      this.playerAnimator.update(gameplayDelta, new THREE.Vector3(), 'idle');
    } else {
      // 2. Hero Movement & Animation
      if (inputRouter.canMove() && !isPaused) {
        this.playerController.update(gameplayDelta);
      }
      this.playerAnimator.update(
        gameplayDelta, 
        this.playerController.velocity, 
        this.playerController.state
      );

      // 3. Stormcore Hammer Charging & Discharge
      // Weapon system gets realDeltaTime so charge VFX works during pause
      this.weaponSystem.update(realDeltaTime);

      // 4. Camera Follow
      if (!isPaused) {
        this.cameraController.update(gameplayDelta);
      } else if (encounterRef && encounterRef.updateCameraTutorial) {
        encounterRef.updateCameraTutorial(realDeltaTime);
      }
    }

    // 5. Combat & Machine Enemies Update
    this.combatSystem.update(gameplayDelta);
    if (this.enemySystem) {
      this.enemySystem.update(gameplayDelta, this.player.position);
    }

    // 6. 2-Step Tutorial Update
    if (!this.tutorialDirector.isCompleted) {
      this.tutorialDirector.update(gameplayDelta, this.playerController);
    }

    // 7. World, Interiors, Interactivity & Missions
    this.world.update(gameplayDelta, this.player.position);
    if (inputRouter.canInteract() && !isPaused) {
      this.interactionSystem.update(this.player.position);
    }
    this.lootSystem.update(gameplayDelta, this.player.position);
    this.npcSystem.update(gameplayDelta, this.player.position);
    this.missionSystem.update(this.player.position);
    this.breadcrumbSystem.update(gameplayDelta, this.player.position);
    this.objectiveGuidance.update(gameplayDelta, this.player.position);

    // 8. Visual Particles & Physics Debug
    if (this.playerController.state === 'dodge' && !isPaused) {
      this.movementFX.emitDust(this.player.position.x, this.player.position.z, 1.5, 2);
    }
    this.movementFX.update(gameplayDelta, this.cameraController.camera);
    if (this.electricFenceFX) {
      this.electricFenceFX.update(gameplayDelta, this.player.position);
    }
    this.collision.updateDebug(this.player);

    // 9. Debug Overlay
    this.debugOverlay.update();

    // 10. Render
    this.renderPipeline.render(realDeltaTime, this.cameraController.target);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
