#version 300 es
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;

uniform float u_SimRes;
uniform float u_timestep;


layout (location = 0) out vec4 writeSediment;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;

float samplebilinear(vec2 uv){
    vec2 cur_loc = u_SimRes*uv;
    vec2 uva = floor(cur_loc);
    vec2 uvb = ceil(cur_loc);

    vec2 id00 = uva;
    vec2 id10 = vec2(uvb.x,uva.y);
    vec2 id01 = vec2(uva.x,uvb.y);
    vec2 id11 = uvb;

    vec2 d = cur_loc - uva;

    float res =  (texture(sedi,id00/u_SimRes).x*(1.f-d.x)*(1.f-d.y)+
    texture(sedi,id10/u_SimRes).x*d.x*(1.f-d.y)+
    texture(sedi,id01/u_SimRes).x*(1.f-d.x)*d.y+
    texture(sedi,id11/u_SimRes).x*d.x*d.y);

    return res;
}

 


void main() {
 
      vec2 curuv = 0.5f*fs_Pos+0.5f;

      float div = 1.f/u_SimRes;

      vec2 curvel = texture(vel,curuv).xy*1.0;
      vec4 cursedi = texture(sedi,curuv);


      vec2 oldloc = vec2(curuv.x-curvel.x*u_timestep,curuv.y-curvel.y*u_timestep);
      float oldsedi = texture(sedi, oldloc).x;


      writeSediment = vec4(oldsedi, 0.0, 0.0, 1.0);
}