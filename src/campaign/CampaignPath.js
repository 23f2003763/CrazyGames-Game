import * as THREE from 'three';
import { campaignFrame } from './CampaignFrame.js';

export const CAMPAIGN_PATH_LOCAL_POINTS = [
  new THREE.Vector3( 0, 0, -10),
  new THREE.Vector3( 0, 0,   8),
  new THREE.Vector3(-1, 0,  26),
  new THREE.Vector3( 2, 0,  43),
  new THREE.Vector3( 0, 0,  58),
  new THREE.Vector3(-4, 0,  75),
  new THREE.Vector3(-2, 0,  93),
  new THREE.Vector3( 3, 0, 110),
  new THREE.Vector3( 1, 0, 128),
  new THREE.Vector3(-3, 0, 145),
];

/**
 * CampaignPath: The ONE authoritative progression curve for the campaign level.
 * Directs trail ribbon, fence bounds, forest placement, and navigation guidance.
 */
export class CampaignPath {
  constructor() {
    this.spline = new THREE.CatmullRomCurve3(CAMPAIGN_PATH_LOCAL_POINTS, false, 'centripetal', 0.25);
    this.totalLength = this.spline.getLength();
  }

  getPointAt(t) {
    return this.spline.getPoint(THREE.MathUtils.clamp(t, 0, 1));
  }

  getTangentAt(t) {
    return this.spline.getTangent(THREE.MathUtils.clamp(t, 0, 1)).normalize();
  }

  getWorldPointAt(t) {
    const localPt = this.getPointAt(t);
    return campaignFrame.toWorld(localPt.x, localPt.z, localPt.y || 0);
  }

  getWorldTangentAt(t) {
    const localTan = this.getTangentAt(t);
    const wTan = new THREE.Vector3();
    wTan.addScaledVector(campaignFrame.rightDir, localTan.x);
    wTan.addScaledVector(campaignFrame.forwardDir, localTan.z);
    return wTan.normalize();
  }

  getClosestProgress(worldPos) {
    const local = campaignFrame.toLocal(worldPos);
    const samples = 100;
    let bestDistSq = Infinity;
    let bestT = 0;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.spline.getPoint(t);
      const dSq = (pt.x - local.x) * (pt.x - local.x) + (pt.z - local.z) * (pt.z - local.z);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestT = t;
      }
    }
    return bestT;
  }

  getPointAhead(worldPos, forwardDistance) {
    const currentT = this.getClosestProgress(worldPos);
    const deltaT = forwardDistance / Math.max(1, this.totalLength);
    const targetT = THREE.MathUtils.clamp(currentT + deltaT, 0, 1);
    return this.getWorldPointAt(targetT);
  }
}

export const campaignPath = new CampaignPath();
