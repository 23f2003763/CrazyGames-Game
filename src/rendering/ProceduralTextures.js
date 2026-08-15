import * as THREE from 'three';

/**
 * ProceduralTextures: Generates stylized, lightweight (256x256 / 512x512) procedural
 * diffuse and roughness maps via HTML5 Canvas.
 * 
 * Provides material richness and specular breakup without heavy external PNG textures.
 */
class ProceduralTextureGenerator {
  constructor() {
    this.cache = {};
  }

  // ---------------------------------------------------------------------------
  // 1. DIRT / PACKED SOIL TEXTURE (Brown base, mottling, tiny pebbles)
  // ---------------------------------------------------------------------------
  getDirtTexture(size = 256) {
    if (this.cache.dirt) return this.cache.dirt;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base earth tone
    ctx.fillStyle = '#63503b';
    ctx.fillRect(0, 0, size, size);

    // Irregular mottling patches
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 18;
      const val = 75 + Math.floor(Math.random() * 45);
      const alpha = 0.15 + Math.random() * 0.25;
      ctx.fillStyle = `rgba(${val + 15}, ${val}, ${val - 15}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny gravel/pebbles
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 2.2;
      const brightness = Math.random() > 0.5 ? 140 : 50;
      ctx.fillStyle = `rgba(${brightness}, ${brightness - 10}, ${brightness - 20}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    // Roughness map (dry earth: rough 0.85 - 0.98)
    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#dfdfdf'; // High roughness
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      rCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(180,180,180,0.2)';
      rCtx.fillRect(x, y, 6, 6);
    }
    const roughnessTex = new THREE.CanvasTexture(rCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    this.cache.dirt = { diffuse: diffuseTex, roughness: roughnessTex };
    return this.cache.dirt;
  }

  // ---------------------------------------------------------------------------
  // 2. GRASS / FOLIAGE TEXTURE (Stylized greens, dry yellow patches, micro-noise)
  // ---------------------------------------------------------------------------
  getGrassTexture(size = 256) {
    if (this.cache.grass) return this.cache.grass;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base stylized green
    ctx.fillStyle = '#5c783c';
    ctx.fillRect(0, 0, size, size);

    // Multi-tone green blades and micro noise
    const tones = ['#4d6730', '#6c8846', '#7a964e', '#546f34', '#848a48'];
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 3 + Math.random() * 12;
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.globalAlpha = 0.35 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    // Roughness map (soft diffuse foliage 0.85 - 0.95)
    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#e8e8e8';
    rCtx.fillRect(0, 0, size, size);
    const roughnessTex = new THREE.CanvasTexture(rCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    this.cache.grass = { diffuse: diffuseTex, roughness: roughnessTex };
    return this.cache.grass;
  }

  // ---------------------------------------------------------------------------
  // 3. ASPHALT / HIGHWAY TEXTURE (Charcoal variations, pale specks, subtle cracks)
  // ---------------------------------------------------------------------------
  getAsphaltTexture(size = 256) {
    if (this.cache.asphalt) return this.cache.asphalt;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base charcoal slate
    ctx.fillStyle = '#3a3d40';
    ctx.fillRect(0, 0, size, size);

    // Weathering patches
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 6 + Math.random() * 22;
      const tone = 48 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgba(${tone}, ${tone+2}, ${tone+4}, 0.25)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mineral aggregate specks
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const br = 100 + Math.floor(Math.random() * 80);
      ctx.fillStyle = `rgba(${br}, ${br}, ${br}, 0.6)`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Subtle micro fissures
    ctx.strokeStyle = 'rgba(25, 27, 28, 0.6)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let cx = Math.random() * size;
      let cy = Math.random() * size;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 24;
        cy += (Math.random() - 0.5) * 24;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    // Roughness map (asphalt medium-rough ~0.80, with occasional slick patches ~0.65)
    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#cccccc';
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      rCtx.fillStyle = 'rgba(160, 160, 160, 0.4)';
      rCtx.beginPath();
      rCtx.arc(x, y, 8, 0, Math.PI * 2);
      rCtx.fill();
    }
    const roughnessTex = new THREE.CanvasTexture(rCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    this.cache.asphalt = { diffuse: diffuseTex, roughness: roughnessTex };
    return this.cache.asphalt;
  }

  // ---------------------------------------------------------------------------
  // 4. CONCRETE / SLAB TEXTURE (Neutral grey, aggregate, stains, edge dirt)
  // ---------------------------------------------------------------------------
  getConcreteTexture(size = 256) {
    if (this.cache.concrete) return this.cache.concrete;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base concrete grey
    ctx.fillStyle = '#7a7d80';
    ctx.fillRect(0, 0, size, size);

    // Subtle aggregate and mottling
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 16;
      const val = 110 + Math.floor((Math.random() - 0.5) * 35);
      ctx.fillStyle = `rgba(${val}, ${val}, ${val}, 0.22)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weathering stains
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = 'rgba(70, 65, 55, 0.18)';
      ctx.beginPath();
      ctx.ellipse(x, y, 12, 6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#d0d0d0'; // Roughness ~0.82
    rCtx.fillRect(0, 0, size, size);
    const roughnessTex = new THREE.CanvasTexture(rCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    this.cache.concrete = { diffuse: diffuseTex, roughness: roughnessTex };
    return this.cache.concrete;
  }

  // ---------------------------------------------------------------------------
  // 5. ROCK / GRANITE TEXTURE (Stratified grey tones, dark crevices)
  // ---------------------------------------------------------------------------
  getRockTexture(size = 256) {
    if (this.cache.rock) return this.cache.rock;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base rock slate
    ctx.fillStyle = '#5c6063';
    ctx.fillRect(0, 0, size, size);

    // Horizontal stratification lines
    for (let i = 0; i < 30; i++) {
      const y = (i / 30) * size + (Math.random() - 0.5) * 8;
      const dark = Math.random() > 0.5;
      ctx.strokeStyle = dark ? 'rgba(40, 42, 45, 0.35)' : 'rgba(120, 125, 130, 0.35)';
      ctx.lineWidth = 2.0 + Math.random() * 3.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + 6, size * 0.7, y - 6, size, y);
      ctx.stroke();
    }

    const diffuseTex = new THREE.CanvasTexture(canvas);
    diffuseTex.wrapS = THREE.RepeatWrapping;
    diffuseTex.wrapT = THREE.RepeatWrapping;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#c5c5c5'; // Roughness ~0.78
    rCtx.fillRect(0, 0, size, size);
    const roughnessTex = new THREE.CanvasTexture(rCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    this.cache.rock = { diffuse: diffuseTex, roughness: roughnessTex };
    return this.cache.rock;
  }
}

export const proceduralTextures = new ProceduralTextureGenerator();
