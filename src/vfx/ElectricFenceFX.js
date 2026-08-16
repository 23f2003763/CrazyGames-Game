import * as THREE from 'three';

export class ElectricFenceFX {
  constructor(scene, audioSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem;
    this.fenceSections = [];
    this.activeArcs = [];
    this.arcTimer = 0;
    this.nextArcTime = 1.5 + Math.random() * 1.5;
    
    // Find all fence meshes in scene
    this.findFences();
  }

  findFences() {
    // Wait slightly to ensure world generation is done
    setTimeout(() => {
      this.scene.traverse((child) => {
        // Assume fence meshes have 'fence' in their name or user data
        if (child.isMesh && (child.name.toLowerCase().includes('fence') || (child.parent && child.parent.name.toLowerCase().includes('fence')))) {
          // Verify we haven't already processed this one
          if (!child.userData.hasElectricFX) {
            child.userData.hasElectricFX = true;
            this.addWiresToFence(child);
          }
        }
      });
    }, 1000); // 1s delay
  }

  addWiresToFence(fenceMesh) {
    // Compute bounding box to determine fence width and height
    fenceMesh.geometry.computeBoundingBox();
    const bbox = fenceMesh.geometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    
    // Create 3 thin cyan-white emissive wire lines running horizontally
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const wiresGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const yOffset = bbox.min.y + (height * 0.3) + (i * height * 0.25);
      const points = [
        new THREE.Vector3(bbox.min.x, yOffset, 0),
        new THREE.Vector3(bbox.max.x, yOffset, 0)
      ];
      const wireGeo = new THREE.BufferGeometry().setFromPoints(points);
      const wire = new THREE.Line(wireGeo, wireMat.clone());
      wiresGroup.add(wire);
    }
    
    // Add to fence local space
    fenceMesh.add(wiresGroup);
    
    // Store fence info
    const worldPos = new THREE.Vector3();
    fenceMesh.getWorldPosition(worldPos);
    this.fenceSections.push({
      mesh: fenceMesh,
      wires: wiresGroup,
      worldPos: worldPos,
      baseOpacity: 0.6,
      bbox: bbox
    });
  }

  spawnArc(fenceSection) {
    const bbox = fenceSection.bbox;
    const startX = bbox.min.x + Math.random() * (bbox.max.x - bbox.min.x);
    const endX = startX + (Math.random() - 0.5) * 1.5;
    const startY = bbox.min.y + Math.random() * (bbox.max.y - bbox.min.y);
    const endY = startY + (Math.random() - 0.5) * 1.5;

    const points = [];
    const segments = 5;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = new THREE.Vector3(
        startX + (endX - startX) * t,
        startY + (endY - startY) * t,
        (Math.random() - 0.5) * 0.2
      );
      points.push(pt);
    }
    
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });
    const arcMesh = new THREE.Line(geo, mat);
    fenceSection.mesh.add(arcMesh);

    this.activeArcs.push({
      mesh: arcMesh,
      lifetime: 0.08 + Math.random() * 0.07,
      parent: fenceSection.mesh
    });
  }

  update(dt, playerPos) {
    if (!playerPos || this.fenceSections.length === 0) return;

    // 1. Subtle emissive pulse on wires
    const time = Date.now() * 0.003;
    const pulseIntensity = (Math.sin(time) + 1.0) * 0.5;

    let nearestDist = Infinity;
    let nearestSection = null;
    
    // Process sections within 25m
    const activeSections = [];

    for (const section of this.fenceSections) {
      // Update world pos just in case
      section.mesh.getWorldPosition(section.worldPos);
      const dist = section.worldPos.distanceTo(playerPos);
      
      if (dist < 25.0) {
        activeSections.push(section);
        
        // Pulse wires
        section.wires.children.forEach(wire => {
          wire.material.opacity = section.baseOpacity * (0.6 + 0.4 * pulseIntensity);
        });

        // Player proximity reaction (~0.7m)
        // Since worldPos is object center, let's roughly check distance
        // Realistically, fence meshes are 4-5m wide. 
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestSection = section;
        }
      }
    }

    // Check proximity on nearest
    if (nearestSection && nearestDist < 2.5) { 
      // Approximate 0.7m to surface by checking bounding box locally
      const localPlayer = nearestSection.mesh.worldToLocal(playerPos.clone());
      const box = nearestSection.bbox;
      // Expanded slightly for 0.7m radius
      if (localPlayer.x > box.min.x - 0.7 && localPlayer.x < box.max.x + 0.7 &&
          localPlayer.z > box.min.z - 0.7 && localPlayer.z < box.max.z + 0.7) {
        
        if (!nearestSection.inProximity) {
          nearestSection.inProximity = true;
          nearestSection.baseOpacity = 1.0;
          this.spawnArc(nearestSection);
          if (this.audioSystem && this.audioSystem.playProximityShock) {
            this.audioSystem.playProximityShock();
          }
        }
      } else {
        if (nearestSection.inProximity) {
          nearestSection.inProximity = false;
          nearestSection.baseOpacity = 0.6;
        }
      }
    }

    // 2. Random arcs every 1.5-3s on a nearby section
    if (activeSections.length > 0) {
      this.arcTimer += dt;
      if (this.arcTimer >= this.nextArcTime) {
        this.arcTimer = 0;
        this.nextArcTime = 1.5 + Math.random() * 1.5;
        const targetSection = activeSections[Math.floor(Math.random() * activeSections.length)];
        this.spawnArc(targetSection);
      }
    }

    // 3. Update active arcs
    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      const arc = this.activeArcs[i];
      arc.lifetime -= dt;
      if (arc.lifetime <= 0) {
        arc.parent.remove(arc.mesh);
        arc.mesh.geometry.dispose();
        arc.mesh.material.dispose();
        this.activeArcs.splice(i, 1);
      }
    }
  }
}
