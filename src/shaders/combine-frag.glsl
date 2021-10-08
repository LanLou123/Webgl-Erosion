#version 300 es
precision highp float;

uniform sampler2D color_tex;
uniform sampler2D bi_tex;
uniform sampler2D sceneDepth_tex;

uniform float evapod;

layout (location = 0) out vec4 result;


in vec2 fs_Pos;


void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      vec4 geometry = texture(color_tex,curuv);
      vec4 scatter = texture(bi_tex,curuv);
      vec4 s_depth = texture(sceneDepth_tex, curuv);

      float scatter_alpha = clamp(scatter.w,0.0,1.0);

      vec4 color = vec4((1.0 - scatter.w) * geometry.xyz + (scatter.w)* scatter.xyz,1.0);



      float scatteralpha = clamp(scatter.x, 0.0, 1.0);

      if(s_depth.x == 0.0){
            color = vec4(geometry.xyz + scatter.xyz, 1.0);
      }else{
            color = vec4(geometry.xyz + scatter.xyz * 0.9, 1.0);
      }


      // simple tone mapping
      float gamma = 0.8;
      float exposure = 1.5;

      vec3 mapped = vec3(1.0) - exp(-color.xyz * exposure);

      mapped = pow(mapped, vec3(1.0 / gamma));


      result = vec4(mapped, 1.0);
}