import { InstancedMesh, Matrix4, Matrix3, Vector3, ArrowHelper, Group } from "three";
import ColoredSuperquadricGeometry from "./colored_superquadric_geometry";

const sphereGeometry = new ColoredSuperquadricGeometry(1, 1, 1, 2, 2, 'blue', 'yellow', 8, 8);
const mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(250);
const secondaryMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(250);
secondaryMaterial.opacity = 0.3;
secondaryMaterial.transparent = true;

export const loadFromVtk = async (file: File) => {
    let fileMesh = null;
    const str = file.arrayBuffer();
    const resBuf = await str;
    const dw = new DataView(resBuf);
    const enc = new TextDecoder();

    const coords = [];
    const tensor = [];
    const radiuses = [];
    let radiusCount = 0;
    const omegaXs = [];
    const omegaYs = [];
    const omegaZs = [];
    let omegaCount = 0;
    const shapeXs = [];
    let shapexCount = 0;
    const shapeYs = [];
    let shapeyCount = 0;
    const shapeZs = [];
    let shapezCount = 0;
    let nn = 0;

    let position = 0;
    let currPos = position;
    while (currPos < dw.byteLength) {
        while (dw.getUint8(currPos) !== '\n'.charCodeAt(0)) {
            currPos += 1;
        }
        currPos += 1;
        const line = enc.decode(resBuf.slice(position, currPos));
        let match = line.match(/POINTS ([0-9]+) float/);
        if (match) {
            nn = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + nn * 4 * 3; i += 4) {
                coords.push(dw.getFloat32(i));
            }

            currPos += nn * 4 * 3;
        }
        match = line.match(/TENSOR ([0-9]+) ([0-9]+) double/);
        if (match) {
            // nn = Number.parseInt(match[1]);
            for (let i = currPos; i < currPos + nn * 8 * 9; i += 8) {
                tensor.push(dw.getFloat64(i));
            }

            currPos += nn * 8 * 9;
        }
        match = line.match(/radius 1 ([0-9]+) double/);
        if (match) {
            radiusCount = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + radiusCount * 8; i += 8) {
                radiuses.push(dw.getFloat64(i));
            }

            currPos += radiusCount * 8;
        }
        match = line.match(/omega 3 ([0-9]+) double/);
        if (match) {
            omegaCount = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + omegaCount * 3 * 8; i += (8 * 3)) {
                omegaXs.push(dw.getFloat64(i));
                omegaYs.push(dw.getFloat64(i + 8));
                omegaZs.push(dw.getFloat64(i + 16));
            }

            currPos += omegaCount * 3 * 8;
        }
        match = line.match(/shapex 1 ([0-9]+) double/);
        if (match) {
            shapexCount = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + shapexCount * 8; i += 8) {
                shapeXs.push(dw.getFloat64(i));
            }

            currPos += shapexCount * 8;
        }
        match = line.match(/shapey 1 ([0-9]+) double/);
        if (match) {
            shapeyCount = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + shapeyCount * 8; i += 8) {
                shapeYs.push(dw.getFloat64(i));
            }

            currPos += shapeyCount * 8;
        }
        match = line.match(/shapez 1 ([0-9]+) double/);
        if (match) {
            shapezCount = Number.parseInt(match[1], 10);
            for (let i = currPos; i < currPos + shapezCount * 8; i += 8) {
                shapeZs.push(dw.getFloat64(i));
            }

            currPos += shapezCount * 8;
        }
        position = currPos;
    }
    const arrowHelpers: Array<ArrowHelper> = [];
    const goodSpots: Array<Vector3> = [];
    if (coords.length !== 0) {
        fileMesh = new InstancedMesh(sphereGeometry, mainMaterial, nn);

        for (let i = 0; i < nn; i += 1) {
            const matrix = new Matrix4();
            const matrix3 = new Matrix3();
            const matrixRot = new Matrix4();
            if (tensor.length !== 0) matrix3.fromArray(tensor, i * 9);
            else matrix3.identity();

            if (radiuses[i] !== undefined) matrix.makeScale(radiuses[i], radiuses[i], radiuses[i]);
            if (shapeXs[i] !== undefined && shapeYs[i] !== undefined && shapeZs[i] !== undefined)
                matrix.scale(new Vector3(shapeXs[i], shapeYs[i], shapeZs[i]));

            matrixRot.setFromMatrix3(matrix3.transpose());

            {
                const gammaDot = 2.0 / 4.0;
                const omega = omegaZs[i] * 180.0 / Math.PI;
                if (!(omega / gammaDot <= -95.0)) {
                    matrix.scale(new Vector3(0, 0, 0));
                }
            }
            {
                const calcAngle = (x: number, y: number) => {
                    let angle = Math.acos(x / Math.sqrt(x * x + y * y)) * 180.0 / Math.PI;
                    if (y < 0) angle *= -1;
                    return angle;
                }

                let zVec = new Vector3(0, 0, 0);
                matrixRot.extractBasis(new Vector3(), new Vector3(), zVec);
                if (zVec.x < 0) zVec = zVec.multiplyScalar(-1);
                const shearAngle = calcAngle(zVec.x, zVec.y);
                const otherAngle = Math.atan(zVec.z / Math.sqrt(zVec.y * zVec.y + zVec.x * zVec.x)) * 180.0 / Math.PI;
                if (Math.abs(otherAngle) >= 20.0) {
                    matrix.scale(new Vector3(0, 0, 0));
                }
                if (Number.isFinite(shearAngle) && Math.abs(shearAngle) < 60.0) {
                    matrix.scale(new Vector3(0, 0, 0));
                }
            }

            matrix.premultiply(matrixRot);
            matrix.premultiply(new Matrix4().makeTranslation(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]));
            fileMesh.setMatrixAt(i, matrix);

            if (matrix.determinant() > 0) {
                goodSpots.push(new Vector3(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]));
                const helperDir = new Vector3(0, 0, 0);
                matrixRot.extractBasis(new Vector3(), new Vector3(), helperDir);
                // if (helperDir.x < 0) helperDir.multiplyScalar(-1);
                const arrowHelper = new ArrowHelper(helperDir, new Vector3(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]), 0.5, 0xff0000);
                // arrowHelpers.push(arrowHelper);
            }
        }
    }
    fileMesh.castShadow = true;
    fileMesh.receiveShadow = true;
    // return [fileMesh];

    let fileMesh2: InstancedMesh = null;
    if (coords.length !== 0) {
        fileMesh2 = new InstancedMesh(sphereGeometry, secondaryMaterial, nn);

        for (let i = 0; i < nn; i += 1) {
            const matrix = new Matrix4();
            const matrix3 = new Matrix3();
            const matrixRot = new Matrix4();
            if (tensor.length !== 0) matrix3.fromArray(tensor, i * 9);
            else matrix3.identity();

            if (radiuses[i] !== undefined) matrix.makeScale(radiuses[i], radiuses[i], radiuses[i]);
            if (shapeXs[i] !== undefined && shapeYs[i] !== undefined && shapeZs[i] !== undefined)
                matrix.scale(new Vector3(shapeXs[i], shapeYs[i], shapeZs[i]));

            matrixRot.setFromMatrix3(matrix3.transpose());

            {
                const gammaDot = 2.0 / 4.0;
                const omega = omegaZs[i] * 180.0 / Math.PI;
                if (!(omega / gammaDot <= -95.0)) {
                    // matrix.scale(new Vector3(0, 0, 0));
                }
            }
            {
                const calcAngle = (x: number, y: number) => {
                    let angle = Math.acos(x / Math.sqrt(x * x + y * y)) * 180.0 / Math.PI;
                    if (y < 0) angle *= -1;
                    return angle;
                }

                let zVec = new Vector3(0, 0, 0);
                matrixRot.extractBasis(new Vector3(), new Vector3(), zVec);
                if (zVec.x < 0) zVec = zVec.multiplyScalar(-1);
                const shearAngle = calcAngle(zVec.x, zVec.y);
                const otherAngle = Math.atan(zVec.z / Math.sqrt(zVec.y * zVec.y + zVec.x * zVec.x)) * 180.0 / Math.PI;
                if (Math.abs(otherAngle) >= 20.0) {
                    // matrix.scale(new Vector3(0, 0, 0));
                }
                if (Number.isFinite(shearAngle) && Math.abs(shearAngle) < 70.0) {
                    // matrix.scale(new Vector3(0, 0, 0));
                }
            }

            const myPos = new Vector3(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]);
            let isGood = false;
            goodSpots.forEach((spot) => {
                const GOOD_SPOT_RADIUS = 0.3;
                const dist = spot.distanceTo(myPos);
                if (dist <= GOOD_SPOT_RADIUS) {
                    isGood = true;
                }
            });
            if (!isGood) {
                matrix.scale(new Vector3(0, 0, 0));
            }

            matrix.premultiply(matrixRot);
            matrix.premultiply(new Matrix4().makeTranslation(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]));
            fileMesh2.setMatrixAt(i, matrix);

            // if (matrix.determinant() > 0) {
            //     const helperDir = new Vector3(0, 0, 0);
            //     matrixRot.extractBasis(new Vector3(), new Vector3(), helperDir);
            //     if (helperDir.x < 0) helperDir.multiplyScalar(-1);
            //     const arrowHelper = new ArrowHelper(helperDir, new Vector3(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]), 1, 0xff0000);
            //     arrowHelpers.push(arrowHelper);
            // }
        }
    }
    fileMesh2.castShadow = true;
    fileMesh2.receiveShadow = true;

    const group = new Group();
    group.add(fileMesh);
    // arrowHelpers.forEach(arrowHelper => group.add(arrowHelper));
    group.add(fileMesh2);
    return [group];
};

export const loadFromLammpsDump = async (file: File) => {
    console.log("Loading from Lammps dump...");
    const meshes = [];
    const lines = (await file.text()).split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        if (lines[lineIdx].startsWith('ITEM: NUMBER OF ATOMS')) {
            lineIdx++;
            let atomNum = Number.parseInt(lines[lineIdx], 10);
            while (!lines[lineIdx].startsWith('ITEM: ATOMS')) lineIdx++;
            const template = lines[lineIdx].split(/\s+/);
            const xIdx = template.indexOf('x') - 2;
            const yIdx = template.indexOf('y') - 2;
            const zIdx = template.indexOf('z') - 2;
            const radiusIdx = template.indexOf('radius') - 2;
            const stepMesh = new InstancedMesh(sphereGeometry, mainMaterial, atomNum);
            while (atomNum >= 0) {
                lineIdx++;
                const data = lines[lineIdx].split(/\s+/);
                const radius = Number.parseFloat(data[radiusIdx]);
                const matrix = new Matrix4().makeScale(radius, radius, radius);
                const x = Number.parseFloat(data[xIdx]);
                const y = Number.parseFloat(data[yIdx]);
                const z = Number.parseFloat(data[zIdx]);
                matrix.premultiply(new Matrix4().makeTranslation(x, y, z));
                stepMesh.setMatrixAt(atomNum - 1, matrix);

                stepMesh.castShadow = true;
                stepMesh.receiveShadow = true;
                atomNum--;
            }
            meshes.push(stepMesh);
        }
    }

    return meshes;
}