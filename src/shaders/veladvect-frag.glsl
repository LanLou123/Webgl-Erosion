#version 300 es
precision highp float;

uniform sampler2D readVel;


uniform float u_SimRes;
uniform float u_timestep;



layout (location = 0) out vec4 writeVel;

#define useMullerPath false

in vec2 fs_Pos;





void main() {
 
    vec2 curuv = 0.5f*fs_Pos+0.5f;
    float div = 1.f/u_SimRes;
    float alpha = 1.0;
    float velscale = 1.0/1.0;

    vec4 curvel = texture(readVel,curuv);



    vec4 useVel = curvel/u_SimRes;
    //useVel *= unif_advectMultiplier * 0.5;
    useVel *= 0.5;


    vec2 oldloc = vec2(curuv.x-useVel.x*u_timestep,curuv.y-useVel.y*u_timestep);
    vec2 oldvel = texture(readVel, oldloc).xy;
    //oldsedi = samplebilinear(oldloc,u_SimRes   );



    writeVel = vec4(oldvel.xy, curvel.zw);
}