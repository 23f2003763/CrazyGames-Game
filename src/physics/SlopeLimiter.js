import * as THREE from 'three';

/**
 * SlopeLimiter: Enforces realistic steepness traversal limits.
 * 
 * Rules:
 * - 0 to 28 degrees: Normal traversal (100% speed)
 * - 28 to 35 degrees: Steep scramble (50% speed)
 * - > 38 degrees: Hard blockage (movement rejected)
 */
export class SlopeLimiter {
  constructor(sampleHeightFn) {
    this.sampleHeight = sampleHeightFn;
    this.maxWalkableAngleDeg = 38.0;
    this.steepThresholdDeg = 28.0;
  }

  /**
   * Evaluates terrain normal at (x, z) using central differences.
   */
  sampleNormal(x, z, eps = 0.4) {
    const hL = this.sampleHeight(x - eps, z);
    const hR = this.sampleHeight(x + eps, z);
    const hD = this.sampleHeight(x, z - eps);
    const hU = this.sampleHeight(x, z + eps);

    const normal = new THREE.Vector3(
      (hL - hR) / (2 * eps),
      1.0,
      (hD - hU) / (2 * eps)
    ).normalize();

    return normal;
  }

  /**
   * Calculates slope angle in degrees from the vertical Up vector (0, 1, 0).
   */
  getSlopeAngle(normal) {
    const dot = THREE.MathUtils.clamp(normal.y, -1.0, 1.0);
    const angleRad = Math.acos(dot);
    return THREE.MathUtils.radToDeg(angleRad);
  }

  /**
   * Filters candidate movement velocity against the slope steepness.
   * Returns { allowedVelocity, speedMultiplier, isBlocked }
   */
  filterMovement(currentPos, candidateVelocity, dt) {
    if (candidateVelocity.lengthSq() < 0.0001) {
      return { allowedVelocity: candidateVelocity, speedMultiplier: 1.0, isBlocked: false };
    }

    const nextX = currentPos.x + candidateVelocity.x * dt;
    const nextZ = currentPos.z + candidateVelocity.z * dt;

    const normal = this.sampleNormal(nextX, nextZ);
    const slopeAngle = this.getSlopeAngle(normal);

    // Direction of intended movement
    const moveDir = candidateVelocity.clone().normalize();
    
    // Normal horizontal slope gradient (points downhill)
    const downhillGrad = new THREE.Vector3(normal.x, 0, normal.z);

    // If moving UPHILL (opposing downhill gradient)
    const isMovingUphill = moveDir.dot(downhillGrad) < -0.05;

    if (slopeAngle > this.maxWalkableAngleDeg && isMovingUphill) {
      // Hard blockage: project velocity parallel to the cliff edge
      const slideDir = new THREE.Vector3(-normal.z, 0, normal.x).normalize();
      const dotSlide = candidateVelocity.dot(slideDir);
      const deflectedVel = slideDir.multiplyScalar(dotSlide * 0.4);
      return {
        allowedVelocity: deflectedVel,
        speedMultiplier: 0.0,
        isBlocked: true
      };
    }

    if (slopeAngle > this.steepThresholdDeg && isMovingUphill) {
      // Steep scramble: slow down proportionally
      const t = (slopeAngle - this.steepThresholdDeg) / (this.maxWalkableAngleDeg - this.steepThresholdDeg);
      const speedMult = THREE.MathUtils.lerp(1.0, 0.4, THREE.MathUtils.clamp(t, 0, 1));
      return {
        allowedVelocity: candidateVelocity.clone().multiplyScalar(speedMult),
        speedMultiplier: speedMult,
        isBlocked: false
      };
    }

    return { allowedVelocity: candidateVelocity, speedMultiplier: 1.0, isBlocked: false };
  }
}
