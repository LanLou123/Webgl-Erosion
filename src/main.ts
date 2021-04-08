import {mat4, vec2, vec3, vec4} from 'gl-matrix';
// @ts-ignore
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Plane from './geometry/Plane';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {gl, setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
var mouseChange = require('mouse-change');



// static variables
var clientWidth : number;
var clientHeight : number;
var lastX = 0;
var lastY = 0;

const simresolution = 1024;
const shadowMapResolution = 4096;
const enableBilateralBlur = false;

let speed = 3;
let SimFramecnt = 0;
let TerrainGeometryDirty = true;
let PauseGeneration = false;
let HightMapCpuBuf = new Float32Array(simresolution * simresolution * 4); // height map CPU read back buffer, for CPU raycast & collision physics
let HightMapBufCounter  = 0;
let MaxHightMapBufCounter = 200; // determine how many frame to update CPU buffer of terrain hight map for ray casting on CPU
let simres : number = simresolution;



// aux control buffer (for backup)
const controlscomp = {


    tesselations: 5,
    pipelen:  1.0,//
    Kc : 0.8,
    Ks : 0.025,
    Kd : 0.004,
    timestep : 0.1,
    pipeAra :  0.8,
    EvaporationDegree : 0.0116,
    RainDegree : 4.5,
    spawnposx : 0.5,
    spawnposy : 0.5,
    'Load Scene': loadScene, // A function pointer, essentially
    'Start/Resume' :StartGeneration,
    'Reset' : Reset,
    'setTerrainRandom':setTerrainRandom,
    'Pause' : Pause,
    TerrainBaseMap : 0,
    TerrainBaseType : 0,//0 ordinary fbm, 1 domain warping, 2 terrace
    TerrainBiomeType : 1,
    TerrainScale : 10.0,
    TerrainHeight : 2.0,
    TerrainSphereMask : 0,//0 on, 1 off
    TerrainDebug : 0,
    WaterTransparency : 0.90,
    SedimentTrace : 0, // 0 on, 1 off
    TerrainPlatte : 0, // 0 normal alphine mtn, 1 desert, 2 jungle
    SnowRange : 0,
    ForestRange : 5,
    brushType : 2, // 0 : no brush, 1 : terrain, 2 : water
    brushSize : 12,
    brushStrenth : 1.2,
    brushOperation : 0, // 0 : add, 1 : subtract
    brushPressed : 0, // 0 : not pressed, 1 : pressed
    talusAngleFallOffCoeff : 0.9,
    talusAngleTangentBias : 0.0,
    thermalRate : 0.5,
    thermalErosionScale : 1.0,
    lightPosX : 0.4,
    lightPosY : 0.2,
    lightPosZ : -1.0,
    showScattering : true,

};


const controls = {
    tesselations: 5,
    pipelen:  1.0,//
    Kc : 0.4,
    Ks : 0.025,
    Kd : 0.004,
    timestep : 0.1,
    pipeAra :  0.8,
    EvaporationDegree : 0.001,
    RainDegree : 4.5,
    spawnposx : 0.5,
    spawnposy : 0.5,
    'Load Scene': loadScene, // A function pointer, essentially
    'Start/Resume' :StartGeneration,
    'Reset' : Reset,
    'setTerrainRandom':setTerrainRandom,
    'Pause' : Pause,
    TerrainBaseMap : 0,
    TerrainBaseType : 2,//0 ordinary fbm, 1 domain warping, 2 terrace, 3 voroni
    TerrainBiomeType : 1,
    TerrainScale : 2.0,
    TerrainHeight : 2.0,
    TerrainSphereMask : 1,//0 on, 1 off
    TerrainDebug : 0,
    WaterTransparency : 0.50,
    SedimentTrace : 0, // 0 on, 1 off
    TerrainPlatte : 1, // 0 normal alphine mtn, 1 desert, 2 jungle
    SnowRange : 0,
    ForestRange : 5,
    brushType : 2, // 0 : no brush, 1 : terrain, 2 : water
    brushSize : 12,
    brushStrenth : 0.5,
    brushOperation : 0, // 0 : add, 1 : subtract
    brushPressed : 0, // 0 : not pressed, 1 : pressed
    talusAngleFallOffCoeff : 0.9,
    talusAngleTangentBias : 0.0,
    thermalRate : 0.5,
    thermalErosionScale : 1.0,
    lightPosX : 0.4,
    lightPosY : 0.09,
    lightPosZ : -1.0,
    showScattering : true,
    enableBilateralBlur : true,
};





// ================ geometries ============
// =============================================================
let square: Square;
let plane : Plane;
let waterPlane : Plane;


// ================ frame buffers ============
// =============================================================
let frame_buffer : WebGLFramebuffer;
let shadowMap_frame_buffer : WebGLFramebuffer;
let deferred_frame_buffer : WebGLFramebuffer;

// ================  render buffers ============
// =============================================================
let render_buffer : WebGLRenderbuffer;
let shadowMap_render_buffer : WebGLRenderbuffer;
let deferred_render_buffer : WebGLRenderbuffer;

// ================ muti-renderpasses used textures ============
// =============================================================
let shadowMap_tex : WebGLTexture;
let scene_depth_tex : WebGLTexture;
let bilateral_filter_horizontal_tex : WebGLTexture;
let bilateral_filter_vertical_tex : WebGLTexture;
let color_pass_tex : WebGLTexture;
let color_pass_reflection_tex : WebGLTexture;
let scatter_pass_tex : WebGLTexture;

// ================ simulation textures ===================
// ========================================================
let read_terrain_tex : WebGLTexture;
let write_terrain_tex : WebGLTexture;
let read_flux_tex : WebGLTexture;
let write_flux_tex : WebGLTexture;
let read_terrain_flux_tex : WebGLTexture;// thermal
let write_terrain_flux_tex : WebGLTexture;
let read_maxslippage_tex : WebGLTexture;
let write_maxslippage_tex : WebGLTexture;
let read_vel_tex : WebGLTexture;
let write_vel_tex : WebGLTexture;
let read_sediment_tex : WebGLTexture;
let write_sediment_tex : WebGLTexture;
let terrain_nor : WebGLTexture;
let read_sediment_blend : WebGLTexture;
let write_sediment_blend : WebGLTexture;



// ================ dat gui button call backs ============
// =============================================================

function loadScene() {
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(1,1), 18);
  plane.create();
  waterPlane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(1,1), 18);
  waterPlane.create();
}

function StartGeneration(){
    PauseGeneration = false;
}
function Pause(){
    PauseGeneration = true;
}

function Reset(){
    SimFramecnt = 0;
    TerrainGeometryDirty = true;
    //PauseGeneration = true;
}

function setTerrainRandom() {
}


function Render2Texture(renderer:OpenGLRenderer, gl:WebGL2RenderingContext,camera:Camera,shader:ShaderProgram,cur_texture:WebGLTexture){
    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,cur_texture,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    renderer.clear();
    shader.use();

    renderer.render(camera,shader,[square]);
    if(cur_texture == read_terrain_tex){
        HightMapCpuBuf = new Float32Array(simres * simres * 4);
        gl.readPixels(0,0,simres,simres, gl.RGBA, gl.FLOAT, HightMapCpuBuf);
        //console.log(HightMapCpuBuf);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}



function SimulatePerStep(renderer:OpenGLRenderer,
                         gl:WebGL2RenderingContext,
                         camera:Camera,
                         shader:ShaderProgram,
                         waterhight:ShaderProgram,
                         sedi:ShaderProgram,
                         advect:ShaderProgram,
                         rains:ShaderProgram,
                         eva:ShaderProgram,
                         ave:ShaderProgram,
                         thermalterrainflux:ShaderProgram,
                         thermalapply:ShaderProgram,
                         maxslippageheight:ShaderProgram) {


    //////////////////////////////////////////////////////////////////
    //rain precipitation
    //0---use hight map to derive hight map : hight map -----> hight map
    //////////////////////////////////////////////////////////////////


    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);

    renderer.clear();
    rains.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(rains.prog,"readTerrain"),0);
    gl.uniform1f(gl.getUniformLocation(rains.prog,'raindeg'),controls.RainDegree);

    renderer.render(camera,rains,[square]);


    if(HightMapBufCounter % MaxHightMapBufCounter == 0) {
        gl.readPixels(0, 0, simres, simres, gl.RGBA, gl.FLOAT, HightMapCpuBuf);
    }
    HightMapBufCounter ++;

    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //swap terrain tex-----------------------------------------------

    let tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //swap terrain tex-----------------------------------------------


    //////////////////////////////////////////////////////////////////
    //1---use hight map to derive flux map : hight map -----> flux map
    //////////////////////////////////////////////////////////////////


    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_flux_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);

    renderer.clear();
    shader.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(shader.prog,"readTerrain"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_flux_tex);
    gl.uniform1i(gl.getUniformLocation(shader.prog,"readFlux"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(shader.prog,"readSedi"),2);

    renderer.render(camera,shader,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);



    //-----swap flux ping and pong


    tmp = read_flux_tex;
    read_flux_tex = write_flux_tex;
    write_flux_tex = tmp;

    //-----swap flux ping and pong

    //////////////////////////////////////////////////////////////////
    //2---use flux map and hight map to derive velocity map and new hight map :
    // hight map + flux map -----> velocity map + hight map
    //////////////////////////////////////////////////////////////////


    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,write_vel_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);

    renderer.clear();
    waterhight.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(waterhight.prog,"readTerrain"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_flux_tex);
    gl.uniform1i(gl.getUniformLocation(waterhight.prog,"readFlux"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(waterhight.prog,"readSedi"),2);


    renderer.render(camera,waterhight,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //-----swap terrain ping and pong and velocity ping pong

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    tmp = read_vel_tex;
    read_vel_tex = write_vel_tex;
    write_vel_tex = tmp;

    //-----swap flux ping and pong and velocity ping pong




    //////////////////////////////////////////////////////////////////
    //3---use velocity map, sediment map and hight map to derive sediment map and new hight map and velocity map :
    // hight map + velocity map + sediment map -----> sediment map + hight map + terrain normal map + velocity map
    //////////////////////////////////////////////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,write_sediment_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,terrain_nor,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,write_vel_tex,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1,gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);

    renderer.clear();
    sedi.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(sedi.prog,"readTerrain"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_vel_tex);
    gl.uniform1i(gl.getUniformLocation(sedi.prog,"readVelocity"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(sedi.prog,"readSediment"),2);

    renderer.render(camera,sedi,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //----------swap terrain and sediment map---------

    tmp = read_sediment_tex;
    read_sediment_tex = write_sediment_tex;
    write_sediment_tex = tmp;

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    tmp = read_vel_tex;
    read_vel_tex = write_vel_tex;
    write_vel_tex = tmp;

    //----------swap terrain and sediment map---------

    //////////////////////////////////////////////////////////////////
    // semi-lagrangian advection for sediment transportation
    // 4---use velocity map, sediment map to derive new sediment map :
    // velocity map + sediment map -----> sediment map
    //////////////////////////////////////////////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_sediment_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,write_vel_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,write_sediment_blend,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);


    renderer.clear();
    advect.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_vel_tex);
    gl.uniform1i(gl.getUniformLocation(advect.prog,"vel"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(advect.prog,"sedi"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_blend);
    gl.uniform1i(gl.getUniformLocation(advect.prog,"sediBlend"),2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(advect.prog,"terrain"),3);

    renderer.render(camera,advect,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //----------swap sediment map---------

    tmp = read_sediment_blend;
    read_sediment_blend = write_sediment_blend;
    write_sediment_blend = tmp;

    tmp = read_sediment_tex;
    read_sediment_tex = write_sediment_tex;
    write_sediment_tex = tmp;

    tmp = read_vel_tex;
    read_vel_tex = write_vel_tex;
    write_vel_tex = tmp;

    //----------swap sediment map---------

    //////////////////////////////////////////////////////////////////
    // maxslippage map generation
    // 4.5---use terrain map to derive new maxslippage map :
    // hight map -----> max slippage  map
    //////////////////////////////////////////////////////////////////


    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_maxslippage_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);


    renderer.clear();
    maxslippageheight.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(maxslippageheight.prog,"readTerrain"),0);



    renderer.render(camera,maxslippageheight,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //---------------------------------
    //swap maxslippage maps
    tmp = read_maxslippage_tex;
    read_maxslippage_tex = write_maxslippage_tex;
    write_maxslippage_tex = tmp;
    //--------------------------------


    //////////////////////////////////////////////////////////////////
    // thermal terrain flux map generation
    // 5---use velocity map, sediment map to derive new sediment map :
    // hight map -----> terrain flux map
    //////////////////////////////////////////////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_flux_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);


    renderer.clear();
    thermalterrainflux.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i( gl.getUniformLocation(thermalterrainflux.prog,"readTerrain"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_maxslippage_tex);
    gl.uniform1i(gl.getUniformLocation(thermalterrainflux.prog,"readMaxSlippage"),1);


    renderer.render(camera,thermalterrainflux,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //---------------------------------
    //swap terrain flux maps
    tmp = read_terrain_flux_tex;
    read_terrain_flux_tex = write_terrain_flux_tex;
    write_terrain_flux_tex = tmp;


    //////////////////////////////////////////////////////////////////
    // thermal erosion apply
    // 6---use terrain flux map to derive new terrain map :
    // terrain flux map -----> terrain map
    //////////////////////////////////////////////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);


    renderer.clear();
    thermalapply.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_flux_tex);
    gl.uniform1i(gl.getUniformLocation(thermalapply.prog,"readTerrainFlux"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(thermalapply.prog,"readTerrain"),1);


    renderer.render(camera,thermalapply,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //---------------swap terrain mao----------------------------

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //////////////////////////////////////////////////////////////////
    // water level evaporation at end of each iteration
    // 7---use terrain map to derive new terrain map :
    // terrain map -----> terrain map
    //////////////////////////////////////////////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);

    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);

    renderer.clear();
    eva.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(eva.prog,"terrain"),0);
    gl.uniform1f(gl.getUniformLocation(eva.prog,'evapod'),controls.EvaporationDegree);

    renderer.render(camera,eva,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);


    //---------------swap terrain mao----------------------------

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //---------------swap terrain mao----------------------------

    //////////////////////////////////////////////////////////////////
    // final average step : average terrain to avoid extremly sharp ridges or ravines
    // 6---use terrain map to derive new terrain map :
    //  terrain map -----> terrain map
    //////////////////////////////////////////////////////////////////
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,terrain_nor,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,null,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,null,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.log( "frame buffer status:" + status.toString());
    }

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);
    gl.viewport(0,0,simres,simres);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    renderer.clear();
    ave.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.uniform1i(gl.getUniformLocation(ave.prog,"readTerrain"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(ave.prog,"readSedi"),1);

    renderer.render(camera,ave,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    //---------------swap terrain mao----------------------------

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //---------------swap terrain mao----------------------------
}

function LE_create_texture(w : number, h : number, samplingType : number){
    let new_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,new_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplingType);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplingType);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return new_tex;
}



function setupFramebufferandtextures(gl:WebGL2RenderingContext) {


    //Noise generated data from GPU texture, include population density, water distribution, terrain elevation...
    read_terrain_tex = LE_create_texture(simres,simres,gl.LINEAR);
    write_terrain_tex = LE_create_texture(simres,simres,gl.LINEAR);

    read_flux_tex = LE_create_texture(simres,simres,gl.LINEAR);
    write_flux_tex = LE_create_texture(simres,simres,gl.LINEAR);

    read_terrain_flux_tex = LE_create_texture(simres,simres,gl.LINEAR);
    write_terrain_flux_tex = LE_create_texture(simres,simres,gl.LINEAR);

    read_maxslippage_tex =LE_create_texture(simres,simres,gl.LINEAR);
    write_maxslippage_tex = LE_create_texture(simres,simres,gl.LINEAR);

    read_vel_tex = LE_create_texture(simres,simres,gl.LINEAR);
    write_vel_tex = LE_create_texture(simres,simres,gl.LINEAR);

    read_sediment_tex = LE_create_texture(simres,simres,gl.LINEAR);
    write_sediment_tex = LE_create_texture(simres,simres,gl.LINEAR);

    terrain_nor = LE_create_texture(simres,simres,gl.LINEAR);

    read_sediment_blend = LE_create_texture(simres,simres,gl.LINEAR);
    write_sediment_blend = LE_create_texture(simres,simres,gl.LINEAR);

    shadowMap_tex = LE_create_texture(shadowMapResolution, shadowMapResolution,gl.LINEAR);
    scene_depth_tex = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);
    bilateral_filter_horizontal_tex = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);
    bilateral_filter_vertical_tex  = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);
    color_pass_tex = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);
    color_pass_reflection_tex = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);
    scatter_pass_tex = LE_create_texture(window.innerWidth,window.innerHeight,gl.LINEAR);

    shadowMap_frame_buffer = gl.createFramebuffer();
    shadowMap_render_buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER,shadowMap_render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        shadowMapResolution,shadowMapResolution);

    deferred_frame_buffer = gl.createFramebuffer();
    deferred_render_buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER,deferred_render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        window.innerWidth,window.innerHeight);

    frame_buffer = gl.createFramebuffer();
    render_buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);
}



function SimulationStep(curstep:number,
                        flow:ShaderProgram,
                        waterhight : ShaderProgram,
                        sediment : ShaderProgram,
                        advect:ShaderProgram,
                        rains:ShaderProgram,
                        evapo:ShaderProgram,
                        average:ShaderProgram,
                        thermalterrainflux:ShaderProgram,
                        thermalapply:ShaderProgram,
                        maxslippageheight : ShaderProgram,
                        renderer:OpenGLRenderer,
                        gl:WebGL2RenderingContext,camera:Camera){
    if(PauseGeneration) return true;
    else{
        SimulatePerStep(renderer,
            gl,camera,flow,waterhight,sediment,advect,rains,evapo,average,thermalterrainflux,thermalapply, maxslippageheight);
    }
    return false;
}

function handleInteraction (buttons : number, x : number, y : number){
    lastX = x;
    lastY = y;
    //console.log(x + ' ' + y);
}

function onKeyDown(event : KeyboardEvent){
    if(event.key == 'c'){
        controls.brushPressed = 1;
    }else{
        controls.brushPressed = 0;
    }

}

function onKeyUp(event : KeyboardEvent){
    if(event.key == 'c'){
        controls.brushPressed = 0;
    }
}

function main() {

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);


  // Add controls to the gui
  const gui = new DAT.GUI();
    var simcontrols = gui.addFolder('Simulation Controls');
    simcontrols.add(controls,'Start/Resume');
    simcontrols.add(controls,'Pause');
    simcontrols.add(controls,'Reset');
    simcontrols.open();
    var terrainParameters = gui.addFolder('Terrain Parameters');
    terrainParameters.add(controls,'TerrainScale', 0.00, 4.0);
    terrainParameters.add(controls,'TerrainHeight', 1.0, 2.0);
    terrainParameters.add(controls,'TerrainSphereMask',{ON : 0 ,OFF : 1});
    terrainParameters.add(controls,'TerrainBaseType', {ordinaryFBM : 0, domainWarp : 1, terrace : 2, voroni : 3});
    terrainParameters.open();
    var erosionpara = gui.addFolder('Erosion Parameters');
    erosionpara.add(controls, 'EvaporationDegree', 0.0001, 0.08);
    erosionpara.add(controls,'RainDegree', 0.1,5.0);
    erosionpara.add(controls,'Kc', 0.1,1.0);
    erosionpara.add(controls,'Ks', 0.001,0.1);
    erosionpara.add(controls,'Kd', 0.0001,0.1);
    erosionpara.add(controls, 'TerrainDebug', {noDebugView : 0, sediment : 1, velocity : 2, terrain : 3, flux : 4, terrainflux : 5, maxslippage : 6, flowMap : 7, spikeDiffusion : 8});
    erosionpara.open();
    var thermalerosionpara = gui.addFolder("Thermal Erosion Parameters");
    thermalerosionpara.add(controls,'talusAngleFallOffCoeff',0.0, 1.0 );
    thermalerosionpara.add(controls,'talusAngleTangentBias',0.0, 0.01 );
    thermalerosionpara.add(controls,'thermalRate',0.0, 1.0 );
    thermalerosionpara.add(controls,'thermalErosionScale',0.0, 10.0 );
    //thermalerosionpara.open();
    var terraineditor = gui.addFolder('Terrain Editor');
    terraineditor.add(controls,'brushType',{NoBrush : 0, TerrainBrush : 1, WaterBrush : 2});
    terraineditor.add(controls,'brushSize',0.1, 20.0);
    terraineditor.add(controls,'brushStrenth',0.1,2.0);
    terraineditor.add(controls,'brushOperation', {Add : 0, Subtract : 1});
    terraineditor.open();
    var renderingpara = gui.addFolder('Rendering Parameters');
    renderingpara.add(controls, 'WaterTransparency', 0.0, 1.0);
    renderingpara.add(controls, 'TerrainPlatte', {AlpineMtn : 0, Desert : 1, Jungle : 2});
    renderingpara.add(controls, 'SnowRange', 0.0, 100.0);
    renderingpara.add(controls, 'ForestRange', 0.0, 50.0);
    renderingpara.add(controls,'SedimentTrace',{ON : 0, OFF : 1});
    renderingpara.add(controls,'showScattering');
    renderingpara.add(controls,'enableBilateralBlur');
    var renderingparalightpos = renderingpara.addFolder('sunPos/Dir');
    renderingparalightpos.add(controls,'lightPosX',-1.0,1.0);
    renderingparalightpos.add(controls,'lightPosY',0.0,1.0);
    renderingparalightpos.add(controls,'lightPosZ',-1.0,1.0);
    renderingparalightpos.open();
    renderingpara.open();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  clientWidth = canvas.clientWidth;
  clientHeight = canvas.clientHeight;


  mouseChange(canvas, handleInteraction);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);

    if (!gl) {
    alert('WebGL 2 not supported!');
  }
    var extensions = gl.getSupportedExtensions();
    for(let e in extensions){
        console.log(e);
    }
  if(!gl.getExtension('OES_texture_float_linear')){
        console.log("float texture not supported");
    }
  if(!gl.getExtension('OES_texture_float')){
      console.log("no float texutre!!!?? y am i here?");
  }
  if(!gl.getExtension('EXT_color_buffer_float')) {
      console.log("cant render to float texture ");
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();


  const camera = new Camera(vec3.fromValues(0.18, 0.3, 0.6), vec3.fromValues(0, 0, 0));
  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.0, 0.0, 0.0, 0);
  gl.enable(gl.DEPTH_TEST);

  setupFramebufferandtextures(gl);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const noiseterrain = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/initial-frag.glsl')),
  ]);

  const flow = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/flow-frag.glsl')),
  ]);

  const waterhight = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/alterwaterhight-frag.glsl')),
  ]);

  const sediment = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/sediment-frag.glsl')),
  ]);

  const sediadvect = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/sediadvect-frag.glsl')),
  ]);

    const rains = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/rain-frag.glsl')),
    ]);


    const evaporation = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/eva-frag.glsl')),
    ]);

    const average = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/average-frag.glsl')),
    ]);

    const clean = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/clean-frag.glsl')),
    ]);

    const water = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/water-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/water-frag.glsl')),
    ]);

    const thermalterrainflux = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/thermalterrainflux-frag.glsl')),
    ]);

    const thermalapply = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/thermalapply-frag.glsl')),
    ]);


    const maxslippageheight = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/maxslippageheight-frag.glsl')),
    ]);

    const shadowMapShader = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/shadowmap-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/shadowmap-frag.glsl')),
    ]);

    const sceneDepthShader = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/sceneDepth-frag.glsl')),
    ]);

    const combinedShader = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/combine-frag.glsl')),
    ]);

    const bilateralBlur = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/quad-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/bilateralBlur-frag.glsl')),
    ]);



    let timer = 0;
    function cleanUpTextures(){
        Render2Texture(renderer, gl, camera, clean, read_terrain_tex);
        Render2Texture(renderer, gl, camera, clean, read_vel_tex);
        Render2Texture(renderer, gl, camera, clean, read_flux_tex);
        Render2Texture(renderer, gl, camera, clean, read_terrain_flux_tex);
        Render2Texture(renderer, gl, camera, clean, write_terrain_flux_tex);
        Render2Texture(renderer, gl, camera, clean, read_maxslippage_tex);
        Render2Texture(renderer, gl, camera, clean, write_maxslippage_tex);
        Render2Texture(renderer, gl, camera, clean, read_sediment_tex);
        Render2Texture(renderer, gl, camera, clean, write_terrain_tex);
        Render2Texture(renderer, gl, camera, clean, write_vel_tex);
        Render2Texture(renderer, gl, camera, clean, write_flux_tex);
        Render2Texture(renderer, gl, camera, clean, write_sediment_tex);
        Render2Texture(renderer, gl, camera, clean, terrain_nor);
        Render2Texture(renderer, gl, camera, clean, read_sediment_blend);
        Render2Texture(renderer, gl, camera, clean, write_sediment_blend);
    }

    function rayCast(ro : vec3, rd : vec3){

        let res = vec2.fromValues(-10.0, -10.0);
        let cur = ro;
        let step = 0.01;
        for(let i = 0;i<100;++i){
            let curTexSpace = vec2.fromValues((cur[0] + .50)/1.0, (cur[2] + .50)/1.0);
            let scaledTexSpace = vec2.fromValues(curTexSpace[0] * simres, curTexSpace[1] * simres);
            vec2.floor(scaledTexSpace,scaledTexSpace);
            let hvalcoordinate = scaledTexSpace[1] * simres * 4 + scaledTexSpace[0] * 4 + 0;
            let hval = HightMapCpuBuf[hvalcoordinate];
            if(cur[1] <  hval/simres){
                res = curTexSpace;
                //console.log(curTexSpace);
                break;

            }
            let rdscaled = vec3.fromValues(rd[0] * step, rd[1] * step, rd[2] * step);

            vec3.add(cur,cur,rdscaled);
        }

        return res;
    }

  function tick() {


    // ================ ray casting ===================
    //===================================================
    let iclientWidth = window.innerWidth;
    let iclientHeight = window.innerHeight;
    var screenMouseX = lastX / iclientWidth;
    var screenMouseY = lastY / iclientHeight;
    //console.log(screenMouseX + ' ' + screenMouseY);

      //console.log(clientHeight + ' ' + clientWidth);
    let viewProj = mat4.create();
    let invViewProj = mat4.create();
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    mat4.invert(invViewProj,viewProj);
    let mousePoint = vec4.fromValues(2.0 * screenMouseX - 1.0, 1.0 - 2.0 * screenMouseY, -1.0, 1.0);
    let mousePointEnd = vec4.fromValues(2.0 * screenMouseX - 1.0, 1.0 - 2.0 * screenMouseY, -0.0, 1.0);

    vec4.transformMat4(mousePoint,mousePoint,invViewProj);
    vec4.transformMat4(mousePointEnd,mousePointEnd,invViewProj);
    mousePoint[0] /= mousePoint[3];
    mousePoint[1] /= mousePoint[3];
    mousePoint[2] /= mousePoint[3];
    mousePoint[3] /= mousePoint[3];
    mousePointEnd[0] /= mousePointEnd[3];
    mousePointEnd[1] /= mousePointEnd[3];
    mousePointEnd[2] /= mousePointEnd[3];
    mousePointEnd[3] /= mousePointEnd[3];
    let dir = vec3.fromValues(mousePointEnd[0] - mousePoint[0], mousePointEnd[1] - mousePoint[1], mousePointEnd[2] - mousePoint[2]);
    vec3.normalize(dir,dir);
    let ro = vec3.fromValues(mousePoint[0], mousePoint[1], mousePoint[2]);


    //==========set initial terrain uniforms=================
    timer++;
    noiseterrain.setTime(timer);
    noiseterrain.setTerrainHeight(controls.TerrainHeight);
    noiseterrain.setTerrainScale(controls.TerrainScale);
    noiseterrain.setInt(controls.TerrainSphereMask,"u_TerrainSphereMask");
    gl.uniform1i(gl.getUniformLocation(noiseterrain.prog,"u_terrainBaseType"),controls.TerrainBaseType);


    if(TerrainGeometryDirty){

        cleanUpTextures();
        Render2Texture(renderer,gl,camera,noiseterrain,read_terrain_tex);
        Render2Texture(renderer,gl,camera,noiseterrain,write_terrain_tex);

        TerrainGeometryDirty = false;
    }

    //ray cast happens here
    let pos = vec2.fromValues(0.0, 0.0);
    pos = rayCast(ro, dir);

    //===================per tick uniforms==================


    flat.setTime(timer);

    gl.uniform1f(gl.getUniformLocation(flat.prog,"u_far"),camera.far);
    gl.uniform1f(gl.getUniformLocation(flat.prog,"u_near"),camera.near);
    gl.uniform3fv(gl.getUniformLocation(flat.prog,"unif_LightPos"),vec3.fromValues(controls.lightPosX,controls.lightPosY,controls.lightPosZ));

    water.setWaterTransparency(controls.WaterTransparency);
    water.setSimres(simresolution);
    gl.uniform1f(gl.getUniformLocation(water.prog,"u_far"),camera.far);
    gl.uniform1f(gl.getUniformLocation(water.prog,"u_near"),camera.near);
    gl.uniform3fv(gl.getUniformLocation(water.prog,"unif_LightPos"),vec3.fromValues(controls.lightPosX,controls.lightPosY,controls.lightPosZ));

    lambert.setTerrainDebug(controls.TerrainDebug);
    lambert.setMouseWorldPos(mousePoint);
    lambert.setMouseWorldDir(dir);
    lambert.setBrushSize(controls.brushSize);
    lambert.setBrushType(controls.brushType);
    lambert.setBrushPos(pos);
    lambert.setSimres(simresolution);
    lambert.setFloat(controls.SnowRange, "u_SnowRange");
    lambert.setFloat(controls.ForestRange, "u_ForestRange");
    lambert.setInt(controls.TerrainPlatte, "u_TerrainPlatte");
    lambert.setInt(controls.SedimentTrace,"u_SedimentTrace");
    gl.uniform3fv(gl.getUniformLocation(lambert.prog,"unif_LightPos"),vec3.fromValues(controls.lightPosX,controls.lightPosY,controls.lightPosZ));

    sceneDepthShader.setSimres(simresolution);

    rains.setMouseWorldPos(mousePoint);
    rains.setMouseWorldDir(dir);
    rains.setBrushSize(controls.brushSize);
    rains.setBrushStrength(controls.brushStrenth);
    rains.setBrushType(controls.brushType);
    rains.setBrushPressed(controls.brushPressed);
    rains.setBrushPos(pos);
    rains.setBrushOperation(controls.brushOperation);
    rains.setSpawnPos(vec2.fromValues(controls.spawnposx, controls.spawnposy));
    rains.setTime(timer);

    flow.setPipeLen(controls.pipelen);
    flow.setSimres(simresolution);
    flow.setTimestep(controls.timestep);
    flow.setPipeArea(controls.pipeAra);

    waterhight.setPipeLen(controls.pipelen);
    waterhight.setSimres(simresolution);
    waterhight.setTimestep(controls.timestep);
    waterhight.setPipeArea(controls.pipeAra);

    sediment.setSimres(simresolution);
    sediment.setPipeLen(controls.pipelen);
    sediment.setKc(controls.Kc);
    sediment.setKs(controls.Ks);
    sediment.setKd(controls.Kd);
    sediment.setTimestep(controls.timestep)

    sediadvect.setSimres(simresolution);
    sediadvect.setPipeLen(controls.pipelen);
    sediadvect.setKc(controls.Kc);
    sediadvect.setKs(controls.Ks);
    sediadvect.setKd(controls.Kd);
    sediadvect.setTimestep(controls.timestep);

    thermalterrainflux.setSimres(simresolution);
    thermalterrainflux.setPipeLen(controls.pipelen);
    thermalterrainflux.setTimestep(controls.timestep);
    thermalterrainflux.setPipeArea(controls.pipeAra);
    gl.uniform1f(gl.getUniformLocation(thermalterrainflux.prog,"unif_talusAngleFallOffCoeff"),controls.talusAngleFallOffCoeff);
    gl.uniform1f(gl.getUniformLocation(thermalterrainflux.prog,"unif_talusAngleTangentBias"),controls.talusAngleTangentBias);
    gl.uniform1f(gl.getUniformLocation(thermalterrainflux.prog,"unif_thermalRate"),controls.thermalRate);

    thermalapply.setSimres(simresolution);
    thermalapply.setPipeLen(controls.pipelen);
    thermalapply.setTimestep(controls.timestep);
    thermalapply.setPipeArea(controls.pipeAra);
    gl.uniform1f(gl.getUniformLocation(thermalapply.prog,"unif_thermalErosionScale"),controls.thermalErosionScale);

    maxslippageheight.setSimres(simresolution);
    maxslippageheight.setPipeLen(controls.pipelen);
    maxslippageheight.setTimestep(controls.timestep);
    maxslippageheight.setPipeArea(controls.pipeAra);

    average.setSimres(simresolution);

    camera.update();
    stats.begin();

      //==========================  we begin simulation from now ===========================================

    for(let i = 0;i<speed;i++) {
        SimulationStep(SimFramecnt, flow, waterhight, sediment, sediadvect,rains,evaporation,average,thermalterrainflux, thermalapply, maxslippageheight, renderer, gl, camera);
        SimFramecnt++;
    }

    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    //========================== we enter a series of render pass from now ================================
    //========================== pass 1 : render shadow map pass=====================================


      gl.bindFramebuffer(gl.FRAMEBUFFER,shadowMap_frame_buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shadowMap_tex,0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,shadowMap_render_buffer);

      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
          console.log( "frame buffer status:" + status.toString());
      }

      gl.bindTexture(gl.TEXTURE_2D,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.bindRenderbuffer(gl.RENDERBUFFER,null);

      gl.viewport(0,0,shadowMapResolution,shadowMapResolution);
      gl.bindFramebuffer(gl.FRAMEBUFFER,shadowMap_frame_buffer);
      renderer.clear();// clear when attached to shadow map
      shadowMapShader.use();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
      gl.uniform1i(gl.getUniformLocation(shadowMapShader.prog,"hightmap"),0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, read_sediment_tex);
      gl.uniform1i(gl.getUniformLocation(shadowMapShader.prog, "sedimap"), 1);

      let lightViewMat = mat4.create();
      let lightProjMat = mat4.create();
      lightProjMat = mat4.ortho(lightProjMat,-0.6,0.6,-0.6,0.6,0,100);
      lightViewMat = mat4.lookAt(lightViewMat, [controls.lightPosX,controls.lightPosY,controls.lightPosZ],[0,0,0],[0,1,0]);

      gl.uniformMatrix4fv(gl.getUniformLocation(shadowMapShader.prog,'u_proj'),false,lightProjMat);
      gl.uniformMatrix4fv(gl.getUniformLocation(shadowMapShader.prog,'u_view'),false,lightViewMat);
      shadowMapShader.setSimres(simres);

      renderer.render(camera,shadowMapShader,[plane]);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);


      //=========================== pass 2 :  render scene depth tex ================================
      sceneDepthShader.use();
      gl.bindFramebuffer(gl.FRAMEBUFFER,deferred_frame_buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,scene_depth_tex,0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,deferred_render_buffer);

      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
          console.log( "frame buffer status:" + status.toString());
      }

      renderer.clear();// clear when attached to scene depth map
      gl.viewport(0,0,window.innerWidth, window.innerHeight);
      renderer.render(camera, sceneDepthShader, [
          plane,
      ]);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //============================= pass 3 : render terrain and water geometry ================================================
    //============ terrain geometry =========
    gl.bindFramebuffer(gl.FRAMEBUFFER,deferred_frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color_pass_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,color_pass_reflection_tex,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,deferred_render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.log( "frame buffer status:" + status.toString());
    }
    renderer.clear();

    lambert.use();
    gl.viewport(0,0,window.innerWidth, window.innerHeight);
    //plane.setDrawMode(gl.LINE_STRIP);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    let PingUniform = gl.getUniformLocation(lambert.prog,"hightmap");
    gl.uniform1i(PingUniform,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,terrain_nor);
    let norUniform = gl.getUniformLocation(lambert.prog,"normap");
    gl.uniform1i(norUniform,1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, read_sediment_tex);
    let sediUniform = gl.getUniformLocation(lambert.prog, "sedimap");
    gl.uniform1i(sediUniform, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, read_vel_tex);
    let velUniform = gl.getUniformLocation(lambert.prog, "velmap");
    gl.uniform1i(velUniform, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, read_flux_tex);
    let fluxUniform = gl.getUniformLocation(lambert.prog, "fluxmap");
    gl.uniform1i(fluxUniform, 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, read_terrain_flux_tex);
    let terrainfluxUniform = gl.getUniformLocation(lambert.prog, "terrainfluxmap");
    gl.uniform1i(terrainfluxUniform, 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, read_maxslippage_tex);
    let terrainslippageUniform = gl.getUniformLocation(lambert.prog, "maxslippagemap");
    gl.uniform1i(terrainslippageUniform, 6);

    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, read_sediment_blend);
    gl.uniform1i(gl.getUniformLocation(lambert.prog, "sediBlend"), 7);


    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, shadowMap_tex);
    gl.uniform1i(gl.getUniformLocation(lambert.prog, "shadowMap"), 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, scene_depth_tex);
    gl.uniform1i(gl.getUniformLocation(lambert.prog, "sceneDepth"), 9);

    gl.uniformMatrix4fv(gl.getUniformLocation(lambert.prog,'u_sproj'),false,lightProjMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(lambert.prog,'u_sview'),false,lightViewMat);


      renderer.render(camera, lambert, [
      plane,
    ]);

    // =============== water =====================
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    water.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    PingUniform = gl.getUniformLocation(water.prog,"hightmap");
    gl.uniform1i(PingUniform,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,terrain_nor);
    norUniform = gl.getUniformLocation(water.prog,"normap");
    gl.uniform1i(norUniform,1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    sediUniform = gl.getUniformLocation(water.prog,"sedimap");
    gl.uniform1i(sediUniform,2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D,scene_depth_tex);
    gl.uniform1i(gl.getUniformLocation(water.prog,"sceneDepth"),3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D,color_pass_reflection_tex);
    gl.uniform1i(gl.getUniformLocation(water.prog,"colorReflection"),4);


      renderer.render(camera, water, [
      plane,
    ]);

    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    // ======================== pass 4 : back ground & post processing & rayleigh mie scattering ==================================

    gl.bindFramebuffer(gl.FRAMEBUFFER,deferred_frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,scatter_pass_tex,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,deferred_render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.log( "frame buffer status:" + status.toString());
    }

    renderer.clear();// clear when attached to scene depth map
    gl.viewport(0,0,window.innerWidth, window.innerHeight);

    flat.use();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read_sediment_tex);
    gl.uniform1i(gl.getUniformLocation(flat.prog,"hightmap"),0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, scene_depth_tex);
    gl.uniform1i(gl.getUniformLocation(flat.prog,"sceneDepth"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, shadowMap_tex);
    gl.uniform1i(gl.getUniformLocation(flat.prog,"shadowMap"),2);

    gl.uniformMatrix4fv(gl.getUniformLocation(flat.prog,'u_sproj'),false,lightProjMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(flat.prog,'u_sview'),false,lightViewMat);
    gl.uniform1i(gl.getUniformLocation(flat.prog,"u_showScattering"),controls.showScattering ? 1 : 0);

    renderer.render(camera, flat, [
      square,
    ]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


    // ======================== pass 5 : bilateral blurring pass ==================================
      if(controls.enableBilateralBlur) {
          let NumBlurPass = 4;
          for (let i = 0; i < NumBlurPass; ++i) {

              gl.bindFramebuffer(gl.FRAMEBUFFER, deferred_frame_buffer);
              gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bilateral_filter_horizontal_tex, 0);
              gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, deferred_render_buffer);

              gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

              status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
              if (status !== gl.FRAMEBUFFER_COMPLETE) {
                  console.log("frame buffer status:" + status.toString());
              }

              renderer.clear();// clear when attached to scene depth map

              bilateralBlur.use();
              gl.activeTexture(gl.TEXTURE0);
              if (i == 0) {
                  gl.bindTexture(gl.TEXTURE_2D, scatter_pass_tex);
              } else {
                  gl.bindTexture(gl.TEXTURE_2D, bilateral_filter_vertical_tex);
              }
              gl.uniform1i(gl.getUniformLocation(bilateralBlur.prog, "scatter_tex"), 0);

              gl.activeTexture(gl.TEXTURE1);
              gl.bindTexture(gl.TEXTURE_2D, scene_depth_tex);
              gl.uniform1i(gl.getUniformLocation(bilateralBlur.prog, "scene_depth"), 1);

              gl.uniform1f(gl.getUniformLocation(bilateralBlur.prog, "u_far"), camera.far);
              gl.uniform1f(gl.getUniformLocation(bilateralBlur.prog, "u_near"), camera.near);

              gl.uniform1i(gl.getUniformLocation(bilateralBlur.prog, "u_isHorizontal"), i % 2);


              renderer.render(camera, bilateralBlur, [
                  square,
              ]);

              let tmp = bilateral_filter_horizontal_tex;
              bilateral_filter_horizontal_tex = bilateral_filter_vertical_tex;
              bilateral_filter_vertical_tex = tmp;

              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          }
      }

    // ===================================== pass 6 : combination pass =====================================================================
    combinedShader.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, color_pass_tex);
    gl.uniform1i(gl.getUniformLocation(combinedShader.prog,"color_tex"),0);

    gl.activeTexture(gl.TEXTURE1);
    if(controls.enableBilateralBlur)
        gl.bindTexture(gl.TEXTURE_2D, bilateral_filter_horizontal_tex);
    else
        gl.bindTexture(gl.TEXTURE_2D, scatter_pass_tex);
    gl.uniform1i(gl.getUniformLocation(combinedShader.prog,"bi_tex"),1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, scene_depth_tex);
    gl.uniform1i(gl.getUniformLocation(combinedShader.prog,"sceneDepth_tex"),2);

    renderer.clear();
    renderer.render(camera, combinedShader, [
      square,
    ]);

    gl.disable(gl.BLEND);
    //gl.disable(gl.DEPTH_TEST);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {

    gl.bindRenderbuffer(gl.RENDERBUFFER,deferred_render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
      window.innerWidth,window.innerHeight);

    gl.bindTexture(gl.TEXTURE_2D,color_pass_reflection_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
      gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D,scatter_pass_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
      gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D,color_pass_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
      gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D,bilateral_filter_vertical_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
      gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D,bilateral_filter_horizontal_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
      gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D,scene_depth_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,window.innerWidth,window.innerHeight,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
