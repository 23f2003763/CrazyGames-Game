import * as THREE from 'three';

/**
 * ColliderRegistry: lightweight XZ collision registry with swept/sub-stepped movement.
 *
 * IMPORTANT: addBox supports BOTH call styles used across the project:
 *   addBox(x, z, width, depth, rotation?, id?)
 *   addBox(id, positionVector3, sizeVector3, rotation?)
 *
 * This compatibility matters because the authored Level 1 V2 systems use the second
 * style while older systems use the first. Previously the V2 calls were being parsed
 * as strings/vectors in numeric fields, which effectively disabled most collisions.
 */
export class ColliderRegistry {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.collidersById = new Map();
    this.debugMode = false;
    this.debugMeshes = [];
    this.playerDebugMesh = null;
    this.collisionEnabled = true;
  }

  addCircle(x, z, radius, id = null) {
    const colliderId = id || `circle_${this.colliders.length}`;
    const col = { type: 'circle', id: colliderId, x, z, radius };
    this.colliders.push(col);
    this.collidersById.set(colliderId, col);
    return colliderId;
  }

  addBox(a, b, c, d = 0, e = 0, f = null) {
    let x;
    let z;
    let width;
    let depth;
    let rotation;
    let colliderId;

    // Authored-object style: addBox(id, Vector3 position, Vector3 size, rotation)
    if (typeof a === 'string' && b && b.isVector3 && c && c.isVector3) {
      colliderId = a;
      x = b.x;
      z = b.z;
      width = Math.max(0.001, Math.abs(c.x));
      depth = Math.max(0.001, Math.abs(c.z));
      rotation = Number.isFinite(d) ? d : 0;
    } else {
      // Legacy/numeric style: addBox(x, z, width, depth, rotation?, id?)
      x = Number(a);
      z = Number(b);
      width = Math.max(0.001, Math.abs(Number(c)));
      depth = Math.max(0.001, Math.abs(Number(d)));
      rotation = Number.isFinite(e) ? e : 0;
      colliderId = f || `box_${this.colliders.length}`;
    }

    if (![x, z, width, depth, rotation].every(Number.isFinite)) {
      console.error('[ColliderRegistry] Refused invalid box collider:', { a, b, c, d, e, f });
      return null;
    }

    // Re-registering the same authored id should replace the stale copy rather than
    // silently stacking duplicate blockers.
    if (this.collidersById.has(colliderId)) {
      this.remove(colliderId);
    }

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

    const width = Math.abs((localSize.x || 1.0) * worldScale.x);
    const depth = Math.abs((localSize.z || localSize.y || 1.0) * worldScale.z);

    return this.addBox(worldPos.x, worldPos.z, width, depth, euler.y, id || object3D.name);
  }

  has(id) {
    return this.collidersById.has(id);
  }

  remove(id) {
    if (!this.collidersById.has(id)) return;
    this.collidersById.delete(id);
    this.colliders = this.colliders.filter(c => c.id !== id);
    if (this.debugMode) this.refreshDebugMeshes();
  }

  buildFromRoots(roots) {
    if (!roots) return;

    Object.values(roots).forEach(root => {
      if (!root?.traverse) return;
      root.updateMatrixWorld(true);

      root.traverse(node => {
        if (!node.name) return;

        if (node.name.startsWith('COL_BOX_') || node.name.startsWith('COL_WALL_') || node.name.startsWith('COL_PROP_')) {
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          const euler = new THREE.Euler();
          node.matrixWorld.decompose(pos, quat, scale);
          euler.setFromQuaternion(quat, 'YXZ');

          // Blender Empty scale is treated as the authored FULL XZ footprint.
          this.addBox(pos.x, pos.z, Math.abs(scale.x), Math.abs(scale.z), euler.y, node.name);
          node.visible = false;
        } else if (node.name.startsWith('COL_CIRCLE_')) {
          const pos = new THREE.Vector3();
          const scale = new THREE.Vector3();
          node.getWorldPosition(pos);
          node.getWorldScale(scale);
          const radius = Math.max(Math.abs(scale.x), Math.abs(scale.z)) * 0.5;
          this.addCircle(pos.x, pos.z, radius, node.name);
          node.visible = false;
        }
      });
    });
  }

  moveCharacter(position, displacement, radius = 0.40) {
    if (!this.collisionEnabled) {
      position.x += displacement.x;
      position.z += displacement.z;
      return { blockedX: false, blockedZ: false, actualDisplacement: displacement.clone() };
    }

    const startX = position.x;
    const startZ = position.z;
    const maxStep = 0.08;
    const dist = Math.hypot(displacement.x, displacement.z);
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    const stepX = displacement.x / steps;
    const stepZ = displacement.z / steps;

    let blockedX = false;
    let blockedZ = false;

    for (let s = 0; s < steps; s++) {
      const beforeX = position.x;
      position.x += stepX;
      const resX = this.resolveCollision(position.x, position.z, radius);
      position.x = resX.x;
      position.z = resX.z;
      if (Math.abs(position.x - (beforeX + stepX)) > 0.0001) blockedX = true;

      const beforeZ = position.z;
      position.z += stepZ;
      const resZ = this.resolveCollision(position.x, position.z, radius);
      position.x = resZ.x;
      position.z = resZ.z;
      if (Math.abs(position.z - (beforeZ + stepZ)) > 0.0001) blockedZ = true;
    }

    return {
      blockedX,
      blockedZ,
      actualDisplacement: new THREE.Vector3(position.x - startX, 0, position.z - startZ)
    };
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
        const halfW = c.width * 0.5;
        const halfD = c.depth * 0.5;

        const closestX = THREE.MathUtils.clamp(localX, -halfW, halfW);
        const closestZ = THREE.MathUtils.clamp(localZ, -halfD, halfD);
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
            if (penX < penZ) pushX = (localX >= 0 ? 1 : -1) * penX;
            else pushZ = (localZ >= 0 ? 1 : -1) * penZ;
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

    if (!this.debugMode) return;

    const matBox = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });

    this.colliders.forEach(c => {
      if (c.type !== 'box') return;
      const geo = new THREE.BoxGeometry(c.width, 2.2, c.depth);
      const mesh = new THREE.Mesh(geo, matBox);
      mesh.position.set(c.x, 1.1, c.z);
      mesh.rotation.y = c.rotation || 0;
      this.scene.add(mesh);
      this.debugMeshes.push(mesh);
    });
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
