import * as THREE from 'three';
import { randRange } from '../utils.js';

const _white = new THREE.Color(0xf5f5f0);
const _bgColor = new THREE.Color();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

// Idle pose while camouflaged
const CAMO_POSE = {
  Hips: { x: 0, y: 0, z: 0 },
  Spine: { x: 0.02, y: 0, z: 0 },
  UpperArm_L: { x: -1.309, y: 0, z: 0 },
  UpperArm_R: { x: -1.309, y: 0, z: 0 },
};

/**
 * Custom shader material that paints from white to a target color
 * using a noise-based threshold that spreads randomly across the mesh.
 */
function createChameleonMaterial(baseMat) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: baseMat.roughness,
    metalness: baseMat.metalness,
  });

  // Add custom uniforms via onBeforeCompile
  mat.userData.paintProgress = { value: 0.0 };
  mat.userData.targetColor = { value: new THREE.Color(0xffffff) };
  mat.userData.noiseOffset = { value: new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100) };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.paintProgress = mat.userData.paintProgress;
    shader.uniforms.targetColor = mat.userData.targetColor;
    shader.uniforms.noiseOffset = mat.userData.noiseOffset;

    // Add varying for world position in vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );

    // Fragment: mix white→targetColor based on noise + progress
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      uniform float paintProgress;
      uniform vec3 targetColor;
      uniform vec3 noiseOffset;

      // Simple 3D hash noise
      float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      `// Noise-based paint spread
      float n = hash(vWorldPos * 3.0 + noiseOffset);
      // paintProgress 0→1 gradually covers more area
      // threshold expands from random seed points
      float threshold = smoothstep(0.0, 1.0, paintProgress * 1.4 - n * 0.8);
      vec3 paintedColor = mix(diffuse, targetColor, threshold);
      vec4 diffuseColor = vec4(paintedColor, opacity);`
    );

    mat.userData.shader = shader;
  };

  return mat;
}

export const chameleon = {
  name: 'chameleon',
  weight: 1,

  enter(parts, ctx) {
    ctx.phase = 'painting'; // painting → hidden → revealing → done
    ctx.paintProgress = 0;
    ctx.clicked = false;
    ctx.revealProgress = 0;

    // Sample background color
    const screenX = parts.root.position.x;
    const screenY = window.innerHeight - parts.root.position.y;
    const bgColorStr = sampleBackgroundColor(screenX, screenY);
    _bgColor.setStyle(bgColorStr);

    // Replace material with chameleon shader material
    ctx.originalMat = parts.mat;
    ctx.chameleonMat = createChameleonMaterial(parts.mat);
    ctx.chameleonMat.userData.targetColor.value.copy(_bgColor);

    // Apply to all meshes
    parts.root.traverse((child) => {
      if (child.isMesh && child.material === ctx.originalMat) {
        child.material = ctx.chameleonMat;
      }
    });

    applyStaticPose(parts, CAMO_POSE);
  },

  update(parts, ctx, time, dt) {
    if (!ctx.chameleonMat) return false;

    switch (ctx.phase) {
      case 'painting':
        // Random patches gradually appear (over ~2.5s)
        ctx.paintProgress = Math.min(1, ctx.paintProgress + dt * 0.4);
        ctx.chameleonMat.userData.paintProgress.value = ctx.paintProgress;
        if (ctx.paintProgress >= 1) {
          ctx.phase = 'hidden';
        }
        // Keep idle pose
        applyStaticPose(parts, CAMO_POSE);
        break;

      case 'hidden':
        // Stay camouflaged, subtle breathing
        applyStaticPose(parts, CAMO_POSE);
        if (ctx.clicked) {
          ctx.phase = 'revealing';
        }
        break;

      case 'revealing':
        // Reverse: painted → white (over ~1s)
        ctx.revealProgress = Math.min(1, ctx.revealProgress + dt * 1.0);
        ctx.chameleonMat.userData.paintProgress.value = 1.0 - ctx.revealProgress;
        if (ctx.revealProgress >= 1) {
          // Restore original material
          restoreMaterial(parts, ctx);
          return true;
        }
        break;
    }

    return false;
  },

  exit(parts, ctx) {
    restoreMaterial(parts, ctx);
  },

  onClick(ctx) {
    if (ctx.phase === 'hidden') {
      ctx.clicked = true;
    }
  },
};

function restoreMaterial(parts, ctx) {
  if (ctx.originalMat) {
    parts.root.traverse((child) => {
      if (child.isMesh && child.material === ctx.chameleonMat) {
        child.material = ctx.originalMat;
      }
    });
    if (ctx.chameleonMat) {
      ctx.chameleonMat.dispose();
      ctx.chameleonMat = null;
    }
  }
}

function sampleBackgroundColor(x, y) {
  try {
    const el = document.elementFromPoint(x, y);
    if (!el) return '#ffffff';

    let current = el;
    while (current && current !== document.documentElement) {
      const style = getComputedStyle(current);
      const bg = style.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
      current = current.parentElement;
    }

    const bodyBg = getComputedStyle(document.body).backgroundColor;
    return (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') ? bodyBg : '#ffffff';
  } catch (e) {
    return '#ffffff';
  }
}

function applyStaticPose(parts, pose) {
  for (const [boneName, rot] of Object.entries(pose)) {
    const bone = parts.bones[boneName];
    if (!bone) continue;
    const restQ = parts.restPose[boneName];
    _euler.set(rot.x, rot.y, rot.z, 'ZYX');
    _quat.setFromEuler(_euler);
    if (restQ) {
      bone.quaternion.copy(restQ).multiply(_quat);
    } else {
      bone.quaternion.copy(_quat);
    }
  }
}
