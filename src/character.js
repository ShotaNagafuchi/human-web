import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { MODEL_BASE64 } from './model-data.js';

let cachedGltf = null;
let loadingPromise = null;

/**
 * Load the Meccha Avatar from embedded base64 data (no external file needed).
 */
function loadModel() {
  if (cachedGltf) return Promise.resolve(cachedGltf);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    // Decode base64 → ArrayBuffer
    const binary = atob(MODEL_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const loader = new GLTFLoader();
    loader.parse(
      bytes.buffer,
      '',
      (gltf) => { cachedGltf = gltf; resolve(gltf); },
      reject,
    );
  });
  return loadingPromise;
}

export async function createCharacter() {
  const gltf = await loadModel();

  const root = cloneSkeleton(gltf.scene);
  root.name = 'characterRoot';

  const mat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.45,
    metalness: 0.05,
  });

  root.traverse((child) => {
    if (child.isMesh) {
      child.material = mat;
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  const bones = {};
  root.traverse((child) => {
    if (child.isBone) {
      bones[child.name] = child;
    }
  });

  const restPose = {};
  for (const [name, bone] of Object.entries(bones)) {
    restPose[name] = bone.quaternion.clone();
  }

  return {
    root,
    parts: { root, bones, restPose, mat, body: root },
  };
}

export function preloadModel() {
  return loadModel();
}
