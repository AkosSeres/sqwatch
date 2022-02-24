import { BufferAttribute, BufferGeometry } from "three";

export default class SphericalSphereGeometry extends BufferGeometry {
    constructor(radius: number, res_phi: number, res_theta: number, min_phi = 0, phi_size = 2 * Math.PI, min_theta = 0, theta_size = Math.PI) {
        super();
        if (radius <= 0) radius = 1;
        res_phi = Math.round(res_phi);
        if (res_phi < 5) res_phi = 5;
        res_theta = Math.round(res_theta);
        if (res_theta < 5) res_phi = 5;

        phi_size = Math.abs(phi_size);
        theta_size = Math.abs(theta_size);

        const phis: number[] = [];
        for (let i = 0; i < res_phi; i++) {
            phis.push(min_phi + i * (phi_size / (res_phi - 1)));
        }
        const thetas: number[] = [];
        for (let i = 0; i < res_theta; i++) {
            thetas.push(min_theta + i * (theta_size / (res_theta - 1)));
        }

        const points: number[] = [];
        const normals: number[] = [];
        phis.forEach((phi) => {
            thetas.forEach((theta) => {
                const cosphi = Math.cos(phi);
                const sinphi = Math.sin(phi);
                const costheta = Math.cos(theta);
                const sintheta = Math.sin(theta);
                points.push(...[cosphi * sintheta * radius, sinphi * sintheta * radius, costheta * radius]);
                normals.push(...[cosphi * sintheta, sinphi * sintheta, costheta]);
            });
        });

        const indices: number[] = [];
        for (let ti = 0; ti < res_phi - 1; ti++) {
            for (let tt = 0; tt < res_theta - 1; tt++) {
                const pixd = (i1: number, i2: number) => i1 * (res_theta) + i2;
                const idx = pixd(ti, tt);
                const idx2 = pixd(ti, tt + 1);
                const idx3 = pixd(ti + 1, tt);
                const idx4 = pixd(ti + 1, tt + 1);
                indices.push(...[idx, idx2, idx3]);
                indices.push(...[idx2, idx4, idx3]);
            }
        }

        this.setIndex(indices);
        this.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
        this.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    }
}

/*
// The rust function that I originally wrote
pub fn sphere(radius: f32, mut res_phi: u16, mut res_theta: u16) -> CPUMesh {
    res_phi = res_phi.max(5);
    res_theta = res_theta.max(5);
    let phis = linspace::<f32>(0., 2. * std::f32::consts::PI, res_phi.into());
    let thetas = linspace::<f32>(0., std::f32::consts::PI, res_theta.into());
    let uvpoints = phis.cartesian_product(thetas);

    let mut norms: Vec<Vector3<f32>> = Vec::with_capacity(res_phi as usize * res_theta as usize);
    let points: Vec<Point3<f32>> = uvpoints
        .map(|uvpair| {
            let phi = uvpair.0;
            let theta = uvpair.1;
            let cosphi = phi.cos();
            let sinphi = phi.sin();
            let costheta = theta.cos();
            let sintheta = theta.sin();
            norms.push(Vector3::new(cosphi * sintheta, sinphi * sintheta, costheta));
            return Point3::new(cosphi * sintheta, sinphi * sintheta, costheta) * radius;
        })
        .collect();
    let mut indices =
        Vec::<Point3<u16>>::with_capacity((res_phi - 1) as usize * (res_theta - 1) as usize * 2);
    (0..(res_phi - 1))
        .cartesian_product(0..(res_theta - 1))
        .for_each(|ixdpair| {
            let ti = ixdpair.0;
            let tt = ixdpair.1;
            let pixd = |i1, i2| i1 * (res_theta) + i2;
            let idx = pixd(ti, tt);
            let idx2 = pixd(ti, tt + 1);
            let idx3 = pixd(ti + 1, tt);
            let idx4 = pixd(ti + 1, tt + 1);
            indices.push(Point3::new(idx, idx2, idx3));
            indices.push(Point3::new(idx2, idx4, idx3));
        });

    CPUMesh {
        points,
        norms,
        indices,
    }
}
*/