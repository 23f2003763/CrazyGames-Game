import * as THREE from 'three';

function mat(color, roughness = 0.8, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function waterMat(color, roughness, opacity) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0.05,
    transparent: true, opacity, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
}

function groundMat(color, roughness = 0.94) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0.02, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
}

export const SCALE = {
  roadWidth: 10.5,
  doorHeight: 2.4,
  doorWidth: 1.6,
  buildingStoryHeight: 3.2,
  watchtowerHeight: 8.0,
  fenceHeight: 2.2,
  fencePostSpacing: 2.5,
  vehicleLength: 4.2,
  vehicleWidth: 2.0,
  vehicleHeight: 1.8,
  barrelHeight: 1.2,
  barrelRadius: 0.42,
  crateSize: 1.1,
  combatLaneWidth: 8.0,
  cameraReadableMinSpacing: 3.0,
  sandbagWidth: 1.1,
  sandbagHeight: 0.36,
  signPostHeight: 3.2,
  utilityPoleHeight: 8.5,
};

export const PALETTE = {
  // GROUND
  dirt: () => mat(0x604329, 0.94),
  asphalt: () => mat(0x34383c, 0.90),
  concrete: () => mat(0x777568, 0.88),
  mud: () => mat(0x76502e, 0.94),
  shallowWater: () => waterMat(0x247a76, 0.12, 0.88),
  scorch: () => mat(0x252526, 0.95),
  crackedClay: () => mat(0x6e5236, 0.92),
  wornGrass: () => mat(0x4a6e28, 0.88),

  // STRUCTURES  
  militaryOlive: () => mat(0x405c2c, 0.82),
  rustOrange: () => mat(0xa94f25, 0.86, 0.15),
  hazardYellow: () => mat(0xe7b52c, 0.72),
  fadedRed: () => mat(0x982818, 0.78, 0.1),
  charcoal: () => mat(0x181a1c, 0.95),

  // SURVIVOR
  survivorWood: () => mat(0x5c4228, 0.92),
  warmTimber: () => mat(0x765134, 0.90),
  canvasTarp: () => mat(0x8a7e62, 0.88),
  blueTarp: () => mat(0x2a5c7a, 0.82),
  rope: () => mat(0xb89e68, 0.85),

  // METAL
  weatheredMetal: () => mat(0x4a4e52, 0.75, 0.35),
  corrugatedMetal: () => mat(0x35383a, 0.75, 0.35),
  tireRubber: () => mat(0x141517, 0.94),
  glass: () => mat(0x142526, 0.32, 0.05),

  // STONE
  rockGrey: () => mat(0x585852, 0.86),
  sandbag: () => mat(0x826e48, 0.96),

  // ACCENTS
  signGreen: () => mat(0x126834, 0.55),
  signWhite: () => mat(0xe8e8e8, 0.45),
  yellowStripe: () => mat(0xdfab22, 0.70),
  whiteStripe: () => mat(0xd4d0c8, 0.65),
};

export const LOCATION_COLORS = {
  relay: { primary: 0xd4a832, accent: 0x8b5e3c, warm: 0xff8a20 },
  gasStation: { primary: 0xc84528, accent: 0x2a6e4a, sign: 0xf5b812 },
  brokenSpan: { primary: 0x247a76, accent: 0x6e5236, bridge: 0x484a44 },
  camp: { primary: 0x8a7e62, accent: 0x2a5c7a, fire: 0xff6a20 },
  checkpoint: { primary: 0x405c2c, accent: 0xe7b52c, danger: 0xa94f25 }
};
