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
uniform sampler2D terrainfluxmap;
uniform sampler2D maxslippagemap;
uniform sampler2D sediBlend;


in float fs_Sine;
in vec2 fs_Uv;
out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.
uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform int u_TerrainDebug;

uniform vec4 u_MouseWorldPos;
uniform vec3 u_MouseWorldDir;
uniform float u_BrushSize;
uniform int u_BrushType;
uniform vec2 u_BrushPos;
uniform float u_SimRes;
uniform float u_SnowRange;

vec3 calnor(vec2 uv){
    float eps = 1.f/u_SimRes;
    vec4 cur = texture(hightmap,uv);
    vec4 r = texture(hightmap,uv+vec2(eps,0.f));
    vec4 t = texture(hightmap,uv+vec2(0.f,eps));
    vec4 b = texture(hightmap,uv+vec2(0.f,-eps));
    vec4 l = texture(hightmap,uv+vec2(-eps,0.f));

    vec3 nor = vec3(l.x - r.x, 2.0, t.x - b.x);
    nor = -normalize(nor);
    return nor;
}



void main()
{

    vec3 forestcol = vec3(0.1,0.6f,0.1f);
    vec3 mtncolor = vec3(0.99,0.99,0.99);
    vec3 dirtcol = vec3(0.21,0.2,0.2);
    vec3 grass = vec3(173.0/255.0,235.0/255.0,27.0/255.0);
    vec3 sand = vec3(214.f/255.f,184.f/255.f,96.f/255.f);
    vec3 watercol = vec3(0.1,0.3,0.8);
    vec3 obsidian = vec3(0.2);

    vec3 rock1 = vec3(0.4,0.4,0.4);
    vec3 rock2 = vec3(0.2,0.2,0.2);
    vec3 rock3 = vec3(0.1,0.1,0.1);

    vec3 addcol = vec3(0.0);
    if(u_BrushType != 0){
        vec3 ro = u_MouseWorldPos.xyz;
        vec3 rd = u_MouseWorldDir;
        vec2 pointOnPlane = u_BrushPos;
        float pdis2fragment = distance(pointOnPlane, fs_Uv);
        if (pdis2fragment < 0.01 * u_BrushSize){
            float dens = (0.01 * u_BrushSize - pdis2fragment) / (0.01 * u_BrushSize);

            if(u_BrushType == 1){
                addcol = sand * 0.8;
            }else if(u_BrushType == 2){
                addcol = watercol * 0.8;
            }
            addcol *= dens;
        }

    }


    vec3 sundir = vec3(1.f,2.f,-1.f);
    vec3 sundir2 = vec3(-1.f,2.f,1.f);
    sundir2 = normalize(sundir2);
    sundir = normalize(sundir);

    vec3 slopesin = texture(normap,fs_Uv).xyz;
    vec3 nor = -calnor(fs_Uv);

    float lamb = dot(nor,sundir);
    float lamb2 = dot(nor,sundir2);

    //lamb =1.f;

    float yval = texture(hightmap,fs_Uv).x * 4.0;
    float wval = texture(hightmap,fs_Uv).y;
    float sval = texture(sediBlend, fs_Uv).x;

    vec3 finalcol = vec3(0);


    if(yval<=100.0){
        finalcol = grass;
    }else if(yval>100.0&&yval<=150.0){
        finalcol = mix(grass,forestcol,(yval-100.0)/50.0);
    }else if(yval>150.0){
        if(yval<300.0f ){
            finalcol = mix(forestcol, mtncolor, (yval-150.0)/150.0);
        }
        else if((yval > 300.0f)){
            finalcol = mtncolor;
        }

    }


    if(abs(nor.y)<0.8){
        finalcol = mix(dirtcol,finalcol,pow(abs(nor.y)/0.8,u_SnowRange));
    }

   // finalcol = obsidian;

    //finalcol = mix(finalcol, sand, clamp( pow( sval, 3.0) * 8.0, 0.0, 4.0) );
    finalcol = mix(finalcol,pow( sval, 1.0) * 100.0 * vec3(1.0,1.0,1.0),pow( sval,1.0) * 100.0 );

    //finalcol = vec3(clamp(sval*100.0, 0.0, 1.0));


    vec3 normal = lamb*(finalcol);
    vec3 fcol = normal;
    //normal : 0, sediment : 1, velocity : 2, terrain : 3, flux : 4
    if(u_TerrainDebug == 0){
        fcol = normal;
    }else if(u_TerrainDebug == 1){
        fcol = texture(sedimap,fs_Uv).xyz * 2.0;
    }else if(u_TerrainDebug == 2){
        fcol = abs(texture(velmap,fs_Uv).xyz/2.0);
        //fcol = nor1;
        //fcol.xy = fcol.xy / 2.0 + vec2(0.5);
    }else if(u_TerrainDebug == 3){
        fcol = texture(hightmap,fs_Uv).xyz;
        fcol.xy /= 200.0;
    }else if(u_TerrainDebug == 4){
        fcol = texture(fluxmap,fs_Uv).xyz / 3.0;
    }else if(u_TerrainDebug == 5){
        fcol = texture(terrainfluxmap, fs_Uv).xyz * 10.0;
    }else if(u_TerrainDebug == 6){
        fcol = texture(maxslippagemap, fs_Uv).xyz / 3.0;
    }else if(u_TerrainDebug == 7){
        fcol = vec3(sval * 100.0);
    }else if(u_TerrainDebug == 8){
        fcol = slopesin;
    }



    fcol += addcol;

    out_Col = vec4(vec3(fcol)*1.0,1.f);
}
