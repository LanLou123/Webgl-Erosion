#version 300 es
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_Ks;
uniform float u_Kc;
uniform float u_Kd;
uniform float u_timestep;


layout (location = 0) out vec4 writesedi;


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
float timestep = u_timestep;
      vec2 curuv = 0.5f*fs_Pos+0.5f;
      float texwidth = u_SimRes;
      float div = 1.f/texwidth;
      float g = 1.4;
      float pipelen = u_PipeLen;
      float Kc = u_Kc;
      float Ks = u_Ks;
      float Kd = u_Kd;

      vec2 curvel = (texture(vel,curuv).xy)*.01f/u_SimRes;
      float cursedi = texture(sedi,curuv).x;

      vec2 oldloc = vec2(curuv.x-curvel.x*timestep,curuv.y-curvel.y*timestep);
      float oldsedi = samplebilinear(oldloc);

      writesedi = vec4(oldsedi,0.f,0.f,1.f);
}