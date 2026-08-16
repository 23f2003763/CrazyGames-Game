import * as THREE from 'three';

/**
 * InteriorRevealSystem: 2-tier approach & interior reveal with smooth opacity transitions.
 * Approach zone (near doorway): roof opacity -> 0.35
 * Interior zone (inside): roof opacity -> 0.02, camera wall opacity -> 0.12
 */
export class InteriorRevealSystem {
  constructor() {
    this.buildings = [];
  }

  registerBuilding(config) {
    // config: { id, rootGroup, triggerBox: Box3, approachBox: Box3 }
    const roofMeshes = [];
    const wallMeshes = [];

    config.rootGroup.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        if (name.includes('roof') || child.parent?.name?.includes('ROOF_FADE')) {
          const mat = child.material.clone();
          mat.transparent = true;
          child.material = mat;
          roofMeshes.push(child);
        } else if (name.includes('wall_fade') || child.parent?.name?.includes('WALL_FADE')) {
          const mat = child.material.clone();
          mat.transparent = true;
          child.material = mat;
          wallMeshes.push(child);
        }
      }
    });

    this.buildings.push({
      id: config.id,
      root: config.rootGroup,
      triggerBox: config.triggerBox,
      approachBox: config.approachBox || config.triggerBox,
      roofMeshes,
      wallMeshes,
      currentRoofAlpha: 1.0,
      targetRoofAlpha: 1.0,
      currentWallAlpha: 1.0,
      targetWallAlpha: 1.0
    });
  }

  update(dt, playerPos) {
    if (!playerPos) return;

    for (const b of this.buildings) {
      const isInside = b.triggerBox.containsPoint(playerPos);
      const isApproaching = b.approachBox.containsPoint(playerPos);

      if (isInside) {
        b.targetRoofAlpha = 0.02;
        b.targetWallAlpha = 0.12;
      } else if (isApproaching) {
        b.targetRoofAlpha = 0.35;
        b.targetWallAlpha = 0.60;
      } else {
        b.targetRoofAlpha = 1.0;
        b.targetWallAlpha = 1.0;
      }

      // Smooth interpolation
      b.currentRoofAlpha = THREE.MathUtils.lerp(b.currentRoofAlpha, b.targetRoofAlpha, dt * 10.0);
      b.currentWallAlpha = THREE.MathUtils.lerp(b.currentWallAlpha, b.targetWallAlpha, dt * 10.0);

      b.roofMeshes.forEach((mesh) => {
        mesh.material.opacity = b.currentRoofAlpha;
        mesh.material.depthWrite = b.currentRoofAlpha > 0.85;
        mesh.visible = b.currentRoofAlpha > 0.03;
      });

      b.wallMeshes.forEach((mesh) => {
        mesh.material.opacity = b.currentWallAlpha;
        mesh.material.depthWrite = b.currentWallAlpha > 0.85;
        mesh.visible = b.currentWallAlpha > 0.03;
      });
    }
  }
}
