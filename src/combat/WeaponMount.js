import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * WeaponMount: Mounts the 3D Stormcore Hammer directly to Ryder's right hand bone.
 */
export class WeaponMount {
  constructor(player) {
    this.player = player;
    this.weaponMesh = null;
    this.handBone = null;
    this.headSocket = new THREE.Object3D();
    this.headSocket.position.set(0, 0.48, 0);

    this.loadWeapon();
  }

  loadWeapon() {
    const loader = new GLTFLoader();
    loader.load('/models/weapons/stormcore_hammer.glb', (gltf) => {
      this.weaponMesh = gltf.scene;
      this.weaponMesh.scale.setScalar(0.85);
      this.weaponMesh.add(this.headSocket);

      if (this.player.isLoaded) {
        this.attachToPlayer();
      } else {
        this.player.onLoadedCallbacks.push(() => this.attachToPlayer());
      }
    });
  }

  attachToPlayer() {
    if (!this.player.model || !this.weaponMesh) return;

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
      this.weaponMesh.position.set(0.02, 0.05, 0.02);
      this.weaponMesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      this.handBone.add(this.weaponMesh);
      console.log(`[WEAPON] Stormcore Hammer mounted to bone: ${foundBone.name}`);
    } else {
      this.weaponMesh.position.set(0.35, 0.9, 0.2);
      this.player.group.add(this.weaponMesh);
    }
  }

  getHammerHeadWorldPosition() {
    const worldPos = new THREE.Vector3();
    if (this.headSocket) {
      this.headSocket.getWorldPosition(worldPos);
      return worldPos;
    }
    return this.player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  }
}
