#version 300 es
precision highp float;

uniform sampler2D readTerrain;
uniform sampler2D readSedi;

// this render pass was used soley for smoothing sharp ridges & ravines which would potentially introduce corruption
// thanks to the references https://github.com/Huw-man/Interactive-Erosion-Simulator-on-GPU & https://github.com/karhu/terrain-erosion

layout (location = 0) out vec4 writeTerrain;
layout (location = 1) out vec4 writeAvg;

uniform float u_SimRes;
in vec2 fs_Pos;

vec3 calnor(vec2 uv){
    float eps = 1.f/u_SimRes;
    vec4 cur = texture(readTerrain,uv);
    vec4 r = texture(readTerrain,uv+vec2(eps,0.f));
    vec4 t = texture(readTerrain,uv+vec2(0.f,eps));
    vec4 b = texture(readTerrain,uv+vec2(0.f,-eps));
    vec4 l = texture(readTerrain,uv+vec2(-eps,0.f));

    vec3 nor = vec3(l.x - r.x, 2.0, t.x - b.x);
    nor = -normalize(nor);
    return nor;
}

void main() {

    float threathhold = 0.1f;
    float div = 1.0/u_SimRes;
    vec2 curuv = 0.5f*fs_Pos+0.5f;
    vec4 cur = texture(readTerrain,curuv);
    //float curs = texture(readSedi,curuv).x;
    //threathhold = clamp(curs * 2.0, 0.1, 2.0);
    vec3 nor = calnor(curuv);
    //float dval = abs(dot(nor, vec3(0.0, 1.0, 0.0)));
    //threathhold *= dval;

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
    float col = 0.0;
    float curWeight = 8.0;
    float diagonalWeight = 0.707;

    //eight dir average
    if(((abs(r_d) > threathhold && abs(l_d) > threathhold)&& r_d*l_d > 0.0)||
    ((abs(t_d) > threathhold && abs(b_d) > threathhold) && t_d * b_d > 0.0)||
    ((abs(tr_d) > threathhold && abs(bl_d) > threathhold) && tr_d * bl_d > 0.0)||
    ((abs(tl_d) > threathhold && abs(br_d) > threathhold) && tl_d * br_d > 0.0)){
        cur_h = (cur.x * curWeight + top.x + right.x + bottom.x + left.x + topright.x * diagonalWeight + topleft.x * diagonalWeight + bottomleft.x * diagonalWeight + bottomright.x * diagonalWeight)/(4.0 * (1.0 + diagonalWeight) + curWeight);
        col = 1.0;
    }

//    //four diagnal dirs
//    if(((abs(tr_d) > threathhold && abs(bl_d) > threathhold) && tr_d * bl_d > 0.0)||
//    ((abs(tl_d) > threathhold && abs(br_d) > threathhold) && tl_d * br_d > 0.0)){
//        cur_h = (cur.x * curWeight + topright.x * diagonalWeight + topleft.x * diagonalWeight + bottomleft.x * diagonalWeight + bottomright.x * diagonalWeight)/(4.0 * ( diagonalWeight) + curWeight);
//        col = 1.0;
//    }
    //four dir average
//    if(((pow(abs(r_d),1.0) > threathhold || pow(abs(l_d),1.0) > threathhold)&& r_d*l_d > 0.0)||
//    ((pow(abs(t_d),1.0) > threathhold || pow(abs(b_d),1.0) > threathhold) && t_d * b_d > 0.0)){
//        cur_h = (cur.x * curWeight + top.x + right.x + bottom.x + left.x )/(4.0+curWeight);
//        col = 1.0;
//    }else{
//        col = 0.0;
//    }

    //four dir average
//    if(((pow(abs(r_d),1.0) > threathhold && pow(abs(l_d),1.0) > threathhold)&& r_d*l_d > 0.0)||
//    ((pow(abs(t_d),1.0) > threathhold && pow(abs(b_d),1.0) > threathhold) && t_d * b_d > 0.0)){
//        cur_h = (cur.x * curWeight + top.x + right.x + bottom.x + left.x )/(4.0+curWeight);
//        col = 1.0;
//    }

//    if((abs(r_d) > threathhold) && (abs(l_d) > threathhold) && (abs(b_d) > threathhold) && (abs(t_d) > threathhold) && ((l_d > 0.0 && b_d > 0.0&& t_d > 0.0 && r_d > 0.0) || (l_d < 0.0 && b_d < 0.0&& t_d < 0.0 && r_d < 0.0))){
//                cur_h = (cur.x * curWeight + top.x + right.x + bottom.x + left.x )/(4.0+curWeight);
//                col = 1.0;
//    }

    writeTerrain = vec4(cur_h,cur.y,cur.z,cur.w);
    writeAvg = vec4(vec3(col), 1.0);
}