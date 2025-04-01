import { resizeAspectRatio, setupText, updateText, Axes} from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let isInitialized = false; 
let shader;          
let vao;        
let positionBuffer;  // circle or line vertices
let pointBuffer;     // intersection points
let axes = new Axes(gl, 0.85);

// 텍스트 오버레이
let textOverlay1;       // Circle info
let textOverlay2;       // Line info
let textOverlay3;       // Intersection info

// --- Circle 상태 ---
let circleCenter = null; 
let circleRadius = 0.0;
let isCircleDone = false;   // 원 입력이 끝났는지 
let isCircleDragging = false; 
let circleInfo = null;

// --- Line 상태 ---
let isLineDrawing = false;
let startPoint = null;    // 선분 시작점
let lineEnd = null;      // 선분 확정 끝점
let tempEndPoint = null;  // 드래그 임시점
let isLineDone = false;  // 선분 입력이 끝났는지

// --- Intersection ---
let intersectionPoints = []; // 교차점 (최대 2개)
let isIntersectionComputed = false;

// mouse 쓸 때 main call 
document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) {
      console.log("Already initialized");
      return;
  }

  main().then(success => { // call main function
      if (!success) {
          console.log('프로그램을 종료합니다.');
          return;
      }
      isInitialized = true;
  }).catch(error => {
      console.error('프로그램 실행 중 오류 발생:', error);
  });
});


//WebGL 초기화
function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

function setupCanvas() {
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
}

function setupBuffers(shader) {
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
function convertToWebGLCoordinates(x, y) {
  return [
      (x / canvas.width) * 2 - 1,
      -((y / canvas.height) * 2 - 1)
  ];
}

/* 
  browser window
  +----------------------------------------+
  | toolbar, address bar, etc.             |
  +----------------------------------------+
  | browser viewport (컨텐츠 표시 영역)       | 
  | +------------------------------------+ |
  | |                                    | |
  | |    canvas                          | |
  | |    +----------------+              | |
  | |    |                |              | |
  | |    |      *         |              | |
  | |    |                |              | |
  | |    +----------------+              | |
  | |                                    | |
  | +------------------------------------+ |
  +----------------------------------------+

  *: mouse click position

  event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
  event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
  rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
  rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

  x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
  y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

// ====================이벤트==================== //
// 1단계: Circle 입력
function setupCircleEvents() {
    canvas.addEventListener('mousedown', onCircleMouseDown);
    canvas.addEventListener('mousemove', onCircleMouseMove);
    canvas.addEventListener('mouseup', onCircleMouseUp);
  }
function removeCircleEvents() {
    canvas.removeEventListener('mousedown', onCircleMouseDown);
    canvas.removeEventListener('mousemove', onCircleMouseMove);
    canvas.removeEventListener('mouseup', onCircleMouseUp);
}

function onCircleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isCircleDone) return

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!isCircleDone && !isLineDone) {
      let [glX, glY] = convertToWebGLCoordinates(x, y);
      circleCenter = [glX, glY];
      circleRadius = 0.0;
      isCircleDragging = true;
    }
}
function onCircleMouseMove(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isCircleDragging) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let [glX, glY] = convertToWebGLCoordinates(x, y);

      // 반지름 업데이트
      const dx = glX - circleCenter[0];
      const dy = glY - circleCenter[1];
      circleRadius = Math.sqrt(dx*dx + dy*dy);

      render();
    }
}
function onCircleMouseUp(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isCircleDragging) {
      isCircleDragging = false;
      isCircleDone = true;
      // circleInfo에 [centerX, centerY, radius] 저장
      circleInfo = [
        circleCenter[0],
        circleCenter[1],
        circleRadius
      ];
      // 첫 번째 라인에 circle info 표시
      updateText(textOverlay1, `Circle: center (${circleCenter[0].toFixed(2)}, ${circleCenter[1].toFixed(2)}) radius = ${circleRadius.toFixed(2)}`);
      // 원 입력 끝났으니, 선분 이벤트로로 이동
      removeCircleEvents();
      setupLineEvents();
      render();
    }
}
  
// 2단계: Line segment 입력
function setupLineEvents() {
    canvas.addEventListener('mousedown', onLineMouseDown);
    canvas.addEventListener('mousemove', onLineMouseMove);
    canvas.addEventListener('mouseup', onLineMouseUp);
}

function removeLineEvents() {
    canvas.removeEventListener('mousedown', onLineMouseDown);
    canvas.removeEventListener('mousemove', onLineMouseMove);
    canvas.removeEventListener('mouseup', onLineMouseUp);
}
  
function onLineMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isCircleDone) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (!isLineDone) {
      let [glX, glY] = convertToWebGLCoordinates(x, y);

      startPoint = [glX, glY];
      lineEnd = null;
      tempEndPoint = null;
      isLineDrawing = true;
    }
}
function onLineMouseMove(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isLineDrawing) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let [glX, glY] = convertToWebGLCoordinates(x, y);

      // 임시 끝점
      tempEndPoint = [glX, glY];
      render();
    }
}

function onLineMouseUp(event) {
  event.preventDefault();
  event.stopPropagation();

  if (isLineDrawing && tempEndPoint) {
    isLineDrawing = false;
    lineEnd = tempEndPoint;
    isLineDone = true;

    updateText(textOverlay2,
      `Line segment: (${startPoint[0].toFixed(2)}, ${startPoint[1].toFixed(2)}) ~ (${lineEnd[0].toFixed(2)}, ${lineEnd[1].toFixed(2)})`
    );

    // 교차점 계산
    intersectionPoints = circleLineIntersection(circleInfo, startPoint, lineEnd);
    isIntersectionComputed = true;

    if (intersectionPoints.length===0){
      updateText(textOverlay3, "No intersection");
    } else {
      let msg = `Intersection Points: ${intersectionPoints.length}`;
      intersectionPoints.forEach((pt,i)=>{
        msg += ` Point ${i+1}: (${pt[0].toFixed(2)}, ${pt[1].toFixed(2)})`;
      });
      updateText(textOverlay3, msg);
    }

    removeLineEvents();
    render();
  }
}

// ======================= 교차점 계산 =======================
function circleLineIntersection(circleInfo, p1, p2) {
  if(!circleInfo) return [];

  const [cx, cy, radius] = circleInfo;
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const A = dx*dx + dy*dy;
  const B = 2*(dx*(x1-cx)+dy*(y1-cy));
  const C = (x1-cx)*(x1-cx)+(y1-cy)*(y1-cy) - radius*radius;

  if(A===0) return [];
  const disc = B*B - 4*A*C;
  if(disc<0) return [];

  if(disc===0){
    let t= -B/(2*A);
    if(t>=0 && t<=1){
      let ix=x1 + t*dx;
      let iy=y1 + t*dy;
      return [[ix, iy]];
    }
    return [];
  } else {
    let sqrtD = Math.sqrt(disc);
    let t1 = (-B + sqrtD)/(2*A);
    let t2 = (-B - sqrtD)/(2*A);

    let ret=[];
    [t1,t2].forEach(tt=>{
      if(tt>=0 && tt<=1){
        let ix = x1 + tt*dx;
        let iy = y1 + tt*dy;
        ret.push([ix, iy]);
      }
    });
    return ret;
  }
}

// ======================= 렌더링 =======================
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  shader.use();

  // 1) 원 그리기
  if(circleCenter && circleRadius > 0){
    const segs = 100;
    let verts=[];
    for(let i=0; i<segs; i++){
      let theta = 2*Math.PI*(i/segs);
      let px = circleCenter[0] + circleRadius*Math.cos(theta);
      let py = circleCenter[1] + circleRadius*Math.sin(theta);
      verts.push(px, py);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    if(isCircleDone){
      // 원 확정 => 핑크 
      shader.setVec4("u_color", [0.96, 0.0, 0.96, 1.0]);
    } else {
      // 드래그 중 원 => 회색
      shader.setVec4("u_color", [0.7, 0.7, 0.7, 1.0]);
    }
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.LINE_LOOP, 0, segs);
  }

  // 2) 선분 (확정 or 임시)
  if(startPoint && (lineEnd || tempEndPoint)){
    let endP = lineEnd || tempEndPoint;
    let lineVerts = new Float32Array([
      startPoint[0], startPoint[1],
      endP[0], endP[1]
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.DYNAMIC_DRAW);
    if(lineEnd){
      // 확정된 선 => 파스텔 블루
      shader.setVec4("u_color",[0.47, 0.51, 0.75, 1.0]);
    } else {
      // 임시 선 => 회색
      shader.setVec4("u_color",[0.5, 0.5, 0.5, 1.0]);
    }
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.LINES, 0, 2);
  }

  // 3) 교차점
  if(isIntersectionComputed && intersectionPoints.length>0){
    let pts=[];
    intersectionPoints.forEach(pt=>{
      pts.push(pt[0], pt[1]);
    });
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pts),gl.DYNAMIC_DRAW);
    // 노랑
    shader.setVec4("u_color",[1.0, 1.0, 0.0, 1.0]);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, pts.length/2);
  }

  // 4) axes
  axes.draw(mat4.create(),mat4.create());
}

// ===================== 셰이더 초기화 =====================
async function initShader() {
  const vertexShaderSource = await readShaderFile('shVert.glsl');
  const fragmentShaderSource = await readShaderFile('shFrag.glsl');
  // Shader 클래스를 이용해 Shader 생성
  return new Shader(gl, vertexShaderSource, fragmentShaderSource);;
}

// ===================== main =====================
async function main() {
    try {
      if (!initWebGL()) {
        throw new Error('WebGL 초기화 실패');
      }
  
      // 셰이더
      shader = await initShader();
  
      setupCanvas();
      setupBuffers(shader);
      shader.use();
      
      // 텍스트 오버레이
      textOverlay1 = setupText(canvas, "", 1);
      textOverlay2 = setupText(canvas, "", 2);
      textOverlay3 = setupText(canvas, "", 3);

      // Circle 입력 이벤트 등록 완료 후 Line 이벤트로
      setupCircleEvents();
  
      // 초기 draw
      render();
    } catch (err) {
      console.error("프로그램 실행 중 오류:", err);
      alert("프로그램 실행 중 오류 발생");
    }
}