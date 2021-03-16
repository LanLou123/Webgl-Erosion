#version 300 es
precision highp float;

uniform sampler2D scatter_tex;
uniform sampler2D scene_depth;


uniform float evapod;
uniform vec2 u_Dimensions;
uniform int u_isHorizontal;
uniform float u_far;
uniform float u_near;

layout (location = 0) out vec4 result;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec2 fs_Pos;

#define GAUSS_BLUR_DEVIATION 1.5
#define FULL_RES_BLUR_KERNEL_SIZE 3
#define PI 3.1415926
#define BLUR_DEPTH_FACTOR 0.5

float GaussianWeight(float offset, float deviation)
{
      float weight = 1.0f / sqrt(2.0f * PI * deviation * deviation);
      weight *= exp(-(offset * offset) / (2.0f * deviation * deviation));
      return weight;
}

float linearDepth(float depthSample)
{
      depthSample = 2.0 * depthSample - 1.0;
      float zLinear = 2.0 * u_near * u_far / (u_far + u_near - depthSample * (u_far - u_near));
      return zLinear;
}

vec4 BilateralBlur(vec2 curuv, vec2 dir){
      const float deviation = float(FULL_RES_BLUR_KERNEL_SIZE) / float(GAUSS_BLUR_DEVIATION);
      vec4 centerColor = texture(scatter_tex,curuv);
      float centerDepth = linearDepth(texture(scene_depth,curuv).x);
      vec4 color = centerColor;
      float weightSum = 0.0;
      float weight = GaussianWeight(0.0, deviation);
      float al = centerColor.w;
      color *= weight;
      weightSum += weight;
      for(int i = -FULL_RES_BLUR_KERNEL_SIZE; i< 0; i+= 1){
            vec2 offset = dir * float(i);
            vec4 sampleColor = texture(scatter_tex,curuv + offset / u_Dimensions);

            float sampleDepth = linearDepth(texture(scene_depth,curuv + offset / u_Dimensions).x);
            float deptDiff = abs(centerDepth - sampleDepth);
            float dpFactor = deptDiff * BLUR_DEPTH_FACTOR;
            float w = exp(-(dpFactor * dpFactor));

            weight = GaussianWeight(float(i), deviation) * w;
            color += weight * sampleColor;
            al += weight * sampleColor.w;
            weightSum += weight;
      }
      for(int i = 1; i< FULL_RES_BLUR_KERNEL_SIZE; i+= 1){
            vec2 offset = dir * float(i);
            vec4 sampleColor = texture(scatter_tex,curuv + offset / u_Dimensions);

            float sampleDepth = linearDepth(texture(scene_depth,curuv + offset / u_Dimensions).x);
            float deptDiff = abs(centerDepth - sampleDepth);
            float dpFactor = deptDiff * BLUR_DEPTH_FACTOR;
            float w = exp(-(dpFactor * dpFactor));


            weight = GaussianWeight(float(i), deviation) * w;
            color += weight * sampleColor;
            al += weight * sampleColor.w;
            weightSum += weight;
      }
      color /= weightSum;
      al /= weightSum;

      color.w = 1.0;
      return color;

}

void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;

      vec4 scatter = texture(scatter_tex,curuv);

      vec4 final_colour = vec4(0.0);

      if(u_isHorizontal==0){
            final_colour = BilateralBlur(curuv, vec2(1.0,0.0));
      }else{
            final_colour = BilateralBlur(curuv, vec2(0.0,1.0));
      }

      result = final_colour;
}