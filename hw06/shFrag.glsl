#version 300 es

precision highp float;

in vec2 v_texCoord;
in vec3 v_normal;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec3 u_lightDir;

void main() {
    vec3 normal = normalize(v_normal);
    float diffuse = max(dot(normal, normalize(u_lightDir)), 1.0);
    vec4 texColor = texture(u_texture, v_texCoord);
    fragColor = vec4(texColor.rgb * diffuse, texColor.a);
}