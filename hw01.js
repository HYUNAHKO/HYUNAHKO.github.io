window.onload = main;

function main() {
  //(1) 캔버스와 WebGL 컨텍스트 가져오기
  const canvas = document.getElementById("myCanvas");

  // WebGL2 우선 시도, 안 되면 WebGL1 시도
  let gl = canvas.getContext("webgl2");
  if (!gl) {
    console.warn("WebGL2 not supported, falling back on WebGL1...");
    gl = canvas.getContext("webgl");
    if (!gl) {
      alert("Your browser does not support WebGL.");
      return;
    }
  }

  //(2) 초기 사이즈 (HTML 태그에서 이미 500x500로 지정했지만, 여기서도 명시적으로 설정 가능!!!)
  canvas.width  = 500;
  canvas.height = 500;

  //(3) 초기 렌더링
  drawFourQuads(gl, canvas.width, canvas.height);

  //(4) 창 리사이즈 시 정사각형 비율로 다시 그리기
  window.addEventListener('resize', () => {
    resizeCanvas(canvas);
    drawFourQuads(gl, canvas.width, canvas.height);
  });
}

/**
 * 창 크기에 맞춰 canvas를 정사각형으로 조절
 */
function resizeCanvas(canvas) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 가로, 세로 중 더 작은 값으로 정사각형 크기
  const size = Math.min(w, h);
  canvas.width = size;
  canvas.height = size;
}

/**
 * 화면을 4등분하여 각각 다른 색으로 Clear하는 함수
 * WebGL에서는 fillRect 대신 scissor와 clear를 사용
 */
function drawFourQuads(gl, width, height) {
  // Scissor 테스트 활성화 (특정 영역만 지울 수 있게)
  gl.enable(gl.SCISSOR_TEST);

  const halfW = width / 2;
  const halfH = height / 2;
  //(A) 왼쪽 위-빨강
  // WebGL 좌표계: 왼쪽 아래가 (0,0), 아래 -> 위로 y증가
  gl.viewport(0, halfH, halfW, halfH);
  gl.scissor(0, halfH, halfW, halfH);
  gl.clearColor(1.0, 0.0, 0.0, 1.0); // 빨강
  gl.clear(gl.COLOR_BUFFER_BIT);

  //(B) 오른쪽 위-초록
  gl.viewport(halfW, halfH, halfW, halfH);
  gl.scissor(halfW, halfH, halfW, halfH);
  gl.clearColor(0.0, 1.0, 0.0, 1.0); // 초록
  gl.clear(gl.COLOR_BUFFER_BIT);

  //(C) 왼쪽 아래 -파랑
  gl.viewport(0, 0, halfW, halfH);
  gl.scissor(0, 0, halfW, halfH);
  gl.clearColor(0.0, 0.0, 1.0, 1.0); // 파랑
  gl.clear(gl.COLOR_BUFFER_BIT);

  //(D) 오른쪽 아 -노랑
  gl.viewport(halfW, 0, halfW, halfH);
  gl.scissor(halfW, 0, halfW, halfH);
  gl.clearColor(1.0, 1.0, 0.0, 1.0); // 노랑
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Scissor 테스트 종료 (다른 그리기를 할 때 영향 없도록)
  gl.disable(gl.SCISSOR_TEST);
}
