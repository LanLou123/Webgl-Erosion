#version 300 es
precision highp float;

uniform sampler2D read;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readflux;//flux map R: top, G: right, B: bottom, A: left

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;

layout (location = 0) out vec4 write;
layout (location = 1) out vec4 writevel;

// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;




void main(){

  float timestep = u_timestep;
  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float texwidth = u_SimRes;
  float div = 1.f/texwidth;
  float g = 1.4;
  float pipelen = u_PipeLen;

  vec4 topflux = texture(readflux,curuv+vec2(0.f,div));
  vec4 rightflux = texture(readflux,curuv+vec2(div,0.f));
  vec4 bottomflux = texture(readflux,curuv+vec2(0.f,-div));
  vec4 leftflux = texture(readflux,curuv+vec2(-div,0.f));

  vec4 curflux = texture(readflux,curuv);
  vec4 cur = texture(read,curuv);

   //out flow flux
  float ftopout = curflux.x;
  float frightout = curflux.y;
  float fbottomout = curflux.z;
  float fleftout = curflux.w;

  vec4 outputflux = curflux;
  vec4 inputflux = vec4(topflux.z,rightflux.w,bottomflux.x,leftflux.y);

  vec2 veloci = vec2(inputflux.w-outputflux.w+outputflux.y-inputflux.y,inputflux.z-outputflux.z+outputflux.x-inputflux.x);
  veloci*=pipelen/(2.f*div*div*timestep);

  float fout = ftopout+frightout+fbottomout+fleftout;
  float fin = topflux.z+rightflux.w+bottomflux.x+leftflux.y;

  float deltavol = timestep*(fin-fout)/(div*div);

  //velocity field calculation
  float velx = (leftflux.y-curflux.w+curflux.y-rightflux.w)*pipelen/(2.f*div*div*timestep);//flux map x: top, y: right, z: bottom, w: left
  float vely = (topflux.z-curflux.x+curflux.z-bottomflux.x)*pipelen/(2.f*div*div*timestep);

  writevel = vec4(veloci,0.f,1.f);
  write = vec4(cur.x,cur.y+deltavol,cur.z,cur.w);

}