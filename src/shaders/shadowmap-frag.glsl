#version 300 es
precision highp float;




in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;


uniform sampler2D hightmap;

uniform sampler2D sedimap;

layout (location = 0) out vec4 shadowtex;

in float fs_Sine;
in vec2 fs_Uv;

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




void main()
{

    shadowtex = vec4(vec3(gl_FragCoord.z),1.f);
}
