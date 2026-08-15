import * as THREE from 'three';

export class ColliderRegistry {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.debugMode = false;
    this.debugMeshes = [];
    this.playerDebugMesh = null;
  }

  addCircle(x, z, radius, id = null) {
    this.colliders.push({ type: 'circle', x, z, radius, id: id || `circle_${Date.now()}_${Math.random()}` });
  }

  addBox(x, z, width, depth, rotation = 0, id = null) {
    const colliderId = id || `box_${this.colliders.length}_${Math.random().toString(36).substr(2, 4)}`;
    this.colliders.push({
      type: 'box',
      id: colliderId,
      x,
      z,
      width,
      depth,
      rotation
    });
    return colliderId;
  }

  addBoxCollider(config) {
    const id = config.id || `box_${this.colliders.length}`;
    let x = config.x;
    let z = config.z;
    let width = config.width;
    let depth = config.depth;
    let rotation = config.rotation || 0;

    if (config.center) {
      x = config.center.x;
      z = config.center.z;
    }
    if (config.size) {
      width = config.size.x;
      depth = config.size.z;
    }

    this.colliders.push({
      type: 'box',
      id,
      x,
      z,
      width,
      depth,
      rotation
    });
    return id;
  }

  remove(id) {
    const prevCount = this.colliders.length;
    this.colliders = this.colliders.filter(c => c.id !== id);
    if (this.debugMode && prevCount !== this.colliders.length) {
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
        if (node.name.startsWith('COL_BOX_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          euler.setFromQuaternion(quat, 'YXZ');
          
          const width = scale.x;
          const depth = scale.z;
          
          this.addBox(vec.x, vec.z, width, depth, euler.y, node.name);
          node.visible = false;
        } else if (node.name.startsWith('COL_CIRCLE_')) {
          node.matrixWorld.decompose(vec, quat, scale);
          const radius = Math.max(scale.x, scale.z) / 2;
          this.addCircle(vec.x, vec.z, radius, node.name);
          node.visible = false;
        }
      });
    });
  }

  toggleDebug(enabled, player) {
    this.debugMode = enabled !== undefined ? enabled : !this.debugMode;
    this.refreshDebugMeshes();
    return this.debugMode;
  }

  refreshDebugMeshes() {
    this.debugMeshes.forEach(m => this.scene.remove(m));
    this.debugMeshes = [];
    if (this.playerDebugMesh) {
      this.scene.remove(this.playerDebugMesh);
      this.playerDebugMesh = null;
    }

    if (this.debugMode) {
      const matBox = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });
      const matCircle = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });

      this.colliders.forEach(c => {
        if (c.type === 'box') {
          const geo = new THREE.BoxGeometry(c.width, 2.0, c.depth);
          const mesh = new THREE.Mesh(geo, matBox);
          mesh.position.set(c.x, 1.0, c.z);
          mesh.rotation.y = c.rotation || 0;
          this.scene.add(mesh);
          this.debugMeshes.push(mesh);
        } else if (c.type === 'circle') {
          const geo = new THREE.CylinderGeometry(c.radius, c.radius, 2.0, 16);
          const mesh = new THREE.Mesh(geo, matCircle);
          mesh.position.set(c.x, 1.0, c.z);
          this.scene.add(mesh);
          this.debugMeshes.push(mesh);
        }
      });
    }
  }

  resolvePosition(pos, radius = 0.45) {
    const res = this.resolveCollision(pos.x, pos.z, radius);
    pos.x = res.x;
    pos.z = res.z;
    return pos;
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
        // Transform player position to box local space
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
            // Center is inside box: push along shortest penetration axis
            const penX = halfW - Math.abs(localX) + radius;
            const penZ = halfD - Math.abs(localZ) + radius;
            if (penX < penZ) {
              pushX = (localX >= 0 ? 1 : -1) * penX;
            } else {
              pushZ = (localZ >= 0 ? 1 : -1) * penZ;
            }
          }

          // Transform back to world space
          const cosBack = Math.cos(c.rotation);
          const sinBack = Math.sin(c.rotation);

          resolvedX += cosBack * pushX - sinBack * pushZ;
          resolvedZ += sinBack * pushX + cosBack * pushZ;
        }
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  updateDebug(player) {
    if (!this.debugMode || !player) return;

    if (!this.playerDebugMesh) {
      const geo = new THREE.CylinderGeometry(0.45, 0.45, 1.8, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x30d158,
        wireframe: true,
        depthTest: false
      });
      this.playerDebugMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.playerDebugMesh);
    }
    this.playerDebugMesh.position.set(player.position.x, player.position.y + 0.9, player.position.z);
  }
}
