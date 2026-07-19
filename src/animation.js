import { idle } from './behaviors/idle.js';
import { wander } from './behaviors/wander.js';
import { run } from './behaviors/run.js';
import { sit } from './behaviors/sit.js';
import { chameleon } from './behaviors/chameleon.js';

/**
 * Animation controller for a single character.
 * Manages behavior state machine — now drives bones via parts.bones dict.
 */
export class AnimationController {
  constructor(parts) {
    this.parts = parts;
    this.behaviors = new Map();
    this.currentBehavior = null;
    this.ctx = {};
    this.queue = null;

    this.register(idle);
    this.register(wander);
    this.register(run);
    this.register(sit);
    this.register(chameleon);
  }

  register(behavior) {
    this.behaviors.set(behavior.name, behavior);
  }

  play(name) {
    const behavior = this.behaviors.get(name);
    if (!behavior) return;

    if (this.currentBehavior) {
      this.currentBehavior.exit(this.parts, this.ctx);
    }

    this.ctx = {};
    this.currentBehavior = behavior;
    behavior.enter(this.parts, this.ctx);
  }

  queueNext(name) {
    this.queue = name;
  }

  update(time, dt) {
    if (!this.currentBehavior) return;

    const done = this.currentBehavior.update(this.parts, this.ctx, time, dt);

    if (done) {
      if (this.queue) {
        this.play(this.queue);
        this.queue = null;
      } else {
        this.play(this.pickRandomBehavior());
      }
    }
  }

  pickRandomBehavior() {
    const weights = [];
    for (const [name, behavior] of this.behaviors) {
      weights.push({ name, weight: behavior.weight || 1 });
    }
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * total;
    for (const w of weights) {
      r -= w.weight;
      if (r <= 0) return w.name;
    }
    return weights[0].name;
  }
}
