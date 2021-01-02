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
uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;

uniform int u_TerrainType;
uniform float u_WaterTransparency;


vec3 calnor(vec2 uv){
    float eps = 0.001;
    vec4 cur = texture(hightmap,uv);
    vec4 r = texture(hightmap,uv+vec2(eps,0.f));
    vec4 t = texture(hightmap,uv+vec2(0.f,eps));

    vec3 n1 = normalize(vec3(-eps, cur.x - r.x, 0.f));
    vec3 n2 = normalize(vec3(-eps, t.x - r.x, eps));

    vec3 nor = -cross(n1,n2);
    nor = normalize(nor);
    return nor;
}

void main()
{


    vec3 sundir = vec3(1.f,2.f,-1.f);
    vec3 sundir2 = vec3(-1.f,2.f,1.f);
    sundir2 = normalize(sundir2);
    sundir = normalize(sundir);

    vec3 nor = -texture(normap,fs_Uv).xyz;
    nor = -calnor(fs_Uv);

    float lamb = dot(nor,sundir);
    float lamb2 = dot(nor,sundir2);

    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x * 4.0;
    float wval = texture(hightmap,fs_Uv).y;
    wval *= 400.0;

    wval = wval < 0.6 ? 0.0 : wval - 0.6;

    vec3 watercolor = mix(vec3(0.0,0.3,0.8), vec3(0.0,0.0,0.9), wval/10.0);

    out_Col = vec4(watercolor,u_WaterTransparency * wval);
}
