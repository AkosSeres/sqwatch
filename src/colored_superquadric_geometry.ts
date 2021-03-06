import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import {
  BufferAttribute, BufferGeometry, Color, ColorRepresentation, MeshPhongMaterial,
} from 'three';
import SphericalSphereGeometry from './spherical_sphere_geometry';

export default class ColoredSuperquadricGeometry extends BufferGeometry {
  sizex: number;

  sizey: number;

  sizez: number;

  blockiness1: number;

  blockiness2: number;

  resolutionPhi: number;

  resolutionZ: number;

  color1: ColorRepresentation;

  color2: ColorRepresentation;

  constructor(
    sizex: number,
    sizey: number,
    sizez: number,
    blockiness1 = 2,
    blockiness2 = 2,
    color1: ColorRepresentation = 0xffffff,
    color2: ColorRepresentation = 0xffffff,
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

    const angles = [0, Math.PI / 2, 0, Math.PI / 2];
    const angles2 = [0, 0, Math.PI, Math.PI];
    const colors = [this.color1, this.color2, this.color2, this.color1];
    const geoms = angles.map((angle, i) => {
      const geometry1 = new SphericalSphereGeometry(
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
    const gemke = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
    this.copy(gemke);
    gemke.dispose();
    geoms.forEach((g) => g.dispose());
    this.mapToSuperquadric();
  }

  mapToSuperquadric() {
    const poss = this.getAttribute('position');
    const norms = this.getAttribute('normal');
    const exp1 = 2 / this.blockiness1;
    const exp2 = 2 / this.blockiness2;
    for (let i = 0; i < poss.array.length / 3; i += 1) {
      // Retrieve next coordiantes
      const x = poss.getX(i);
      const y = poss.getY(i);
      const z = poss.getZ(i);
      // Convert them to u,v coordinates
      const u = Math.asin(z);
      const v = Math.atan2(y, x);
      // Then convert them to x,y,z again, but as a superquadratic
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);
      const sinv = Math.sin(v);
      const cosv = Math.cos(v);
      // Set transformed positions
      poss.setX(
        i,
        this.sizex * Math.sign(cosu) * Math.sign(cosv)
        * (Math.abs(cosu) ** (exp1)) * (Math.abs(cosv) ** exp2),
      );
      poss.setY(
        i,
        this.sizey * Math.sign(cosu) * Math.sign(sinv)
        * (Math.abs(cosu) ** exp1) * (Math.abs(sinv) ** exp2),
      );
      poss.setZ(i, this.sizez * Math.sign(sinu) * (Math.abs(sinu) ** (exp1)));
      // Set normals
      norms.setX(i, (1 / this.sizex) * Math.sign(cosu) * Math.sign(cosv)
        * (Math.abs(cosu) ** (2 - exp1)) * (Math.abs(cosv) ** (2 - exp2)));
      norms.setY(i, (1 / this.sizey) * Math.sign(cosu) * Math.sign(sinv)
        * (Math.abs(cosu) ** (2 - exp1)) * (Math.abs(sinv) ** (2 - exp2)));
      norms.setZ(i, (1 / this.sizez) * Math.sign(sinu) * (Math.abs(sinu) ** (2 - exp1)));
    }
  }

  static getDefaultPhongMaterial(shininess = 150) {
    return new MeshPhongMaterial({
      vertexColors: true, shininess,
      polygonOffset: true,
      polygonOffsetFactor: 1, // positive value pushes polygon further away
      polygonOffsetUnits: 1
    });
  }
}
