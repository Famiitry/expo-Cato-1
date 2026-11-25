import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { createLeafFall } from './motion.js';

// All geometry, surface textures and brand labels are created here, in code.
// The same materials, scale and light response are used across the five scenes.
let seed = 83917;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const cache = new Map();
const geometry = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, ...options });
export const palette = { cream: 0xf4efe5, sand: 0xe8ddc9, plaster: 0xeae3d5, sage: 0x74835b, leaf: 0x4e703c, purple: 0x84708f, dark: 0x403b35, brass: 0xc0a16b };

function surface(kind, color) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < (kind === 'wood' ? 1900 : 14000); i++) {
    const x = random() * 512, y = random() * 512, light = random() > .5;
    ctx.fillStyle = light ? 'rgba(255,255,235,.075)' : 'rgba(54,33,18,.065)';
    if (kind === 'wood') ctx.fillRect(x, y, .5 + random() * 1.5, 20 + random() * 130);
    else ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }
  if (kind === 'stone') {
    ctx.strokeStyle = 'rgba(100,98,80,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.moveTo(random() * 512, 0); ctx.bezierCurveTo(random() * 512, 160, random() * 512, 320, random() * 512, 512); ctx.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}
const woodMap = surface('wood', '#b49a74');
const darkWoodMap = surface('wood', '#807158');
const stoneMap = surface('stone', '#e7e0d1');
const wickerMap = surface('wood', '#c2a778');
export const M = {
  plaster: standard(palette.plaster), sand: standard(palette.sand), soil: standard(0x6c5c43),
  cream: standard(0xf3eee1), purple: standard(palette.purple), purpleDark: standard(0x65506e),
  sage: standard(palette.sage), green: standard(palette.leaf), leafLight: standard(0x7c9452),
  wood: standard(0xffffff, { map: woodMap }), darkWood: standard(0xffffff, { map: darkWoodMap }),
  stone: standard(0xffffff, { map: stoneMap, roughness: .55 }), wicker: standard(0xffffff, { map: wickerMap }),
  brass: standard(palette.brass, { metalness: .8, roughness: .3 }),
  steel: standard(0xb9b8ab, { metalness: .8, roughness: .28 }),
  iron: standard(0x343d34, { metalness: .6, roughness: .42 }),
  skin: standard(0xc6926b), skinDark: standard(0x9d6846), cloth: standard(0xe1d4b4),
  rubber: standard(0x343a30), glass: new THREE.MeshPhysicalMaterial({ color: 0xe9efe1, transparent: true, opacity: .21, roughness: .1, metalness: .16, clearcoat: 1, depthWrite: false }),
  lamp: standard(0xffe5b2, { emissive: 0xffd28a, emissiveIntensity: .5 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x759b91, roughness: .16, metalness: .18, transparent: true, opacity: .8, clearcoat: 1 }),
};

export function mesh(geo, material, parent, x = 0, y = 0, z = 0, shadow = true) {
  const object = new THREE.Mesh(geo, material); object.position.set(x, y, z); object.castShadow = shadow; object.receiveShadow = true; if (parent) parent.add(object); return object;
}
export function box(parent, w, h, d, material, x = 0, y = 0, z = 0, radius = .035) {
  const key = ['box', w, h, d, radius].join('/');
  return mesh(geometry(key, () => radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d)), material, parent, x, y, z);
}
export function ball(parent, material, x, y, z, sx, sy = sx, sz = sx) {
  const object = mesh(geometry('sphere', () => new THREE.SphereGeometry(1, 16, 12)), material, parent, x, y, z); object.scale.set(sx, sy, sz); return object;
}
export function cylinder(parent, top, bottom, height, material, x = 0, y = 0, z = 0, segments = 24) {
  return mesh(geometry(['cyl', top, bottom, height, segments].join('/'), () => new THREE.CylinderGeometry(top, bottom, height, segments)), material, parent, x, y, z);
}
function ring(parent, radius, thickness, material, x, y, z, horizontal = true) {
  const object = mesh(geometry(['ring', radius, thickness].join('/'), () => new THREE.TorusGeometry(radius, thickness, 7, 40)), material, parent, x, y, z);
  if (horizontal) object.rotation.x = Math.PI / 2; return object;
}
function rod(parent, a, b, radius, material, radiusB = radius) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), direction = B.clone().sub(A);
  const object = cylinder(parent, radiusB, radius, direction.length(), material);
  object.position.copy(A.add(B).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object;
}
let shadowMap;
export function contact(parent, x, z, sx, sz, opacity = .2, y = .035) {
  if (!shadowMap) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64); gradient.addColorStop(0, 'rgba(52,43,27,.8)'); gradient.addColorStop(.35, 'rgba(52,43,27,.35)'); gradient.addColorStop(1, 'rgba(52,43,27,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); shadowMap = new THREE.CanvasTexture(c);
  }
  const object = mesh(geometry('plane', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity, depthWrite: false, toneMapped: false }), parent, x, y, z, false);
  object.rotation.x = -Math.PI / 2; object.scale.set(sx, sz, 1); object.renderOrder = 1; return object;
}
function textTexture(text, { color = '#403447', background = null, subtitle = '', size = 110 } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 512); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  const brand = text === 'bruma.' || text === 'Famiitry';
  if (brand) {
    let fontSize = size * 1.75;
    ctx.font = '400 ' + fontSize + 'px WindSong';
    let metrics = ctx.measureText(text);
    const fit = Math.min(1, 850 / metrics.width, (subtitle ? 245 : 360) / (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent));
    fontSize *= fit; ctx.font = '400 ' + fontSize + 'px WindSong'; metrics = ctx.measureText(text);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 512, (subtitle ? 210 : 250) + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
  } else { ctx.font = '500 ' + size + 'px "Cormorant Garamond", Georgia'; ctx.fillText(text, 512, subtitle ? 220 : 256); }
  if (subtitle) { ctx.textBaseline = 'middle'; ctx.font = '400 26px "DM Sans", Arial'; ctx.fillText(subtitle, 512, brand ? 380 : 325); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}
function sign(parent, text, w, h, x, y, z, options = {}) {
  const material = new THREE.MeshStandardMaterial({ map: textTexture(text, options), transparent: !options.background, roughness: .65, side: THREE.DoubleSide });
  return mesh(new THREE.PlaneGeometry(w, h), material, parent, x, y, z, false);
}
function authorPlaque(parent, x, y, z, scale = 1) {
  const plaque = new THREE.Group(); plaque.position.set(x, y, z); plaque.scale.setScalar(scale); parent.add(plaque);
  box(plaque, 1.52, .55, .055, M.brass, 0, 0, 0, .045);
  box(plaque, 1.46, .49, .018, M.purpleDark, 0, 0, .035, .035);
  sign(plaque, 'Famiitry', 1.34, .43, 0, .015, .048, { color: '#f4eee1', size: 220, subtitle: 'DISEÑO Y DESARROLLO' });
  for (const side of [-1, 1]) ball(plaque, M.brass, side * .67, 0, .052, .018, .018, .007);
  return plaque;
}
function island(parent, radius = 6.4, color = M.sand) {
  const shape = new THREE.Shape(); const n = 96;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = radius * (1 + .03 * Math.sin(a * 3) + .025 * Math.cos(a * 5)); const x = Math.cos(a) * r, y = Math.sin(a) * r * .8; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .35, bevelEnabled: true, bevelThickness: .18, bevelSize: .18, bevelSegments: 6, steps: 1, curveSegments: 24 }); geo.rotateX(-Math.PI / 2); geo.translate(0, -.53, 0);
  mesh(geo, color, parent, 0, 0, 0); contact(parent, 0, 0, radius * 2.4, radius * 1.9, .38, -.735);
  return parent;
}
function stones(parent, points, size = .45, material = M.stone) {
  const geo = geometry('paver', () => new RoundedBoxGeometry(1, .09, 1, 2, .07)); const inst = new THREE.InstancedMesh(geo, material, points.length); const dummy = new THREE.Object3D();
  points.forEach((p, i) => { dummy.position.set(p[0], p[1] || .03, p[2]); dummy.rotation.set(0, (random() - .5) * .15, 0); dummy.scale.set(size * (.85 + random() * .25), 1, size * (.85 + random() * .25)); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
  inst.receiveShadow = true; parent.add(inst);
}
function leafGeometry() {
  return geometry('leaf', () => {
    const g = new THREE.PlaneGeometry(1, 1, 2, 7); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) + .5; p.setXYZ(i, p.getX(i) * Math.sin(Math.PI * t) * .6, t, Math.sin(t * Math.PI) * .18 + Math.abs(p.getX(i)) * .1); }
    g.computeVertexNormals(); return g;
  });
}
const leafMat = standard(0x71884c, { side: THREE.DoubleSide, roughness: .65 });
function leaf(parent, x, y, z, scale, rz = 0, ry = 0) {
  const object = mesh(leafGeometry(), leafMat, parent, x, y, z, false); object.scale.setScalar(scale); object.rotation.set(.2, ry, rz); return object;
}
function plant(parent, x, y, z, scale = 1, pot = M.purple) {
  const group = new THREE.Group(); group.position.set(x, y, z); group.scale.setScalar(scale); parent.add(group);
  cylinder(group, .21, .15, .34, pot, 0, .17, 0); ring(group, .205, .018, pot, 0, .34, 0); cylinder(group, .185, .185, .015, M.soil, 0, .345, 0);
  for (let i = 0; i < 9; i++) { const a = i * 2.4; leaf(group, Math.sin(a) * .03, .34 + i * .025, Math.cos(a) * .03, .45 + random() * .3, Math.sin(a) * 1.1, a); }
  contact(group, 0, 0, .8, .8, .18, .005); return group;
}
function tree(parent, x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, .02, z); g.scale.setScalar(scale); parent.add(g);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.04, .65, 0), new THREE.Vector3(-.1, 1.35, .02), new THREE.Vector3(.02, 2.2, 0)]);
  mesh(new THREE.TubeGeometry(path, 12, .12, 8, false), M.darkWood, g);
  const canopyGeometry = geometry('organic-canopy', () => {
    const geo = new THREE.IcosahedronGeometry(1, 3); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + .055 * Math.sin(x * 9 + z * 5) * Math.sin(y * 8) + .025 * Math.cos(z * 13); p.setXYZ(i, x * n, y * n, z * n); }
    // Preserve the shared spherical normals: recomputing a non-indexed
    // icosahedron would introduce an unwanted faceted, low-poly surface.
    return geo;
  });
  const canopy = new THREE.InstancedMesh(canopyGeometry, M.green, 18); const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4, r = .25 + random() * .65, py = 2 + random() * .85, size = .37 + random() * .3;
    dummy.position.set(Math.sin(a) * r, py, Math.cos(a) * r); dummy.scale.set(size, size * .9, size); dummy.rotation.set(a * .4, a, .2); dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix); canopy.setColorAt(i, new THREE.Color().setHSL(.22 + random() * .04, .24, .8 + random() * .12));
    if (i < 5) rod(g, [0, 1.2, 0], [Math.sin(a) * r, py, Math.cos(a) * r], .035, M.darkWood, .012);
  }
  canopy.castShadow = true; canopy.receiveShadow = true; g.add(canopy);
  const tips = new THREE.InstancedMesh(leafGeometry(), leafMat, 100);
  for (let i = 0; i < 100; i++) { const a = random() * Math.PI * 2, y = 1.9 + random() * 1.3; dummy.position.set(Math.sin(a) * (.7 + random() * .4), y, Math.cos(a) * (.6 + random() * .4)); dummy.rotation.set(1.1, a, (random() - .5) * 2); dummy.scale.setScalar(.16 + random() * .17); dummy.updateMatrix(); tips.setMatrixAt(i, dummy.matrix); } g.add(tips);
  contact(g, 0, 0, 3.1, 2.6, .22); return g;
}
function basket(parent, x, y, z, scale = 1, full = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, .31, .23, .5, M.wicker, 0, .25, 0); for (let i = 0; i < 9; i++) ring(g, .24 + i * .008, .015, M.wicker, 0, .04 + i * .053, 0);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rod(g, [Math.sin(a) * .24, 0, Math.cos(a) * .24], [Math.sin(a) * .31, .5, Math.cos(a) * .31], .009, M.darkWood); }
  if (full) for (let i = 0; i < 20; i++) { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * .22; leaf(g, Math.sin(a) * r, .44, Math.cos(a) * r, .25 + random() * .2, (random() - .5) * 2, a); }
  return g;
}
function person(parent, x, z, { scale = 1, rotation = 0, apron = true, hat = true, helmet = false, color = M.purple, pose = 'stand', ground = .02 } = {}) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, ground, z); g.rotation.y = rotation; g.scale.setScalar(scale);
  g.userData.animated = true; g.userData.motionKind = 'character'; g.userData.pose = pose;
  const phase = (x * 1.7 + z * .8) % (Math.PI * 2);
  const body = new THREE.Group(); body.position.y = .65; g.add(body);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * .11, .65, 0); g.add(hip);
    rod(hip, [0, 0, 0], [side * .02, -.28, .02], .095, M.cloth, .085);
    const knee = new THREE.Group(); knee.position.set(side * .02, -.28, .02); hip.add(knee);
    rod(knee, [0, 0, 0], [side * .02, -.25, side * .02], .084, M.cloth, .075);
    box(knee, .18, .12, .29, M.darkWood, side * .02, -.3, .055, .055); legs.push({ hip, knee });
  }
  ball(body, color, 0, .29, 0, .27, .35, .18);
  if (apron) { const a = box(body, .4, .5, .04, M.cloth, 0, .23, .175, .03); a.rotation.x = -.05; rod(body, [-.12, .56, .13], [-.18, .08, .2], .018, M.cream); rod(body, [.12, .56, .13], [.18, .08, .2], .018, M.cream); }
  const head = new THREE.Group(); head.position.y = .63; body.add(head);
  cylinder(head, .065, .065, .14, M.skin);
  ball(head, M.skin, 0, .2, .015, .16, .21, .15); ball(head, M.skin, 0, .18, .155, .035, .045, .045);
  const hair = ball(head, M.darkWood, 0, .29, -.025, .165, .14, .14); hair.rotation.x = -.2;
  if (hat) { cylinder(head, .35, .35, .035, M.wicker, 0, .37, 0, 32); cylinder(head, .13, .2, .2, M.wicker, 0, .47, 0); ring(head, .2, .022, M.purpleDark, 0, .38, 0); }
  if (helmet) ball(head, M.sage, 0, .4, 0, .19, .15, .18);
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * .22, .48, 0); body.add(shoulder);
    rod(shoulder, [0, 0, 0], [side * .13, -.23, .12], .072, color, .06);
    const elbow = new THREE.Group(); elbow.position.set(side * .13, -.23, .12); shoulder.add(elbow);
    rod(elbow, [0, 0, 0], [-side * .14, .13, .24], .06, M.skin, .045);
    const hand = new THREE.Group(); hand.position.set(-side * .14, .13, .26); elbow.add(hand); ball(hand, M.skin, 0, 0, 0, .065);
    arms.push({ shoulder, elbow, hand });
  }
  const [left, right] = arms;
  if (pose === 'serve' || pose === 'sip') {
    cylinder(right.hand, .07, .05, .17, M.cream, 0, .045, .07); ring(right.hand, .07, .008, M.purpleDark, 0, .13, .07);
  }
  if (pose === 'mix') {
    rod(right.hand, [0, 0, 0], [0, -.26, .08], .015, M.wood);
    for (let i = 0; i < 3; i++) { const whisk = ring(right.hand, .045, .004, M.steel, 0, -.27, .08, false); whisk.rotation.y = i * Math.PI / 3; }
  }
  g.userData.animate = time => {
    const t = time + phase, breath = Math.sin(t * 1.4);
    body.position.y = .65 + breath * .008; body.rotation.set(.025, Math.sin(t * .45) * .045, 0);
    head.rotation.set(Math.sin(t * .8) * .035, Math.sin(t * .5) * .12, 0);
    for (const arm of arms) { arm.shoulder.rotation.set(-.04 + breath * .04, 0, 0); arm.elbow.rotation.set(0, 0, 0); }
    legs.forEach(leg => { leg.hip.rotation.x = 0; leg.knee.rotation.x = 0; });
    g.position.z = z;
    if (pose === 'garden') {
      const pick = Math.sin(t * 1.5); body.rotation.x = .28 + pick * .08; head.rotation.x = .22;
      right.shoulder.rotation.x = -.25 - pick * .32; right.elbow.rotation.x = .15 + pick * .3;
      left.shoulder.rotation.x = -.08 + Math.sin(t * 1.5 + 1.2) * .18;
    } else if (pose === 'mix') {
      body.rotation.x = .1; head.rotation.x = .18;
      right.shoulder.rotation.set(-.4 + Math.sin(t * 2.3) * .16, 0, Math.cos(t * 2.3) * .2);
      right.elbow.rotation.y = Math.sin(t * 2.3) * .25; left.shoulder.rotation.x = -.24;
    } else if (pose === 'prepare') {
      body.rotation.x = .1; head.rotation.x = .15;
      right.shoulder.rotation.x = -.3 + Math.sin(t * 1.6) * .25; left.shoulder.rotation.x = -.3 - Math.sin(t * 1.6) * .2;
    } else if (pose === 'wave') {
      right.shoulder.rotation.set(-1.5, 0, -.3 + Math.sin(t * 3.4) * .26);
      right.elbow.rotation.z = Math.sin(t * 3.4) * .2; head.rotation.y = -.12 + Math.sin(t * .7) * .13;
    } else if (pose === 'serve') {
      right.shoulder.rotation.x = -.65 + Math.sin(t * 1.15) * .3; left.shoulder.rotation.x = -.18;
    } else if (pose === 'sip') {
      right.shoulder.rotation.x = -1.08 + Math.sin(t * .8) * .32; right.elbow.rotation.x = -.12;
      head.rotation.x = .04 + Math.sin(t * .8) * .07;
    } else if (pose === 'walk') {
      const step = Math.sin(t * 2.6);
      legs[0].hip.rotation.x = step * .32; legs[1].hip.rotation.x = -step * .32;
      legs[0].knee.rotation.x = Math.max(0, -step) * .35; legs[1].knee.rotation.x = Math.max(0, step) * .35;
      left.shoulder.rotation.x = -step * .22; right.shoulder.rotation.x = step * .22;
      body.position.y += Math.abs(step) * .012; g.position.z = z + Math.sin(t * .65) * .16;
    }
  };
  g.userData.motionSample = () => [body.rotation.x, head.rotation.y, right.shoulder.rotation.x, right.shoulder.rotation.z, left.shoulder.rotation.x, legs[0].hip.rotation.x];
  g.userData.animate(0); contact(g, 0, 0, 1.1, .8, .22); return g;
}
function bench(parent, x, z, rotation = 0) {
  const g = new THREE.Group(); g.position.set(x, .05, z); g.rotation.y = rotation; parent.add(g);
  for (let i = 0; i < 4; i++) box(g, 1.8, .09, .12, M.wood, 0, .48, i * .135 - .2);
  for (const side of [-1, 1]) { box(g, .09, .45, .48, M.iron, side * .65, .24, 0); rod(g, [side * .65, .3, -.22], [side * .65, 1, -.32], .035, M.iron); }
  for (let i = 0; i < 3; i++) box(g, 1.8, .12, .06, M.wood, 0, .68 + i * .13, -.3);
  contact(g, 0, 0, 2.4, 1, .2); return g;
}
function archShape(w, h) {
  const r = w / 2; const shape = new THREE.Shape(); shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, h - r); shape.absarc(0, h - r, r, 0, Math.PI, false); shape.lineTo(-r, 0); return shape;
}
function arch(parent, w, h, depth, material, x, y, z, frame = false) {
  const shape = archShape(w, h);
  if (frame) { const inside = archShape(w - .14, h - .09); inside.getPoints(32).reverse().forEach((p, i) => { if (!i) { const hole = new THREE.Path(); hole.moveTo(p.x, p.y + .035); shape.holes.push(hole); } else shape.holes[0].lineTo(p.x, p.y + .035); }); }
  return mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2, curveSegments: 24 }), material, parent, x, y, z);
}
function bottle(parent, x, y, z, color = M.purple, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, .075, .085, .28, color, 0, .14, 0); cylinder(g, .035, .035, .1, color, 0, .31, 0); cylinder(g, .04, .04, .04, M.brass, 0, .37, 0); box(g, .09, .11, .015, M.cream, 0, .15, .08, .006); return g;
}

export function buildFarm() {
  const g = new THREE.Group(); island(g, 6.5);
  // Tea terraces, with thousands of individual instanced leaves.
  const bushes = [], leaves = [];
  for (let row = 0; row < 6; row++) {
    const z = 3.25 - row * .64, y = .08 + row * .065, width = 5.3 - row * .14;
    box(g, width + .13, .22, .5, M.wood, -1, y, z, .07); box(g, width, .1, .4, M.soil, -1, y + .14, z, .04);
    for (let b = 0; b < 13; b++) {
      const x = -1 - width / 2 + .22 + b * (width - .44) / 12; const py = y + .3;
      bushes.push([x, py, z, .28, .24, .23]);
      for (let j = 0; j < 32; j++) { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * .25; leaves.push([x + Math.sin(a) * r, py + .08 + random() * .14, z + Math.cos(a) * r, a, .14 + random() * .16]); }
    }
  }
  const shrubGeo = geometry('shrub', () => new THREE.SphereGeometry(1, 12, 9)); const shrub = new THREE.InstancedMesh(shrubGeo, M.green, bushes.length); const d = new THREE.Object3D();
  bushes.forEach((p, i) => { d.position.set(...p.slice(0, 3)); d.scale.set(...p.slice(3)); d.rotation.y = random() * 3; d.updateMatrix(); shrub.setMatrixAt(i, d.matrix); shrub.setColorAt(i, new THREE.Color().setHSL(.23 + random() * .04, .3 + random() * .2, .25 + random() * .08)); }); shrub.castShadow = true; shrub.receiveShadow = true; g.add(shrub);
  const leafBatch = new THREE.InstancedMesh(leafGeometry(), leafMat, leaves.length);
  leaves.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.rotation.set(.7 + random() * 1.3, p[3], (random() - .5) * 1.5); d.scale.setScalar(p[4]); d.updateMatrix(); leafBatch.setMatrixAt(i, d.matrix); leafBatch.setColorAt(i, new THREE.Color().setHSL(.21 + random() * .08, .35, .65 + random() * .2)); }); g.add(leafBatch);
  // Plaster farmhouse with timber frame, individual roof courses and a porch.
  const house = new THREE.Group(); house.position.set(1, .05, -2); g.add(house);
  box(house, 3.2, .2, 2.8, M.stone, 0, .1, 0, .1); box(house, 2.9, 1.85, 2.45, M.plaster, 0, 1.08, 0, .06);
  const sideShape = new THREE.Shape(); sideShape.moveTo(-1.55, 0); sideShape.lineTo(1.55, 0); sideShape.lineTo(0, .9); sideShape.closePath();
  mesh(new THREE.ExtrudeGeometry(sideShape, { depth: 2.5, bevelEnabled: false }), M.plaster, house, 0, 2, -1.25);
  for (const side of [-1, 1]) {
    const roof = new THREE.Group(); roof.position.set(0, 2.93, 0); roof.rotation.z = side * -.5; house.add(roof);
    for (let i = 0; i < 11; i++) box(roof, 1.83, .095, .27, i % 3 === 0 ? M.purpleDark : M.purple, side * .85, -.045, -1.48 + i * .29, .025);
    for (const z of [-1.56, 1.56]) box(roof, 1.9, .13, .08, M.cream, side * .85, -.1, z, .015);
  }
  cylinder(house, .105, .105, 3.2, M.purpleDark, 0, 2.94, 0).rotation.x = Math.PI / 2;
  arch(house, .72, 1.45, .06, M.darkWood, -.6, .22, 1.25); arch(house, .83, 1.54, .08, M.cream, -.6, .22, 1.28, true);
  arch(house, .63, .85, .03, M.glass, .75, .78, 1.26); arch(house, .72, .95, .04, M.purple, .75, .73, 1.29, true);
  box(house, .04, .8, .07, M.wood, .75, 1.18, 1.34); box(house, .6, .04, .07, M.wood, .75, 1.15, 1.34);
  box(house, 1.2, .17, .45, M.wood, -.6, .15, 1.55); box(house, 1.4, .1, .5, M.stone, -.6, .06, 1.8);
  sign(house, 'bruma.', .75, .38, -.6, 1.85, 1.33, { size: 130 });
  plant(house, -1.35, .2, 1.4, .9, M.purple); plant(house, 1.35, .2, 1.4, .8, M.sand);
  box(house, .4, .8, .45, M.stone, 1, 3, -.5); box(house, .55, .12, .6, M.cream, 1, 3.44, -.5);
  // Side greenhouse: glazed roof, frame and rows of seedlings.
  const glasshouse = new THREE.Group(); glasshouse.position.set(3.45, .05, -1.5); g.add(glasshouse);
  box(glasshouse, 1.7, .2, 2.6, M.stone, 0, .1, 0);
  box(glasshouse, 1.6, 1.3, 2.5, M.glass, 0, .85, 0);
  for (const x of [-.8, 0, .8]) for (const z of [-1.25, 0, 1.25]) rod(glasshouse, [x, .2, z], [x, 1.52, z], .022, M.cream);
  for (const z of [-1.25, 0, 1.25]) { rod(glasshouse, [-.85, 1.52, z], [0, 2.04, z], .027, M.cream); rod(glasshouse, [0, 2.04, z], [.85, 1.52, z], .027, M.cream); }
  rod(glasshouse, [0, 2.04, -1.3], [0, 2.04, 1.3], .03, M.cream);
  for (const side of [-1, 1]) { const pane = box(glasshouse, .98, .025, 2.5, M.glass, side * .42, 1.78, 0, 0); pane.rotation.z = -side * .55; }
  for (let i = 0; i < 6; i++) plant(glasshouse, i % 2 ? .42 : -.42, .2, -.8 + Math.floor(i / 2) * .7, .48, M.sand);
  // Curved blue-green stream and a small timber crossing.
  const river = new THREE.Shape(); river.moveTo(-5.8, -2.4); river.bezierCurveTo(-4, -3, -4.5, 1.5, -4.5, 2.3); river.bezierCurveTo(-4.6, 3.2, -3.7, 4, -2, 4.3); river.lineTo(-1.9, 4.75); river.bezierCurveTo(-4.8, 4.4, -5.2, 3.5, -5.1, 1.5); river.bezierCurveTo(-5.1, -.8, -4.8, -1.9, -5.9, -1.8); river.closePath();
  const riverMesh = mesh(new THREE.ShapeGeometry(river, 40), M.water, g, 0, .04, 0, false); riverMesh.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 10; i++) { const x = -5.2 + random() * .7, z = -1.8 + i * .52; ball(g, M.stone, x, .09, z, .17 + random() * .12, .1, .2); }
  for (let i = 0; i < 8; i++) box(g, 1.2, .09, .16, M.wood, -4.7, .22 + Math.sin(i / 7 * Math.PI) * .08, .2 + i * .17, .025);
  for (const side of [-1, 1]) { rod(g, [-5.3, .26, .2 + (side + 1) * .55], [-5.3, .7, .2 + (side + 1) * .55], .025, M.wood); rod(g, [-4.1, .26, .2 + (side + 1) * .55], [-4.1, .7, .2 + (side + 1) * .55], .025, M.wood); }
  tree(g, -3.8, -2.7, 1.35); tree(g, 3.5, 2.7, 1.05); tree(g, -.9, -4, .85);
  // A timber creator sign beside the foreground tree, facing the camera path.
  const creatorSign = new THREE.Group(); creatorSign.position.set(2.3, .02, 3.8); creatorSign.rotation.y = .38; g.add(creatorSign);
  for (const x of [-.58, .58]) box(creatorSign, .075, 1.18, .075, M.wood, x, .59, 0, .015);
  box(creatorSign, 1.72, .76, .11, M.wood, 0, 1.1, 0, .065);
  box(creatorSign, 1.6, .64, .024, M.cream, 0, 1.1, .068, .035);
  sign(creatorSign, 'Famiitry', 1.48, .59, 0, 1.11, .085, { color: '#66516f', size: 230, subtitle: 'DISEÑO Y DESARROLLO' });
  for (const x of [-.71, .71]) ball(creatorSign, M.brass, x, 1.1, .087, .022, .022, .01);
  person(g, .6, 2.05, { scale: .83, rotation: -.8, pose: 'garden' }); person(g, -2.7, .3, { scale: .78, rotation: 1.5, pose: 'garden', color: M.cloth });
  basket(g, 1.2, .08, 2.6, 1, true); basket(g, -2.3, .12, .65, .8, true);
  const path = []; for (let i = 0; i < 19; i++) path.push([1.25 + Math.sin(i * .2) * .5, .04, -.05 + i * .23]); stones(g, path, .4);
  bench(g, 3.2, 1.1, -.7);
  for (let i = 0; i < 8; i++) { const a = i * 2.4; plant(g, Math.sin(a) * 5.5, .02, Math.cos(a) * 4.1, .35 + random() * .2, M.sand); }
  return g;
}

export function buildWorkshop() {
  const g = new THREE.Group(); island(g, 5.7);
  box(g, 7.5, .2, 5.5, M.stone, 0, .12, -.3, .12);
  // An open cutaway room. Every visible surface is actual geometry.
  box(g, 7.3, 3.35, .18, M.plaster, 0, 1.88, -2.95, .05);
  box(g, .18, 3.35, 4.1, M.plaster, -3.6, 1.88, -.9, .05);
  box(g, 7.5, .12, .24, M.cream, 0, 3.6, -2.92); box(g, .24, .12, 4.2, M.cream, -3.6, 3.6, -.9);
  // Back wall tile courses and brass pipework.
  for (let row = 0; row < 5; row++) for (let col = 0; col < 13; col++) box(g, .52, .19, .025, row % 2 ? M.cream : M.stone, -3.2 + col * .54, .42 + row * .21, -2.84, .01);
  for (const x of [-2.9, -.9, 2.6]) { rod(g, [x, 1.1, -2.6], [x, 2.95, -2.6], .035, M.brass); ring(g, .1, .023, M.brass, x, 2.4, -2.55, false); }
  sign(g, 'El taller', 2.5, 1.15, 0, 2.85, -2.82, { subtitle: 'EL TIEMPO TAMBIÉN ES UN INGREDIENTE', size: 120 });
  box(g, 6.5, .95, 1, M.sage, 0, .74, -2.12, .06); box(g, 6.7, .13, 1.1, M.stone, 0, 1.28, -2.12, .04);
  for (let i = 0; i < 9; i++) { box(g, .64, .7, .04, M.sage, -2.8 + i * .7, .74, -1.59, .02); box(g, .2, .025, .04, M.brass, -2.8 + i * .7, .9, -1.55, .01); }
  for (const x of [-1.9, -.7, .5]) {
    const urn = cylinder(g, .37, .37, .85, M.steel, x, 1.77, -2.05); urn.material = M.steel;
    cylinder(g, .32, .4, .12, M.steel, x, 2.24, -2.05); ball(g, M.iron, x, 2.34, -2.05, .065, .07, .065);
    rod(g, [x, 1.55, -1.68], [x, 1.55, -1.43], .035, M.brass); rod(g, [x, 1.55, -1.43], [x, 1.43, -1.43], .035, M.brass); ring(g, .06, .018, M.iron, x, 1.68, -1.66, false);
    box(g, .4, .06, .45, M.iron, x, 1.33, -1.65);
  }
  // Drying racks, stacked trays, jars and a central preparation counter.
  const rack = new THREE.Group(); rack.position.set(-2.4, .25, .1); g.add(rack);
  for (const x of [-.65, .65]) for (const z of [-.45, .45]) box(rack, .055, 2.3, .055, M.wood, x, 1.15, z);
  for (let i = 0; i < 5; i++) { box(rack, 1.35, .06, .95, M.wood, 0, .4 + i * .38, 0); box(rack, 1.18, .03, .8, M.green, 0, .45 + i * .38, 0, .04); }
  const table = new THREE.Group(); table.position.set(.7, .2, .7); g.add(table);
  box(table, 3.7, 1.1, 1.3, M.purple, 0, .6, 0, .1); box(table, 3.9, .16, 1.48, M.stone, 0, 1.22, 0, .06);
  for (let i = 0; i < 30; i++) box(table, .045, .83, .045, M.purpleDark, -1.7 + i * .118, .6, .67, .01);
  authorPlaque(table, -.15, .61, .735);
  for (const x of [-1, -.3, .4]) { cylinder(table, .15, .11, .2, M.cream, x, 1.39, .18); ring(table, .15, .014, M.brass, x, 1.5, .18); }
  const bowl = mesh(new THREE.LatheGeometry([new THREE.Vector2(.15, 0), new THREE.Vector2(.32, .08), new THREE.Vector2(.4, .3), new THREE.Vector2(.37, .31), new THREE.Vector2(.29, .1), new THREE.Vector2(.15, .04)], 32), M.purpleDark, table, .95, 1.3, 0);
  rod(table, [.85, 1.38, 0], [1.3, 1.85, .1], .03, M.wood);
  for (let i = 0; i < 4; i++) bottle(table, -1.4 + i * .23, 1.3, -.35, i % 2 ? M.sage : M.sand, .8);
  person(g, 1.1, -.3, { hat: false, rotation: .4, scale: 1.1, pose: 'mix', ground: .22 }); person(g, -2.5, -1.2, { hat: false, rotation: 1.2, color: M.cloth, pose: 'prepare', ground: .22 });
  for (const x of [-2.7, 0, 2.7]) { rod(g, [x, 3.7, -.3], [x, 2.8, -.3], .018, M.iron); const shade = cylinder(g, .09, .4, .27, M.purple, x, 2.72, -.3); cylinder(g, .35, .35, .015, M.lamp, x, 2.58, -.3); }
  box(g, 1.2, .08, .35, M.wood, 2.4, 2, -2.6);
  for (let i = 0; i < 5; i++) bottle(g, 2 + i * .2, 2.05, -2.6, i % 2 ? M.purple : M.sage);
  plant(g, 3.3, .2, 1.5, 1.5, M.sand); plant(g, -3.6, .03, 2.4, 1.7); basket(g, 2.9, .2, -1, 1.1, true);
  return g;
}

function cafeTable(parent, x, z, shade = false) {
  const g = new THREE.Group(); g.position.set(x, .05, z); parent.add(g);
  cylinder(g, .55, .55, .09, M.stone, 0, .85, 0); rod(g, [0, .05, 0], [0, .82, 0], .055, M.brass); cylinder(g, .32, .32, .055, M.brass, 0, .055, 0);
  for (const side of [-1, 1]) { cylinder(g, .25, .25, .08, M.purple, side * .85, .49, 0); for (const a of [-.16, .16]) for (const b of [-.16, .16]) rod(g, [side * .85 + a, .05, b], [side * .85 + a * .8, .48, b], .018, M.brass); const back = ring(g, .25, .025, M.brass, side * .85, .8, -.14, false); back.scale.y = .8; }
  cylinder(g, .075, .055, .18, M.purple, .2, .98, .1); plant(g, -.18, .9, -.1, .3, M.sand);
  if (shade) { rod(g, [0, 0, 0], [0, 2.8, 0], .03, M.wood); cylinder(g, .05, 1.4, .46, M.cloth, 0, 2.7, 0, 12); ring(g, 1.4, .02, M.cream, 0, 2.47, 0); ball(g, M.brass, 0, 2.98, 0, .045); }
  contact(g, 0, 0, 2.5, 2.5, .17); return g;
}
export function buildShop() {
  const g = new THREE.Group(); island(g, 6);
  box(g, 7.8, .18, 6.2, M.stone, 0, .1, -.3, .16);
  box(g, 5.8, 3.2, .22, M.plaster, 0, 1.85, -2.8, .07); box(g, .22, 3.2, 4.2, M.plaster, -2.8, 1.85, -.8, .07);
  box(g, .22, 3.2, 4.2, M.plaster, 2.8, 1.85, -.8, .07);
  box(g, 6.2, .3, 1.5, M.cream, 0, 3.6, -2.1, .12);
  // Front facade with two genuinely open arched doorways.
  const facade = new THREE.Shape(); facade.moveTo(-3, .2); facade.lineTo(3, .2); facade.lineTo(3, 3.6); facade.lineTo(-3, 3.6); facade.closePath();
  for (const center of [-1.6, 1.35]) {
    const a = archShape(2.1, 2.7), points = a.getPoints(40).reverse(); const hole = new THREE.Path(); points.forEach((p, i) => { if (!i) hole.moveTo(p.x + center, p.y + .2); else hole.lineTo(p.x + center, p.y + .2); }); facade.holes.push(hole);
    arch(g, 2.23, 2.79, .09, M.purpleDark, center, .18, 1.23, true);
  }
  mesh(new THREE.ExtrudeGeometry(facade, { depth: .2, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2, curveSegments: 30 }), M.plaster, g, 0, 0, 1.25);
  // The right arch is a shop window, the left one stays open.
  arch(g, 1.96, 2.59, .008, M.glass, 1.35, .24, 1.38);
  rod(g, [1.35, .25, 1.43], [1.35, 2.86, 1.43], .025, M.purpleDark); rod(g, [.35, 1.25, 1.43], [2.35, 1.25, 1.43], .025, M.purpleDark);
  box(g, 6.2, .28, .3, M.cream, 0, 3.63, 1.35, .05);
  sign(g, 'bruma.', 2.6, .85, -.1, 3.13, 1.49, { color: '#66516f', size: 150 });
  // Striped fabric canopy, curved profile rather than a flat plane.
  const awning = new THREE.Group(); awning.position.set(0, 2.9, 1.5); g.add(awning);
  for (let stripe = 0; stripe < 16; stripe++) {
    const geo = new THREE.PlaneGeometry(.36, 1.1, 1, 12); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) + .55; pos.setY(i, -.32 * Math.sin(t / 1.1 * Math.PI / 2)); pos.setZ(i, t); } geo.computeVertexNormals();
    const material = stripe % 2 ? M.cream : M.purple; const m = mesh(geo, material, awning, -2.7 + stripe * .36, 0, 0); m.material = material.clone(); m.material.side = THREE.DoubleSide;
    box(awning, .36, .18, .035, material, -2.7 + stripe * .36, -.4, 1.1, .012);
  }
  for (const x of [-2.75, 2.75]) rod(g, [x, 2.9, 1.45], [x, 2.42, 2.55], .02, M.brass);
  // The interior is fully furnished, so approaching the entrance reveals a real room.
  box(g, 4.7, 1.05, .85, M.purple, 0, .8, -1.5, .08); box(g, 4.9, .13, 1, M.stone, 0, 1.4, -1.5, .045);
  for (let i = 0; i < 34; i++) box(g, .04, .8, .04, M.purpleDark, -2.2 + i * .133, .8, -1.05, .008);
  box(g, .55, .5, .45, M.steel, 1.15, 1.72, -1.5, .04); box(g, .52, .12, .2, M.iron, 1.15, 1.55, -1.15, .02);
  const tablet = box(g, .42, .33, .045, M.iron, -.4, 1.65, -1.45, .025); tablet.rotation.x = -.35;
  for (const x of [-1.8, -1.3, -.8]) cylinder(g, .085, .065, .24, M.cream, x, 1.59, -1.32);
  for (const h of [1.7, 2.35]) { box(g, 3.8, .08, .3, M.wood, 0, h, -2.62); for (let i = 0; i < 12; i++) bottle(g, -1.65 + i * .3, h + .05, -2.6, [M.sage, M.sand, M.purple][i % 3], .9); }
  for (const x of [-1.8, 0, 1.8]) { rod(g, [x, 3.3, -.6], [x, 2.55, -.6], .012, M.brass); ball(g, M.lamp, x, 2.4, -.6, .17); cylinder(g, .04, .23, .13, M.brass, x, 2.55, -.6); }
  person(g, .7, -2.2, { hat: false, scale: .95, pose: 'serve', ground: .2 }); person(g, -1.6, 2.1, { apron: false, hat: false, scale: .9, rotation: -.4, color: M.sage, pose: 'wave', ground: .2 });
  cafeTable(g, 2.2, 3.05); cafeTable(g, -3.7, .8, true);
  tree(g, 4, -.8, 1.1); tree(g, -4.2, -2.5, 1);
  for (const x of [-2.85, 2.8]) { box(g, .7, .4, .65, M.purple, x, .35, 1.85, .07); plant(g, x, .55, 1.85, 1.2, M.purple); }
  const board = new THREE.Group(); board.position.set(.25, .22, 2.5); board.rotation.y = -.18; g.add(board);
  const face = box(board, .65, 1.05, .06, M.wood, 0, .65, 0, .035); face.rotation.x = -.12;
  box(board, .55, .9, .025, M.purpleDark, 0, .65, .046);
  sign(board, 'CREADO POR', .48, .18, 0, .97, .065, { color: '#d9c8df', size: 60 });
  sign(board, 'Famiitry', .54, .29, 0, .74, .067, { color: '#f4efe5', size: 240 });
  sign(board, 'DISEÑO Y CÓDIGO', .48, .17, 0, .5, .065, { color: '#d9c8df', size: 50 });
  rod(board, [-.25, .05, -.35], [-.25, 1.1, 0], .025, M.wood); rod(board, [.25, .05, -.35], [.25, 1.1, 0], .025, M.wood);
  const path = []; for (let i = 0; i < 13; i++) for (let j = 0; j < 3; j++) path.push([-2.5 + i * .4, .02, 3.75 + j * .3]); stones(g, path, .29);
  return g;
}

function bike(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, .08, z); g.rotation.y = -.24; parent.add(g);
  const wheelZ = [-.85, .98];
  for (const wz of wheelZ) {
    const wheel = ring(g, .47, .055, M.rubber, 0, .5, wz, false); wheel.rotation.y = Math.PI / 2;
    const rim = ring(g, .4, .017, M.steel, 0, .5, wz, false); rim.rotation.y = Math.PI / 2;
    rod(g, [-.12, .5, wz], [.12, .5, wz], .045, M.steel);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; rod(g, [0, .5, wz], [0, .5 + Math.sin(a) * .4, wz + Math.cos(a) * .4], .004, M.steel); }
  }
  const frame = [[0, .5, -.85], [0, .62, .05], [0, 1.25, -.24], [0, .5, -.85], [0, 1.1, .58], [0, .62, .05], [0, .5, .98]];
  for (let i = 0; i < frame.length - 1; i++) rod(g, frame[i], frame[i + 1], .04, M.purpleDark);
  rod(g, [0, 1.1, .58], [0, 1.42, .7], .03, M.steel); rod(g, [-.35, 1.4, .7], [.35, 1.4, .7], .025, M.iron);
  rod(g, [0, 1.2, -.24], [0, 1.42, -.27], .025, M.steel); box(g, .32, .09, .45, M.darkWood, 0, 1.44, -.3, .06);
  ring(g, .15, .014, M.steel, .05, .62, .05, false).rotation.y = Math.PI / 2; rod(g, [0, .62, .05], [.22, .5, .05], .018, M.steel); box(g, .16, .045, .1, M.iron, .23, .49, .05);
  box(g, .12, .36, .34, M.iron, 0, .85, .08, .03);
  box(g, .95, .6, .7, M.purple, 0, 1.05, .97, .075); box(g, 1.02, .065, .78, M.purpleDark, 0, 1.37, .97, .025);
  const logo = sign(g, 'Famiitry', .7, .4, .49, 1.1, .97, { color: '#f4efe5', size: 190, subtitle: 'DISEÑO Y DESARROLLO' }); logo.rotation.y = Math.PI / 2;
  sign(g, 'Famiitry', .82, .43, 0, 1.1, 1.329, { color: '#f4efe5', size: 190 });
  for (const px of [-.2, .2]) { box(g, .26, .37, .26, M.cloth, px, 1.59, .95, .025); ring(g, .06, .008, M.darkWood, px, 1.83, .95, false); }
  contact(g, 0, .1, 2, 3.2, .24); return g;
}
export function buildDelivery() {
  const g = new THREE.Group(); island(g, 5.7);
  box(g, 9.1, .12, 3, M.stone, 0, .04, 1, .1);
  const paving = []; for (let x = 0; x < 24; x++) for (let z = 0; z < 8; z++) paving.push([-4.2 + x * .37 + (z % 2) * .17, .1, -.35 + z * .34]); stones(g, paving, .32);
  box(g, 7.2, .23, 1.6, M.cream, 0, .08, -1.3, .07);
  tree(g, -3.2, -1.5, 1.25); tree(g, 3.4, -1.6, 1.35);
  bench(g, -.6, -1.3); bike(g, 1.3, .8);
  person(g, .15, .5, { apron: false, hat: false, helmet: true, color: M.purple, rotation: .8, scale: 1.05, pose: 'walk', ground: .15 });
  person(g, -1, -1.1, { apron: false, hat: false, color: M.cloth, scale: .9, rotation: -.3, pose: 'sip', ground: .2 });
  const kiosk = new THREE.Group(); kiosk.position.set(2.35, .2, -2.4); g.add(kiosk); box(kiosk, 1.5, 1.55, .7, M.purple, 0, .78, 0, .08); box(kiosk, 1.65, .12, .85, M.cream, 0, 1.6, 0, .03); sign(kiosk, 'Una pausa.', 1.2, 1, 0, .9, .36, { color: '#f4efe5', subtitle: 'TAMBIÉN PARA LLEVAR', size: 110 });
  for (let i = 0; i < 5; i++) { const x = -3 + i * 1.4; cylinder(g, .035, .04, .75, M.iron, x, .45, -.2); ball(g, M.brass, x, .83, -.2, .05); }
  for (let i = 0; i < 7; i++) plant(g, -3.5 + i * 1.1, .2, -2.2, .7, M.sand);
  const streetlight = new THREE.Group(); streetlight.position.set(-3.8, 0, 1.8); g.add(streetlight); rod(streetlight, [0, 0, 0], [0, 3.6, 0], .045, M.purpleDark); rod(streetlight, [0, 3.6, 0], [.6, 3.6, 0], .03, M.purpleDark); ball(streetlight, M.lamp, .6, 3.45, 0, .15); cylinder(streetlight, .07, .25, .1, M.purpleDark, .6, 3.62, 0);
  return g;
}

export const flavors = {
  matcha: { liquid: 0xa3b375, deep: 0x74864e, light: 0xd8dfbb, background: 0xe6e9dc },
  taro: { liquid: 0xba9bcf, deep: 0x8d6ba7, light: 0xe5d4eb, background: 0xeae2eb },
  mango: { liquid: 0xeab957, deep: 0xce8937, light: 0xf5dfaa, background: 0xeee5d2 },
};

export function makeCup({ flavor = 'matcha', scale = 1 } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const liquidMat = new THREE.MeshPhysicalMaterial({ color: flavors[flavor].liquid, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, transparent: true, opacity: .94, depthWrite: false });
  const deepMat = new THREE.MeshPhysicalMaterial({ color: flavors[flavor].deep, roughness: .3, transparent: true, opacity: .53, depthWrite: false });
  const foamMat = standard(flavors[flavor].light, { roughness: .65 });
  const cupGlass = new THREE.MeshPhysicalMaterial({ color: 0xf4f5ec, roughness: .08, metalness: .05, transparent: true, opacity: .16, clearcoat: 1, clearcoatRoughness: .04, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8 });
  const profile = [.0, .06, .12, .4, 1, 1.8, 2.55, 2.65].map(y => new THREE.Vector2(.71 + y * .09, y));
  const shell = mesh(new THREE.LatheGeometry(profile, 96), cupGlass, g); shell.castShadow = false; shell.renderOrder = 5;
  const drink = cylinder(g, .936, .755, 1.88, liquidMat, 0, 1.56, 0, 80); drink.castShadow = false; drink.renderOrder = 2;
  const tea = cylinder(g, .758, .704, .56, deepMat, 0, .35, 0, 64); tea.castShadow = false; tea.renderOrder = 3;
  const foam = cylinder(g, .941, .937, .075, foamMat, 0, 2.515, 0, 80); foam.castShadow = false;
  // Tapioca is individual 3D spheres, not a dark texture pasted on the glass.
  const pearlMaterial = new THREE.MeshPhysicalMaterial({ color: 0x392c28, roughness: .24, clearcoat: .8 });
  for (let row = 0; row < 3; row++) for (let i = 0; i < 19; i++) {
    const a = i / 19 * Math.PI * 2 + row * .22 + random() * .09, y = .18 + row * .14 + random() * .055, r = .55 + y * .075 + random() * .025;
    const pearl = ball(g, pearlMaterial, Math.sin(a) * r, y, Math.cos(a) * r, .077 + random() * .018); pearl.castShadow = false;
  }
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xf9fff4, roughness: .08, metalness: .05, transparent: true, opacity: .5, clearcoat: 1, depthWrite: false });
  for (let i = 0; i < 8; i++) { const a = i * 2.4, r = .2 + random() * .43; const cube = box(g, .36, .27, .36, iceMat, Math.sin(a) * r, 2.53 + random() * .1, Math.cos(a) * r, .065); cube.rotation.set(random() * .5, a, random() * .3); cube.castShadow = false; cube.renderOrder = 6; }
  ring(g, .955, .028, M.cream, 0, 2.66, 0); ring(g, .976, .02, cupGlass, 0, 2.69, 0);
  const lid = cylinder(g, .9, .97, .07, cupGlass, 0, 2.68, 0, 80); lid.castShadow = false; lid.renderOrder = 7;
  const straw = new THREE.Group(); straw.position.set(.27, 2.3, -.05); straw.rotation.z = -.16; straw.rotation.x = -.1; g.add(straw);
  cylinder(straw, .063, .063, 1.55, M.cloth, 0, .7, 0); cylinder(straw, .044, .044, .009, M.darkWood, 0, 1.48, 0);
  for (let i = 0; i < 7; i++) ring(straw, .064, .006, M.purpleDark, 0, .25 + i * .18, 0);
  // Curved print follows the taper of the cup.
  const print = textTexture('bruma.', { color: '#584261', background: '#f4eee1', subtitle: 'TU PEQUEÑO MOMENTO', size: 200 });
  const label = mesh(new THREE.CylinderGeometry(.899, .815, .94, 64, 1, true, -.78, 1.56), new THREE.MeshBasicMaterial({ map: print, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), g, 0, 1.42, 0, false); label.renderOrder = 9;
  // Condensation catches the studio light along the outside of the cup.
  for (let i = 0; i < 65; i++) { const y = .65 + random() * 1.75, a = random() * Math.PI * 2, r = .716 + y * .09; const drop = ball(g, cupGlass, Math.sin(a) * r, y, Math.cos(a) * r, .012 + random() * .016, .02 + random() * .02, .012); drop.castShadow = false; drop.renderOrder = 8; }
  for (let i = 0; i < 3; i++) leaf(g, -.3, 2.67, -.25, .5, -.6 + i * .5, i * 2.1);
  g.rotation.y = .5;
  return { group: g, setFlavor(name) { const f = flavors[name]; if (!f) return; liquidMat.color.setHex(f.liquid); deepMat.color.setHex(f.deep); foamMat.color.setHex(f.light); } };
}
export function buildFinale() {
  const g = new THREE.Group(); const cup = makeCup({ scale: 1.45 }); g.add(cup.group); cup.group.position.y = .55;
  cylinder(g, 2.1, 2.2, 1.2, M.stone, 0, -.11, 0, 96); ring(g, 2.08, .018, M.brass, 0, .49, 0);
  contact(g, 0, 0, 7, 6, .26, -.735); contact(g, 0, 0, 3.8, 3.8, .18, .5);
  const floating = createLeafFall(); g.add(floating);
  basket(g, -1.65, .5, .6, .7, true); plant(g, 1.7, .5, -.6, 1.1, M.sand);
  return { group: g, cup, floating };
}
