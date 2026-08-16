import * as THREE from 'three';
import { Level1Ground } from './Level1Ground.js';
import { Level1Boundary } from './Level1Boundary.js';
import { Level1Relay } from './Level1Relay.js';
import { Level1Props } from './Level1Props.js';
import { Level1Repeater } from './Level1Repeater.js';
import { Level1Encounter } from './Level1Encounter.js';
import { InteriorRevealSystem } from '../../world/InteriorRevealSystem.js';
import { missionEvents } from '../../missions/MissionEvents.js';

/**
 * Level1WorldV2: The ONE authoritative, clean, fully-authored world for WAKE SIGNAL (Level 1).
 * Features:
 * - Controlled flat level geometry (165m x 36m) following CampaignPath.
 * - Multi-tier ground art, organic puddles, and UV-mapped mud trail.
 * - Heavy electric security perimeter with zero gaps and dense forest backing.
 * - High-quality Relay Operations V2 and Repeater Site V2 landmarks.
 * - Authored environmental storytelling compositions every 8-12m with real GLTF models.
 * - Zero procedural placeholder boxes / black rectangles.
 * - Automated Visual Quality Assertion.
 */
export class Level1WorldV2 {
  constructor(scene, collisionRegistry, interactionSystem, lootSystem, npcSystem, cutsceneDirector, combatSystem, audioSystem, dialogueUI, cameraController, missionSystem) {
    this.scene = scene;
    this.collision = collisionRegistry;
    this.interactionSystem = interactionSystem;
    this.lootSystem = lootSystem;
    this.npcSystem = npcSystem;
    this.cutsceneDirector = cutsceneDirector;
    this.combatSystem = combatSystem;
    this.audioSystem = audioSystem;
    this.dialogueUI = dialogueUI;
    this.cameraController = cameraController;
    this.missionSystem = missionSystem;

    this.group = new THREE.Group();
    this.group.name = 'Level1WorldV2_Root';
    this.scene.add(this.group);

    // 1. Interior Reveal System (smooth roof & wall fading)
    this.interiorRevealSystem = new InteriorRevealSystem();

    // 2. Playable Ground, Mud Trail, Organic Puddles, and Foundation Aprons
    this.ground = new Level1Ground(this.scene);
    this.terrainMesh = this.ground.terrainMesh;

    // 3. Electric Security Fence Perimeter & Dense Boundary Forest
    this.boundary = new Level1Boundary(this.scene, this.collision, this.audioSystem);

    // 4. Authored Relay Operations V2 Outpost
    this.relay = new Level1Relay(
      this.scene,
      this.collision,
      this.interactionSystem,
      this.npcSystem,
      this.interiorRevealSystem
    );

    // 5. Authored Environmental Prop Compositions (Every 8-12m)
    this.props = new Level1Props(this.scene, this.collision);

    // 6. Dead Repeater Landmark & Finale
    this.repeater = new Level1Repeater(
      this.scene,
      this.collision,
      this.interactionSystem,
      this.cutsceneDirector,
      this.audioSystem
    );

    // 7. Gated 4-Scarab Ambush & Step-by-Step Combat Tutorial
    this.encounter = new Level1Encounter(
      this.scene,
      this.combatSystem,
      this.lootSystem,
      this.audioSystem,
      this.dialogueUI,
      this.cameraController,
      this.missionSystem
    );

    // Gate Opening Event Hook
    missionEvents.on('signalConsoleRead', () => {
      setTimeout(() => {
        if (this.props) this.props.openSecurityGate();
        if (this.audioSystem) this.audioSystem.playObjectiveUpdate();
      }, 500);
    });

    // Run Visual Quality Assertion
    setTimeout(() => this.runVisualQualityAssertion(), 1500);
  }

  sampleHeight(x, z) {
    if (this.ground) {
      return this.ground.sampleHeight(x, z);
    }
    return 0;
  }

  runVisualQualityAssertion() {
    let boxGeoCount = 0;
    let planeGeoCount = 0;
    let placeholderCount = 0;

    this.scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        const name = child.name || '';
        if (name.includes('PROCEDURAL_') || name.includes('PLACEHOLDER') || name.includes('DEBUG_')) {
          placeholderCount++;
          console.error(`VISUAL QUALITY VIOLATION: Found placeholder mesh '${name}' in active level.`);
        }

        if (child.geometry) {
          const type = child.geometry.type;
          if (type === 'BoxGeometry') boxGeoCount++;
          if (type === 'PlaneGeometry' && !name.includes('Terrain') && !name.includes('Decal') && !name.includes('Trail')) {
            planeGeoCount++;
          }
        }
      }
    });

    console.log('==================================================');
    console.log('ARCFALL PROTOCOL — LEVEL 1 V2 VISUAL QUALITY AUDIT');
    console.log(`VISIBLE BOX GEOMETRY COUNT: ${boxGeoCount}`);
    console.log(`VISIBLE RAW PLANE COUNT:    ${planeGeoCount}`);
    console.log(`PLACEHOLDER COUNT:          ${placeholderCount}`);
    console.log('==================================================');

    if (placeholderCount > 0) {
      throw new Error(`LEVEL 1 QUALITY ASSERTION FAILED: ${placeholderCount} placeholder objects detected in active world!`);
    }
  }

  update(dt, playerPos) {
    if (this.interiorRevealSystem) {
      this.interiorRevealSystem.update(dt, playerPos);
    }
    if (this.boundary) {
      this.boundary.update(dt, playerPos);
    }
    if (this.relay) {
      this.relay.update(dt, playerPos);
    }
    if (this.repeater) {
      this.repeater.update(dt, playerPos);
    }
    if (this.encounter) {
      this.encounter.update(dt, playerPos);
    }
  }
}
