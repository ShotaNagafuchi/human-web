import * as THREE from 'three';
import { randRange } from '../utils.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

let SIT_KEYS = null;
let SIT_PHASES = [];

async function loadSitData() {
  if (SIT_KEYS) return;
  try {
    const resp = await fetch('/animations/sit.json');
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
  weight: 1, // rare

  enter(parts, ctx) {
    ctx.duration = randRange(4, 8); // sit for a while
    ctx.elapsed = 0;
    ctx.sitPhase = 0; // 0→100 transition to seated
    ctx.seated = false;
  },

  update(parts, ctx, time, dt) {
    if (!SIT_KEYS) return false;
    ctx.elapsed += dt;

    // Transition to seated pose over ~0.6s
    if (!ctx.seated) {
      ctx.sitPhase = Math.min(100, ctx.sitPhase + dt * 167); // 0.6s to reach 100
      if (ctx.sitPhase >= 100) ctx.seated = true;
    }

    // When time's up, transition back to standing
    if (ctx.elapsed >= ctx.duration && ctx.seated) {
      ctx.sitPhase = Math.max(0, ctx.sitPhase - dt * 167);
      if (ctx.sitPhase <= 0) return true; // done
    }

    applyKeyframePose(parts, SIT_KEYS, SIT_PHASES, ctx.sitPhase);
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
