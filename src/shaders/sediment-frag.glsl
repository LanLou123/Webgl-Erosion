#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readVelocity;
uniform sampler2D readSediment;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_Ks;
uniform float u_Kc;
uniform float u_Kd;
uniform float u_timestep;

layout (location = 0) out vec4 writeTerrain;
layout (location = 1) out vec4 writeSediment;
layout (location = 2) out vec4 writeTerrainNormal;



in vec2 fs_Pos;


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float Kc = u_Kc;
  float Ks = u_Ks;
  float Kd = u_Kd;


  vec4 top = texture(readTerrain,curuv+vec2(0.f,div));
  vec4 right = texture(readTerrain,curuv+vec2(div,0.f));
  vec4 bottom = texture(readTerrain,curuv+vec2(0.f,-div));
  vec4 left = texture(readTerrain,curuv+vec2(-div,0.f));

  vec4 curTerrain = texture(readTerrain,curuv);
  vec4 curSediment = texture(readSediment,curuv);


  //    t
  //
  // l  c--r
  //    | /
  //    b
  float nordis = div*1.f;
  vec4 nort = texture(readTerrain,curuv+vec2(0.f,nordis));
  vec4 norr = texture(readTerrain,curuv+vec2(nordis,0.f));
  vec4 norb = texture(readTerrain,curuv+vec2(0.f,-nordis));
  vec4 norl = texture(readTerrain,curuv+vec2(-nordis,0.f));

  vec3 dx = vec3(nordis*1.f,(norr.x-curTerrain.x),0.f);
  vec3 dy = vec3(nordis*1.f,(norr.x-norb.x),nordis*1.f);

  vec3 nor = normalize(cross(dx,dy));
  float slopeSin = dot(vec3(0.0, 1.0, 0.0), nor);


  float velo = length(texture(readVelocity,curuv).xy);
  float slope = max(0.01f, abs(slopeSin)) ;//max(0.05f,sqrt(1.f- nor.y * nor.y));
  float sedicap = Kc*slope*velo;

  float cursedi = curSediment.x;
  float hight = curTerrain.x;
  float outsedi = curSediment.x;


  if(sedicap>cursedi){
    hight = hight - (sedicap-cursedi)*Ks;
    outsedi = outsedi + (sedicap-cursedi)*Ks;
  }else {
    hight = hight + (cursedi-sedicap)*Kd;
    outsedi = outsedi - (cursedi-sedicap)*Kd;
  }


  writeTerrainNormal = vec4(nor,1.f);
  writeSediment = vec4(outsedi,0.0f,0.0f,1.0f);
  writeTerrain = vec4(hight,curTerrain.y,curTerrain.z,curTerrain.w);

}