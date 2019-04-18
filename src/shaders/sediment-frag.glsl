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
uniform float u_timestep;

layout (location = 0) out vec4 writeterrain;
layout (location = 1) out vec4 writesedi;
layout (location = 2) out vec4 terrainnormal;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;





void main() {
float timestep = u_timestep;
  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float texwidth = u_SimRes;
  float div = 1.f/texwidth;
  float g = 1.4;
  float pipelen = u_PipeLen;
  float Kc = u_Kc;
  float Ks = u_Ks;
  float Kd = u_Kd;
  float maxerosion = .3f;


  vec4 top = texture(read,curuv+vec2(0.f,div));
  vec4 right = texture(read,curuv+vec2(div,0.f));
  vec4 bottom = texture(read,curuv+vec2(0.f,-div));
  vec4 left = texture(read,curuv+vec2(-div,0.f));

  vec4 cur = texture(read,curuv);
  vec4 cursediment = texture(sedi,curuv);


  vec3 dx = vec3(div*1.f,right.x-left.x,0.f);
  vec3 dy = vec3(0.f,top.x-bottom.x,div*1.f);



  vec3 nor = cross(dx,dy);

  float lmax = clamp((1.f-max(0.f,maxerosion - cur.y/maxerosion)),0.f,1.f);

  nor = normalize(nor);
  float velo = length(texture(vel,curuv).xy)/1.f;
  float slope = max(0.0f,1.f-abs(nor.y));
  float sedicap = Kc*slope*velo;

  float cursedi = cursediment.x;
  float hight = cur.x;
  float outsedi = cursediment.x;

  if(sedicap>cursedi){
    hight = hight - (sedicap-cursedi)*Ks;
    outsedi = outsedi + (sedicap-cursedi)*Ks;
  }else if(sedicap<cursedi){
    hight = hight + (cursedi-sedicap)*Kd;
    outsedi = outsedi - (cursedi-sedicap)*Kd;
  }


  terrainnormal = vec4(nor,1.f);
  writesedi = vec4(outsedi,0.f,0.f,1.f);
  writeterrain = vec4(hight,cur.y,cur.z,cur.w);

}