import * as THREE from 'three';
import { randRange } from '../utils.js';
import { WALK } from '../anim-data.js';

const WALK_SPEED = 55;
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

export const wander = {
  name: 'wander',
  weight: 6,

  enter(parts, ctx) {
    const margin = 80;
    ctx.targetX = randRange(margin, window.innerWidth - margin);
    ctx.targetY = randRange(margin, window.innerHeight - margin);
    ctx.phase = 0;
  },

  update(parts, ctx, time, dt) {
    const root = parts.root;
    const dx = ctx.targetX - root.position.x;
    const dy = ctx.targetY - root.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return true;

    const dirX = dx / dist;
    const dirY = dy / dist;

    const tilt = Math.atan2(dirX, 1) * 0.4;
    const maxTilt = 0.26;
    const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, tilt));
    root.rotation.z += (targetTilt - root.rotation.z) * Math.min(1, dt * 5);

    const step = Math.min(WALK_SPEED * dt, dist);
    root.position.x += dirX * step;
    root.position.y += dirY * step;

    ctx.phase = (ctx.phase + dt * 150) % 100;
    applyPose(parts, WALK.keys, WALK.phases, ctx.phase);
    return false;
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
