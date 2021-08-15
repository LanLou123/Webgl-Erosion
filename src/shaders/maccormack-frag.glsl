#version 300 es
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;
uniform sampler2D sediadvecta;
uniform sampler2D sediadvectb;

uniform float u_SimRes;
uniform float u_timestep;
uniform float unif_advectionSpeedScale;


layout (location = 0) out vec4 writeSediment;




in vec2 fs_Pos;


void main() {
 
    vec2 curuv = 0.5f*fs_Pos+0.5f;
    float div = 1.f/u_SimRes;
    float alpha = 1.0;
    float velscale = 1.0/1.0;

    vec4 curvel = (texture(vel,curuv));
    vec4 cursedi = texture(sedi,curuv);

    vec2 targetPos = curuv * u_SimRes - u_timestep * curvel.xy;

    vec4 st;
    st.xy = floor(targetPos - 0.5) + 0.5;
    st.zw = st.xy + 1.0;

    float nodeVal[4];
    nodeVal[0] = texture(sedi, st.xy/u_SimRes).x;
    nodeVal[1] = texture(sedi, st.zy/u_SimRes).x;
    nodeVal[2] = texture(sedi, st.xw/u_SimRes).x;
    nodeVal[3] = texture(sedi, st.zw/u_SimRes).x;

    float clampMin = min(min(min(nodeVal[0],nodeVal[1]),nodeVal[2]),nodeVal[3]);
    float clampMax = max(max(max(nodeVal[0],nodeVal[1]),nodeVal[2]),nodeVal[3]);

    float sediment = texture(sedi,curuv).x;


    float res = texture(sediadvecta,curuv).x + 0.5 * (sediment - texture(sediadvectb,curuv).x);

    sediment = max(min(res,clampMax), clampMin);



    vec4 useVel = curvel/u_SimRes;
    useVel *= unif_advectionSpeedScale;



    vec2 oldloc = vec2(curuv.x-useVel.x*velscale*u_timestep,curuv.y-useVel.y*velscale*u_timestep);
    float oldsedi = texture(sedi, oldloc).x;



    writeSediment = vec4(sediment, 0.0, 0.0, 1.0);


}