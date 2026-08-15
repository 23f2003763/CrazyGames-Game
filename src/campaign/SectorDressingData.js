import * as THREE from 'three';

/**
 * SectorDressingData: Authored placement coordinates for ARCFALL PROTOCOL Level 1 (Wake Signal).
 * All coordinates are specified in LOCAL CAMPAIGN SPACE (localX, localZ).
 * local +Z = visual upward movement on screen.
 */
export const SECTOR_DRESSING = {
  // =========================================================================
  // SECTOR 01: THE RELAY & CALIBRATION YARD (local Z: -20 .. 45)
  // =========================================================================
  sector_01_relay: {
    buildings: [
      // Ranger Relay Cabin (Base Hub)
      { id: 'relay_cabin', model: 'RelayCabin', localX: -7.5, localZ: 20.0, rotY: 0.0, scale: 1.0 },
      // Signal Array Mast
      { id: 'relay_mast', model: 'RadioMast', localX: 7.5, localZ: 24.0, rotY: 0.0, scale: 1.0 },
      // North Exit Security Gate (local Z = 36.0)
      { id: 'relay_gate', model: 'FenceGateLarge', localX: 0.0, localZ: 36.0, rotY: 0.0, scale: 1.0 },
      // Gate Terminal Power Box
      { id: 'gate_power_box', model: 'FencePowerBox', localX: 3.6, localZ: 35.0, rotY: 0.0, scale: 1.0 },
      // Signal Console Terminal
      { id: 'signal_console', model: 'Signal_Repeater_Console', localX: 3.8, localZ: 22.0, rotY: Math.PI * 0.8, scale: 0.85 }
    ],

    npc: [
      // Mara - Field Engineer & Comms Coordinator
      { id: 'mara', name: 'Mara', localX: -3.5, localZ: 22.0, rotY: Math.PI * 0.4 }
    ],

    loot: [
      // Calibration Yard Weapon Rack / Chest
      { id: 'relay_starter_chest', localX: -4.5, localZ: 8.0, rotY: 0.0, isQuestChest: true }
    ],

    props: [
      // Clean, intentional environmental set pieces
      { model: 'Container_Red', localX: -10.0, localZ: 14.0, rotY: 0.2, scale: 0.6 },
      { model: 'WaterTower', localX: 9.0, localZ: 14.0, rotY: -0.3, scale: 0.9 },
      { model: 'Pallet', localX: 5.5, localZ: 8.0, rotY: 0.1 },
      { model: 'Barrel', localX: 5.8, localZ: 8.2, rotY: 0.0 },
      { model: 'CinderBlock', localX: -4.0, localZ: -2.0, rotY: 0.4 },
      { model: 'StreetLights', localX: -5.0, localZ: 34.0, rotY: Math.PI * 0.25 }
    ]
  },

  // =========================================================================
  // SECTOR 02: FOREST SERVICE CORRIDOR (local Z: 45 .. 125)
  // =========================================================================
  sector_02_corridor: {
    loot: [
      // Optional Side Salvage Cache (local X: +14.0, local Z: 65.0)
      { id: 'salvage_cache_1', localX: 14.0, localZ: 65.0, rotY: 0.3, isQuestChest: false }
    ],

    props: [
      // Trail Beat 1: North Gate Crossing
      { model: 'StreetLights', localX: -6.0, localZ: 48.0, rotY: Math.PI * 0.2 },
      { model: 'TrafficBarrier_1', localX: 5.0, localZ: 52.0, rotY: 0.3 },

      // Trail Beat 2: Side Cache Dressing
      { model: 'Pallet', localX: 13.5, localZ: 64.5, rotY: 0.2 },
      { model: 'TrafficCone_1', localX: 12.0, localZ: 63.5, rotY: 0.0 },
      { model: 'Barrel', localX: 15.0, localZ: 66.0, rotY: 0.0 },

      // Trail Beat 3: Ambush Zone Wreckage (local Z: 90 .. 105)
      { model: 'TrafficBarrier_1', localX: -4.0, localZ: 90.0, rotY: 0.2 },
      { model: 'TrafficBarrier_2', localX: 4.0, localZ: 96.0, rotY: -0.4 },
      { model: 'Wheels_Stack', localX: -5.0, localZ: 94.0, rotY: 0.0 },
      { model: 'TrashBag_1', localX: -2.5, localZ: 92.0, rotY: 0.5 }
    ]
  },

  // =========================================================================
  // SECTOR 03: DEAD REPEATER OUTPOST (local Z: 125 .. 165)
  // =========================================================================
  sector_03_repeater: {
    buildings: [
      // Dead Repeater Communications Terminal (Level 1 Endpoint)
      { id: 'dead_repeater_pylon', model: 'Signal_Repeater_Console', localX: 0.0, localZ: 138.0, rotY: 0.0, scale: 1.2 }
    ],

    props: [
      { model: 'StreetLights', localX: -4.5, localZ: 132.0, rotY: Math.PI * 0.25 },
      { model: 'StreetLights', localX: 4.5, localZ: 132.0, rotY: -Math.PI * 0.25 },
      { model: 'Container_Green', localX: 8.0, localZ: 142.0, rotY: -0.2, scale: 0.75 }
    ]
  }
};
