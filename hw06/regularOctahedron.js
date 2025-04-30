export class RegularOctahedron {
    constructor(gl) {
        this.gl = gl;
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const s = Math.SQRT1_2; // sqrt(2)/2 ≈ 0.7071
        const vertexData = new Float32Array([
            // Top 4 faces (top center at (0.5, 1.0))
            0,  s,  0,   0.5, 1.0,
            s,  0,  0,   1.0, 0.5,
            0,  0,  s,   0.75, 0.5,

            0,  s,  0,   0.5, 1.0,
            0,  0,  s,   0.75, 0.5,
           -s,  0,  0,   0.5, 0.5,

            0,  s,  0,   0.5, 1.0,
           -s,  0,  0,   0.5, 0.5,
            0,  0, -s,   0.25, 0.5,

            0,  s,  0,   0.5, 1.0,
            0,  0, -s,   0.25, 0.5,
            s,  0,  0,   1.0, 0.5,

            // Bottom 4 faces (bottom center at (0.5, 0.0))
            0, -s,  0,   0.5, 0.0,
            0,  0,  s,   0.75, 0.5,
            s,  0,  0,   1.0, 0.5,

            0, -s,  0,   0.5, 0.0,
           -s,  0,  0,   0.5, 0.5,
            0,  0,  s,   0.75, 0.5,

            0, -s,  0,   0.5, 0.0,
            0,  0, -s,   0.25, 0.5,
           -s,  0,  0,   0.5, 0.5,

            0, -s,  0,   0.5, 0.0,
            s,  0,  0,   1.0, 0.5,
            0,  0, -s,   0.25, 0.5,
        ]);

        this.vertexCount = vertexData.length / 5;

        const vbo = gl.createBuffer();
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

        // position
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);

        // texCoord
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 20, 12);

        gl.bindVertexArray(null);
    }

    draw(shader) {
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
        this.gl.bindVertexArray(null);
    }
}