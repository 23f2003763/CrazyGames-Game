import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * WeaponMount: Mounts the 3D Volt Caster weapon directly to Ryder's right hand bone.
 */
export class WeaponMount {
  constructor(player) {
    this.player = player;
    this.weaponMesh = null;
    this.handBone = null;
    this.muzzleSocket = new THREE.Object3D();
    this.muzzleSocket.position.set(0, 0, 0.45);

    this.loadWeapon();
  }

  loadWeapon() {
    const loader = new GLTFLoader();
    loader.load('/models/world/arc_props.glb', (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.name === 'Volt_Caster_Weapon') {
          this.weaponMesh = child;
        }
      });

      if (this.weaponMesh) {
        this.weaponMesh.scale.setScalar(0.7);
        this.weaponMesh.add(this.muzzleSocket);

        if (this.player.isLoaded) {
          this.attachToPlayer();
        } else {
          this.player.onLoadedCallbacks.push(() => this.attachToPlayer());
        }
      }
    });
  }

  attachToPlayer() {
    if (!this.player.model || !this.weaponMesh) return;

    // Search for right hand bone in Ryder's skeleton
    let foundBone = null;
    this.player.model.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes('hand') && (name.includes('r') || name.includes('right'))) {
          if (!foundBone) foundBone = child;
        }
      }
    });

    if (foundBone) {
      this.handBone = foundBone;
      this.weaponMesh.position.set(0.04, 0.08, 0.05);
      this.weaponMesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      this.handBone.add(this.weaponMesh);
      console.log(`[WEAPON] Volt Caster mounted to bone: ${foundBone.name}`);
    } else {
      // Fallback attach to player root at waist/hand height
      this.weaponMesh.position.set(0.35, 0.9, 0.2);
      this.player.group.add(this.weaponMesh);
      console.log('[WEAPON] Mounted to player group fallback socket');
    }
  }

  getMuzzleWorldPosition() {
    const worldPos = new THREE.Vector3();
    if (this.muzzleSocket) {
      this.muzzleSocket.getWorldPosition(worldPos);
      return worldPos;
    }
    return this.player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  }
}
