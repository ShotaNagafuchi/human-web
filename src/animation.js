import { idle } from './behaviors/idle.js';
import { wander } from './behaviors/wander.js';
import { run } from './behaviors/run.js';
import { sit } from './behaviors/sit.js';
import { camoHandsup } from './behaviors/camo_handsup.js';
import { ChameleonOverlay } from './behaviors/chameleon.js';

/**
 * States: wander, run, idle, sit, chameleon(idle), chameleon(handsup)
 * Chameleon can trigger from ANY state. Forces a camo pose (idle or handsup).
 */
export class AnimationController {
  constructor(parts, renderer) {
    this.parts = parts;
    this.behaviors = new Map();
    this.currentBehavior = null;
    this.ctx = {};

    this.chameleon = new ChameleonOverlay(parts, renderer);

    this.register(idle);
    this.register(wander);
    this.register(run);
    this.register(sit);
    this.register(camoHandsup);
  }

  register(behavior) {
    this.behaviors.set(behavior.name, behavior);
  }

  play(name) {
    if (name === 'chameleon') {
      this.startChameleon();
      return;
    }
    this.switchTo(name);
  }

  startChameleon() {
    // Pick random camo pose: 50% idle, 50% handsup
    const pose = Math.random() < 0.5 ? 'idle' : 'camo_handsup';
    this.switchTo(pose);
    this.chameleon.activate();
  }

  switchTo(name) {
    const behavior = this.behaviors.get(name);
    if (!behavior) return;
    if (this.currentBehavior) this.currentBehavior.exit(this.parts, this.ctx);
    this.ctx = {};
    this.currentBehavior = behavior;
    behavior.enter(this.parts, this.ctx);
  }

  update(time, dt) {
    if (this.currentBehavior) {
      const done = this.currentBehavior.update(this.parts, this.ctx, time, dt);
      if (done) {
        if (this.chameleon.active) {
          // Stay in current camo pose
          this.ctx = {};
          this.currentBehavior.enter(this.parts, this.ctx);
        } else {
          // 8% chance to go chameleon from any state
          if (Math.random() < 0.08) {
            this.startChameleon();
          } else {
            this.switchTo(this.pickNext());
          }
        }
      }
    }

    this.chameleon.update(dt);
  }

  handleClick() {
    this.chameleon.handleClick();
  }

  pickNext() {
    const r = Math.random();
    if (r < 0.45) return 'wander';
    if (r < 0.65) return 'idle';
    if (r < 0.85) return 'run';
    return 'sit';
  }
}
