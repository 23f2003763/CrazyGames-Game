import * as THREE from 'three';

/**
 * SmokeEmitter: Lightweight, high-performance particle emitter using THREE.Points.
 * Reuses a single geometry and buffer attribute without creating/destroying objects per frame.
 */
export class SmokeEmitter {
  constructor(parent, localPos = new THREE.Vector3(), count = 18, color = 0x222426, size = 1.4) {
    this.parent = parent;
    this.localPos = localPos.clone();
    this.count = count;
    this.size = size;

    this.positions = new Float32Array(count * 3);
    this.opacities = new Float32Array(count);
    this.scales = new Float32Array(count);

    // Particle lifecycle states: [age, maxLife, vx, vy, vz, baseScale]
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        age: Math.random() * 3.0,
        maxLife: 2.2 + Math.random() * 1.6,
        x: (Math.random() - 0.5) * 0.4,
        y: Math.random() * 0.3,
        z: (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 0.25 + 0.1,
        vy: 0.9 + Math.random() * 0.7,
        vz: (Math.random() - 0.5) * 0.25,
        scale: 0.8 + Math.random() * 0.6
      });
      this.positions[i * 3] = this.localPos.x + this.particles[i].x;
      this.positions[i * 3 + 1] = this.localPos.y + this.particles[i].y;
      this.positions[i * 3 + 2] = this.localPos.z + this.particles[i].z;
      this.opacities[i] = 0.5;
      this.scales[i] = 1.0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Procedural soft circle sprite for particles
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.5, 'rgba(200,200,200,0.35)');
    grad.addColorStop(1, 'rgba(100,100,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      color: color,
      size: this.size,
      map: texture,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'SmokeEmitter_Points';
    this.parent.add(this.points);
  }

  update(dt) {
    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.maxLife) {
        p.age = 0;
        p.x = (Math.random() - 0.5) * 0.4;
        p.y = 0;
        p.z = (Math.random() - 0.5) * 0.4;
      }

      const lifeProgress = p.age / p.maxLife;
      // Drift upwards with gentle turbulent wobble
      p.x += p.vx * dt + Math.sin(p.age * 3.0 + i) * 0.005;
      p.y += p.vy * dt;
      p.z += p.vz * dt + Math.cos(p.age * 2.5 + i) * 0.005;

      posAttr.setXYZ(i, this.localPos.x + p.x, this.localPos.y + p.y, this.localPos.z + p.z);
    }
    posAttr.needsUpdate = true;
  }

  dispose() {
    if (this.points && this.parent) {
      this.parent.remove(this.points);
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * FlickerLight: Creates glitchy, intermittent apocalyptic electrical flickering.
 */
export class FlickerLight {
  constructor(meshOrMaterial, baseIntensity = 2.0, speed = 12.0) {
    this.target = meshOrMaterial;
    this.baseIntensity = baseIntensity;
    this.speed = speed;
    this.timer = Math.random() * 10;
  }

  update(dt) {
    this.timer += dt * this.speed;
    // Chaotic multi-sine noise with occasional dropout glitch
    const noise = Math.sin(this.timer) * 0.4 + Math.sin(this.timer * 2.7) * 0.3 + Math.sin(this.timer * 7.1) * 0.3;
    const isGlitching = Math.sin(this.timer * 0.4) > 0.85 && Math.sin(this.timer * 5.0) > 0.2;
    const intensity = isGlitching ? 0.05 : THREE.MathUtils.clamp(this.baseIntensity + noise * 0.8, 0.4, this.baseIntensity * 1.5);

    if (this.target.isMeshStandardMaterial) {
      this.target.emissiveIntensity = intensity;
    } else if (this.target.material && this.target.material.isMeshStandardMaterial) {
      this.target.material.emissiveIntensity = intensity;
    }
  }
}

/**
 * SearchlightRotator: Smoothly oscillates a spotlight or watchtower head back and forth.
 */
export class SearchlightRotator {
  constructor(object3D, minAngle = -0.6, maxAngle = 0.6, speed = 0.4) {
    this.object = object3D;
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.speed = speed;
    this.time = Math.random() * 10;
  }

  update(dt) {
    if (!this.object) return;
    this.time += dt * this.speed;
    const t = (Math.sin(this.time) + 1.0) * 0.5; // 0..1
    this.object.rotation.y = THREE.MathUtils.lerp(this.minAngle, this.maxAngle, t);
  }
}

/**
 * WorldAmbientFX: Central orchestrator managing all world environmental VFX.
 */
export class WorldAmbientFX {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
    this.flickerLights = [];
    this.rotators = [];
  }

  addSmokeEmitter(parent, localPos, count = 18, color = 0x222426, size = 1.4) {
    const emitter = new SmokeEmitter(parent, localPos, count, color, size);
    this.emitters.push(emitter);
    return emitter;
  }

  addFlickerLight(target, baseIntensity = 2.0, speed = 12.0) {
    const flicker = new FlickerLight(target, baseIntensity, speed);
    this.flickerLights.push(flicker);
    return flicker;
  }

  addSearchlightRotator(object3D, minAngle = -0.6, maxAngle = 0.6, speed = 0.4) {
    const rotator = new SearchlightRotator(object3D, minAngle, maxAngle, speed);
    this.rotators.push(rotator);
    return rotator;
  }

  update(dt) {
    const delta = Math.min(dt, 0.1);
    for (let i = 0; i < this.emitters.length; i++) {
      this.emitters[i].update(delta);
    }
    for (let i = 0; i < this.flickerLights.length; i++) {
      this.flickerLights[i].update(delta);
    }
    for (let i = 0; i < this.rotators.length; i++) {
      this.rotators[i].update(delta);
    }
  }

  dispose() {
    this.emitters.forEach(e => e.dispose());
    this.emitters = [];
    this.flickerLights = [];
    this.rotators = [];
  }
}
