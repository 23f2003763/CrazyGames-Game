import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * NPC: Animated survivor character with idle mixer and head tracking.
 */
export class NPC {
  constructor(scene, config, dialogueUI) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name || 'Survivor';
    this.dialogueUI = dialogueUI;

    this.position = new THREE.Vector3(config.x, config.y, config.z);
    this.targetRotationY = config.rotY || 0;

    this.group = new THREE.Group();
    this.group.name = `NPC_${this.id}`;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.targetRotationY;

    this.mixer = null;
    this.modelRoot = null;
    this.loader = new GLTFLoader();

    this.loadModel();
  }

  loadModel() {
    // Use Quaternius Lis character for Mara
    this.loader.load('/assets/vendor/quaternius/zombie-apocalypse/Characters/glTF/Characters_Lis.gltf', (gltf) => {
      const model = gltf.scene;
      this.modelRoot = model;

      // Scale to 1.80m
      const bbox = new THREE.Box3().setFromObject(model);
      const h = bbox.max.y - bbox.min.y;
      if (h > 0.01) {
        const s = 1.80 / h;
        model.scale.setScalar(s);
      }

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.group.add(model);

      // Play Idle Animation
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes('idle')) || gltf.animations[0];
        if (idleClip) {
          const action = this.mixer.clipAction(idleClip);
          action.play();
        }
      }
    });
  }

  update(dt, playerPos) {
    if (this.mixer) {
      this.mixer.update(dt);
    }

    if (playerPos) {
      const dist = this.position.distanceTo(playerPos);
      if (dist < 5.0) {
        // Look towards player
        const angle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, angle, dt * 4.0);
      }
    }
  }
}
