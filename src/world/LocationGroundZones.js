import * as THREE from 'three';

export class LocationGroundZones {
    constructor(roots) {
        this.buildRelayGround(roots.relay);
        this.buildGasStationGround(roots.gasStation);
    }

    buildRelayGround(root) {
        // 4. Perimeter transition - ring of mixed dirt/grass
        this.addPolygon(root, [
            [-14, -12], [-8, -14], [0, -15], [10, -13], [15, -6],
            [15, 6], [12, 12], [5, 14], [-5, 13], [-12, 9], [-15, 0]
        ], 0x5a6a34, 0.00);

        // 1. Main base footprint - irregular beaten dirt polygon
        this.addPolygon(root, [
            [-11, -9], [-5, -11], [2, -11], [8, -9], [12, -4],
            [12, 4], [9, 9], [3, 11], [-4, 10], [-10, 7], [-12, 0]
        ], 0x6e5a3c, 0.01);

        // 2. Inner courtyard - packed earth
        this.addPolygon(root, [
            [-8, -6], [-2, -7], [4, -6], [8, -2],
            [8, 4], [4, 7], [-2, 7], [-7, 5], [-8, 0]
        ], 0x7a6a48, 0.02);

        // 3. Road arrival approach - elongated tongue connecting to road through 4.5m gate
        this.addPolygon(root, [
            [-3.5, 4.0], [3.5, 4.0], [4.5, 12], [5.5, 18], [4, 25],
            [-2, 26], [-4, 19], [-4.5, 12]
        ], 0x4a4842, 0.03);
    }

    buildGasStationGround(root) {
        // 1. Broad gravel/dirt apron surrounding forecourt and store
        this.addPolygon(root, [
            [-14, -14], [0, -15], [14, -14], [16, -6], [16, 8],
            [12, 16], [0, 18], [-12, 16], [-16, 8], [-16, -6]
        ], 0x5a5448, 0.00);

        // 2. Forecourt - cracked concrete/asphalt polygon where pumps and canopy sit
        this.addPolygon(root, [
            [-12, -6], [12, -6], [12, 8], [8, 14],
            [-4, 14], [-12, 8]
        ], 0x3e4042, 0.01);

        // 3. Store Building Pad - concrete pad under convenience store (Y: -12 .. -5)
        this.addPolygon(root, [
            [-7.0, -13.0], [7.0, -13.0], [7.0, -4.5], [-7.0, -4.5]
        ], 0x6b695e, 0.02);

        // 4. Road connection - asphalt tongue leading from roadside turnoff into forecourt
        this.addPolygon(root, [
            [-9.0, 8.0], [-3.0, 8.0], [-4.0, 18.0], [-10.0, 18.0]
        ], 0x34383c, 0.02);

        // 5. Grass intrusion patches breaking through cracked asphalt
        this.addPolygon(root, [
            [-10, 2], [-7, 1], [-6, 4], [-9, 5]
        ], 0x4a6e28, 0.03);

        this.addPolygon(root, [
            [6, 3], [9, 2], [10, 5], [7, 6]
        ], 0x4a6e28, 0.03);
    }

    addPolygon(root, points, color, heightOffset) {
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
        
        mesh.userData.isWalkable = true;
        mesh.userData.surfaceType = 'ground';
        
        root.add(mesh);
    }
}
