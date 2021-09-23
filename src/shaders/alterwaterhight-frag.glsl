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
uniform float u_VelMult;
uniform float u_Time;

layout (location = 0) out vec4 writeTerrain;
layout (location = 1) out vec4 writeVel;



in vec2 fs_Pos;
#define PI 3.1415926


float random (in vec2 st) {
  return fract(sin(dot(st.xy,
  vec2(12.9898,78.233)))*
  43758.5453123);
}

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



  //float volFactor =  max(1.0 - exp((length(curvel.xy) - 10.0) * 0.3),0.0);

  float velFactor = pow((length(curvel.xy) * 0.2 + 1.0), -2.0);// emperical function for self aware velocity calculation

  //float velFactor = pow((cur.y * 2.9 + 1.0), -2.0);


  vec2 randTime = vec2(1.f*sin(u_Time / 3.0) + 2.1,1.0 * cos(u_Time/17.0)+3.6) + curuv * 10.0;
  float rnd = random(randTime);

  float d1 = max(cur.y + curs.x * 0.04,0.0);
  float d11 = cur.y;
  //float d1 = cur.y;
  float d2 = max(d1 + deltavol,0.0);
  float da = (d1 + d2)/2.0f;

  vec2 veloci = vec2(leftflux.y-outputflux.w+outputflux.y-rightflux.w,bottomflux.x-outputflux.z+outputflux.x-topflux.z)/2.0;

  if(cur.y == 0.0 && deltavol == 0.0) veloci = vec2(0.0,0.0);

  vec2 vv = veloci;

  //veloci *= 100000.0;
    if(da <= 0.0005) {
      veloci = vec2(0.0);
    }else{
      veloci = veloci/(da * u_PipeLen);
    }


//  if(da <= 1e-5) {
//    veloci = vec2(0.0);
//  }else{
//    veloci = veloci/(da * u_PipeLen);
//  }

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

//  if(length(veloci) < 0.50 && length(veloci) != 0.0){
//    veloci *= (0.50 / length(veloci));
//  }
  writeVel = vec4(veloci * u_VelMult ,0.f,1.f);
  writeTerrain = vec4(cur.x,max(cur.y+deltavol, 0.0),( deltavol) * 11.0,cur.w);

}