# human-web

Add tiny walking 3D characters to any website with one line of code.

**[Live Demo](https://shotanagafuchi.github.io/human-web/)**

![human-web demo](https://img.shields.io/badge/size-196kb%20gzip-blue)

## Quick Start

Add this to your HTML — that's it:

```html
<script src="https://cdn.jsdelivr.net/gh/ShotaNagafuchi/human-web@main/dist/human-web.js"></script>
```

Characters will automatically appear and start walking around your page.

## Installation

### CDN (recommended)

```html
<script src="https://cdn.jsdelivr.net/gh/ShotaNagafuchi/human-web@main/dist/human-web.js"></script>
```

### npm

```bash
npm install human-web
```

```js
import 'human-web';
```

### Self-hosted

Download `dist/human-web.js` and `public/meccha.glb`, then:

```html
<script src="/human-web.js"></script>
```

## Configuration

Use `data-` attributes on the script tag:

```html
<script
  src="https://cdn.jsdelivr.net/gh/ShotaNagafuchi/human-web@main/dist/human-web.js"
  data-count="8"
></script>
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-count` | `5` | Number of characters |

## JavaScript API

```js
// Add/remove characters
await HumanWeb.addCharacter();
HumanWeb.removeCharacter();

// Trigger behaviors on all characters
HumanWeb.triggerAll('wander');   // walk to random point
HumanWeb.triggerAll('run');      // run fast
HumanWeb.triggerAll('idle');     // stand still
HumanWeb.triggerAll('sit');      // sit down
HumanWeb.triggerAll('chameleon'); // blend into background

// Show/hide
HumanWeb.hide();
HumanWeb.show();

// Remove completely
HumanWeb.destroy();
```

## Behaviors

Characters randomly transition between these states:

| Behavior | Description |
|----------|-------------|
| **walk** | Walk to a random point on the page |
| **run** | Sprint with arms up |
| **idle** | Stand still, subtle breathing |
| **sit** | Sit down for a while |
| **chameleon** | Blend into the page background (click to reveal) |

## Chameleon Mode

Characters occasionally camouflage themselves by sampling the page background and projecting it onto their body. Text, gradients, and images all appear on the character. Click a hidden character to reveal it with an ink splash effect.

## Animation Editor

Run the dev server and open `/editor.html` to visually edit bone animations with real-time preview.

```bash
npm run dev
# open http://localhost:3456/editor.html
```

## Development

```bash
git clone https://github.com/ShotaNagafuchi/human-web.git
cd human-web
npm install
npm run dev      # dev server at localhost:3456
npm run build    # production bundle → dist/human-web.js
```

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [Meccha Avatar](https://booth.pm/) — Character model (smooth white humanoid with bone rig)
- [html2canvas](https://html2canvas.hertzen.com/) — Page capture for chameleon mode
- [Vite](https://vitejs.dev/) — Build tooling

## License

MIT
