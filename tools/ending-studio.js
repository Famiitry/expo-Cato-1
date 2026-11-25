import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { M, box, ball, cylinder, contact, mesh } from '../src/models.js';

const kind = new URLSearchParams(location.search).get('product') || 'croissant';
const canvas = document.querySelector('#studio');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight, false); renderer.setPixelRatio(1.5);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const food = kind === 'bread' || kind === 'croissant', background = food ? 0xf0e5d5 : 0xe9e5ef;
const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
const pmrem = new THREE.PMREMGenerator(renderer), studio = new RoomEnvironment();
scene.environment = pmrem.fromScene(studio, .04).texture; scene.environmentIntensity = .38; studio.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfff8ec, 0xb2ac9e, 1.2));
const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(-4, 7, 5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4, near: .1, far: 25 }); key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key); const fill = new THREE.DirectionalLight(0xece8ff, .6); fill.position.set(4, 3, -4); scene.add(fill);
const backdropRows = [[0, 20], [0, -4]];
for (let i = 1; i <= 24; i++) { const a = i / 24 * Math.PI / 2; backdropRows.push([4 - Math.cos(a) * 4, -4 - Math.sin(a) * 4]); }
backdropRows.push([30, -8]);
const positions = [], faces = [];
backdropRows.forEach(([y, z], i) => { positions.push(-30, y, z, 30, y, z); if (i < backdropRows.length - 1) { const n = i * 2; faces.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); } });
const backdrop = new THREE.BufferGeometry(); backdrop.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); backdrop.setIndex(faces); backdrop.computeVertexNormals();
const floor = mesh(backdrop, new THREE.MeshStandardMaterial({ color: background, roughness: 1 }), scene, 0, -.015, 0, false); floor.receiveShadow = true;
contact(scene, 0, 0, 4, 3, .25, -.005);
const group = new THREE.Group(); scene.add(group);
const material = (color, extras = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, ...extras });
const golden = material(0xca8739, { vertexColors: true, roughness: .58 });
function tube(points, radius, mat, parent = group) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 48, radius, 10, false), mat, parent); }
function plate() {
  cylinder(group, 1.65, 1.6, .06, M.cream, 0, .025, 0, 80);
  const rim = mesh(new THREE.TorusGeometry(1.59, .04, 8, 80), M.cream, group, 0, .06, 0); rim.rotation.x = Math.PI / 2;
}
function pastryColor(x, y, z, t) {
  const noise = Math.sin(x * 41 + z * 33) * Math.sin(y * 57 + x * 13) * .035;
  return new THREE.Color().setHSL(.088 + noise * .3, .57 + noise, .5 + noise - .055 * Math.pow(Math.cos(t * Math.PI * 10), 10));
}
if (kind === 'croissant') {
  plate();
  const points = [], colors = [], indices = [], steps = 120, sides = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = (t - .5) * 2.72;
    const radius = (.025 + .43 * Math.pow(Math.sin(Math.PI * t), .74)) * (1 + .075 * Math.cos(t * Math.PI * 20));
    const center = new THREE.Vector3(Math.sin(a) * 1.2, .19 + .23 * Math.sin(Math.PI * t), -.8 * Math.cos(a) + .3);
    for (let j = 0; j <= sides; j++) {
      const b = j / sides * Math.PI * 2, cross = new THREE.Vector3(-.8 * Math.sin(a), 0, 1.2 * Math.cos(a)).normalize();
      const v = center.clone().addScaledVector(cross, Math.cos(b) * radius); v.y += Math.sin(b) * radius * .74;
      v.y = Math.max(.1, v.y);
      points.push(v.x, v.y, v.z); const c = pastryColor(v.x, v.y, v.z, t); colors.push(c.r, c.g, c.b);
      if (i < steps && j < sides) { const n = i * (sides + 1) + j; indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  const croissant = mesh(geo, golden, group); croissant.rotation.y = -.23;
  // Thin raised folds catch the light like laminated pastry.
  for (let i = 1; i <= 9; i++) {
    const t = i / 10, a = (t - .5) * 2.72, r = .025 + .43 * Math.pow(Math.sin(Math.PI * t), .74), fold = [];
    const cross = new THREE.Vector3(-.8 * Math.sin(a), 0, 1.2 * Math.cos(a)).normalize();
    for (let j = 0; j <= 12; j++) { const b = j / 12 * Math.PI; fold.push([Math.sin(a) * 1.2 + cross.x * Math.cos(b) * r, .2 + .23 * Math.sin(Math.PI * t) + Math.sin(b) * r * .74, -.8 * Math.cos(a) + .3 + cross.z * Math.cos(b) * r]); }
    const seam = tube(fold, .009, material(0xd49a51)); seam.rotation.y = -.23;
  }
} else if (kind === 'bread') {
  plate();
  const geo = new THREE.SphereGeometry(1, 80, 48), pos = geo.attributes.position, colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * 1.17, y = Math.max(.11, .57 + pos.getY(i) * .52), z = pos.getZ(i) * .8;
    pos.setXYZ(i, x, y, z); const c = pastryColor(x, y, z, .2); const dust = Math.pow(Math.max(0, Math.sin(x * 25) * Math.cos(z * 27)), 12) * .12; c.offsetHSL(0, -dust, dust); colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); mesh(geo, golden, group);
  for (let cut = -2; cut <= 2; cut++) {
    const path = [];
    for (let i = 0; i <= 20; i++) { const x = -.66 + i / 20 * 1.3, z = cut * .225 + x * .24; const y = .57 + .52 * Math.sqrt(Math.max(.03, 1 - (x / 1.17) ** 2 - (z / .8) ** 2)); path.push([x, y + .007, z]); }
    tube(path, .028, material(0x956133));
    tube(path.map(p => [p[0], p[1] + .017, p[2] + .022]), .015, material(0xf3d8a1));
  }
  group.rotation.y = -.3;
} else if (kind === 'headphones') {
  const dark = material(0x393843, { roughness: .6 }), lavender = material(0x8c83aa, { roughness: .27, metalness: .3 }), metal = material(0xc4bdc9, { roughness: .22, metalness: .75 });
  const band = new THREE.Shape(); band.absarc(0, 0, 1.18, 0, Math.PI, false); band.lineTo(-1.04, 0); band.absarc(0, 0, 1.04, Math.PI, 0, true); band.closePath();
  const g = new THREE.ExtrudeGeometry(band, { depth: .2, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 4, curveSegments: 64 }); g.translate(0, .75, -.1); mesh(g, lavender, group);
  mesh(new THREE.TorusGeometry(1.045, .055, 12, 64, Math.PI), dark, group, 0, .76, 0);
  for (const side of [-1, 1]) {
    box(group, .1, .5, .13, metal, side * 1.12, .69, 0, .025);
    const ear = new THREE.Group(); ear.position.set(side * 1.07, .59, 0); ear.rotation.z = side * -.08; group.add(ear);
    const shell = cylinder(ear, .46, .46, .28, lavender); shell.rotation.z = Math.PI / 2; shell.scale.z = .9;
    const cushion = mesh(new THREE.TorusGeometry(.36, .105, 14, 64), dark, ear, -side * .16, 0, 0); cushion.rotation.y = Math.PI / 2; cushion.scale.y = 1.15;
    const fabric = cylinder(ear, .3, .3, .025, dark, -side * .19, 0, 0, 48); fabric.rotation.z = Math.PI / 2; fabric.scale.z = .9;
    const disc = cylinder(ear, .3, .3, .02, lavender, side * .16, 0, 0, 48); disc.rotation.z = Math.PI / 2;
  }
  tube([[-1.25, .45, .05], [-1.5, .1, .1], [-1.2, .025, .85], [-.25, .025, 1.05], [.35, .025, .7]], .018, dark);
  group.rotation.y = -.25;
} else if (kind === 'controller') {
  const body = material(0xe8e4ef, { roughness: .28 }), dark = material(0x3f3c4b), lavender = material(0x9185b3, { roughness: .33 });
  const shape = new THREE.Shape();
  shape.moveTo(-.9, .5); shape.bezierCurveTo(-1.35, .55, -1.7, -.35, -1.3, -.72); shape.bezierCurveTo(-1.02, -.96, -.65, -.25, -.3, -.2); shape.lineTo(.3, -.2); shape.bezierCurveTo(.65, -.25, 1.02, -.96, 1.3, -.72); shape.bezierCurveTo(1.7, -.35, 1.35, .55, .9, .5); shape.bezierCurveTo(.3, .61, -.3, .61, -.9, .5);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .25, bevelEnabled: true, bevelSize: .14, bevelThickness: .13, bevelSegments: 8, curveSegments: 32 }); geo.translate(0, 0, -.125); mesh(geo, body, group);
  box(group, .17, .47, .09, dark, -.88, .08, .31, .035); box(group, .47, .17, .09, dark, -.88, .08, .32, .035);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const button = cylinder(group, .095, .095, .085, [lavender, M.sage, M.sand, M.purple][i], .88 + Math.cos(a) * .2, .08 + Math.sin(a) * .2, .31, 32); button.rotation.x = Math.PI / 2; }
  for (const x of [-.42, .42]) {
    const base = cylinder(group, .22, .22, .07, dark, x, -.21, .31, 48); base.rotation.x = Math.PI / 2;
    const stick = cylinder(group, .15, .14, .16, dark, x, -.21, .4, 48); stick.rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(.15, .02, 8, 48), lavender, group, x, -.21, .49);
    box(group, .4, .12, .23, dark, x * 1.8, .52, -.05, .045);
  }
  box(group, .23, .025, .02, M.sage, 0, .31, .32, .01); box(group, .09, .035, .03, dark, -.18, .06, .32, .01); box(group, .09, .035, .03, dark, .18, .06, .32, .01);
  group.position.y = .83; group.rotation.set(-.22, -.3, 0);
}
const aim = food ? .48 : kind === 'headphones' ? .95 : .85;
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 100); camera.position.set(food ? 3.2 : 3.5, food ? 3.8 : 2.6, 5.7); camera.lookAt(0, aim, 0);
renderer.render(scene, camera); window.__ART_READY__ = true;
