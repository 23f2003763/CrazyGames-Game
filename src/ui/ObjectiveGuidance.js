import * as THREE from 'three';

/**
 * ObjectiveGuidance: 3D world-space objective marker, beacon beam, and navigation chevrons.
 */
export class ObjectiveGuidance {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ObjectiveGuidance_Group';
    this.scene.add(this.group);

    this.currentTargetPos = null;
    this.guidanceType = 'beacon';
    this.elapsedTime = 0;

    this.createDiamondMarker();
    this.createBeaconBeam();
    this.createGroundChevrons();
  }

  createDiamondMarker() {
    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    this.diamondMesh = new THREE.Mesh(geo, mat);
    this.diamondMesh.visible = false;
    this.group.add(this.diamondMesh);
  }

  createBeaconBeam() {
    const geo = new THREE.CylinderGeometry(0.08, 0.4, 18, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconBeam = new THREE.Mesh(geo, mat);
    this.beaconBeam.position.y = 9.0;
    this.beaconBeam.visible = false;
    this.group.add(this.beaconBeam);
  }

  createGroundChevrons() {
    this.chevronGroup = new THREE.Group();
    this.chevrons = [];

    const shape = new THREE.Shape();
    shape.moveTo(-0.6, -0.4);
    shape.lineTo(0.0, 0.4);
    shape.lineTo(0.6, -0.4);
    shape.lineTo(0.4, -0.6);
    shape.lineTo(0.0, 0.0);
    shape.lineTo(-0.4, -0.6);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb822,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(0, 0.06, i * 4.0);
      mesh.visible = false;
      this.chevronGroup.add(mesh);
      this.chevrons.push(mesh);
    }
    this.group.add(this.chevronGroup);
  }

  setObjective(objective) {
    if (!objective || !objective.targetPos) {
      this.currentTargetPos = null;
      this.diamondMesh.visible = false;
      this.beaconBeam.visible = false;
      this.chevrons.forEach(c => c.visible = false);
      return;
    }

    this.currentTargetPos = objective.targetPos.clone();
    this.guidanceType = objective.guidanceType || 'beacon';

    this.diamondMesh.visible = true;
    this.diamondMesh.position.copy(this.currentTargetPos);
    this.diamondMesh.position.y += 1.8;

    this.beaconBeam.visible = (this.guidanceType === 'beacon');
    this.beaconBeam.position.set(this.currentTargetPos.x, 9.0, this.currentTargetPos.z);

    const showChevrons = (this.guidanceType === 'road_chevrons' || this.guidanceType === 'chevrons');
    this.chevrons.forEach(c => c.visible = showChevrons);
  }

  update(dt, playerPos) {
    this.elapsedTime += dt;

    if (this.diamondMesh.visible) {
      // Float & rotate diamond
      this.diamondMesh.rotation.y += dt * 2.5;
      if (this.currentTargetPos) {
        this.diamondMesh.position.y = this.currentTargetPos.y + 1.8 + Math.sin(this.elapsedTime * 3.0) * 0.15;
      }
    }

    if (this.beaconBeam.visible) {
      this.beaconBeam.rotation.y += dt * 0.5;
      this.beaconBeam.material.opacity = 0.25 + Math.sin(this.elapsedTime * 4.0) * 0.12;
    }

    // Update forward navigation chevrons along player's trajectory toward target
    if (this.currentTargetPos && playerPos && this.chevrons[0].visible) {
      const dir = new THREE.Vector3().subVectors(this.currentTargetPos, playerPos);
      dir.y = 0;
      const dist = dir.length();
      dir.normalize();

      const yaw = Math.atan2(dir.x, dir.z);

      this.chevrons.forEach((ch, idx) => {
        const offsetDist = 3.5 + idx * 3.2;
        if (offsetDist < dist) {
          const chPos = playerPos.clone().addScaledVector(dir, offsetDist);
          ch.position.set(chPos.x, 0.06, chPos.z);
          ch.rotation.set(0, yaw, 0);
          ch.visible = true;
          // Pulse opacity sequentially
          const pulse = (Math.sin(this.elapsedTime * 4.0 - idx * 0.6) + 1.0) * 0.5;
          ch.material.opacity = 0.2 + pulse * 0.55;
        } else {
          ch.visible = false;
        }
      });
    }
  }
}
