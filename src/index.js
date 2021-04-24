import * as THREE from 'three';
import { Camera } from 'three';

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height, videoWidth, videoHeight;
let scene, renderer, camera, clock;

const options = {
  video: true,
  audio: false,
};

const initThreeScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("black");
  renderer = new THREE.WebGLRenderer();
  document.getElementById("content").appendChild(renderer.domElement);
  clock = new THREE.Clock();
};

const initThreeCamera = () => {
  const fov = 45;
  const aspect = width / height;

  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 10000);
  const z = Math.min(window.innerWidth, window.innerHeight);
  camera.position.set(0, 0, z);
  camera.lookAt(0, 0, 0);

  scene.add(camera);
};

// https://developer.mozilla.org/fr/docs/Web/API/MediaDevices/getUserMedia
const initUserCamera = async (options) => {
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia(options);
    video.addEventListener("loadeddata", () => {
      videoWidth = video.videoWidth;
      videoHeight = video.videoWidth;
    })
  } catch (e) {
    throw new Error(e);
  }
};

// https://developer.mozilla.org/fr/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
const getImageDataFromCamera = () => {
  console.log('videoWidth', videoWidth);
  const width = videoWidth;
  const height = videoHeight;

  canvas.width = width;
  canvas.height = height;

  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

const onResize = () => {
  width = window.innerWidth;
  height = window.innerHeight;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

(async () => {
  initThreeScene();
  initThreeCamera();
  onResize();
  await initUserCamera(options);
  console.log('videoWidth', videoWidth);
  await getImageDataFromCamera();
})()

window.addEventListener("resize", onResize);