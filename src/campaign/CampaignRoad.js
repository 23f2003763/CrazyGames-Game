import * as THREE from 'three';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

export const CAMPAIGN_ROAD_POINTS = [
  new THREE.Vector3(0.0, 0.0, -10.0),   // Inside Relay Courtyard
  new THREE.Vector3(0.0, 0.0, 25.0),    // Relay Gate Approach
  new THREE.Vector3(0.0, 0.0, 50.0),    // Relay Fortified Gate
  new THREE.Vector3(1.8, 0.0, 80.0),    // Highway Junction
  new THREE.Vector3(-2.8, 0.0, 115.0),  // Gentle curve near Optional Cache
  new THREE.Vector3(1.5, 0.0, 145.0),   // Convoy Approach
  new THREE.Vector3(0.0, 0.0, 168.0),   // Wrecked Convoy Set-Piece
  new THREE.Vector3(-2.2, 0.0, 205.0),  // Octane Mart Turnoff Approach
  new THREE.Vector3(0.0, 0.0, 245.0),   // Octane Mart Forecourt
];

export const campaignRoadSpline = new THREE.CatmullRomCurve3(
  CAMPAIGN_ROAD_POINTS, 
  false, 
  'centripetal', 
  0.2
);

/**
 * CampaignRoad: High-quality, authored 7m asphalt highway ribbon
 * providing clear forward navigation along the campaign axis (+Z).
 */
export class CampaignRoad {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'CampaignRoad_Group';
    this.scene.add(this.group);

    this.roadWidth = 7.2;
    this.shoulderWidth = 1.4;
    this.spline = campaignRoadSpline;

    this.buildRoadMesh();
    this.buildLaneMarkings();
    this.buildCracksAndPatches();
  }

  buildRoadMesh() {
    const steps = 180;
    const halfW = this.roadWidth / 2;
    const fullHalfW = halfW + this.shoulderWidth;

    const positions = [];
    const colors = [];
    const indices = [];

    const asphaltColor = new THREE.Color(0x36383b);
    const shoulderColor = new THREE.Color(0x564e44);
    const centerWornColor = new THREE.Color(0x424548);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = this.spline.getPoint(t);
      const tangent = this.spline.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Jagged post-apocalyptic asphalt edge variation
      const leftJag = Math.sin(i * 1.8) * 0.25;
      const rightJag = Math.cos(i * 2.2) * 0.25;

      const pLeftOut = new THREE.Vector3().copy(pt).addScaledVector(normal, -(fullHalfW + leftJag));
      const pLeftIn = new THREE.Vector3().copy(pt).addScaledVector(normal, -(halfW + leftJag));
      const pCenter = new THREE.Vector3().copy(pt);
      const pRightIn = new THREE.Vector3().copy(pt).addScaledVector(normal, (halfW + rightJag));
      const pRightOut = new THREE.Vector3().copy(pt).addScaledVector(normal, (fullHalfW + rightJag));

      // Elevation: 0.04m above flat terrain
      [pLeftOut, pLeftIn, pCenter, pRightIn, pRightOut].forEach(p => p.y = 0.04);

      const base = i * 5;
      positions.push(
        pLeftOut.x, pLeftOut.y, pLeftOut.z,
        pLeftIn.x, pLeftIn.y, pLeftIn.z,
        pCenter.x, pCenter.y, pCenter.z,
        pRightIn.x, pRightIn.y, pRightIn.z,
        pRightOut.x, pRightOut.y, pRightOut.z
      );

      colors.push(
        shoulderColor.r, shoulderColor.g, shoulderColor.b,
        asphaltColor.r, asphaltColor.g, asphaltColor.b,
        centerWornColor.r, centerWornColor.g, centerWornColor.b,
        asphaltColor.r, asphaltColor.g, asphaltColor.b,
        shoulderColor.r, shoulderColor.g, shoulderColor.b
      );

      if (i < steps) {
        // Strip 1: Left shoulder to left asphalt edge
        indices.push(base, base + 5, base + 1);
        indices.push(base + 1, base + 5, base + 6);
        // Strip 2: Left asphalt to center
        indices.push(base + 1, base + 6, base + 2);
        indices.push(base + 2, base + 6, base + 7);
        // Strip 3: Center to right asphalt
        indices.push(base + 2, base + 7, base + 3);
        indices.push(base + 3, base + 7, base + 8);
        // Strip 4: Right asphalt to right shoulder
        indices.push(base + 3, base + 8, base + 4);
        indices.push(base + 4, base + 8, base + 9);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const asphaltMaps = proceduralTextures.getAsphaltTexture(256);
    asphaltMaps.diffuse.repeat.set(6, 40);
    asphaltMaps.roughness.repeat.set(6, 40);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: asphaltMaps.diffuse,
      roughnessMap: asphaltMaps.roughness,
      roughness: 0.84,
      metalness: 0.04,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'CampaignRoad_Ribbon';
    mesh.userData.isWalkable = true;
    mesh.userData.surfaceType = 'road';
    this.group.add(mesh);
  }

  buildLaneMarkings() {
    // Yellow dashed center stripe & white border markings
    const stripeCount = 65;
    const stripeGeo = new THREE.PlaneGeometry(0.35, 1.8);
    stripeGeo.rotateX(-Math.PI / 2);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xdfb438,
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const instStripe = new THREE.InstancedMesh(stripeGeo, stripeMat, stripeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < stripeCount; i++) {
      // Dash every 3.8m
      const t = (i / stripeCount);
      const pt = this.spline.getPoint(t);
      const tangent = this.spline.getTangent(t).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);

      dummy.position.set(pt.x, 0.055, pt.z);
      dummy.rotation.set(0, yaw, 0);
      // Skip some dashes for faded/cracked road look
      dummy.scale.set(1.0, 1.0, (i % 7 === 3 ? 0.0 : (0.8 + Math.sin(i) * 0.2)));
      dummy.updateMatrix();
      instStripe.setMatrixAt(i, dummy.matrix);
    }
    instStripe.instanceMatrix.needsUpdate = true;
    instStripe.receiveShadow = true;
    this.group.add(instStripe);
  }

  buildCracksAndPatches() {
    // Weathered asphalt patches along road
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0x222426,
      roughness: 0.90,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const patchGeo = new THREE.PlaneGeometry(1.6, 2.2);
    patchGeo.rotateX(-Math.PI / 2);

    const patchCount = 18;
    const instPatch = new THREE.InstancedMesh(patchGeo, patchMat, patchCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < patchCount; i++) {
      const t = (i + 0.5) / patchCount;
      const pt = this.spline.getPoint(t);
      const tangent = this.spline.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const offsetDist = ((i % 3) - 1.0) * 1.8;
      const patchPos = pt.clone().addScaledVector(normal, offsetDist);

      dummy.position.set(patchPos.x, 0.052, patchPos.z);
      dummy.rotation.set(0, Math.sin(i * 3) * Math.PI, 0);
      dummy.scale.set(1.0 + (i % 2) * 0.4, 1.0, 0.8 + (i % 3) * 0.3);
      dummy.updateMatrix();
      instPatch.setMatrixAt(i, dummy.matrix);
    }
    instPatch.instanceMatrix.needsUpdate = true;
    this.group.add(instPatch);
  }

  /**
   * Samples closest point and progress (t) along the road spline
   */
  getClosestRoadPoint(x, z) {
    const samples = 60;
    let bestDistSq = Infinity;
    let bestPt = new THREE.Vector3();
    let bestT = 0;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.spline.getPoint(t);
      const dSq = (pt.x - x) * (pt.x - x) + (pt.z - z) * (pt.z - z);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestPt.copy(pt);
        bestT = t;
      }
    }
    return { point: bestPt, t: bestT, distance: Math.sqrt(bestDistSq) };
  }
}
