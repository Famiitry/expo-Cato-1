import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const three = resolve(dirname(fileURLToPath(import.meta.resolve('three'))), '..');
await mkdir(join(root, 'vendor'), { recursive: true });
for (const [source, destination] of [
  ['build/three.module.min.js', 'three.module.min.js'],
  ['examples/jsm/geometries/RoundedBoxGeometry.js', 'RoundedBoxGeometry.js'],
  ['examples/jsm/environments/RoomEnvironment.js', 'RoomEnvironment.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js'],
  ['LICENSE', 'THREE-LICENSE.txt']
]) await copyFile(join(three, source), join(root, 'vendor', destination));
// Fonts are versioned project assets. Keep the selected typography intact and
// avoid depending on a cache from another checkout or on a parent's directory.
await access(join(root, 'assets/fonts.css'));
await access(join(root, 'assets/brand-font.css'));
console.log('Three.js y geometrías preparadas. Fuentes locales conservadas.');
