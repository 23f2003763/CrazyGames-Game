import * as THREE from 'three';

export function fixMilitaryCheckpointLayout(model) {
  const get = (name) => model.getObjectByName(name);

  const set = (name, x, y, z, ry = 0, scale = 1) => {
    const o = get(name);
    if (!o) return;

    o.position.set(x, y, z);
    o.rotation.z = ry;
    o.scale.setScalar(scale);
  };

  // ------------------------------------------------
  // HIDE VISUALLY BAD / DETACHED OLD ELEMENTS
  // ------------------------------------------------

  [
    'Cont_Bunker_Yellow',
    'Cont_East_YellowTop',
    'Tent_CollapsedCanvas'
  ].forEach(name => {
    const o = get(name);
    if (o) o.visible = false;
  });

  // ------------------------------------------------
  // HERO BUNKER CLUSTER — NORTH WEST
  // Make this the dominant architectural mass.
  // ------------------------------------------------

  [
    'Bunker_HeavyBase',
    'Bunker_ConcreteWalls',
    'Bunker_HeavyRoofDeck',
    'Bunker_SandbagRoofF',
    'Bunker_SandbagRoofS',
    'Bunker_BlastDoorFrame',
    'Bunker_BlastDoorLeaf',
    'Bunker_ObservationSlit',
    'Bunker_RadarPedestal',
    'Bunker_RadarDish',
    'Bunker_AntennaPole'
  ].forEach(name => {
    const o = get(name);
    if (o) o.scale.multiplyScalar(1.28);
  });

  // ------------------------------------------------
  // WATCHTOWERS — KEEP ON OPPOSING EDGES
  // ------------------------------------------------

  const towerSW = [];
  const towerNE = [];

  model.traverse(o => {
    if (o.name.startsWith('TowerSW_')) towerSW.push(o);
    if (o.name.startsWith('TowerNE_')) towerNE.push(o);
  });

  towerSW.forEach(o => {
    o.position.x -= 2.5;
    o.position.y -= 1.5;
    o.scale.multiplyScalar(1.18);
  });

  towerNE.forEach(o => {
    o.position.x += 2.5;
    o.position.y += 1.0;
    o.scale.multiplyScalar(1.18);
  });

  // ------------------------------------------------
  // CONTAINER WALL — ONE STRONG CLUSTER, NOT RANDOM BOXES
  // ------------------------------------------------

  set('Cont_East_Rust1', 14.5, 1.45, 3.5, 0.08, 1.1);
  set('Cont_East_Olive2', 14.8, 1.45, -3.2, -0.08, 1.1);

  // ------------------------------------------------
  // APC — HERO CENTERPIECE
  // enlarge every APC component together
  // ------------------------------------------------

  model.traverse(o => {
    if (o.name.startsWith('APC_Center_')) {
      o.scale.multiplyScalar(1.32);
    }
  });

  // ------------------------------------------------
  // ROADBLOCK — make entrance readable
  // ------------------------------------------------

  model.traverse(o => {
    if (
      o.name.startsWith('Gate_') ||
      o.name.startsWith('Jersey_L1_') ||
      o.name.startsWith('Hedgehog_')
    ) {
      o.scale.multiplyScalar(1.15);
    }
  });

  // ------------------------------------------------
  // REMOVE TINY VISUAL NOISE
  // ------------------------------------------------

  model.traverse(o => {
    if (
      o.name.startsWith('Combat_Chunk_') ||
      o.name.startsWith('MilCrate_')
    ) {
      o.visible = false;
    }
  });

  // ------------------------------------------------
  // STRONGER MATERIAL CONTRAST
  // ------------------------------------------------

  model.traverse(o => {
    if (!o.isMesh || !o.material) return;

    const mats = Array.isArray(o.material)
      ? o.material
      : [o.material];

    mats.forEach(m => {
      m.roughness = Math.max(m.roughness ?? 0.8, 0.72);

      if (m.name.includes('MilOlive')) {
        m.color.set(0x405c2c);
      }

      if (m.name.includes('HazardYellow')) {
        m.color.set(0xe7b52c);
      }

      if (m.name.includes('RustOrange')) {
        m.color.set(0xa94f25);
      }

      if (m.name.includes('Concrete')) {
        m.color.set(0x777568);
      }

      m.needsUpdate = true;
    });
  });
}
