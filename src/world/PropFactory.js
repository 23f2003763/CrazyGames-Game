import * as THREE from 'three';

/**
 * PropFactory: Procedural Low-Poly 3D Geometry and Materials
 * Clean, chunky, vibrant, and optimized for high-performance instanced rendering.
 */
export class PropFactory {
  constructor() {
    this.initMaterials();
    this.initGeometries();
  }

  initMaterials() {
    this.materials = {
      // Tree Foliage
      pineFoliageDark: new THREE.MeshStandardMaterial({
        color: 0x2e6b30,
        roughness: 0.8,
        flatShading: true,
      }),
      pineFoliageLight: new THREE.MeshStandardMaterial({
        color: 0x3d823f,
        roughness: 0.8,
        flatShading: true,
      }),
      oakFoliageGreen: new THREE.MeshStandardMaterial({
        color: 0x569634,
        roughness: 0.8,
        flatShading: true,
      }),
      oakFoliageAutumn: new THREE.MeshStandardMaterial({
        color: 0xc48227, // Autumn gold/orange
        roughness: 0.8,
        flatShading: true,
      }),
      birchFoliage: new THREE.MeshStandardMaterial({
        color: 0x7ebd38,
        roughness: 0.75,
        flatShading: true,
      }),
      deadWood: new THREE.MeshStandardMaterial({
        color: 0x483a30,
        roughness: 0.9,
        flatShading: true,
      }),

      // Trunks
      woodTrunk: new THREE.MeshStandardMaterial({
        color: 0x533d2c,
        roughness: 0.85,
        flatShading: true,
      }),
      birchTrunk: new THREE.MeshStandardMaterial({
        color: 0xdedacb,
        roughness: 0.8,
        flatShading: true,
      }),

      // Rocks
      rockGrey: new THREE.MeshStandardMaterial({
        color: 0x636a6e,
        roughness: 0.85,
        flatShading: true,
      }),
      rockMossy: new THREE.MeshStandardMaterial({
        color: 0x5a6d54,
        roughness: 0.88,
        flatShading: true,
      }),
      rockDark: new THREE.MeshStandardMaterial({
        color: 0x4b5054,
        roughness: 0.9,
        flatShading: true,
      }),

      // Foliage & Plants
      bushGreen: new THREE.MeshStandardMaterial({
        color: 0x46872f,
        roughness: 0.8,
        flatShading: true,
      }),
      bushAutumn: new THREE.MeshStandardMaterial({
        color: 0xa8712a,
        roughness: 0.8,
        flatShading: true,
      }),
      grassTuft: new THREE.MeshStandardMaterial({
        color: 0x6ab53e,
        roughness: 0.7,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
      flowerPetals: new THREE.MeshStandardMaterial({
        color: 0xf2a922, // Vibrant golden wildflower
        roughness: 0.5,
        flatShading: true,
      }),
      flowerCyan: new THREE.MeshStandardMaterial({
        color: 0x22c2d6, // Vibrant cyan wildflower
        roughness: 0.5,
        flatShading: true,
      }),

      // Environmental Debris
      concreteBarrier: new THREE.MeshStandardMaterial({
        color: 0x82888c,
        roughness: 0.85,
        flatShading: true,
      }),
      rustedMetal: new THREE.MeshStandardMaterial({
        color: 0x934a2e,
        roughness: 0.75,
        metalness: 0.2,
        flatShading: true,
      }),
      barrelYellow: new THREE.MeshStandardMaterial({
        color: 0xdfa01e,
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true,
      }),
      barrelRed: new THREE.MeshStandardMaterial({
        color: 0xb5352c,
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true,
      }),
      barrelBlue: new THREE.MeshStandardMaterial({
        color: 0x2c6cb5,
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true,
      }),
      woodenCrate: new THREE.MeshStandardMaterial({
        color: 0x8a6440,
        roughness: 0.85,
        flatShading: true,
      }),
      tireRubber: new THREE.MeshStandardMaterial({
        color: 0x26282a,
        roughness: 0.9,
        flatShading: true,
      }),
      signPlate: new THREE.MeshStandardMaterial({
        color: 0xdece3a,
        roughness: 0.4,
        flatShading: true,
      }),
      signPole: new THREE.MeshStandardMaterial({
        color: 0x6e7478,
        roughness: 0.6,
        metalness: 0.5,
        flatShading: true,
      }),
    };
  }

  initGeometries() {
    this.geometries = {
      // Pine Tree
      pineTrunk: new THREE.CylinderGeometry(0.35, 0.55, 3.2, 5),
      pineTierBottom: new THREE.ConeGeometry(2.4, 2.5, 6),
      pineTierMid: new THREE.ConeGeometry(1.9, 2.1, 6),
      pineTierTop: new THREE.ConeGeometry(1.4, 1.8, 5),

      // Oak Tree
      oakTrunk: new THREE.CylinderGeometry(0.45, 0.7, 3.0, 6),
      oakCanopyMain: new THREE.DodecahedronGeometry(2.2, 0),
      oakCanopySub: new THREE.DodecahedronGeometry(1.5, 0),

      // Birch Tree
      birchTrunk: new THREE.CylinderGeometry(0.25, 0.4, 4.2, 5),
      birchCanopy: new THREE.DodecahedronGeometry(1.6, 0),

      // Dead Tree
      deadTrunk: new THREE.CylinderGeometry(0.3, 0.5, 3.5, 5),
      deadBranch1: new THREE.CylinderGeometry(0.12, 0.22, 2.0, 4),
      deadBranch2: new THREE.CylinderGeometry(0.1, 0.18, 1.6, 4),

      // Boulders & Rocks
      boulderLarge: new THREE.DodecahedronGeometry(2.0, 1),
      boulderMed: new THREE.DodecahedronGeometry(1.2, 0),
      rockSmall: new THREE.DodecahedronGeometry(0.55, 0),

      // Bushes
      bushRound: new THREE.DodecahedronGeometry(1.1, 0),
      bushCluster: new THREE.DodecahedronGeometry(0.8, 0),

      // Grass & Flowers
      grassBlade: new THREE.ConeGeometry(0.12, 0.9, 3),
      flowerHead: new THREE.DodecahedronGeometry(0.22, 0),

      // Props / Debris
      jerseyBarrier: this.createJerseyBarrierGeometry(),
      guardrailBeam: new THREE.BoxGeometry(4.0, 0.45, 0.15),
      guardrailPost: new THREE.BoxGeometry(0.2, 1.2, 0.2),
      metalBarrel: new THREE.CylinderGeometry(0.5, 0.5, 1.3, 8),
      woodenCrate: new THREE.BoxGeometry(1.1, 1.1, 1.1),
      tire: new THREE.TorusGeometry(0.45, 0.22, 6, 8),
      signPole: new THREE.CylinderGeometry(0.08, 0.08, 2.6, 5),
      signPlateDiamond: new THREE.BoxGeometry(0.9, 0.9, 0.06),
      signPlateRect: new THREE.BoxGeometry(1.1, 0.7, 0.06),
      fencePost: new THREE.CylinderGeometry(0.12, 0.15, 1.6, 5),
      fenceRail: new THREE.BoxGeometry(2.8, 0.15, 0.08),
      sandbag: new THREE.BoxGeometry(0.9, 0.35, 0.55),
    };
  }

  createJerseyBarrierGeometry() {
    // Low-poly concrete road barrier
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0);
    shape.lineTo(0.4, 0);
    shape.lineTo(0.32, 0.3);
    shape.lineTo(0.16, 0.9);
    shape.lineTo(-0.16, 0.9);
    shape.lineTo(-0.32, 0.3);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 2.2,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 1,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }
}
