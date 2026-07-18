import * as THREE from 'three';
import { randRange } from '../utils.js';

const RUN_SPEED = 130; // faster than walk (55)
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

let RUN_KEYS = null;
let RUN_PHASES = [];

async function loadRunData() {
  if (RUN_KEYS) return;
  try {
    const resp = await fetch('/animations/run.json');
    const data = await resp.json();
    RUN_KEYS = {};
    for (const [phase, pose] of Object.entries(data.keyframes)) {
      RUN_KEYS[Number(phase)] = {};
      for (const [bone, rot] of Object.entries(pose)) {
        if (bone.startsWith('_')) continue;
        RUN_KEYS[Number(phase)][bone] = rot;
      }
    }
    RUN_PHASES = Object.keys(RUN_KEYS).map(Number).sort((a, b) => a - b);
  } catch (e) {
    RUN_KEYS = { 0: {}, 100: {} };
    RUN_PHASES = [0, 100];
  }
}

const _loadPromise = loadRunData();

export const run = {
  name: 'run',
  weight: 2, // less common than walk

  enter(parts, ctx) {
    const margin = 80;
    ctx.targetX = randRange(margin, window.innerWidth - margin);
    ctx.targetY = randRange(margin, window.innerHeight - margin);
    ctx.phase = 0;
  },

  update(parts, ctx, time, dt) {
    if (!RUN_KEYS) return false;

    const root = parts.root;
    const dx = ctx.targetX - root.position.x;
    const dy = ctx.targetY - root.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      return true;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Slight tilt toward movement direction
    const tilt = Math.atan2(dirX, 1) * 0.4;
    const maxTilt = 0.26;
    const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, tilt));
    root.rotation.z += (targetTilt - root.rotation.z) * Math.min(1, dt * 5);

    // Move faster than walk
    const step = Math.min(RUN_SPEED * dt, dist);
    root.position.x += dirX * step;
    root.position.y += dirY * step;

    // Faster cycle than walk
    ctx.phase = (ctx.phase + dt * 250) % 100;
    applyKeyframePose(parts, RUN_KEYS, RUN_PHASES, ctx.phase);

    return false;
  },

  exit(parts) {
  },
};

function applyKeyframePose(parts, keys, phases, phase) {
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
