import { lerp, clamp } from './utils.js';

/**
 * Mouse tracking (head follows cursor) and click reactions.
 * Uses bone names from the Meccha Avatar rig.
 */
export class Interaction {
  constructor(crowd) {
    this.crowd = crowd;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = window.innerHeight - e.clientY;
    });

    document.addEventListener('click', (e) => {
      this.onClick(e.clientX, window.innerHeight - e.clientY);
    });

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.onClick(t.clientX, window.innerHeight - t.clientY);
      }
    });
  }

  onClick(x, y) {
    const { character, distance } = this.crowd.findClosest(x, y);
    const hitRadius = Math.min(window.innerWidth, window.innerHeight) * 0.08;
    if (character && distance < hitRadius) {
      // If chameleon is hiding, reveal it
      const ctrl = character.controller;
      if (ctrl.currentBehavior && ctrl.currentBehavior.name === 'chameleon' && ctrl.currentBehavior.onClick) {
        ctrl.currentBehavior.onClick(ctrl.ctx);
      }
    }
  }

  update(time, dt) {
    for (const char of this.crowd.characters) {
      // Use Head bone from the Meccha Avatar rig
      const headBone = char.parts.bones.Head;
      const neckBone = char.parts.bones.Neck;
      if (!headBone && !neckBone) continue;

      const target = neckBone || headBone;
      const charScale = Math.min(window.innerWidth, window.innerHeight) * 0.05;

      // Head world position (model height ~1.3, head at ~1.15)
      const headWorldX = char.root.position.x;
      const headWorldY = char.root.position.y + charScale * 1.0;

      const dx = this.mouseX - headWorldX;
      const dy = this.mouseY - headWorldY;

      // Smoothly rotate head/neck toward mouse
      const targetRotY = clamp(Math.atan2(dx, 300), -0.5, 0.5);
      const targetRotX = clamp(-Math.atan2(dy, 300), -0.3, 0.3);

      target.rotation.y = lerp(target.rotation.y, targetRotY, 0.06);
      target.rotation.x = lerp(target.rotation.x, targetRotX, 0.06);
    }
  }
}
