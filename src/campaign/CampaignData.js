import * as THREE from 'three';

/**
 * CampaignData: Authoritative configuration for all 8-10 Chapters
 * and their respective linear semi-open sectors.
 */
export const CAMPAIGN_CHAPTERS = [
  {
    id: 'chapter_01',
    name: 'Signal Lost',
    description: 'Investigate the dead comms line and escape through the outer road checkpoint.',
    targetDurationMinutes: 25,
    sectors: [
      {
        id: 'sector_01_relay',
        name: 'The Relay (Outpost Start)',
        bounds: { minX: -35, maxX: 35, minZ: -25, maxZ: 65 },
        entryTriggerZ: -20,
        exitTriggerZ: 62,
        spawnPos: new THREE.Vector3(0.0, 0.0, -8.0),
        spawnYaw: 0.0, // Face +Z along the exit road
      },
      {
        id: 'sector_02_highway',
        name: 'Dead Highway 84',
        bounds: { minX: -36, maxX: 36, minZ: 65, maxZ: 175 },
        entryTriggerZ: 65,
        exitTriggerZ: 172,
        spawnPos: new THREE.Vector3(0.0, 0.0, 68.0),
        spawnYaw: 0.0,
      },
      {
        id: 'sector_03_octane',
        name: 'Octane Mart Crossroads',
        bounds: { minX: -38, maxX: 38, minZ: 175, maxZ: 260 },
        entryTriggerZ: 175,
        exitTriggerZ: 255,
        spawnPos: new THREE.Vector3(0.0, 0.0, 180.0),
        spawnYaw: 0.0,
      }
    ]
  },
  // Future Chapter Stubs (Extensible 5-7h Campaign Roadmap)
  {
    id: 'chapter_02',
    name: 'The Broken Span',
    description: 'Traverse the dry riverbed ravine and locate salvage in the collapsed bridge underbelly.',
    targetDurationMinutes: 30,
    sectors: []
  },
  {
    id: 'chapter_03',
    name: 'Ashen Pines',
    description: 'Wilderness trek through wildfire ruins to reach the ranger fire lookout.',
    targetDurationMinutes: 35,
    sectors: []
  },
  {
    id: 'chapter_04',
    name: 'Fortress Omega',
    description: 'Assault on the automated military exclusion checkpoint.',
    targetDurationMinutes: 40,
    sectors: []
  },
  {
    id: 'chapter_05',
    name: 'Overgrown Silos',
    description: 'Farmstead supply lines, barn defense, and windmill power restoration.',
    targetDurationMinutes: 35,
    sectors: []
  },
  {
    id: 'chapter_06',
    name: 'Sunken Metro',
    description: 'Dark subterranean tunnel navigation with flashlight and sound-sensitive mutants.',
    targetDurationMinutes: 45,
    sectors: []
  },
  {
    id: 'chapter_07',
    name: 'Substation Zero',
    description: 'Reactivating the regional grid transformer during an escalating storm.',
    targetDurationMinutes: 40,
    sectors: []
  },
  {
    id: 'chapter_08',
    name: 'Evac Corridor',
    description: 'Final highway convoy defense set-piece to reach the coastal extraction point.',
    targetDurationMinutes: 45,
    sectors: []
  }
];
