import * as THREE from 'three';
// @ts-ignore
import { PerspectiveCamera } from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

import {vec3, mat4} from 'gl-matrix';
// @ts-ignore

import {Vector3} from "three";




class Camera {

  threeControls : any;
  threeCamera : any;

  worldUp : vec3 = vec3.fromValues(0,1,0);
  projectionMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.01;
  far: number = 500;
  position: vec3 = vec3.create();
  direction: vec3 = vec3.create();
  target: vec3 = vec3.create();
  up: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
  counter : number = 0;

  tposition : Vector3 = new Vector3(0,0,0);
  tdirection : Vector3 = new Vector3(0,0,0);
  tup : Vector3 = new  Vector3(0,0,0);

  constructor(position: vec3, target: vec3) {


    vec3.subtract(this.direction, target, position);

    this.tposition = new Vector3(position[0], position[1],position[2]);
    this.tdirection = new Vector3(this.direction[0], this.direction[1],this.direction[2]);
    this.tup = new Vector3(this.up[0], this.up[1],this.up[2]);



    this.threeCamera = new PerspectiveCamera(this.fovy,this.aspectRatio,this.near,this.far);
    this.threeCamera.position.set(position[0],position[1],position[2]);
    this.threeControls = new OrbitControls(this.threeCamera, document.getElementById('canvas'));

    // this.threeControls.enableZoom = true;
    // this.threeControls.rotateSpeed = 0.3;
    // this.threeControls.zoomSpeed = 1.0;
    // this.threeControls.panSpeed = 2.0;
    // this.threeControls.target.set(target);
    this.threeControls.enableDamping = true;
    this.threeControls.dampingFactor = 0.08;
    console.log( this.threeCamera.position);



    this.threeControls.update();


    vec3.add(this.target, this.position, this.direction);


    let wd = new Vector3();
    this.threeCamera.getWorldDirection(wd);
    this.direction = vec3.fromValues(wd.x,wd.y,wd.z);
    this.position = vec3.fromValues(this.threeCamera.position.x,this.threeCamera.position.y,this.threeCamera.position.z);
    vec3.add(this.target, this.position, this.direction);

    let lookatVec = vec3.fromValues(0,0,0);
    vec3.subtract(lookatVec,this.position, this.target);
    let tmpRight = vec3.fromValues(0,0,0);
    let camUp = vec3.fromValues(0,0,0);
    vec3.cross(tmpRight, this.worldUp,lookatVec);
    vec3.cross(camUp,tmpRight,lookatVec);
    vec3.normalize(camUp,camUp);
    vec3.scale(camUp,camUp,-1);

    this.up = camUp;


    mat4.lookAt(this.viewMatrix, this.position, this.target, vec3.fromValues(0,1,0));
  }

  setAspectRatio(aspectRatio: number) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fovy, this.aspectRatio, this.near, this.far);
  }

  update() {

    this.threeControls.update();
    this.threeCamera.updateMatrixWorld();

    let wd = new Vector3();
    this.threeCamera.getWorldDirection(wd);
    this.direction = vec3.fromValues(wd.x,wd.y,wd.z);
    this.position = vec3.fromValues(this.threeCamera.position.x,this.threeCamera.position.y,this.threeCamera.position.z);
    vec3.add(this.target, this.position, this.direction);

    let lookatVec = vec3.fromValues(0,0,0);
    vec3.subtract(lookatVec,this.position, this.target);
    let tmpRight = vec3.fromValues(0,0,0);
    let camUp = vec3.fromValues(0,0,0);
    vec3.cross(tmpRight, this.worldUp,lookatVec);
    vec3.cross(camUp,tmpRight,lookatVec);
    vec3.normalize(camUp,camUp);
    vec3.scale(camUp,camUp,-1);
    this.up = camUp;

    this.counter ++;

    mat4.lookAt(this.viewMatrix, this.position, this.target, vec3.fromValues(0,1,0));
  }
};

export default Camera;