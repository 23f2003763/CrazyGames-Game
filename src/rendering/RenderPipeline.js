import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Lightweight, high-performance rendering & lighting pipeline
 * calibrated for rich material response, crisp soft shadows, and vibrant tone mapping.
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

    // 1. Correct Color Management
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. ACES Filmic Tone Mapping with balanced exposure
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // 3. High-Fidelity Soft Shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initAtmosphere() {
    // Stylized post-apocalyptic sky & gentle horizon atmosphere
    const skyColor = new THREE.Color(0x9cb8aa);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x9cb8aa, 0.0032);
  }

  initLighting() {
    // 1. Hemisphere Light: Sky (cooler daylight) + Ground (warm earthy bounce)
    const hemiLight = new THREE.HemisphereLight(0xb4daf5, 0x3a4232, 0.82);
    hemiLight.position.set(0, 90, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // 2. Main Directional Sunlight: Warm golden sun angled for crisp isometric depth
    const sunLight = new THREE.DirectionalLight(0xfff0d2, 1.42);
    sunLight.position.set(-60, 90, 60);
    sunLight.castShadow = true;

    // Tight shadow camera frustum focused around active player/camera area
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;

    const shadowExtent = 44; // Tight 44m bounding box gives razor-sharp shadow resolution
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    
    // NormalBias to eliminate shadow acne on low-poly geometry
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.04;

    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 3. Subtle secondary cool fill light from opposite flank
    const fillLight = new THREE.DirectionalLight(0x6e9cb0, 0.32);
    fillLight.position.set(70, 50, -60);
    this.scene.add(fillLight);
    this.fillLight = fillLight;
  }

  initPostProcessing() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      samples: 4,
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // Pass 1: Scene Render
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.renderPass = renderPass;

    // Pass 2: Subtle Bloom for fires, lamps, and bright specular glints
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.14,  // Subtle strength
      0.40,  // Radius
      0.84   // Threshold: Only lights/fire glow
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    // Pass 3: OutputPass
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  render(deltaTime, cameraTarget) {
    // Dynamically center the directional shadow frustum over camera target
    if (cameraTarget && this.sunLight) {
      const sunOffset = new THREE.Vector3(-60, 90, 60);
      this.sunLight.position.copy(cameraTarget).add(sunOffset);
      this.sunLight.target.position.copy(cameraTarget);
      this.sunLight.target.updateMatrixWorld();
    }

    this.composer.render(deltaTime);
  }
}
