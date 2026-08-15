import * as THREE from 'three';
import { MAP_CONFIG, roadSpline, dirtSplines, getTerrainHeight } from './MapData.js';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

/**
 * Builds the cracked main highway, broken asphalt slabs, faded road markings,
 * jagged edges, bridge over the riverbed, and dirt path transitions.
 */
export class RoadSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'RoadSystem';
    this.scene.add(this.group);

    this.createMainHighway();
    this.createRoadMarkings();
    this.createCracksAndPotholes();
    this.createRiverBridge();
    this.createDirtPaths();
  }

  createMainHighway() {
    const steps = 140;
    const roadWidth = MAP_CONFIG.roadWidth;
    const halfWidth = roadWidth / 2;

    const asphaltPositions = [];
    const asphaltIndices = [];
    const asphaltColors = [];

    const baseColor = new THREE.Color(0x383a3d);
    const wornColor = new THREE.Color(0x464a4d);
    const brokenEdgeColor = new THREE.Color(0x524c42);

    // Build ribbon segments along the spline
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = roadSpline.getPoint(t);
      const tangent = roadSpline.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Skip road mesh directly on top of bridge span (bridge handles its own deck)
      const isBridgeSpan = (point.x > -16 && point.x < 4);

      // Add jagged variations to road edge for broken post-apocalyptic look
      const leftJagged = Math.sin(i * 1.7) * 0.45 + (Math.sin(i * 4.3) > 0.4 ? -0.8 : 0);
      const rightJagged = Math.cos(i * 1.5) * 0.45 + (Math.cos(i * 3.8) > 0.5 ? -0.7 : 0);

      const leftPos = new THREE.Vector3().copy(point).addScaledVector(normal, -(halfWidth + leftJagged));
      const rightPos = new THREE.Vector3().copy(point).addScaledVector(normal, (halfWidth + rightJagged));

      // Calculate terrain height offset to sit cleanly above terrain
      const leftH = getTerrainHeight(leftPos.x, leftPos.z) + (isBridgeSpan ? -100 : 0.08);
      const rightH = getTerrainHeight(rightPos.x, rightPos.z) + (isBridgeSpan ? -100 : 0.08);
      const centerH = getTerrainHeight(point.x, point.z) + (isBridgeSpan ? -100 : 0.12);

      leftPos.y = leftH;
      rightPos.y = rightH;
      const centerPos = new THREE.Vector3(point.x, centerH, point.z);

      const baseIdx = (i * 3);
      // Left vertex
      asphaltPositions.push(leftPos.x, leftPos.y, leftPos.z);
      // Center vertex
      asphaltPositions.push(centerPos.x, centerPos.y, centerPos.z);
      // Right vertex
      asphaltPositions.push(rightPos.x, rightPos.y, rightPos.z);

      // Vertex colors with slight edge weathering
      asphaltColors.push(brokenEdgeColor.r, brokenEdgeColor.g, brokenEdgeColor.b);
      const midC = (i % 5 === 0) ? wornColor : baseColor;
      asphaltColors.push(midC.r, midC.g, midC.b);
      asphaltColors.push(brokenEdgeColor.r, brokenEdgeColor.g, brokenEdgeColor.b);

      if (i < steps && !isBridgeSpan) {
        // Quad 1: Left to Center
        asphaltIndices.push(baseIdx, baseIdx + 3, baseIdx + 1);
        asphaltIndices.push(baseIdx + 1, baseIdx + 3, baseIdx + 4);

        // Quad 2: Center to Right
        asphaltIndices.push(baseIdx + 1, baseIdx + 4, baseIdx + 2);
        asphaltIndices.push(baseIdx + 2, baseIdx + 4, baseIdx + 5);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(asphaltPositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(asphaltColors, 3));
    geometry.setIndex(asphaltIndices);
    geometry.computeVertexNormals();

    const asphaltMaps = proceduralTextures.getAsphaltTexture(256);
    asphaltMaps.diffuse.repeat.set(8, 30);
    asphaltMaps.roughness.repeat.set(8, 30);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: asphaltMaps.diffuse,
      roughnessMap: asphaltMaps.roughness,
      roughness: 0.84,
      metalness: 0.05,
      flatShading: true,
    });

    const roadMesh = new THREE.Mesh(geometry, material);
    roadMesh.receiveShadow = true;
    roadMesh.name = 'AsphaltHighway';
    roadMesh.userData.isWalkable = true;
    roadMesh.userData.surfaceType = 'road';
    this.group.add(roadMesh);
  }

  createRoadMarkings() {
    // Yellow dashed center stripes & faded white edge lines
    const stripeCount = 60;
    const stripeGeom = new THREE.BoxGeometry(0.5, 0.05, 1.8);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xdfb138,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true,
    });

    const dashMesh = new THREE.InstancedMesh(stripeGeom, stripeMat, stripeCount);
    dashMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();

    let validCount = 0;
    for (let i = 0; i < stripeCount; i++) {
      // Occasional missing dash for post-apocalyptic wear
      if (i % 7 === 0 || i % 11 === 0) continue;

      const t = i / stripeCount;
      const pt = roadSpline.getPoint(t);

      // Skip in bridge zone
      if (pt.x > -15 && pt.x < 3) continue;

      const tangent = roadSpline.getTangent(t).normalize();
      const angle = Math.atan2(-tangent.z, tangent.x) + Math.PI / 2;

      const h = getTerrainHeight(pt.x, pt.z) + 0.15;

      dummy.position.set(pt.x, h, pt.z);
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(1.0, 1.0, 0.8 + Math.sin(i * 3.5) * 0.3);
      dummy.updateMatrix();

      dashMesh.setMatrixAt(validCount, dummy.matrix);
      validCount++;
    }
    dashMesh.count = validCount;
    dashMesh.instanceMatrix.needsUpdate = true;
    this.group.add(dashMesh);
  }

  createCracksAndPotholes() {
    // Potholes with exposed gravel/mud and cracked asphalt slab chunks
    const potholeCount = 28;
    const potholeGeom = new THREE.CylinderGeometry(1.2, 1.6, 0.15, 6);
    const potholeMat = new THREE.MeshStandardMaterial({
      color: 0x2e271f, // Dark mud/gravel pothole
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    const potholeMesh = new THREE.InstancedMesh(potholeGeom, potholeMat, potholeCount);
    potholeMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();

    // Asphalt rubble chunks around potholes & road edge
    const rubbleCount = 70;
    const rubbleGeom = new THREE.DodecahedronGeometry(0.35, 0);
    const rubbleMat = new THREE.MeshStandardMaterial({
      color: 0x484b4d,
      roughness: 0.9,
      flatShading: true,
    });
    const rubbleMesh = new THREE.InstancedMesh(rubbleGeom, rubbleMat, rubbleCount);
    rubbleMesh.castShadow = true;
    rubbleMesh.receiveShadow = true;

    let pCount = 0;
    let rCount = 0;

    for (let i = 0; i < potholeCount; i++) {
      const t = 0.08 + (i / potholeCount) * 0.84;
      const pt = roadSpline.getPoint(t);
      if (pt.x > -14 && pt.x < 3) continue; // Bridge area

      const tangent = roadSpline.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Place pothole with lateral offset
      const offset = (Math.sin(i * 3.7) * (MAP_CONFIG.roadWidth * 0.32));
      const pX = pt.x + normal.x * offset;
      const pZ = pt.z + normal.z * offset;
      const pH = getTerrainHeight(pX, pZ) + 0.09;

      dummy.position.set(pX, pH, pZ);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.scale.set(0.7 + Math.sin(i) * 0.4, 1.0, 0.7 + Math.cos(i) * 0.4);
      dummy.updateMatrix();
      potholeMesh.setMatrixAt(pCount++, dummy.matrix);

      // Place 2-3 rubble chunks near pothole
      for (let k = 0; k < 2; k++) {
        if (rCount >= rubbleCount) break;
        const rX = pX + (Math.sin(i + k * 2) * 1.5);
        const rZ = pZ + (Math.cos(i + k * 2) * 1.5);
        const rH = getTerrainHeight(rX, rZ) + 0.12;

        dummy.position.set(rX, rH, rZ);
        dummy.rotation.set(k * 1.1, i * 0.8, k * 0.5);
        dummy.scale.setScalar(0.6 + Math.random() * 0.6);
        dummy.updateMatrix();
        rubbleMesh.setMatrixAt(rCount++, dummy.matrix);
      }
    }

    potholeMesh.count = pCount;
    potholeMesh.instanceMatrix.needsUpdate = true;
    rubbleMesh.count = rCount;
    rubbleMesh.instanceMatrix.needsUpdate = true;

    this.group.add(potholeMesh);
    this.group.add(rubbleMesh);
  }

  createRiverBridge() {
    // A chunky post-apocalyptic bridge over the sunken riverbed
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'RiverBridge';

    const bridgeLen = 22;
    const bridgeWidth = 11.2;

    // Deck planks (weathered wood/concrete)
    const deckGeom = new THREE.BoxGeometry(bridgeWidth, 0.6, 1.2);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a38,
      roughness: 0.85,
      flatShading: true,
    });

    const plankCount = 18;
    const deckMesh = new THREE.InstancedMesh(deckGeom, deckMat, plankCount);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();

    const startX = -16;
    const endX = 4;
    const startZ = 29;
    const endZ = 16;
    const bridgeHeight = 1.1;

    for (let i = 0; i < plankCount; i++) {
      const alpha = i / (plankCount - 1);
      const px = THREE.MathUtils.lerp(startX, endX, alpha);
      const pz = THREE.MathUtils.lerp(startZ, endZ, alpha);

      // Missing plank for post-apocalyptic feel
      if (i === 6 || i === 13) continue;

      const angle = Math.atan2(endZ - startZ, endX - startX);

      dummy.position.set(px, bridgeHeight + Math.sin(i * 0.8) * 0.04, pz);
      dummy.rotation.set(0, -angle + Math.PI / 2, Math.sin(i) * 0.03);
      dummy.scale.set(1.0, 1.0, 0.95);
      dummy.updateMatrix();
      deckMesh.setMatrixAt(i, dummy.matrix);
    }
    deckMesh.instanceMatrix.needsUpdate = true;
    bridgeGroup.add(deckMesh);

    // Concrete & Wood Bridge Pillars / Supports
    const pillarGeom = new THREE.CylinderGeometry(0.8, 1.0, 4.2, 6);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x4f5451,
      roughness: 0.9,
      flatShading: true,
    });

    const pillarPositions = [
      { x: -11, z: 20 },
      { x: -11, z: 28 },
      { x: -2, z: 15 },
      { x: -2, z: 23 },
    ];

    pillarPositions.forEach(p => {
      const pillar = new THREE.Mesh(pillarGeom, pillarMat);
      pillar.position.set(p.x, -0.6, p.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      bridgeGroup.add(pillar);
    });

    // Bridge Guardrails (weathered beams)
    const railGeom = new THREE.BoxGeometry(0.3, 0.7, bridgeLen);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x8a6341,
      roughness: 0.8,
      flatShading: true,
    });

    const angle = Math.atan2(endZ - startZ, endX - startX);
    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    const normX = -Math.sin(angle);
    const normZ = Math.cos(angle);

    const leftRail = new THREE.Mesh(railGeom, railMat);
    leftRail.position.set(midX + normX * (bridgeWidth / 2 - 0.3), bridgeHeight + 0.8, midZ + normZ * (bridgeWidth / 2 - 0.3));
    leftRail.rotation.y = -angle + Math.PI / 2;
    leftRail.castShadow = true;
    bridgeGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeom, railMat);
    rightRail.position.set(midX - normX * (bridgeWidth / 2 - 0.3), bridgeHeight + 0.8, midZ - normZ * (bridgeWidth / 2 - 0.3));
    rightRail.rotation.y = -angle + Math.PI / 2;
    rightRail.castShadow = true;
    bridgeGroup.add(rightRail);

    this.group.add(bridgeGroup);
  }

  createDirtPaths() {
    // Dirt paths branching off to clearings
    const dirtMaps = proceduralTextures.getDirtTexture(256);
    dirtMaps.diffuse.repeat.set(4, 16);
    dirtMaps.roughness.repeat.set(4, 16);

    const dirtColor = new THREE.Color(0x765c3b);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: dirtColor,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
    });

    dirtSplines.forEach((spline, idx) => {
      const steps = 30;
      const pathW = MAP_CONFIG.dirtPathWidth;
      const positions = [];
      const indices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = spline.getPoint(t);
        const tangent = spline.getTangent(t).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const currentW = pathW * (0.8 + Math.sin(i * 1.5) * 0.25);
        const pLeft = new THREE.Vector3().copy(pt).addScaledVector(normal, -currentW / 2);
        const pRight = new THREE.Vector3().copy(pt).addScaledVector(normal, currentW / 2);

        pLeft.y = getTerrainHeight(pLeft.x, pLeft.z) + 0.05;
        pRight.y = getTerrainHeight(pRight.x, pRight.z) + 0.05;

        positions.push(pLeft.x, pLeft.y, pLeft.z);
        positions.push(pRight.x, pRight.y, pRight.z);

        if (i < steps) {
          const b = i * 2;
          indices.push(b, b + 2, b + 1);
          indices.push(b + 1, b + 2, b + 3);
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, dirtMat);
      mesh.receiveShadow = true;
      mesh.name = `DirtPath_${idx}`;
      this.group.add(mesh);
    });
  }
}
