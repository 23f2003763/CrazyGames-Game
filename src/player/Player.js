import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WORLD_SCALE } from '../config/WorldScale.js';

/**
 * Player: Playable Hero Survivor (Ryder) using the official Quaternius animated character.
 * Uses THREE.AnimationMixer and true metric world scale (height = 1.80m).
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'PlayerRoot';
    this.scene.add(this.group);

    this.position = this.group.position;
    this.rotation = this.group.rotation;

    this.isLoaded = false;
    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.onLoadedCallbacks = [];

    // Collision & physics properties
    this.radius = WORLD_SCALE.PLAYER_RADIUS; // 0.40m
    this.height = WORLD_SCALE.PLAYER_HEIGHT; // 1.80m

    this.createContactShadow();
    this.loadCharacter();
  }

  createContactShadow() {
    const shadowGeo = new THREE.PlaneGeometry(1.1, 1.1);
    
    // Canvas procedural radial shadow texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.025;
    this.group.add(this.shadowMesh);
  }

  loadCharacter() {
    const loader = new GLTFLoader();
    const modelPath = '/assets/vendor/quaternius/zombie-apocalypse/Characters/glTF/Characters_Shaun.gltf';

    loader.load(
      modelPath,
      (gltf) => {
        this.model = gltf.scene;
        this.model.name = 'Ryder_SurvivorCharacter';
        this.animations = gltf.animations || [];

        // Configure shadows & materials for WebGL / CrazyGames performance
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = THREE.MathUtils.clamp(child.material.roughness ?? 0.8, 0.4, 0.95);
              child.material.metalness = THREE.MathUtils.clamp(child.material.metalness ?? 0.0, 0.0, 0.3);
            }
          }
        });

        // Calculate accurate Box3 dimensions in default A-pose
        const bbox = new THREE.Box3().setFromObject(this.model);
        const rawHeight = bbox.max.y - bbox.min.y;
        
        // Scale strictly to target 1.80m world height
        const targetHeight = WORLD_SCALE.PLAYER_HEIGHT;
        const scaleFactor = rawHeight > 0.001 ? (targetHeight / rawHeight) : 1.0;
        this.model.scale.setScalar(scaleFactor);

        // Reposition model so feet sit on Y = 0.0 relative to PlayerRoot
        const scaledBbox = new THREE.Box3().setFromObject(this.model);
        this.model.position.y = -scaledBbox.min.y;

        // Quaternius characters face +Z by default; rotate 180° if needed so forward matches movement
        this.model.rotation.y = Math.PI;

        this.group.add(this.model);
        this.isLoaded = true;

        const finalBbox = new THREE.Box3().setFromObject(this.group);
        const finalH = finalBbox.max.y - finalBbox.min.y;
        console.log(`[PLAYER] RYDER OFFICIAL CC0 MODEL LOADED: World Height = ${finalH.toFixed(2)}m (Scale factor: ${scaleFactor.toFixed(3)})`);

        // Initialize Animation Mixer
        this.mixer = new THREE.AnimationMixer(this.model);

        // Notify animator callbacks
        for (const cb of this.onLoadedCallbacks) {
          cb(this);
        }
      },
      undefined,
      (error) => {
        console.error('Error loading Quaternius survivor model:', error);
      }
    );
  }

  onLoaded(callback) {
    if (this.isLoaded) {
      callback(this);
    } else {
      this.onLoadedCallbacks.push(callback);
    }
  }

  update(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }
}
