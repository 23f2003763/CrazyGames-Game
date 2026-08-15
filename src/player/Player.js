import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    
    // Create root group for the player
    this.group = new THREE.Group();
    this.group.name = 'PlayerRoot';
    this.scene.add(this.group);
    
    // Map of loaded body parts for procedural animation
    this.parts = {};
    this.baseTorsoY = 0;
    
    // Contact shadow dummy
    this.shadowSocket = null;
    
    this.loadModel();
  }
  
  loadModel() {
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/player_survivor.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Find the PLAYER_ROOT node, or use model directly
        let rootNode = model.getObjectByName('PLAYER_ROOT');
        if (!rootNode) rootNode = model;
        
        // Traverse and extract parts & configure materials
        rootNode.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              const origColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xcccccc);
              const roughness = child.material.roughness !== undefined ? child.material.roughness : 0.8;
              const metalness = child.material.metalness !== undefined ? child.material.metalness : 0.1;
              child.material = new THREE.MeshStandardMaterial({
                color: origColor,
                roughness: roughness,
                metalness: metalness,
                flatShading: true
              });
            }
          }
          
          // Store named parts for procedural animation
          const name = child.name.toLowerCase();
          if (name) {
            this.parts[name] = child;
          }
          
          if (name === 'shadow_socket') {
            this.shadowSocket = child;
          }
        });
        
        // Store base Y position of torso for procedural locomotion/breathing
        if (this.parts.torso) {
          this.baseTorsoY = this.parts.torso.position.y;
        }
        
        // Measure imported bounding box and normalize height to TARGET_PLAYER_HEIGHT = 2.1
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const currentHeight = box.max.y - box.min.y;
        
        const TARGET_PLAYER_HEIGHT = 2.1;
        if (currentHeight > 0.01) {
          const scaleFactor = TARGET_PLAYER_HEIGHT / currentHeight;
          model.scale.setScalar(scaleFactor);
          model.updateMatrixWorld(true);
          
          // Re-measure after scaling and offset so lowest bounding-box Y is exactly 0.0
          const scaledBox = new THREE.Box3().setFromObject(model);
          model.position.y = -scaledBox.min.y;
          model.updateMatrixWorld(true);
          
          const finalBox = new THREE.Box3().setFromObject(model);
          const finalHeight = finalBox.max.y - finalBox.min.y;
          console.log(`RYDER FINAL WORLD HEIGHT: ${finalHeight.toFixed(2)}`);
        }

        // Add model to PlayerRoot group
        this.group.add(model);
        
        // Create contact shadow on ground plane
        this.createContactShadow();
      },
      undefined,
      (error) => {
        console.error('Error loading player model:', error);
      }
    );
  }
  
  createContactShadow() {
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.name = 'PlayerContactShadow';
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.025; // Slightly above ground to prevent z-fighting
    
    // Attach directly to PlayerRoot group
    this.group.add(shadowMesh);
  }
  
  get position() {
    return this.group.position;
  }
  
  get rotation() {
    return this.group.rotation;
  }
}
