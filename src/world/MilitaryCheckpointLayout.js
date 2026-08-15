import * as THREE from 'three';

function material(color, roughness = 0.8, metalness = 0, emission = null) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true
  });
  if (emission) {
    m.emissive = new THREE.Color(emission);
    m.emissiveIntensity = 2.2;
  }
  return m;
}

const MAT_OLIVE = material(0x405c2c, 0.82);
const MAT_CAMO_DARK = material(0x283b1e, 0.85);
const MAT_RUST = material(0xa94f25, 0.86, 0.15);
const MAT_YELLOW = material(0xe7b52c, 0.72);
const MAT_CHARCOAL = material(0x181a1c, 0.95);
const MAT_CONCRETE = material(0x777568, 0.88);
const MAT_SANDBAG = material(0x826e48, 0.96);
const MAT_WOOD_DARK = material(0x5c4228, 0.92);
const MAT_TIRE = material(0x141517, 0.94);
const MAT_LAMP_RED = material(0xd82b18, 0.4, 0, 0xd82b18);
const MAT_BURNED_SHRUB = material(0x242818, 0.9);

function addBox(parent, size, pos, mat, rotY = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.y = rotY;
  mesh.rotation.z = rotZ;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, height, pos, mat, rotX = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.x = rotX;
  mesh.rotation.z = rotZ;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function fixMilitaryCheckpointLayout(model, ambientFX = null) {
  const get = (name) => model.getObjectByName(name);

  const set = (name, x, y, z, ry = 0, scale = 1) => {
    const o = get(name);
    if (!o) return;
    o.position.set(x, y, z);
    o.rotation.z = ry;
    o.scale.setScalar(scale);
  };

  // ------------------------------------------------
  // 1. HIDE DETACHED OLD ELEMENTS & CLUTTER
  // ------------------------------------------------
  [
    'Cont_Bunker_Yellow',
    'Cont_East_YellowTop',
    'Tent_CollapsedCanvas',
    'Tent_Pole1',
    'Tent_Pole2'
  ].forEach(name => {
    const o = get(name);
    if (o) o.visible = false;
  });

  // ------------------------------------------------
  // 2. ENLARGE & RECOMPOSE APC HERO CENTERPIECE
  // ------------------------------------------------
  model.traverse(o => {
    if (o.name && o.name.startsWith('APC_Center_')) {
      o.scale.multiplyScalar(1.32);
    }
  });

  // ------------------------------------------------
  // 3. RECOMPOSE DELIBERATELY GROUPED SHIPPING CONTAINERS
  // ------------------------------------------------
  set('Cont_East_Rust1', 15.0, 1.45, 2.5, 0.08, 1.15);
  set('Cont_East_Olive2', 15.2, 1.45, -4.5, -0.08, 1.15);

  // Add 2 additional stacked containers for the East defensive barrier
  addBox(model, [7.2, 2.6, 2.8], [15.1, 4.15, -1.0], MAT_YELLOW, 0.02);
  addBox(model, [6.5, 2.5, 2.6], [-8.5, 1.35, 12.0], MAT_RUST, 1.57);

  // ------------------------------------------------
  // 4. ROADBLOCK & ENTRANCE DEFINITION
  // ------------------------------------------------
  model.traverse(o => {
    if (
      o.name && (
        o.name.startsWith('Gate_') ||
        o.name.startsWith('Jersey_L1_') ||
        o.name.startsWith('Hedgehog_')
      )
    ) {
      o.scale.multiplyScalar(1.15);
    }
  });

  // ------------------------------------------------
  // 5. HIDE TINY VISUAL NOISE
  // ------------------------------------------------
  model.traverse(o => {
    if (
      o.name && (
        o.name.startsWith('Combat_Chunk_') ||
        o.name.startsWith('MilCrate_')
      )
    ) {
      o.visible = false;
    }
  });

  // ------------------------------------------------
  // 6. ENHANCE MATERIAL CONTRAST
  // ------------------------------------------------
  model.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      m.roughness = Math.max(m.roughness ?? 0.8, 0.72);
      if (m.name.includes('MilOlive')) m.color.set(0x405c2c);
      if (m.name.includes('HazardYellow')) m.color.set(0xe7b52c);
      if (m.name.includes('RustOrange')) m.color.set(0xa94f25);
      if (m.name.includes('Concrete')) m.color.set(0x777568);
      m.needsUpdate = true;
    });
  });

  // ------------------------------------------------
  // 7. AUTHORED PERIMETER FENCING (3 Clear Attack Breaches)
  // ------------------------------------------------
  const fenceGroup = new THREE.Group();
  fenceGroup.name = 'Checkpoint_PerimeterFence';

  // Fence posts along West/South-West perimeter (between West Tower and Roadblock)
  const westFenceCoords = [
    [-17.0, -9.0], [-17.5, -6.5], [-18.0, -4.0], [-18.5, -1.5], [-19.0, 1.0], [-19.0, 3.5]
  ];
  westFenceCoords.forEach((p, idx) => {
    addCylinder(fenceGroup, 0.08, 2.6, [p[0], 1.3, p[1]], MAT_RUST, (idx % 2 ? 0.12 : -0.08));
    if (idx < westFenceCoords.length - 1) {
      const next = westFenceCoords[idx + 1];
      const midX = (p[0] + next[0]) / 2;
      const midZ = (p[1] + next[1]) / 2;
      const dist = Math.hypot(next[0] - p[0], next[1] - p[1]);
      const angle = Math.atan2(next[1] - p[1], next[0] - p[0]);
      addBox(fenceGroup, [dist, 0.06, 0.06], [midX, 1.8, midZ], MAT_RUST, -angle);
      addBox(fenceGroup, [dist, 0.06, 0.06], [midX, 0.8, midZ], MAT_RUST, -angle);
    }
  });

  // Fence posts along North-East perimeter (between NE Lane and East Tower)
  const eastFenceCoords = [
    [17.5, 12.0], [18.0, 14.5], [17.5, 17.0], [15.5, 19.0]
  ];
  eastFenceCoords.forEach((p, idx) => {
    addCylinder(fenceGroup, 0.08, 2.6, [p[0], 1.3, p[1]], MAT_RUST, 0.1);
    if (idx < eastFenceCoords.length - 1) {
      const next = eastFenceCoords[idx + 1];
      const midX = (p[0] + next[0]) / 2;
      const midZ = (p[1] + next[1]) / 2;
      const dist = Math.hypot(next[0] - p[0], next[1] - p[1]);
      const angle = Math.atan2(next[1] - p[1], next[0] - p[0]);
      addBox(fenceGroup, [dist, 0.06, 0.06], [midX, 1.7, midZ], MAT_RUST, -angle);
    }
  });

  // Fence posts along South-East perimeter
  const seFenceCoords = [
    [10.0, -17.5], [12.5, -17.0], [15.0, -16.0], [17.0, -14.0], [18.0, -11.5]
  ];
  seFenceCoords.forEach((p, idx) => {
    addCylinder(fenceGroup, 0.08, 2.6, [p[0], 1.3, p[1]], MAT_RUST, -0.1);
    if (idx < seFenceCoords.length - 1) {
      const next = seFenceCoords[idx + 1];
      const midX = (p[0] + next[0]) / 2;
      const midZ = (p[1] + next[1]) / 2;
      const dist = Math.hypot(next[0] - p[0], next[1] - p[1]);
      const angle = Math.atan2(next[1] - p[1], next[0] - p[0]);
      addBox(fenceGroup, [dist, 0.06, 0.06], [midX, 1.8, midZ], MAT_RUST, -angle);
      addBox(fenceGroup, [dist, 0.06, 0.06], [midX, 0.8, midZ], MAT_RUST, -angle);
    }
  });

  model.add(fenceGroup);

  // ------------------------------------------------
  // 8. SANDBAG DEFENSIVE CLUSTERS
  // ------------------------------------------------
  const sandbagsGroup = new THREE.Group();
  sandbagsGroup.name = 'Sandbag_Clusters';
  const sandbagCoords = [
    // Entrance defense
    [-3.8, -14.5, 0.35], [-2.5, -14.5, 0.35], [3.5, -14.5, 0.35], [4.8, -14.5, 0.35],
    [-3.1, -14.5, 0.70], [4.1, -14.5, 0.70],
    // Bunker forward flank
    [-8.0, 1.5, 0.35], [-7.0, 1.5, 0.35], [-6.0, 1.5, 0.35], [-7.5, 1.5, 0.70],
    // Container choke point
    [11.5, 1.0, 0.35], [11.5, 2.2, 0.35], [11.5, 3.4, 0.35], [11.5, 1.6, 0.70]
  ];
  sandbagCoords.forEach(c => {
    addBox(sandbagsGroup, [1.1, 0.36, 0.45], [c[0], c[2], c[1]], MAT_SANDBAG, 0.04);
  });
  model.add(sandbagsGroup);

  // ------------------------------------------------
  // 9. WRECKED MILITARY SUPPLY TRUCK (Lane 1 Shoulder: X = +8.5, Y = -11.0)
  // ------------------------------------------------
  const truckGroup = new THREE.Group();
  truckGroup.name = 'Wrecked_MilitaryTruck';
  truckGroup.position.set(8.8, 0, -10.5);
  truckGroup.rotation.y = -0.38;

  // Cab & Engine Hood
  addBox(truckGroup, [2.4, 2.2, 2.2], [0, 1.35, 1.2], MAT_OLIVE, 0, 0.06);
  addBox(truckGroup, [2.2, 1.2, 1.6], [0, 0.85, 2.8], MAT_CAMO_DARK, 0, 0.06);
  // Smashed windshield
  addBox(truckGroup, [1.9, 0.8, 0.05], [0, 1.75, 2.25], MAT_CHARCOAL, 0.2, 0.06);
  // Cargo Bed (tilted with blown panels)
  addBox(truckGroup, [2.5, 1.6, 4.2], [0, 1.2, -1.8], MAT_RUST, 0.05, 0.12);
  // Wheels
  [
    [-1.25, 0.45, 2.4], [1.25, 0.45, 2.4],
    [-1.3, 0.45, -1.2], [1.3, 0.45, -1.2],
    [-1.3, 0.45, -2.6], [1.3, 0.45, -2.6]
  ].forEach(wp => {
    addCylinder(truckGroup, 0.45, 0.32, [wp[0], wp[1], wp[2]], MAT_TIRE, Math.PI / 2);
  });
  model.add(truckGroup);

  // ------------------------------------------------
  // 10. COLLAPSED FLOODLIGHT MAST (Near NW Breach: X = -10.5, Y = 16.0)
  // ------------------------------------------------
  const mastGroup = new THREE.Group();
  mastGroup.name = 'Collapsed_FloodlightMast';
  mastGroup.position.set(-10.5, 0.2, 15.5);
  mastGroup.rotation.y = 0.65;

  // Snapped base
  addBox(mastGroup, [0.8, 0.8, 0.8], [0, 0.4, 0], MAT_CONCRETE);
  // Fallen lattice truss pole
  addCylinder(mastGroup, 0.14, 7.2, [1.8, 0.3, 2.8], MAT_YELLOW, 0, Math.PI / 2.1);
  // Smashed lamp head with dangling wires
  addBox(mastGroup, [1.2, 0.6, 0.8], [5.2, 0.4, 3.2], MAT_CHARCOAL, 0.3);
  addBox(mastGroup, [0.35, 0.35, 0.1], [5.4, 0.4, 3.65], MAT_YELLOW);
  model.add(mastGroup);

  // ------------------------------------------------
  // 11. SPARSE BURNED PERIMETER SHRUBS
  // ------------------------------------------------
  const shrubCoords = [
    [-19.0, -8.0], [-19.5, 6.0], [-15.5, 17.5], [14.0, 18.0], [19.0, 7.0], [18.5, -7.0], [11.0, -19.0]
  ];
  shrubCoords.forEach((sp, idx) => {
    addBox(model, [1.2 + (idx % 3) * 0.3, 0.8 + (idx % 2) * 0.4, 1.2], [sp[0], 0.45, sp[1]], MAT_BURNED_SHRUB, idx * 0.7);
  });

  // ------------------------------------------------
  // 12. AMBIENT VFX INTEGRATION (Smoke, Flickering Lamps, Searchlight)
  // ------------------------------------------------
  if (ambientFX) {
    // 1. Heavy smoke plume from center APC wreckage
    ambientFX.addSmokeEmitter(model, new THREE.Vector3(-2.5, 2.2, -1.8), 24, 0x1c1e20, 1.8);
    // 2. Smoke plume from damaged military truck
    ambientFX.addSmokeEmitter(model, new THREE.Vector3(8.8, 1.8, -10.0), 16, 0x2e3032, 1.4);

    // 3. Flickering warning lamp at entrance gate
    const gateFlickerMesh = addBox(model, [0.3, 0.3, 0.3], [-4.5, 2.2, -16.0], MAT_LAMP_RED);
    ambientFX.addFlickerLight(gateFlickerMesh, 2.4, 14.0);

    // 4. Rotating searchlight on West Watchtower
    const searchlightHead = model.getObjectByName('SearchlightHead');
    if (searchlightHead) {
      ambientFX.addSearchlightRotator(searchlightHead, -0.65, 0.65, 0.45);
    }
  }
}
