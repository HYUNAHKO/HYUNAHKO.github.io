export class Cone {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} segments
     * @param {object} options
     *        options.color : [r, g, b, a] 형태의 색상 (기본 [0.8, 0.8, 0.8, 1.0])
     */
    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;

        // VAO, VBO, EBO 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const radius = 0.5;     // 원뿔 바닥 반지름
        const halfH = 0.5;      // 높이의 절반 (꼭짓점 y=+0.5, 바닥 y=-0.5)
        this.segments = segments;

        const angleStep = (2 * Math.PI) / segments;

        const positions = [];
        const normals   = [];
        const colors    = [];
        const texCoords = [];
        const indices   = [];

        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorOption = options.color || defaultColor;

        // 꼭짓점(top): 고정된 하나의 점
        const apexIndex = 0;
        positions.push(0.0, halfH, 0.0);  // y=+0.5 꼭짓점
        normals.push(0.0, 1.0, 0.0);      // 초기값, 이후 재계산 가능
        colors.push(...colorOption);
        texCoords.push(0.5, 1.0);         // 중심

        // 각 세그먼트마다 바닥 두 점(bot0, bot1) 정의
        for (let i = 0; i < segments; i++) {
            const angle0 = i * angleStep;
            const angle1 = (i + 1) * angleStep;

            const x0_bot = radius * Math.cos(angle0);
            const z0_bot = radius * Math.sin(angle0);
            const x1_bot = radius * Math.cos(angle1);
            const z1_bot = radius * Math.sin(angle1);

            // CCW 순서: apex → bot1 → bot0
            positions.push(
                x1_bot, -halfH, z1_bot, // bot1
                x0_bot, -halfH, z0_bot  // bot0
            );

            // 법선: 각 삼각형 면의 중앙 각도 기준으로 외향
            const midAngle = angle0 + angleStep * 0.5;
            const nx = Math.cos(midAngle);
            const ny = radius / halfH;  // 대략적인 위쪽 방향
            const nz = Math.sin(midAngle);
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

            const normX = nx / len;
            const normY = ny / len;
            const normZ = nz / len;

            // bot1, bot0에 동일한 면 노멀 지정
            for (let k = 0; k < 2; k++) {
                normals.push(normX, normY, normZ);
                colors.push(...colorOption);
            }

            // 텍스처 좌표 (단순 cylindrical)
            const u0 = i / segments;
            const u1 = (i + 1) / segments;
            texCoords.push(u1, 0); // bot1
            texCoords.push(u0, 0); // bot0

            // 인덱스 구성
            // apexIndex = 0 (고정), 현재 세그먼트의 두 바닥 정점: 1 + i*2, 1 + i*2 + 1
            const base = 1 + i * 2;
            indices.push(apexIndex, base, base + 1);
        }

        this.vertices = new Float32Array(positions);
        this.normals  = new Float32Array(normals);
        this.colors   = new Float32Array(colors);
        this.texCoords= new Float32Array(texCoords);
        this.indices  = new Uint16Array(indices);

        // 백업용
        this.faceNormals = new Float32Array(this.normals);
        this.vertexNormals = new Float32Array(this.normals);
        this.computeVertexNormals();

        this.initBuffers();
    }

    computeVertexNormals() {
        const vCount = this.vertices.length / 3;
        this.vertexNormals = new Float32Array(this.vertices.length);

        for (let i = 0; i < vCount; i++) {
            const x = this.vertices[i * 3 + 0];
            const y = this.vertices[i * 3 + 1];
            const z = this.vertices[i * 3 + 2];

            const len = Math.sqrt(x * x + z * z);
            if (len > 0) {
                this.vertexNormals[i * 3 + 0] = x / len;
                this.vertexNormals[i * 3 + 1] = 0;
                this.vertexNormals[i * 3 + 2] = z / len;
            } else {
                this.vertexNormals[i * 3 + 0] = 0;
                this.vertexNormals[i * 3 + 1] = 1;
                this.vertexNormals[i * 3 + 2] = 0;
            }
        }
    }

    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }

    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }

    initBuffers() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    updateNormals() {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        const vSize = this.vertices.byteLength;
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

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
