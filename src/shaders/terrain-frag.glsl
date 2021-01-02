#version 300 es
precision highp float;

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;


uniform sampler2D hightmap;
uniform sampler2D normap;
uniform sampler2D sedimap;
uniform sampler2D velmap;
uniform sampler2D fluxmap;

in float fs_Sine;
in vec2 fs_Uv;
out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.
uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform int u_TerrainDebug;



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

    vec3 nor1 = -texture(normap,fs_Uv).xyz;
    vec3 nor = -calnor(fs_Uv);

    float lamb = dot(nor,sundir);
    float lamb2 = dot(nor,sundir2);

    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x * 4.0;
    float wval = texture(hightmap,fs_Uv).y;
    float sval = texture(sedimap, fs_Uv).x;

    vec3 finalcol = vec3(0);

    vec3 forestcol = vec3(0.1,0.6f,0.1f);
    vec3 mtncolor = vec3(0.99,0.99,0.99);
    vec3 dirtcol = vec3(0.27,0.3,0.1);
    vec3 grass = vec3(173.0/255.0,235.0/255.0,27.0/255.0);
    vec3 sand = vec3(214.f/255.f,164.f/255.f,96.f/255.f);
    vec3 obsidian = vec3(0.2);


    if(yval<=0.1){
        finalcol = grass;
    }else if(yval>0.1&&yval<=0.4){
        finalcol = mix(grass,forestcol,(yval-0.1)/0.3);
    }else if(yval>0.4){
        if(yval<0.7f ){
            finalcol = mix(forestcol, mtncolor, (yval-0.4)/0.3);
        }


    }


    if(abs(nor.y)<0.9){
        finalcol = mix(dirtcol,finalcol,(abs(nor.y))/0.9);
    }

    finalcol = mix(finalcol, sand, clamp(sval*130.0, 0.0, 1.0) );


    //finalcol = vec3(clamp(sval*100.0, 0.0, 1.0));


    vec3 normal = lamb*(finalcol);
    vec3 fcol = normal;
    //normal : 0, sediment : 1, velocity : 2, terrain : 3, flux : 4
    if(u_TerrainDebug == 0){
        fcol = normal;
    }else if(u_TerrainDebug == 1){
        fcol = texture(sedimap,fs_Uv).xyz * 100.0;
    }else if(u_TerrainDebug == 2){
        fcol = texture(velmap,fs_Uv).xyz;
        //fcol = nor1;
        fcol.xy = fcol.xy / 2.0 + vec2(0.5);
    }else if(u_TerrainDebug == 3){
        fcol = texture(hightmap,fs_Uv).xyz;
        fcol.y *= 5.0;
    }else if(u_TerrainDebug == 4){
        fcol = texture(fluxmap,fs_Uv).xyz * 800000.0;
    }


    out_Col = vec4(vec3(fcol)*1.0,1.f);
}
