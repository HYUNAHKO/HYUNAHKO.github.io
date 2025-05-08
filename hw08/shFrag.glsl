#version 300 es

precision highp float;

out vec4 FragColor;
in vec3 fragPos;  
in vec3 normal;  
in vec2 texCoord;

uniform int toonLevels;

struct Material {
    vec3 diffuse;    // diffuse color
    vec3 specular;   // specular color
    float shininess; // specular 반짝임 정도
};

struct Light {
    //vec3 position;
    vec3 direction;
    vec3 ambient;    // ambient 적용 strength
    vec3 diffuse;    // diffuse 적용 strength
    vec3 specular;   // specular 적용 strength
};

float qunatize(float value){
    if (toonLevels <= 1) return value;  // 원래 값을 그대로 반환
    float levels = float(toonLevels);
    // value * levels ∈ [0, levels]
    float v = value * levels;
    // 0 <= floor(v) <= levels-1
    float idx = floor(v);
    return (idx+0.5)/levels;
}

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

void main() {
    if (toonLevels <= 1) {
        // toon level 2의 어두운 부분 색상과 동일하게 계산
        vec3 ambient = light.ambient * material.diffuse;
        float diffQ = 0.25; // toon level 2의 어두운 구간
        vec3 dark = ambient + light.diffuse * diffQ * material.diffuse;
        FragColor = vec4(dark, 1.0);
        return;
    }
    // ambient
    vec3 ambient = light.ambient * material.diffuse;
  	
    // diffuse 
    vec3 norm = normalize(normal);
    vec3 lightDir = normalize(light.direction);
    float dotNormLight = dot(norm, lightDir);
    float diff = max(dotNormLight, 0.0);
    
    // specular
    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(lightDir, norm);

    float dotViewDirReflectDir = dot(viewDir, reflectDir);
    float spec;
    if (dotNormLight > 0.0) {
        spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    }
    else spec = 0.0f;
    
    float diffQ = qunatize(diff); // toon shading에 따른 반사광
    float specQ = qunatize(spec); // toon shading에 따른 specular

    vec3 result = 
        ambient +
        light.diffuse * diffQ * material.diffuse +
        light.specular * specQ * material.specular; //최종 색상

    FragColor = vec4(result, 1.0);
} 