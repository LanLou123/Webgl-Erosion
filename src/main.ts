import {vec2, vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Plane from './geometry/Plane';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.

const simresolution = 1000;
let erosioninterations = 12000;
let speed = 10;
const div = 1/simresolution;


const controls = {
  tesselations: 5,
    pipelen: div/100,
    Kc : 0.01,
    Ks : 0.00002,//larger will induce axis aligning problem, really annoying
    Kd : 0.00004,
    timestep : 0.0001,
    pipeAra : div*div/1,

  'Load Scene': loadScene, // A function pointer, essentially
};


//geometries
let square: Square;
let plane : Plane;
//simulation variables
// texture structure : R : terrain hight map, G : water carrying, B : sediment carrying
let simres : number = simresolution;
let frame_buffer : WebGLFramebuffer;
let read_terrain_tex : WebGLTexture;
let write_terrain_tex : WebGLTexture;
let read_flux_tex : WebGLTexture;
let write_flux_tex : WebGLTexture;
let read_vel_tex : WebGLTexture;
let write_vel_tex : WebGLTexture;
let read_sediment_tex : WebGLTexture;
let write_sediment_tex : WebGLTexture;
let render_buffer : WebGLRenderbuffer;
let terrain_nor : WebGLTexture;
let num_simsteps : number;

function loadScene() {
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(100,100), 22);
  plane.create();

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
                         eva:ShaderProgram) {


    //////////////////////////////////////////////////////////////////
    //rain precipitation
    //0---use hight map to derive hight map : hight map -----> hight map
    //////////////////////////////////////////////////////////////////

    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);


    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
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
    let readUnifr = gl.getUniformLocation(rains.prog,"read");
    gl.uniform1i(readUnifr,0);

    renderer.render(camera,rains,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //////////////////////////////////////////////////////////////////
    //rain precipitation
    //0---use hight map to derive hight map : hight map -----> hight map
    //////////////////////////////////////////////////////////////////

    //swap terrain tex-----------------------------------------------

    let tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //swap terrain tex-----------------------------------------------


    //////////////////////////////////////////////////////////////////
    //1---use hight map to derive flux map : hight map -----> flux map
    //////////////////////////////////////////////////////////////////
    
    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_flux_tex,0);
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
    let readUnif = gl.getUniformLocation(shader.prog,"read");
    gl.uniform1i(readUnif,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_flux_tex);
    let readfluxUniff = gl.getUniformLocation(shader.prog,"flux");
    gl.uniform1i(readfluxUniff,1);

    renderer.render(camera,shader,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //////////////////////////////////////////////////////////////////
    //1---use hight map to derive flux map : hight map -----> flux map
    //////////////////////////////////////////////////////////////////
    
    
    //-----swap flux ping and pong


    tmp = read_flux_tex;
    read_flux_tex = write_flux_tex;
    write_flux_tex = tmp;
    
    //-----swap flux ping and pong

    //////////////////////////////////////////////////////////////////
    //2---use flux map and hight map to derive velocity map and new hight map :
    // hight map + flux map -----> velocity map + hight map
    //////////////////////////////////////////////////////////////////
    
    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,write_vel_tex,0);
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
    let readterrainUnifw = gl.getUniformLocation(waterhight.prog,"read");
    gl.uniform1i(readterrainUnifw,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_flux_tex);
    let readfluxUnifw = gl.getUniformLocation(waterhight.prog,"readflux");
    gl.uniform1i(readfluxUnifw,1);


    renderer.render(camera,waterhight,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //////////////////////////////////////////////////////////////////
    //2---use flux map and hight map to derive velocity map and new hight map :
    // hight map + flux map -----> velocity map + hight map
    //////////////////////////////////////////////////////////////////

    //-----swap terrain ping and pong and velocity ping pong

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    tmp = read_vel_tex;
    read_vel_tex = write_vel_tex;
    write_vel_tex = tmp;

    //-----swap flux ping and pong and velocity ping pong

    //////////////////////////////////////////////////////////////////
    //3---use velocity map, sediment map and hight map to derive sediment map and new hight map :
    // hight map + velocity map + sediment map -----> sediment map + hight map + terrain normal map
    //////////////////////////////////////////////////////////////////

    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,write_sediment_tex,0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,terrain_nor,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,render_buffer);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1,gl.COLOR_ATTACHMENT2]);

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
    let readterrainUnifs = gl.getUniformLocation(sedi.prog,"read");
    gl.uniform1i(readterrainUnifs,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_vel_tex);
    let readvelUnifs = gl.getUniformLocation(sedi.prog,"vel");
    gl.uniform1i(readvelUnifs,1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    let readsediUnifs = gl.getUniformLocation(sedi.prog,"sedi");
    gl.uniform1i(readsediUnifs,2);

    renderer.render(camera,sedi,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //////////////////////////////////////////////////////////////////
    //3---use velocity map, sediment map and hight map to derive sediment map and new hight map :
    // hight map + velocity map + sediment map -----> sediment map + hight map
    //////////////////////////////////////////////////////////////////

    //----------swap terrain and sediment map---------

    tmp = read_sediment_tex;
    read_sediment_tex = write_sediment_tex;
    write_sediment_tex = tmp;

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //----------swap terrain and sediment map---------

    //////////////////////////////////////////////////////////////////
    // semi-lagrangian advection for sediment transportation
    // 4---use velocity map, sediment map to derive new sediment map :
    // velocity map + sediment map -----> sediment map
    //////////////////////////////////////////////////////////////////

    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_sediment_tex,0);
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
    advect.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_vel_tex);
    let readvelUnifa = gl.getUniformLocation(advect.prog,"vel");
    gl.uniform1i(readvelUnifa,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    let readsediUnifa = gl.getUniformLocation(advect.prog,"sedi");
    gl.uniform1i(readsediUnifa,1);

    renderer.render(camera,advect,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //----------swap sediment map---------

    tmp = read_sediment_tex;
    read_sediment_tex = write_sediment_tex;
    write_sediment_tex = tmp;

    //----------swap sediment map---------

    //////////////////////////////////////////////////////////////////
    // water level evaporation at end of each iteration
    // 5---use terrain map to derive new terrain map :
    // terrain map -----> terrain map
    //////////////////////////////////////////////////////////////////

    gl.bindRenderbuffer(gl.RENDERBUFFER,render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,
        simres,simres);

    gl.bindFramebuffer(gl.FRAMEBUFFER,frame_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,write_terrain_tex,0);
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
    let readterrainUnife = gl.getUniformLocation(eva.prog,"terrain");
    gl.uniform1i(readterrainUnife,0);

    renderer.render(camera,eva,[square]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);

    //////////////////////////////////////////////////////////////////
    // water level evaporation at end of each iteration
    // 5---use terrain map to derive new terrain map :
    // terrain map -----> terrain map
    //////////////////////////////////////////////////////////////////

    //---------------swap terrain mao----------------------------

    tmp = read_terrain_tex;
    read_terrain_tex = write_terrain_tex;
    write_terrain_tex = tmp;

    //---------------swap terrain mao----------------------------

}



function setupFramebufferandtextures(gl:WebGL2RenderingContext) {
    frame_buffer = gl.createFramebuffer();

    //Noise generated data from GPU texture, include population density, water distribution, terrain elevation...
    read_terrain_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    write_terrain_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,write_terrain_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    read_flux_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,read_flux_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    write_flux_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,write_flux_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    read_vel_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,read_vel_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    write_vel_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,write_vel_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    read_sediment_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,read_sediment_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    write_sediment_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,write_sediment_tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    terrain_nor = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,terrain_nor);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,simres,simres,0,
        gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //specify our render buffer here
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
                        renderer:OpenGLRenderer, 
                        gl:WebGL2RenderingContext,camera:Camera){
    if(curstep>num_simsteps) return true;
    else{
        SimulatePerStep(renderer,
            gl,camera,flow,waterhight,sediment,advect,rains,evapo);
    }
    return false;
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

  gui.add(controls,"pipelen",div/20,div*4).step(div/20);
  gui.add(controls,'Kc',0.0,.1).step(0.0001);
  gui.add(controls,'Ks',0.0,.1).step(0.0001);
  gui.add(controls,'Kd',0.0,.1).step(0.0001);
  gui.add(controls,'timestep',0.0000001,.001).step(0.0000001);
  gui.add(controls,'pipeAra',0.01*div*div,2*div*div).step(0.01*div*div);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');

    if (!gl) {
    alert('WebGL 2 not supported!');
  }
  if(!gl.getExtension('OES_texture_float_linear')){
        console.log("float texture not supported");
    }
  if(!gl.getExtension('EXT_color_buffer_float')){
        console.log("cant render to float texture because ur browser is stupid...");
    }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();
  num_simsteps = erosioninterations;

  const camera = new Camera(vec3.fromValues(0, 50, -60), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(164.0 / 255.0, 233.0 / 255.0, 1.0, 1);
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
      new Shader(gl.VERTEX_SHADER, require('./shaders/initial-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/initial-frag.glsl')),
  ]);

  const flow = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/flow-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/flow-frag.glsl')),
  ]);
  
  const waterhight = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/alterwaterhight-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/alterwaterhight-frag.glsl')),
  ]);

  const sediment = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/sediment-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/sediment-frag.glsl')),
  ]);

  const sediadvect = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/sediadvect-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/sediadvect-frag.glsl')),
  ]);

    const rains = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/rain-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/rain-frag.glsl')),
    ]);


    const evaporation = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/eva-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/eva-frag.glsl')),
    ]);


    Render2Texture(renderer,gl,camera,noiseterrain,read_terrain_tex);


  let cnt = 0;
  let t = 0;
  // This function will be called every frame
  function tick() {



    flow.setPipeLen(controls.pipelen);
    flow.setSimres(simresolution);
    flow.setTimestep(controls.timestep);
    flow.setPipeArea(controls.pipeAra);

    waterhight.setPipeLen(controls.pipelen);
    waterhight.setSimres(simresolution);
    waterhight.setTimestep(controls.timestep)
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




    t++;
    camera.update();
    stats.begin();

    if(t%1==0){
        for(let i = 0;i<speed;i++) {
            SimulationStep(cnt, flow, waterhight, sediment, sediadvect,rains,evaporation, renderer, gl, camera);
            cnt++;
            console.log(cnt);
        }
    }



    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();




    lambert.use();
    //plane.setDrawMode(gl.LINE_STRIP);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    let PingUniform = gl.getUniformLocation(lambert.prog,"hightmap");
    gl.uniform1i(PingUniform,0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,terrain_nor);
    let norUniform = gl.getUniformLocation(lambert.prog,"normap");
    gl.uniform1i(norUniform,1);

    renderer.render(camera, lambert, [
      plane,
    ]);


    flat.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,read_terrain_tex);
    let postUniform = gl.getUniformLocation(flat.prog,"hightmap");
    gl.uniform1i(postUniform,0);
    renderer.render(camera, flat, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
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
