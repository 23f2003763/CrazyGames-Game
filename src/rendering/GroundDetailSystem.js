import * as THREE from 'three';
import { campaignPath } from '../campaign/CampaignPath.js';

export class GroundDetailSystem {
  constructor(scene, sampleHeightFn) {
    this.scene = scene;
    this.sampleHeight = sampleHeightFn;
    this.group = new THREE.Group();
    this.group.name = 'GroundDetailSystem';
    this.scene.add(this.group);
    
    this.buildDetails();
  }
  
  hash(x, y) {
    let h = Math.imul(Math.floor(x * 374761393) ^ Math.floor(y * 668265263), 1274126177);
    return (h >>> 0) / 4294967296;
  }

  buildDetails() {
    const stoneGeo = new THREE.IcosahedronGeometry(0.1, 0);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9, flatShading: true });
    
    const grassGeo = new THREE.PlaneGeometry(0.15, 0.2);
    grassGeo.translate(0, 0.1, 0);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3d4f29, roughness: 0.8, side: THREE.DoubleSide });
    
    const weedGeo = new THREE.ConeGeometry(0.05, 0.25, 3);
    weedGeo.translate(0, 0.125, 0);
    const weedMat = new THREE.MeshStandardMaterial({ color: 0x5e5b38, roughness: 0.9 });
    
    const twigGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 3);
    const twigMat = new THREE.MeshStandardMaterial({ color: 0x36281e, roughness: 0.9 });
    
    const count = 4000;
    const iStone = new THREE.InstancedMesh(stoneGeo, stoneMat, count);
    const iGrass = new THREE.InstancedMesh(grassGeo, grassMat, count);
    const iWeed = new THREE.InstancedMesh(weedGeo, weedMat, count);
    const iTwig = new THREE.InstancedMesh(twigGeo, twigMat, count);
    
    [iStone, iGrass, iWeed, iTwig].forEach(m => {
      m.receiveShadow = true;
      m.castShadow = true;
    });
    
    let idxStone = 0, idxGrass = 0, idxWeed = 0, idxTwig = 0;
    const dummy = new THREE.Object3D();
    const size = 200;
    
    for (let i = 0; i < count * 4; i++) {
       const x = (this.hash(i, 1) - 0.5) * size;
       const z = (this.hash(i, 2) - 0.5) * size;
       
       const worldP = new THREE.Vector3(x, 0, z);
       const t = campaignPath.getClosestProgress(worldP);
       const pathP = campaignPath.getWorldPointAt(t);
       const distFromPath = Math.hypot(x - pathP.x, z - pathP.z);
       
       if (distFromPath < 3.8) continue;
       
       let prob = 0.4;
       if (distFromPath < 8.0) prob = 1.0; 
       
       if (this.hash(i, 3) > prob) continue;
       
       const y = this.sampleHeight(x, z);
       
       dummy.position.set(x, y, z);
       
       let rotX = (this.hash(i, 4) - 0.5) * 0.2;
       let rotZ = (this.hash(i, 6) - 0.5) * 0.2;
       const type = Math.floor(this.hash(i, 8) * 4);
       
       if (type === 3) {
         rotX = Math.PI / 2 + (this.hash(i, 4) - 0.5) * 0.2;
         dummy.position.y += 0.02;
       }
       
       dummy.rotation.set(rotX, this.hash(i, 5) * Math.PI * 2, rotZ);
       dummy.scale.setScalar(0.7 + this.hash(i, 7) * 0.6);
       dummy.updateMatrix();
       
       if (type === 0 && idxStone < count) iStone.setMatrixAt(idxStone++, dummy.matrix);
       else if (type === 1 && idxGrass < count) iGrass.setMatrixAt(idxGrass++, dummy.matrix);
       else if (type === 2 && idxWeed < count) iWeed.setMatrixAt(idxWeed++, dummy.matrix);
       else if (type === 3 && idxTwig < count) iTwig.setMatrixAt(idxTwig++, dummy.matrix);
    }
    
    iStone.count = idxStone; iStone.instanceMatrix.needsUpdate = true;
    iGrass.count = idxGrass; iGrass.instanceMatrix.needsUpdate = true;
    iWeed.count = idxWeed; iWeed.instanceMatrix.needsUpdate = true;
    iTwig.count = idxTwig; iTwig.instanceMatrix.needsUpdate = true;
    
    this.group.add(iStone, iGrass, iWeed, iTwig);
  }
}
