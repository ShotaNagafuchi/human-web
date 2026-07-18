import * as THREE from 'three';
import { randRange } from '../utils.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

/**
 * Idle: standing still with subtle breathing.
 * Drives bones for gentle micro-movements.
 */
export const idle = {
  name: 'idle',
  weight: 3,

  enter(parts, ctx) {
    ctx.duration = randRange(2, 5);
    ctx.elapsed = 0;
    // Reset to rest pose on enter
    resetToRest(parts);
  },

  update(parts, ctx, time, dt) {
    ctx.elapsed += dt;
    const { bones, restPose } = parts;
    const t = time;

    // Breathing: Spine slight scale/rotation
    if (bones.Spine) {
      applyRot(bones.Spine, restPose, Math.sin(t * 1.6) * 0.015, 0, 0);
    }
    if (bones.Chest) {
      applyRot(bones.Chest, restPose, Math.sin(t * 1.6) * 0.01, 0, 0);
    }

    // Head gentle sway
    if (bones.Head) {
      applyRot(bones.Head, restPose, 0, Math.sin(t * 0.5) * 0.03, 0);
    }

    // Arms relaxed: very slight sway
    if (bones.UpperArm_L) {
      applyRot(bones.UpperArm_L, restPose, 0, 0, Math.sin(t * 0.7) * 0.03);
    }
    if (bones.UpperArm_R) {
      applyRot(bones.UpperArm_R, restPose, 0, 0, -Math.sin(t * 0.7) * 0.03);
    }

    return ctx.elapsed >= ctx.duration;
  },

  exit(parts) {
    resetToRest(parts);
  },
};

function applyRot(bone, restPose, rx, ry, rz) {
  const restQ = restPose[bone.name];
  _euler.set(rx, ry, rz);
  _quat.setFromEuler(_euler);
  if (restQ) {
    bone.quaternion.copy(restQ).multiply(_quat);
  } else {
    bone.quaternion.setFromEuler(_euler);
  }
}

function resetToRest(parts) {
  for (const [name, bone] of Object.entries(parts.bones)) {
    if (parts.restPose[name]) {
      bone.quaternion.copy(parts.restPose[name]);
    }
  }
}
