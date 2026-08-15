import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

export class MilitaryArenaGround {
  constructor(root) {
    this.group = root;

    this.materials = {
      dirt: this.mat(0x604329),
      asphalt: this.mat(0x34383c),
      concrete: this.mat(0x817d6c),
      scorch: this.mat(0x252526),
      mud: this.mat(0x76502e),
      dust: this.mat(0x9b8058),
      yellow: this.mat(0xe0ad24),
      red: this.mat(0xa63a28)
    };

    this.build();
  }

  mat(color) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.94,
      metalness: 0.02,
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
    
    // Tag it for WalkableSurfaceSystem
    mesh.userData.isWalkable = true;
    mesh.userData.surfaceType = 'ground';

    this.group.add(mesh);
    return mesh;
  }

  stripe(x, z, sx, sz, rotation = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, 0.035, sz),
      this.materials.yellow
    );

    mesh.position.set(x, 0.16, z);
    mesh.rotation.y = rotation;
    mesh.receiveShadow = true;

    this.group.add(mesh);
  }

  crater(x, z, sx, sz, rotation = 0) {
    const geo = new THREE.CircleGeometry(1, 11);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, this.materials.scorch);

    mesh.position.set(x, 0.14, z);
    mesh.scale.set(sx, 1, sz);
    mesh.rotation.y = rotation;

    this.group.add(mesh);
  }

  build() {
    // IRREGULAR OUTER BATTLEFIELD
    this.polygon(
      'Arena_Base_Dirt',
      [
        [-21,-15], [-17,-22], [-7,-21], [0,-23],
        [10,-20], [19,-17], [22,-7], [20,2],
        [22,12], [15,19], [6,21], [-3,19],
        [-12,21], [-20,15], [-22,6], [-19,-2]
      ],
      this.materials.dirt,
      0.02
    );

    // CENTRAL KILLZONE — large but NOT rectangular
    this.polygon(
      'Arena_Central_Asphalt',
      [
        [-11,-9], [-4,-12], [5,-11], [11,-7],
        [12,0], [9,7], [3,10], [-5,9],
        [-11,5], [-13,-2]
      ],
      this.materials.asphalt,
      0.07
    );

    // SOUTH MAIN ROAD APPROACH
    this.polygon(
      'Lane_MainRoad',
      [
        [-5,-23], [6,-22], [7,-9],
        [4,-7], [-4,-8], [-7,-13]
      ],
      this.materials.asphalt,
      0.08
    );

    // NORTH-WEST BREACH LANE
    this.polygon(
      'Lane_ForestBreach',
      [
        [-21,10], [-17,19], [-9,18],
        [-5,9], [-8,6], [-15,6]
      ],
      this.materials.mud,
      0.075
    );

    // NORTH-EAST CONTAINER LANE
    this.polygon(
      'Lane_Container',
      [
        [6,8], [13,18], [21,14],
        [19,4], [12,0], [8,2]
      ],
      this.materials.dust,
      0.072
    );

    // BUNKER PAD
    this.polygon(
      'Bunker_Pad',
      [
        [-20,3], [-18,14], [-8,14],
        [-5,8], [-8,3], [-14,1]
      ],
      this.materials.concrete,
      0.085
    );

    // EAST DAMAGED HARDSTAND
    this.polygon(
      'Container_Pad',
      [
        [8,-4], [18,-6], [20,3],
        [15,8], [9,5], [6,1]
      ],
      this.materials.concrete,
      0.082
    );

    // SCORCHED TRANSITION PATCHES
    this.polygon(
      'BurnPatch_A',
      [[-13,-8],[-8,-10],[-5,-6],[-7,-2],[-12,-3]],
      this.materials.scorch,
      0.11
    );

    this.polygon(
      'BurnPatch_B',
      [[8,8],[14,9],[16,14],[11,16],[6,13]],
      this.materials.scorch,
      0.105
    );

    // BLAST CRATERS
    this.crater(-2, -1, 3.4, 2.5, 0.3);
    this.crater(6, -7, 2.2, 1.5, -0.4);
    this.crater(-11, 10, 2.4, 1.7, 0.6);

    // BROKEN ROAD CENTER MARKINGS
    this.stripe(0.3, -20, 0.38, 2.2, -0.05);
    this.stripe(0.1, -16.5, 0.38, 1.8, -0.05);
    this.stripe(-0.1, -13.2, 0.38, 1.3, -0.05);
  }
}
