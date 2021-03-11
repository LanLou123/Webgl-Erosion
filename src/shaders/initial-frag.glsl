#version 300 es
precision highp float;


in vec2 fs_Pos;
uniform float u_Time;
uniform float u_TerrainScale;
uniform float u_TerrainHeight;
uniform int u_terrainBaseType;
uniform int u_TerrainSphereMask;

layout (location = 0) out vec4 initial;
layout (location = 1) out vec4 initial2;

//voroni=========================================================================

vec3 hash3( vec2 p ){
    vec3 q = vec3( dot(p,vec2(127.1,311.7)),
				   dot(p,vec2(269.5,183.3)),
				   dot(p,vec2(419.2,371.9)) );
	return fract(sin(q)*43758.5453);
}

float iqnoise( in vec2 x, float u, float v ){
    vec2 p = floor(x);
    vec2 f = fract(x);

	float k = 1.0+63.0*pow(1.0-v,4.0);

	float va = 0.0;
	float wt = 0.0;
    for( int j=-2; j<=2; j++ )
    for( int i=-2; i<=2; i++ )
    {
        vec2 g = vec2( float(i),float(j) );
		vec3 o = hash3( p + g )*vec3(u,u,1.0);
		vec2 r = g - f + o.xy;
		float d = dot(r,r);
		float ww = pow( 1.0-smoothstep(0.0,1.414,sqrt(d)), k );
		va += o.z*ww;
		wt += ww;
    }

    return va/wt;
}
//voroni=========================================================================



//smooth========================================================================
vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

// Value Noise by Inigo Quilez - iq/2013
// https://www.shadertoy.com/view/lsf3WH
float noise2(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}


//smooth========================================================================

#define OCTAVES 12

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}


float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}


float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);//iqnoise(st,1.f,1.f);
        st *= 2.0;
        amplitude *= .33;
    }
    return value;
}

float teR(float h) {
    float W = 0.06; // width of terracing bands
    float k = floor(h / W);
    float f = (h - k*W) / W;
    float s = min(2.0 * f, 1.0);
    return (k+s) * W;
}

float domainwarp(vec2 p){
    return fbm(p+fbm(p+fbm(p)));
}

float test(vec2 p){
    return abs(pow(2.0,-length(p - vec2(0.5))*2.0));
}

float circle_mask(vec2 p){
    return max(0.5 - distance(p, vec2(0.5)), 0.0) ;
}

//nice one 5.3f*uv+vec2(178.f,27.f);

// 6.f*vec2(uv.x,uv.y)+vec2(121.f,41.f);
void main() {

  vec2 rdp1 = vec2(0.2,0.5);
  vec2 rdp2 = vec2(0.1,0.8);
  vec2 uv = 0.5f*fs_Pos+vec2(0.5f);


    float c_mask = circle_mask(uv);
  vec2 cpos = 0.5 * uv * u_TerrainScale;
  cpos = cpos + vec2(2.f*mod(u_Time,100.f) + 58.0,2.0 * mod(u_Time,100.f)+23.f);
  float terrain_hight = fbm(cpos*2.0);

    terrain_hight = pow(terrain_hight,2.0)/1.50;
    if(u_terrainBaseType == 2){
        terrain_hight = teR(terrain_hight);
    }else if(u_terrainBaseType == 1){
        terrain_hight = domainwarp(cpos * 2.0)/3.0;
    }

    terrain_hight *= u_TerrainHeight*500.0;
    if(u_TerrainSphereMask == 0){
        terrain_hight *= 2.0 * pow(c_mask, 1.0);
    }
    //terrain_hight = test(uv) * 500.0;
  float rainfall = .0f;
  //if(uv.x>0.6||uv.x<0.5||uv.y>0.6||uv.y<0.5) rainfall = 0.f;
  initial = vec4(terrain_hight,rainfall,0.f,1.f);
  initial2= vec4(terrain_hight,rainfall,0.f,1.f);
}
