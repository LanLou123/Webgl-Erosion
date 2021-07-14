#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readFlux;//flux map R: top, G: right, B: bottom, A: left
uniform sampler2D readSedi;
uniform sampler2D readVel;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;

layout (location = 0) out vec4 writeTerrain;
layout (location = 1) out vec4 writeVel;



in vec2 fs_Pos;
#define PI 3.1415926

void main(){


  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float pipelen = u_PipeLen;
  float sediImpact = 1.0;

  //
  //      x
  //  w   c   y
  //      z
  //


  vec4 topflux = texture(readFlux,curuv+vec2(0.f,div));
  vec4 rightflux = texture(readFlux,curuv+vec2(div,0.f));
  vec4 bottomflux = texture(readFlux,curuv+vec2(0.f,-div));
  vec4 leftflux = texture(readFlux,curuv+vec2(-div,0.f));

  vec4 curflux = texture(readFlux,curuv);
  vec4 cur = texture(readTerrain,curuv);
  vec4 curs = texture(readSedi,curuv);
  vec4 curvel = texture(readVel, curuv);

   //out flow flux
  float ftopout = curflux.x;
  float frightout = curflux.y;
  float fbottomout = curflux.z;
  float fleftout = curflux.w;

  vec4 outputflux = curflux;
  vec4 inputflux = vec4(topflux.z,rightflux.w,bottomflux.x,leftflux.y);

  float fout = ftopout+frightout+fbottomout+fleftout;
  float fin = topflux.z+rightflux.w+bottomflux.x+leftflux.y;
  //fin = inputflux.x + inputflux.y + inputflux.z + inputflux.w;

  float deltavol = u_timestep*(fin-fout)/(u_PipeLen*u_PipeLen);




  //float d1 = cur.y + curs.x;
  float d1 = cur.y;
  float d2 = max(d1 + deltavol,0.0);
  float da = (d1 + d2)/2.0f;

  vec2 veloci = vec2(leftflux.y-outputflux.w+outputflux.y-rightflux.w,bottomflux.x-outputflux.z+outputflux.x-topflux.z)/2.0;

  vec2 vv = veloci;

  //veloci *= 100000.0;
    if(da <= 0.05) {
      veloci = veloci/(0.05 * u_PipeLen);//vec2(0.0);
    }else{
      veloci = veloci/(da * u_PipeLen);
    }

  float velImportance = 2.0;
  //veloci = (curvel.xy + veloci * velImportance) / (1.0 + velImportance);
  //veloci += curvel.xy * 0.5;


//  if(curuv.x<=div) {deltavol = 0.f; veloci = vec2(0.0);}
//  if(curuv.x>=1.f - 2.0 *div) {deltavol = 0.f; veloci = vec2(0.0);}
//  if(curuv.y<=div) {deltavol = 0.f;veloci = vec2(0.0);}
//  if(curuv.y>=1.f - 2.0 * div) {deltavol = 0.f;veloci = vec2(0.0);}

//  float absx = abs(veloci.x);
//  float absy = abs(veloci.y);
//  float maxxy = max(absx, absy);
//  float minxy = min(absx, absy);
//  float tantheta = minxy / maxxy;
//  float scale = cos(45.0 * PI / 180.0 - atan(tantheta));
//  float divtheta = (1.0/sqrt(2.0)) / scale;
//  float divs = min(abs(veloci.x), abs(veloci.y))/max(abs(veloci.x), abs(veloci.y));
//  if((divs) > 20.0){
//    veloci /= 20.0;
//  }


  writeVel = vec4(veloci,0.f,1.f);
  writeTerrain = vec4(cur.x,max(cur.y+deltavol, 0.0),( deltavol) * 11.0,cur.w);

}