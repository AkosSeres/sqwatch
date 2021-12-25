/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
import {
  Vector3, Scene, WebGLRenderer, PerspectiveCamera,
  SpotLight, DirectionalLight, AmbientLight, Mesh,
  PlaneGeometry, MeshPhongMaterial, Matrix4, InstancedMesh, Matrix3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'dat.gui';
import SuperquadricMesh from './superquadric_mesh';

// Settings
const gui = new GUI();

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.zIndex = '-1';

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
const sq = new SuperquadricMesh(0.1, 0.1, 0.25, 2, 2, 7, 5);
const mesh = new Mesh(sq.geometry, sq.material);
mesh.receiveShadow = false;

// Set lighting
scene.add(new AmbientLight(0x505050));

const spotLight = new SpotLight(0xffffff);
spotLight.angle = Math.PI / 2;
spotLight.penumbra = 0.2;
spotLight.position.set(2, 3, 3);
spotLight.castShadow = true;
spotLight.shadow.camera.near = 3;
spotLight.shadow.camera.far = 10;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight);

const dirLight = new DirectionalLight(0x55505a, 1);
dirLight.position.set(0, 3, 0);
dirLight.castShadow = true;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 10;
dirLight.shadow.camera.right = 1;
dirLight.shadow.camera.left = -1;
dirLight.shadow.camera.top = 1;
dirLight.shadow.camera.bottom = -1;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Add ground
const ground = new Mesh(
  new PlaneGeometry(9, 9, 1, 1),
  new MeshPhongMaterial({ color: 0xfefefe, shininess: 150 }),
);
ground.position.z = -1;
scene.add(ground);

let isAnimationGoing = true;
// Attach events for moving the camera
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
    let fileMesh = new InstancedMesh(sq.geometry, sq.material);
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
      fileMesh = new InstancedMesh(sq.geometry, sq.material, nn);

      for (let i = 0; i < nn; i++) {
        // const elems = tensor.slice(i * 9, i * 9 + 9);
        matrix3.fromArray(tensor, i * 9);
        matrixRot.setFromMatrix3(matrix3);
        matrix.makeTranslation(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]);
        fileMesh.setMatrixAt(i, (matrix).multiply(matrixRot));
      }

      // rollingMeshes.push(fileMesh);
    }
    return fileMesh;
  };
  const promises = [];
  for (let k = 0; k < files.length; k++) {
    if (ev.dataTransfer.items[k].kind === 'file') {
      // eslint-disable-next-line no-await-in-loop
      promises.push(makeIt(k));
    }
  }
  const loadedMeshes = await Promise.allSettled(promises);
  loadedMeshes.forEach((it) => {
    rollingMeshes.push(it.value);
  });
});

// Main loop
const animProps = {
  count: 0,
  drawIdx: 0,
};

// Add animation timeline
const keyframeGui = gui.addFolder('Keyframes');
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
  if (rollingMeshes[animProps.drawIdx] != currentMesh) {
    scene.remove(currentMesh);
    currentMesh = rollingMeshes[animProps.drawIdx];
    scene.add(currentMesh);
  }

  if (tline.getValue() !== animProps.drawIdx) {
    tline.setValue(animProps.drawIdx);
    console.log(animProps.drawIdx);
  }
  tline.max(rollingMeshes.length - 1);

  controls.update();
  renderer.render(scene, camera);
}
animate(false);
tline.onChange(() => { if (!isAnimationGoing)animate(true); });
