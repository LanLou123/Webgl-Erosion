#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readMaxSlippage;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;

uniform float unif_talusAngleFallOffCoeff;
uniform float unif_talusAngleTangentBias;
uniform float unif_thermalRate;


layout (location = 0) out vec4 writeFlux;

in vec2 fs_Pos;



//
//      x
//  w   c   y
//      z
//


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.0 / u_SimRes;
  float thermalRate = unif_thermalRate;
  float hardness = 1.0;
  float talusAngleFallOffCoeff = unif_talusAngleFallOffCoeff;
  float talusAngleTangentBias = unif_talusAngleTangentBias;
  float _maxHeightDiff = 3.0;

  vec4 terraintop = texture(readTerrain,curuv+vec2(0.f,div));
  vec4 terrainright = texture(readTerrain,curuv+vec2(div,0.f));
  vec4 terrainbottom = texture(readTerrain,curuv+vec2(0.f,-div));
  vec4 terrainleft = texture(readTerrain,curuv+vec2(-div,0.f));
  vec4 terraincur = texture(readTerrain,curuv);

  float slippagetop = texture(readMaxSlippage,curuv+vec2(0.f,div)).x;
  float slippageright = texture(readMaxSlippage,curuv+vec2(div,0.f)).x;
  float slippagebottom = texture(readMaxSlippage,curuv+vec2(0.f,-div)).x;
  float slippageleft = texture(readMaxSlippage,curuv+vec2(-div,0.f)).x;
  float slippagecur = texture(readMaxSlippage,curuv).x;

  vec4 diff;
  diff.x = terraincur.x - terraintop.x - (slippagecur + slippagetop) * 0.5;
  diff.y = terraincur.x - terrainright.x - (slippagecur + slippageright) * 0.5;
  diff.z = terraincur.x - terrainbottom.x - (slippagecur + slippagebottom) * 0.5;
  diff.w = terraincur.x - terrainleft.x - (slippagecur + slippageleft) * 0.5;

  diff = max(vec4(0.0), diff);

  vec4 newFlow = diff * 0.2;

  float outfactor = (newFlow.x + newFlow.y + newFlow.z + newFlow.w)*u_timestep;

  if(outfactor>1e-5){
    outfactor = terraincur.x / outfactor;
    if(outfactor > 1.0) outfactor = 1.0;
    newFlow = newFlow * outfactor;
  }



//  vec4 hightDiff = vec4(0.0);
//  hightDiff.x = terraincur.x - terraintop.x;
//  hightDiff.y = terraincur.x - terrainright.x;
//  hightDiff.z = terraincur.x - terrainbottom.x;
//  hightDiff.w = terraincur.x - terrainleft.x;
//  hightDiff = max(vec4(0.0),hightDiff);
//
//  float maxHightDiff = max(max(hightDiff.x, hightDiff.y),max(hightDiff.z,hightDiff.w));
//
//  float volume2Move = u_PipeArea * maxHightDiff * 0.5 * thermalRate * hardness;
//  vec4 tanAngle = hightDiff / u_PipeLen;
//
//  float threshold = hardness * talusAngleFallOffCoeff + talusAngleTangentBias;
//
//  vec4 k = vec4(0.0);
//
//  if(tanAngle.x > threshold){
//    k.x = hightDiff.x;
//  }  if(tanAngle.y > threshold){
//    k.y = hightDiff.y;
//  }  if(tanAngle.z > threshold){
//    k.z = hightDiff.z;
//  }  if(tanAngle.w > threshold){
//    k.w = hightDiff.w;
//  }
//  float sumflux = k.x + k.y + k.z + k.w;
//  vec4 outputflux = vec4(0.0);
//  if(sumflux > 0.0){
//    outputflux = volume2Move * k / sumflux;
//  }
//  if(curuv.x<=0.f) outputflux.x = 0.f;
//  if(curuv.x>=1.f) outputflux.y = 0.f;
//  if(curuv.y<=0.f) outputflux.z = 0.f;
//  if(curuv.y>=1.f) outputflux.w = 0.f;



  vec4 outputflux = newFlow;
  writeFlux = outputflux;

}
