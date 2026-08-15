import * as THREE from 'three';

/**
 * Sector: Represents an authored linear semi-open zone within a Campaign Chapter.
 */
export class Sector {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.bounds = config.bounds; // { minX, maxX, minZ, maxZ }
    this.entryTriggerZ = config.entryTriggerZ;
    this.exitTriggerZ = config.exitTriggerZ;
    this.spawnPos = config.spawnPos;
    this.spawnYaw = config.spawnYaw;

    this.group = new THREE.Group();
    this.group.name = `Sector_${this.id}`;

    this.isActive = false;
    this.entities = [];
  }

  contains(x, z) {
    return (
      x >= this.bounds.minX &&
      x <= this.bounds.maxX &&
      z >= this.bounds.minZ &&
      z <= this.bounds.maxZ
    );
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    this.group.visible = true;
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    // Keep visual terrain/scenery visible, but pause active AI/heavy tick if needed
  }
}
