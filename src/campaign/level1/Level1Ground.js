import * as THREE from 'three';
import { campaignPath } from '../CampaignPath.js';
import { campaignFrame } from '../CampaignFrame.js';
import { createCampaignGroundMaterial } from '../../rendering/CampaignGroundMaterial.js';
import { GroundDetailSystem } from '../../rendering/GroundDetailSystem.js';
import { proceduralTextures } from '../../rendering/ProceduralTextures.js';

/**
 * Level1Ground: authored, nearly-flat playable surface for WAKE SIGNAL.
 *
 * The previous version deliberately raised terrain outside the fence by up to ~3m.
 * That recreated exactly the climbable slopes/end-of-world problem we were trying to
 * remove. Level 1 now stays flat; boundary depth comes from fence + forest + fog/art,
 * never from a giant procedural hill.
 */
export class Level1Ground {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Level1_Ground_Root';
    this.scene.add(this.group);

    this.trailWidth = 7.0;
    this.shoulderWidth = 1.8;

    this.buildTerrainPlane();
    this.buildMudTrail();
    this.buildOrganicPuddles();
    this.buildFoundationDecals();

    this.detailSystem = new GroundDetailSystem(this.scene, (x, z) => this.sampleHeight(x, z));
  }

  sampleHeight(x, z) {
    // Intentionally near-flat. Small micro undulation keeps the ground from looking
    // mathematically sterile without destabilising buildings/colliders or creating
    // climbable terrain outside the electric perimeter.
    const macro = Math.sin(x * 0.115) * Math.cos(z * 0.10) * 0.018;
    const micro = Math.sin(x * 0.43 + z * 0.17) * Math.cos(z * 0.39) * 0.022;
    return THREE.MathUtils.clamp(macro + micro, -0.045, 0.045);
  }

  buildTerrainPlane() {
    const size = 320;
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const dirt = new THREE.Color(1, 0, 0);
    const grass = new THREE.Color(0, 0, 0);
    const temp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.sampleHeight(x, z));

      const wp = new THREE.Vector3(x, 0, z);
      const t = campaignPath.getClosestProgress(wp);
      const pathP = campaignPath.getWorldPointAt(t);
      const dist = Math.hypot(x - pathP.x, z - pathP.z);

      // Broad worn-soil influence around the trail rather than one binary green plane.
      const grassAmount = THREE.MathUtils.smoothstep(dist, 5.0, 16.0);
      temp.lerpColors(dirt, grass, grassAmount);
      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, createCampaignGroundMaterial());
    mesh.receiveShadow = true;
    mesh.name = 'Level1_Terrain_Mesh';
    mesh.userData.isWalkable = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  buildMudTrail() {
    const steps = 190;
    const halfW = this.trailWidth * 0.5;
    const fullHalfW = halfW + this.shoulderWidth;

    const positions = [];
    const colors = [];
    const indices = [];
    const uvs = [];

    // Brighter/more readable daylight palette than the old near-black mud.
    const cMudCenter = new THREE.Color(0x6b4728);
    const cWetEarth = new THREE.Color(0x46301e);
    const cShoulder = new THREE.Color(0x877257);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const center = campaignPath.getWorldPointAt(t);
      const tangent = campaignPath.getWorldTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const edgeJitterL = Math.sin(i * 1.37) * 0.18 + Math.sin(i * 0.31) * 0.12;
      const edgeJitterR = Math.cos(i * 1.63) * 0.18 + Math.cos(i * 0.27) * 0.12;

      const points = [
        center.clone().addScaledVector(normal, -(fullHalfW + edgeJitterL)),
        center.clone().addScaledVector(normal, -(halfW + edgeJitterL * 0.45)),
        center.clone(),
        center.clone().addScaledVector(normal, halfW + edgeJitterR * 0.45),
        center.clone().addScaledVector(normal, fullHalfW + edgeJitterR)
      ];

      points.forEach(p => {
        p.y = this.sampleHeight(p.x, p.z) + 0.018;
      });

      const base = i * 5;
      positions.push(...points.flatMap(p => [p.x, p.y, p.z]));
      colors.push(
        cShoulder.r, cShoulder.g, cShoulder.b,
        cWetEarth.r, cWetEarth.g, cWetEarth.b,
        cMudCenter.r, cMudCenter.g, cMudCenter.b,
        cWetEarth.r, cWetEarth.g, cWetEarth.b,
        cShoulder.r, cShoulder.g, cShoulder.b
      );

      const v = (t * campaignPath.totalLength) / 3.25;
      uvs.push(0, v, 0.2, v, 0.5, v, 0.8, v, 1, v);

      if (i < steps) {
        indices.push(
          base, base + 5, base + 1,
          base + 1, base + 5, base + 6,
          base + 1, base + 6, base + 2,
          base + 2, base + 6, base + 7,
          base + 2, base + 7, base + 3,
          base + 3, base + 7, base + 8,
          base + 3, base + 8, base + 4,
          base + 4, base + 8, base + 9
        );
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const dirtMaps = proceduralTextures.getDirtTexture(256);
    for (const tex of [dirtMaps.diffuse, dirtMaps.roughness]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }

    const trailMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: dirtMaps.diffuse,
      roughnessMap: dirtMaps.roughness,
      roughness: 0.82,
      metalness: 0.01,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const trail = new THREE.Mesh(geo, trailMat);
    trail.receiveShadow = true;
    trail.name = 'Level1_MudTrail_Ribbon';
    this.group.add(trail);

    this.buildWheelRuts();
  }

  buildWheelRuts() {
    // Narrow translucent ribbons follow the exact path and read as wet compacted ruts,
    // without the ugly rectangular decal vocabulary from the old level.
    const buildRut = (lateral, name) => {
      const curvePts = [];
      const steps = 150;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const c = campaignPath.getWorldPointAt(t);
        const tan = campaignPath.getWorldTangentAt(t);
        const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
        c.addScaledVector(n, lateral);
        c.y = this.sampleHeight(c.x, c.z) + 0.03;
        curvePts.push(c);
      }

      // Tube is only 3cm high/radius and reads like a glossy mud depression line.
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const geo = new THREE.TubeGeometry(curve, 220, 0.065, 5, false);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x332419,
        roughness: 0.34,
        metalness: 0.0,
        transparent: true,
        opacity: 0.72
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };

    buildRut(-1.28, 'Level1_WetRut_L');
    buildRut(1.28, 'Level1_WetRut_R');
  }

  buildOrganicPuddles() {
    const puddleLocations = [
      { t: 0.32, latOffset: -2.2, rX: 2.2, rZ: 1.4, rot: 0.4 },
      { t: 0.58, latOffset: 2.6, rX: 1.8, rZ: 2.0, rot: -0.3 },
      { t: 0.76, latOffset: -1.8, rX: 2.4, rZ: 1.6, rot: 0.6 }
    ];

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x334a46,
      roughness: 0.20,
      metalness: 0.06,
      transparent: true,
      opacity: 0.74,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    puddleLocations.forEach((p, idx) => {
      const center = campaignPath.getWorldPointAt(p.t);
      const tan = campaignPath.getWorldTangentAt(p.t);
      const normal = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const pos = center.clone().addScaledVector(normal, p.latOffset);
      pos.y = this.sampleHeight(pos.x, pos.z) + 0.025;

      const geo = new THREE.CircleGeometry(1, 24);
      geo.rotateX(-Math.PI / 2);
      geo.scale(p.rX, 1, p.rZ);

      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.position.copy(pos);
      mesh.rotation.y = p.rot;
      mesh.name = `Level1_OrganicPuddle_${idx + 1}`;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    });
  }

  buildFoundationDecals() {
    const relayMat = new THREE.MeshStandardMaterial({
      color: 0x765e43,
      roughness: 0.92,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const relayGeo = new THREE.CircleGeometry(16, 40);
    relayGeo.rotateX(-Math.PI / 2);
    relayGeo.scale(1.1, 1, 0.9);
    const relay = new THREE.Mesh(relayGeo, relayMat);
    const relayPos = campaignFrame.requireAnchor('relay_hq');
    relay.position.set(relayPos.x, this.sampleHeight(relayPos.x, relayPos.z) + 0.012, relayPos.z);
    relay.name = 'Level1_RelayFoundation_Apron';
    relay.receiveShadow = true;
    this.group.add(relay);

    const scorchMat = new THREE.MeshStandardMaterial({
      color: 0x34352f,
      roughness: 0.9,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const repGeo = new THREE.CircleGeometry(18, 40);
    repGeo.rotateX(-Math.PI / 2);
    const rep = new THREE.Mesh(repGeo, scorchMat);
    const repPos = campaignFrame.requireAnchor('repeater_site');
    rep.position.set(repPos.x, this.sampleHeight(repPos.x, repPos.z) + 0.012, repPos.z);
    rep.name = 'Level1_RepeaterScorch_Apron';
    rep.receiveShadow = true;
    this.group.add(rep);
  }
}
