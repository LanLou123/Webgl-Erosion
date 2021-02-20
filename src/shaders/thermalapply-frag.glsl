#version 300 es
precision highp float;

uniform sampler2D readTerrainFlux;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readTerrain;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;
uniform float unif_thermalErosionScale;

layout (location = 0) out vec4 writeTerrain;

in vec2 fs_Pos;



//
//      x
//  w   c   y
//      z
//


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float thermalErosionScale = unif_thermalErosionScale;

  vec4 topflux = texture(readTerrainFlux,curuv+vec2(0.f,div));
  vec4 rightflux = texture(readTerrainFlux,curuv+vec2(div,0.f));
  vec4 bottomflux = texture(readTerrainFlux,curuv+vec2(0.f,-div));
  vec4 leftflux = texture(readTerrainFlux,curuv+vec2(-div,0.f));

  vec4 inputflux = vec4(topflux.z,rightflux.w,bottomflux.x,leftflux.y);
  vec4 outputflux = texture(readTerrainFlux,curuv);

  float vol = inputflux.x + inputflux.y + inputflux.z + inputflux.w - outputflux.x - outputflux.y - outputflux.z - outputflux.w;

  float tdelta = min(10.0, u_timestep * thermalErosionScale) * vol;

  vec4 curTerrain = texture(readTerrain, curuv);

  writeTerrain = vec4(curTerrain.x + tdelta,curTerrain.y,curTerrain.z,curTerrain.w);

}
