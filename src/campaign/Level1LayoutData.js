/**
 * Level1LayoutData: Authored prop, wreckage, and landmark placement
 * based on path-distance coordinates (s = metres along CampaignPath, lateral = metres left/right).
 */
export const LEVEL_1_PROPS = [
  // =========================================================================
  // ZONE 0: CALIBRATION COURTYARD & RELAY HQ (s = 0 .. 30)
  // =========================================================================
  { s: 4.0,  lateral: -6.5, rotY: 0.1,  scale: 0.9, model: 'WaterTower', purpose: 'Relay water cistern' },
  { s: 6.0,  lateral:  6.0, rotY: 0.0,  scale: 0.7, model: 'Container_Red', purpose: 'Yard storage unit' },
  { s: 12.0, lateral: -5.0, rotY: 0.3,  scale: 1.0, model: 'Pallet', purpose: 'Equipment plinth' },
  { s: 12.2, lateral: -4.8, rotY: 0.0,  scale: 1.0, model: 'Barrel', purpose: 'Fuel drum' },
  { s: 16.0, lateral:  5.5, rotY: 0.25, scale: 1.0, model: 'StreetLights', purpose: 'Perimeter floodlight' },
  { s: 24.0, lateral: -4.5, rotY: 0.2,  scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Security chicane' },
  { s: 26.0, lateral:  4.5, rotY: -0.3, scale: 1.0, model: 'TrafficBarrier_2', purpose: 'Security barrier' },
  { s: 30.0, lateral: -5.0, rotY: 0.4,  scale: 1.0, model: 'StreetLights', purpose: 'Gate approach light' },

  // =========================================================================
  // ZONE 1: INITIAL TRAIL (s = 30 .. 45)
  // =========================================================================
  { s: 35.0, lateral: -6.0, rotY: 0.3, scale: 1.0, model: 'StreetLights', purpose: 'Broken power pole' }, // A
  { s: 35.0, lateral: -5.8, rotY: 0, scale: 1.0, model: 'PROCEDURAL_CABLE_DANGLING', purpose: 'Dangling cables' }, // A
  { s: 40.0, lateral: 5.0, rotY: -0.2, scale: 1.0, model: 'Container_Blue', purpose: 'Abandoned supply crate 1' }, // B
  { s: 40.5, lateral: 7.0, rotY: 0.5, scale: 1.0, model: 'Container_Red', purpose: 'Abandoned supply crate 2' }, // B
  { s: 41.0, lateral: 6.0, rotY: 0.1, scale: 1.0, model: 'TrashBag_1', purpose: 'Scattered parts' }, // B

  // =========================================================================
  // ZONE 2: ATMOSPHERE BUILD (s = 45 .. 60)
  // =========================================================================
  { s: 48.0, lateral: -7.0, rotY: 1.0, scale: 1.0, model: 'StreetLights', purpose: 'Damaged surveillance mast' }, // C
  { s: 52.0, lateral: 4.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_PUDDLE', purpose: 'Small puddle area' }, // D
  { s: 52.0, lateral: 4.5, rotY: 0, scale: 1.0, model: 'StreetLights', purpose: 'Warning light post' }, // D
  { s: 57.0, lateral: -5.0, rotY: 0.5, scale: 1.0, model: 'Wheels_Stack', purpose: 'Half-buried machine component' }, // E

  // =========================================================================
  // ZONE 3: TENSION RISE (s = 60 .. 75)
  // =========================================================================
  { s: 63.0, lateral: -6.0, rotY: -0.4, scale: 1.15, model: 'Truck_Chassis', purpose: 'Crashed maintenance vehicle' }, // F
  { s: 68.0, lateral: 7.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_DEAD_TREE', purpose: 'Arc-scorched tree 1' }, // G
  { s: 69.0, lateral: 8.5, rotY: 0.2, scale: 1.0, model: 'PROCEDURAL_DEAD_TREE', purpose: 'Arc-scorched tree 2' }, // G
  { s: 72.0, lateral: -2.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_DRAG_MARK', purpose: 'Machine drag marks' }, // H

  // =========================================================================
  // ZONE 4: PRE-COMBAT BUILD (s = 75 .. 85)
  // =========================================================================
  { s: 78.0, lateral: 5.0, rotY: 0.3, scale: 1.0, model: 'StreetLights', purpose: 'Bent signal pole' }, // I
  { s: 78.0, lateral: 4.8, rotY: 0, scale: 1.0, model: 'PROCEDURAL_SEVERED_CABLES', purpose: 'Severed cables' }, // I
  { s: 83.0, lateral: -6.0, rotY: 0.1, scale: 1.0, model: 'TrashBag_1', purpose: 'Destroyed surveillance drone wreckage' }, // J

  // =========================================================================
  // ZONE 5: COMBAT ARENA (s = 85 .. 110)
  // =========================================================================
  { s: 95.0, lateral: -8.0, rotY: 0.5, scale: 1.2, model: 'Van_Chassis', purpose: 'Crashed survey machine (hero prop)' }, // K
  { s: 95.5, lateral: -7.5, rotY: 0, scale: 1.0, model: 'PROCEDURAL_SMOKING_CORE', purpose: 'Smoking power core' }, // L
  { s: 90.0, lateral: 7.0, rotY: -0.2, scale: 1.0, model: 'PROCEDURAL_SCARAB_HUSK', purpose: 'Destroyed smaller machine 1' }, // M
  { s: 102.0, lateral: -5.0, rotY: 0.8, scale: 1.0, model: 'PROCEDURAL_SCARAB_HUSK', purpose: 'Destroyed smaller machine 2' }, // M
  { s: 98.0, lateral: 8.0, rotY: 0, scale: 1.0, model: 'TrafficBarrier_1', purpose: 'Bent fence section' }, // N
  { s: 92.0, lateral: -2.0, rotY: 0.1, scale: 1.0, model: 'Pallet', purpose: 'Scattered machine armor plates' }, // O
  { s: 96.0, lateral: 3.0, rotY: 0.4, scale: 1.0, model: 'Barrel', purpose: 'Scattered machine armor plates' }, // O

  // =========================================================================
  // ZONE 6: REPEATER APPROACH (s = 110 .. 140)
  // =========================================================================
  { s: 115.0, lateral: 6.0, rotY: 0.2, scale: 1.1, model: 'Truck_Chassis', purpose: 'Abandoned automated cargo trailer' }, // P
  { s: 120.0, lateral: -3.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_ARC_BURN', purpose: 'Arc-burned ground patch' }, // Q
  { s: 128.0, lateral: 5.0, rotY: 0.4, scale: 1.0, model: 'PROCEDURAL_ROBOT_TORSO', purpose: 'Broken robot torso partially buried' }, // R
  { s: 135.0, lateral: -5.5, rotY: 0, scale: 1.0, model: 'PROCEDURAL_CABLE_CONDUIT', purpose: 'Damaged cable conduit running along trail' }, // S

  // =========================================================================
  // ZONE 7: REPEATER COMPOUND (s = 140 .. 165)
  // =========================================================================
  { s: 145.0, lateral: 0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_CABLE_TRENCH', purpose: 'Cable trench' }, // T
  { s: 148.0, lateral: -4.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_ARC_BATTERY', purpose: 'Arc battery bank' }, // U
  { s: 152.0, lateral: 5.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_ANTENNA_FRAGMENTS', purpose: 'Antenna fragments on ground' }, // V
  { s: 150.0, lateral: -6.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_RED_NODE', purpose: 'Red dormant Lattice sensor node' }, // W
  { s: 155.0, lateral: 6.0, rotY: 0, scale: 1.0, model: 'PROCEDURAL_RED_NODE', purpose: 'Red dormant Lattice sensor node' } // W
];
