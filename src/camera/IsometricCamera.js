import * as THREE from 'three';
import { CLEARINGS } from '../world/MapData.js';

export class IsometricCamera {
  constructor(domElement) {
    this.domElement = domElement;
    
    // Isometric angle parameters
    this.pitch = THREE.MathUtils.degToRad(50);
    this.yaw = THREE.MathUtils.degToRad(45);
    this.distance = 45;
    this.minDistance = 24;
    this.maxDistance = 88;

    // Modes
    this.mode = 'gameplay'; // 'gameplay' | 'inspection'
    this.player = null; // Reference to player for following

    // Camera target position in world space
    this.target = new THREE.Vector3(0, 0, 0);
    this.desiredTarget = new THREE.Vector3(0, 0, 0);

    // Provide a pivot object to expose our yaw rotation easily to PlayerController
    this.pivot = new THREE.Object3D();
    this.pivot.rotation.y = this.yaw;

    // Perspective Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 1200);
    this.updateCameraTransform();

    // Interaction state
    this.keys = {};
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.panSpeed = 55;

    this.bindEvents();
    this.setMode('gameplay');
  }

  setPlayer(player) {
    this.player = player;
    if (this.player) {
      this.target.copy(this.player.position);
      this.desiredTarget.copy(this.player.position);
      this.updateCameraTransform();
    }
  }

  setMode(newMode) {
    this.mode = newMode;
    const hud = document.getElementById('debug-nav');
    
    if (this.mode === 'gameplay') {
      if (hud) hud.style.display = 'none';
      if (this.player) {
        this.desiredTarget.copy(this.player.position);
      }
      this.distance = 45; // Default gameplay distance
    } else {
      if (hud) hud.style.display = 'flex';
    }
  }

  toggleMode() {
    this.setMode(this.mode === 'gameplay' ? 'inspection' : 'gameplay');
  }

  updateCameraTransform() {
    // Spherical offset from target
    const offsetX = this.distance * Math.sin(this.yaw) * Math.cos(this.pitch);
    const offsetY = this.distance * Math.sin(this.pitch);
    const offsetZ = this.distance * Math.cos(this.yaw) * Math.cos(this.pitch);

    this.camera.position.set(
      this.target.x + offsetX,
      this.target.y + offsetY,
      this.target.z + offsetZ
    );

    this.camera.lookAt(this.target.x, this.target.y, this.target.z);
  }

  jumpToClearing(clearingId) {
    if (this.mode !== 'inspection') return;
    
    const cl = CLEARINGS.find(c => c.id === clearingId);
    if (cl) {
      const framingConfig = {
        start:      { y: 3.0, dist: 48 },
        gasStation: { y: 3.0, dist: 48 },
        ravine:     { y: 2.5, dist: 52 },
        camp:       { y: 2.5, dist: 48 },
        checkpoint: { y: 2.5, dist: 46 },
        farm:       { y: 2.0, dist: 60 },
      };
      const cfg = framingConfig[clearingId] || { y: 2.0, dist: 60 };
      this.desiredTarget.set(cl.x, cfg.y, cl.z);
      this.distance = cfg.dist;

      const chips = document.querySelectorAll('.nav-chip');
      chips.forEach(chip => {
        if (chip.dataset.poi === clearingId) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // F8 Toggle
      if (e.code === 'F8') {
        e.preventDefault();
        this.toggleMode();
      }

      // Quick POI hotkeys [1 - 6]
      if (this.mode === 'inspection' && e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        if (CLEARINGS[idx]) {
          this.jumpToClearing(CLEARINGS[idx].id);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (this.mode !== 'inspection') return;
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.mode !== 'inspection') return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      const factor = (this.distance / 900);
      const moveX = -(deltaX * Math.cos(this.yaw) - deltaY * Math.sin(this.yaw)) * factor;
      const moveZ = -(deltaX * Math.sin(this.yaw) + deltaY * Math.cos(this.yaw)) * factor;

      this.desiredTarget.x += moveX;
      this.desiredTarget.z += moveZ;

      this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -105, 105);
      this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -75, 75);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.domElement.addEventListener('contextmenu', (e) => {
       if (this.mode === 'inspection') e.preventDefault();
    });

    window.addEventListener('wheel', (e) => {
      // Allow zooming in both modes, but maybe restrict gameplay mode more later
      this.distance += e.deltaY * 0.05;
      this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    }, { passive: true });

    const chips = document.querySelectorAll('.nav-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const poi = chip.dataset.poi;
        this.jumpToClearing(poi);
      });
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  update(deltaTime) {
    if (this.mode === 'gameplay') {
      if (this.player) {
        // Follow player with slight lead
        // The lead could be based on player velocity, but for now simple follow
        this.desiredTarget.copy(this.player.position);
      }
    } else {
      // Inspection mode panning
      let moveForward = 0;
      let moveRight = 0;

      // Only allow WASD panning in inspection mode to not fight player controls
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveForward -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveForward += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveRight -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveRight += 1;

      if (moveForward !== 0 || moveRight !== 0) {
        const len = Math.hypot(moveForward, moveRight);
        const normF = moveForward / len;
        const normR = moveRight / len;

        const speed = this.panSpeed * (this.distance / 65) * deltaTime;
        const dx = (normR * Math.cos(this.yaw) + normF * Math.sin(this.yaw)) * speed;
        const dz = (-normR * Math.sin(this.yaw) + normF * Math.cos(this.yaw)) * speed;

        this.desiredTarget.x += dx;
        this.desiredTarget.z += dz;

        this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -105, 105);
        this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -75, 75);
      }
    }

    // Smooth lerp to desired target. Faster tracking in gameplay mode.
    const lerpSpeed = this.mode === 'gameplay' ? 15 : 12;
    this.target.lerp(this.desiredTarget, 1 - Math.exp(-lerpSpeed * deltaTime));

    this.updateCameraTransform();
  }
}
