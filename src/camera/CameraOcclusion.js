import * as THREE from 'three';

export class CameraOcclusion {
  constructor(scene, camera, target) {
    this.scene = scene;
    this.camera = camera;
    this.target = target;
    
    this.raycaster = new THREE.Raycaster();
    this.occludedMeshes = new Set();
    this.targetOpacity = 0.30;
    this.occluderRoots = [];
    
    // Track original materials & clones
    this.originalMaterials = new Map();
  }

  setRoots(roots) {
    this.occluderRoots = Object.values(roots);
  }

  update(dt) {
    if (!this.target || this.occluderRoots.length === 0) return;

    // Raycast from camera to player's torso level
    const start = this.camera.position;
    const end = new THREE.Vector3().copy(this.target.position);
    end.y += 1.2; 
    
    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();
    direction.normalize();

    this.raycaster.set(start, direction);
    this.raycaster.far = Math.max(0.1, distance - 0.5);

    const intersects = this.raycaster.intersectObjects(this.occluderRoots, true);
    
    const currentHits = new Set();
    
    for (let i = 0; i < intersects.length; i++) {
      const mesh = intersects[i].object;
      
      // Ignore ground/walkable surfaces, particles, or shadows
      if (!mesh.isMesh || mesh.userData.isWalkable || mesh.name.includes('Ground') || mesh.name.includes('Shadow') || mesh.name.includes('Water')) {
        continue;
      }
      
      currentHits.add(mesh);
      this.occludedMeshes.add(mesh);
      
      // Ensure material is cloned and prepared for transparency
      if (mesh.material && !this.originalMaterials.has(mesh.uuid)) {
        this.originalMaterials.set(mesh.uuid, mesh.material);
        const clonedMat = mesh.material.clone();
        clonedMat.transparent = true;
        mesh.material = clonedMat;
      }
    }
    
    // Smoothly transition opacity of all tracked meshes
    for (const mesh of this.occludedMeshes) {
      if (!mesh.material) continue;
      
      const targetOp = currentHits.has(mesh) ? this.targetOpacity : 1.0;
      const currentOp = mesh.material.opacity !== undefined ? mesh.material.opacity : 1.0;
      const newOp = THREE.MathUtils.lerp(currentOp, targetOp, Math.min(1.0, dt * 8.0));
      
      mesh.material.opacity = newOp;
      
      // If fully restored and no longer hit, restore original material and un-track
      if (!currentHits.has(mesh) && Math.abs(newOp - 1.0) < 0.02) {
        if (this.originalMaterials.has(mesh.uuid)) {
          mesh.material = this.originalMaterials.get(mesh.uuid);
          this.originalMaterials.delete(mesh.uuid);
        }
        this.occludedMeshes.delete(mesh);
      }
    }
  }
}
