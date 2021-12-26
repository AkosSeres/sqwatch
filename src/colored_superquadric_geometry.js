import {
  Color, SphereGeometry, BufferGeometry, BufferAttribute, MeshPhongMaterial,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

export default class ColoredSuperquadricGeometry extends BufferGeometry {
  constructor(
    sizex,
    sizey,
    sizez,
    blockiness1 = 2,
    blockiness2 = 2,
    color1 = 0xffffff,
    color2 = 0xffffff,
    resolutionPhi = 32,
    resolutionZ = 16,
  ) {
    super();
    this.sizex = sizex;
    this.sizey = sizey;
    this.sizez = sizez;
    this.blockiness1 = blockiness1;
    this.blockiness2 = blockiness2;
    this.resolutionPhi = resolutionPhi;
    this.resolutionZ = resolutionZ;
    this.color1 = new Color(color1);
    this.color2 = new Color(color2);

    let gemke = null;
    const angles = [0, Math.PI / 2, 0, Math.PI / 2];
    const angles2 = [0, 0, Math.PI, Math.PI];
    const colors = [this.color1, this.color2, this.color2, this.color1];
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
      const cols = [];
      for (let ci = 0; ci < geometry1.getAttribute('position').array.length; ci += 3) {
        cols.push(colors[i].r);
        cols.push(colors[i].g);
        cols.push(colors[i].b);
      }
      geometry1.setAttribute('color', new BufferAttribute(new Float32Array(cols), 3));
      return geometry1;
    });
    gemke = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
    this.copy(gemke);
    gemke.dispose();
    geoms.forEach((g) => g.dispose());
    this.mapToSuperquadric();
  }

  mapToSuperquadric() {
    const poss = this.getAttribute('position');
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
    this.setAttribute('position', new BufferAttribute(vertices, 3));
    this.computeVertexNormals();
  }

  static getDefaultPhongMaterial(shininess = 150) {
    return new MeshPhongMaterial({ vertexColors: true, shininess });
  }
}
