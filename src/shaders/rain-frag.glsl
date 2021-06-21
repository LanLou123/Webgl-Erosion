#version 300 es
precision highp float;

uniform sampler2D readTerrain;

uniform float u_Time;
uniform float raindeg;

uniform vec4 u_MouseWorldPos;
uniform vec3 u_MouseWorldDir;
uniform float u_BrushSize;
uniform float u_BrushStrength;
uniform int u_BrushType;
uniform int u_BrushPressed;
uniform vec2 u_BrushPos;
uniform int u_BrushOperation;

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


struct BrushTmp{
      float bStrength;
      float bSize;
      vec2 bPos;
};

void main() {

      vec2 curuv = 0.5f*fs_Pos+0.5f;
      vec3 sand = vec3(214.f/255.f,164.f/255.f,96.f/255.f);
      vec3 watercol = vec3(0.1,0.3,0.8);


      float addterrain = 0.0;
      float addwater = 0.0;
      float amount = 0.0006 * u_BrushStrength;
      if(u_BrushType != 0){
            vec3 ro = u_MouseWorldPos.xyz;
            vec3 rd = u_MouseWorldDir;
            vec2 pointOnPlane = u_BrushPos;
            float pdis2fragment = distance(pointOnPlane, curuv);
            if (pdis2fragment < 0.01 * u_BrushSize){
                  float dens = (0.01 * u_BrushSize - pdis2fragment) / (0.01 * u_BrushSize);

                  if(u_BrushType == 1 && u_BrushPressed == 1){
                        addterrain =  amount * 1.0 * 280.0;
                        addterrain = u_BrushOperation == 0 ? addterrain : -addterrain;
                  }else if(u_BrushType == 2 && u_BrushPressed == 1){
                        addwater =  amount * dens * 280.0;
                        float aw = noise(vec3(curuv * 100.0, u_Time));
                        addwater *= aw;
                        addwater = u_BrushOperation == 0 ? addwater : -addwater;
                  }

            }

      }




      vec4 cur = texture(readTerrain,curuv);
      float rain = raindeg;



      float epsilon = 0.000001f;
      float nrain = noise(vec3(curuv * 100.0, u_Time));
      //nrain = 1.0f;
      rain = nrain/1150.0;

//      if(mod(u_Time, 10.0) <= 1.0){
//            rain = 0.0f;
//            addwater = 0.0f;
//      }

      rain = 0.0f;
      epsilon = 0.0f;
//      if(curuv.x<maxx && curuv.x>minx && curuv.y<maxy&&curuv.y>miny){
//            rain += 0.001;
//      }
//      else{
//            rain = raindeg;
//      }


      writeTerrain = vec4(min(max(cur.x + addterrain, -0.10),2000.30),max(cur.y+rain * raindeg + addwater, 0.0f),cur.z,cur.w);
}