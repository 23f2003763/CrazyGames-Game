import * as THREE from 'three';
import { campaignFrame } from '../campaign/CampaignFrame.js';

/**
 * MissionData: Authored campaign mission objectives for ARCFALL PROTOCOL.
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
        description: 'Meet Mara by the Relay communications array.',
        targetPos: campaignFrame.getAnchorWorld('mara_hub')
      },
      {
        id: 'obj_check_console',
        type: 'INTERACT',
        targetId: 'signal_console',
        title: 'Inspect Signal Console',
        description: 'Read the waveform authentication codes at the terminal.',
        targetPos: campaignFrame.getAnchorWorld('signal_console')
      },
      {
        id: 'obj_follow_trace',
        type: 'REACH',
        targetId: 'ambush_trigger',
        title: 'Follow the Arc Trace',
        description: 'Track the signal route north through the security gate.',
        targetPos: campaignFrame.getAnchorWorld('ambush_trigger'),
        reachRadius: 9.0
      },
      {
        id: 'obj_defeat_scarabs',
        type: 'DEFEAT',
        targetId: 'scarab_ambush',
        title: 'Break the Link: Destroy Machines',
        description: 'Eliminate the Lattice Scarab machines tracking the signal.',
        targetPos: campaignFrame.getAnchorWorld('scarab_spawn_2')
      },
      {
        id: 'obj_reach_repeater',
        type: 'INTERACT',
        targetId: 'signal_repeater_console',
        title: 'Reactivate the Dead Repeater',
        description: 'Insert the Signal Shard into the outpost communications pylon.',
        targetPos: campaignFrame.getAnchorWorld('signal_repeater_console')
      }
    ]
  }
];
