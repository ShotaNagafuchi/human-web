import * as THREE from 'three';

export class Renderer {
  constructor() {
    this.callbacks = [];
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic camera mapped to screen pixels
    const w = window.innerWidth;
    const h = window.innerHeight;
    // top=h, bottom=0 so Y-up matches Three.js convention:
    // y=0 is screen bottom, y=h is screen top
    this.camera = new THREE.OrthographicCamera(0, w, h, 0, 0.1, 1000);
    this.camera.position.z = 500;

    // WebGL renderer with transparent background
    this.webglRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.webglRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.webglRenderer.setSize(w, h);
    this.webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.webglRenderer.toneMappingExposure = 1.2;

    // Canvas overlay styling
    const canvas = this.webglRenderer.domElement;
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(canvas);

    // Lighting — 3-light setup for clay/silicone look
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(300, 200, 400);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.4);
    fillLight.position.set(-200, 100, 300);
    this.scene.add(fillLight);

    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Start animation loop
    this.webglRenderer.setAnimationLoop((time) => this.tick(time));
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.right = w;
    this.camera.top = h;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
    this.webglRenderer.setSize(w, h);
  }

  onTick(callback) {
    this.callbacks.push(callback);
  }

  tick(_time) {
    const dt = this.clock.getDelta();
    const time = this.clock.elapsedTime;

    for (const cb of this.callbacks) {
      cb(time, dt);
    }

    this.webglRenderer.render(this.scene, this.camera);
  }

  hide() {
    this.webglRenderer.domElement.style.display = 'none';
  }

  show() {
    this.webglRenderer.domElement.style.display = '';
  }

  dispose() {
    this.webglRenderer.setAnimationLoop(null);
    this.webglRenderer.domElement.remove();
    this.webglRenderer.dispose();
  }
}
