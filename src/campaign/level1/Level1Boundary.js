import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { campaignPath } from '../CampaignPath.js';

/**
 * Level1Boundary
 * ----------------
 * A readable, continuous powered perimeter for Wake Signal.
 *
 * The previous version accidentally failed to find the named tree roots and then
 * cloned the ENTIRE tree-set GLB for every forest placement. That is why enormous
 * overlapping canopies repeatedly swallowed the camera. This version only clones
 * exact named tree roots and keeps the first canopy band well behind the fence.
 */
export class Level1Boundary {
  constructor(scene, collisionRegistry, audioSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.audioSystem = audioSystem;

    this.group = new THREE.Group();
    this.group.name = 'Level1_Boundary_Root';
    this.scene.add(this.group);

    this.fenceOffset = 18.0;
    this.segmentLength = 4.0;
    this.moduleSpacing = 3.88;
    this.fenceSegments = { left: [], right: [] };
    this.colliders = { left: [], right: [] };

    this.activeArcs = [];
    this.arcTimer = 0;
    this.nextArcTime = 0.8 + Math.random() * 1.3;
    this.proximityCooldown = 0;

    this.loader = new GLTFLoader();
    this.loadModelsAndBuild();
  }

  async loadModelsAndBuild() {
    const [fenceGLTF, treeGLTF, rockGLTF] = await Promise.all([
      this.loadGLTFPromise('/models/world/electric_fence_set.glb'),
      this.loadGLTFPromise('/models/world/tree_set.glb'),
      this.loadGLTFPromise('/models/world/rock_set.glb')
    ]);

    this.fenceProto = fenceGLTF.scene.getObjectByName('FenceStraight_4m');
    this.treeScene = treeGLTF.scene;
    this.rockScene = rockGLTF.scene;

    if (!this.fenceProto) {
      throw new Error('Level1Boundary: FenceStraight_4m missing from electric_fence_set.glb');
    }

    this.buildFencePerimeter();
    this.validateFenceContinuity();
    this.buildBoundaryForest();
  }

  loadGLTFPromise(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  buildFencePerimeter() {
    const totalDist = campaignPath.totalLength;
    const count = Math.ceil(totalDist / this.moduleSpacing);

    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1;
      const lateral = sign * this.fenceOffset;

      // Extend only a few modules beyond the authored ends. Do NOT clamp dozens of
      // samples onto t=0/1 because that stacks fence sections on top of one another.
      for (let i = -2; i <= count + 2; i++) {
        const forwardMeters = THREE.MathUtils.clamp(i * this.moduleSpacing, 0, totalDist);
        const t = totalDist > 0 ? forwardMeters / totalDist : 0;
        const center = campaignPath.getWorldPointAt(t);
        const tangent = campaignPath.getWorldTangentAt(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const pos = center.clone().addScaledVector(normal, lateral);
        pos.y = 0;

        const seg = this.fenceProto.clone(true);
        seg.position.copy(pos);

        // FenceStraight_4m's long axis is local X.
        const yaw = Math.atan2(-tangent.z, tangent.x);
        seg.rotation.y = yaw;
        seg.name = `Fence_${side}_${i}`;
        seg.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.group.add(seg);
        seg.updateMatrixWorld(true);
        this.fenceSegments[side].push(seg);

        if (this.collision) {
          // Visible segment collision.
          const id = `col_fence_${side}_${i}`;
          this.collision.addBoxFromObject(seg, { x: 4.0, z: 0.34 }, id);
          this.colliders[side].push(id);

          // Narrow safety backstop behind the visible wires, not inside the play area.
          const backPos = center.clone().addScaledVector(normal, sign * (this.fenceOffset + 0.42));
          this.collision.addBox(
            backPos.x,
            backPos.z,
            4.15,
            0.34,
            yaw,
            `col_fence_backstop_${side}_${i}`
          );
        }
      }
    }
  }

  validateFenceContinuity() {
    const report = {};

    for (const side of ['left', 'right']) {
      let maxGap = 0;
      const segs = this.fenceSegments[side];

      for (let i = 0; i < segs.length - 1; i++) {
        segs[i].updateMatrixWorld(true);
        segs[i + 1].updateMatrixWorld(true);
        const a = new THREE.Vector3(2, 0, 0).applyMatrix4(segs[i].matrixWorld);
        const b = new THREE.Vector3(-2, 0, 0).applyMatrix4(segs[i + 1].matrixWorld);
        maxGap = Math.max(maxGap, a.distanceTo(b));
      }

      report[side] = maxGap;
      console.log(`LEVEL1 ${side.toUpperCase()} FENCE MAX VISUAL GAP: ${maxGap.toFixed(3)}m`);
    }

    // Curves naturally produce a small chord error. Anything above 0.45m is a real gap.
    if (report.left > 0.45 || report.right > 0.45) {
      console.error('Level1Boundary continuity failure:', report);
    }

    return report;
  }

  buildBoundaryForest() {
    if (!this.treeScene) return;

    // EXACT roots from build_tree_set.py. Never fall back to cloning StylizedTreeSet.
    const treeNames = [
      'Pine_A',
      'Pine_B',
      'Pine_C',
      'Broadleaf_A',
      'Broadleaf_B',
      'DeadTree_A',
      'DeadTree_B'
    ];

    const treeVariants = treeNames
      .map(name => this.treeScene.getObjectByName(name))
      .filter(Boolean);

    if (treeVariants.length < 5) {
      console.warn(`Level1Boundary: only ${treeVariants.length} exact tree roots found; forest density reduced.`);
    }

    if (treeVariants.length === 0) return;

    const rockVariants = [];
    this.rockScene?.traverse(child => {
      if (child.isMesh && child.name.toLowerCase().includes('rock')) rockVariants.push(child);
    });

    // First trunks start 2.5m behind the fence. Canopies stay outside the gameplay corridor.
    // Scales are intentionally restrained: the source assets are already 5–9.5m tall.
    const bands = [
      { lateral: 21.0, spacing: 5.8, minScale: 0.60, maxScale: 0.82 },
      { lateral: 25.5, spacing: 6.3, minScale: 0.72, maxScale: 0.98 },
      { lateral: 31.0, spacing: 7.2, minScale: 0.82, maxScale: 1.08 },
      { lateral: 38.0, spacing: 8.5, minScale: 0.92, maxScale: 1.18 }
    ];

    const totalDist = campaignPath.totalLength;

    // Deterministic pseudo-random helper keeps placement stable across reloads.
    let seed = 7361;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (const sideSign of [-1, 1]) {
      for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
        const band = bands[bandIndex];
        const count = Math.ceil(totalDist / band.spacing);

        for (let i = 0; i <= count; i++) {
          const forward = THREE.MathUtils.clamp(
            i * band.spacing + (rand() - 0.5) * 2.2,
            0,
            totalDist
          );
          const t = totalDist > 0 ? forward / totalDist : 0;
          const center = campaignPath.getWorldPointAt(t);
          const tangent = campaignPath.getWorldTangentAt(t);
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          const lateral = sideSign * (band.lateral + (rand() - 0.5) * 1.5);
          const pos = center.clone().addScaledVector(normal, lateral);
          pos.y = 0;

          // Sparse rocks in the deeper rows only.
          const useRock = bandIndex >= 2 && rockVariants.length > 0 && rand() < 0.14;
          let inst;

          if (useRock) {
            inst = rockVariants[Math.floor(rand() * rockVariants.length)].clone(true);
            const s = 0.65 + rand() * 0.55;
            inst.scale.setScalar(s);
          } else {
            inst = treeVariants[Math.floor(rand() * treeVariants.length)].clone(true);
            const s = band.minScale + rand() * (band.maxScale - band.minScale);
            inst.scale.setScalar(s);
          }

          inst.position.copy(pos);
          inst.rotation.y = rand() * Math.PI * 2;
          inst.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.group.add(inst);
        }
      }
    }
  }

  spawnArc(fenceMesh, strong = false) {
    if (!fenceMesh) return;

    const startX = (Math.random() - 0.5) * 3.3;
    const endX = THREE.MathUtils.clamp(startX + (Math.random() - 0.5) * 1.1, -1.8, 1.8);
    const startY = 1.35 + Math.random() * 1.15;
    const endY = THREE.MathUtils.clamp(startY + (Math.random() - 0.5) * 0.55, 1.15, 2.65);

    const points = [];
    const segments = 7;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * (strong ? 0.18 : 0.10);
      points.push(new THREE.Vector3(
        THREE.MathUtils.lerp(startX, endX, t),
        THREE.MathUtils.lerp(startY, endY, t) + jitter,
        jitter
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: strong ? 0xbffaff : 0x66efff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(geo, mat);
    fenceMesh.add(line);
    this.activeArcs.push({ mesh: line, parent: fenceMesh, lifetime: strong ? 0.18 : 0.11 });
  }

  update(dt, playerPos) {
    if (!playerPos) return;

    this.arcTimer += dt;
    this.proximityCooldown = Math.max(0, this.proximityCooldown - dt);

    if (this.arcTimer >= this.nextArcTime) {
      this.arcTimer = 0;
      this.nextArcTime = 0.8 + Math.random() * 1.3;

      const nearby = [...this.fenceSegments.left, ...this.fenceSegments.right]
        .filter(seg => seg.position.distanceTo(playerPos) < 30);

      if (nearby.length) {
        this.spawnArc(nearby[Math.floor(Math.random() * nearby.length)]);
      }
    }

    // Reactive zap near the physical boundary.
    if (this.proximityCooldown <= 0) {
      const nearby = [...this.fenceSegments.left, ...this.fenceSegments.right]
        .filter(seg => seg.position.distanceTo(playerPos) < 3.2);

      for (const seg of nearby) {
        const local = seg.worldToLocal(playerPos.clone());
        if (Math.abs(local.x) <= 2.1 && Math.abs(local.z) <= 0.95) {
          this.spawnArc(seg, true);
          this.proximityCooldown = 0.45;
          this.audioSystem?.playProximityShock?.();
          break;
        }
      }
    }

    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      const arc = this.activeArcs[i];
      arc.lifetime -= dt;
      arc.mesh.material.opacity = THREE.MathUtils.clamp(arc.lifetime * 8, 0, 1);
      if (arc.lifetime <= 0) {
        arc.parent.remove(arc.mesh);
        arc.mesh.geometry.dispose();
        arc.mesh.material.dispose();
        this.activeArcs.splice(i, 1);
      }
    }
  }
}
