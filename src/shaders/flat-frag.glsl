#version 300 es
precision highp float;

uniform sampler2D hightmap;


// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;


#define FOV 45.f
vec3 sky(in vec3 rd){
    return mix(vec3(0.6,0.6,0.6),vec3(0.3,0.5,0.9),clamp(rd.y,0.f,1.f));
}


// ====================== iq cloud ========================



vec3 sundir = normalize(vec3(1.f,2.f,-1.f));


vec4 render( in vec3 ro, in vec3 rd)
{
    // background sky
    float sun = clamp( dot(sundir,rd), 0.0, 1.0 );
    vec3 col = vec3(0.6,0.71,0.75) - rd.y*0.2*vec3(1.0,0.5,1.0) + 0.15*0.5;
    col += 0.2*vec3(1.0,.6,0.1)*pow( sun, 8.0 );

    // sun glare
    col += 0.2*vec3(1.0,0.4,0.2)*pow( sun, 3.0 );

    return vec4( col, 1.0 );
}


void main() {
  //vec2 uv = 0.5*fs_Pos+0.5;

   vec4 col = texture(hightmap,0.5f*fs_Pos+.5f);

  //vec4 fcol =  vec4(vec3(col.xyz/500.f),1.f);
  //out_Col = fcol;

   float sx = (2.f*gl_FragCoord.x/u_Dimensions.x)-1.f;
    float sy = 1.f-(2.f*gl_FragCoord.y/u_Dimensions.y);
    float len = length(u_Ref - u_Eye);
    vec3 forward = normalize(u_Ref - u_Eye);
    vec3 right = cross(forward,u_Up);
    vec3 V = u_Up * len * tan(FOV/2.f);
    vec3 H = right * len * (u_Dimensions.x/u_Dimensions.y) * tan(FOV/2.f);
    vec3 p = u_Ref + sx * H - sy * V;

    vec3 rd = normalize(p - u_Eye);
    vec3 ro = u_Eye;
    //gl_FragDepth = 0.998;

    vec4 cloudCol = render(ro,rd);
    //cloudCol.xyz += sky(rd);

   //out_Col = vec4((col.xyz * 100.0), 1.0);
    out_Col = vec4(cloudCol);
}
