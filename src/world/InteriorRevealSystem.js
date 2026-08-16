import * as THREE from 'three';

/**
 * InteriorRevealSystem: Seamless Zomboid-style roof and camera-wall fade
 * for accessible building interiors.
 */
export class InteriorRevealSystem {
  constructor() {
    this.buildings = [];
  }

  registerBuilding(config) {
    // config: { id, rootGroup, triggerBox: Box3 }
    const fadeMeshes = [];
    const originalMaterials = new Map();

    config.rootGroup.traverse((child) => {
      if (child.name.includes('ROOF_FADE') || child.name.includes('WALL_FADE') || child.name.includes('Roof') || child.name.includes('Wall_Fade')) {
        if (child.isMesh) {
          // Clone material for independent opacity control
          const mat = child.material.clone();
          mat.transparent = true;
          child.material = mat;
          fadeMeshes.push(child);
          originalMaterials.set(child.uuid, mat);
        }
      }
    });

    this.buildings.push({
      id: config.id,
      root: config.rootGroup,
      triggerBox: config.triggerBox,
      fadeMeshes,
      currentAlpha: 1.0,
      targetAlpha: 1.0
    });
  }

  update(dt, playerPos) {
    if (!playerPos) return;

    for (const b of this.buildings) {
      // Check if player is inside the building trigger box
      const isInside = b.triggerBox.containsPoint(playerPos);
      b.targetAlpha = isInside ? 0.0 : 1.0;

      // Smooth opacity interpolation
      if (Math.abs(b.currentAlpha - b.targetAlpha) > 0.01) {
        b.currentAlpha = THREE.MathUtils.lerp(b.currentAlpha, b.targetAlpha, dt * 8.0);

        b.fadeMeshes.forEach((mesh) => {
          mesh.material.opacity = b.currentAlpha;
          mesh.material.depthWrite = b.currentAlpha > 0.85;
          mesh.visible = b.currentAlpha > 0.02;
        });
      }
    }
  }
}
