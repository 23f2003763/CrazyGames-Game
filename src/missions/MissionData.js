import * as THREE from 'three';
import { campaignFrame } from '../campaign/CampaignFrame.js';

/**
 * MissionData: Level 1 (WAKE SIGNAL) campaign mission objectives.
 */
export const MISSIONS = [
  {
    id: 'level_01_wake_signal',
    title: 'LEVEL 1 — WAKE SIGNAL',
    chapterId: 'chapter_01',
    description: 'Investigate the anomalous human transmission detected on a long-dead network channel.',
    objectives: [
      {
        id: 'obj_talk_mara',
        type: 'TALK',
        targetId: 'mara',
        title: 'Speak with Mara',
        description: 'Meet Mara inside the Relay communications room.',
        targetPos: campaignFrame.requireAnchor('mara_hub')
      },
      {
        id: 'obj_check_console',
        type: 'INTERACT',
        targetId: 'signal_console',
        title: 'Inspect Signal Terminal',
        description: 'Read the incoming waveform telemetry at the console.',
        targetPos: campaignFrame.requireAnchor('signal_console')
      },
      {
        id: 'obj_follow_trace',
        type: 'REACH',
        targetId: 'ambush_trigger',
        title: 'Follow the Signal',
        description: 'Track the Arc breadcrumbs north through the perimeter gate.',
        targetPos: campaignFrame.requireAnchor('ambush_trigger'),
        reachRadius: 8.5
      },
      {
        id: 'obj_defeat_scarabs',
        type: 'DEFEAT',
        targetId: 'scarab_ambush',
        title: 'Destroy Lattice Scouts',
        description: 'Defeat the hostile Scarabs in the ambush pocket.',
        targetPos: campaignFrame.requireAnchor('scarab_spawn_2')
      },
      {
        id: 'obj_reach_repeater',
        type: 'INTERACT',
        targetId: 'signal_repeater_console',
        title: 'Reactivate Dead Repeater',
        description: 'Insert the Signal Shard into the outpost communications console.',
        targetPos: campaignFrame.requireAnchor('signal_repeater_console')
      }
    ]
  }
];
