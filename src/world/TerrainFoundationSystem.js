import * as THREE from 'three';

/**
 * TerrainFoundationSystem: Single source of truth for authored flat construction
 * zones beneath major locations with smooth cubic hermite blending back into procedural terrain.
 * 
 * Guarantees that buildings, ground geometry, collider boxes, and walkable raycasts
 * all agree on the exact same elevation.
 */
export class TerrainFoundationSystem {
  constructor() {
    this.foundations = [
      // 1. The Relay (Starting Survivor Hub)
      {
        id: 'relay',
        name: 'The Relay Compound',
        centerX: -95.0,
        centerZ: 70.0,
        innerRadius: 12.0,      // Fully flat courtyard & building pad
        blendRadius: 22.0,      // Smooth transition back to hills
        targetHeight: 2.50,     // Exact elevation
        shape: 'circle',
      },

      // 2. Octane Mart (Abandoned Gas Station)
      {
        id: 'gasStation',
        name: 'Octane Mart Forecourt & Store',
        centerX: -66.0,
        centerZ: -34.0,
        innerRadius: 14.0,      // Forecourt & store pad
        blendRadius: 24.0,      // Natural road & ridge slope transition
        targetHeight: 2.20,     // Exact elevation
        shape: 'circle',
      },

      // 3. The Broken Span (Bridge Abutments & Road Approaches)
      {
        id: 'brokenSpan',
        name: 'The Broken Span Approach',
        centerX: -5.0,
        centerZ: 22.0,
        innerRadius: 7.0,       // Flatten only the road deck approach
        blendRadius: 15.0,      // Keep dramatic riverbed below
        targetHeight: 0.50,     // Exact elevation of bridge road landing
        shape: 'circle',
      },

      // 4. Survivor Camp (Clearing 4)
      {
        id: 'survivorCamp',
        name: 'Survivor Encampment',
        centerX: 36.0,
        centerZ: -62.0,
        innerRadius: 10.0,      // Tent clusters & central fire pit
        blendRadius: 20.0,
        targetHeight: 2.80,     // Exact elevation
        shape: 'circle',
      },

      // 5. Outpost Omega (Military Arena)
      {
        id: 'outpostOmega',
        name: 'Outpost Omega Arena Hardstand',
        centerX: 100.0,
        centerZ: -72.0,
        innerRadius: 16.0,      // Fortified combat arena
        blendRadius: 28.0,
        targetHeight: 2.85,     // Exact elevation
        shape: 'circle',
      }
    ];

    this.debugGroup = null;
    this.debugActive = false;
  }

  getFoundation(id) {
    return this.foundations.find(f => f.id === id);
  }

  getFoundationHeight(id) {
    const f = this.getFoundation(id);
    return f ? f.targetHeight : 0.0;
  }

  /**
   * Evaluates foundation influence on a given world coordinate (x, z).
   * Returns { height, weight, targetHeight } or null if outside all blend zones.
   */
  sampleFoundation(x, z, proceduralHeight) {
    let bestWeight = 0;
    let blendedHeight = proceduralHeight;

    for (const f of this.foundations) {
      const dx = x - f.centerX;
      const dz = z - f.centerZ;
      const dist = Math.hypot(dx, dz);

      if (dist < f.blendRadius) {
        if (dist <= f.innerRadius) {
          // Inside 100% flat construction pad
          return {
            height: f.targetHeight,
            weight: 1.0,
            targetHeight: f.targetHeight,
            foundationId: f.id
          };
        } else {
          // Smoothstep Hermite curve: t in [0, 1] from inner to blend radius
          const t = (dist - f.innerRadius) / (f.blendRadius - f.innerRadius);
          const smoothWeight = 1.0 - (t * t * (3.0 - 2.0 * t)); // 1 at inner, 0 at outer
          
          if (smoothWeight > bestWeight) {
            bestWeight = smoothWeight;
            blendedHeight = THREE.MathUtils.lerp(proceduralHeight, f.targetHeight, smoothWeight);
          }
        }
      }
    }

    if (bestWeight > 0) {
      return {
        height: blendedHeight,
        weight: bestWeight,
        targetHeight: blendedHeight,
        foundationId: 'blended'
      };
    }

    return null;
  }

  /**
   * F6 Debug Overlay: visualizes foundation zones (inner flat pads in Cyan, outer blend radii in Yellow).
   */
  toggleDebug(scene) {
    if (!this.debugGroup) {
      this.debugGroup = new THREE.Group();
      this.debugGroup.name = 'Foundation_Debug_Overlay';

      const innerMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
      const blendMat = new THREE.LineBasicMaterial({ color: 0xffd200, linewidth: 1, transparent: true, opacity: 0.6 });

      for (const f of this.foundations) {
        // Inner Flat Ring
        const innerGeo = new THREE.BufferGeometry();
        const innerPts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          innerPts.push(new THREE.Vector3(
            f.centerX + Math.cos(a) * f.innerRadius,
            f.targetHeight + 0.1,
            f.centerZ + Math.sin(a) * f.innerRadius
          ));
        }
        innerGeo.setFromPoints(innerPts);
        this.debugGroup.add(new THREE.Line(innerGeo, innerMat));

        // Outer Blend Ring
        const blendGeo = new THREE.BufferGeometry();
        const blendPts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          blendPts.push(new THREE.Vector3(
            f.centerX + Math.cos(a) * f.blendRadius,
            f.targetHeight + 0.1,
            f.centerZ + Math.sin(a) * f.blendRadius
          ));
        }
        blendGeo.setFromPoints(blendPts);
        this.debugGroup.add(new THREE.Line(blendGeo, blendMat));
      }
    }

    this.debugActive = !this.debugActive;
    if (this.debugActive) {
      scene.add(this.debugGroup);
    } else {
      scene.remove(this.debugGroup);
    }
    return this.debugActive;
  }
}

// Global Singleton Instance
export const terrainFoundations = new TerrainFoundationSystem();
