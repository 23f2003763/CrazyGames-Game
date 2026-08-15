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
        
        // Find the PLAYER_ROOT node, or just use the model if not wrapped
        let rootNode = model.getObjectByName('PLAYER_ROOT');
        if (!rootNode) rootNode = model;
        
        // Traverse and extract parts
        rootNode.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Apply a nice toon-like material instead of default GLTF
            if (child.material) {
               const color = child.material.color;
               child.material = new THREE.MeshStandardMaterial({
                 color: color,
                 roughness: 0.9,
                 metalness: 0.1,
                 flatShading: true
               });
            }
          }
          
          // Store named parts
          const name = child.name.toLowerCase();
          if (name) {
             this.parts[name] = child;
          }
          
          if (name === 'shadow_socket') {
            this.shadowSocket = child;
          }
        });
        
        // Store base Y position of torso for animation
        if (this.parts.torso) {
          this.baseTorsoY = this.parts.torso.position.y;
        }
        
        // Create contact shadow
        this.createContactShadow();
        
        // Add to our group
        this.group.add(model);
        
        // Fix rotation - Blender models often need this when imported to three.js
        // If the script orientates it well, we might not need this, but usually good to have.
        // model.rotation.x = Math.PI / 2; // depending on export settings
        
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
      opacity: 0.4,
      depthWrite: false
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.05; // Slightly above ground
    
    if (this.shadowSocket) {
      this.shadowSocket.add(shadowMesh);
    } else {
      this.group.add(shadowMesh);
    }
  }
  
  get position() {
    return this.group.position;
  }
  
  get rotation() {
    return this.group.rotation;
  }
}
