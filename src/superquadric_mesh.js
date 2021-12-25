import {
  Object3D,
  SphereGeometry, MeshPhongMaterial, Mesh, BufferAttribute,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

class SuperquadricMesh {
  constructor(sizex, sizey, sizez, blockiness1, blockiness2, resolutionPhi = 32, resolutionZ = 16) {
    this.sizex = sizex;
    this.sizey = sizey;
    this.sizez = sizez;
    this.blockiness1 = blockiness1;
    this.blockiness2 = blockiness2;
    this.resolutionPhi = resolutionPhi;
    this.resolutionZ = resolutionZ;

    this.generateMesh();
  }

  generateMesh() {
    this.mesh = new Object3D();
    this.geometry = new SphereGeometry(
      1,
      this.resolutionPhi,
      this.resolutionZ,
    );
    this.mapToSuperquadric(this.geometry);
    this.material = new MeshPhongMaterial({ vertexColors: true, shininess: 150 });

    let gemke = null;
    const angles = [0, Math.PI / 2, 0, Math.PI / 2];
    const angles2 = [0, 0, Math.PI, Math.PI];
    const colors = [0xffff00, 0x0088ff, 0x0088ff, 0xffff00];
    const colorsFloat = [[1, 1, 0], [0, 0.2, 1], [0, 0.2, 1], [1, 1, 0]];
    const geoms = angles.map((angle, i) => {
      const geometry1 = new SphereGeometry(
        1,
        this.resolutionPhi,
        this.resolutionZ,
        angles2[i],
        Math.PI,
        angle,
        Math.PI / 2,
      );
      this.mapToSuperquadric(geometry1);
      const material1 = new MeshPhongMaterial({ color: colors[i], shininess: 150 });
      this.mesh.attach(new Mesh(geometry1, material1));
      const cols = [];
      for (let ci = 0; ci < geometry1.getAttribute('position').array.length; ci += 1) {
        cols.push(colorsFloat[i][ci % 3]);
      }
      geometry1.setAttribute('color', new BufferAttribute(new Float32Array(cols), 3));
      return geometry1;
    });
    gemke = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
    gemke.computeVertexNormals();
    this.geometry = gemke;
  }

  mapToSuperquadric(geometry) {
    const poss = geometry.getAttribute('position');
    const newVertices = [];
    const exp1 = 2 / this.blockiness1;
    const exp2 = 2 / this.blockiness2;
    for (let i = 0; i < poss.array.length; i += 3) {
      // Retrieve next coordiantes
      const x = poss.array[i];
      const y = poss.array[i + 1];
      const z = poss.array[i + 2];
      // Convert them to u,v coordinates
      const u = Math.asin(z);
      const v = Math.atan2(y, x);
      // Then convert them to x,y,z again, but as a superquadratic
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);
      const sinv = Math.sin(v);
      const cosv = Math.cos(v);
      newVertices.push(
        this.sizex * Math.sign(cosu) * Math.sign(cosv)
        * (Math.abs(cosu) ** (exp1)) * (Math.abs(cosv) ** exp2),
      );
      newVertices.push(
        this.sizey * Math.sign(cosu) * Math.sign(sinv)
        * (Math.abs(cosu) ** exp1) * (Math.abs(sinv) ** exp2),
      );
      newVertices.push(this.sizez * Math.sign(sinu) * (Math.abs(sinu) ** (exp1)));
    }
    const vertices = new Float32Array(newVertices);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
  }
}

export default SuperquadricMesh;
