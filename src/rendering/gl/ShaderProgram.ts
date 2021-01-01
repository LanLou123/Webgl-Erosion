import {vec2, vec4, mat4, vec3} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;
  attrUv : number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifPlanePos: WebGLUniformLocation;
  unifSpanwPos: WebGLUniformLocation;

  unifSimRes : WebGLUniformLocation;
  unifPipeLen : WebGLUniformLocation;
  unifKs : WebGLUniformLocation;
  unifKc : WebGLUniformLocation;
  unifKd : WebGLUniformLocation;
  unifTimestep : WebGLUniformLocation;
  unifPipeArea : WebGLUniformLocation;

  unifRef: WebGLUniformLocation;
  unifEye: WebGLUniformLocation;
  unifUp: WebGLUniformLocation;
  unifDimensions: WebGLUniformLocation;
  unifTime : WebGLUniformLocation;
  unifWaterTransparency : WebGLUniformLocation;

  unifRndTerrain : WebGLUniformLocation;
  unifTerrainType : WebGLUniformLocation;
  unifTerrainDebug : WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUv  = gl.getAttribLocation(this.prog,"vs_Uv");
    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifPlanePos   = gl.getUniformLocation(this.prog, "u_PlanePos");
    this.unifSpanwPos = gl.getUniformLocation(this.prog, "u_SpawnPos");

    this.unifSimRes = gl.getUniformLocation(this.prog, "u_SimRes");
    this.unifPipeLen = gl.getUniformLocation(this.prog, "u_PipeLen");
    this.unifKs = gl.getUniformLocation(this.prog, "u_Ks");
    this.unifKc = gl.getUniformLocation(this.prog, "u_Kc");
    this.unifKd = gl.getUniformLocation(this.prog, "u_Kd");
    this.unifTimestep = gl.getUniformLocation(this.prog, "u_timestep");
    this.unifPipeArea = gl.getUniformLocation(this.prog,"u_PipeArea");

    this.unifEye   = gl.getUniformLocation(this.prog, "u_Eye");
    this.unifRef   = gl.getUniformLocation(this.prog, "u_Ref");
    this.unifUp   = gl.getUniformLocation(this.prog, "u_Up");
    this.unifDimensions = gl.getUniformLocation(this.prog,"u_Dimensions");
    this.unifTime = gl.getUniformLocation(this.prog,"u_Time");
    this.unifWaterTransparency = gl.getUniformLocation(this.prog,"u_WaterTransparency");


    this.unifRndTerrain = gl.getUniformLocation(this.prog,"u_RndTerrain");
    this.unifTerrainType = gl.getUniformLocation(this.prog,"u_TerrainType");
    this.unifTerrainDebug = gl.getUniformLocation(this.prog,"u_TerrainDebug");
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setTime(t:number){
    this.use();
    if(this.unifTime!==-1){
      gl.uniform1f(this.unifTime,t);
    }
  }

  setWaterTransparency(t:number){
    this.use();
    if(this.unifWaterTransparency!==-1){
      gl.uniform1f(this.unifWaterTransparency,t);
    }
  }

    setDimensions(width: number, height: number) {
        this.use();
        if(this.unifDimensions !== -1) {
            gl.uniform2f(this.unifDimensions, width, height);
        }
    }

    setTerrainType(t:number){
    this.use();
    if(this.unifTerrainType!==-1){
      gl.uniform1i(this.unifTerrainType,t);
    }
    }


  setTerrainDebug(t:number){
    this.use();
    if(this.unifTerrainDebug!==-1){
      gl.uniform1i(this.unifTerrainDebug,t);
    }
  }

  setSpawnPos(pos: vec2) {
    this.use();
    if (this.unifSpanwPos !== -1) {
      gl.uniform2fv(this.unifSpanwPos, pos);
    }
  }

    setRndTerrain(r:number){
    this.use();
    if(this.unifRndTerrain!==-1){
      gl.uniform1i(this.unifRndTerrain,r);
    }
    }
  setPlanePos(pos: vec2) {
    this.use();
    if (this.unifPlanePos !== -1) {
      gl.uniform2fv(this.unifPlanePos, pos);
    }
  }
    setEyeRefUp(eye: vec3, ref: vec3, up: vec3) {
        this.use();
        if(this.unifEye !== -1) {
            gl.uniform3f(this.unifEye, eye[0], eye[1], eye[2]);
        }
        if(this.unifRef !== -1) {
            gl.uniform3f(this.unifRef, ref[0], ref[1], ref[2]);
        }
        if(this.unifUp !== -1) {
            gl.uniform3f(this.unifUp, up[0], up[1], up[2]);
        }
    }
  setPipeLen(len : number){
    this.use();
    if(this.unifPipeLen!==-1){
      gl.uniform1f(this.unifPipeLen,len);
    }
  }

  setKs(k :number){
    this.use();
    if(this.unifKs!==-1){
      gl.uniform1f(this.unifKs,k);
    }
  }

  setKc(k :number){
      this.use();
      if(this.unifKc!==-1){
          gl.uniform1f(this.unifKc,k);
      }
  }

  setTimestep(t:number){
    this.use();
    if(this.unifTimestep!==-1){
      gl.uniform1f(this.unifTimestep,t);
    }
  }

  setPipeArea(a:number){
    this.use();
    if(this.unifPipeArea!==-1){
      gl.uniform1f(this.unifPipeArea,a);
    }
  }

  setKd(k :number){
      this.use();
      if(this.unifKd!==-1){
          gl.uniform1f(this.unifKd,k);
      }
  }

  setSimres(res:number){
    this.use();
    if(this.unifSimRes!==-1){
      gl.uniform1f(this.unifSimRes,res);
    }
  }



  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    if(this.attrUv != -1 && d.bindUv()){
      gl.enableVertexAttribArray(this.attrUv);
      gl.vertexAttribPointer(this.attrUv,2, gl.FLOAT,false,0,0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrUv != -1) gl.disableVertexAttribArray(this.attrUv);
  }
};

export default ShaderProgram;
