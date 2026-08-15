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

// Campaign & Gameplay Core Architecture
import { CampaignWorld } from './campaign/CampaignWorld.js';
import { ChapterDirector } from './campaign/ChapterDirector.js';
import { MissionSystem } from './missions/MissionSystem.js';
import { InteractionSystem } from './gameplay/InteractionSystem.js';
import { LootSystem } from './gameplay/LootSystem.js';
import { NPCSystem } from './npc/NPCSystem.js';
import { ObjectiveGuidance } from './ui/ObjectiveGuidance.js';
import { ObjectiveHUD } from './ui/ObjectiveHUD.js';
import { CheckpointSystem } from './gameplay/CheckpointSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { CampaignDebugOverlay } from './ui/CampaignDebugOverlay.js';

/**
 * Main Game Application Orchestrator
 * Drives the Linear Semi-Open Campaign, Sector Management, and Level 1 Gameplay Loop.
 */
class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    // 1. Core Three.js Scene
    this.scene = new THREE.Scene();

    // 2. Isometric Camera Controller
    this.cameraController = new IsometricCamera(this.container);

    // 3. Global Post-Processing & Rendering Pipeline
    this.renderPipeline = new RenderPipeline(
      this.container,
      this.scene,
      this.cameraController.camera
    );

    // 4. Core Systems: Audio, Checkpoints, Interactions, Loot, NPCs
    this.audioSystem = new AudioSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.interactionSystem = new InteractionSystem(this.cameraController.camera);
    this.lootSystem = new LootSystem(this.scene, this.interactionSystem, this.audioSystem);
    this.npcSystem = new NPCSystem(this.scene, this.interactionSystem);

    // 5. Campaign World (+Z corridor, 7m highway, 3 Sectors, Electric Fences)
    this.world = new CampaignWorld(
      this.scene, 
      this.interactionSystem, 
      this.lootSystem, 
      this.npcSystem
    );

    // 6. Physics & Walkable Surfaces
    this.collision = new ColliderRegistry(this.scene);
    this.walkableSurfaceSystem = new WalkableSurfaceSystem(this.scene);
    if (this.world.terrainMesh) {
      this.walkableSurfaceSystem.registerSurface(this.world.terrainMesh, 'terrain');
    }

    // 7. Playable Hero (Ryder)
    this.player = new Player(this.scene);
    this.playerController = new PlayerController(
      this.player, 
      this.cameraController, 
      this.collision, 
      this.walkableSurfaceSystem
    );
    this.playerAnimator = new PlayerAnimator(this.player);

    // Spawn Ryder inside The Relay courtyard facing +Z towards the road
    this.player.position.set(0.0, 0.0, -8.0);
    this.player.rotation.y = 0.0;
    this.cameraController.setPlayer(this.player);

    // 8. Mission & Objective Systems
    this.missionSystem = new MissionSystem(this.audioSystem, this.checkpointSystem);
    this.chapterDirector = new ChapterDirector(this.world, this.missionSystem);
    this.objectiveGuidance = new ObjectiveGuidance(this.scene);
    this.objectiveHUD = new ObjectiveHUD();

    // Initialize HUD & Guidance with first objective
    const initialObj = this.missionSystem.getCurrentObjective();
    this.objectiveHUD.setObjective(initialObj, this.missionSystem.currentMission);
    this.objectiveGuidance.setObjective(initialObj);

    // Wire Objective Change & Mission Completion Callbacks
    this.missionSystem.onObjectiveChanged = (obj, mission) => {
      this.objectiveHUD.setObjective(obj, mission);
      this.objectiveGuidance.setObjective(obj);
    };

    this.missionSystem.onMissionCompleted = (mission) => {
      this.objectiveHUD.showLevelComplete(mission.title);
      if (this.audioSystem) {
        this.audioSystem.playLevelComplete();
      }
    };

    // 9. Camera Structural Occlusion
    this.cameraOcclusion = new CameraOcclusion(
      this.scene, 
      this.cameraController.camera, 
      this.player
    );
    this.cameraOcclusion.setRoots({
      sectors: this.world.sectorManager.rootGroup
    });

    // 10. Visual Effects & Particles
    this.movementFX = new MovementFX(this.scene);

    // 11. Debug Overlay (F5)
    this.debugOverlay = new CampaignDebugOverlay(
      this.chapterDirector,
      this.missionSystem,
      this.world.sectorManager,
      this.player
    );

    // Debug Shortcuts (F7 Colliders, F9 Walkables)
    this.cameraController.onToggleColliders = () => {
      const active = this.collision.toggleDebug(undefined, this.player);
      console.log(`[DEBUG] Colliders: ${active ? 'ON' : 'OFF'}`);
    };
    this.cameraController.onToggleWalkable = () => {
      const active = this.walkableSurfaceSystem.toggleDebug();
      console.log(`[DEBUG] Walkable Surfaces: ${active ? 'ON' : 'OFF'}`);
    };

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start render loop
    this.animate();
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

    // 1. Input & Hero Physics Update
    this.playerController.update(deltaTime);

    // 2. Skeletal Animation Update
    this.playerAnimator.update(
      deltaTime, 
      this.playerController.velocity, 
      this.playerController.state
    );

    // 3. Movement Dust VFX Update
    if (this.playerController.state === 'dodge' && this.playerController.dodgeTime < 0.05) {
      this.movementFX.emitDust(this.player.position.x, this.player.position.z, 2.0, 4);
    } else if (this.playerController.state !== 'idle') {
      this.movementFX.updateWalkSteps(
        this.player.position.x, 
        this.player.position.z, 
        this.playerController.velocity.length(), 
        deltaTime, 
        elapsedTime
      );
    }
    this.movementFX.update(deltaTime, this.cameraController.camera);

    // 4. Campaign World & Sector Update
    this.world.update(this.player.position);

    // 5. Gameplay Systems Update
    this.interactionSystem.update(this.player.position);
    this.lootSystem.update(deltaTime, this.player.position);
    this.npcSystem.update(deltaTime, this.player.position);
    this.missionSystem.update(this.player.position);
    this.objectiveGuidance.update(deltaTime, this.player.position);

    // 6. Camera Tracking & Structural Occlusion
    this.cameraController.update(deltaTime);
    this.cameraOcclusion.update(deltaTime);

    // 7. Debug Overlays Update
    this.collision.updateDebug(this.player);
    this.debugOverlay.update();

    // 8. Final Render
    this.renderPipeline.render(deltaTime, this.cameraController.target);
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
