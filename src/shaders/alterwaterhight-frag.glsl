#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readFlux;//flux map R: top, G: right, B: bottom, A: left
uniform sampler2D readSedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;

layout (location = 0) out vec4 writeTerrain;
layout (location = 1) out vec4 writeVel;

// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


void main(){


  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float pipelen = u_PipeLen;
  float damping = 0.99999;

  vec4 topflux = texture(readFlux,curuv+vec2(0.f,div));
  vec4 rightflux = texture(readFlux,curuv+vec2(div,0.f));
  vec4 bottomflux = texture(readFlux,curuv+vec2(0.f,-div));
  vec4 leftflux = texture(readFlux,curuv+vec2(-div,0.f));

  vec4 curflux = texture(readFlux,curuv);
  vec4 cur = texture(readTerrain,curuv);
  vec4 curs = texture(readSedi,curuv);

   //out flow flux
  float ftopout = curflux.x;
  float frightout = curflux.y;
  float fbottomout = curflux.z;
  float fleftout = curflux.w;

  vec4 outputflux = curflux;
  vec4 inputflux = vec4(topflux.z,rightflux.w,bottomflux.x,leftflux.y);

  float fout = ftopout+frightout+fbottomout+fleftout;
  float fin = topflux.z+rightflux.w+bottomflux.x+leftflux.y;

  float deltavol = u_timestep*(fin-fout)/(u_PipeLen*u_PipeLen);




  float d1 = cur.y + curs.x;
  //float d1 = cur.y;
  float d2 = d1 + deltavol;
  float da = (d1 + d2)/2.0f;

  vec2 veloci = vec2(inputflux.w-outputflux.w+outputflux.y-inputflux.y,inputflux.z-outputflux.z+outputflux.x-inputflux.x)/2.0;



  //veloci *= 100000.0;
    if(da <= 1e-5) {
      //veloci = vec2(0.0);
    }else{
      veloci = veloci/(da * u_PipeLen);
    }

  if(curuv.x<=div) {deltavol = 0.f; veloci.x = 0.0;}
  if(curuv.x>=1.f - 2.0 *div) {deltavol = 0.f; veloci.x = 0.0;}
  if(curuv.y<=div) {deltavol = 0.f;veloci.y = 0.0;}
  if(curuv.y>=1.f - 2.0 * div) {deltavol = 0.f;veloci.y = 0.0;}


  veloci *= damping;

  writeVel = vec4(veloci,0.f,1.f);
  writeTerrain = vec4(cur.x,max(cur.y+deltavol, 0.0),cur.z,cur.w);

}