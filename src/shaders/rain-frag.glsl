#version 300 es
precision highp float;

uniform sampler2D readTerrain;

uniform float u_Time;
uniform float raindeg;
uniform vec2 u_SpawnPos;

layout (location = 0) out vec4 writeTerrain;


//generic noise from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
      vec3 a = floor(p);
      vec3 d = p - a;
      d = d * d * (3.0 - 2.0 * d);

      vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
      vec4 k1 = perm(b.xyxy);
      vec4 k2 = perm(k1.xyxy + b.zzww);

      vec4 c = k2 + a.zzzz;
      vec4 k3 = perm(c);
      vec4 k4 = perm(c + 1.0);

      vec4 o1 = fract(k3 * (1.0 / 41.0));
      vec4 o2 = fract(k4 * (1.0 / 41.0));

      vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
      vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

      return o4.y * d.y + o4.x * (1.0 - d.y);
}

float random (in vec2 st) {
      return fract(sin(dot(st.xy,
      vec2(12.9898,78.233)))*
      43758.5453123);
}

in vec2 fs_Pos;


float timestep = 0.0001;


void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      vec4 cur = texture(readTerrain,curuv);
      float rain = raindeg;

      float maxx = u_SpawnPos.x+0.05;
      float maxy = u_SpawnPos.y+0.05;
      float minx = u_SpawnPos.x - 0.05;
      float miny = u_SpawnPos.y - 0.05;


      float epsilon = 0.000001f;
      float nrain = noise(vec3(curuv * 16000.0, u_Time));
      rain = nrain/18000.0;
      rain += epsilon;
//      if(curuv.x<maxx && curuv.x>minx && curuv.y<maxy&&curuv.y>miny){
//            rain += 0.001;
//      }
//      else{
//            rain = raindeg;
//      }


      writeTerrain = vec4(cur.x,cur.y+rain * raindeg,cur.z,cur.w);
}