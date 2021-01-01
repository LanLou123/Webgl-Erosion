#version 300 es
precision highp float;

uniform sampler2D readTerrain;

// this render pass was used soley for smoothing sharp ridges & ravines which would potentially introduce corruption
// thanks to the references https://github.com/Huw-man/Interactive-Erosion-Simulator-on-GPU & https://github.com/karhu/terrain-erosion

layout (location = 0) out vec4 writeTerrain;

uniform float u_SimRes;
in vec2 fs_Pos;


void main() {

    float threathhold = 0.0001f;
    float div = 1.0/u_SimRes;
    vec2 curuv = 0.5f*fs_Pos+0.5f;
    vec4 cur = texture(readTerrain,curuv);

    vec4 top = texture(readTerrain,curuv+vec2(0.f,div));
    vec4 right = texture(readTerrain,curuv+vec2(div,0.f));
    vec4 bottom = texture(readTerrain,curuv+vec2(0.f,-div));
    vec4 left = texture(readTerrain,curuv+vec2(-div,0.f));

    float t_d = cur.x - top.x;
    float r_d = cur.x - right.x;
    float b_d = cur.x - bottom.x;
    float l_d = cur.x - left.x;

    float cur_h = cur.x;
    if(((abs(r_d) > threathhold || abs(l_d) > threathhold)&& r_d*l_d > 0.0)||
    ((abs(t_d) > threathhold || abs(b_d) > threathhold) && t_d * b_d > 0.0)){
        cur_h = (cur.x + top.x + right.x + bottom.x + left.x)/5.0;
    }

    writeTerrain = vec4(cur_h,cur.y,cur.z,cur.w);
}