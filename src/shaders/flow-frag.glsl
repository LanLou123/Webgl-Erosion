#version 300 es
precision highp float;

uniform sampler2D read;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D flux;

uniform float u_SimRes;
uniform float u_PipeLen;

layout (location = 0) out vec4 writeflux;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


float timestep = 0.0001;
float A = 20.f;

void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float texwidth = u_SimRes;
  float div = 1.f/texwidth;
  float g = 0.5;
  float pipelen = u_PipeLen;


  vec4 top = texture(read,curuv+vec2(0.f,div));
  vec4 right = texture(read,curuv+vec2(div,0.f));
  vec4 bottom = texture(read,curuv+vec2(0.f,-div));
  vec4 left = texture(read,curuv+vec2(-div,0.f));

  vec4 cur = texture(read,curuv);
  vec4 curflux = texture(flux,curuv);

  float Htopout = (cur.y+cur.x)-(top.y+top.x);
  float Hrightout = (cur.y+cur.x)-(right.y+right.x);
  float Hbottomout = (cur.y+cur.x)-(bottom.x+bottom.y);
  float Hleftout = (cur.y+cur.x)-(left.y+left.x);

  //out flow flux
  float ftopout = max(0.f,curflux.x+(timestep*g*div*div*Htopout)/pipelen);
  float frightout = max(0.f,curflux.y+(timestep*g*div*div*Hrightout)/pipelen);
  float fbottomout = max(0.f,curflux.z+(timestep*g*div*div*Hbottomout)/pipelen);
  float fleftout = max(0.f,curflux.w+(timestep*g*div*div*Hleftout)/pipelen);


  float k = min(1.f,(cur.y*div*div)/(timestep*(ftopout+frightout+fbottomout+fleftout)));

  //rescale outflow flux so that outflow don't exceed current water volume
  ftopout *= k;
  frightout *= k;
  fbottomout *= k;
  fleftout *= k;

  //boundary conditions
  if(curuv.x==0.f) fleftout = 0.f;
  if(curuv.x==1.f) frightout = 0.f;
  if(curuv.y==0.f) ftopout = 0.f;
  if(curuv.y==1.f) fbottomout = 0.f;


  writeflux = vec4(ftopout,frightout,fbottomout,fleftout);

}
