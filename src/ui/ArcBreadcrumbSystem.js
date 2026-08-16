import * as THREE from 'three';
import { campaignPath } from '../campaign/CampaignPath.js';

/**
 * ArcBreadcrumbSystem: Narrow chevron shards of cyan Arc energy embedded in the muddy
 * trail, oriented along the actual CampaignPath tangent with traveling electrical pulses.
 */
export class ArcBreadcrumbSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ArcBreadcrumb_Group';
    this.scene.add(this.group);

    this.currentTargetPos = null;
    this.markerCount = 4;
    this.markers = [];
    this.elapsedTime = 0;

    this.createMarkers();
  }

  createMarkers() {
    // Narrow chevron shard geometry
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.45);
    shape.lineTo(0.22, 0.0);
    shape.lineTo(0.12, -0.25);
    shape.lineTo(0, -0.05);
    shape.lineTo(-0.12, -0.25);
    shape.lineTo(-0.22, 0.0);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for (let i = 0; i < this.markerCount; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.markers.push(mesh);
    }
  }

  setObjective(objective) {
    if (!objective || !objective.targetPos) {
      this.currentTargetPos = null;
      this.markers.forEach(m => m.visible = false);
      return;
    }
    this.currentTargetPos = objective.targetPos.clone();
  }

  update(dt, playerPos) {
    this.elapsedTime += dt;
    if (!this.currentTargetPos || !playerPos) {
      this.markers.forEach(m => m.visible = false);
      return;
    }

    const distToTarget = playerPos.distanceTo(this.currentTargetPos);

    if (distToTarget > 4.5) {
      const currentT = campaignPath.getClosestProgress(playerPos);
      const targetT = campaignPath.getClosestProgress(this.currentTargetPos);
      const pathDiffT = Math.max(0, targetT - currentT);

      for (let i = 0; i < this.markerCount; i++) {
        const marker = this.markers[i];
        const aheadDist = 3.2 + i * 3.8;
        const deltaT = aheadDist / Math.max(1, campaignPath.totalLength);

        if (deltaT <= pathDiffT + 0.05) {
          const sampleT = THREE.MathUtils.clamp(currentT + deltaT, 0, 1);
          const worldPos = campaignPath.getWorldPointAt(sampleT);
          const tangent = campaignPath.getWorldTangentAt(sampleT);

          marker.position.set(worldPos.x, 0.05, worldPos.z);
          // Orient chevron along forward path tangent
          marker.rotation.y = Math.atan2(-tangent.x, -tangent.z);
          marker.visible = true;

          const pulse = (Math.sin(this.elapsedTime * 5.0 - i * 0.8) + 1.0) * 0.5;
          marker.material.opacity = 0.25 + pulse * 0.65;
        } else {
          marker.visible = false;
        }
      }
    } else {
      this.markers.forEach(m => m.visible = false);
    }
  }
}
