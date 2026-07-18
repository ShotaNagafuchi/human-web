import * as THREE from 'three';
import { randRange } from '../utils.js';

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
    ctx.walkTime = 0;
    // Store rest positions for non-additive offsets
    if (parts.bones.Hips) {
      ctx.hipsRestY = parts.bones.Hips.position.y;
    }
  },

  update(parts, ctx, time, dt) {
    const root = parts.root;
    const bones = parts.bones;
    const dx = ctx.targetX - root.position.x;
    const dy = ctx.targetY - root.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      resetBones(parts, ctx);
      return true;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Face movement direction
    const targetAngle = Math.atan2(dirX, dirY);
    let diff = targetAngle - root.rotation.z;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.z += diff * Math.min(1, dt * 5);

    // Move
    const step = Math.min(WALK_SPEED * dt, dist);
    root.position.x += dirX * step;
    root.position.y += dirY * step;

    // Walk cycle
    ctx.walkTime += dt * 6;
    walkCycle(bones, parts.restPose, ctx.walkTime, time, ctx);

    return false;
  },

  exit(parts, ctx) {
    resetBones(parts, ctx);
  },
};

/**
 * Procedural walk cycle.
 *
 * Meccha Avatar is in T-pose:
 *   - Legs hang down along -Y → rotate legs with X axis (forward/back swing)
 *   - Arms extend along ±X → rotate arms with Y axis (forward/back swing)
 *     and use Z axis to bring arms down from T-pose to sides
 */
function walkCycle(b, rest, wt, time, ctx) {
  const sin = Math.sin;

  // ── Legs (extend down along -Y, so X rotation = forward/back) ──
  setBoneRot(b.UpperLeg_L, rest, sin(wt) * 0.45, 0, 0);
  setBoneRot(b.UpperLeg_R, rest, -sin(wt) * 0.45, 0, 0);

  // Knee bend
  setBoneRot(b.LowerLeg_L, rest, Math.max(0, -sin(wt)) * 0.6, 0, 0);
  setBoneRot(b.LowerLeg_R, rest, Math.max(0, sin(wt)) * 0.6, 0, 0);

  // ── Arms ──
  // Shoulder_L/R: bring arms down from T-pose (Z rotation toward body)
  // + Y rotation for forward/back swing
  if (b.Shoulder_L) {
    setBoneRot(b.Shoulder_L, rest, 0, -sin(wt) * 0.25, 0.8);
  }
  if (b.Shoulder_R) {
    setBoneRot(b.Shoulder_R, rest, 0, sin(wt) * 0.25, -0.8);
  }

  // Slight elbow bend
  if (b.LowerArm_L) setBoneRot(b.LowerArm_L, rest, 0, 0, 0.2);
  if (b.Hand_R) setBoneRot(b.Hand_R, rest, 0, 0, -0.2);

  // ── Spine/Chest ──
  if (b.Spine) setBoneRot(b.Spine, rest, 0.03, 0, 0);
  if (b.Chest) setBoneRot(b.Chest, rest, 0, sin(wt) * 0.04, 0);

  // ── Hips: bounce (from rest position, NOT additive) ──
  if (b.Hips && ctx.hipsRestY !== undefined) {
    b.Hips.position.y = ctx.hipsRestY + Math.abs(sin(wt * 2)) * 0.01;
  }

  // ── Head: stabilize ──
  if (b.Head) setBoneRot(b.Head, rest, 0, -sin(wt) * 0.03, 0);
}

/**
 * Set a bone's local rotation (XYZ euler) relative to its rest pose.
 */
function setBoneRot(bone, rest, rx, ry, rz) {
  if (!bone) return;
  const restQ = rest[bone.name];
  _euler.set(rx, ry, rz);
  _quat.setFromEuler(_euler);
  if (restQ) {
    bone.quaternion.copy(restQ).multiply(_quat);
  } else {
    bone.quaternion.copy(_quat);
  }
}

function resetBones(parts, ctx) {
  const { bones, restPose } = parts;
  for (const [name, bone] of Object.entries(bones)) {
    if (restPose[name]) {
      bone.quaternion.copy(restPose[name]);
    }
  }
  // Reset Hips position
  if (bones.Hips && ctx && ctx.hipsRestY !== undefined) {
    bones.Hips.position.y = ctx.hipsRestY;
  }
}
