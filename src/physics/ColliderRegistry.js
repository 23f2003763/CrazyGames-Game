import * as THREE from 'three';

/**
 * ColliderRegistry: High-performance swept collision system with natural wall sliding,
 * substepping, and direct Three.js Object3D matrix binding.
 */
export class ColliderRegistry {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.collidersById = new Map();
    this.debugMode = false;
    this.debugMeshes = [];
    this.playerDebugMesh = null;
    this.collisionEnabled = true; // For F4 diagnostic toggle
  }

  addCircle(x, z, radius, id = null) {
    const colliderId = id || `circle_${this.colliders.length}`;
    const col = { type: 'circle', id: colliderId, x, z, radius };
    this.colliders.push(col);
    this.collidersById.set(colliderId, col);
    return colliderId;
  }

  addBox(x, z, width, depth, rotation = 0, id = null) {
    const colliderId = id || `box_${this.colliders.length}`;
    const col = {
      type: 'box',
      id: colliderId,
      x,
      z,
      width,
      depth,
      rotation
    };
    this.colliders.push(col);
    this.collidersById.set(colliderId, col);
    return colliderId;
  }

  addBoxFromObject(object3D, localSize, id = null) {
    object3D.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    const euler = new THREE.Euler();

    object3D.matrixWorld.decompose(worldPos, worldQuat, worldScale);
    euler.setFromQuaternion(worldQuat, 'YXZ');

    const width = (localSize.x || 1.0) * worldScale.x;
    const depth = (localSize.z || localSize.y || 1.0) * worldScale.z;

    return this.addBox(worldPos.x, worldPos.z, width, depth, euler.y, id || object3D.name);
  }

  has(id) {
    return this.collidersById.has(id);
  }

  remove(id) {
    if (!this.collidersById.has(id)) return;
    this.collidersById.delete(id);
    this.colliders = this.colliders.filter(c => c.id !== id);
    if (this.debugMode) {
      this.refreshDebugMeshes();
    }
  }

  buildFromRoots(roots) {
    if (!roots) return;
    const vec = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    
    Object.values(roots).forEach(root => {
      if (!root || !root.traverse) return;
      root.updateMatrixWorld(true);
      root.traverse((node) => {
        if (node.name && node.name.startsWith('COL_BOX_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          euler.setFromQuaternion(quat, 'YXZ');
          this.addBox(vec.x, vec.z, scale.x, scale.z, euler.y, node.name);
          node.visible = false;
        } else if (node.name && node.name.startsWith('COL_CIRCLE_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          const radius = Math.max(scale.x, scale.z) / 2;
          this.addCircle(vec.x, vec.z, radius, node.name);
          node.visible = false;
        }
      });
    });
  }

  /**
   * Swept & Substepped movement resolver for natural wall sliding.
   */
  moveCharacter(position, displacement, radius = 0.40) {
    if (!this.collisionEnabled) {
      position.x += displacement.x;
      position.z += displacement.z;
      return { blockedX: false, blockedZ: false, actualDisplacement: displacement.clone() };
    }

    const startX = position.x;
    const startZ = position.z;

    const maxStep = 0.10;
    const dist = Math.hypot(displacement.x, displacement.z);
    const steps = Math.max(1, Math.ceil(dist / maxStep));

    const stepX = displacement.x / steps;
    const stepZ = displacement.z / steps;

    let blockedX = false;
    let blockedZ = false;

    for (let s = 0; s < steps; s++) {
      // 1. Move and resolve along X axis
      position.x += stepX;
      const resX = this.resolveCollision(position.x, position.z, radius);
      if (Math.abs(resX.x - position.x) > 0.0001) {
        blockedX = true;
        position.x = resX.x;
      }

      // 2. Move and resolve along Z axis
      position.z += stepZ;
      const resZ = this.resolveCollision(position.x, position.z, radius);
      if (Math.abs(resZ.z - position.z) > 0.0001) {
        blockedZ = true;
        position.z = resZ.z;
      }
    }

    const actualDisplacement = new THREE.Vector3(position.x - startX, 0, position.z - startZ);
    return { blockedX, blockedZ, actualDisplacement };
  }

  resolveCollision(x, z, radius) {
    let resolvedX = x;
    let resolvedZ = z;

    for (const c of this.colliders) {
      if (c.type === 'circle') {
        const dx = resolvedX - c.x;
        const dz = resolvedZ - c.z;
        const distSq = dx * dx + dz * dz;
        const minDist = radius + c.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = minDist - dist;
            resolvedX += (dx / dist) * overlap;
            resolvedZ += (dz / dist) * overlap;
          } else {
            resolvedX += minDist;
          }
        }
      } else if (c.type === 'box') {
        const cos = Math.cos(-c.rotation);
        const sin = Math.sin(-c.rotation);

        const dx = resolvedX - c.x;
        const dz = resolvedZ - c.z;

        const localX = cos * dx - sin * dz;
        const localZ = sin * dx + cos * dz;

        const halfW = c.width / 2;
        const halfD = c.depth / 2;

        const closestX = Math.max(-halfW, Math.min(halfW, localX));
        const closestZ = Math.max(-halfD, Math.min(halfD, localZ));

        const diffX = localX - closestX;
        const diffZ = localZ - closestZ;
        const distSq = diffX * diffX + diffZ * diffZ;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          let pushX = 0;
          let pushZ = 0;

          if (dist > 0.0001) {
            const overlap = radius - dist;
            pushX = (diffX / dist) * overlap;
            pushZ = (diffZ / dist) * overlap;
          } else {
            const penX = halfW - Math.abs(localX) + radius;
            const penZ = halfD - Math.abs(localZ) + radius;
            if (penX < penZ) {
              pushX = (localX >= 0 ? 1 : -1) * penX;
            } else {
              pushZ = (localZ >= 0 ? 1 : -1) * penZ;
            }
          }

          const cosBack = Math.cos(c.rotation);
          const sinBack = Math.sin(c.rotation);

          resolvedX += cosBack * pushX - sinBack * pushZ;
          resolvedZ += sinBack * pushX + cosBack * pushZ;
        }
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  resolvePosition(pos, radius = 0.40) {
    const res = this.resolveCollision(pos.x, pos.z, radius);
    pos.x = res.x;
    pos.z = res.z;
    return pos;
  }

  toggleDebug(enabled) {
    this.debugMode = enabled !== undefined ? enabled : !this.debugMode;
    this.refreshDebugMeshes();
    return this.debugMode;
  }

  refreshDebugMeshes() {
    this.debugMeshes.forEach(m => this.scene.remove(m));
    this.debugMeshes = [];

    if (this.debugMode) {
      const matBox = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.85
      });

      this.colliders.forEach(c => {
        if (c.type === 'box') {
          const geo = new THREE.BoxGeometry(c.width, 2.2, c.depth);
          const mesh = new THREE.Mesh(geo, matBox);
          mesh.position.set(c.x, 1.1, c.z);
          mesh.rotation.y = c.rotation || 0;
          this.scene.add(mesh);
          this.debugMeshes.push(mesh);
        }
      });
    }
  }

  updateDebug(player) {
    if (!this.debugMode || !player) return;
    if (!this.playerDebugMesh) {
      const geo = new THREE.CylinderGeometry(0.40, 0.40, 1.8, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x30d158, wireframe: true, depthTest: false });
      this.playerDebugMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.playerDebugMesh);
    }
    this.playerDebugMesh.position.set(player.position.x, player.position.y + 0.9, player.position.z);
  }
}
