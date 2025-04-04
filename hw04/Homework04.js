import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let axesVAO;
let cubeVAO
let sunFinalTransform;
let earthFinalTransform;
let moonFinalTransform;
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupAxesBuffers(shader) {
    axesVAO = gl.createVertexArray();
    gl.bindVertexArray(axesVAO);

    const axesVertices = new Float32Array([
        -0.8, 0.0, 0.0,   // x축 시작점
        0.8, 0.0, 0.0,   // x축 끝점
        0.0, -0.8, 0.0,  // y축 시작점
        0.0, 0.8, 0.0   // y축 끝점
    ]);

    const axesColors = new Float32Array([
        1.0, 0.3, 0.0, 1.0, 1.0, 0.3, 0.0, 1.0,  // x축 색상
        0.0, 1.0, 0.5, 1.0, 0.0, 1.0, 0.5, 1.0   // y축 색상
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 기본 정사각형 버텍스 데이터 (edge length 1.0)
function setupCubeBuffers(shader) {
    const cubeVertices = new Float32Array([
        -0.5,  0.5, 0.0,  // 좌상단
        -0.5, -0.5, 0.0,  // 좌하단
         0.5, -0.5, 0.0,  // 우하단
         0.5,  0.5, 0.0   // 우상단
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);

    cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function getTransformMatricesToSun(time) {
    const R = mat4.create();
    const S = mat4.create();
    
    mat4.rotate(R, R, degToRad(45 * time), [0, 0, 1]);
    mat4.scale(S, S, [0.2, 0.2, 1]);
    
    return { R, S };
}

function getTransformMatricesToEarth(time) {
    const T = mat4.create();
    const selfR = mat4.create();
    const orbitR = mat4.create();
    const S = mat4.create();
    
    mat4.translate(T, T, [0.7, 0, 0]); // 태양으로부터 떨어진 거리
    mat4.rotate(selfR, selfR, degToRad(180 * time), [0, 0, 1]); // 자전
    mat4.rotate(orbitR, orbitR, degToRad(30 * time), [0, 0, 1]); // 공전
    mat4.scale(S, S, [0.1, 0.1, 1]); // 크기 0.1로 조정
    
    return { T, selfR, orbitR, S };
}

function getTransformMatricesToMoon(time) {
    const T = mat4.create();
    const selfR = mat4.create();
    const orbitR = mat4.create();
    const S = mat4.create();
    
    mat4.translate(T, T, [0.2, 0, 0]); // 지구로부터 떨어진 거리
    mat4.rotate(selfR, selfR, degToRad(180 * time), [0, 0, 1]); // 자전
    mat4.rotate(orbitR, orbitR, degToRad(360 * time), [0, 0, 1]); // 공전
    mat4.scale(S, S, [0.05, 0.05, 1]); // 크기 0.05
    
    return { T, selfR, orbitR, S };
} 

function animate(currentTime) {
    render(currentTime);
    requestAnimationFrame(animate);
}

// 각도를 radian으로 변환
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function render(currentTime) {
    // currentTime은 밀리초 단위이므로 초 단위로 변환
    const time = currentTime / 1000.0;
    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();

    //축 그리기
    shader.setMat4("u_model", mat4.create());
    gl.bindVertexArray(axesVAO);
    gl.drawArrays(gl.LINES, 0, 4);

    // sun 그리기
    sunFinalTransform = mat4.create();
    const { R: sR, S: sS } = getTransformMatricesToSun(time);
    mat4.multiply(sunFinalTransform, sS, sunFinalTransform);
    mat4.multiply(sunFinalTransform, sR, sunFinalTransform);
    shader.setMat4("u_model", sunFinalTransform);
    shader.setVec4("u_color", [1.0, 0.0, 0.0, 1.0]); // red
    gl.bindVertexArray(cubeVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // earth 그리기
    let earthCoord = mat4.create();
    earthFinalTransform = mat4.create();
    const { T: eT, selfR: esR , orbitR: eoR, S: eS } = getTransformMatricesToEarth(time);
    mat4.multiply(earthCoord, esR, earthCoord); // earthCoord = selfR
    mat4.multiply(earthCoord, eT, earthCoord); // earthCoord = eT * (selfR)
    mat4.multiply(earthCoord, eoR, earthCoord);  // earthCoord = eoR * (eT * (selfR))
    // 최종 Earth = earthCoord * eS (스케일 0.1)
    mat4.multiply(earthFinalTransform, earthCoord, eS);
    shader.setMat4("u_model", earthFinalTransform);
    shader.setVec4("u_color", [0.0, 1.0, 1.0, 1.0]); // cyan
    gl.bindVertexArray(cubeVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // mooon 그리기
    let moonRelative = mat4.create();
    moonFinalTransform = mat4.create();
    const { T: mT, selfR: msR, orbitR: moR, S: mS } = getTransformMatricesToMoon(time);
     // MoonRelative = orbitR * (mT * (selfR * mS))
     mat4.multiply(moonRelative, mS, moonRelative);      // moonRelative = mS
     mat4.multiply(moonRelative, msR, moonRelative);   // moonRelative = selfR * mS
     mat4.multiply(moonRelative, mT, moonRelative);     // moonRelative = mT * (selfR * mS)
     mat4.multiply(moonRelative, moR, moonRelative);  // moonRelative = orbitR * (mT * (selfR * S))

    // ------ 부모 회전 역행렬 보정 (Earth 회전에 의해 Moon이 2중 회전 안 되도록) ------
    let eRot = extractRotation(earthCoord);
    let invERot = mat4.create();
    mat4.invert(invERot, eRot);

    // correctedMoonRelative = invERot * moonRelative
    let correctedMoonRelative = mat4.create();
    mat4.multiply(correctedMoonRelative, invERot, moonRelative);

    // 최종 Moon = earthCoord * correctedMoonRelative
    moonFinalTransform = mat4.create();
    mat4.multiply(moonFinalTransform, earthCoord, correctedMoonRelative);

    shader.setMat4("u_model", moonFinalTransform);
    shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]); // yellow
    gl.bindVertexArray(cubeVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

}    

/*
원본 4×4 행렬(mat) 구성

    |  mat[0]   mat[4]   mat[8]   mat[12]  |
    |  mat[1]   mat[5]   mat[9]   mat[13]  |
    |  mat[2]   mat[6]   mat[10]  mat[14]  |
    |  mat[3]   mat[7]   mat[11]  mat[15]  |

extractRotation() 함수에서는 상위 3×3 부분(회전 성분)만 복사하고 나머지는 단위행렬로 설정합니다.

복사 후 rot 행렬의 구성

    | rot[0]   rot[4]   rot[8]   rot[12]  |
    | rot[1]   rot[5]   rot[9]   rot[13]  |
    | rot[2]   rot[6]   rot[10]  rot[14]  |
    | rot[3]   rot[7]   rot[11]  rot[15]  |

여기서 각 요소는 다음과 같이 채워집니다.

    rot[0] = mat[0];   rot[4] = mat[4];   rot[8]  = mat[8];
    rot[1] = mat[1];   rot[5] = mat[5];   rot[9]  = mat[9];
    rot[2] = mat[2];   rot[6] = mat[6];   rot[10] = mat[10];

그리고 나머지 요소는
    
    rot[3]  = 0;   rot[7]  = 0;   rot[11] = 0;
    rot[12] = 0;   rot[13] = 0;   rot[14] = 0;   rot[15] = 1;

따라서 최종적으로 extractRotation(mat) 함수가 반환하는 rot 행렬은 아래와 같은 형태입니다

    |  mat[0]   mat[4]   mat[8]    0  |
    |  mat[1]   mat[5]   mat[9]    0  |
    |  mat[2]   mat[6]   mat[10]   0  |
    |    0        0         0      1  |
*/

function extractRotation(mat) {
    let rot = mat4.create();
    // 4x4 행렬에서 상위 3x3 회전 부분을 복사, 나머지 요소는 단위값으로 설정
    rot[0] = mat[0]; rot[1] = mat[1]; rot[2] = mat[2];
    rot[4] = mat[4]; rot[5] = mat[5]; rot[6] = mat[6];
    rot[8] = mat[8]; rot[9] = mat[9]; rot[10] = mat[10];
    // 나머지는 단위 행렬 값
    rot[3] = 0; rot[7] = 0; rot[11] = 0;
    rot[12] = 0; rot[13] = 0; rot[14] = 0; rot[15] = 1;
    return rot;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        shader = await initShader();
        setupAxesBuffers(shader);
        setupCubeBuffers(shader);
        shader.use();
        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}