import * as THREE from 'three';

const video = document.getElementById("video");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
let videoWidth, videoHeight, imageCache;
let scene, renderer, camera, particles;
let audio, analyser;

// camera
const options = {
  video: true,
  audio: false,
};

// audio
// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
const fftSize = 2048;
const frequencyRange = {
  bass: [20, 140],
  lowMid: [140, 400],
  mid: [400, 2600],
  highMid: [2600, 5200],
  treble: [5200, 14000],
};

const initThreeScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("black");
  renderer = new THREE.WebGLRenderer();
  document.getElementById("content").appendChild(renderer.domElement);
};

// https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
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
      createParticles();
    });
  } catch (e) {
    throw new Error(e);
  }
};

const createParticles = () => {
  const imageData = getImageDataFromCamera();
  const geometry = new THREE.Geometry();
  // const geometry = new THREE.BufferGeometry(); // https://threejs.org/docs/#api/en/core/BufferGeometry
  geometry.morphAttributes = {};  // This is necessary to avoid error.
  const material = new THREE.PointsMaterial({ // https://threejs.org/docs/#api/en/materials/PointsMaterial
    size: 1,
    color: 0xff3b6c,
    sizeAttenuation: false
  });
  // const vertices = [];
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      // const vertex = [
      //   x - imageData.width / 2,
      //   -y + imageData.height / 2,
      //   0
      // ];
      // geometry.groups.push(vertex);
      // TO CHECK: https://stackoverflow.com/questions/66874065/three-js-r125-buffergeometry-vertices-does-not-exist
      const vertex = new THREE.Vector3(
        x - imageData.width / 2,
        -y + imageData.height / 2,
        0
      );
      geometry.vertices.push(vertex);
    }
  }
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
};

// https://developer.mozilla.org/fr/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
const getImageDataFromCamera = (useCache) => {
  if (useCache && imageCache) {
    return imageCache;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.translate(video.videoWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  imageCache = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
  return imageCache;
};

const initAudio = () => {
  const audioListener = new THREE.AudioListener();
  audio = new THREE.Audio(audioListener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('assets/232941_New.MP3', (buffer) => {
    audio.setBuffer(buffer);
    audio.setLoop(true);
    audio.setVolume(0.5);
    audio.play();
  });

  analyser = new THREE.AudioAnalyser(audio, fftSize);

  document.body.addEventListener('click', function () {
    if (audio) {
      if (audio.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  });
};

const getFrequencyRangeValue = (data, _frequencyRange) => {
  const nyquist = 48000 / 2;
  const lowIndex = Math.round(_frequencyRange[0] / nyquist * data.length);
  const highIndex = Math.round(_frequencyRange[1] / nyquist * data.length);
  let total = 0;
  let numFrequencies = 0;

  for (let i = lowIndex; i <= highIndex; i++) {
    total += data[i];
    numFrequencies += 1;
  }
  return total / numFrequencies / 255;
};

const draw = (t) => {
  let r, g, b;

  // audio
  if (analyser) {
    // analyser.getFrequencyData() would be an array with a size of half of fftSize.
    const data = analyser.getFrequencyData();

    const bass = getFrequencyRangeValue(data, frequencyRange.bass);
    const mid = getFrequencyRangeValue(data, frequencyRange.mid);
    const treble = getFrequencyRangeValue(data, frequencyRange.treble);

    r = bass;
    g = mid;
    b = treble;
  }

  // video
  if (particles) {
    particles.material.color.r = 1 - r;
    particles.material.color.g = 1 - g;
    particles.material.color.b = 1 - b;

    const density = 2;
    const useCache = parseInt(t) % 2 === 0;  // To reduce CPU usage.
    const imageData = getImageDataFromCamera(useCache);
    for (let i = 0, length = particles.geometry.vertices.length; i < length; i++) {
      // for (let i = 0, length = particles.geometry.groups.length; i < length; i++) {
      const particle = particles.geometry.vertices[i];
      // const particle = particles.geometry.groups[i];
      if (i % density !== 0) {
        particle.z = 10000;
        // particle[i + 2] = 10000;
        continue;
      }
      let index = i * 4;
      let gray = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
      let threshold = 300;
      if (gray < threshold) {
        if (gray < threshold / 3) {
          particle.z = gray * r * 5;
          // particle[index + 2] = gray * r * 5;

        } else if (gray < threshold / 2) {
          particle.z = gray * g * 5;
          // particle[index + 2] = gray * g * 5;

        } else {
          particle.z = gray * b * 5;
          // particle[index + 2] = gray * b * 5;
        }
      } else {
        particle.z = 10000;
        // particle[index + 2] = 10000;
      }
    }
    particles.geometry.verticesNeedUpdate = true;
  }
  renderer.render(scene, camera);

  requestAnimationFrame(draw);
}

const onResize = () => {
  width = window.innerWidth;
  height = window.innerHeight;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

initThreeScene();
initThreeCamera();
onResize();
(async () => {
  await initUserCamera(options);
})();
initAudio();
draw();

window.addEventListener("resize", onResize);