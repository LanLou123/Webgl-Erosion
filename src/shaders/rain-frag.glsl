#version 300 es
precision highp float;

uniform sampler2D terrain;

layout (location = 0) out vec4 writeterrain;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


float timestep = 0.0001;


void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      vec4 cur = texture(terrain,curuv);

      float pi = 0.0001f;
      float md = mod((curuv.x*800.f),3.f);
      //if(curuv.x<0.4||curuv.x>0.6||curuv.y<0.4||curuv.y>0.6) pi = 0.f;

      writeterrain = vec4(cur.x,cur.y+pi,cur.z,cur.w);
}