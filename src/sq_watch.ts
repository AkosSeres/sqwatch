import {
  InstancedMesh, Matrix3, Matrix4, Mesh, PCFShadowMap,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { GUI } from 'dat.gui';
import ColoredSuperquadricGeometry from './colored_superquadric_geometry';
import { SqPlugin } from './plugins/sq_plugin';
import { inspectParams } from './inspect_params';
import { loadFromLammpsDump, loadFromVtk } from './mesh_loaders';

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
  // The main scene that can be modified by plugins
  scene: Scene;
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

    // Create scene
    const scene = new Scene();
    this.scene = scene;

    // Attach events for stopping keyframes
    let isAnimationGoing = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') isAnimationGoing = !isAnimationGoing;
    });

    const rollingMeshes: Array<Mesh> = [];
    // const sqGeometry = new ColoredSuperquadricGeometry(0.0854988, 0.0854988, 0.341995, 2, 2, 'blue', 'yellow', 8, 4);
    // const sqGeometry = new ColoredSuperquadricGeometry(0.184202, 0.184202, 0.0736806, 2, 2, 'blue', 'yellow', 8, 8);
    const sqGeometry = new ColoredSuperquadricGeometry(1, 1, 1, 2, 2, 'blue', 'yellow', 8, 8);
    //const sqGeometry = new ColoredSuperquadricGeometry(0.1, 0.1, 0.25, 2, 2, 'blue', 'yellow', 8, 8);
    //const sqGeometry = new ColoredSuperquadricGeometry(0.146201, 0.146201, 0.116961, 2, 2, 'blue', 'yellow', 8, 8);
    const mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(250);
    const mesh = new Mesh(sqGeometry, mainMaterial);
    let currentMesh: Mesh = mesh;

    // Handle file drag and drop
    this.renderer.domElement.addEventListener('dragover', (ev: Event) => { ev.preventDefault(); });
    this.renderer.domElement.addEventListener('drop', async (ev: DragEvent) => {
      ev.preventDefault();
      const files = ev.dataTransfer.items;
      const promises = [];
      for (let k = 0; k < files.length; k += 1) {
        if (ev.dataTransfer.items[k].kind === 'file') {
          const file = ev.dataTransfer.items[k].getAsFile();
          if (file.name.includes('vtk')) promises.push(loadFromVtk(file));
          else if (file.name.includes('dump')) promises.push(loadFromLammpsDump(file));
        }
      }
      const loadedMeshes = await Promise.allSettled(promises);
      loadedMeshes.forEach((it) => {
        if (it.status === 'fulfilled') rollingMeshes.push(...it.value);
      });
    });

    const animProps = {
      count: 0,
      drawIdx: 0,
    };

    // Add animation timeline
    const keyframeGui = this.gui.addFolder('Keyframes');
    keyframeGui.open();
    if (typeof inspectParams() == "object") this.gui.removeFolder(keyframeGui);
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
      if (animProps.count > 1 && rollingMeshes.length) {
        animProps.count = 0;
        scene.remove(currentMesh);
        animProps.drawIdx = (animProps.drawIdx + 1) % rollingMeshes.length;
        currentMesh = rollingMeshes[animProps.drawIdx];
        scene.add(currentMesh);
      }
      if (rollingMeshes.length && rollingMeshes[animProps.drawIdx] !== currentMesh) {
        scene.remove(currentMesh);
        currentMesh = rollingMeshes[animProps.drawIdx];
        scene.add(currentMesh);
      }

      if (tline.getValue() !== animProps.drawIdx) {
        tline.setValue(animProps.drawIdx);
      }
      tline.max(rollingMeshes.length - 1);

      // Update plugins
      this.plugins.forEach(p => p.update?.(this));

      this.cameraControls.update();
      this.renderer.render(this.scene, this.camera);
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
    this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 500);
    this.camera.up = new Vector3(0, 0, 1);
    this.camera.position.set(15, 0, 1);
    const numParams = inspectParams();
    if (typeof numParams == "object") {
      const sizeParam = 2.5 * Math.sqrt(numParams[0] ** 2 + numParams[1] ** 2 + numParams[2] ** 2);
      this.camera.position.set(sizeParam, sizeParam, 0);
    }
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

