import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimator } from './player/PlayerAnimator.js';
import { ColliderRegistry } from './physics/ColliderRegistry.js';
import { WalkableSurfaceSystem } from './physics/WalkableSurfaceSystem.js';
import { MovementFX } from './vfx/MovementFX.js';

import { inputRouter } from './input/InputRouter.js';
import { campaignFrame } from './campaign/CampaignFrame.js';
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

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();

    this.cameraController = new IsometricCamera(this.container);
    this.renderPipeline = new RenderPipeline(
      this.container,
      this.scene,
      this.cameraController.camera
    );

    this.audioSystem = new AudioSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.dialogueUI = new DialogueUI();
    this.interactionSystem = new InteractionSystem(this.cameraController.camera);
    this.lootSystem = new LootSystem(this.scene, this.interactionSystem, this.audioSystem);
    this.npcSystem = new NPCSystem(this.scene, this.interactionSystem, this.dialogueUI);
    this.cutsceneDirector = new CutsceneDirector(this.cameraController, this.dialogueUI);

    this.collision = new ColliderRegistry(this.scene);

    // Mission/combat exist before the active world so authored encounters can bind safely.
    this.combatSystem = new CombatSystem(this.scene, this.audioSystem);
    this.missionSystem = new MissionSystem(this.audioSystem, this.checkpointSystem);

    const isLegacy = new URLSearchParams(window.location.search).has('legacyLevel');
    if (isLegacy) {
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

    this.walkableSurfaceSystem = new WalkableSurfaceSystem(
      this.scene,
      (x, z) => this.world.sampleHeight(x, z)
    );
    if (this.world.terrainMesh) this.walkableSurfaceSystem.registerSurface(this.world.terrainMesh);

    this.player = new Player(this.scene);
    this.playerController = new PlayerController(
      this.player,
      this.cameraController,
      this.collision,
      this.walkableSurfaceSystem
    );
    this.playerAnimator = new PlayerAnimator(this.player);

    const spawnWorldPos = campaignFrame.requireAnchor('player_spawn');
    this.player.position.copy(spawnWorldPos);
    this.player.rotation.y = Math.atan2(campaignFrame.forwardDir.x, campaignFrame.forwardDir.z);
    this.cameraController.setPlayer(this.player);

    this.breadcrumbSystem = new ArcBreadcrumbSystem(this.scene);
    this.objectiveGuidance = new ObjectiveGuidance(this.scene, this.cameraController.camera);
    this.objectiveHUD = new ObjectiveHUD();

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.cameraController.camera,
      this.player,
      this.playerController,
      this.audioSystem,
      this.combatSystem
    );

    this.tutorialDirector = new TutorialDirector(
      this.scene,
      this.player,
      this.dialogueUI,
      this.audioSystem,
      () => this.startMainCampaign()
    );

    this.movementFX = new MovementFX(this.scene);

    this.debugOverlay = new CampaignDebugOverlay(
      null,
      this.missionSystem,
      this.world.sectorManager,
      this.player
    );

    window.addEventListener('keydown', e => {
      if (e.code === 'F7') this.collision.toggleDebug(undefined, this.player);
    });

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.animate();
  }

  async startMainCampaign() {
    // Tutorial may be skipped immediately. Never launch cinematic shots until the
    // Relay GLB has finished registering its authored CAMERA/TARGET sockets.
    try {
      if (this.world?.relay?.ready) await this.world.relay.ready;
    } catch (err) {
      console.error('[GameApp] Relay failed to become ready:', err);
      return;
    }

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
        this.audioSystem?.playLevelComplete?.();
      };
    });
  }

  onWindowResize() {
    this.renderPipeline.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const realDeltaTime = Math.min(this.clock.getDelta(), 0.1);
    const encounterRef = this.world.encounter || this.enemySystem;
    const isPaused = !!(encounterRef && encounterRef.isTutorialPaused);
    const gameplayDelta = isPaused ? 0 : realDeltaTime;

    if (this.cutsceneDirector.isPlaying) {
      // Cinematics must keep advancing even though gameplay input is disabled.
      this.cutsceneDirector.update(realDeltaTime);
      this.playerAnimator.update(realDeltaTime, new THREE.Vector3(), 'idle');
    } else {
      if (inputRouter.canMove() && !isPaused) this.playerController.update(gameplayDelta);

      this.playerAnimator.update(
        gameplayDelta,
        this.playerController.velocity,
        this.playerController.state
      );

      // Charge presentation is allowed to update while the combat tutorial pauses AI.
      this.weaponSystem.update(realDeltaTime);

      if (!isPaused) this.cameraController.update(gameplayDelta);
      else encounterRef?.updateCameraTutorial?.(realDeltaTime);
    }

    this.combatSystem.update(gameplayDelta);
    this.enemySystem?.update(gameplayDelta, this.player.position);

    if (!this.tutorialDirector.isCompleted) {
      this.tutorialDirector.update(gameplayDelta, this.playerController);
    }

    this.world.update(gameplayDelta, this.player.position);
    if (inputRouter.canInteract() && !isPaused) this.interactionSystem.update(this.player.position);
    this.lootSystem.update(gameplayDelta, this.player.position);
    this.npcSystem.update(gameplayDelta, this.player.position);
    this.missionSystem.update(this.player.position);
    this.breadcrumbSystem.update(gameplayDelta, this.player.position);
    this.objectiveGuidance.update(gameplayDelta, this.player.position);

    if (this.playerController.state === 'dodge' && !isPaused) {
      this.movementFX.emitDust(this.player.position.x, this.player.position.z, 1.5, 2);
    }
    this.movementFX.update(gameplayDelta, this.cameraController.camera);
    this.collision.updateDebug(this.player);
    this.debugOverlay.update();

    this.renderPipeline.render(realDeltaTime, this.cameraController.target);
  }
}

window.addEventListener('DOMContentLoaded', () => new GameApp());
