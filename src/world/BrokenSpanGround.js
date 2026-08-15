import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

/**
 * BrokenSpanGround: Irregular multi-layered polygon ground for Clearing 3 (The Broken Span).
 * Uses ShapeGeometry with polygon offsets to eliminate z-fighting and create organic dry riverbed terrain.
 */
export class BrokenSpanGround {
  constructor(root) {
    this.group = root;

    this.materials = {
      dryMud: this.mat(0x523d28, 0.94),
      wetSilt: this.mat(0x322416, 0.96),
      crackedClay: this.mat(0x6e5236, 0.92),
      asphalt: this.mat(0x32353a, 0.90),
      concreteDrab: this.mat(0x6b695e, 0.88),
      yellowStripe: this.mat(0xdfab22, 0.70),
      waterPool: new THREE.MeshStandardMaterial({
        color: 0x247a76,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
        flatShading: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      }),
      boulder: this.mat(0x565852, 0.86)
    };

    this.build();
  }

  mat(color, roughness = 0.9, metalness = 0.02) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
  }

  polygon(name, points, material, height = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.position.y = height;
    mesh.receiveShadow = true;
    
    // Tag it for WalkableSurfaceSystem (except water)
    if (!name.startsWith('WaterPool')) {
      mesh.userData.isWalkable = true;
      mesh.userData.surfaceType = 'ground';
    }

    this.group.add(mesh);
    return mesh;
  }

  stripe(x, z, sx, sz, rotation = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, 0.035, sz),
      this.materials.yellowStripe
    );
    mesh.position.set(x, 0.16, z);
    mesh.rotation.y = rotation;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  boulder(x, y, z, sx, sy, sz, rotY = 0) {
    const geo = new THREE.DodecahedronGeometry(1.0, 0);
    const mesh = new THREE.Mesh(geo, this.materials.boulder);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(0.2, rotY, 0.3);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  build() {
    // 1. ORGANIC SUNKEN DRY RIVERBED BASIN
    this.polygon(
      'Riverbed_DryMud_Base',
      [
        [-24, -14], [-18, -20], [-8, -22], [4, -23],
        [16, -18], [22, -10], [24, 0], [21, 12],
        [15, 20], [6, 23], [-6, 22], [-16, 18],
        [-23, 10], [-25, -2]
      ],
      this.materials.dryMud,
      0.02
    );

    // 2. CENTRAL WET SILT CHANNEL (Along river course: NW to SE)
    this.polygon(
      'Riverbed_WetSilt_Channel',
      [
        [-18, -12], [-10, -14], [-2, -15], [8, -12],
        [14, -6], [16, 2], [12, 10], [4, 14],
        [-4, 15], [-12, 12], [-16, 4], [-18, -4]
      ],
      this.materials.wetSilt,
      0.05
    );

    // 3. SHALLOW TURQUOISE WATER POOLS
    // Main pool under collapsed bridge span
    this.polygon(
      'WaterPool_Main',
      [
        [-6, -4], [4, -6], [8, -2],
        [6, 5], [-2, 7], [-8, 2]
      ],
      this.materials.waterPool,
      0.08
    );

    // Secondary northern puddle
    this.polygon(
      'WaterPool_North',
      [
        [-14, 5], [-8, 6], [-6, 11],
        [-11, 13], [-15, 10]
      ],
      this.materials.waterPool,
      0.075
    );

    // Southern outlet puddle
    this.polygon(
      'WaterPool_South',
      [
        [6, -14], [12, -12], [14, -8],
        [10, -7], [4, -10]
      ],
      this.materials.waterPool,
      0.072
    );

    // 4. CRACKED CLAY BANKS
    this.polygon(
      'ClayBank_West',
      [
        [-22, -8], [-16, -6], [-14, 2],
        [-18, 6], [-23, 2]
      ],
      this.materials.crackedClay,
      0.06
    );

    this.polygon(
      'ClayBank_East',
      [
        [14, -3], [20, -5], [22, 4],
        [17, 7], [13, 3]
      ],
      this.materials.crackedClay,
      0.065
    );

    // 5. HIGHWAY ASPHALT EMBANKMENT APPROACHES
    // West approach (leading to standing span)
    this.polygon(
      'Road_Approach_West',
      [
        [-24, -2], [-14, -3], [-14, 5],
        [-24, 4]
      ],
      this.materials.asphalt,
      0.10
    );

    // East approach (leading to collapsed bank)
    this.polygon(
      'Road_Approach_East',
      [
        [14, -4], [24, -3], [24, 4],
        [14, 3]
      ],
      this.materials.asphalt,
      0.09
    );

    // Highway yellow dashed centerlines
    this.stripe(-20, 1.0, 2.4, 0.35, 0.05);
    this.stripe(-16, 1.0, 2.0, 0.35, 0.05);
    this.stripe(18, 0.0, 2.4, 0.35, -0.05);
    this.stripe(22, 0.0, 2.0, 0.35, -0.05);

    // 6. EXPOSED RIVERBED GRANITE BOULDERS
    this.boulder(-10, 0.3, -8, 1.6, 0.9, 1.4, 0.4);
    this.boulder(-4, 0.4, -11, 2.2, 1.2, 1.8, 1.1);
    this.boulder(3, 0.35, -9, 1.4, 0.8, 1.2, -0.6);
    this.boulder(-12, 0.4, 3, 1.9, 1.1, 1.5, 0.8);
    this.boulder(9, 0.3, -1, 1.5, 0.9, 1.3, -0.3);
    this.boulder(5, 0.4, 8, 2.4, 1.3, 1.9, 0.5);
    this.boulder(-3, 0.3, 10, 1.3, 0.7, 1.1, 1.4);
    this.boulder(11, 0.35, 11, 1.8, 1.0, 1.5, -0.9);
  }
}
