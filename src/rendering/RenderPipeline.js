import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Lightweight, high-performance rendering & lighting pipeline
 * calibrated for rich material response, crisp soft shadows, and bright daytime readability.
 */
export class RenderPipeline {
  constructor(container, scene, camera) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;

    this.initRenderer();
    this.initAtmosphere();
    this.initLighting();
    this.initPostProcessing();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 1. Display output color space
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. ACES Filmic Tone Mapping with high daytime readability
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    // 3. High-Fidelity Soft Shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initAtmosphere() {
    const skyColor = new THREE.Color(0xb5bfa1); // Warmer overcast sky
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xb5bfa1, 0.0028);
  }

  initLighting() {
    // 1. Hemisphere Light: Sky daylight + Ground warm earthy bounce
    const hemiLight = new THREE.HemisphereLight(0xd4d8c5, 0x5a4a3a, 1.15); // warmer golden, ground warm brown
    hemiLight.position.set(0, 90, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // 2. Main Directional Sunlight: Crisp warm sun
    const sunLight = new THREE.DirectionalLight(0xffeed6, 1.60); // slightly warm white, soft shadows
    sunLight.position.set(-60, 90, 60);
    sunLight.castShadow = true;

    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;

    const shadowExtent = 48;
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.04;

    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 3. Cool fill light from opposite side for shadow readability
    const fillLight = new THREE.DirectionalLight(0x7ea8be, 0.42);
    fillLight.position.set(70, 50, -60);
    this.scene.add(fillLight);
    this.fillLight = fillLight;
  }

  initPostProcessing() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Intermediate render target in Linear space
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      samples: 4,
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // Pass 1: Scene Render
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.renderPass = renderPass;

    // Pass 2: Subtle Bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.16,
      0.40,
      0.82
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    // Pass 3: OutputPass for final color space & tone mapping conversion
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  render(deltaTime, cameraTarget) {
    if (cameraTarget && this.sunLight) {
      const sunOffset = new THREE.Vector3(-60, 90, 60);
      this.sunLight.position.copy(cameraTarget).add(sunOffset);
      this.sunLight.target.position.copy(cameraTarget);
      this.sunLight.target.updateMatrixWorld();
    }

    this.composer.render(deltaTime);
  }
}
