import * as THREE from 'three';  
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

const scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 20, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.0); // 밝기
light.position.set(70, 70, 100);
light.castShadow = true;
light.target.position.set(0, 0, 0);
scene.add(light.target);
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();

const cameraSettings = {
    current: 'Perspective',
    switchCamera: () => {
        const currentPosition = camera.position.clone();
        const currentRotation = camera.rotation.clone();
        const aspect = window.innerWidth / window.innerHeight;

        if (cameraSettings.current === 'Perspective') {
            const frustumSize = 100;
            camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                -frustumSize / 2,
                1,
                1000
            );
            camera.zoom = 1.2;  // Slight zoom for visual balance
            camera.updateProjectionMatrix();
            cameraSettings.current = 'Orthographic';
        } else {
            camera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
            cameraSettings.current = 'Perspective';
        }

        camera.position.copy(currentPosition);
        camera.rotation.copy(currentRotation);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        controls.object = camera;
    }
};

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(cameraSettings, 'switchCamera').name('Switch Camera Type');
cameraFolder.add(cameraSettings, 'current').name('Current Camera').listen();
cameraFolder.open();

const DISTANCE_SCALE = 1; // Scaling factor for all planetary distances
const RADIUS_SCALE = 1;

function addGeometries(scene) {
    const textureLoader = new THREE.TextureLoader();

    const mercuryTexture = textureLoader.load('Mercury.jpg');
    const mercuryMaterial = new THREE.MeshStandardMaterial({
        map: mercuryTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    const venusTexture = textureLoader.load('Venus.jpg');
    const venusMaterial = new THREE.MeshStandardMaterial({
        map: venusTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    const earthTexture = textureLoader.load('Earth.jpg');
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    const marsTexture = textureLoader.load('Mars.jpg');
    const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    window.planetPivots = [];

    // Mercury
    {
        const radius = 1.5 * RADIUS_SCALE;
        const distance = 20 * DISTANCE_SCALE;
        const rotationSpeed = 0.02;
        const orbitSpeed = 0.02;
        const name = 'Mercury';

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), mercuryMaterial);
        sphere.castShadow = true;

        const pivot = new THREE.Object3D();
        sphere.position.set(distance, 0, 0);
        pivot.add(sphere);
        // pivot.rotation.set(0, -Math.PI / 2, 0);
        scene.add(pivot);

        window.planetPivots.push({ pivot, mesh: sphere, orbitSpeed, spinSpeed: rotationSpeed, name });
    }

    // Venus
    {
        const radius = 3 * RADIUS_SCALE;
        const distance = 35 * DISTANCE_SCALE;
        const rotationSpeed = 0.015;
        const orbitSpeed = 0.015;
        const name = 'Venus';

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), venusMaterial);
        sphere.castShadow = true;

        const pivot = new THREE.Object3D();
        sphere.position.set(distance, 0, 0);
        pivot.add(sphere);
        // pivot.rotation.set(0, -Math.PI / 2, 0);
        scene.add(pivot);

        window.planetPivots.push({ pivot, mesh: sphere, orbitSpeed, spinSpeed: rotationSpeed, name });
    }

    // Earth
    {
        const radius = 3.5 * RADIUS_SCALE;
        const distance = 50 * DISTANCE_SCALE;
        const rotationSpeed = 0.01;
        const orbitSpeed = 0.01;
        const name = 'Earth';

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), earthMaterial);
        sphere.castShadow = true;

        const pivot = new THREE.Object3D();
        sphere.position.set(distance, 0, 0);
        pivot.add(sphere);
        // pivot.rotation.set(0, -Math.PI / 2, 0);
        scene.add(pivot);

        window.planetPivots.push({ pivot, mesh: sphere, orbitSpeed, spinSpeed: rotationSpeed, name });
    }

    // Mars
    {
        const radius = 2.5 * RADIUS_SCALE;
        const distance = 65 * DISTANCE_SCALE;
        const rotationSpeed = 0.008;
        const orbitSpeed = 0.008;
        const name = 'Mars';

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), marsMaterial);
        sphere.castShadow = true;

        const pivot = new THREE.Object3D();
        sphere.position.set(distance, 0, 0);
        pivot.add(sphere);
        // pivot.rotation.set(0, -Math.PI / 2, 0);
        scene.add(pivot);

        window.planetPivots.push({ pivot, mesh: sphere, orbitSpeed, spinSpeed: rotationSpeed, name });
    }

    // Add sun
    // Use MeshStandardMaterial to allow for emissive property for a brighter sun
    const sunMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 2.5
    });
    const sunGeometry = new THREE.SphereGeometry(10 * RADIUS_SCALE, 32, 32);
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(0, 0, 0);
    scene.add(sunMesh);
}

addGeometries(scene);

// GUI 폴더 구성: 행성 각각에 대해 생성
if (window.planetPivots) {
    window.planetPivots.forEach((planet) => {
        const folder = gui.addFolder(planet.name);
        folder.add(planet, 'spinSpeed', 0, 0.1).name('Rotation Speed');
        folder.add(planet, 'orbitSpeed', 0, 0.1).name('Orbit Speed');
        folder.open();
    });
}

// Set background color and fog
scene.background = new THREE.Color(0x000000);
// Fog removed as per user instruction
// scene.fog = new THREE.Fog(0x000000, 10, 100);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Configure directional light shadows
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 50;

function render() {
    requestAnimationFrame(render);
    if (window.planetPivots) {
        planetPivots.forEach(({ pivot, mesh, orbitSpeed, spinSpeed }) => {
            pivot.rotation.y += orbitSpeed;
            mesh.rotation.y += spinSpeed;
        });
    }
    stats.update();
    renderer.render(scene, camera);
    controls.update();
}
render();