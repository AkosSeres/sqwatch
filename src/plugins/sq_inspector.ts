import ColoredSuperquadricGeometry from "../colored_superquadric_geometry";
import SqWatchApp from "src/sq_watch.ts";
import { BufferGeometry, ColorRepresentation, Material, Mesh } from "three";
import { SqPlugin } from "./sq_plugin";

type MeshSettings = {
    visible: boolean,
    blockiness1: number,
    blockiness2: number,
    color1: ColorRepresentation,
    color2: ColorRepresentation,
    res1: number,
    res2: number,
    sizex: number,
    sizey: number,
    sizez: number,
    shininess: number,
}

type SqInspectPluginType =
    SqPlugin
    | {
        mesh: Mesh,
        geom: BufferGeometry,
        material: Material,
        meshSettings: MeshSettings,
        regenMesh(app: SqWatchApp): void,
    }

export const SqInspectorPlugin: SqInspectPluginType = {
    mesh: null,
    material: null,
    geom: null,
    meshSettings: {
        visible: false,
        blockiness1: 2,
        blockiness2: 2,
        color1: 0x0000FF,
        color2: 0xFFFF00,
        res1: 5,
        res2: 5,
        sizex: 0.1,
        sizey: 0.1,
        sizez: 0.25,
        shininess: 250,
    },
    init(this: SqInspectPluginType, app: SqWatchApp) {
        const sqFolder = app.gui.addFolder("Superqudric inspector");
        const regenClosure = (() => { (this.regenMesh as (app: SqWatchApp) => void)(app) });
        sqFolder.add(this.meshSettings, 'visible').onChange(regenClosure);
        sqFolder.add(this.meshSettings, "sizex", 0.05, 2, 0.01).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "sizey", 0.05, 2, 0.01).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "sizez", 0.05, 2, 0.01).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "blockiness1", 0.3, 20, 0.01).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "blockiness2", 0.3, 20, 0.01).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "res1", 3, 100, 1).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "res2", 3, 100, 1).onChange(regenClosure);
        sqFolder.addColor(this.meshSettings, "color1").onChange(regenClosure);
        sqFolder.addColor(this.meshSettings, "color2").onChange(regenClosure);
        sqFolder.add(this.meshSettings, "shininess", 0, 1000, 1).onChange(regenClosure);
        sqFolder.close();

        regenClosure();
    },

    regenMesh(app: SqWatchApp) {
        // Create the basic superquadric
        if (this.mesh) app.scene.remove(this.mesh);
        if (this.geom) this.geom.dispose();
        if (this.material) this.material.dispose();
        if (!this.meshSettings.visible) return;
        const sqGeometry = new ColoredSuperquadricGeometry(
            this.meshSettings.sizex, this.meshSettings.sizey, this.meshSettings.sizez,
            this.meshSettings.blockiness1, this.meshSettings.blockiness2,
            this.meshSettings.color1, this.meshSettings.color2,
            this.meshSettings.res1, this.meshSettings.res2);
        const mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(this.meshSettings.shininess);
        this.mesh = new Mesh(sqGeometry, mainMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;
        app.scene.add(this.mesh);
    }
}