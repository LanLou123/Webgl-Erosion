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


vec3 calnor(vec2 uv){
    float eps = 0.001;
    vec4 cur = texture(hightmap,fs_Uv)/40.f;
    vec4 r = texture(hightmap,fs_Uv+vec2(eps,0.f))/40.f;
    vec4 t = texture(hightmap,fs_Uv+vec2(0.f,eps))/40.f;

    vec3 nor = cross(vec3(eps,r.x-cur.x,0.f),vec3(0.f,t.x-cur.x,eps));
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

    float yval = texture(hightmap,fs_Uv).x/17.f;
    float yvalex = texture(hightmap,fs_Uv).x/40.f;
    float wval = texture(hightmap,fs_Uv).y;

    vec3 finalcol = vec3(0);

    vec3 forestcol = vec3(0.3,1.f,0.f);
    vec3 mtncolor = vec3(0.99,0.99,0.99);
    vec3 dirtcol = vec3(0.87,0.4,0.2);
    vec3 grass = vec3(173.0/255.0,255.0/255.0,47.0/255.0);

    if(yval>0.f&&yval<=0.2){
        finalcol = dirtcol;
    }else if(yval>0.2&&yval<=0.6){
        finalcol = mix(dirtcol,forestcol,(yval-0.2)/0.4);
    }else if(yval>0.6){
        if(yval<1.f)
        finalcol = mix(forestcol,mtncolor,(yval-0.6)/0.4);
        else{
            finalcol = mtncolor;
        }
    }

    if(abs(nor.y)<0.7){
        finalcol = mix(dirtcol,finalcol,(abs(nor.y))/0.7);
    }

    vec3 fcol = lamb*(finalcol);
    //fcol += vec3(0.2,0.5,0.6)*lamb2*0.4;
    float water = 0.1f;
    if(wval>water) {
        float river = clamp((wval-water)*8.f,0.f,1.f);
        fcol = mix(fcol,lamb*vec3(0.f,0.5,0.8f),river);
    }



    out_Col = vec4(fcol,1.f);
}
