import {
  MeshPhongMaterial, SphereGeometry, BufferAttribute,
} from 'three';

export default class SuperquadricGeometry extends SphereGeometry {
  constructor(sizex, sizey, sizez, blockiness1, blockiness2, resolutionPhi = 32, resolutionZ = 16) {
    super(1, resolutionPhi, resolutionZ);
    this.sizex = sizex;
    this.sizey = sizey;
    this.sizez = sizez;
    this.blockiness1 = blockiness1;
    this.blockiness2 = blockiness2;

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

  static getDefaultPhongMaterial(color = 0xffffff, shininess = 150) {
    return new MeshPhongMaterial({ color, shininess });
  }
}
