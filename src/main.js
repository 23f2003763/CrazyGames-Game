import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimator } from './player/PlayerAnimator.js';
import { ColliderRegistry } from './physics/ColliderRegistry.js';
import { WalkableSurfaceSystem } from './physics/WalkableSurfaceSystem.js';
import { CameraOcclusion } from './camera/CameraOcclusion.js';
import { MovementFX } from './vfx/MovementFX.js';

// Arcfall Protocol Core Systems
import { campaignFrame } from './campaign/CampaignFrame.js';
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
import { ObjectiveGuidance } from './ui/ObjectiveGuidance.js';
import { ObjectiveHUD } from './ui/ObjectiveHUD.js';
import { CheckpointSystem } from './gameplay/CheckpointSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { CampaignDebugOverlay } from './ui/CampaignDebugOverlay.js';
import { DialogueUI } from './ui/DialogueUI.js';

/**
 * Main Application Orchestrator: ARCFALL PROTOCOL
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

    // 4. Core Systems
    this.audioSystem = new AudioSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.dialogueUI = new DialogueUI();
    this.interactionSystem = new InteractionSystem(this.cameraController.camera);
    this.lootSystem = new LootSystem(this.scene, this.interactionSystem, this.audioSystem);
    this.npcSystem = new NPCSystem(this.scene, this.interactionSystem);

    // 5. Cinematics Director
    this.cutsceneDirector = new CutsceneDirector(this.cameraController, this.dialogueUI);

    // 6. Physics, Collisions & Walkable Surfaces
    this.collision = new ColliderRegistry(this.scene);
    this.walkableSurfaceSystem = new WalkableSurfaceSystem(
      this.scene, 
      (x, z) => this.world.sampleHeight(x, z)
    );

    // 7. Campaign World (+Z screen-up corridor, continuous fence, boundary forest)
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
    const spawnWorldPos = campaignFrame.getAnchorWorld('player_spawn');
    this.player.position.copy(spawnWorldPos);
    this.player.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
    this.cameraController.setPlayer(this.player);

    // 9. Combat, Weapons & Enemy Systems
    this.combatSystem = new CombatSystem(this.scene, this.audioSystem);
    this.weaponSystem = new WeaponSystem(
      this.scene, 
      this.cameraController.camera, 
      this.player, 
      this.audioSystem, 
      this.combatSystem
    );
    this.enemySystem = new EnemySystem(
      this.scene, 
      this.combatSystem, 
      this.lootSystem, 
      this.audioSystem
    );

    // 10. Mission Guidance & HUD
    this.missionSystem = new MissionSystem(this.audioSystem, this.checkpointSystem);
    this.objectiveGuidance = new ObjectiveGuidance(this.scene, this.cameraController.camera);
    this.objectiveHUD = new ObjectiveHUD();

    // 11. Tutorial Director (Runs first in Calibration Yard)
    this.tutorialDirector = new TutorialDirector(
      this.scene,
      this.player,
      this.weaponSystem,
      this.combatSystem,
      this.dialogueUI,
      this.audioSystem,
      () => this.startMainCampaign()
    );

    // 12. Visual FX & Particles
    this.movementFX = new MovementFX(this.scene);

    // 13. Debug Overlay (F5)
    this.debugOverlay = new CampaignDebugOverlay(
      null,
      this.missionSystem,
      this.world.sectorManager,
      this.player
    );

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start render loop
    this.animate();
  }

  startMainCampaign() {
    // Opening shot: Antenna pulse -> Mara at console
    const mastPos = campaignFrame.getAnchorWorld('relay_mast');
    this.cutsceneDirector.playShot({
      targetPos: mastPos,
      duration: 2.8,
      subtitle: {
        speaker: 'MARA',
        text: 'The relay just picked up an anomalous keycode outside the perimeter.'
      }
    }, () => {
      // Begin Level 1: "WAKE SIGNAL"
      const firstObj = this.missionSystem.getCurrentObjective();
      this.objectiveHUD.setObjective(firstObj, this.missionSystem.currentMission);
      this.objectiveGuidance.setObjective(firstObj);

      this.missionSystem.onObjectiveChanged = (obj, mission) => {
        this.objectiveHUD.setObjective(obj, mission);
        this.objectiveGuidance.setObjective(obj);
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

    // 1. Cutscene Director (Freezes player controls during cinematic shots)
    if (this.cutsceneDirector.isPlaying) {
      this.cutsceneDirector.update(deltaTime);
      this.playerAnimator.update(deltaTime, new THREE.Vector3(), 'idle');
    } else {
      // 2. Hero Input & Physics
      this.playerController.update(deltaTime);
      this.playerAnimator.update(
        deltaTime, 
        this.playerController.velocity, 
        this.playerController.state
      );

      // 3. Weapon Aiming & Firing
      this.weaponSystem.update(deltaTime);

      // 4. Camera Follow
      this.cameraController.update(deltaTime);
    }

    // 5. Combat & Enemy Systems Update
    this.combatSystem.update(deltaTime);
    this.enemySystem.update(deltaTime, this.player.position);

    // 6. Tutorial Director Update
    if (!this.tutorialDirector.isCompleted) {
      this.tutorialDirector.update(deltaTime, this.playerController);
    }

    // 7. Gameplay & Mission Systems Update
    this.world.update(this.player.position);
    this.interactionSystem.update(this.player.position);
    this.lootSystem.update(deltaTime, this.player.position);
    this.npcSystem.update(deltaTime, this.player.position);
    this.missionSystem.update(this.player.position);
    this.objectiveGuidance.update(deltaTime, this.player.position);

    // 8. Visual Particles
    if (this.playerController.state === 'dodge' && this.playerController.dodgeTime < 0.05) {
      this.movementFX.emitDust(this.player.position.x, this.player.position.z, 2.0, 4);
    }
    this.movementFX.update(deltaTime, this.cameraController.camera);

    // 9. Debug Overlay
    this.debugOverlay.update();

    // 10. Final Post-Processed Render
    this.renderPipeline.render(deltaTime, this.cameraController.target);
  }
}

// Initialize when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
