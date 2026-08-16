import * as THREE from 'three';
import { StormcoreHammer } from './StormcoreHammer.js';
import { WeaponMount } from './WeaponMount.js';
import { TargetingSystem } from './TargetingSystem.js';
import { inputRouter } from '../input/InputRouter.js';

/**
 * WeaponSystem: Manages Stormcore Hammer weapon charging, auto-aim, and electrical discharges.
 */
export class WeaponSystem {
  constructor(scene, camera, player, playerController, audioSystem, combatSystem) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.playerController = playerController;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.hammer = new StormcoreHammer(this.scene, this.audioSystem, this.combatSystem);
    this.weaponMount = new WeaponMount(this.player);
    this.targetingSystem = new TargetingSystem(this.scene, this.camera, this.player);

    this.isMouseDown = false;
    this.mouseVec2 = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener('mousemove', (e) => {
      this.mouseVec2.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseVec2.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && inputRouter.canCombat()) {
        this.isMouseDown = true;
        this.hammer.startCharging();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.isMouseDown) {
        this.isMouseDown = false;
        this.triggerDischarge();
      }
    });
  }

  triggerDischarge() {
    const targets = this.combatSystem ? this.combatSystem.targets : [];
    const bestTarget = this.targetingSystem.findBestTarget(targets, this.mouseVec2);
    const hammerHeadPos = this.weaponMount.getHammerHeadWorldPosition();

    if (bestTarget) {
      // Force Ryder to face target firmly on release
      const toTarget = new THREE.Vector3().subVectors(bestTarget.position, this.player.position);
      toTarget.y = 0;
      if (this.playerController && toTarget.lengthSq() > 0.01) {
        this.playerController.setFacingOverride(toTarget.normalize());
      }

      this.hammer.discharge(hammerHeadPos, bestTarget, targets);
    } else {
      this.hammer.isCharging = false;
      if (this.hammer.chargePoints) this.hammer.chargePoints.visible = false;
    }

    setTimeout(() => {
      if (!this.isMouseDown && this.playerController) {
        this.playerController.clearFacingOverride();
      }
    }, 150);
  }

  update(dt) {
    const hammerHeadPos = this.weaponMount.getHammerHeadWorldPosition();
    this.hammer.update(dt, hammerHeadPos);
    this.targetingSystem.update(dt);

    if (this.isMouseDown && inputRouter.canCombat()) {
      const targets = this.combatSystem ? this.combatSystem.targets : [];
      const bestTarget = this.targetingSystem.findBestTarget(targets, this.mouseVec2);

      let aimDir = new THREE.Vector3();
      if (bestTarget) {
        aimDir.subVectors(bestTarget.position, this.player.position);
      } else {
        this.raycaster.setFromCamera(this.mouseVec2, this.camera);
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
          aimDir.subVectors(hitPoint, this.player.position);
        }
      }

      aimDir.y = 0;
      if (aimDir.lengthSq() > 0.01 && this.playerController) {
        this.playerController.setFacingOverride(aimDir.normalize());
      }
    }
  }
}
