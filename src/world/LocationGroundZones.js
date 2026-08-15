import * as THREE from 'three';
import { getTerrainHeight } from './MapData.js';

export class LocationGroundZones {
    constructor(scene) {
        this.buildRelayGround(scene);
        this.buildGasStationGround(scene);
    }

    buildRelayGround(scene) {
        const group = new THREE.Group();
        group.name = 'RelayGroundZones';
        const y = getTerrainHeight(-95, 70) + 0.04;
        group.position.set(-95, y, 70);
        group.rotation.y = Math.PI * 0.42;
        group.scale.setScalar(1.15);
        scene.add(group);

        // 4. Perimeter transition - ring of mixed dirt/grass
        this.addPolygon(group, [
            [-12, -10], [-8, -13], [0, -15], [9, -12], [14, -6],
            [15, 3], [12, 10], [5, 14], [-4, 13], [-11, 8], [-14, 0]
        ], 0x5a6a34, 0.00);

        // 1. Main base footprint - irregular beaten dirt polygon
        this.addPolygon(group, [
            [-10, -8], [-5, -10], [2, -11], [7, -9], [11, -4],
            [12, 2], [9, 8], [3, 11], [-3, 10], [-9, 6], [-11, 0]
        ], 0x6e5a3c, 0.01);

        // 2. Inner courtyard - slightly lighter packed earth
        this.addPolygon(group, [
            [-6, -4], [-2, -6], [3, -5], [6, -2],
            [7, 3], [4, 6], [-1, 7], [-5, 4], [-7, 0]
        ], 0x7a6a48, 0.02);

        // 3. Road arrival approach - elongated polygon connecting from the road
        this.addPolygon(group, [
            [-3, 6], [3, 6], [5, 12], [6, 18], [4, 25],
            [-2, 26], [-4, 19], [-5, 12]
        ], 0x4a4842, 0.03);
    }

    buildGasStationGround(scene) {
        const group = new THREE.Group();
        group.name = 'GasStationGroundZones';
        const y = getTerrainHeight(-66, -34) + 0.04;
        group.position.set(-66, y, -34);
        group.rotation.y = Math.PI * 0.82;
        group.scale.setScalar(1.15);
        scene.add(group);

        // 2. Parking area - broader gravel/dirt polygon around the forecourt
        this.addPolygon(group, [
            [-18, -12], [-10, -15], [0, -14], [12, -16], [19, -10],
            [22, -2], [18, 8], [10, 14], [0, 16], [-12, 13], [-19, 5]
        ], 0x5a5448, 0.00);

        // 1. Forecourt - large cracked concrete/asphalt polygon where pumps sit
        this.addPolygon(group, [
            [-14, -8], [-5, -10], [5, -11], [14, -8],
            [16, 0], [13, 7], [4, 10], [-6, 9], [-15, 3]
        ], 0x3e4042, 0.01);

        // 3. Building pad - concrete slab under the store building
        this.addPolygon(group, [
            [-8, -6], [2, -6], [3, -5], [3, 2],
            [2, 3], [-8, 3], [-9, 2], [-9, -5]
        ], 0x6b695e, 0.02);

        // 4. Road connection - asphalt tongue connecting to the dirt path approach
        this.addPolygon(group, [
            [8, 7], [13, 7], [16, 12], [18, 18], [21, 25],
            [16, 26], [12, 19], [9, 13]
        ], 0x34383c, 0.02);

        // 5. Grass intrusion patches - small green polygons breaking through cracks
        this.addPolygon(group, [
            [-12, -4], [-9, -5], [-8, -2], [-11, -1]
        ], 0x4a6e28, 0.03);

        this.addPolygon(group, [
            [5, 4], [8, 3], [10, 5], [7, 7]
        ], 0x4a6e28, 0.03);
        
        this.addPolygon(group, [
            [-3, -8], [-1, -9], [1, -7], [-2, -6]
        ], 0x4a6e28, 0.03);
    }

    addPolygon(group, points, color, heightOffset) {
        const shape = new THREE.Shape();
        if (points.length === 0) return;
        
        shape.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i][0], points[i][1]);
        }
        
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        
        const mat = new THREE.MeshLambertMaterial({
            color: color,
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = heightOffset;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
}
