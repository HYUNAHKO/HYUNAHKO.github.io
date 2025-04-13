export class SquarePyramid {
    constructor(gl, options = {}) {
        this.gl = gl;
        // VAO, VBO, EBO 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // ------------------------------
        // 정점 위치 (vertices)
        // ------------------------------
        // 먼저, 바닥면 4개 정점 (사각형의 모서리)
        // 바닥면은 중앙 (0,0,0)에서 -0.5 ~ +0.5를 가지도록 합니다.
        // 그리고 이어서 4개의 측면(삼각형)을 정의합니다.
        //
        // 바닥면의 정점 순서는 (v0, v1, v2, v3)로 정의하며,
        // 외부로 향하는 법선이 (0,-1,0)이 되도록 (시계방향) 나열합니다.
        //
        // 측면 삼각형은 각 face마다 3개의 정점을 사용하며,
        // 아래와 같이 중복된 정점을 사용합니다.
        //   - front face: 바닥의 앞쪽 변 (v3, v2)와 apex
        //   - right face: 오른쪽 변 (v2, v1)와 apex
        //   - back face:  뒷쪽 변 (v1, v0)와 apex
        //   - left face:  왼쪽 변 (v0, v3)와 apex
        //
        // 전체 정점 수: 4 (바닥) + 4×3 (측면) = 16
        this.vertices = new Float32Array([
            // [바닥면] (인덱스 0~3)
            -0.5, 0.0, -0.5,   // v0 : 왼쪽 뒤
             0.5, 0.0, -0.5,   // v1 : 오른쪽 뒤
             0.5, 0.0,  0.5,   // v2 : 오른쪽 앞
            -0.5, 0.0,  0.5,   // v3 : 왼쪽 앞

            // [측면 front] (인덱스 4~6)
            -0.5, 0.0,  0.5,   // v3 (재사용)
             0.5, 0.0,  0.5,   // v2 (재사용)
             0.0, 1.0,  0.0,   // apex

            // [측면 right] (인덱스 7~9)
             0.5, 0.0,  0.5,   // v2
             0.5, 0.0, -0.5,   // v1
             0.0, 1.0,  0.0,   // apex

            // [측면 back] (인덱스 10~12)
             0.5, 0.0, -0.5,   // v1
            -0.5, 0.0, -0.5,   // v0
             0.0, 1.0,  0.0,   // apex

            // [측면 left] (인덱스 13~15)
            -0.5, 0.0, -0.5,   // v0
            -0.5, 0.0,  0.5,   // v3
             0.0, 1.0,  0.0    // apex
        ]);

        // ------------------------------
        // 인덱스 (indices)
        // ------------------------------
        // 바닥면은 사각형이므로 두 개의 삼각형으로 쪼갭니다.
        // 그리고 각 측면은 이미 3개의 정점을 가지고 있으므로 그대로 사용합니다.
        this.indices = new Uint16Array([
            // 바닥면 (quad → 두 개의 삼각형)
             0, 1, 2,
             0, 2, 3,
            // 측면 front
             4, 5, 6,
            // 측면 right
             7, 8, 9,
            // 측면 back
            10, 11, 12,
            // 측면 left
            13, 14, 15
        ]);

        // ------------------------------
        // 법선 (normals)
        // ------------------------------
        // 각 face마다 flat shading을 위해 모든 정점에 같은 법선을 할당합니다.
        this.normals = new Float32Array([
            // 바닥면 (인덱스 0~3): 모든 정점 (0, -1, 0)
            0, -1, 0,   // v0
            0, -1, 0,   // v1
            0, -1, 0,   // v2
            0, -1, 0,   // v3
        
            // front face (인덱스 4~6): (0, 0.707, 0.707)
            0, 0.707, 0.707,   // v3 (재사용)
            0, 0.707, 0.707,   // v2 (재사용)
            0, 0.707, 0.707,   // apex
        
            // right face (인덱스 7~9): (0.707, 0.707, 0)
            0.707, 0.707, 0,   // v2
            0.707, 0.707, 0,   // v1
            0.707, 0.707, 0,   // apex
        
            // back face (인덱스 10~12): (0, 0.707, -0.707)
            0, 0.707, -0.707,   // v1
            0, 0.707, -0.707,   // v0
            0, 0.707, -0.707,   // apex
        
            // left face (인덱스 13~15): (-0.707, 0.707, 0)
            -0.707, 0.707, 0,   // v0
            -0.707, 0.707, 0,   // v3
            -0.707, 0.707, 0    // apex
        ]);        

        // ------------------------------
        // 정점 색상 (colors)
        // ------------------------------
        // 옵션으로 color가 주어지면 모든 정점에 동일 색상을 할당하고,
        // 그렇지 않으면 face마다 다른 색상을 지정합니다.
        if (options.color) {
            // 옵션으로 전달된 색상을 16개 정점 모두에 적용합니다.
            this.colors = new Float32Array(16 * 4);
            for (let i = 0; i < 16 * 4; i += 4) {
                this.colors[i]   = options.color[0];
                this.colors[i+1] = options.color[1];
                this.colors[i+2] = options.color[2];
                this.colors[i+3] = options.color[3];
            }
        } else {
            // 옵션이 없으면 각 면별로 다른 색상을 지정합니다.
            // 아래 배열은 각 면에 해당하는 정점 순서에 맞게 설정되어 있습니다.
            // 바닥면 (4 정점): 파랑 (0,0,1,1)
            // front face (3 정점): 빨강 (1,0,0,1)
            // right face (3 정점): 노랑 (1,1,0,1)
            // back face (3 정점): 핑크 (1,0,1,1)
            // left face (3 정점): 하늘색 (0,1,1,1)
            this.colors = new Float32Array([
                 // 바닥면 (인덱스 0~3)
                 0, 0, 1, 1,
                 0, 0, 1, 1,
                 0, 0, 1, 1,
                 0, 0, 1, 1,
                 // front face (인덱스 4~6)
                 1, 0, 0, 1,
                 1, 0, 0, 1,
                 1, 0, 0, 1,
                 // right face (인덱스 7~9)
                 1, 1, 0, 1,
                 1, 1, 0, 1,
                 1, 1, 0, 1,
                 // back face (인덱스 10~12)
                 1, 0, 1, 1,
                 1, 0, 1, 1,
                 1, 0, 1, 1,
                 // left face (인덱스 13~15)
                 0, 1, 1, 1,
                 0, 1, 1, 1,
                 0, 1, 1, 1,
            ]);
        }
        
        // ------------------------------
        // 텍스처 좌표 (texCoords)
        // ------------------------------
        // 바닥면에는 0~1 범위로 사각형 매핑,
        // 측면 face는 각 삼각형에 (0,0), (1,0), (0.5,1)로 지정합니다.
        const texCoords = [];
        // 바닥면 (인덱스 0~3)
        texCoords.push(0, 0);
        texCoords.push(1, 0);
        texCoords.push(1, 1);
        texCoords.push(0, 1);
        // 각 측면 4 face – 3개씩 동일하게
        for (let i = 0; i < 4; i++) {
            texCoords.push(0, 0);
            texCoords.push(1, 0);
            texCoords.push(0.5, 1);
        }
        this.texCoords = new Float32Array(texCoords);

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정 
        // 0: 위치 (vec3), 1: 법선 (vec3), 2: 색상 (vec4), 3: 텍스처 좌표 (vec2)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
}
