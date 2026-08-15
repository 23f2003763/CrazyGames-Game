import * as THREE from 'three';
import { IsometricCamera } from './camera/IsometricCamera.js';
import { World } from './world/World.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    this.initRenderer();
    this.initScene();
    this.initLighting();
    
    this.cameraController = new IsometricCamera(this.container);
    this.world = new World(this.scene);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    window.addEventListener('resize', this.onWindowResize);

    // Start rendering loop
    this.animate();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Shadow configuration for crisp low-poly shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Stylized color tone mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    
    // Vibrant stylized post-apocalyptic sky & fog background
    const skyColor = new THREE.Color(0xa3c8b4); // Soft pastel green-blue horizon
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xa3c8b4, 0.0048);
  }

  initLighting() {
    // 1. Hemisphere Light for rich ambient fill (warm sky + earthy ground bounce)
    const hemiLight = new THREE.HemisphereLight(0xdcf0fb, 0x3d4a36, 0.85);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    // 2. Main Directional Sunlight (angled for clean isometric shadows)
    const sunLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    sunLight.position.set(-90, 110, 80);
    sunLight.castShadow = true;

    // Shadow camera bounds to cover large continuous terrain area
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 280;

    const shadowSize = 140;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    sunLight.shadow.bias = -0.0004;

    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 3. Subtle secondary fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x7fb3b0, 0.35);
    fillLight.position.set(80, 60, -70);
    this.scene.add(fillLight);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // Update isometric camera target
    this.cameraController.update(deltaTime);

    // Make sunlight shadow camera follow current camera target for maximum shadow fidelity anywhere on map
    if (this.sunLight) {
      const target = this.cameraController.target;
      this.sunLight.position.set(target.x - 90, 110, target.z + 80);
      this.sunLight.target.position.set(target.x, target.y, target.z);
      this.sunLight.target.updateMatrixWorld();
    }

    // Subtle gentle river wave pulse
    if (this.world && this.world.terrain && this.world.terrain.waterMesh) {
      this.world.terrain.waterMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.04;
    }

    this.renderer.render(this.scene, this.cameraController.camera);
  }
}

// Initialize application
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
