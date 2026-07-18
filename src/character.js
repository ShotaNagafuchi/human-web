import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

let cachedGltf = null;
let loadingPromise = null;

// In dev: served from /public/meccha.glb → accessible at /meccha.glb
// In production: bundled alongside human-web.js
const MODEL_URL = '/meccha.glb';

/**
 * Load the Meccha Avatar GLB once and cache it.
 */
function loadModel() {
  if (cachedGltf) return Promise.resolve(cachedGltf);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => { cachedGltf = gltf; resolve(gltf); },
      undefined,
      reject,
    );
  });
  return loadingPromise;
}

/**
 * Create a character instance by cloning the cached model.
 * Returns { root, parts } where parts maps bone names to Bone objects.
 *
 * Bone names in the Meccha Avatar:
 *   Hips, Spine, Chest, Neck, Head,
 *   Shoulder_L, UpperArm_L, LowerArm_L,
 *   Shoulder_R, UpperArm_R, Hand_R,
 *   UpperLeg_L, LowerLeg_L,
 *   UpperLeg_R, LowerLeg_R
 */
export async function createCharacter() {
  const gltf = await loadModel();

  // Clone the scene so each character is independent
  const root = cloneSkeleton(gltf.scene);
  root.name = 'characterRoot';

  // Apply white clay material to all meshes
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

  // Collect bone references by name
  const bones = {};
  root.traverse((child) => {
    if (child.isBone) {
      bones[child.name] = child;
    }
  });

  // Store rest-pose quaternions for blending back to T-pose
  const restPose = {};
  for (const [name, bone] of Object.entries(bones)) {
    restPose[name] = bone.quaternion.clone();
  }

  const parts = {
    root,
    bones,
    restPose,
    mat,
    // Convenience accessors for animation code
    body: root, // the whole model group
  };

  return { root, parts };
}

/**
 * Preload the model (call once at init).
 */
export function preloadModel() {
  return loadModel();
}
