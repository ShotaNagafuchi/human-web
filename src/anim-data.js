// Vite bundles JSON imports directly — no fetch() needed at runtime
import walkJson from '../public/animations/walk.json';
import idleJson from '../public/animations/idle.json';
import runJson from '../public/animations/run.json';
import sitJson from '../public/animations/sit_idle.json';
import camoJson from '../public/animations/camo_handsup.json';

function parse(data) {
  const keys = {};
  for (const [phase, pose] of Object.entries(data.keyframes)) {
    keys[Number(phase)] = {};
    for (const [bone, rot] of Object.entries(pose)) {
      if (bone.startsWith('_')) continue;
      keys[Number(phase)][bone] = rot;
    }
  }
  return { keys, phases: Object.keys(keys).map(Number).sort((a, b) => a - b) };
}

export const WALK = parse(walkJson);
export const IDLE = parse(idleJson);
export const RUN = parse(runJson);
export const SIT = parse(sitJson);
export const CAMO_HANDSUP = parse(camoJson);
