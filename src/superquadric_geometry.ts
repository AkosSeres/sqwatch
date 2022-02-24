import {
  ColorRepresentation,
  MeshPhongMaterial,
} from 'three';
import SphericalSphereGeometry from './spherical_sphere_geometry';

export default class SuperquadricGeometry extends SphericalSphereGeometry {
  sizex: number;

  sizey: number;

  sizez: number;

  blockiness1: number;

  blockiness2: number;

  resolutionPhi: number;

  resolutionZ: number;

  constructor(
    sizex: number,
    sizey: number,
    sizez: number,
    blockiness1: number,
    blockiness2: number,
    resolutionPhi = 32,
    resolutionZ = 16,
  ) {
    super(1, resolutionPhi, resolutionZ);
    this.sizex = sizex;
    this.sizey = sizey;
    this.sizez = sizez;
    this.blockiness1 = blockiness1;
    this.blockiness2 = blockiness2;

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

  static getDefaultPhongMaterial(shininess = 150, color: ColorRepresentation = 0x0000ff) {
    return new MeshPhongMaterial({ color, shininess });
  }
}
