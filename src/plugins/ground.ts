import SqWatchApp from "src/sq_watch.ts";
import { DoubleSide, FrontSide, Material, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { SqPlugin } from "./sq_plugin";

export const GroundPlugin: SqPlugin = {
    init: (app: SqWatchApp) => {
        // Add ground
        const groundSettings = {
            size: 9,
            color: 0xc3c3c3,
            shininess: 65,
            height: -1,
            visible: true,
            doubleSide: false,
        };
        let groundGeometry: PlaneGeometry = null;
        let groundMaterial: Material = null;
        let ground: Mesh = null;
        const addGround = () => {
            if (ground) {
                app.scene.remove(ground);
                groundGeometry.dispose();
                groundMaterial.dispose();
            }
            groundGeometry = new PlaneGeometry(groundSettings.size, groundSettings.size, 1, 1);
            groundMaterial = new MeshPhongMaterial({
                color: groundSettings.color,
                shininess: groundSettings.shininess,
                side: groundSettings.doubleSide ? DoubleSide : FrontSide,
            });
            ground = new Mesh(
                groundGeometry,
                groundMaterial,
            );
            ground.position.z = groundSettings.height;
            ground.receiveShadow = true;
            ground.visible = groundSettings.visible;
            app.scene.add(ground);
        };
        addGround();
        const grSettings = app.gui.addFolder('Floor settings');
        grSettings.add(groundSettings, 'visible').onChange(addGround);
        grSettings.add(groundSettings, 'height', -100, 100, 0.1).onChange(addGround);
        grSettings.add(groundSettings, 'doubleSide').onChange(addGround);
        grSettings.add(groundSettings, 'size', 0).onChange(addGround);
        grSettings.addColor(groundSettings, 'color').onChange(addGround);
        grSettings.add(groundSettings, 'shininess', 0, 1000, 1).onChange(addGround);
    }
}