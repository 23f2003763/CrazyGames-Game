import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

export class SurvivorCampDressing {
    constructor(root) {
        this.group = root;

        this.buildGroundZones();
        this.buildCampfire();
        this.buildShelters();
        this.buildSupplies();
        this.buildPerimeter();
        this.buildWorkArea();
    }

    buildGroundZones() {
        const dirtColor = 0x6e5a3c;
        const grassColor = 0x4a6e28;
        const charcoalColor = 0x1e1e1e;

        // Main dirt clearing
        const dirtShape = new THREE.Shape();
        const numPoints = 12;
        const radius = 18;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = radius * (0.8 + Math.random() * 0.4);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            if (i === 0) dirtShape.moveTo(x, z);
            else dirtShape.lineTo(x, z);
        }
        
        // Add path connecting towards x=28, z=-38 (relative from x=36, z=-62 is x=-8, z=24)
        dirtShape.lineTo(-2, 10);
        dirtShape.lineTo(-5, 18);
        dirtShape.lineTo(-2, 22);
        dirtShape.lineTo(3, 16);
        dirtShape.lineTo(5, 8);
        
        const dirtGeom = new THREE.ShapeGeometry(dirtShape);
        const dirtMat = new THREE.MeshStandardMaterial({ 
            color: dirtColor, 
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const dirtMesh = new THREE.Mesh(dirtGeom, dirtMat);
        dirtMesh.rotation.x = -Math.PI / 2;
        dirtMesh.position.y = 0.05;
        dirtMesh.receiveShadow = true;
        this.group.add(dirtMesh);

        // Grass patches
        const grassMat = new THREE.MeshStandardMaterial({
            color: grassColor,
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        for (let i = 0; i < 4; i++) {
            const gx = (Math.random() - 0.5) * 24;
            const gz = (Math.random() - 0.5) * 24;
            if (gx * gx + gz * gz < 25) continue; // Keep center clear
            
            const grassShape = new THREE.Shape();
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2;
                const r = 3 + Math.random() * 2;
                if (j === 0) grassShape.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
                else grassShape.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            }
            const grassMesh = new THREE.Mesh(new THREE.ShapeGeometry(grassShape), grassMat);
            grassMesh.rotation.x = -Math.PI / 2;
            grassMesh.position.set(gx, 0.06, gz);
            grassMesh.receiveShadow = true;
            this.group.add(grassMesh);
        }

        // Fire-blackened circle
        const fireShape = new THREE.Shape();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = 2.5 + Math.random() * 0.5;
            if (i === 0) fireShape.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
            else fireShape.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
        }
        const fireMat = new THREE.MeshStandardMaterial({
            color: charcoalColor,
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3
        });
        const fireGround = new THREE.Mesh(new THREE.ShapeGeometry(fireShape), fireMat);
        fireGround.rotation.x = -Math.PI / 2;
        fireGround.position.set(0, 0.07, 0); // Center
        fireGround.receiveShadow = true;
        this.group.add(fireGround);
    }

    buildCampfire() {
        const stoneColor = 0x585852;
        const woodColor = 0x5c4228;
        
        // Stone ring
        const stoneGeom = new THREE.DodecahedronGeometry(0.4, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, flatShading: true });
        
        const numStones = 10;
        for (let i = 0; i < numStones; i++) {
            const angle = (i / numStones) * Math.PI * 2;
            const r = 1.2;
            const stone = new THREE.Mesh(stoneGeom, stoneMat);
            stone.position.set(Math.cos(angle) * r, 0.2, Math.sin(angle) * r);
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            stone.scale.set(1, 0.6 + Math.random()*0.4, 1);
            stone.castShadow = true;
            stone.receiveShadow = true;
            this.group.add(stone);
        }

        // Charred log pieces
        const logGeom = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 5);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x2e1f14, flatShading: true }); // darker wood
        for(let i=0; i<3; i++) {
            const log = new THREE.Mesh(logGeom, logMat);
            const angle = i * Math.PI * 2 / 3;
            log.position.set(Math.cos(angle)*0.4, 0.2, Math.sin(angle)*0.4);
            log.rotation.set(Math.PI/2, Math.random(), angle + Math.PI/4);
            log.castShadow = true;
            log.receiveShadow = true;
            this.group.add(log);
        }

        // Emissive glow disc
        const glowGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 8);
        const glowMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3300, 
            emissive: 0xff6a20, 
            emissiveIntensity: 1.5,
            flatShading: true
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.set(0, 0.1, 0);
        this.group.add(glow);

        // Seat stumps
        const stumpGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 7);
        const stumpMat = new THREE.MeshStandardMaterial({ color: woodColor, flatShading: true });
        for(let i=0; i<3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI/6;
            const r = 2.5;
            const stump = new THREE.Mesh(stumpGeom, stumpMat);
            stump.position.set(Math.cos(angle)*r, 0.3, Math.sin(angle)*r);
            stump.rotation.y = Math.random();
            stump.rotation.x = (Math.random()-0.5)*0.2;
            stump.rotation.z = (Math.random()-0.5)*0.2;
            stump.castShadow = true;
            stump.receiveShadow = true;
            this.group.add(stump);
        }
    }

    buildShelters() {
        const canvasColor = 0x8a7e62;
        const woodColor = 0x5c4228;
        const tarpColor = 0x2a5c7a;

        const canvasMat = new THREE.MeshStandardMaterial({ color: canvasColor, flatShading: true, side: THREE.DoubleSide });
        const tarpMat = new THREE.MeshStandardMaterial({ color: tarpColor, flatShading: true, side: THREE.DoubleSide });
        const poleMat = new THREE.MeshStandardMaterial({ color: woodColor, flatShading: true });
        const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 1, 5);

        // 1. Large A-frame tent
        const aFrameGroup = new THREE.Group();
        
        const tentWidth = 3;
        const tentLength = 4;
        const tentHeight = 2.5;
        
        // Roof
        const roofGeom = new THREE.ConeGeometry(tentWidth/2 + 0.2, tentLength, 4, 1, true);
        const roof = new THREE.Mesh(roofGeom, canvasMat);
        roof.rotation.x = Math.PI/2;
        roof.rotation.z = Math.PI/4; // Rotate to make it A-frame
        roof.scale.set(1, 1, tentHeight / (tentWidth/2));
        roof.position.y = tentHeight / 2;
        roof.castShadow = true;
        roof.receiveShadow = true;
        aFrameGroup.add(roof);
        
        // Poles
        for (let i=0; i<4; i++) {
            const x = (i%2 === 0 ? 1 : -1) * (tentWidth/2 - 0.2);
            const z = (i < 2 ? 1 : -1) * (tentLength/2 - 0.2);
            const p = new THREE.Mesh(poleGeom, poleMat);
            p.scale.y = tentHeight;
            p.position.set(x, tentHeight/2, z);
            p.rotation.z = (x>0 ? 1 : -1) * 0.3;
            p.castShadow = true;
            p.receiveShadow = true;
            aFrameGroup.add(p);
        }

        aFrameGroup.position.set(-8, 0, -4);
        aFrameGroup.rotation.y = Math.PI / 6;
        this.group.add(aFrameGroup);

        // 2 & 3. Lean-to shelters
        for (let j = 0; j < 2; j++) {
            const leanTo = new THREE.Group();
            
            // Tarp
            const ltTarpGeom = new THREE.PlaneGeometry(2.5, 3);
            const ltTarp = new THREE.Mesh(ltTarpGeom, tarpMat);
            ltTarp.rotation.x = -Math.PI / 4;
            ltTarp.position.set(0, 1.2, 0);
            ltTarp.castShadow = true;
            ltTarp.receiveShadow = true;
            leanTo.add(ltTarp);

            // Back supports
            for(let i=0; i<2; i++) {
                const px = i === 0 ? -1.1 : 1.1;
                const p = new THREE.Mesh(poleGeom, poleMat);
                p.scale.y = 2.5;
                p.rotation.x = Math.PI / 4;
                p.position.set(px, 1.0, 0.2);
                p.castShadow = true;
                p.receiveShadow = true;
                leanTo.add(p);
            }
            
            // Cross beam
            const cross = new THREE.Mesh(poleGeom, poleMat);
            cross.scale.y = 2.8;
            cross.rotation.z = Math.PI / 2;
            cross.position.set(0, 2.0, -0.6);
            cross.castShadow = true;
            cross.receiveShadow = true;
            leanTo.add(cross);

            if (j === 0) {
                leanTo.position.set(4, 0, -8);
                leanTo.rotation.y = -Math.PI / 4;
            } else {
                leanTo.position.set(8, 0, 2);
                leanTo.rotation.y = -Math.PI * 0.8;
            }
            this.group.add(leanTo);
        }

        // 4. Collapsed tent
        const collapsedGroup = new THREE.Group();
        const colCanvas = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), canvasMat);
        colCanvas.position.y = 0.15;
        colCanvas.rotation.y = Math.random();
        colCanvas.rotation.x = 0.1;
        colCanvas.rotation.z = -0.1;
        colCanvas.castShadow = true;
        colCanvas.receiveShadow = true;
        collapsedGroup.add(colCanvas);
        
        for(let i=0; i<3; i++) {
            const pole = new THREE.Mesh(poleGeom, poleMat);
            pole.scale.y = 2;
            pole.rotation.set(Math.PI/2, Math.random(), Math.random());
            pole.position.set(Math.random()-0.5, 0.2, Math.random()-0.5);
            pole.castShadow = true;
            pole.receiveShadow = true;
            collapsedGroup.add(pole);
        }
        collapsedGroup.position.set(-6, 0, 6);
        this.group.add(collapsedGroup);
    }

    buildSupplies() {
        const woodColor = 0x5c4228;
        const metalColor = 0x4a4e52;
        const ropeColor = 0xb89e68;
        
        const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, flatShading: true });
        const metalMat = new THREE.MeshStandardMaterial({ color: metalColor, flatShading: true });
        const ropeMat = new THREE.MeshStandardMaterial({ color: ropeColor, flatShading: true });

        // Crates
        const crateGeom = new THREE.BoxGeometry(1, 1, 1);
        const cratesGroup = new THREE.Group();
        
        const c1 = new THREE.Mesh(crateGeom, woodMat);
        c1.position.set(0, 0.5, 0);
        c1.rotation.y = 0.1;
        
        const c2 = new THREE.Mesh(crateGeom, woodMat);
        c2.position.set(1.2, 0.5, -0.2);
        c2.rotation.y = -0.2;
        
        const c3 = new THREE.Mesh(crateGeom, woodMat);
        c3.position.set(0.6, 1.5, 0.1);
        c3.rotation.y = 0.5;

        [c1, c2, c3].forEach(c => {
            c.castShadow = true;
            c.receiveShadow = true;
            cratesGroup.add(c);
        });

        cratesGroup.position.set(6, 0, 8);
        this.group.add(cratesGroup);

        // Water barrel
        const barrelGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a5c7a, flatShading: true }); // Blue plastic
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.position.set(7.5, 0.6, 7);
        barrel.rotation.y = Math.random();
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        this.group.add(barrel);

        // Metal sheets
        const sheetGeom = new THREE.BoxGeometry(1.5, 2, 0.05);
        for(let i=0; i<3; i++) {
            const sheet = new THREE.Mesh(sheetGeom, metalMat);
            sheet.position.set(-9 + i*0.2, 1.0, 3 + i*0.1);
            sheet.rotation.set(-0.2, 0.4 + i*0.1, 0.1);
            sheet.castShadow = true;
            sheet.receiveShadow = true;
            this.group.add(sheet);
        }

        // Laundry line
        const laundryGroup = new THREE.Group();
        const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 5);
        
        const pole1 = new THREE.Mesh(poleGeom, woodMat);
        pole1.position.set(-3, 1.25, -9);
        const pole2 = new THREE.Mesh(poleGeom, woodMat);
        pole2.position.set(3, 1.25, -9);
        
        const lineGeom = new THREE.CylinderGeometry(0.02, 0.02, 6, 4);
        const line = new THREE.Mesh(lineGeom, ropeMat);
        line.rotation.z = Math.PI / 2;
        line.position.set(0, 2.3, -9);
        
        [pole1, pole2, line].forEach(m => {
            m.castShadow = true;
            m.receiveShadow = true;
            laundryGroup.add(m);
        });

        // Clothes
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, flatShading: true });
        const redClothMat = new THREE.MeshStandardMaterial({ color: 0x8a3a3a, flatShading: true });
        
        const cGeom = new THREE.BoxGeometry(0.8, 1.2, 0.05);
        const cloth1 = new THREE.Mesh(cGeom, clothMat);
        cloth1.position.set(-1.5, 1.7, -9);
        
        const cloth2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.05), redClothMat);
        cloth2.position.set(0.5, 1.85, -9);
        
        const cloth3 = new THREE.Mesh(cGeom, clothMat);
        cloth3.position.set(2, 1.7, -9);

        [cloth1, cloth2, cloth3].forEach(c => {
            c.castShadow = true;
            c.receiveShadow = true;
            c.rotation.x = 0.1 + Math.random()*0.2;
            laundryGroup.add(c);
        });

        this.group.add(laundryGroup);
    }

    buildPerimeter() {
        const woodColor = 0x5c4228;
        const ropeColor = 0xb89e68;
        
        const stakeMat = new THREE.MeshStandardMaterial({ color: woodColor, flatShading: true });
        const ropeMat = new THREE.MeshStandardMaterial({ color: ropeColor, flatShading: true });
        
        const stakeGeom = new THREE.ConeGeometry(0.15, 2.5, 5);
        // Translate geometry so origin is at bottom
        stakeGeom.translate(0, 1.25, 0);

        const perimeterRadius = 14;
        const numStakes = 8;
        const stakes = [];
        
        // Build stakes in a partial arc
        for (let i = 0; i < numStakes; i++) {
            // Span arc from roughly 0 to PI
            const angle = (i / (numStakes - 1)) * Math.PI - Math.PI/4;
            
            // Skip one to make a broken section
            if (i === 4) continue;
            
            const x = Math.cos(angle) * perimeterRadius;
            const z = Math.sin(angle) * perimeterRadius;
            
            const stake = new THREE.Mesh(stakeGeom, stakeMat);
            stake.position.set(x, 0, z);
            
            // Random lean
            stake.rotation.x = (Math.random() - 0.5) * 0.3;
            stake.rotation.z = (Math.random() - 0.5) * 0.3;
            stake.rotation.y = Math.random() * Math.PI;
            
            stake.castShadow = true;
            stake.receiveShadow = true;
            this.group.add(stake);
            stakes.push({mesh: stake, pos: new THREE.Vector3(x, 2.0, z)});
        }
        
        // Add rope between consecutive stakes
        for (let i = 0; i < stakes.length - 1; i++) {
            const p1 = stakes[i].pos;
            const p2 = stakes[i+1].pos;
            const distance = p1.distanceTo(p2);
            
            // Don't string rope across huge gaps (the broken section)
            if (distance > 8) continue;
            
            const ropeGeom = new THREE.CylinderGeometry(0.03, 0.03, distance, 4);
            const rope = new THREE.Mesh(ropeGeom, ropeMat);
            
            // Position midpoint
            rope.position.copy(p1).add(p2).multiplyScalar(0.5);
            
            // Sag slightly
            rope.position.y -= 0.2; 
            
            // Orient
            rope.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                p2.clone().sub(p1).normalize()
            );
            
            rope.castShadow = true;
            rope.receiveShadow = true;
            this.group.add(rope);
        }
    }

    buildWorkArea() {
        const woodColor = 0x5c4228;
        const metalColor = 0x4a4e52;
        const tireColor = 0x1e1e1e;
        
        const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, flatShading: true });
        const tireMat = new THREE.MeshStandardMaterial({ color: tireColor, flatShading: true });
        
        const workGroup = new THREE.Group();
        workGroup.position.set(0, 0, 10); // Placed at edge of clearing
        
        // Workbench
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), woodMat);
        tableTop.position.set(0, 1.0, 0);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        workGroup.add(tableTop);
        
        const legGeom = new THREE.BoxGeometry(0.15, 1.0, 0.15);
        const offsets = [[-1.1, -0.5], [-1.1, 0.5], [1.1, -0.5], [1.1, 0.5]];
        offsets.forEach(off => {
            const leg = new THREE.Mesh(legGeom, woodMat);
            leg.position.set(off[0], 0.5, off[1]);
            leg.castShadow = true;
            leg.receiveShadow = true;
            workGroup.add(leg);
        });
        
        // Tire
        const tireGeom = new THREE.TorusGeometry(0.4, 0.15, 8, 16);
        const tire1 = new THREE.Mesh(tireGeom, tireMat);
        tire1.position.set(-2, 0.15, 0);
        tire1.rotation.x = Math.PI / 2;
        tire1.castShadow = true;
        tire1.receiveShadow = true;
        workGroup.add(tire1);
        
        const tire2 = new THREE.Mesh(tireGeom, tireMat);
        tire2.position.set(-1.8, 0.3, 0.5);
        tire2.rotation.x = Math.PI / 2 + 0.2;
        tire2.rotation.y = 0.3;
        tire2.castShadow = true;
        tire2.receiveShadow = true;
        workGroup.add(tire2);
        
        // Scrap metal piece on table
        const scrapMat = new THREE.MeshStandardMaterial({ color: metalColor, flatShading: true });
        const scrap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), scrapMat);
        scrap.position.set(0.5, 1.1, 0);
        scrap.rotation.z = Math.PI / 2;
        scrap.rotation.y = 0.5;
        scrap.castShadow = true;
        scrap.receiveShadow = true;
        workGroup.add(scrap);

        this.group.add(workGroup);
    }
}
