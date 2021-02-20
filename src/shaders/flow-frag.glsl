#version 300 es
precision highp float;

uniform sampler2D readTerrain;//water and hight map R: hight map, G: water map, B: , A:
uniform sampler2D readFlux;
uniform sampler2D readSedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;

layout (location = 0) out vec4 writeFlux;

in vec2 fs_Pos;



//
//      x
//  w   c   y
//      z
//


void main() {

  vec2 curuv = 0.5f*fs_Pos+0.5f;
  float div = 1.f/u_SimRes;
  float g = 3.80;
  float pipelen = u_PipeLen;


  vec4 top = texture(readTerrain,curuv+vec2(0.f,div));
  vec4 right = texture(readTerrain,curuv+vec2(div,0.f));
  vec4 bottom = texture(readTerrain,curuv+vec2(0.f,-div));
  vec4 left = texture(readTerrain,curuv+vec2(-div,0.f));

  vec4 tops = texture(readSedi,curuv+vec2(0.f,div));
  vec4 rights = texture(readSedi,curuv+vec2(div,0.f));
  vec4 bottoms = texture(readSedi,curuv+vec2(0.f,-div));
  vec4 lefts = texture(readSedi,curuv+vec2(-div,0.f));


  vec4 curTerrain = texture(readTerrain,curuv);
  vec4 curFlux = texture(readFlux,curuv);
  vec4 curs = texture(readSedi,curuv);



  float Htopout = (curTerrain.y+curTerrain.x + curs.x)-(top.y+top.x + tops.x);
  float Hrightout = (curTerrain.y+curTerrain.x+curs.x)-(right.y+right.x+rights.x);
  float Hbottomout = (curTerrain.y+curTerrain.x+curs.x)-(bottom.x+bottom.y+bottoms.x);
  float Hleftout = (curTerrain.y+curTerrain.x+curs.x)-(left.y+left.x+lefts.x);

//  float Htopout = (curTerrain.y+curTerrain.x )-(top.y+top.x );
//  float Hrightout = (curTerrain.y+curTerrain.x)-(right.y+right.x);
//  float Hbottomout = (curTerrain.y+curTerrain.x)-(bottom.x+bottom.y);
//  float Hleftout = (curTerrain.y+curTerrain.x)-(left.y+left.x);
//
//  Htopout = max(0.0, Htopout);
//  Hbottomout = max(0.0, Hbottomout);
//  Hrightout = max(0.0, Hrightout);
//  Hleftout = max(0.0, Hleftout);

  //out flow readFlux
  float ftopout = max(0.f,curFlux.x+(u_timestep*g*u_PipeArea*Htopout)/pipelen);
  float frightout = max(0.f,curFlux.y+(u_timestep*g*u_PipeArea*Hrightout)/pipelen);
  float fbottomout = max(0.f,curFlux.z+(u_timestep*g*u_PipeArea*Hbottomout)/pipelen);
  float fleftout = max(0.f,curFlux.w+(u_timestep*g*u_PipeArea*Hleftout)/pipelen);


  float k = min(1.f,((curTerrain.y )*u_PipeLen*u_PipeLen)/(u_timestep*(ftopout+frightout+fbottomout+fleftout)));
  //k = 1.0;
  //rescale outflow readFlux so that outflow don't exceed current water volume
  ftopout *= k;
  frightout *= k;
  fbottomout *= k;
  fleftout *= k;

  //boundary conditions
  if(curuv.x<=div) fleftout = 0.f;
  if(curuv.x>=1.f - 2.0 * div) frightout = 0.f;
  if(curuv.y<=div) ftopout = 0.f;
  if(curuv.y>=1.f - 2.0 * div) fbottomout = 0.f;




  writeFlux = vec4(ftopout,frightout,fbottomout,fleftout);

}
