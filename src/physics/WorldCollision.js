import * as THREE from 'three';

export class WorldCollision {
  constructor() {
    this.colliders = [];
  }

  addCircle(x, z, radius) {
    this.colliders.push({ type: 'circle', x, z, radius });
  }

  addBox(x, z, width, depth, rotation = 0) {
    // Basic OBB (Oriented Bounding Box) for XZ plane
    this.colliders.push({
      type: 'box',
      x,
      z,
      width,
      depth,
      rotation
    });
  }

  resolvePosition(pos, radius = 0.5) {
    // Iterative resolution for simple character controller
    // pos is a THREE.Vector3
    
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
          
          if (distSq < minD * minD && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const push = minD - dist;
            resolvedX += (dx / dist) * push;
            resolvedZ += (dz / dist) * push;
          }
        } else if (col.type === 'box') {
          // Translate point to box local space
          const dx = resolvedX - col.x;
          const dz = resolvedZ - col.z;
          
          const cos = Math.cos(-col.rotation);
          const sin = Math.sin(-col.rotation);
          
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          
          const hw = col.width / 2;
          const hd = col.depth / 2;
          
          // Closest point on AABB
          const closestX = Math.max(-hw, Math.min(hw, localX));
          const closestZ = Math.max(-hd, Math.min(hd, localZ));
          
          // Distance from closest point to circle center
          const cdx = localX - closestX;
          const cdz = localZ - closestZ;
          const distSq = cdx * cdx + cdz * cdz;
          
          if (distSq < radius * radius) {
            // Collision!
            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const push = radius - dist;
              
              // Push vector in local space
              const pushLocalX = (cdx / dist) * push;
              const pushLocalZ = (cdz / dist) * push;
              
              // Transform push vector back to world space
              const pushCos = Math.cos(col.rotation);
              const pushSin = Math.sin(col.rotation);
              
              resolvedX += pushLocalX * pushCos - pushLocalZ * pushSin;
              resolvedZ += pushLocalX * pushSin + pushLocalZ * pushCos;
            } else {
              // Deep inside, push out based on closest edge
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
