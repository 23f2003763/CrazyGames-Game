import * as THREE from 'three';

/**
 * Map Configuration & Layout Data
 * Large continuous world with winding cracked highway, dirt trail network,
 * multiple biomes, elevation changes, and designated future building clearings.
 */
export const MAP_CONFIG = {
  width: 280,
  depth: 220,
  gridResolutionX: 200,
  gridResolutionZ: 160,
  roadWidth: 10.5,
  dirtPathWidth: 5.5,
};

// Points defining the main cracked highway
export const MAIN_ROAD_POINTS = [
  new THREE.Vector3(-125, 3.2, 95),
  new THREE.Vector3(-95, 2.5, 70),
  new THREE.Vector3(-60, 1.8, 48),
  new THREE.Vector3(-25, 0.9, 32),
  new THREE.Vector3(-5, 0.4, 22),   // Ravine crossing area
  new THREE.Vector3(18, 1.0, 10),
  new THREE.Vector3(45, 1.6, -8),
  new THREE.Vector3(68, 2.2, -35),
  new THREE.Vector3(90, 2.8, -62),
  new THREE.Vector3(125, 3.5, -88),
];

// Branching dirt paths
export const DIRT_PATHS = [
  // Branch 1: Path to Gas Station Clearing (North-West)
  [
    new THREE.Vector3(-60, 1.8, 48),
    new THREE.Vector3(-62, 1.9, 20),
    new THREE.Vector3(-66, 2.0, -10),
    new THREE.Vector3(-68, 2.2, -36),
  ],
  // Branch 2: Path to Survivor Camp Clearing (North)
  [
    new THREE.Vector3(18, 1.0, 10),
    new THREE.Vector3(22, 1.6, -15),
    new THREE.Vector3(28, 2.4, -38),
    new THREE.Vector3(36, 3.0, -62),
  ],
  // Branch 3: Path to Overgrown Farm Clearing (South-East)
  [
    new THREE.Vector3(45, 1.6, -8),
    new THREE.Vector3(52, 1.4, 15),
    new THREE.Vector3(62, 1.6, 32),
    new THREE.Vector3(78, 1.8, 48),
  ],
  // Branch 4: Path to Military Checkpoint (North-East Perimeter)
  [
    new THREE.Vector3(90, 2.8, -62),
    new THREE.Vector3(98, 2.9, -70),
    new THREE.Vector3(108, 3.2, -78),
  ],
  // Branch 5: Scenic Creek loop trail (South)
  [
    new THREE.Vector3(-5, 0.4, 22),
    new THREE.Vector3(-8, 0.2, 45),
    new THREE.Vector3(-15, 0.3, 68),
  ]
];

// Designated empty clearings reserved for future locations / buildings
export const CLEARINGS = [
  {
    id: 'start',
    name: '1. Road Head Overlook',
    x: -95,
    z: 70,
    radius: 20,
    description: 'Elevated highway entrance with broken barricades and perimeter vista',
    targetCameraPos: new THREE.Vector3(-95, 0, 70),
  },
  {
    id: 'gasStation',
    name: '2. Gas Station Clearing',
    x: -68,
    z: -36,
    radius: 26,
    description: 'Wide flat gravel & asphalt lot reserved for gas station, garage, and pump canopy',
    targetCameraPos: new THREE.Vector3(-68, 0, -36),
  },
  {
    id: 'ravine',
    name: '3. Dry Riverbed Crossing',
    x: -5,
    z: 22,
    radius: 22,
    description: 'Cracked bridge crossing sunken gravel creek with boulders and willow trees',
    targetCameraPos: new THREE.Vector3(-5, 0, 22),
  },
  {
    id: 'camp',
    name: '4. Survivor Camp Clearing',
    x: 36,
    z: -62,
    radius: 28,
    description: 'Defensible forested clearing reserved for survivor shelters and campfires',
    targetCameraPos: new THREE.Vector3(36, 0, -62),
  },
  {
    id: 'checkpoint',
    name: '5. Military Checkpoint',
    x: 100,
    z: -72,
    radius: 25,
    description: 'Fortified perimeter road clearing reserved for command bunker & gate',
    targetCameraPos: new THREE.Vector3(100, 0, -72),
  },
  {
    id: 'farm',
    name: '6. Overgrown Farm Clearing',
    x: 78,
    z: 48,
    radius: 30,
    description: 'Rolling rustic meadow clearing reserved for barn, windmill, and crops',
    targetCameraPos: new THREE.Vector3(78, 0, 48),
  },
];

// Road Spline object for spatial queries
export const roadSpline = new THREE.CatmullRomCurve3(MAIN_ROAD_POINTS, false, 'centripetal', 0.25);
export const dirtSplines = DIRT_PATHS.map(pts => new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.25));

/**
 * Calculates raw terrain elevation at world coordinates (x, z)
 */
export function getTerrainHeight(x, z) {
  // Edge mountain boundary / perimeter barrier
  const halfW = MAP_CONFIG.width * 0.48;
  const halfD = MAP_CONFIG.depth * 0.48;
  const edgeDistX = Math.max(0, Math.abs(x) - (halfW - 25));
  const edgeDistZ = Math.max(0, Math.abs(z) - (halfD - 25));
  const edgeFactor = Math.pow(Math.max(edgeDistX / 25, edgeDistZ / 25), 1.6) * 12.0;

  // Rolling hills
  let h = Math.sin(x * 0.028 + z * 0.015) * 2.2 +
          Math.cos(x * 0.018 - z * 0.024) * 1.8 +
          Math.sin(x * 0.06 + z * 0.05) * 0.6;

  // Sunken dry riverbed feature (running roughly north-south around x = -5..-10)
  const riverDist = Math.abs(x - (-8 + Math.sin(z * 0.04) * 12));
  if (riverDist < 18) {
    const riverDepression = (1 - (riverDist / 18)) * 3.2;
    h -= riverDepression;
  }

  // Smooth flat flattening along main road
  const roadSample = getClosestPointOnSpline(roadSpline, x, z, 30);
  const roadDist = Math.hypot(x - roadSample.point.x, z - roadSample.point.z);
  if (roadDist < MAP_CONFIG.roadWidth * 1.3) {
    const blend = Math.max(0, 1 - (roadDist / (MAP_CONFIG.roadWidth * 1.3)));
    const targetRoadH = roadSample.point.y;
    h = THREE.MathUtils.lerp(h, targetRoadH, blend * 0.9);
  }

  // Smooth flat flattening for designated clearing zones
  for (const cl of CLEARINGS) {
    const clDist = Math.hypot(x - cl.x, z - cl.z);
    if (clDist < cl.radius) {
      const clBlend = Math.cos((clDist / cl.radius) * Math.PI * 0.5);
      // Determine nominal height for clearing
      const baseClH = (cl.id === 'camp' ? 3.0 : cl.id === 'start' ? 2.5 : cl.id === 'gasStation' ? 2.2 : cl.id === 'farm' ? 1.7 : 2.8);
      h = THREE.MathUtils.lerp(h, baseClH, clBlend * 0.85);
    }
  }

  return h + edgeFactor;
}

/**
 * Fast helper to find closest point on spline
 */
export function getClosestPointOnSpline(spline, x, z, samples = 30) {
  let closestDistSq = Infinity;
  let closestPoint = new THREE.Vector3();
  let closestT = 0;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = spline.getPoint(t);
    const dSq = (pt.x - x) * (pt.x - x) + (pt.z - z) * (pt.z - z);
    if (dSq < closestDistSq) {
      closestDistSq = dSq;
      closestPoint.copy(pt);
      closestT = t;
    }
  }

  // Sub-refine around closestT
  const step = 1 / (samples * 4);
  const startT = Math.max(0, closestT - step * 2);
  const endT = Math.min(1, closestT + step * 2);
  for (let t = startT; t <= endT; t += step * 0.5) {
    const pt = spline.getPoint(t);
    const dSq = (pt.x - x) * (pt.x - x) + (pt.z - z) * (pt.z - z);
    if (dSq < closestDistSq) {
      closestDistSq = dSq;
      closestPoint.copy(pt);
      closestT = t;
    }
  }

  return { point: closestPoint, t: closestT, distance: Math.sqrt(closestDistSq) };
}
