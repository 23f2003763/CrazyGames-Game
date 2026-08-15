import * as THREE from 'three';

/**
 * SectorDressingData: Authored environmental dressing and solid colliders
 * across the 5 narrative beats of Level 1 (WAKE SIGNAL).
 * All positions are in LOCAL CAMPAIGN SPACE (localX, localZ).
 */
export const SECTOR_DRESSING = {
  // =========================================================================
  // BEAT A: THE RELAY & CALIBRATION YARD (local Z: -15 .. 38)
  // =========================================================================
  sector_01_relay: {
    buildings: [
      { id: 'relay_cabin', model: 'RelayCabin', localX: -7.5, localZ: 20.0, rotY: 0.0, scale: 1.0 },
      { id: 'relay_mast', model: 'RadioMast', localX: 7.5, localZ: 24.0, rotY: 0.0, scale: 1.0 },
      { id: 'relay_gate', model: 'FenceGateLarge', localX: 0.0, localZ: 36.0, rotY: 0.0, scale: 1.0 },
      { id: 'gate_power_box', model: 'FencePowerBox', localX: 3.6, localZ: 35.0, rotY: 0.0, scale: 1.0 },
      { id: 'signal_console', model: 'Signal_Repeater_Console', localX: 3.8, localZ: 22.0, rotY: Math.PI * 0.8, scale: 0.85 }
    ],

    npc: [
      { id: 'mara', name: 'Mara', localX: -3.5, localZ: 22.0, rotY: Math.PI * 0.4 }
    ],

    loot: [
      { id: 'relay_starter_chest', localX: -5.0, localZ: 8.0, rotY: 0.0, isQuestChest: true }
    ],

    props: [
      { model: 'Container_Red', localX: -10.0, localZ: 14.0, rotY: 0.2, scale: 0.65 },
      { model: 'WaterTower', localX: 9.0, localZ: 14.0, rotY: -0.3, scale: 0.9 },
      { model: 'Pallet', localX: 5.5, localZ: 8.0, rotY: 0.1 },
      { model: 'Barrel', localX: 5.8, localZ: 8.2, rotY: 0.0 },
      { model: 'StreetLights', localX: -5.0, localZ: 34.0, rotY: Math.PI * 0.25 }
    ],

    colliders: [
      // Relay Cabin walls
      { id: 'col_relay_cabin_back', localX: -7.5, localZ: 22.5, width: 6.5, depth: 1.2, rotation: 0 },
      { id: 'col_relay_cabin_left', localX: -10.5, localZ: 20.0, width: 1.2, depth: 5.0, rotation: 0 },
      { id: 'col_relay_cabin_right', localX: -4.5, localZ: 20.0, width: 1.2, depth: 5.0, rotation: 0 },
      // Antenna mast base
      { id: 'col_relay_mast', localX: 7.5, localZ: 24.0, width: 2.2, depth: 2.2, rotation: 0 },
      // Storage container
      { id: 'col_relay_container', localX: -10.0, localZ: 14.0, width: 2.8, depth: 5.2, rotation: 0.2 },
      // Water tower legs
      { id: 'col_water_tower', localX: 9.0, localZ: 14.0, width: 3.0, depth: 3.0, rotation: 0 }
    ]
  },

  // =========================================================================
  // BEATS B, C, D: FOREST SERVICE CORRIDOR, MUDDY BEND & SCARAB AMBUSH (local Z: 38 .. 115)
  // =========================================================================
  sector_02_corridor: {
    loot: [
      // Optional Salvage Cache at Muddy Bend (local X: +14.0, local Z: 65.0)
      { id: 'salvage_cache_1', localX: 14.0, localZ: 65.0, rotY: 0.3, isQuestChest: false }
    ],

    props: [
      // Beat B: Exit Corridor (Z: 38 .. 55)
      { model: 'StreetLights', localX: -5.5, localZ: 46.0, rotY: Math.PI * 0.2 },
      { model: 'TrafficBarrier_1', localX: 5.2, localZ: 50.0, rotY: 0.25 },

      // Beat C: Muddy Bend & Cargo Wreck (Z: 55 .. 80)
      { model: 'Truck_Chassis', localX: -7.5, localZ: 68.0, rotY: 0.4, scale: 1.1 },
      { model: 'Pallet', localX: 13.5, localZ: 64.5, rotY: 0.2 },
      { model: 'TrafficCone_1', localX: 12.0, localZ: 63.5, rotY: 0.0 },
      { model: 'Barrel', localX: 15.0, localZ: 66.0, rotY: 0.0 },

      // Beat D: Scarab Ambush Arena (Z: 80 .. 112)
      { model: 'TrafficBarrier_1', localX: -5.5, localZ: 90.0, rotY: 0.2 },
      { model: 'TrafficBarrier_2', localX: 5.5, localZ: 96.0, rotY: -0.4 },
      { model: 'Wheels_Stack', localX: -6.5, localZ: 94.0, rotY: 0.0 },
      { model: 'TrashBag_1', localX: -3.5, localZ: 92.0, rotY: 0.5 }
    ],

    colliders: [
      // Cargo truck wreckage
      { id: 'col_cargo_truck_wreck', localX: -7.5, localZ: 68.0, width: 3.2, depth: 6.5, rotation: 0.4 },
      // Ambush barrier wreckage
      { id: 'col_ambush_barrier_1', localX: -5.5, localZ: 90.0, width: 2.2, depth: 0.8, rotation: 0.2 },
      { id: 'col_ambush_barrier_2', localX: 5.5, localZ: 96.0, width: 2.2, depth: 0.8, rotation: -0.4 }
    ]
  },

  // =========================================================================
  // BEAT E: DEAD REPEATER SITE (local Z: 115 .. 160)
  // =========================================================================
  sector_03_repeater: {
    buildings: [
      { id: 'dead_repeater_pylon', model: 'Signal_Repeater_Console', localX: 0.0, localZ: 138.0, rotY: 0.0, scale: 1.25 }
    ],

    props: [
      { model: 'StreetLights', localX: -4.5, localZ: 132.0, rotY: Math.PI * 0.25 },
      { model: 'StreetLights', localX: 4.5, localZ: 132.0, rotY: -Math.PI * 0.25 },
      { model: 'Container_Green', localX: 8.0, localZ: 142.0, rotY: -0.2, scale: 0.75 }
    ],

    colliders: [
      // Repeater terminal base
      { id: 'col_repeater_pylon', localX: 0.0, localZ: 138.0, width: 1.8, depth: 1.8, rotation: 0 },
      // Container shelter
      { id: 'col_repeater_container', localX: 8.0, localZ: 142.0, width: 2.8, depth: 5.2, rotation: -0.2 }
    ]
  }
};
