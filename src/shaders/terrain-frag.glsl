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


    vec3 sundir = vec3(1.f,2.f,-1.f);
    vec3 sundir2 = vec3(-1.f,4.f,-1.f);
    sundir2 = normalize(sundir2);
    sundir = normalize(sundir);

    vec3 nor = -texture(normap,fs_Uv).xyz;

    float lamb = dot(nor,sundir);
    float lamb2 = clamp(dot(nor,sundir2),0.f,1.f);

    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x/30.f;
    float wval = texture(hightmap,fs_Uv).y;
    vec3 cc = mix(vec3(0.3,1.0,0.1),vec3(0.7,0.7,0.0),wval/(wval+yval));
    vec3 fcol = lamb*(vec3(1));
    float water = .64f;
    if(wval>water) {
        float river = (wval-water)*3.f;
        fcol = mix(fcol,vec3(0.f,0.8,1.f),river);
    }
    out_Col = vec4(fcol,1.f);
}
