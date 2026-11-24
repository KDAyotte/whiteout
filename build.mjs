// Bundles src/main.js (with three.js) into one self-contained index.html.
// Usage: node build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2022',
  loader: { '.jpg': 'dataurl', '.hdr': 'dataurl', '.glb': 'dataurl' },   // textures are embedded so index.html stays self-contained
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/template.html', 'utf8').replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
writeFileSync('index.html', html);
console.log(`index.html written (${(html.length / 1024).toFixed(0)} KB)`);
