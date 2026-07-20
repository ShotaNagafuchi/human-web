import { createCharacter, preloadModel } from './character.js';
import { AnimationController } from './animation.js';
import { randRange } from './utils.js';

/**
 * Manages multiple Meccha Avatar characters across the viewport.
 */
export class Crowd {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer; // WebGLRenderer for chameleon buffer size
    this.characters = [];
  }

  /**
   * Preload the model, then spawn `count` characters.
   */
  async init(count = 5) {
    await preloadModel();
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.addCharacter());
    }
    await Promise.all(promises);
  }

  async addCharacter() {
    const { root, parts } = await createCharacter();

    // Scale to ~5% of the smaller viewport dimension
    const charScale = Math.min(window.innerWidth, window.innerHeight) * 0.05;
    root.scale.set(charScale, charScale, charScale);

    // Random position anywhere on viewport
    const margin = 80;
    root.position.x = randRange(margin, window.innerWidth - margin);
    root.position.y = randRange(margin, window.innerHeight - margin);
    root.position.z = 0;

    const controller = new AnimationController(parts, this.renderer);
    controller.play(Math.random() > 0.5 ? 'idle' : 'wander');

    this.characters.push({ root, parts, controller });
    this.scene.add(root);

    return { root, parts, controller };
  }

  removeCharacter() {
    if (this.characters.length === 0) return;
    const char = this.characters.pop();
    this.scene.remove(char.root);
  }

  update(time, dt) {
    for (const char of this.characters) {
      char.controller.update(time, dt);
    }
  }

  triggerAll(behaviorName) {
    for (const char of this.characters) {
      char.controller.play(behaviorName);
    }
  }

  findClosest(screenX, screenY) {
    let closest = null;
    let minDist = Infinity;
    for (const char of this.characters) {
      const dx = char.root.position.x - screenX;
      const dy = char.root.position.y - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = char;
      }
    }
    return { character: closest, distance: minDist };
  }

  get count() {
    return this.characters.length;
  }
}
