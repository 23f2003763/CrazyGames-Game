import * as THREE from 'three';

/**
 * MissionData: Authored definition of campaign missions and objectives.
 */
export const MISSIONS = [
  {
    id: 'level_01_road_out',
    title: 'LEVEL 1 — ROAD OUT',
    chapterId: 'chapter_01',
    description: 'Prepare your supplies at The Relay and venture out onto Dead Highway 84.',
    objectives: [
      {
        id: 'obj_talk_mara',
        type: 'TALK',
        targetId: 'mara',
        title: 'Speak with Mara',
        description: 'Talk to Relay engineer Mara in the courtyard.',
        targetPos: new THREE.Vector3(-3.2, 1.4, -3.5),
        guidanceType: 'beacon'
      },
      {
        id: 'obj_get_kit',
        type: 'LOOT',
        targetId: 'relay_starter_chest',
        title: 'Grab the Road Supply Kit',
        description: 'Open the supply chest by the cabin workbench.',
        targetPos: new THREE.Vector3(-4.8, 0.6, -3.2),
        guidanceType: 'chevrons'
      },
      {
        id: 'obj_power_gate',
        type: 'INTERACT',
        targetId: 'gate_power_box',
        title: 'Power the Exit Gate',
        description: 'Insert the Gate Fuse into the security terminal.',
        targetPos: new THREE.Vector3(3.8, 1.3, 48.5),
        guidanceType: 'beacon'
      },
      {
        id: 'obj_follow_highway',
        type: 'REACH',
        targetId: 'convoy_area',
        title: 'Follow Dead Highway 84',
        description: 'Venture north along the highway to the wrecked convoy.',
        targetPos: new THREE.Vector3(0.0, 0.0, 166.0),
        reachRadius: 8.0,
        guidanceType: 'road_chevrons'
      },
      {
        id: 'obj_reach_octane',
        type: 'REACH',
        targetId: 'octane_mart',
        title: 'Reach Octane Mart',
        description: 'Scout the crossroads gas station for fuel and salvage.',
        targetPos: new THREE.Vector3(0.0, 0.0, 235.0),
        reachRadius: 10.0,
        guidanceType: 'beacon'
      }
    ]
  }
];
