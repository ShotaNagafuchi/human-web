import * as THREE from 'three';
import { randRange } from '../utils.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

let KEYS = null;
let PHASES = [];

async function loadData() {
  if (KEYS) return;
  try {
    const resp = await fetch('/animations/camo_handsup.json');
    const data = await resp.json();
    KEYS = {};
    for (const [phase, pose] of Object.entries(data.keyframes)) {
      KEYS[Number(phase)] = {};
      for (const [bone, rot] of Object.entries(pose)) {
        if (bone.startsWith('_')) continue;
        KEYS[Number(phase)][bone] = rot;
      }
    }
    PHASES = Object.keys(KEYS).map(Number).sort((a, b) => a - b);
  } catch (e) {
    KEYS = { 0: {}, 100: {} };
    PHASES = [0, 100];
  }
}

const _loadPromise = loadData();

export const camoHandsup = {
  name: 'camo_handsup',
  weight: 0, // not in random pool — only used by chameleon

  enter(parts, ctx) {
    ctx.duration = randRange(8, 15);
    ctx.elapsed = 0;
    ctx.phase = 0;
  },

  update(parts, ctx, time, dt) {
    if (!KEYS) return false;
    ctx.elapsed += dt;
    ctx.phase = (ctx.phase + dt * 40) % 100;
    applyPose(parts, KEYS, PHASES, ctx.phase);
    return ctx.elapsed >= ctx.duration;
  },

  exit(parts) {},
};

function applyPose(parts, keys, phases, phase) {
  let loIdx = 0;
  let hiIdx = 1;
  for (let i = 0; i < phases.length - 1; i++) {
    if (phase >= phases[i] && phase <= phases[i + 1]) {
      loIdx = i; hiIdx = i + 1; break;
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
