import {
    AmbientLight, Color, DirectionalLight, DoubleSide, FrontSide,
    InstancedMesh, Material, Matrix3, Matrix4, Mesh,
    MeshPhongMaterial, PCFShadowMap,
    PerspectiveCamera,
    PlaneGeometry, Scene, SpotLight, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { GUI } from 'dat.gui';
import ColoredSuperquadricGeometry from './colored_superquadric_geometry';
import { SqPlugin } from './plugins/sq_plugin';

/**
 * A class containing the whole app, where we can attach plugins.
 */
export default class SqWatchApp {
    // Contains the loaded plugins
    plugins: Array<SqPlugin>;
    // The gui of the app (reachable by plugins)
    gui: GUI;
    // The Three.js renderer instance
    renderer: WebGLRenderer;
    // The camera
    camera: PerspectiveCamera;
    // The control object
    cameraControls: OrbitControls;

    constructor() {
        // Set the base array for plugins
        this.plugins = [];

        // Settings gui
        this.gui = new GUI();
        this.setupGui();

        // Three.js renderer
        this.renderer = new WebGLRenderer({ antialias: true });
        this.setupRenderer();

        // Set up camera and its controller
        this.setupCamera();
        this.setupControls();

        const scene = new Scene();

        // Create the basic superquadric
        const sqGeometry = new ColoredSuperquadricGeometry(0.1, 0.1, 0.25, 2, 2, 'blue', 'yellow', 8, 4);
        const mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(250);
        const mesh = new Mesh(sqGeometry, mainMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        // Set lighting
        const colorSettings = {
            ambientColor: 0x525252,
            spotlightColor: 0x525252,
            directionalColor: 0x878787,
        };
        const ambientLight = new AmbientLight(colorSettings.ambientColor);
        scene.add(ambientLight);
        const lightingSettings = this.gui.addFolder('Ambient light');
        lightingSettings.add(ambientLight, 'visible');
        lightingSettings.addColor(colorSettings, 'ambientColor').onChange((newColor) => { ambientLight.color = new Color(newColor); });

        const spotLight = new SpotLight(colorSettings.spotlightColor);
        spotLight.angle = Math.PI / 2;
        spotLight.penumbra = 0.2;
        spotLight.position.set(2, 3, 3);
        spotLight.castShadow = false;
        scene.add(spotLight);
        const spotlightSettings = this.gui.addFolder('Spotlight');
        spotlightSettings.add(spotLight, 'visible');
        spotlightSettings.add(spotLight, 'intensity', 0, 5, 0.01);
        spotlightSettings.add(spotLight, 'angle', 0, Math.PI, 0.01);
        spotlightSettings.add(spotLight, 'penumbra', 0, 1, 0.01);
        spotlightSettings.add(spotLight.position, 'x', -5, 5, 0.1).name('posX');
        spotlightSettings.add(spotLight.position, 'y', -5, 5, 0.1).name('posY');
        spotlightSettings.add(spotLight.position, 'z', 0, 5, 0.1).name('posZ');
        spotlightSettings.addColor(colorSettings, 'spotlightColor').onChange((newColor) => { spotLight.color = new Color(newColor); });

        const dirLight = new DirectionalLight(colorSettings.directionalColor);
        dirLight.position.set(-2, 3, 1.8);
        dirLight.castShadow = false;
        scene.add(dirLight);
        const dirSettings = this.gui.addFolder('Directional light');
        dirSettings.add(dirLight, 'visible');
        dirSettings.add(dirLight, 'intensity', 0, 5, 0.01);
        dirSettings.add(dirLight, 'castShadow').name('shadows').onChange((isShad: boolean) => { this.renderer.shadowMap.autoUpdate = isShad; });
        dirSettings.add(dirLight.position, 'x', -5, 5, 0.1).name('posX');
        dirSettings.add(dirLight.position, 'y', -5, 5, 0.1).name('posY');
        dirSettings.add(dirLight.position, 'z', 0, 5, 0.1).name('posZ');
        dirSettings.addColor(colorSettings, 'directionalColor').onChange((newColor) => { dirLight.color = new Color(newColor); });

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
                scene.remove(ground);
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
            scene.add(ground);
        };
        addGround();
        const grSettings = this.gui.addFolder('Floor settings');
        grSettings.add(groundSettings, 'visible').onChange(addGround);
        grSettings.add(groundSettings, 'height', -100, 100, 0.1).onChange(addGround);
        grSettings.add(groundSettings, 'doubleSide').onChange(addGround);
        grSettings.add(groundSettings, 'size', 0).onChange(addGround);
        grSettings.addColor(groundSettings, 'color').onChange(addGround);
        grSettings.add(groundSettings, 'shininess', 0, 1000, 1).onChange(addGround);

        // Attach events for stopping keyframes
        let isAnimationGoing = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') isAnimationGoing = !isAnimationGoing;
        });

        const rollingMeshes = [mesh];
        let currentMesh = mesh;
        scene.add(currentMesh);

        // Handle file drag and drop
        this.renderer.domElement.addEventListener('dragover', (ev: Event) => { ev.preventDefault(); });
        this.renderer.domElement.addEventListener('drop', async (ev: DragEvent) => {
            ev.preventDefault();
            const files = ev.dataTransfer.items;
            const makeIt = async (fileIdx: number) => {
                const file = files[fileIdx].getAsFile();
                let fileMesh = null;
                const str = file.arrayBuffer();
                const resBuf = await str;
                const dw = new DataView(resBuf);
                const enc = new TextDecoder();
                const isDone = false;

                const coords = [];
                const tensor = [];
                let nn = 0;

                let position = 0;
                let currPos = position;
                while (!isDone) {
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
                        break;
                    }
                    position = currPos;
                }

                if (nn !== 0) {
                    scene.remove(mesh);
                    const matrix = new Matrix4();
                    const matrixRot = new Matrix4();
                    const matrix3 = new Matrix3();
                    fileMesh = new InstancedMesh(sqGeometry, mainMaterial, nn);

                    for (let i = 0; i < nn; i += 1) {
                        matrix3.fromArray(tensor, i * 9);
                        matrixRot.setFromMatrix3(matrix3);
                        matrix.makeTranslation(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]);
                        fileMesh.setMatrixAt(i, (matrix).multiply(matrixRot));
                    }
                }
                fileMesh.castShadow = true;
                fileMesh.receiveShadow = true;
                return fileMesh;
            };
            const promises = [];
            for (let k = 0; k < files.length; k += 1) {
                if (ev.dataTransfer.items[k].kind === 'file') {
                    promises.push(makeIt(k));
                }
            }
            const loadedMeshes = await Promise.allSettled(promises);
            loadedMeshes.forEach((it) => {
                if (it.status === 'fulfilled') rollingMeshes.push(it.value);
            });
        });

        const animProps = {
            count: 0,
            drawIdx: 0,
        };

        // Add animation timeline
        const keyframeGui = this.gui.addFolder('Keyframes');
        keyframeGui.open();
        const tline = keyframeGui.add(animProps, 'drawIdx', 0, rollingMeshes.length - 1, 1).listen();

        /**
             * The update function.
             *
             * @param {boolean} occasional Brings animation about presence of animation
             * @return {null} Nothing
             */
        const animate = (occasional: boolean) => {
            if (!occasional) requestAnimationFrame(() => { animate(false); });

            if (isAnimationGoing) { animProps.count += 1; }
            if (animProps.count > 1) {
                animProps.count = 0;
                scene.remove(currentMesh);
                animProps.drawIdx = (animProps.drawIdx + 1) % rollingMeshes.length;
                currentMesh = rollingMeshes[animProps.drawIdx];
                scene.add(currentMesh);
            }
            if (rollingMeshes[animProps.drawIdx] !== currentMesh) {
                scene.remove(currentMesh);
                currentMesh = rollingMeshes[animProps.drawIdx];
                scene.add(currentMesh);
            }

            if (tline.getValue() !== animProps.drawIdx) {
                tline.setValue(animProps.drawIdx);
            }
            tline.max(rollingMeshes.length - 1);

            this.cameraControls.update();
            this.renderer.render(scene, this.camera);
        }
        animate(false);
        tline.onChange(() => { if (!isAnimationGoing) animate(true); });
    }
    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    setupGui() {
        this.gui.useLocalStorage = true;
    }

    setupCamera() {
        this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
        this.camera.up = new Vector3(0, 0, 1);
        this.camera.position.set(15, 0, 1);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.cameraControls.enablePan = false;
        const camGui = this.gui.addFolder('Camera center');
        camGui.add(this.cameraControls.target, 'x', -5, 5, 0.1).onChange(() => { this.cameraControls.update(); });
        camGui.add(this.cameraControls.target, 'y', -5, 5, 0.1).onChange(() => { this.cameraControls.update(); });
        camGui.add(this.cameraControls.target, 'z', -1, 5, 0.1).onChange(() => { this.cameraControls.update(); });
        const camSettings = this.gui.addFolder('Field of view');
        camSettings.add(this.camera, 'fov', 5, 120).onChange(() => { this.camera.updateProjectionMatrix(); });
    }

    loadPlugin(plugin: SqPlugin) {
        plugin.init?.(this);
        this.plugins.push(plugin);
    }
}
