import * as THREE from 'three';

export class ColliderRegistry {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.debugMode = false;
    this.debugMeshes = [];
    this.playerDebugMesh = null;
  }

  addCircle(x, z, radius) {
    this.colliders.push({ type: 'circle', x, z, radius });
  }

  addBox(x, z, width, depth, rotation = 0) {
    this.colliders.push({
      type: 'box',
      x,
      z,
      width,
      depth,
      rotation
    });
  }

  buildFromRoots(roots) {
    this.colliders = [];
    const vec = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    
    Object.values(roots).forEach(root => {
      root.updateMatrixWorld(true);
      root.traverse((node) => {
        if (node.name.startsWith('COL_BOX_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          euler.setFromQuaternion(quat, 'YXZ');
          
          const width = scale.x;
          const depth = scale.z;
          
          this.addBox(vec.x, vec.z, width, depth, euler.y);
          node.visible = false;
        } else if (node.name.startsWith('COL_CIRCLE_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          const radius = Math.max(scale.x, scale.z) / 2;
          this.addCircle(vec.x, vec.z, radius);
          node.visible = false;
        }
      });
    });
  }

  toggleDebug(enabled, player) {
    this.debugMode = enabled !== undefined ? enabled : !this.debugMode;
    
    // Cleanup existing debug meshes
    this.debugMeshes.forEach(m => this.scene.remove(m));
    this.debugMeshes = [];
    if (this.playerDebugMesh) {
      this.scene.remove(this.playerDebugMesh);
      this.playerDebugMesh = null;
    }
    
    if (this.debugMode) {
      const matBox = new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });
      const matCircle = new THREE.MeshBasicMaterial({
        color: 0xff9500,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });
      
      this.colliders.forEach(col => {
        if (col.type === 'box') {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(col.width, 2.4, col.depth), matBox);
          mesh.position.set(col.x, 1.2, col.z);
          mesh.rotation.y = col.rotation;
          mesh.renderOrder = 999;
          this.scene.add(mesh);
          this.debugMeshes.push(mesh);
        } else if (col.type === 'circle') {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(col.radius, col.radius, 2.4, 16), matCircle);
          mesh.position.set(col.x, 1.2, col.z);
          mesh.renderOrder = 999;
          this.scene.add(mesh);
          this.debugMeshes.push(mesh);
        }
      });
      
      if (player) {
        const matPlayer = new THREE.MeshBasicMaterial({
          color: 0x30d158,
          wireframe: true,
          depthTest: false,
          transparent: true,
          opacity: 0.9
        });
        const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 16), matPlayer);
        pMesh.position.copy(player.position);
        pMesh.position.y += 1.1;
        pMesh.renderOrder = 1000;
        this.scene.add(pMesh);
        this.playerDebugMesh = pMesh;
      }
    }
    
    return this.debugMode;
  }

  updateDebug(player) {
    if (this.debugMode && this.playerDebugMesh && player) {
      this.playerDebugMesh.position.copy(player.position);
      this.playerDebugMesh.position.y += 1.1;
    }
  }

  resolvePosition(pos, radius = 0.45) {
    let resolvedX = pos.x;
    let resolvedZ = pos.z;
    
    const ITERATIONS = 3;
    
    for (let i = 0; i < ITERATIONS; i++) {
      for (const col of this.colliders) {
        if (col.type === 'circle') {
          const dx = resolvedX - col.x;
          const dz = resolvedZ - col.z;
          const distSq = dx * dx + dz * dz;
          const minD = radius + col.radius;
          
          if (distSq < minD * minD && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const push = minD - dist;
            resolvedX += (dx / dist) * push;
            resolvedZ += (dz / dist) * push;
          }
        } else if (col.type === 'box') {
          const dx = resolvedX - col.x;
          const dz = resolvedZ - col.z;
          
          const cos = Math.cos(-col.rotation);
          const sin = Math.sin(-col.rotation);
          
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          
          const hw = col.width / 2;
          const hd = col.depth / 2;
          
          const closestX = Math.max(-hw, Math.min(hw, localX));
          const closestZ = Math.max(-hd, Math.min(hd, localZ));
          
          const cdx = localX - closestX;
          const cdz = localZ - closestZ;
          const distSq = cdx * cdx + cdz * cdz;
          
          if (distSq < radius * radius) {
            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const push = radius - dist;
              
              const pushLocalX = (cdx / dist) * push;
              const pushLocalZ = (cdz / dist) * push;
              
              const pushCos = Math.cos(col.rotation);
              const pushSin = Math.sin(col.rotation);
              
              resolvedX += pushLocalX * pushCos - pushLocalZ * pushSin;
              resolvedZ += pushLocalX * pushSin + pushLocalZ * pushCos;
            } else {
              const dLeft = localX - (-hw);
              const dRight = hw - localX;
              const dTop = localZ - (-hd);
              const dBottom = hd - localZ;
              
              const minDepth = Math.min(dLeft, dRight, dTop, dBottom);
              
              let pushLocalX = 0;
              let pushLocalZ = 0;
              
              if (minDepth === dLeft) pushLocalX = -dLeft - radius;
              else if (minDepth === dRight) pushLocalX = dRight + radius;
              else if (minDepth === dTop) pushLocalZ = -dTop - radius;
              else if (minDepth === dBottom) pushLocalZ = dBottom + radius;
              
              const pushCos = Math.cos(col.rotation);
              const pushSin = Math.sin(col.rotation);
              
              resolvedX += pushLocalX * pushCos - pushLocalZ * pushSin;
              resolvedZ += pushLocalX * pushSin + pushLocalZ * pushCos;
            }
          }
        }
      }
    }
    
    pos.x = resolvedX;
    pos.z = resolvedZ;
  }
}
