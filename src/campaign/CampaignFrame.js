import * as THREE from 'three';

/**
 * CampaignFrame: Authoritative coordinate system for ARCFALL PROTOCOL.
 * 
 * Local Campaign Coordinates:
 * - Local +Z = FORWARD (visually projects towards the TOP of the screen)
 * - Local +X = RIGHT (visually projects towards the RIGHT of the screen)
 * - Local +Y = UP
 * 
 * World Mapping (with Isometric Camera at Yaw 45 deg):
 * - forwardDir = (-0.7071, 0, -0.7071)
 * - rightDir   = ( 0.7071, 0, -0.7071)
 */
export class CampaignFrame {
  constructor(originWorld = new THREE.Vector3(0, 0, 0)) {
    this.origin = originWorld.clone();

    // Canonical screen-up forward vector
    this.forwardDir = new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2).normalize();
    // Canonical screen-right lateral vector
    this.rightDir = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2).normalize();
    // Canonical world up
    this.upDir = new THREE.Vector3(0, 1, 0);

    // Named campaign landmark anchors (in local coordinates)
    this.anchors = new Map([
      // Relay Calibration Yard & Start
      ['player_spawn', new THREE.Vector3(0.0, 0.0, -8.0)],
      ['tutorial_pulse_1', new THREE.Vector3(0.0, 0.0, -4.0)],
      ['tutorial_pulse_2', new THREE.Vector3(0.0, 0.0, 0.0)],
      ['tutorial_pulse_3', new THREE.Vector3(0.0, 0.0, 4.0)],
      ['weapon_rack', new THREE.Vector3(-4.5, 0.0, 8.0)],
      ['target_coil_1', new THREE.Vector3(-3.0, 0.0, 16.0)],
      ['target_coil_2', new THREE.Vector3(0.0, 0.0, 18.0)],
      ['target_coil_3', new THREE.Vector3(3.0, 0.0, 16.0)],
      
      // Relay Settlement Hub
      ['mara_hub', new THREE.Vector3(-3.5, 0.0, 22.0)],
      ['signal_console', new THREE.Vector3(3.8, 0.0, 24.0)],
      ['relay_gate', new THREE.Vector3(0.0, 0.0, 36.0)],
      
      // Forest Corridor & Encounters
      ['salvage_cache_1', new THREE.Vector3(14.0, 0.0, 65.0)],
      ['ambush_trigger', new THREE.Vector3(0.0, 0.0, 85.0)],
      ['scarab_spawn_1', new THREE.Vector3(-6.0, 0.0, 95.0)],
      ['scarab_spawn_2', new THREE.Vector3(0.0, 0.0, 98.0)],
      ['scarab_spawn_3', new THREE.Vector3(6.0, 0.0, 94.0)],
      ['scarab_spawn_4', new THREE.Vector3(-4.0, 0.0, 106.0)],
      ['scarab_spawn_5', new THREE.Vector3(5.0, 0.0, 108.0)],

      // Level 1 Endpoint: Communications Repeater Site
      ['repeater_outpost', new THREE.Vector3(0.0, 0.0, 135.0)],
      ['signal_repeater_console', new THREE.Vector3(0.0, 0.0, 138.0)],
      ['distant_spire_poi', new THREE.Vector3(0.0, 12.0, 210.0)]
    ]);
  }

  /**
   * Converts local campaign coordinates (localX, localZ, localY) to world position.
   */
  toWorld(localX, localZ, localY = 0) {
    const worldPos = this.origin.clone();
    worldPos.addScaledVector(this.rightDir, localX);
    worldPos.addScaledVector(this.forwardDir, localZ);
    worldPos.y += localY;
    return worldPos;
  }

  /**
   * Converts local Vector3 to world Vector3.
   */
  localVecToWorld(localVec) {
    return this.toWorld(localVec.x, localVec.z, localVec.y || 0);
  }

  /**
   * Converts a world position to local campaign coordinates { x: localX, z: localZ, y: localY }.
   */
  toLocal(worldPos) {
    const rel = new THREE.Vector3().subVectors(worldPos, this.origin);
    const localX = rel.dot(this.rightDir);
    const localZ = rel.dot(this.forwardDir);
    const localY = rel.y;
    return new THREE.Vector3(localX, localY, localZ);
  }

  /**
   * Returns world position of a named anchor.
   */
  getAnchorWorld(anchorName) {
    const local = this.anchors.get(anchorName);
    if (!local) {
      console.warn(`[CampaignFrame] Anchor "${anchorName}" not found!`);
      return this.origin.clone();
    }
    return this.localVecToWorld(local);
  }
}

export const campaignFrame = new CampaignFrame(new THREE.Vector3(0, 0, 0));
