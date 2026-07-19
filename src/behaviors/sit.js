import * as THREE from 'three';
import { randRange } from '../utils.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

let SIT_KEYS = null;
let SIT_PHASES = [];

async function loadSitData() {
  if (SIT_KEYS) return;
  try {
    const resp = await fetch('/animations/sit_idle.json');
    const data = await resp.json();
    SIT_KEYS = {};
    for (const [phase, pose] of Object.entries(data.keyframes)) {
      SIT_KEYS[Number(phase)] = {};
      for (const [bone, rot] of Object.entries(pose)) {
        if (bone.startsWith('_')) continue;
        SIT_KEYS[Number(phase)][bone] = rot;
      }
    }
    SIT_PHASES = Object.keys(SIT_KEYS).map(Number).sort((a, b) => a - b);
  } catch (e) {
    SIT_KEYS = { 0: {}, 100: {} };
    SIT_PHASES = [0, 100];
  }
}

const _loadPromise = loadSitData();

export const sit = {
  name: 'sit',
  weight: 1,

  enter(parts, ctx) {
    ctx.duration = randRange(5, 10);
    ctx.elapsed = 0;
    ctx.phase = 0;
  },

  update(parts, ctx, time, dt) {
    if (!SIT_KEYS) return false;
    ctx.elapsed += dt;
    ctx.phase = (ctx.phase + dt * 40) % 100;
    applyPose(parts, SIT_KEYS, SIT_PHASES, ctx.phase);
    return ctx.elapsed >= ctx.duration;
  },

  exit(parts) {},
};

function applyPose(parts, keys, phases, phase) {
  let loIdx = 0;
  let hiIdx = 1;
  for (let i = 0; i < phases.length - 1; i++) {
    if (phase >= phases[i] && phase <= phases[i + 1]) {
      loIdx = i;
      hiIdx = i + 1;
      break;
    }
  }
  const lo = phases[loIdx];
  const hi = phases[hiIdx];
  const t = hi === lo ? 0 : (phase - lo) / (hi - lo);
  const poseA = keys[lo];
  const poseB = keys[hi];

  for (const boneName of Object.keys(poseA)) {
    const bone = parts.bones[boneName];
    if (!bone) continue;
    const a = poseA[boneName];
    const b = poseB[boneName] || a;
    const rx = a.x + (b.x - a.x) * t;
    const ry = a.y + (b.y - a.y) * t;
    const rz = a.z + (b.z - a.z) * t;
    const restQ = parts.restPose[boneName];
    _euler.set(rx, ry, rz, 'ZYX');
    _quat.setFromEuler(_euler);
    if (restQ) {
      bone.quaternion.copy(restQ).multiply(_quat);
    } else {
      bone.quaternion.copy(_quat);
    }
  }
}
