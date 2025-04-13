import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { SquarePyramid } from './squarePyramid.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let startTime;
let lastFrameTime;

let isInitialized = false;

let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();  // 사각뿔은 고정 → modelMatrix는 단위행렬로 유지

const cameraCircleRadius = 3.0;
const cameraHeightMin = 0.0;
const cameraHeightMax = 10.0;
const cameraCircleSpeed = 90.0; // deg/sec
const cameraHeightSpeed = 45.0; // deg/sec

// SquarePyramid 객체 생성
const pyramid = new SquarePyramid(gl);
// 좌표축 그리기 – util의 Axes 이용
const axes = new Axes(gl, 1.8);

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('program terminated');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('program terminated with error:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2가 브라우저에서 지원되지 않습니다.');
        return false;
    }
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    return true;
}

async function initShader() {
    const vertSource = await readShaderFile('shVert.glsl');
    const fragSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertSource, fragSource);
}

function render() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    const elapsedTime = (currentTime - startTime) / 1000.0; // 초 단위
    lastFrameTime = currentTime;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Pyramid는 회전하지 않으므로 modelMatrix는 변화하지 않습니다.
    // 카메라 위치 계산:
    // - x, z: 원의 반지름 3을 따라 90°/sec 회전
    // - y: sin 함수를 이용해 45°/sec로 위아래로 진동
    const angleRad = glMatrix.toRadian(cameraCircleSpeed* elapsedTime);
    const camX = cameraCircleRadius * Math.sin(angleRad);
    const camZ = cameraCircleRadius * Math.cos(angleRad);
    const camY = cameraHeightMin + (cameraHeightMax - cameraHeightMin) * 0.5 * (Math.sin(glMatrix.toRadian(cameraHeightSpeed * elapsedTime)) + 1); 

    // 카메라가 원점 (0, 0, 0)을 바라보도록 설정 (바닥면의 중앙)
    mat4.lookAt(viewMatrix,
        vec3.fromValues(camX, camY, camZ),  // 카메라 위치
        vec3.fromValues(0, 0, 0),            // 바라보는 대상 (바닥 중심)
        vec3.fromValues(0, 1, 0));           // up vector (위쪽 방향)
    
    // Projection
    mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 100);

    // Model (fixed pyramid)
    mat4.identity(modelMatrix);

    // 셰이더에 행렬 전송 및 사각뿔 그리기
    shader.use();
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setMat4('u_projection', projMatrix);

    pyramid.draw(shader);

    // 좌표축 그리기
    axes.draw(viewMatrix, projMatrix);

    requestAnimationFrame(render);
}

async function main() {
    if (!initWebGL()) return false;
    shader = await initShader();
    startTime = lastFrameTime = Date.now();
    requestAnimationFrame(render);
    return true;
}