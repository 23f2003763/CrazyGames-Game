import * as THREE from 'three';
import { proceduralTextures } from './ProceduralTextures.js';

export function createCampaignGroundMaterial() {
  const grassMaps = proceduralTextures.getGrassTexture(256);
  grassMaps.diffuse.wrapS = THREE.RepeatWrapping;
  grassMaps.diffuse.wrapT = THREE.RepeatWrapping;
  grassMaps.roughness.wrapS = THREE.RepeatWrapping;
  grassMaps.roughness.wrapT = THREE.RepeatWrapping;
  grassMaps.diffuse.repeat.set(32, 32);
  grassMaps.roughness.repeat.set(32, 32);

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: grassMaps.diffuse,
    roughnessMap: grassMaps.roughness,
    roughness: 0.90,
    metalness: 0.02,
    flatShading: true,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vWorldPos;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vWorldPos;
      
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      
      float n1 = snoise(vWorldPos.xz * 0.15) * 0.5 + 0.5;
      float n2 = snoise(vWorldPos.xz * 0.4 + 100.0) * 0.5 + 0.5;
      
      // Palettes
      vec3 cGrass = vec3(0.24, 0.35, 0.18); // olive/moss
      vec3 cDryGrass = vec3(0.40, 0.42, 0.20); // khaki
      vec3 cSoil = vec3(0.40, 0.28, 0.18); // warm brown
      vec3 cWetMud = vec3(0.20, 0.14, 0.09); // dark chocolate
      
      vec3 grassMix = mix(cGrass, cDryGrass, n1);
      vec3 dirtMix = mix(cWetMud, cSoil, n2);
      
      // vColor.r is used as dirt factor from CampaignWorld (brown has high R, green has low R)
      // We will normalize it: the geometry gives cTrailEarth (R=0.28) and cLush (R=0.19)
      // Actually let's just use vColor.r directly as an interpolator if we set it from 0 to 1 in JS.
      // But since geometry has baked colors, let's use the red channel to detect dirt.
      float dirtFactor = smoothstep(0.18, 0.35, vColor.r);
      
      vec3 finalColor = mix(grassMix, dirtMix, dirtFactor);
      
      diffuseColor = vec4(finalColor, 1.0) * texture2D( map, vMapUv );
      `
    );
  };

  return mat;
}
