/**
 * Level1LayoutData: Authored prop, wreckage, and landmark placement
 * based on path-distance coordinates (s = metres along CampaignPath, lateral = metres left/right).
 */
export const LEVEL_1_PROPS = [
  // =========================================================================
  // ZONE 0: CALIBRATION COURTYARD & RELAY HQ (s = 0 .. 18)
  // =========================================================================
  { s: 4.0,  lateral: -6.5, rotY: 0.1,  scale: 0.9, model: 'WaterTower', purpose: 'Relay water cistern' },
  { s: 6.0,  lateral:  6.0, rotY: 0.0,  scale: 0.7, model: 'Container_Red', purpose: 'Yard storage unit' },
  { s: 12.0, lateral: -5.0, rotY: 0.3,  scale: 1.0, model: 'Pallet', purpose: 'Equipment plinth' },
  { s: 12.2, lateral: -4.8, rotY: 0.0,  scale: 1.0, model: 'Barrel', purpose: 'Fuel drum' },
  { s: 16.0, lateral:  5.5, rotY: 0.25, scale: 1.0, model: 'StreetLights', purpose: 'Perimeter floodlight' },

  // =========================================================================
  // ZONE 1: RELAY GATE APPROACH (s = 18 .. 34)
  // =========================================================================
  { s: 24.0, lateral: -4.5, rotY: 0.2,  scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Security chicane' },
  { s: 26.0, lateral:  4.5, rotY: -0.3, scale: 1.0, model: 'TrafficBarrier_2', purpose: 'Security barrier' },
  { s: 30.0, lateral: -5.0, rotY: 0.4,  scale: 1.0, model: 'StreetLights', purpose: 'Gate approach light' },

  // =========================================================================
  // ZONE 2: OUTER SERVICE TRAIL (s = 34 .. 50)
  // =========================================================================
  { s: 38.0, lateral: -6.0, rotY: 0.35, scale: 1.0, model: 'StreetLights', purpose: 'Defunct light pole' },
  { s: 44.0, lateral:  5.2, rotY: -0.2, scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Trail road block' },

  // =========================================================================
  // ZONE 3: MACHINE WRECK BEND & SALVAGE CACHE (s = 50 .. 68)
  // =========================================================================
  { s: 56.0, lateral: -6.5, rotY: 0.45, scale: 1.15, model: 'Truck_Chassis', purpose: 'Autonomous hauler wreck' },
  { s: 62.0, lateral: 13.0, rotY: 0.2,  scale: 1.0,  model: 'Pallet', purpose: 'Side cache plinth' },
  { s: 61.0, lateral: 12.0, rotY: 0.0,  scale: 1.0,  model: 'TrafficCone_1', purpose: 'Warning cone' },
  { s: 63.0, lateral: 14.2, rotY: 0.0,  scale: 1.0,  model: 'Barrel', purpose: 'Arc fuel container' },

  // =========================================================================
  // ZONE 4: SILENCE CORRIDOR (s = 68 .. 80)
  // =========================================================================
  { s: 72.0, lateral: -5.0, rotY: 0.1,  scale: 1.0, model: 'TrashBag_1', purpose: 'Discarded materials' },
  { s: 76.0, lateral:  4.8, rotY: -0.4, scale: 1.0, model: 'TrafficBarrier_2', purpose: 'Old zone marker' },

  // =========================================================================
  // ZONE 5: FIRST MACHINE ARENA (s = 80 .. 105)
  // =========================================================================
  { s: 84.0, lateral: -7.5, rotY: 0.25, scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Arena west cover' },
  { s: 88.0, lateral:  7.5, rotY: -0.3, scale: 1.0, model: 'TrafficBarrier_2', purpose: 'Arena east cover' },
  { s: 94.0, lateral: -8.0, rotY: 0.0,  scale: 1.0, model: 'Wheels_Stack', purpose: 'Machine wheel debris' },
  { s: 98.0, lateral:  7.0, rotY: 0.5,  scale: 1.0, model: 'TrashBag_1', purpose: 'Debris mound' },

  // =========================================================================
  // ZONE 6: POST-COMBAT TRAIL (s = 105 .. 120)
  // =========================================================================
  { s: 110.0, lateral: -5.5, rotY: 0.2, scale: 1.0, model: 'StreetLights', purpose: 'Repeater approach light' },
  { s: 116.0, lateral:  5.0, rotY: -0.2, scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Outpost perimeter marker' },

  // =========================================================================
  // ZONE 7: DEAD REPEATER SITE (s = 120 .. 145)
  // =========================================================================
  { s: 126.0, lateral: -5.0, rotY: 0.25, scale: 1.0, model: 'StreetLights', purpose: 'Site floodlight L' },
  { s: 126.0, lateral:  5.0, rotY: -0.25, scale: 1.0, model: 'StreetLights', purpose: 'Site floodlight R' },
  { s: 136.0, lateral:  8.5, rotY: -0.2, scale: 0.8, model: 'Container_Green', purpose: 'Storage shelter' }
];
