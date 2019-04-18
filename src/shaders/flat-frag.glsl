#version 300 es
precision highp float;

uniform sampler2D hightmap;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;
out vec4 out_Col;

void main() {
vec2 uv = 0.5*fs_Pos+0.5;

  vec4 col = (texture(hightmap,0.5f*fs_Pos+.5f));
  vec4 fcol =  vec4(vec3(col.x*10.f),1.f);
  out_Col = fcol;
}
