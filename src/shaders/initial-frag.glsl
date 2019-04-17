#version 300 es
precision highp float;


in vec2 fs_Pos;

layout (location = 0) out vec4 initial;

#define OCTAVES 6

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}


float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}


float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}


void main() {
  vec2 uv = 0.5f*fs_Pos+vec2(0.5f);
  float terrain_hight = 25.f*fbm(2.5f*uv+vec2(10.f,1.f));
  float rainfall = 2.f;
  //if(uv.x>0.6||uv.x<0.5||uv.y>0.6||uv.y<0.5) rainfall = 0.f;
  initial = vec4(terrain_hight,rainfall,0.f,1.f);
}
