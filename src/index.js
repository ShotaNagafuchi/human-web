import { Renderer } from './renderer.js';
import { Crowd } from './crowd.js';
import { Interaction } from './interaction.js';

/**
 * Human-Web: Add walking Meccha Avatars to any website.
 *
 * Usage:
 *   <script src="human-web.js"></script>
 *   <script src="human-web.js" data-count="8"></script>
 */
(function init() {
  const config = { count: 5 };

  const scriptTag = document.currentScript;
  if (scriptTag) {
    if (scriptTag.dataset.count) config.count = parseInt(scriptTag.dataset.count, 10);
  }

  async function boot() {
    const renderer = new Renderer();
    const crowd = new Crowd(renderer.scene);
    const interaction = new Interaction(crowd);

    await crowd.init(config.count);

    renderer.onTick((time, dt) => {
      crowd.update(time, dt);
      interaction.update(time, dt);
    });

    window.HumanWeb = {
      async addCharacter() { return crowd.addCharacter(); },
      removeCharacter() { crowd.removeCharacter(); },
      triggerAll(name) { crowd.triggerAll(name); },
      hide() { renderer.hide(); },
      show() { renderer.show(); },
      destroy() { renderer.dispose(); },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot());
  } else {
    boot();
  }
})();
