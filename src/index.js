/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
import {
  Vector3, Scene, WebGLRenderer, PerspectiveCamera,
  SpotLight, DirectionalLight, AmbientLight, Mesh, Color,
  PlaneGeometry, MeshPhongMaterial, Matrix4, InstancedMesh, Matrix3, DoubleSide, FrontSide,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'dat.gui';
import ColoredSuperquadricGeometry from './colored_superquadric_geometry';

// Settings
const gui = new GUI();
gui.useLocalStorage = true;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight);
camera.up = new Vector3(0, 0, 1);
camera.position.set(15, 0, 1);
camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
const camGui = gui.addFolder('Camera center');
camGui.add(controls.target, 'x', -5, 5, 0.1).onChange(() => { controls.update(); });
camGui.add(controls.target, 'y', -5, 5, 0.1).onChange(() => { controls.update(); });
camGui.add(controls.target, 'z', -1, 5, 0.1).onChange(() => { controls.update(); });
const camSettings = gui.addFolder('Field of view');
camSettings.add(camera, 'fov', 5, 120).onChange(() => { camera.updateProjectionMatrix(); });

const scene = new Scene();

// Create the basic superquadric
const sqGeometry = new ColoredSuperquadricGeometry(0.1, 0.1, 0.25, 2, 2, 'blue', 'yellow', 5, 5);
const mainMaterial = ColoredSuperquadricGeometry.getDefaultPhongMaterial(250);
const mesh = new Mesh(sqGeometry, mainMaterial);
mesh.receiveShadow = false;

// Set lighting
const colorSettings = {
  ambientColor: 0x525252,
  spotlightColor: 0x525252,
  directionalColor: 0x878787,
};
const ambientLight = new AmbientLight(colorSettings.ambientColor);
scene.add(ambientLight);
const lightingSettings = gui.addFolder('Ambient light');
lightingSettings.add(ambientLight, 'visible');
lightingSettings.addColor(colorSettings, 'ambientColor').onChange((newColor) => { ambientLight.color = new Color(newColor); });

const spotLight = new SpotLight(colorSettings.spotlightColor);
spotLight.angle = Math.PI / 2;
spotLight.penumbra = 0.2;
spotLight.position.set(2, 3, 3);
spotLight.castShadow = false;
scene.add(spotLight);
const spotlightSettings = gui.addFolder('Spotlight');
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
const dirSettings = gui.addFolder('Directional light');
dirSettings.add(dirLight, 'visible');
dirSettings.add(dirLight, 'intensity', 0, 5, 0.01);
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
let groundGeometry = null;// new PlaneGeometry(groundSettings.size, groundSettings.size, 1, 1);
let groundMaterial = null;// new MeshPhongMaterial(groundSettings);
let ground = null;
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
  ground.receiveShadow = false;
  ground.visible = groundSettings.visible;
  scene.add(ground);
};
addGround();
const grSettings = gui.addFolder('Floor settings');
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
renderer.domElement.addEventListener('dragover', (ev) => { ev.preventDefault(); });
renderer.domElement.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  const files = ev.dataTransfer.items;
  const makeIt = async (fileIdx) => {
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
        currPos++;
      }
      currPos++;
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

      for (let i = 0; i < nn; i++) {
        matrix3.fromArray(tensor, i * 9);
        matrixRot.setFromMatrix3(matrix3);
        matrix.makeTranslation(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]);
        fileMesh.setMatrixAt(i, (matrix).multiply(matrixRot));
      }
    }
    return fileMesh;
  };
  const promises = [];
  for (let k = 0; k < files.length; k++) {
    if (ev.dataTransfer.items[k].kind === 'file') {
      promises.push(makeIt(k));
    }
  }
  const loadedMeshes = await Promise.allSettled(promises);
  loadedMeshes.forEach((it) => {
    rollingMeshes.push(it.value);
  });
});

const animProps = {
  count: 0,
  drawIdx: 0,
};

// Add animation timeline
const keyframeGui = gui.addFolder('Keyframes');
keyframeGui.open();
const tline = keyframeGui.add(animProps, 'drawIdx', 0, rollingMeshes.length - 1, 1).listen();
function animate(occasional) {
  if (!occasional)requestAnimationFrame(() => { animate(false); });

  if (isAnimationGoing) { animProps.count++; }
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

  controls.update();
  renderer.render(scene, camera);
}
animate(false);
tline.onChange(() => { if (!isAnimationGoing)animate(true); });
