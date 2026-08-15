import * as THREE from 'three';

/**
 * ObjectiveGuidance: Subtle Arc energy objective glyph, Arc Trace footprint pulses,
 * and offscreen edge directional indicators.
 */
export class ObjectiveGuidance {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'ObjectiveGuidance_Group';
    this.scene.add(this.group);

    this.currentTargetPos = null;
    this.elapsedTime = 0;

    this.createGlyph();
    this.createArcTraceFragments();
    this.createEdgeIndicator();
  }

  createGlyph() {
    // Small circuit-diamond glyph
    const geo = new THREE.OctahedronGeometry(0.24, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.8
    });
    this.glyphMesh = new THREE.Mesh(geo, mat);
    this.glyphMesh.visible = false;
    this.group.add(this.glyphMesh);
  }

  createArcTraceFragments() {
    this.traceGroup = new THREE.Group();
    this.traceFragments = [];

    const geo = new THREE.RingGeometry(0.12, 0.26, 12);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(0, 0.05, 0);
      mesh.visible = false;
      this.traceGroup.add(mesh);
      this.traceFragments.push(mesh);
    }
    this.group.add(this.traceGroup);
  }

  createEdgeIndicator() {
    this.edgeEl = document.createElement('div');
    this.edgeEl.id = 'objective-edge-pointer';
    this.edgeEl.style.position = 'absolute';
    this.edgeEl.style.display = 'none';
    this.edgeEl.style.padding = '4px 10px';
    this.edgeEl.style.background = 'rgba(10, 16, 22, 0.92)';
    this.edgeEl.style.border = '1px solid #00f0ff';
    this.edgeEl.style.borderRadius = '4px';
    this.edgeEl.style.color = '#00f0ff';
    this.edgeEl.style.fontFamily = 'monospace';
    this.edgeEl.style.fontSize = '11px';
    this.edgeEl.style.fontWeight = 'bold';
    this.edgeEl.style.pointerEvents = 'none';
    this.edgeEl.style.zIndex = '3200';
    this.edgeEl.style.transform = 'translate(-50%, -50%)';
    this.edgeEl.innerHTML = '<span id="edge-arrow">▲</span> <span id="edge-dist">45m</span>';
    document.body.appendChild(this.edgeEl);

    this.arrowEl = this.edgeEl.querySelector('#edge-arrow');
    this.distEl = this.edgeEl.querySelector('#edge-dist');
  }

  setObjective(objective) {
    if (!objective || !objective.targetPos) {
      this.currentTargetPos = null;
      this.glyphMesh.visible = false;
      this.traceFragments.forEach(t => t.visible = false);
      this.edgeEl.style.display = 'none';
      return;
    }

    this.currentTargetPos = objective.targetPos.clone();
    this.glyphMesh.visible = true;
    this.glyphMesh.position.copy(this.currentTargetPos);
    this.glyphMesh.position.y += 2.1;
  }

  update(dt, playerPos) {
    this.elapsedTime += dt;

    if (!this.currentTargetPos || !playerPos) return;

    // 1. Rotate & bob the small objective diamond glyph
    if (this.glyphMesh.visible) {
      this.glyphMesh.rotation.y += dt * 2.8;
      this.glyphMesh.position.y = this.currentTargetPos.y + 2.1 + Math.sin(this.elapsedTime * 3.5) * 0.12;
    }

    const toTarget = new THREE.Vector3().subVectors(this.currentTargetPos, playerPos);
    toTarget.y = 0;
    const distance = toTarget.length();
    toTarget.normalize();

    // 2. Arc Trace Fragments ahead of player
    const showTrace = distance > 4.0;
    this.traceFragments.forEach((frag, idx) => {
      if (showTrace) {
        const offset = 3.2 + idx * 3.5;
        if (offset < distance) {
          const pt = playerPos.clone().addScaledVector(toTarget, offset);
          frag.position.set(pt.x, 0.05, pt.z);
          frag.visible = true;
          // Pulse opacity
          const pulse = (Math.sin(this.elapsedTime * 4.0 - idx * 0.7) + 1.0) * 0.5;
          frag.material.opacity = 0.15 + pulse * 0.55;
        } else {
          frag.visible = false;
        }
      } else {
        frag.visible = false;
      }
    });

    // 3. Screen Edge Indicator when objective is off-screen
    if (this.camera && distance > 22.0) {
      const screenPos = this.currentTargetPos.clone().project(this.camera);
      const isOffscreen = screenPos.z > 1 || Math.abs(screenPos.x) > 0.88 || Math.abs(screenPos.y) > 0.88;

      if (isOffscreen) {
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.5;
        const clampedX = Math.max(40, Math.min(window.innerWidth - 40, cx + screenPos.x * cx * 0.88));
        const clampedY = Math.max(40, Math.min(window.innerHeight - 40, cy - screenPos.y * cy * 0.88));

        this.edgeEl.style.left = `${clampedX}px`;
        this.edgeEl.style.top = `${clampedY}px`;
        this.distEl.textContent = `${Math.round(distance)}m`;
        this.edgeEl.style.display = 'block';
      } else {
        this.edgeEl.style.display = 'none';
      }
    } else {
      this.edgeEl.style.display = 'none';
    }
  }
}
