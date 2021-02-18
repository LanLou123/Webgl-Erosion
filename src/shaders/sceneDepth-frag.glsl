#version 300 es
precision highp float;

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane





out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

uniform float u_SimRes;





void main()
{


    out_Col = vec4(vec3(gl_FragCoord.z),1.f);
}
