import * as THREE from 'three';
import { campaignPath } from './CampaignPath.js';
import { campaignFrame } from './CampaignFrame.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

/**
 * ArcTrail: 6–8m wide muddy service trail ribbon following the authoritative CampaignPath.
 * Rich visual layers: compacted dark mud, wet brown earth, tire ruts, puddles, and Arc-burn marks.
 */
export class ArcTrail {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ArcTrail_Group';
    this.scene.add(this.group);

    this.trailWidth = 7.0;
    this.shoulderWidth = 1.6;

    this.buildTrailRibbon();
    this.buildMudDecals();
  }

  buildTrailRibbon() {
    const steps = 160;
    const halfW = this.trailWidth / 2;
    const fullHalfW = halfW + this.shoulderWidth;

    const positions = [];
    const colors = [];
    const indices = [];

    const cMudCenter = new THREE.Color(0x2c2218);
    const cWetEarth = new THREE.Color(0x3e3224);
    const cShoulder = new THREE.Color(0x4a4838);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const worldCenter = campaignPath.getWorldPointAt(t);
      const worldTangent = campaignPath.getWorldTangentAt(t);
      // Lateral normal on horizontal plane
      const worldNormal = new THREE.Vector3(-worldTangent.z, 0, worldTangent.x).normalize();

      const edgeJitterL = Math.sin(i * 1.7) * 0.35;
      const edgeJitterR = Math.cos(i * 2.1) * 0.35;

      const pLeftOut = worldCenter.clone().addScaledVector(worldNormal, -(fullHalfW + edgeJitterL));
      const pLeftIn  = worldCenter.clone().addScaledVector(worldNormal, -(halfW + edgeJitterL));
      const pCenter  = worldCenter.clone();
      const pRightIn = worldCenter.clone().addScaledVector(worldNormal, (halfW + edgeJitterR));
      const pRightOut= worldCenter.clone().addScaledVector(worldNormal, (fullHalfW + edgeJitterR));

      [pLeftOut, pLeftIn, pCenter, pRightIn, pRightOut].forEach(p => p.y = 0.035);

      const base = i * 5;
      positions.push(
        pLeftOut.x, pLeftOut.y, pLeftOut.z,
        pLeftIn.x, pLeftIn.y, pLeftIn.z,
        pCenter.x, pCenter.y, pCenter.z,
        pRightIn.x, pRightIn.y, pRightIn.z,
        pRightOut.x, pRightOut.y, pRightOut.z
      );

      colors.push(
        cShoulder.r, cShoulder.g, cShoulder.b,
        cWetEarth.r, cWetEarth.g, cWetEarth.b,
        cMudCenter.r, cMudCenter.g, cMudCenter.b,
        cWetEarth.r, cWetEarth.g, cWetEarth.b,
        cShoulder.r, cShoulder.g, cShoulder.b
      );

      if (i < steps) {
        indices.push(base, base + 5, base + 1);
        indices.push(base + 1, base + 5, base + 6);

        indices.push(base + 1, base + 6, base + 2);
        indices.push(base + 2, base + 6, base + 7);

        indices.push(base + 2, base + 7, base + 3);
        indices.push(base + 3, base + 7, base + 8);

        indices.push(base + 3, base + 8, base + 4);
        indices.push(base + 4, base + 8, base + 9);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const dirtMaps = proceduralTextures.getDirtTexture(256);
    dirtMaps.diffuse.repeat.set(6, 32);
    dirtMaps.roughness.repeat.set(6, 32);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'ArcTrail_Ribbon';
    mesh.userData.isWalkable = true;
    this.group.add(mesh);
  }

  buildMudDecals() {
    // Wet mud ruts and cyan energy scorch patches
    const rutGeo = new THREE.PlaneGeometry(1.2, 4.0);
    rutGeo.rotateX(-Math.PI / 2);

    const rutMat = new THREE.MeshStandardMaterial({
      color: 0x1a140e,
      roughness: 0.35, // Glossy wet mud
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const rutCount = 16;
    const instMesh = new THREE.InstancedMesh(rutGeo, rutMat, rutCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < rutCount; i++) {
      const t = (i + 0.5) / rutCount;
      const pt = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const yaw = Math.atan2(tangent.x, tangent.z);

      const lateralOffset = ((i % 2 === 0) ? -1.4 : 1.4);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, lateralOffset);

      dummy.position.set(pos.x, 0.045, pos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(0.8 + (i % 3) * 0.2, 1.0, 1.0 + (i % 2) * 0.3);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.receiveShadow = true;
    this.group.add(instMesh);
  }
}
