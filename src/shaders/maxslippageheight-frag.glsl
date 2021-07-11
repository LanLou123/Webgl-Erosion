#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:


uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;
uniform float unif_thermalErosionScale;

layout (location = 0) out vec4 writeMaxslippage;

in vec2 fs_Pos;



//
//      x
//  w   c   y
//      z
//


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float _maxHeightDiff = 4.50;

  vec4 terraintop = texture(readTerrain,curuv+vec2(0.f,div));
  vec4 terrainright = texture(readTerrain,curuv+vec2(div,0.f));
  vec4 terrainbottom = texture(readTerrain,curuv+vec2(0.f,-div));
  vec4 terrainleft = texture(readTerrain,curuv+vec2(-div,0.f));
  vec4 terraincur = texture(readTerrain,curuv);

  float maxLocalDiff = _maxHeightDiff * 0.01;
  float avgDiff = (terraintop.x + terrainright.x + terrainbottom.x + terrainleft.x) * 0.25 - terraincur.x;
  avgDiff = 10.0 * max(abs(avgDiff) - maxLocalDiff,0.0);

  writeMaxslippage = vec4(max(_maxHeightDiff - avgDiff,0.0),0.0,0.0,1.0);

}
