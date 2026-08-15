import * as THREE from 'three';

function material(color, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true
  });
}

const OLIVE = material(0x405c2c, 0.82);
const DARK = material(0x202525, 0.7, 0.35);
const RUST = material(0xa94f25, 0.86, 0.15);
const YELLOW = material(0xe7b52c, 0.72);
const WOOD = material(0x765134, 0.92);
const GLASS = material(0x142526, 0.32);

function box(parent, size, pos, mat, rotationY = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    mat
  );

  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, pos, mat) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 8),
    mat
  );

  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);
  return mesh;
}

function buildTower(name) {
  const g = new THREE.Group();
  g.name = name;

  // Four chunky structural legs
  const legs = [
    [-1.55, 3.0, -1.55],
    [ 1.55, 3.0, -1.55],
    [-1.55, 3.0,  1.55],
    [ 1.55, 3.0,  1.55]
  ];

  legs.forEach((p, i) => {
    const leg = box(
      g,
      [0.34, 6.0, 0.34],
      p,
      i % 2 ? RUST : DARK
    );

    leg.rotation.z = i % 2 ? 0.05 : -0.05;
  });

  // Cross braces
  box(g, [4.2, 0.22, 0.22], [0, 2.1, -1.6], RUST, 0.18);
  box(g, [4.2, 0.22, 0.22], [0, 3.7,  1.6], DARK, -0.18);

  // Observation platform
  box(g, [4.4, 0.35, 4.4], [0, 5.8, 0], WOOD);

  // Cabin
  box(g, [3.5, 1.8, 3.5], [0, 6.8, 0], OLIVE);

  // Large dark view panels
  box(g, [2.5, 0.08, 0.7], [0, 6.95, -1.79], GLASS);
  box(g, [0.7, 0.08, 2.3], [-1.79, 6.95, 0], GLASS);

  // Oversized damaged roof
  const roof = box(
    g,
    [4.5, 0.32, 4.5],
    [0, 8.0, 0],
    RUST,
    0.08
  );
  roof.rotation.z = 0.04;

  // Hazard stripe
  box(g, [3.5, 0.18, 0.18], [0, 5.95, -2.2], YELLOW);

  // Searchlight Head (Rotating Assembly)
  const searchlightHead = new THREE.Group();
  searchlightHead.name = 'SearchlightHead';
  searchlightHead.position.set(1.35, 7.2, -1.9);

  const lightBody = cylinder(
    searchlightHead,
    0.38,
    0.7,
    [0, 0, 0],
    DARK
  );
  lightBody.rotation.x = Math.PI / 2;

  // Search light lens with warm emissive glow
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xffc84a,
    emissive: 0xff8a20,
    emissiveIntensity: 2.4,
    roughness: 0.3
  });
  lensMat.name = 'SearchlightLensMat';

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.31, 10),
    lensMat
  );
  lens.position.set(0, 0, -0.37);
  searchlightHead.add(lens);

  g.add(searchlightHead);

  // Ladder
  for (let y = 0.9; y < 5.4; y += 0.65) {
    box(g, [1.25, 0.10, 0.10], [0, y, 1.78], YELLOW);
  }

  box(g, [0.10, 5.2, 0.10], [-0.63, 3.0, 1.78], DARK);
  box(g, [0.10, 5.2, 0.10], [ 0.63, 3.0, 1.78], DARK);

  return g;
}

export function addMilitaryWatchtowers(checkpointModel) {
  // Remove old Blender towers completely.
  checkpointModel.traverse(child => {
    if (
      child.name.startsWith('TowerSW_') ||
      child.name.startsWith('TowerNE_')
    ) {
      child.visible = false;
    }
  });

  const west = buildTower('HeroWatchtower_West');
  west.position.set(-16.5, 0, -11.5);
  west.rotation.y = 0.35;
  west.scale.setScalar(1.08);

  const east = buildTower('HeroWatchtower_East');
  // Position East tower prominently on right flank to cleanly frame the arena
  east.position.set(16.0, 0, 2.5);
  east.rotation.y = -0.65;
  east.scale.setScalar(1.08);

  checkpointModel.add(west);
  checkpointModel.add(east);
}
