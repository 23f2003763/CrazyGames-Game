import * as THREE from 'three';
import { campaignPath } from './CampaignPath.js';
import { campaignFrame } from './CampaignFrame.js';

class PlayableCorridorConstraint {
  clampPosition(worldPos) {
    // 1. Convert to local coords via campaignFrame.toLocal(worldPos)
    const localPos = campaignFrame.toLocal(worldPos);

    // 2. Get closest CampaignPath progress t via campaignPath.getClosestProgress(worldPos)
    const t = campaignPath.getClosestProgress(worldPos);

    // 3. Get the path point at that t and compute signed lateral distance
    const pathPoint = campaignPath.getPointAt(t);
    const pathTangent = campaignPath.getTangentAt(t);

    const dx = localPos.x - pathPoint.x;
    const dz = localPos.z - pathPoint.z;

    const nx = -pathTangent.z;
    const nz = pathTangent.x;

    const lateralDistance = dx * nx + dz * nz;
    const extraForward = dx * pathTangent.x + dz * pathTangent.z;

    // 4. Compute forward distance along path
    const forwardDistance = t * campaignPath.totalLength + extraForward;

    let clamped = false;
    let newLateral = lateralDistance;
    let newForward = forwardDistance;

    if (Math.abs(lateralDistance) > 18.8) {
      newLateral = Math.sign(lateralDistance) * 18.8;
      clamped = true;
    }
    if (forwardDistance < -4) {
      newForward = -4;
      clamped = true;
    }
    if (forwardDistance > 170) {
      newForward = 170;
      clamped = true;
    }

    if (clamped) {
      const adjustedExtraForward = newForward - (t * campaignPath.totalLength);
      const correctedLocalX = pathPoint.x + pathTangent.x * adjustedExtraForward + nx * newLateral;
      const correctedLocalZ = pathPoint.z + pathTangent.z * adjustedExtraForward + nz * newLateral;
      
      return campaignFrame.toWorld(correctedLocalX, correctedLocalZ, localPos.y);
    }

    return worldPos.clone();
  }
}

export const corridorConstraint = new PlayableCorridorConstraint();
