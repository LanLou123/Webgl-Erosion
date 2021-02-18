#version 300 es
precision highp float;

uniform sampler2D hightmap;
uniform sampler2D sceneDepth;
uniform sampler2D shadowMap;

// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;
uniform vec3  unif_LightPos;
uniform int u_showScattering;

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;
uniform mat4 u_sproj;
uniform mat4 u_sview;

in vec2 fs_Pos;
out vec4 out_Col;


#define FOV 45.f
vec3 sky(in vec3 rd){
    return mix(vec3(0.6,0.6,0.6),vec3(0.3,0.5,0.9),clamp(rd.y,0.f,1.f));
}


// ====================== Raleigh scattering ========================
// reference https://github.com/wwwtyro/glsl-atmosphere

#define PI 3.141592
#define iSteps 16
#define jSteps 8

vec2 rsi(vec3 r0, vec3 rd, float sr) {
    // ray-sphere intersection that assumes
    // the sphere is centered at the origin.
    // No intersection when result.x > result.y
    float a = dot(rd, rd);
    float b = 2.0 * dot(rd, r0);
    float c = dot(r0, r0) - (sr * sr);
    float d = (b*b) - 4.0*a*c;
    if (d < 0.0) return vec2(1e5,-1e5);
    return vec2(
    (-b - sqrt(d))/(2.0*a),
    (-b + sqrt(d))/(2.0*a)
    );
}

vec3 atmosphere(vec3 r, vec3 r0, vec3 pSun, float iSun, float rPlanet, float rAtmos, vec3 kRlh, float kMie, float shRlh, float shMie, float g) {
    // Normalize the sun and view directions.
    pSun = normalize(pSun);
    r = normalize(r);

    // Calculate the step size of the primary ray.
    vec2 p = rsi(r0, r, rAtmos);
    if (p.x > p.y) return vec3(0,0,0);
    p.y = min(p.y, rsi(r0, r, rPlanet).x);
    float iStepSize = (p.y - p.x) / float(iSteps);

    // Initialize the primary ray time.
    float iTime = 0.0;

    // Initialize accumulators for Rayleigh and Mie scattering.
    vec3 totalRlh = vec3(0,0,0);
    vec3 totalMie = vec3(0,0,0);

    // Initialize optical depth accumulators for the primary ray.
    float iOdRlh = 0.0;
    float iOdMie = 0.0;

    // Calculate the Rayleigh and Mie phases.
    float mu = dot(r, pSun);
    float mumu = mu * mu;
    float gg = g * g;
    float pRlh = 3.0 / (16.0 * PI) * (1.0 + mumu);
    float pMie = 3.0 / (8.0 * PI) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg));


    // Sample the primary ray.
    for (int i = 0; i < iSteps; i++) {

        // Calculate the primary ray sample position.
        vec3 iPos = r0 + r * (iTime + iStepSize * 0.5);



        // Calculate the height of the sample.
        float iHeight = length(iPos) - rPlanet;

        // Calculate the optical depth of the Rayleigh and Mie scattering for this step.
        float odStepRlh = exp(-iHeight / shRlh) * iStepSize;
        float odStepMie = exp(-iHeight / shMie) * iStepSize;

        // Accumulate optical depth.
        iOdRlh += odStepRlh;
        iOdMie += odStepMie;

        // Calculate the step size of the secondary ray.
        float jStepSize = rsi(iPos, pSun, rAtmos).y / float(jSteps);

        // Initialize the secondary ray time.
        float jTime = 0.0;

        // Initialize optical depth accumulators for the secondary ray.
        float jOdRlh = 0.0;
        float jOdMie = 0.0;

        // Sample the secondary ray.
        for (int j = 0; j < jSteps; j++) {

            // Calculate the secondary ray sample position.
            vec3 jPos = iPos + pSun * (jTime + jStepSize * 0.5);

            // Calculate the height of the sample.
            float jHeight = length(jPos) - rPlanet;

            // Accumulate the optical depth.
            jOdRlh += exp(-jHeight / shRlh) * jStepSize;
            jOdMie += exp(-jHeight / shMie) * jStepSize;

            // Increment the secondary ray time.
            jTime += jStepSize;
        }

        // Calculate attenuation.
        vec3 attn = exp(-(kMie * (iOdMie + jOdMie) + kRlh * (iOdRlh + jOdRlh)));

        // Accumulate scattering.
        totalRlh += odStepRlh * attn;
        totalMie += odStepMie * attn;

        // Increment the primary ray time.
        iTime += iStepSize;

    }

    // Calculate and return the final color.
    return iSun * (pRlh * kRlh * totalRlh + pMie * kMie * totalMie);
}



// my ray march

#define SCATTER_MARCH_STEPS 194
#define SCATTER_OUT_MARCH_STEPS 32
#define SCATTER_MARCH_STEP_SIZE 0.01

vec4 scatter_m(vec3 ro, vec3 rd){
    vec4 col = vec4(0.0);
    vec3 fog_col = vec3(0.8,0.8,1.0);
    float scatter_alpha_acc_all = 1.0 / float(SCATTER_MARCH_STEPS);
    float scatter_alpha_acc = scatter_alpha_acc_all / 4.0;
    float scatter_alpha_acc_out = scatter_alpha_acc_all * 3.0/ 4.0;

    vec3 scatter_col_acc_all = fog_col/float(SCATTER_MARCH_STEPS);
    vec3 scatter_col_acc = scatter_col_acc_all / 4.0;
    vec3 scatter_col_acc_out = scatter_col_acc_all * 3.0 / 4.0;

    vec2 uv = 0.5*fs_Pos+0.5;
    vec3 sceneDepthValue = texture(sceneDepth,uv).xyz;

    for(int i = 1;i<SCATTER_MARCH_STEPS; ++i){
        col += vec4(scatter_col_acc,scatter_alpha_acc);
        vec3 pos = ro + rd * SCATTER_MARCH_STEP_SIZE * float(i);

        vec4 clipSpacePos =  u_ViewProj * vec4(pos,1.0);
        clipSpacePos = clipSpacePos/ clipSpacePos.w;
        clipSpacePos.x = (clipSpacePos.x + 1.0) / 2.0;
        clipSpacePos.y = (1.0 - clipSpacePos.y) / 2.0;
        clipSpacePos.z = (clipSpacePos.z + 1.0) / 2.0;// damn dude, this shit easy to neglect

        vec4 lightSpacePos = u_sproj * u_sview * vec4(pos,1.0);
        lightSpacePos = lightSpacePos / lightSpacePos.w;
        lightSpacePos = lightSpacePos * 0.5 + 0.5;
        float texsize = 1.0/4096.0f;
        float shadowMapDepth = texture(shadowMap, lightSpacePos.xy).x;
        if(lightSpacePos.x <= 0.0 || lightSpacePos.x >= 1.0 || lightSpacePos.y <= 0.0 || lightSpacePos.y >= 1.0){
            shadowMapDepth = 0.0f;
        }
        if(lightSpacePos.z < shadowMapDepth || shadowMapDepth==0.0){
            col += vec4(scatter_col_acc_out,scatter_alpha_acc_out);
        }


        if(sceneDepthValue.x < clipSpacePos.z + 0.001 && sceneDepthValue.x != 0.0){
            break;
        }

    }
    return col;
}


void main() {
    vec2 uv = 0.5*fs_Pos+0.5;
    vec3 sceneDepthValue = texture(sceneDepth,uv).xyz;


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


    float planetScale = 1.0;

    vec3 color = atmosphere(
    normalize(rd),           // normalized ray direction
    vec3(0,6372e3,0) * planetScale + vec3(0.0,-2.0,0.0) + ro,               // ray origin
    unif_LightPos,                        // position of the sun
    20.0,                           // intensity of the sun
    6371e3 * planetScale,                         // radius of the planet in meters
    6671e3 * planetScale,                         // radius of the atmosphere in meters
    vec3(5.5e-6, 13.0e-6, 22.4e-6), // Rayleigh scattering coefficient
    21e-6,                          // Mie scattering coefficient
    8e3 * planetScale,                            // Rayleigh scale height
    1.2e3 * planetScale,                          // Mie scale height
    0.858                           // Mie preferred scattering direction
    );

    gl_FragDepth = 0.01;

    vec4 rendercol = scatter_m(ro,rd);

    vec4 finalCol = rendercol;//vec4(0.0,0.0,0.0,1.0);
    if(u_showScattering == 0){
        finalCol = vec4(0.0,0.0,0.0,1.0);
        gl_FragDepth = 0.99999;
    }
    if(sceneDepthValue.x==0.0){
        finalCol.xyz  = (max(color,vec3(0.0,0.0,0.0)) + finalCol.xyz)/2.0;
    }

    float angle = dot(normalize(unif_LightPos),vec3(0.0,1.0,0.0));
    vec3 hue = mix(vec3(255.0,255.0,250.0)/256.0, vec3(255.0,120.0,20.0)/256.0, 1.0 - angle);

    out_Col = vec4(  pow(vec3(finalCol.xyz), vec3(1.0/2.0)), pow(finalCol.w, 1.0 / 2.0));
}
