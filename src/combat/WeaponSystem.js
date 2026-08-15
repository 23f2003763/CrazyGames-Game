import * as THREE from 'three';
import { VoltCaster } from './VoltCaster.js';

/**
 * WeaponSystem: Manages equipped weapons, mouse aiming, and firing inputs.
 */
export class WeaponSystem {
  constructor(scene, camera, player, audioSystem, combatSystem) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.audioSystem = audioSystem;
    this.combatSystem = combatSystem;

    this.weapons = new Map();
    this.activeWeapon = null;
    this.hasWeapon = false;

    this.isMouseDown = false;
    this.mouseWorldPos = new THREE.Vector3();
    this.aimDirection = new THREE.Vector3(0, 0, 1);
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();
    this.mouseVec2 = new THREE.Vector2();

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
      if (e.button === 0) { // LMB
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });
  }

  update(dt) {
    if (!this.hasWeapon || !this.activeWeapon) return;

    this.activeWeapon.update(dt);

    // Update aim direction via raycast to ground plane
    this.raycaster.setFromCamera(this.mouseVec2, this.camera);
    const hitPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
      this.mouseWorldPos.copy(hitPoint);
      this.aimDirection.subVectors(hitPoint, this.player.position);
      this.aimDirection.y = 0;
      if (this.aimDirection.lengthSq() > 0.01) {
        this.aimDirection.normalize();
      }
    }

    // Auto-fire while LMB held
    if (this.isMouseDown && this.activeWeapon.canFire()) {
      const proj = this.activeWeapon.fire(this.player.position, this.aimDirection);
      if (proj && this.combatSystem) {
        this.combatSystem.addProjectile(proj);
      }
    }
  }
}
