import * as THREE from 'three';
import { campaignPath } from '../CampaignPath.js';
import { campaignFrame } from '../CampaignFrame.js';
import { createCampaignGroundMaterial } from '../../rendering/CampaignGroundMaterial.js';
import { GroundDetailSystem } from '../../rendering/GroundDetailSystem.js';
import { proceduralTextures } from '../../rendering/ProceduralTextures.js';

/**
 * Level1Ground: Authored multi-layer playable terrain for Level 1 (WAKE SIGNAL).
 * Features:
 * - Practically flat surface (base height 0, max noise ±0.06m).
 * - Multi-texture blended ground shader (mossy olive grass, khaki dry grass, warm brown soil, dark mud).
 * - Rich UV-mapped muddy service trail with wheel ruts, gravel shoulders, and wet soil.
 * - Organic puddles (rounded geometry with reflections, zero black rectangle decals).
 * - Authored foundation zones (Relay packed earth, combat disturbed soil, repeater scorched ground).
 * - Instanced ground scatter (small stones, grass tufts, dry weeds, twigs).
 */
export class Level1Ground {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Level1_Ground_Root';
    this.scene.add(this.group);

    this.trailWidth = 7.0;
    this.shoulderWidth = 1.8;

    this.buildTerrainPlane();
    this.buildMudTrail();
    this.buildOrganicPuddles();
    this.buildFoundationDecals();

    this.detailSystem = new GroundDetailSystem(this.scene, (x, z) => this.sampleHeight(x, z));
  }

  sampleHeight(x, z) {
    // Level 1 playable corridor is practically flat, slight micro-noise only
    const worldP = new THREE.Vector3(x, 0, z);
    const t = campaignPath.getClosestProgress(worldP);
    const pathP = campaignPath.getWorldPointAt(t);
    const distFromPath = Math.hypot(x - pathP.x, z - pathP.z);

    // Micro noise in playable area
    let h = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.04;

    // Gentle rise beyond fence (18m) masked by forest
    if (distFromPath > 18.0) {
      const excess = distFromPath - 18.0;
      h += Math.min(excess, 20.0) * 0.15;
    }
    return h;
  }

  buildTerrainPlane() {
    const size = 320;
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cLush = new THREE.Color(0.0, 0.0, 0.0); // R=0 means grass
    const cTrailEarth = new THREE.Color(1.0, 0.0, 0.0); // R=1 means dirt
    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const h = this.sampleHeight(x, z);
      pos.setY(i, h);

      const worldP = new THREE.Vector3(x, 0, z);
      const t = campaignPath.getClosestProgress(worldP);
      const pathP = campaignPath.getWorldPointAt(t);
      const distFromPath = Math.hypot(x - pathP.x, z - pathP.z);

      if (distFromPath < 5.5) {
        tempCol.copy(cTrailEarth);
      } else {
        tempCol.lerpColors(cTrailEarth, cLush, Math.min(1.0, (distFromPath - 5.5) / 14.0));
      }

      colors[i * 3]     = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = createCampaignGroundMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'Level1_Terrain_Mesh';
    mesh.userData.isWalkable = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  buildMudTrail() {
    const steps = 160;
    const halfW = this.trailWidth / 2;
    const fullHalfW = halfW + this.shoulderWidth;

    const positions = [];
    const colors = [];
    const indices = [];
    const uvs = [];

    const cMudCenter = new THREE.Color(0x402b1a); // deep brown compacted mud
    const cWetEarth = new THREE.Color(0x2a1c12);  // darker wet grooves
    const cShoulder = new THREE.Color(0x615445);  // warm dry soil / gravel

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const worldCenter = campaignPath.getWorldPointAt(t);
      const worldTangent = campaignPath.getWorldTangentAt(t);
      const worldNormal = new THREE.Vector3(-worldTangent.z, 0, worldTangent.x).normalize();

      const edgeJitterL = Math.sin(i * 1.7) * 0.3;
      const edgeJitterR = Math.cos(i * 2.1) * 0.3;

      const pLeftOut = worldCenter.clone().addScaledVector(worldNormal, -(fullHalfW + edgeJitterL));
      const pLeftIn  = worldCenter.clone().addScaledVector(worldNormal, -(halfW + edgeJitterL));
      const pCenter  = worldCenter.clone();
      const pRightIn = worldCenter.clone().addScaledVector(worldNormal, (halfW + edgeJitterR));
      const pRightOut= worldCenter.clone().addScaledVector(worldNormal, (fullHalfW + edgeJitterR));

      [pLeftOut, pLeftIn, pCenter, pRightIn, pRightOut].forEach(p => p.y = 0.025);

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

      const v = (t * campaignPath.totalLength) / 4.0;
      uvs.push(
        0.0, v,
        0.2, v,
        0.5, v,
        0.8, v,
        1.0, v
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
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const dirtMaps = proceduralTextures.getDirtTexture(256);
    dirtMaps.diffuse.wrapS = THREE.RepeatWrapping;
    dirtMaps.diffuse.wrapT = THREE.RepeatWrapping;
    dirtMaps.roughness.wrapS = THREE.RepeatWrapping;
    dirtMaps.roughness.wrapT = THREE.RepeatWrapping;

    const trailMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const trailMesh = new THREE.Mesh(geo, trailMat);
    trailMesh.receiveShadow = true;
    trailMesh.name = 'Level1_MudTrail_Ribbon';
    this.group.add(trailMesh);
  }

  buildOrganicPuddles() {
    // 3 Organic rounded water puddles placed naturally along trail shoulders
    const puddleLocations = [
      { t: 0.32, latOffset: -2.2, rX: 2.2, rZ: 1.4, rot: 0.4 },
      { t: 0.58, latOffset:  2.6, rX: 1.8, rZ: 2.0, rot: -0.3 },
      { t: 0.76, latOffset: -1.8, rX: 2.4, rZ: 1.6, rot: 0.6 }
    ];

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a2624,
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    puddleLocations.forEach((pud, idx) => {
      const worldCenter = campaignPath.getWorldPointAt(pud.t);
      const worldTan = campaignPath.getWorldTangentAt(pud.t);
      const normal = new THREE.Vector3(-worldTan.z, 0, worldTan.x).normalize();
      const pos = worldCenter.clone().addScaledVector(normal, pud.latOffset);
      pos.y = 0.032;

      // Elliptical organic disk geometry (circle scaled non-uniformly)
      const geo = new THREE.CircleGeometry(1.0, 24);
      geo.rotateX(-Math.PI / 2);
      geo.scale(pud.rX, 1.0, pud.rZ);

      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.position.copy(pos);
      mesh.rotation.y = pud.rot;
      mesh.name = `Level1_OrganicPuddle_${idx + 1}`;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    });
  }

  buildFoundationDecals() {
    // Organic ground transition zones: Relay Packed Earth & Repeater Scorch
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x483a2c,
      roughness: 0.95,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // Relay plinth ground apron (s=0 to 18m)
    const relayGroundGeo = new THREE.CircleGeometry(16.0, 32);
    relayGroundGeo.rotateX(-Math.PI / 2);
    relayGroundGeo.scale(1.1, 1.0, 0.9);
    const relayGround = new THREE.Mesh(relayGroundGeo, foundationMat);
    const relayPos = campaignFrame.requireAnchor('relay_hq');
    relayGround.position.set(relayPos.x, 0.015, relayPos.z);
    relayGround.name = 'Level1_RelayFoundation_Apron';
    relayGround.receiveShadow = true;
    this.group.add(relayGround);

    // Repeater scorched earth zone (s=140 to 165m)
    const scorchMat = new THREE.MeshStandardMaterial({
      color: 0x222422,
      roughness: 0.92,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const repGroundGeo = new THREE.CircleGeometry(18.0, 32);
    repGroundGeo.rotateX(-Math.PI / 2);
    const repGround = new THREE.Mesh(repGroundGeo, scorchMat);
    const repPos = campaignFrame.requireAnchor('repeater_site');
    repGround.position.set(repPos.x, 0.015, repPos.z);
    repGround.name = 'Level1_RepeaterScorch_Apron';
    repGround.receiveShadow = true;
    this.group.add(repGround);
  }
}
