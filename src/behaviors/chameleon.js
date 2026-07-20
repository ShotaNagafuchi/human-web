import * as THREE from 'three';
import { randRange } from '../utils.js';

/**
 * ChameleonOverlay
 * - Captures page with html2canvas
 * - Projects the screenshot onto the character via onBeforeCompile
 *   (keeps MeshStandardMaterial + skinning working)
 * - On click: Splatoon-style ink stamp + reveal
 */
export class ChameleonOverlay {
  constructor(parts, renderer) {
    this.parts = parts;
    this.renderer = renderer; // Three.js WebGLRenderer reference
    this.active = false;
    this.phase = 'inactive';
    this.progress = 0;
    this.holdTime = 0;
    this.maxHoldTime = 0;
    this.bgTexture = null;
    this.modifiedMaterials = [];
  }

  async activate() {
    if (this.active) return;
    this.active = true;
    this.phase = 'capturing';
    this.progress = 0;
    this.holdTime = 0;
    this.maxHoldTime = randRange(10, 20);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;

      const capture = await html2canvas(document.body, {
        ignoreElements: (el) => el.tagName === 'CANVAS',
        logging: false,
        useCORS: true,
        scale: 1,
        windowWidth: vpW,
        windowHeight: vpH,
        width: vpW,
        height: vpH,
        x: window.scrollX,
        y: window.scrollY,
      });

      this.bgTexture = new THREE.CanvasTexture(capture);
      this.bgTexture.flipY = false;
      this.bgTexture.needsUpdate = true;

      // Drawing buffer = exact gl_FragCoord range
      const bufferSize = new THREE.Vector2();
      this.renderer.getDrawingBufferSize(bufferSize);

      this.camoMixUniform = { value: 0.0 };
      this.originalMeshMats = new Map();

      this.parts.root.traverse((child) => {
        if (child.isMesh && child.material) {
          this.originalMeshMats.set(child, child.material);

          const camoMat = child.material.clone();
          camoMat.userData._camoMix = this.camoMixUniform;
          camoMat.userData._bgMap = { value: this.bgTexture };
          camoMat.userData._screenSize = { value: bufferSize };

          camoMat.onBeforeCompile = (shader) => {
            shader.uniforms.camoMix = camoMat.userData._camoMix;
            shader.uniforms.bgMap = camoMat.userData._bgMap;
            shader.uniforms.screenSize = camoMat.userData._screenSize;

            shader.vertexShader = shader.vertexShader.replace(
              'void main() {',
              'varying float vLocalY;\nvoid main() {',
            );
            shader.vertexShader = shader.vertexShader.replace(
              '#include <project_vertex>',
              '#include <project_vertex>\nvLocalY = position.y;',
            );

            shader.fragmentShader = shader.fragmentShader.replace(
              'void main() {',
              `uniform float camoMix;
              uniform sampler2D bgMap;
              uniform vec2 screenSize;
              varying float vLocalY;
              void main() {`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              'vec4 diffuseColor = vec4( diffuse, opacity );',
              `// Capture = exact viewport, so direct UV mapping
              vec2 screenUV = gl_FragCoord.xy / screenSize;
              screenUV.y = 1.0 - screenUV.y;
              vec3 bgColor = texture2D(bgMap, screenUV).rgb;
              float normalizedY = clamp(vLocalY / 1.3, 0.0, 1.0);
              float wipeEdge = (1.0 - camoMix) * 1.4 - 0.2;
              float wipeMask = smoothstep(wipeEdge - 0.05, wipeEdge + 0.05, normalizedY);
              vec3 camoColor = mix(diffuse, bgColor, wipeMask);
              vec4 diffuseColor = vec4(camoColor, opacity);`,
            );
          };

          child.material = camoMat;
          this.modifiedMaterials.push(camoMat);
        }
      });

      this.phase = 'painting';
    } catch (e) {
      this.active = false;
      this.phase = 'inactive';
    }
  }

  handleClick() {
    if (this.phase === 'hidden') {
      const screenX = this.parts.root.position.x;
      const screenY = window.innerHeight - this.parts.root.position.y;
      spawnInkStamp(screenX, screenY);
      this.phase = 'revealing';
      this.progress = 0;
    }
  }

  update(dt) {
    if (!this.active) return;

    switch (this.phase) {
      case 'capturing':
        break;

      case 'painting':
        // Top-down wipe over ~1.2s
        this.progress = Math.min(1, this.progress + dt * 0.85);
        if (this.camoMixUniform) this.camoMixUniform.value = this.progress;
        if (this.progress >= 1) this.phase = 'hidden';
        break;

      case 'hidden':
        this.holdTime += dt;
        if (this.holdTime >= this.maxHoldTime) {
          this.phase = 'revealing';
          this.progress = 0;
        }
        break;

      case 'revealing':
        // Wipe back over ~1s
        this.progress = Math.min(1, this.progress + dt * 1.0);
        if (this.camoMixUniform) this.camoMixUniform.value = 1.0 - this.progress;
        if (this.progress >= 1) {
          this.restore();
        }
        break;
    }
  }

  restore() {
    // Swap back to original materials
    if (this.originalMeshMats) {
      for (const [mesh, origMat] of this.originalMeshMats) {
        mesh.material = origMat;
      }
      this.originalMeshMats.clear();
    }
    // Dispose cloned camo materials
    for (const mat of this.modifiedMaterials) {
      mat.dispose();
    }
    this.modifiedMaterials = [];

    if (this.bgTexture) {
      this.bgTexture.dispose();
      this.bgTexture = null;
    }

    this.active = false;
    this.phase = 'inactive';
  }
}

// ──────────────────────────────────────────
// Splatoon-style ink stamp (single splat, not particles)
// ──────────────────────────────────────────

function spawnInkStamp(x, y) {
  const canvas = document.createElement('canvas');
  const size = 120 + Math.random() * 60;
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.cssText = `
    position: fixed;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = size / 2;
  const cy = size / 2;

  // Pick a vivid Splatoon-ish color
  const colors = ['#E83573', '#5CD1E5', '#D1DC2A', '#F78F2E', '#7B42F5', '#1EDC62'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Main splat blob (big irregular shape)
  ctx.fillStyle = color;
  drawBlob(ctx, cx, cy, size * 0.3, 0.7, 9);

  // Smaller satellite blobs
  const satelliteCount = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < satelliteCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = size * 0.2 + Math.random() * size * 0.2;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    const br = 3 + Math.random() * 10;
    ctx.fillStyle = color;
    drawBlob(ctx, bx, by, br, 0.5, 6 + Math.floor(Math.random() * 3));
  }

  // Tiny specks
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = size * 0.15 + Math.random() * size * 0.3;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Animate: scale up from 0 quickly, hold, then fade out
  canvas.style.transform = 'scale(0)';
  canvas.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
  requestAnimationFrame(() => {
    canvas.style.transform = 'scale(1)';
  });

  // Fade out after 1.5s
  setTimeout(() => {
    canvas.style.transition = 'opacity 0.6s ease-out';
    canvas.style.opacity = '0';
    setTimeout(() => canvas.remove(), 600);
  }, 1500);
}

function drawBlob(ctx, x, y, radius, irregularity, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = radius * (1 + (Math.random() - 0.5) * irregularity);
    points.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
  }
  ctx.beginPath();
  ctx.moveTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
  for (let i = 1; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) / 2, (points[i].y + next.y) / 2);
  }
  ctx.closePath();
  ctx.fill();
}
