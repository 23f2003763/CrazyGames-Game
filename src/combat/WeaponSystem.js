import * as THREE from 'three';
import { VoltCaster } from './VoltCaster.js';
import { WeaponMount } from './WeaponMount.js';
import { TargetingSystem } from './TargetingSystem.js';

/**
 * WeaponSystem: Manages equipped Arc weapons, 3D hand mount, auto-aim targeting, and player facing.
 */
export class WeaponSystem {
  constructor(scene, camera, player, playerController, audioSystem, combatSystem) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.playerController = playerController;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.weapons = new Map();
    this.activeWeapon = null;
    this.hasWeapon = false;

    this.isMouseDown = false;
    this.mouseVec2 = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.targetingSystem = new TargetingSystem(this.scene, this.camera, this.player);
    this.weaponMount = new WeaponMount(this.player);

    this.initWeapons();
    this.bindInputs();
  }

  initWeapons() {
    const voltCaster = new VoltCaster(this.scene, this.audioSystem, this.combatSystem);
    this.weapons.set(voltCaster.id, voltCaster);
  }

  equipWeapon(weaponId = 'volt_caster') {
    const w = this.weapons.get(weaponId);
    if (w) {
      this.activeWeapon = w;
      this.hasWeapon = true;
      console.log(`[WEAPON] Equipped: ${w.name}`);
    }
  }

  bindInputs() {
    window.addEventListener('mousemove', (e) => {
      this.mouseVec2.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseVec2.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
        if (this.playerController) {
          this.playerController.clearFacingOverride();
        }
        this.targetingSystem.clearLock();
      }
    });
  }

  update(dt) {
    if (!this.hasWeapon || !this.activeWeapon) return;

    this.activeWeapon.update(dt);
    this.targetingSystem.update(dt);

    if (this.isMouseDown) {
      // 1. Check auto-aim target
      const targets = this.combatSystem ? this.combatSystem.targets : [];
      const bestTarget = this.targetingSystem.findBestTarget(targets, this.mouseVec2);

      let aimDir = new THREE.Vector3();
      const muzzlePos = this.weaponMount.getMuzzleWorldPosition();

      if (bestTarget) {
        // Target center
        const tPos = bestTarget.position.clone().add(new THREE.Vector3(0, 0.4, 0));
        aimDir.subVectors(tPos, muzzlePos).normalize();
      } else {
        // Ground plane aim
        this.raycaster.setFromCamera(this.mouseVec2, this.camera);
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
          aimDir.subVectors(hitPoint, muzzlePos);
          aimDir.y = 0;
          if (aimDir.lengthSq() > 0.01) {
            aimDir.normalize();
          }
        }
      }

      // 2. Force Ryder to face target direction
      if (this.playerController && aimDir.lengthSq() > 0.01) {
        const flatDir = new THREE.Vector3(aimDir.x, 0, aimDir.z).normalize();
        this.playerController.setFacingOverride(flatDir);
      }

      // 3. Fire weapon
      if (this.activeWeapon.canFire() && aimDir.lengthSq() > 0.01) {
        const proj = this.activeWeapon.fire(muzzlePos, aimDir);
        if (proj && this.combatSystem) {
          this.combatSystem.addProjectile(proj);
        }
      }
    }
  }
}
