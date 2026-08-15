import * as THREE from 'three';
import { proceduralTextures } from '../rendering/ProceduralTextures.js';

export class LocationGroundZones {
    constructor(roots) {
        this.dirtMaps = proceduralTextures.getDirtTexture(256);
        this.concreteMaps = proceduralTextures.getConcreteTexture(256);
        this.asphaltMaps = proceduralTextures.getAsphaltTexture(256);

        this.buildRelayGround(roots.relay);
        this.buildGasStationGround(roots.gasStation);
    }

    buildRelayGround(root) {
        // 4. Perimeter transition - ring of mixed dirt/grass
        this.addPolygon(root, [
            [-14, -12], [-8, -14], [0, -15], [10, -13], [15, -6],
            [15, 6], [12, 12], [5, 14], [-5, 13], [-12, 9], [-15, 0]
        ], 0x566832, 0.00, this.dirtMaps, 0.92);

        // 1. Main base footprint - irregular beaten dirt polygon
        this.addPolygon(root, [
            [-11, -9], [-5, -11], [2, -11], [8, -9], [12, -4],
            [12, 4], [9, 9], [3, 11], [-4, 10], [-10, 7], [-12, 0]
        ], 0x6a5438, 0.01, this.dirtMaps, 0.90);

        // 2. Inner courtyard - packed earth
        this.addPolygon(root, [
            [-8, -6], [-2, -7], [4, -6], [8, -2],
            [8, 4], [4, 7], [-2, 7], [-7, 5], [-8, 0]
        ], 0x766444, 0.02, this.dirtMaps, 0.88);

        // 3. Road arrival approach - elongated tongue connecting to road through 4.5m gate
        this.addPolygon(root, [
            [-3.5, 4.0], [3.5, 4.0], [4.5, 12], [5.5, 18], [4, 25],
            [-2, 26], [-4, 19], [-4.5, 12]
        ], 0x46443e, 0.03, this.asphaltMaps, 0.84);
    }

    buildGasStationGround(root) {
        // 1. Broad gravel/dirt apron surrounding forecourt and store
        this.addPolygon(root, [
            [-14, -14], [0, -15], [14, -14], [16, -6], [16, 8],
            [12, 16], [0, 18], [-12, 16], [-16, 8], [-16, -6]
        ], 0x565044, 0.00, this.dirtMaps, 0.94);

        // 2. Forecourt - cracked concrete/asphalt polygon where pumps and canopy sit
        this.addPolygon(root, [
            [-12, -6], [12, -6], [12, 8], [8, 14],
            [-4, 14], [-12, 8]
        ], 0x3a3c3e, 0.01, this.asphaltMaps, 0.82);

        // 3. Store Building Pad - concrete pad under convenience store (Y: -12 .. -5)
        this.addPolygon(root, [
            [-7.0, -13.0], [7.0, -13.0], [7.0, -4.5], [-7.0, -4.5]
        ], 0x66686b, 0.02, this.concreteMaps, 0.85);

        // 4. Road connection - asphalt tongue leading from roadside turnoff into forecourt
        this.addPolygon(root, [
            [-9.0, 8.0], [-3.0, 8.0], [-4.0, 18.0], [-10.0, 18.0]
        ], 0x303438, 0.02, this.asphaltMaps, 0.82);

        // 5. Grass intrusion patches breaking through cracked asphalt
        this.addPolygon(root, [
            [-10, 2], [-7, 1], [-6, 4], [-9, 5]
        ], 0x466c24, 0.03, null, 0.88);

        this.addPolygon(root, [
            [6, 3], [9, 2], [10, 5], [7, 6]
        ], 0x466c24, 0.03, null, 0.88);
    }

    addPolygon(root, points, color, heightOffset, texturePack = null, roughness = 0.88) {
        const shape = new THREE.Shape();
        if (points.length === 0) return;
        
        shape.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i][0], points[i][1]);
        }
        
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            map: texturePack ? texturePack.diffuse : null,
            roughnessMap: texturePack ? texturePack.roughness : null,
            roughness: roughness,
            metalness: 0.04,
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = heightOffset;
        mesh.receiveShadow = true;
        
        mesh.userData.isWalkable = true;
        mesh.userData.surfaceType = 'ground';
        
        root.add(mesh);
    }
}
