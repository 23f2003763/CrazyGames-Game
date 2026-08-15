import * as THREE from 'three';
import { CLEARINGS } from '../world/MapData.js';

export class IsometricCamera {
  constructor(domElement) {
    this.domElement = domElement;
    
    // Isometric angle parameters
    this.pitch = THREE.MathUtils.degToRad(50);
    this.yaw = THREE.MathUtils.degToRad(45);
    
    // Zoom limits
    this.gameplayMinDist = 19;
    this.gameplayMaxDist = 30;
    this.inspectionMinDist = 18;
    this.inspectionMaxDist = 88;
    
    this.distance = 23.5; // Calibrated for ~90-100px character height at 1080p

    // Modes: 'gameplay' | 'inspection'
    this.mode = 'gameplay';
    this.player = null;

    // Target positions in world space
    this.target = new THREE.Vector3(0, 0, 0);
    this.desiredTarget = new THREE.Vector3(0, 0, 0);

    // Provide a pivot object to expose our yaw rotation easily to PlayerController
    this.pivot = new THREE.Object3D();
    this.pivot.rotation.y = this.yaw;

    // Perspective Camera setup with FOV 38
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 1200);
    this.updateCameraTransform();

    // Interaction state
    this.keys = {};
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.panSpeed = 55;

    // Debug callback hooks for F7 / F9
    this.onToggleColliders = null;
    this.onToggleWalkable = null;

    this.bindEvents();
    this.setMode('gameplay');
  }

  setPlayer(player) {
    this.player = player;
    if (this.player) {
      this.desiredTarget.copy(this.player.position);
      this.target.copy(this.player.position);
      this.updateCameraTransform();
    }
  }

  setMode(newMode) {
    this.mode = newMode;
    const hud = document.getElementById('inspector-hud');
    
    if (this.mode === 'gameplay') {
      if (hud) hud.style.display = 'none';
      if (this.player) {
        this.desiredTarget.copy(this.player.position);
      }
      this.distance = THREE.MathUtils.clamp(this.distance, this.gameplayMinDist, this.gameplayMaxDist);
    } else {
      if (hud) hud.style.display = 'flex';
      this.distance = THREE.MathUtils.clamp(this.distance, this.inspectionMinDist, this.inspectionMaxDist);
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
        start:      { y: 2.5, dist: 42 },
        gasStation: { y: 2.5, dist: 44 },
        ravine:     { y: 2.0, dist: 46 },
        camp:       { y: 2.0, dist: 42 },
        checkpoint: { y: 2.2, dist: 44 },
        farm:       { y: 2.0, dist: 55 },
      };
      const cfg = framingConfig[clearingId] || { y: 2.0, dist: 50 };
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

      // F8 Toggle Inspection HUD
      if (e.code === 'F8') {
        e.preventDefault();
        this.toggleMode();
      }

      // F6 Toggle Foundation / Material Debug
      if (e.code === 'F6') {
        e.preventDefault();
        if (this.onToggleFoundationDebug) this.onToggleFoundationDebug();
      }

      // F7 Toggle Collider Visualization
      if (e.code === 'F7') {
        e.preventDefault();
        if (this.onToggleColliders) this.onToggleColliders();
      }

      // F9 Toggle Walkable Surface Visualization
      if (e.code === 'F9') {
        e.preventDefault();
        if (this.onToggleWalkable) this.onToggleWalkable();
      }

      // Quick POI hotkeys [1 - 6] in inspection mode
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

      this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -115, 115);
      this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -85, 85);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.domElement.addEventListener('contextmenu', (e) => {
      if (this.mode === 'inspection') e.preventDefault();
    });

    window.addEventListener('wheel', (e) => {
      this.distance += e.deltaY * 0.04;
      const minD = this.mode === 'gameplay' ? this.gameplayMinDist : this.inspectionMinDist;
      const maxD = this.mode === 'gameplay' ? this.gameplayMaxDist : this.inspectionMaxDist;
      this.distance = THREE.MathUtils.clamp(this.distance, minD, maxD);
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
        // Player sits ~57% down screen vertically by applying a slight look-forward target lead
        this.desiredTarget.copy(this.player.position);
        
        const leadOffset = 2.2;
        this.desiredTarget.x -= Math.sin(this.yaw) * leadOffset;
        this.desiredTarget.z -= Math.cos(this.yaw) * leadOffset;
      }
    } else {
      // Inspection mode panning
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

        this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -115, 115);
        this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -85, 85);
      }
    }

    // Smooth lerp to desired target
    const lerpSpeed = this.mode === 'gameplay' ? 14 : 10;
    this.target.lerp(this.desiredTarget, 1 - Math.exp(-lerpSpeed * deltaTime));

    this.updateCameraTransform();
  }
}
