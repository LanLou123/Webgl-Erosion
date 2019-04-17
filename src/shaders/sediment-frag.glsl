#version 300 es
precision highp float;

uniform sampler2D read;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D vel;
uniform sampler2D sedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_Ks;
uniform float u_Kc;
uniform float u_Kd;

layout (location = 0) out vec4 writeterrain;
layout (location = 1) out vec4 writesedi;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


float timestep = 0.00005;


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float texwidth = u_SimRes;
  float div = 1.f/texwidth;
  float g = 0.1;
  float pipelen = u_PipeLen;
  float Kc = u_Kc;
  float Ks = u_Ks;
  float Kd = u_Kd;


  vec4 top = texture(read,curuv+vec2(0.f,div));
  vec4 right = texture(read,curuv+vec2(div,0.f));
  vec4 bottom = texture(read,curuv+vec2(0.f,-div));
  vec4 left = texture(read,curuv+vec2(-div,0.f));

  vec4 cur = texture(read,curuv);
  vec4 cursediment = texture(sedi,curuv);

  vec4 tpos = vec4(curuv.x,top.x,curuv.y+div,1.f);
  vec4 rightpos = vec4(curuv.x+div,right.x,curuv.y,1.f);
  vec4 curpos = vec4(curuv.x,cur.x,curuv.y,1.f);
  vec3 nor = cross((rightpos-curpos).xyz,(tpos-curpos).xyz);

  nor = normalize(nor);
  float velo = length(texture(vel,curuv).xy)/4.f;
  float slope =max(0.01f,sqrt(1.f-pow(abs(dot(vec3(0.f,1.f,0.f),nor)),2.f)));
  float sedicap = Kc*slope*velo;

  float cursedi = cursediment.x;
  float hight = cur.x;
  float outsedi = cursediment.x;

  if(sedicap>cursedi){
    hight = hight - (sedicap-cursedi)*Ks;
    outsedi = outsedi + (sedicap-cursedi)*Ks;
  }else{
    hight = hight + (cursedi-sedicap)*Kd;
    outsedi = outsedi - (cursedi-sedicap)*Kd;
  }

  writesedi = vec4(outsedi,0.f,0.f,1.f);
  writeterrain = vec4(hight,cur.y,cur.z,cur.w);

}