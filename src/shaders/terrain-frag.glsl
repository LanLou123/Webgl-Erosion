#version 300 es
precision highp float;

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;
uniform sampler2D hightmap;
uniform sampler2D normap;
in float fs_Sine;
in vec2 fs_Uv;
out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

void main()
{


    vec3 sundir = vec3(1.f,4.f,1.f);
    vec3 sundir2 = vec3(-1.f,4.f,-1.f);
    sundir2 = normalize(sundir2);
    sundir = normalize(sundir);

    vec3 nor = texture(normap,fs_Uv).xyz;

    float lamb = clamp(dot(nor,sundir),0.f,1.f);
    float lamb2 = clamp(dot(nor,sundir2),0.f,1.f);

    float yval = texture(hightmap,fs_Uv).x/30.f;
    out_Col = vec4(vec3(yval),1.f);
}
