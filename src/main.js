import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimator } from './player/PlayerAnimator.js';
import { ColliderRegistry } from './physics/ColliderRegistry.js';
import { WalkableSurfaceSystem } from './physics/WalkableSurfaceSystem.js';
import { MovementFX } from './vfx/MovementFX.js';

// Arcfall Protocol Core Systems
import { inputRouter } from './input/InputRouter.js';
import { campaignFrame } from './campaign/CampaignFrame.js';
import { campaignPath } from './campaign/CampaignPath.js';
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

    // 4. Core Audio, Checkpoints, Dialogue & Interaction
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

    // 7. Campaign World (+Z screen-up corridor, continuous fence, boundary forest, Relay HQ)
    this.world = new CampaignWorld(
      this.scene,
      this.collision,
      this.interactionSystem, 
      this.lootSystem, 
      this.npcSystem,
      this.cutsceneDirector
    );
    if (this.world.terrainMesh) {
      this.walkableSurfaceSystem.registerSurface(this.world.terrainMesh);
    }

    // 8. Playable Hero (Ryder)
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

    // 9. Combat, Stormcore Hammer & Machine Enemies
    this.combatSystem = new CombatSystem(this.scene, this.audioSystem);
    this.weaponSystem = new WeaponSystem(
      this.scene, 
      this.cameraController.camera, 
      this.player, 
      this.playerController,
      this.audioSystem, 
      this.combatSystem
    );
    this.enemySystem = new EnemySystem(
      this.scene, 
      this.combatSystem, 
      this.lootSystem, 
      this.audioSystem,
      this.dialogueUI,
      this.cameraController
    );

    // 10. Mission Guidance & HUD
    this.missionSystem = new MissionSystem(this.audioSystem, this.checkpointSystem);
    this.breadcrumbSystem = new ArcBreadcrumbSystem(this.scene);
    this.objectiveGuidance = new ObjectiveGuidance(this.scene, this.cameraController.camera);
    this.objectiveHUD = new ObjectiveHUD();

    // 11. 2-Step Calibration Tutorial (Move -> Dodge)
    this.tutorialDirector = new TutorialDirector(
      this.scene,
      this.player,
      this.dialogueUI,
      this.audioSystem,
      () => this.startMainCampaign()
    );

    // 12. Visual FX & Particles
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
      this.objectiveGuidance.setObjective(firstObj);
      this.breadcrumbSystem.setObjective(firstObj);

      this.missionSystem.onObjectiveChanged = (obj, mission) => {
        this.objectiveHUD.setObjective(obj, mission);
        this.objectiveGuidance.setObjective(obj);
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

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Cutscene Director (letterbox & camera control)
    if (this.cutsceneDirector.isPlaying) {
      this.cutsceneDirector.update(deltaTime);
      this.playerAnimator.update(deltaTime, new THREE.Vector3(), 'idle');
    } else {
      // 2. Hero Movement & Animation
      if (inputRouter.canMove()) {
        this.playerController.update(deltaTime);
      }
      this.playerAnimator.update(
        deltaTime, 
        this.playerController.velocity, 
        this.playerController.state
      );

      // 3. Stormcore Hammer Charging & Discharge
      this.weaponSystem.update(deltaTime);

      // 4. Camera Follow
      this.cameraController.update(deltaTime);
    }

    // 5. Combat & Machine Enemies Update
    this.combatSystem.update(deltaTime);
    this.enemySystem.update(deltaTime, this.player.position);

    // 6. 2-Step Tutorial Update
    if (!this.tutorialDirector.isCompleted) {
      this.tutorialDirector.update(deltaTime, this.playerController);
    }

    // 7. World, Interiors, Interactivity & Missions
    this.world.update(deltaTime, this.player.position);
    if (inputRouter.canInteract()) {
      this.interactionSystem.update(this.player.position);
    }
    this.lootSystem.update(deltaTime, this.player.position);
    this.npcSystem.update(deltaTime, this.player.position);
    this.missionSystem.update(this.player.position);
    this.breadcrumbSystem.update(deltaTime, this.player.position);
    this.objectiveGuidance.update(deltaTime, this.player.position);

    // 8. Visual Particles & Physics Debug
    if (this.playerController.state === 'dodge' && this.playerController.dodgeTime < 0.05) {
      this.movementFX.emitDust(this.player.position.x, this.player.position.z, 2.0, 4);
    }
    this.movementFX.update(deltaTime, this.cameraController.camera);
    this.collision.updateDebug(this.player);

    // 9. Debug Overlay
    this.debugOverlay.update();

    // 10. Render
    this.renderPipeline.render(deltaTime, this.cameraController.target);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
