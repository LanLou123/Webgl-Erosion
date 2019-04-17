#version 300 es
precision highp float;

uniform sampler2D terrain;

layout (location = 0) out vec4 writeterrain;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;


float timestep = 0.00005;


void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      vec4 cur = texture(terrain,curuv);


      writeterrain = vec4(cur.x,cur.y+0.05f,cur.z,cur.w);
}