import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { World } from './world/World.js';
import { RenderPipeline } from './rendering/RenderPipeline.js';

/**
 * Main Application Orchestrator
 * Step 2.2: Global Post-Processing & Rendering Pipeline Integration
 */
class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    // 1. Core Scene
    this.scene = new THREE.Scene();

    // 2. Isometric Camera Controller
    this.cameraController = new IsometricCamera(this.container);

    // 3. Upgraded Global Rendering & Post-Processing Pipeline
    this.renderPipeline = new RenderPipeline(
      this.container,
      this.scene,
      this.cameraController.camera
    );

    // 4. World Environment & Procedural Map
    this.world = new World(this.scene);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start 60fps render loop
    this.animate();
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update render pipeline composer & bloom resolution
    this.renderPipeline.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update isometric camera position & smoothing
    this.cameraController.update(deltaTime);

    // 2. Subtle river stream water wave pulse
    if (this.world?.terrain?.waterMesh) {
      this.world.terrain.waterMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.04;
    }

    // 3. Render scene via EffectComposer (RenderPass -> UnrealBloomPass -> OutputPass)
    // with dynamic tight shadow tracking aligned to active camera target
    this.renderPipeline.render(deltaTime, this.cameraController.target);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
