import * as THREE from 'three';
import { randRange } from '../utils.js';
import { SIT } from '../anim-data.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

export const sit = {
  name: 'sit',
  weight: 1,

  enter(parts, ctx) {
    ctx.duration = randRange(5, 10);
    ctx.elapsed = 0;
    ctx.phase = 0;
  },

  update(parts, ctx, time, dt) {
    ctx.elapsed += dt;
    ctx.phase = (ctx.phase + dt * 40) % 100;
    applyPose(parts, SIT.keys, SIT.phases, ctx.phase);
    return ctx.elapsed >= ctx.duration;
  },

  exit(parts) {},
};

function applyPose(parts, keys, phases, phase) {
  let loIdx = 0, hiIdx = 1;
  for (let i = 0; i < phases.length - 1; i++) {
    if (phase >= phases[i] && phase <= phases[i + 1]) { loIdx = i; hiIdx = i + 1; break; }
  }
  const lo = phases[loIdx], hi = phases[hiIdx];
  const t = hi === lo ? 0 : (phase - lo) / (hi - lo);
  const poseA = keys[lo], poseB = keys[hi];

  for (const boneName of Object.keys(poseA)) {
    const bone = parts.bones[boneName];
    if (!bone) continue;
    const a = poseA[boneName], b = poseB[boneName] || a;
    _euler.set(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t, a.z+(b.z-a.z)*t, 'ZYX');
    _quat.setFromEuler(_euler);
    const restQ = parts.restPose[boneName];
    if (restQ) bone.quaternion.copy(restQ).multiply(_quat);
    else bone.quaternion.copy(_quat);
  }
}
