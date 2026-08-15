import * as THREE from 'three';

/**
 * SectorDressingData: 100% deterministic, authored placement tables for the
 * campaign level slice.
 * 
 * Rules:
 * - NO Math.random() in sector definitions.
 * - Buildings & man-made props are level (pitch/roll = 0).
 * - Rocks have bottom embedded ~0.04m into flat ground.
 * - Trees are positioned outside the playable corridor (camera line-of-sight is preserved).
 */
export const SECTOR_DRESSING = {
  // =========================================================================
  // SECTOR 01: THE RELAY (Z: -20 .. 65)
  // =========================================================================
  sector_01_relay: {
    buildings: [
      // Ranger Cabin Hub Base (Level, sits at Y=0)
      { id: 'relay_cabin', model: 'RelayCabin', x: -8.5, y: 0.0, z: -4.0, rotY: 0.0, scale: 1.0 },
      // Radio Lattice Mast
      { id: 'relay_mast', model: 'RadioMast', x: 8.5, y: 0.0, z: -6.0, rotY: 0.0, scale: 1.0 },
      // Fortified Security Gate at exit
      { id: 'relay_gate', model: 'FenceGateLarge', x: 0.0, y: 0.0, z: 50.0, rotY: 0.0, scale: 1.0 },
      // Gate Power Box (Level 1 Mission Objective)
      { id: 'gate_power_box', model: 'FencePowerBox', x: 3.8, y: 0.0, z: 48.5, rotY: Math.PI * 0.95, scale: 1.0 },
    ],

    npc: [
      // Mara - Relay Engineer NPC
      { id: 'mara', name: 'Mara', x: -3.2, y: 0.0, z: -3.5, rotY: Math.PI * 0.45 },
    ],

    loot: [
      // Road Supply Kit Workbench / Chest (Mission 1 Objective)
      { id: 'relay_starter_chest', x: -4.8, y: 0.0, z: -3.2, rotY: 0.0, isQuestChest: true },
      // Courtyard tool shelf
      { id: 'relay_bonus_crate', x: 6.2, y: 0.0, z: -4.5, rotY: -0.3, isQuestChest: false },
    ],

    props: [
      // Campfire with stone ring
      { model: 'Campfire', x: 0.0, y: 0.0, z: -4.0, rotY: 0.0 },
      // Diesel Generator
      { model: 'Generator', x: -10.5, y: 0.0, z: 8.0, rotY: 0.2 },
      // Water Cistern
      { model: 'WaterTower', x: 9.5, y: 0.0, z: 12.0, rotY: -0.4 },
      // Courtyard Wooden Pallet with Barrels
      { model: 'Pallet', x: 5.5, y: 0.0, z: 18.0, rotY: 0.1 },
      { model: 'Barrel', x: 5.8, y: 0.14, z: 18.2, rotY: 0.0 },
      // Perimeter Streetlights
      { model: 'StreetLights', x: -5.0, y: 0.0, z: 48.0, rotY: Math.PI * 0.25 },
    ],

    fences: [
      // West perimeter (X = -18)
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: -10.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: -2.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 6.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 14.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 22.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 30.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 38.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -18.0, y: 0.0, z: 46.0, rotY: Math.PI / 2 },

      // East perimeter (X = +18)
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: -10.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: -2.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 6.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 14.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 22.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 30.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 38.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 18.0, y: 0.0, z: 46.0, rotY: Math.PI / 2 },

      // South back wall (Z = -14)
      { model: 'FenceStraight_8m', x: -10.0, y: 0.0, z: -14.0, rotY: 0.0 },
      { model: 'FenceStraight_8m', x: -2.0, y: 0.0, z: -14.0, rotY: 0.0 },
      { model: 'FenceStraight_8m', x: 6.0, y: 0.0, z: -14.0, rotY: 0.0 },
      { model: 'FenceStraight_8m', x: 14.0, y: 0.0, z: -14.0, rotY: 0.0 },

      // Front wall wings flanking gate (Z = 50)
      { model: 'FenceStraight_8m', x: -11.0, y: 0.0, z: 50.0, rotY: 0.0 },
      { model: 'FenceStraight_8m', x: 11.0, y: 0.0, z: 50.0, rotY: 0.0 },
    ],

    trees: [
      // Dense forest backdrop outside west wall
      { model: 'Pine_A', x: -24.0, y: 0.0, z: -8.0, scale: 1.1, rotY: 0.4 },
      { model: 'Pine_B', x: -26.5, y: 0.0, z: 4.0, scale: 1.0, rotY: 1.2 },
      { model: 'Pine_C', x: -23.0, y: 0.0, z: 18.0, scale: 0.95, rotY: 2.1 },
      { model: 'Broadleaf_A', x: -27.0, y: 0.0, z: 32.0, scale: 1.05, rotY: 0.8 },
      // Forest backdrop outside east wall
      { model: 'Pine_A', x: 25.0, y: 0.0, z: -6.0, scale: 1.0, rotY: 0.7 },
      { model: 'Broadleaf_B', x: 27.0, y: 0.0, z: 10.0, scale: 1.0, rotY: 1.8 },
      { model: 'Pine_B', x: 24.5, y: 0.0, z: 26.0, scale: 1.15, rotY: 2.9 },
      { model: 'Pine_C', x: 26.0, y: 0.0, z: 42.0, scale: 0.9, rotY: 0.3 },
    ],

    rocks: [
      { model: 'Rock_Large_A', x: -22.0, y: -0.04, z: -12.0, scale: 1.1, rotY: 0.3 },
      { model: 'Rock_Medium_B', x: -20.0, y: -0.04, z: 10.0, scale: 1.0, rotY: 1.1 },
      { model: 'Rock_Large_B', x: 22.0, y: -0.04, z: -10.0, scale: 1.2, rotY: -0.5 },
      { model: 'Rock_Medium_A', x: 21.0, y: -0.04, z: 34.0, scale: 0.9, rotY: 0.8 },
    ]
  },

  // =========================================================================
  // SECTOR 02: DEAD HIGHWAY (Z: 65 .. 175)
  // =========================================================================
  sector_02_highway: {
    fences: [
      // Left Security Fence along X = -28
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 70.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 78.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 86.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 94.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 102.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 110.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 118.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 126.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 134.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 142.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 150.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 158.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 166.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -28.0, y: 0.0, z: 174.0, rotY: Math.PI / 2 },

      // Right Security Fence along X = +28
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 70.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 78.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 86.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 94.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 102.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 110.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 118.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 126.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 134.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 142.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 150.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 158.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 166.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 28.0, y: 0.0, z: 174.0, rotY: Math.PI / 2 },
    ],

    // OPTIONAL SIDE CACHE (Z: 110, X: +16)
    loot: [
      { id: 'highway_side_cache', x: 15.5, y: 0.0, z: 112.0, rotY: 0.4, isQuestChest: false },
      { id: 'convoy_salvage_chest', x: -2.8, y: 0.0, z: 169.5, rotY: -0.2, isQuestChest: false },
    ],

    // DELIBERATE ROAD SET-PIECES
    props: [
      // Beat 1: Relay Exit Junction
      { model: 'StreetLights', x: -6.5, y: 0.0, z: 66.0, rotY: Math.PI * 0.2 },
      { model: 'TrafficBarrier_1', x: 5.5, y: 0.0, z: 72.0, rotY: 0.3 },

      // Beat 2: Optional Side Cache Dressing (Z: 110, X: +16)
      { model: 'Pallet', x: 15.0, y: 0.0, z: 111.5, rotY: 0.2 },
      { model: 'TrafficCone_1', x: 13.5, y: 0.0, z: 110.0, rotY: 0.0 },
      { model: 'Barrel', x: 17.0, y: 0.0, z: 113.2, rotY: 0.0 },
      { model: 'StreetLights', x: 6.5, y: 0.0, z: 118.0, rotY: -Math.PI * 0.4 },

      // Beat 3: Wrecked Convoy Set-Piece (Z: 160 - 170) -> LEVEL 1 ENDPOINT
      { model: 'Vehicle_Pickup', x: 1.8, y: 0.0, z: 166.0, rotY: -0.35, scale: 0.9 },
      { model: 'TrafficBarrier_1', x: -3.5, y: 0.0, z: 163.0, rotY: 0.2 },
      { model: 'TrafficBarrier_2', x: 3.8, y: 0.0, z: 170.0, rotY: -0.4 },
      { model: 'Wheels_Stack', x: -4.5, y: 0.0, z: 167.0, rotY: 0.0 },
      { model: 'TrashBag_1', x: -2.0, y: 0.0, z: 164.0, rotY: 0.5 },
      { model: 'TownSign', x: 7.2, y: 0.0, z: 162.0, rotY: -Math.PI * 0.45 },
    ],

    trees: [
      // Left tree line behind electric fence
      { model: 'Pine_A', x: -34.0, y: 0.0, z: 75.0, scale: 1.1, rotY: 0.5 },
      { model: 'Broadleaf_A', x: -36.0, y: 0.0, z: 95.0, scale: 1.0, rotY: 1.3 },
      { model: 'Pine_B', x: -33.5, y: 0.0, z: 120.0, scale: 1.15, rotY: 2.2 },
      { model: 'DeadTree_A', x: -35.0, y: 0.0, z: 145.0, scale: 0.95, rotY: 0.7 },
      { model: 'Pine_C', x: -33.0, y: 0.0, z: 165.0, scale: 1.05, rotY: 3.1 },

      // Right tree line behind electric fence
      { model: 'Pine_B', x: 34.0, y: 0.0, z: 80.0, scale: 1.0, rotY: 0.9 },
      { model: 'Pine_A', x: 36.5, y: 0.0, z: 105.0, scale: 1.1, rotY: 1.6 },
      { model: 'Broadleaf_B', x: 33.0, y: 0.0, z: 130.0, scale: 1.0, rotY: 0.4 },
      { model: 'Pine_C', x: 35.5, y: 0.0, z: 155.0, scale: 1.05, rotY: 2.7 },
      { model: 'DeadTree_B', x: 34.0, y: 0.0, z: 172.0, scale: 0.9, rotY: 1.1 },
    ],

    rocks: [
      { model: 'Rock_Large_A', x: -31.0, y: -0.04, z: 85.0, scale: 1.1, rotY: 0.4 },
      { model: 'Rock_Medium_A', x: -30.0, y: -0.04, z: 135.0, scale: 0.95, rotY: 1.8 },
      { model: 'Rock_Large_B', x: 32.0, y: -0.04, z: 90.0, scale: 1.0, rotY: -0.3 },
      { model: 'Rock_Medium_C', x: 30.5, y: -0.04, z: 148.0, scale: 1.05, rotY: 2.1 },
    ]
  },

  // =========================================================================
  // SECTOR 03: OCTANE MART (Z: 175 .. 260)
  // =========================================================================
  sector_03_octane: {
    buildings: [
      // Octane Mart Convenience Store & Canopy
      { id: 'gas_station_landmark', model: 'AbandonedGasStation', x: 0.0, y: 0.0, z: 235.0, rotY: 0.0, scale: 1.0 }
    ],

    fences: [
      // Left Security Fence
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 182.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 190.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 198.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 206.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 214.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 222.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 230.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 238.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 246.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: -30.0, y: 0.0, z: 254.0, rotY: Math.PI / 2 },

      // Right Security Fence
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 182.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 190.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 198.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 206.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 214.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 222.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 230.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 238.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 246.0, rotY: Math.PI / 2 },
      { model: 'FenceStraight_8m', x: 30.0, y: 0.0, z: 254.0, rotY: Math.PI / 2 },
    ],

    loot: [
      { id: 'octane_pump_crate', x: 4.5, y: 0.0, z: 228.0, rotY: 0.2, isQuestChest: false },
      { id: 'octane_store_shelf', x: -5.5, y: 0.0, z: 242.0, rotY: 0.0, isQuestChest: false },
    ],

    props: [
      // Abandoned Sports Coupe in Forecourt
      { model: 'Vehicle_Sports', x: -6.2, y: 0.0, z: 226.0, rotY: 0.45, scale: 0.9 },
      // Roadside Totem Sign
      { model: 'TownSign', x: 8.5, y: 0.0, z: 212.0, rotY: -Math.PI * 0.4 },
      // Dumpster & trash bags
      { model: 'Container_Green', x: 12.0, y: 0.0, z: 242.0, rotY: -0.1, scale: 0.85 },
      { model: 'TrashBag_2', x: 10.2, y: 0.0, z: 240.0, rotY: 0.3 },
    ],

    trees: [
      { model: 'Pine_A', x: -36.0, y: 0.0, z: 195.0, scale: 1.1, rotY: 0.4 },
      { model: 'Broadleaf_A', x: -35.0, y: 0.0, z: 225.0, scale: 1.05, rotY: 1.7 },
      { model: 'Pine_B', x: 36.0, y: 0.0, z: 200.0, scale: 1.0, rotY: 0.8 },
      { model: 'Pine_C', x: 35.0, y: 0.0, z: 235.0, scale: 1.1, rotY: 2.4 },
    ],

    rocks: [
      { model: 'Rock_Large_A', x: -33.0, y: -0.04, z: 210.0, scale: 1.1, rotY: 0.2 },
      { model: 'Rock_Large_B', x: 33.0, y: -0.04, z: 220.0, scale: 1.0, rotY: -0.4 },
    ]
  }
};
