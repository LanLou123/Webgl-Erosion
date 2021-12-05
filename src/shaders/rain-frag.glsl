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
uniform int u_pBrushOn;
uniform int u_RainErosion;
uniform float u_RainErosionStrength;
uniform float u_RainErosionDropSize;

uniform vec2 u_permanentPos;
uniform vec2 u_PBrushData;

layout (location = 0) out vec4 writeTerrain;

#define OCTAVES 6

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
            amplitude *= .53;
      }
      return value;
}


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

//float random (in vec2 st) {
//      return fract(sin(dot(st.xy,
//      vec2(12.9898,78.233)))*
//      43758.5453123);
//}

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
      float aw = fbm(curuv*10.0 + vec2(sin(u_Time * 35.0), cos(u_Time*115.0)));
      // normal water brush
      if(u_BrushType != 0){
            vec3 ro = u_MouseWorldPos.xyz;
            vec3 rd = u_MouseWorldDir;
            vec2 pointOnPlane = u_BrushPos;
            float pdis2fragment = distance(pointOnPlane, curuv);
            if (pdis2fragment < 0.01 * u_BrushSize){
                  float dens = (0.01 * u_BrushSize - pdis2fragment * 0.5) / (0.01 * u_BrushSize);

                  if(u_BrushType == 1 && u_BrushPressed == 1){
                        addterrain =  amount * 1.0 * 280.0;
                        addterrain = u_BrushOperation == 0 ? addterrain : -addterrain;
                  }else if(u_BrushType == 2 && u_BrushPressed == 1){



                        addwater =  amount * dens * 200.0;
                        //float aw = noise(vec3(curuv * 100.0, u_Time));

                        //aw = pow(aw, 8.0);
                        addwater *= aw;
                        addwater = u_BrushOperation == 0 ? addwater : -addwater;
                  }



            }



      }

      // rain erosion
      if(u_RainErosion == 1 && mod(u_Time, 5.0) == 1.0 ){
            float smallradius = 0.025  * u_RainErosionDropSize;
            float rdx = random(vec2(30.0, cos(u_Time)));
            float rdy = random(vec2(u_Time, 10.0));

            float str = 1.0;
            if(mod(u_Time, 20.0) == 1.0) str = 9.0;

            float dis2small = distance(vec2(rdx, rdy), curuv);
            if (dis2small < smallradius){
                  addwater +=  0.06 * u_RainErosionStrength;
            }



      }

//                  if(mod(u_Time, 10.0) == 1.0)
//                  addwater += 0.006 * aw;


      // permanent water source brush
      if(u_pBrushOn != 0){
            vec3 ro = u_MouseWorldPos.xyz;
            vec3 rd = u_MouseWorldDir;
            vec2 pointOnPlane = u_permanentPos;
            float pdis2fragment = distance(pointOnPlane, curuv);
            amount = 0.0006 * u_PBrushData.y;
            if (pdis2fragment < 0.01 * u_PBrushData.x){
                  float dens = (0.01 * u_PBrushData.x - pdis2fragment) / (0.01 * u_PBrushData.x);


                        addwater =  amount * dens * 280.0;
                        //float aw = noise(vec3(curuv * 100.0, u_Time));
                        float aw = fbm(curuv*200.0 + vec2(sin(u_Time * 5.0), cos(u_Time*15.0)));
                        addwater *= aw;



            }

      }






      vec4 cur = texture(readTerrain,curuv);
      float rain = raindeg;



      float epsilon = 0.000001f;


      float nrain = noise(vec3(curuv * 100.0, u_Time));
      nrain = fbm(curuv*1.0 + vec2(sin(u_Time * 5.0), cos(u_Time*15.0)));

      rain = nrain/100.0;

//      if(mod(u_Time, 10.0) <= 1.0){
//            rain = 0.0f;
//            addwater = 0.0f;
//      }

      //if(mod(u_Time,100.0)!=9.0)
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