#version 300 es
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_Ks;
uniform float u_Kc;
uniform float u_Kd;


layout (location = 0) out vec4 writesedi;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


float timestep = 0.00005;


void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      float texwidth = u_SimRes;
      float div = 1.f/texwidth;
      float g = 0.4;
      float pipelen = u_PipeLen;
      float Kc = u_Kc;
      float Ks = u_Ks;
      float Kd = u_Kd;

      vec2 curvel = (texture(vel,curuv).xy)*.01f/u_SimRes;
      float cursedi = texture(sedi,curuv).x;

      vec2 oldloc = vec2(curuv.x-curvel.x*timestep,curuv.y-curvel.y*timestep);
      float oldsedi = texture(sedi,oldloc).x;

      writesedi = vec4(oldsedi,0.f,0.f,1.f);
}