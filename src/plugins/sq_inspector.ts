import ColoredSuperquadricGeometry from "../colored_superquadric_geometry";
import SuperquadricGeometry from "../superquadric_geometry";
import SqWatchApp from "src/sq_watch.ts";
import { Color, ColorRepresentation, Mesh, MeshBasicMaterial } from "three";
import { SqPlugin } from "./sq_plugin";
import { inspectParams } from "../inspect_params";

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
    doubleColored: boolean;
    wireframe: boolean;
}

type SqInspectPluginType =
    SqPlugin
    | {
        mesh: Mesh,
        wrfMesh: Mesh,
        meshSettings: MeshSettings,
        regenMesh(app: SqWatchApp): void,
    }

export const SqInspectorPlugin: SqInspectPluginType = {
    mesh: null,
    wrfMesh: null,
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
        doubleColored: true,
        wireframe: false,
    },
    init(this: SqInspectPluginType, app: SqWatchApp) {
        const sqFolder = app.gui.addFolder("Superqudric inspector");

        const numParams = inspectParams();
        if (typeof numParams == "object") {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.sizex = numParams[0];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.sizey = numParams[1];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.sizez = numParams[2];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.res1 = 35;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.res2 = 35;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.meshSettings.visible = true;

            sqFolder.open();
        } else sqFolder.close();

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
        sqFolder.add(this.meshSettings, "doubleColored").onChange(regenClosure);
        sqFolder.add(this.meshSettings, "shininess", 0, 1000, 1).onChange(regenClosure);
        sqFolder.add(this.meshSettings, "wireframe").onChange(regenClosure);

        regenClosure();
    },

    regenMesh(app: SqWatchApp) {
        // Create the basic superquadric
        if (this.mesh) {
            app.scene.remove(this.mesh);
            (this.mesh).material.dispose();
            (this.mesh).geometry.dispose();
            this.mesh = null;
        }
        if (this.wrfMesh) {
            app.scene.remove(this.wrfMesh);
            (this.wrfMesh).material.dispose();
            (this.wrfMesh).geometry.dispose();
            this.wrfMesh = null;
        }

        if (!this.meshSettings.visible) return;
        let sqGeometry; let mainMaterial;
        if (this.meshSettings.doubleColored) {
            sqGeometry = new ColoredSuperquadricGeometry(
                this.meshSettings.sizex, this.meshSettings.sizey, this.meshSettings.sizez,
                this.meshSettings.blockiness1, this.meshSettings.blockiness2,
                this.meshSettings.color1, this.meshSettings.color2,
                this.meshSettings.res1, this.meshSettings.res2);
            mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(this.meshSettings.shininess);
        } else {
            sqGeometry = new SuperquadricGeometry(
                this.meshSettings.sizex, this.meshSettings.sizey, this.meshSettings.sizez,
                this.meshSettings.blockiness1, this.meshSettings.blockiness2,
                this.meshSettings.res1 * 2, this.meshSettings.res2 * 2);
            mainMaterial = SuperquadricGeometry.getDefaultPhongMaterial(this.meshSettings.shininess, this.meshSettings.color1);
        }

        const wrfMat = new MeshBasicMaterial({
            color: new Color(this.meshSettings.color1).offsetHSL(Math.PI / 2, 0, 0)
        });
        wrfMat.wireframe = true;
        wrfMat.wireframeLinewidth = 4;
        this.wrfMesh = new Mesh(sqGeometry, wrfMat);
        this.wrfMesh.visible = this.meshSettings.wireframe;
        app.scene.add(this.wrfMesh);

        this.mesh = new Mesh(sqGeometry, mainMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;
        app.scene.add(this.mesh);
    }
}