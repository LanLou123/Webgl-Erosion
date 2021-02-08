#version 300 es
precision highp float;

uniform sampler2D readTerrain;

// this render pass was used soley for smoothing sharp ridges & ravines which would potentially introduce corruption
// thanks to the references https://github.com/Huw-man/Interactive-Erosion-Simulator-on-GPU & https://github.com/karhu/terrain-erosion

layout (location = 0) out vec4 writeTerrain;

uniform float u_SimRes;
in vec2 fs_Pos;


void main() {

    float threathhold = 0.0005f;
    float div = 1.0/u_SimRes;
    vec2 curuv = 0.5f*fs_Pos+0.5f;
    vec4 cur = texture(readTerrain,curuv);

    vec4 top = texture(readTerrain,curuv+vec2(0.f,div));
    vec4 topright = texture(readTerrain,curuv+vec2(div,div));
    vec4 right = texture(readTerrain,curuv+vec2(div,0.f));
    vec4 bottomright = texture(readTerrain,curuv+vec2(div,-div));
    vec4 bottom = texture(readTerrain,curuv+vec2(0.f,-div));
    vec4 bottomleft = texture(readTerrain,curuv+vec2(-div,-div));
    vec4 left = texture(readTerrain,curuv+vec2(-div,0.f));
    vec4 topleft = texture(readTerrain,curuv+vec2(-div,div));

    float t_d = cur.x - top.x;
    float r_d = cur.x - right.x;
    float b_d = cur.x - bottom.x;
    float l_d = cur.x - left.x;
    float tr_d = cur.x - topright.x;
    float br_d = cur.x - bottomright.x;
    float bl_d = cur.x - bottomleft.x;
    float tl_d = cur.x - topleft.x;

    float cur_h = cur.x;
    if(((abs(r_d) > threathhold || abs(l_d) > threathhold)&& r_d*l_d > 0.0)||
    ((abs(t_d) > threathhold || abs(b_d) > threathhold) && t_d * b_d > 0.0)||
    ((abs(tr_d) > threathhold || abs(bl_d) > threathhold) && tr_d * bl_d > 0.0)||
    ((abs(tl_d) > threathhold || abs(br_d) > threathhold) && tl_d * br_d > 0.0)){
        cur_h = (cur.x + top.x + right.x + bottom.x + left.x + topright.x + topleft.x + bottomleft.x + bottomright.x)/9.0;
    }

    writeTerrain = vec4(cur_h,cur.y,cur.z,cur.w);
}