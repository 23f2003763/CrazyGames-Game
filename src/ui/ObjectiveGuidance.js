import * as THREE from 'three';

/**
 * ObjectiveGuidance: Subtle floating visual objective icons (Talk, Interact, Mission, Loot, Enemy).
 */
export class ObjectiveGuidance {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'ObjectiveGuidance_Group';
    this.scene.add(this.group);

    this.currentTargetPos = null;
    this.currentIconType = 'MISSION';
    this.elapsedTime = 0;

    this.createIconMeshes();
  }

  createIconMeshes() {
    this.icons = {};

    // 1. Mission Diamond (Cyan Octahedron)
    const geoDiamond = new THREE.OctahedronGeometry(0.22, 0);
    const matDiamond = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.8
    });
    this.icons.MISSION = new THREE.Mesh(geoDiamond, matDiamond);
    this.icons.MISSION.visible = false;
    this.group.add(this.icons.MISSION);

    // 2. Talk Icon (Teal Torus / Speech Ring)
    const geoTalk = new THREE.TorusGeometry(0.18, 0.05, 8, 16);
    geoTalk.rotateX(Math.PI / 2);
    const matTalk = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x178582,
      emissiveIntensity: 1.2
    });
    this.icons.TALK = new THREE.Mesh(geoTalk, matTalk);
    this.icons.TALK.visible = false;
    this.group.add(this.icons.TALK);

    // 3. Interact Icon (Warm Amber Ring)
    const geoInteract = new THREE.OctahedronGeometry(0.20, 0);
    const matInteract = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff7700,
      emissiveIntensity: 1.2
    });
    this.icons.INTERACT = new THREE.Mesh(geoInteract, matInteract);
    this.icons.INTERACT.visible = false;
    this.group.add(this.icons.INTERACT);

    // 4. Enemy Icon (Red-Magenta Diamond)
    const geoEnemy = new THREE.TetrahedronGeometry(0.24, 0);
    const matEnemy = new THREE.MeshStandardMaterial({
      color: 0xff3366,
      emissive: 0xff1144,
      emissiveIntensity: 1.5
    });
    this.icons.ENEMY = new THREE.Mesh(geoEnemy, matEnemy);
    this.icons.ENEMY.visible = false;
    this.group.add(this.icons.ENEMY);
  }

  setObjective(objective) {
    Object.values(this.icons).forEach(icon => icon.visible = false);

    if (!objective || !objective.targetPos) {
      this.currentTargetPos = null;
      return;
    }

    this.currentTargetPos = objective.targetPos.clone();
    this.currentIconType = objective.type || 'MISSION';

    const activeIcon = this.icons[this.currentIconType] || this.icons.MISSION;
    activeIcon.visible = true;
    activeIcon.position.copy(this.currentTargetPos);
    activeIcon.position.y += 2.0;
  }

  update(dt, playerPos) {
    this.elapsedTime += dt;
    if (!this.currentTargetPos) return;

    const activeIcon = this.icons[this.currentIconType] || this.icons.MISSION;
    if (activeIcon && activeIcon.visible) {
      activeIcon.rotation.y += dt * 2.5;
      activeIcon.position.y = this.currentTargetPos.y + 2.0 + Math.sin(this.elapsedTime * 3.5) * 0.10;
    }
  }
}
