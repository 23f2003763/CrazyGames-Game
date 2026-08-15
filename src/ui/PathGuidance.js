import * as THREE from 'three';
import { campaignPath } from '../campaign/CampaignPath.js';

/**
 * PathGuidance: Dynamic Arc Trace guidance system that places 4-6 subtle cyan footprint
 * markers along the curved CampaignPath ahead of the player, plus an off-screen edge arrow.
 */
export class PathGuidance {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.group = new THREE.Group();
    this.group.name = 'PathGuidance_Group';
    this.scene.add(this.group);

    this.currentTargetPos = null;
    this.markers = [];
    this.markerCount = 5;
    this.elapsedTime = 0;

    this.createMarkers();
    this.createEdgeIndicator();
  }

  createMarkers() {
    const geo = new THREE.RingGeometry(0.14, 0.28, 16);
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

  createEdgeIndicator() {
    this.edgeEl = document.createElement('div');
    this.edgeEl.id = 'objective-edge-arrow';
    this.edgeEl.style.position = 'absolute';
    this.edgeEl.style.display = 'none';
    this.edgeEl.style.padding = '4px 10px';
    this.edgeEl.style.background = 'rgba(10, 16, 22, 0.92)';
    this.edgeEl.style.border = '1px solid #00f0ff';
    this.edgeEl.style.borderRadius = '4px';
    this.edgeEl.style.color = '#00f0ff';
    this.edgeEl.style.fontFamily = 'monospace';
    this.edgeEl.style.fontSize = '12px';
    this.edgeEl.style.fontWeight = 'bold';
    this.edgeEl.style.pointerEvents = 'none';
    this.edgeEl.style.zIndex = '3200';
    this.edgeEl.style.transform = 'translate(-50%, -50%)';
    this.edgeEl.innerHTML = '<span id="edge-sym">▲</span> <span id="edge-metres">40m</span>';
    document.body.appendChild(this.edgeEl);

    this.distTextEl = this.edgeEl.querySelector('#edge-metres');
  }

  setObjective(objective) {
    if (!objective || !objective.targetPos) {
      this.currentTargetPos = null;
      this.markers.forEach(m => m.visible = false);
      this.edgeEl.style.display = 'none';
      return;
    }

    this.currentTargetPos = objective.targetPos.clone();
  }

  update(dt, playerPos) {
    this.elapsedTime += dt;
    if (!this.currentTargetPos || !playerPos) {
      this.markers.forEach(m => m.visible = false);
      this.edgeEl.style.display = 'none';
      return;
    }

    const distToTarget = playerPos.distanceTo(this.currentTargetPos);

    // 1. Arc Trace footprint markers along curved CampaignPath
    if (distToTarget > 4.5) {
      const currentT = campaignPath.getClosestProgress(playerPos);
      const targetT = campaignPath.getClosestProgress(this.currentTargetPos);
      const pathDiffT = Math.max(0, targetT - currentT);

      for (let i = 0; i < this.markerCount; i++) {
        const marker = this.markers[i];
        const aheadDist = 3.5 + i * 3.8;
        const deltaT = aheadDist / Math.max(1, campaignPath.totalLength);

        if (deltaT <= pathDiffT + 0.05) {
          const sampleT = THREE.MathUtils.clamp(currentT + deltaT, 0, 1);
          const worldPos = campaignPath.getWorldPointAt(sampleT);
          marker.position.set(worldPos.x, 0.05, worldPos.z);
          marker.visible = true;

          const pulse = (Math.sin(this.elapsedTime * 4.5 - i * 0.7) + 1.0) * 0.5;
          marker.material.opacity = 0.2 + pulse * 0.6;
        } else {
          marker.visible = false;
        }
      }
    } else {
      this.markers.forEach(m => m.visible = false);
    }

    // 2. Offscreen Edge Directional Arrow
    if (this.camera && distToTarget > 15.0) {
      const screenPos = this.currentTargetPos.clone().project(this.camera);
      const isOffscreen = screenPos.z > 1 || Math.abs(screenPos.x) > 0.88 || Math.abs(screenPos.y) > 0.88;

      if (isOffscreen) {
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.5;
        const clampedX = Math.max(45, Math.min(window.innerWidth - 45, cx + screenPos.x * cx * 0.88));
        const clampedY = Math.max(45, Math.min(window.innerHeight - 45, cy - screenPos.y * cy * 0.88));

        this.edgeEl.style.left = `${clampedX}px`;
        this.edgeEl.style.top = `${clampedY}px`;
        this.distTextEl.textContent = `${Math.round(distToTarget)}m`;
        this.edgeEl.style.display = 'block';
      } else {
        this.edgeEl.style.display = 'none';
      }
    } else {
      this.edgeEl.style.display = 'none';
    }
  }
}
