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
uniform float u_SimRes;

vec3 calnor(vec2 uv){
    float eps = 1.0/u_SimRes;
    vec4 cur = texture(hightmap,uv);
    vec4 r = texture(hightmap,uv+vec2(eps,0.f));
    vec4 t = texture(hightmap,uv+vec2(0.f,eps));

    vec3 n1 = normalize(vec3(-1.0, cur.y + cur.x - r.y - r.x, 0.f));
    vec3 n2 = normalize(vec3(-1.0, t.x + t.y - r.y - r.x, 1.0));

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

    vec3 nor = -calnor(fs_Uv);
    vec3 viewdir = normalize(u_Eye - fs_Pos);
    vec3 lightdir = normalize(sundir);
    vec3 halfway = normalize(lightdir + viewdir);
    float spec = pow(max(dot(nor, halfway), 0.0), 333.0);



    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x * 4.0;
    float wval = texture(hightmap,fs_Uv).y;
    wval *= 3.0;

    wval = wval < 0.1 ? 0.0 : wval - 0.1;

    vec3 watercolor = mix(vec3(0.0,0.3,0.8), vec3(0.0,0.0,0.9), pow(wval,0.4));
    vec3 watercolorspec = vec3(1.0);
    watercolorspec *= spec;

    out_Col = vec4(watercolor + watercolorspec,u_WaterTransparency * (wval + 0.0));
}
