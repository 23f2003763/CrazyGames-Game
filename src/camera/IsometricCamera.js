import * as THREE from 'three';
import { CLEARINGS } from '../world/MapData.js';

/**
 * Fixed Isometric-Style Camera Controller (45-55 degree downward pitch)
 * Step 1.1: Precision camera bounds clamping and zoom limits ensuring the
 * natural mountain perimeter fully envelops the viewport in all directions.
 */
export class IsometricCamera {
  constructor(domElement) {
    this.domElement = domElement;
    
    // Isometric angle parameters
    this.pitch = THREE.MathUtils.degToRad(50);  // 50 degrees downward pitch
    this.yaw = THREE.MathUtils.degToRad(45);    // 45 degrees diagonal isometric angle
    this.distance = 65;                        // Standard isometric distance
    this.minDistance = 24;
    this.maxDistance = 88;                     // Balanced max zoom to preserve scenery immersion

    // Camera target position in world space
    this.target = new THREE.Vector3(-95, 2.5, 70); // Starts at Road Head Overlook
    this.desiredTarget = this.target.clone();

    // Perspective Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 1200);
    this.updateCameraTransform();

    // Interaction state
    this.keys = {};
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.panSpeed = 55; // Units per second via WASD

    this.bindEvents();
  }

  updateCameraTransform() {
    // Spherical offset from target using pitch and yaw
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
    const cl = CLEARINGS.find(c => c.id === clearingId);
    if (cl) {
      this.desiredTarget.set(cl.x, 2.0, cl.z);
      // Closer cinematic landmark framing for key POI hubs & combat arena
      if (clearingId === 'checkpoint') {
        this.distance = 42;
      } else if (clearingId === 'start' || clearingId === 'gasStation') {
        this.distance = 50;
      } else {
        this.distance = 65;
      }
      // Update UI active chip
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
    // Keyboard WASD / Arrows
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Quick POI hotkeys [1 - 6]
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        if (CLEARINGS[idx]) {
          this.jumpToClearing(CLEARINGS[idx].id);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse drag pan
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      // Project screen delta into isometric ground plane
      const factor = (this.distance / 900);
      const moveX = -(deltaX * Math.cos(this.yaw) - deltaY * Math.sin(this.yaw)) * factor;
      const moveZ = -(deltaX * Math.sin(this.yaw) + deltaY * Math.cos(this.yaw)) * factor;

      this.desiredTarget.x += moveX;
      this.desiredTarget.z += moveZ;

      // Clamp within playable bounds
      this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -105, 105);
      this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -75, 75);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Prevent default context menu on right click drag
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel zoom
    window.addEventListener('wheel', (e) => {
      this.distance += e.deltaY * 0.05;
      this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    }, { passive: true });

    // Touch support for mobile/trackpad
    let lastTouch = null;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && lastTouch) {
        const deltaX = e.touches[0].clientX - lastTouch.x;
        const deltaY = e.touches[0].clientY - lastTouch.y;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        const factor = (this.distance / 800);
        const moveX = -(deltaX * Math.cos(this.yaw) - deltaY * Math.sin(this.yaw)) * factor;
        const moveZ = -(deltaX * Math.sin(this.yaw) + deltaY * Math.cos(this.yaw)) * factor;

        this.desiredTarget.x += moveX;
        this.desiredTarget.z += moveZ;

        this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -105, 105);
        this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -75, 75);
      }
    }, { passive: true });

    this.domElement.addEventListener('touchend', () => {
      lastTouch = null;
    });

    // HUD Nav Chips
    const chips = document.querySelectorAll('.nav-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const poi = chip.dataset.poi;
        this.jumpToClearing(poi);
      });
    });

    // Window resize
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
  }

  update(deltaTime) {
    // Keyboard panning relative to isometric angle
    let moveForward = 0;
    let moveRight = 0;

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

      // Clamp within playable bounds
      this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -105, 105);
      this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -75, 75);
    }

    // Smooth lerp to desired target
    this.target.lerp(this.desiredTarget, 1 - Math.exp(-12 * deltaTime));

    this.updateCameraTransform();
  }
}
