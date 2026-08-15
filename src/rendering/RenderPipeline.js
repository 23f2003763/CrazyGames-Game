import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Lightweight, high-performance rendering & post-processing pipeline
 * tailored for CrazyGames / WebGL action games.
 * 
 * Features:
 * - Proper sRGB Color Space & ACES Filmic Tone Mapping
 * - Subtle UnrealBloomPass (0.16 strength, 0.82 threshold) for emissives/FX
 * - Tight shadow camera tracking for razor-sharp PCF soft shadows
 * - NormalBias to eliminate shadow acne on low-poly geometry
 * - Rich 3-point hemisphere + directional sunlight depth
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
    this.renderer.toneMappingExposure = 1.12;

    // 3. High-Fidelity Soft Shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initAtmosphere() {
    // Vibrant stylized post-apocalyptic sky & horizon fog
    const skyColor = new THREE.Color(0xa3c8b4);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xa3c8b4, 0.0035);
  }

  initLighting() {
    // 1. Hemisphere Light: Sky (cool cyan/blue) + Ground (warm earthy olive)
    const hemiLight = new THREE.HemisphereLight(0xd6ecfa, 0x38482f, 0.88);
    hemiLight.position.set(0, 90, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // 2. Main Directional Sunlight: Warm golden sun angled for crisp isometric depth
    const sunLight = new THREE.DirectionalLight(0xfff5d8, 1.45);
    sunLight.position.set(-70, 95, 65);
    sunLight.castShadow = true;

    // Tight shadow camera frustum focused around active view area
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;

    const shadowExtent = 68; // Tight bounding coverage for maximum shadow resolution
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    
    // Shadow biases to completely prevent self-shadow acne on faceted low-poly meshes
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.035;

    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 3. Subtle secondary fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x7faab8, 0.28);
    fillLight.position.set(75, 55, -65);
    this.scene.add(fillLight);
    this.fillLight = fillLight;
  }

  initPostProcessing() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Custom WebGLRenderTarget with sRGB ColorSpace & Float/Half-Float precision
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      samples: 4, // Multi-sample antialiasing
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // Pass 1: Scene Render
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.renderPass = renderPass;

    // Pass 2: Subtle UnrealBloomPass (0.16 strength, 0.25 radius, 0.82 threshold)
    // Non-intrusive bloom for neon signs, emissives, and bright highlights
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.16, // strength (subtle)
      0.25, // radius
      0.82  // threshold (only bright emissives glow)
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    // Pass 3: OutputPass (Accurate sRGB color conversion & tone mapping output)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
    this.outputPass = outputPass;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  render(deltaTime, targetPosition) {
    // Keep directional sunlight shadow frustum tightly aligned with current camera target
    if (this.sunLight && targetPosition) {
      this.sunLight.position.set(targetPosition.x - 70, 95, targetPosition.z + 65);
      this.sunLight.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
      this.sunLight.target.updateMatrixWorld();
    }

    // Execute post-processing pipeline
    this.composer.render(deltaTime);
  }
}
