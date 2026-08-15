import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { World } from './world/World.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimator } from './player/PlayerAnimator.js';
import { ColliderRegistry } from './physics/ColliderRegistry.js';
import { WalkableSurfaceSystem } from './physics/WalkableSurfaceSystem.js';
import { CameraOcclusion } from './camera/CameraOcclusion.js';
import { MovementFX } from './vfx/MovementFX.js';

/**
 * Main Application Orchestrator
 * Fully architected with LocationRegistry, WalkableSurfaceSystem, ColliderRegistry, CameraOcclusion
 */
class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    // 1. Core Scene
    this.scene = new THREE.Scene();

    // 2. Isometric Camera Controller
    this.cameraController = new IsometricCamera(this.container);

    // 3. Global Rendering & Post-Processing Pipeline
    this.renderPipeline = new RenderPipeline(
      this.container,
      this.scene,
      this.cameraController.camera
    );

    // 4. World Environment & Procedural Map (Instantiates LocationRegistry)
    this.world = new World(this.scene);

    // 5. Physics & Walkable Surface Systems
    this.collision = new ColliderRegistry(this.scene);
    this.collision.buildFromRoots(this.world.locationRegistry.roots);
    
    this.walkableSurfaceSystem = new WalkableSurfaceSystem(this.scene);
    this.walkableSurfaceSystem.buildFromRoots(this.world.locationRegistry.roots);

    // Rebuild collision and walkable surfaces whenever a location finishes loading
    this.world.onLocationLoaded = (locName) => {
      this.collision.buildFromRoots(this.world.locationRegistry.roots);
      this.walkableSurfaceSystem.buildFromRoots(this.world.locationRegistry.roots);
      if (locName === 'relay') {
        this.spawnPlayerAtRelay();
      }
    };

    // 6. Playable Player Survivor (Ryder)
    this.player = new Player(this.scene);
    this.playerController = new PlayerController(
      this.player, 
      this.cameraController, 
      this.collision, 
      this.walkableSurfaceSystem
    );
    this.playerAnimator = new PlayerAnimator(this.player);

    // 7. Dynamic Spawn via SPAWN_PLAYER Marker in Relay
    this.spawnPlayerAtRelay();

    // Connect camera tracking to player
    this.cameraController.setPlayer(this.player);

    // 8. Camera Occlusion System
    this.cameraOcclusion = new CameraOcclusion(
      this.scene, 
      this.cameraController.camera, 
      this.player
    );
    this.cameraOcclusion.setRoots(this.world.locationRegistry.roots);

    // 9. Debug Hooks (F7 Colliders, F9 Walkables)
    this.cameraController.onToggleColliders = () => {
      const active = this.collision.toggleDebug(undefined, this.player);
      console.log(`[DEBUG] Colliders visualization: ${active ? 'ON' : 'OFF'}`);
    };
    this.cameraController.onToggleWalkable = () => {
      const active = this.walkableSurfaceSystem.toggleDebug();
      console.log(`[DEBUG] Walkable surfaces visualization: ${active ? 'ON' : 'OFF'}`);
    };

    // 10. Movement VFX
    this.movementFX = new MovementFX(this.scene);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start 60fps render loop
    this.animate();
  }

  spawnPlayerAtRelay() {
    let spawnWorldPos = new THREE.Vector3();
    let found = false;

    this.world.locationRegistry.roots.relay.updateMatrixWorld(true);
    this.world.locationRegistry.roots.relay.traverse((child) => {
      if (!found && child.name === 'SPAWN_PLAYER') {
        child.getWorldPosition(spawnWorldPos);
        found = true;
      }
    });

    if (!found) {
      // Fallback coordinate if marker not found
      spawnWorldPos.set(-95, 0, 68);
    }

    const groundY = this.walkableSurfaceSystem.sampleHeight(spawnWorldPos.x, spawnWorldPos.z);
    this.player.position.set(spawnWorldPos.x, groundY, spawnWorldPos.z);
    this.player.rotation.y = Math.PI * 0.75; // Face towards the exit gate
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

    // 1. Input & Physics Update
    this.playerController.update(deltaTime);

    // 2. Procedural Animation Update
    this.playerAnimator.update(deltaTime, this.playerController.velocity, this.playerController.state);

    // 3. Movement VFX Update
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

    // 4. Isometric Camera Tracking
    this.cameraController.update(deltaTime);

    // 5. Structural Camera Occlusion
    this.cameraOcclusion.update(deltaTime);

    // 6. Debug visuals update
    this.collision.updateDebug(this.player);

    // 7. Ambient Environmental VFX Update
    if (this.world?.ambientFX) {
      this.world.ambientFX.update(deltaTime);
    }

    // 8. Water surface subtle wave
    if (this.world?.terrain?.waterMesh) {
      this.world.terrain.waterMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.04;
    }

    // 9. Post-Processed Render
    this.renderPipeline.render(deltaTime, this.cameraController.target);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
