import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { buildFarm, buildWorkshop, buildShop, buildDelivery, buildFinale, makeCup, flavors, contact } from './models.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = t => t * t * (3 - 2 * t);
function batchStatic(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), bins = new Map(), originals = [];
  root.traverse(object => {
    // Articulated actors keep their own transforms. Baking these meshes into
    // the static scenery would freeze their joints and detach their props.
    for (let parent = object; parent && parent !== root; parent = parent.parent) if (parent.userData.animated) return;
    if (!object.isMesh || object.isInstancedMesh || Array.isArray(object.material) || object.material.transparent) return;
    const key = object.material.uuid + '/' + Number(object.castShadow) + '/' + Number(object.receiveShadow);
    if (!bins.has(key)) bins.set(key, { material: object.material, castShadow: object.castShadow, receiveShadow: object.receiveShadow, geometries: [] });
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    bins.get(key).geometries.push(geometry); originals.push(object);
  });
  for (const bin of bins.values()) {
    const merged = mergeGeometries(bin.geometries, false);
    if (!merged) throw new Error('No se pudieron preparar las geometrías del mundo.');
    const mesh = new THREE.Mesh(merged, bin.material); mesh.castShadow = bin.castShadow; mesh.receiveShadow = bin.receiveShadow; root.add(mesh);
    bin.geometries.forEach(geometry => geometry.dispose());
  }
  originals.forEach(object => object.removeFromParent());
}
export const chapters = [
  { label: 'El origen', detail: 'Donde todo comienza', center: [0, 0, 0], wide: [12, 10, 15], close: [7.8, 6.6, 8.8], aim: [0, .9, 0], closeAim: [-.5, .8, .8] },
  { label: 'El taller', detail: 'El sabor está en los detalles', center: [28, 0, -14], wide: [9.5, 7.5, 13], close: [5, 4.6, 7.5], aim: [0, 1, -.5], closeAim: [.2, 1.2, -.6] },
  { label: 'La tienda', detail: 'Aquí empieza tu pausa', center: [56, 0, -1], wide: [10.8, 8.3, 14], close: [3.5, 3.4, 7], aim: [0, 1.2, 0], closeAim: [-.6, 1.6, -.4] },
  { label: 'Hasta ti', detail: 'La pausa también va contigo', center: [84, 0, -16], wide: [10, 7.5, 13], close: [5.2, 3.6, 7.6], aim: [0, 1.1, 0], closeAim: [.9, 1.1, .5] },
  { label: 'Tu favorito', detail: 'Hecho a tu manera', center: [112, 0, 0], wide: [7.5, 4.8, 11.5], close: [5.4, 3.8, 9], aim: [0, 2.4, 0], closeAim: [0, 2.5, 0] }
];

export async function createWorld(canvas, { product = null, capture = null } = {}) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf4efe5); scene.fog = new THREE.Fog(0xf4efe5, 30, 65);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, .035);
  scene.environment = environment.texture; scene.environmentIntensity = .32;
  studio.dispose(); pmrem.dispose();
  const sky = new THREE.HemisphereLight(0xfff7e4, 0x9fa28a, 1.1); scene.add(sky);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.8); sun.position.set(-7, 15, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = .5; sun.shadow.camera.far = 65;
  sun.shadow.camera.left = -11; sun.shadow.camera.right = 11; sun.shadow.camera.top = 11; sun.shadow.camera.bottom = -11;
  sun.shadow.normalBias = .025; sun.shadow.bias = -.00015; sun.shadow.radius = 3.5;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xe1e8f4, .6); fill.position.set(4, 6, -8); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0xece3d4, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(50, -.76, -5); floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 180);
  let finale, productCup;
  const groups = [], actors = [];
  if (product) {
    scene.background = new THREE.Color(flavors[product].background); scene.fog = null; floor.material.color.setHex(flavors[product].background); floor.position.set(0, -.02, 0);
    // A real curved studio backdrop removes the horizon from product renders.
    const rows = [[0, 25], [0, -4]];
    for (let i = 1; i <= 32; i++) { const a = i / 32 * Math.PI / 2; rows.push([4 - Math.cos(a) * 4, -4 - Math.sin(a) * 4]); }
    rows.push([40, -8]);
    const vertices = [], indices = [];
    rows.forEach(([y, z], i) => { vertices.push(-50, y, z, 50, y, z); if (i < rows.length - 1) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const backdrop = new THREE.BufferGeometry(); backdrop.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); backdrop.setIndex(indices); backdrop.computeVertexNormals(); floor.geometry.dispose(); floor.geometry = backdrop;
    productCup = makeCup({ flavor: product, scale: 1.25 }); productCup.group.rotation.y = .48; scene.add(productCup.group);
    contact(scene, 0, 0, 2.6, 2.6, .24, -.005);
    camera.position.set(4.3, 3.1, 8.3); camera.lookAt(0, 2.15, 0); sun.position.set(-4, 9, 7); sun.target.position.set(0, 1.7, 0);
    sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
    sun.shadow.mapSize.set(2048, 2048);
  } else {
    const builders = [buildFarm, buildWorkshop, buildShop, buildDelivery];
    for (let i = 0; i < builders.length; i++) {
      const group = builders[i](); batchStatic(group); group.position.fromArray(chapters[i].center); group.name = chapters[i].label; scene.add(group); groups.push(group);
      // Yield between worlds so the page can paint its loading state.
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    finale = buildFinale(); finale.group.position.fromArray(chapters[4].center); finale.group.name = chapters[4].label; scene.add(finale.group); groups.push(finale.group);
  }
  groups.forEach((group, index) => group.traverse(object => {
    if (typeof object.userData.animate === 'function') actors.push({ group, index, object, update: object.userData.animate });
  }));
  const liveMotion = !product && capture === null && !reduceMotion;
  const experience = document.querySelector('#recorrido');
  let width = 0, height = 0, mobile = false, targetProgress = capture === null ? 0 : Number(capture), progress = targetProgress;
  let dirty = 10, running = false, frameID, previous = 0, active = true, frames = 0, time = 0, lastShadowTime = 0, lastReportedProgress = -1;
  const mouse = new THREE.Vector2(), pointer = new THREE.Vector2();
  const desiredCamera = new THREE.Vector3(), desiredAim = new THREE.Vector3(), actualAim = new THREE.Vector3();
  const desiredCenter = new THREE.Vector3(), lastShadowCenter = new THREE.Vector3(Infinity, Infinity, Infinity);
  const position = (center, value) => new THREE.Vector3(value[0] + center[0], value[1], value[2] + center[2]);
  const keys = [];
  chapters.forEach((chapter, i) => {
    keys.push({ at: i, position: position(chapter.center, chapter.wide), aim: position(chapter.center, chapter.aim) });
    keys.push({ at: i + .58, position: position(chapter.center, chapter.close), aim: position(chapter.center, chapter.closeAim) });
    if (i < 4) {
      const next = chapters[i + 1], middle = new THREE.Vector3().addVectors(position(chapter.center, chapter.close), position(next.center, next.wide)).multiplyScalar(.5);
      middle.y += 3.5;
      keys.push({ at: i + .8, position: middle, aim: new THREE.Vector3().addVectors(position(chapter.center, chapter.aim), position(next.center, next.aim)).multiplyScalar(.5) });
    }
  });
  function poseAt(p) {
    let i = 0; while (i < keys.length - 2 && p > keys[i + 1].at) i++;
    const a = keys[i], b = keys[i + 1], t = smooth(clamp((p - a.at) / (b.at - a.at)));
    desiredCamera.lerpVectors(a.position, b.position, t); desiredAim.lerpVectors(a.aim, b.aim, t);
    if (mobile) {
      const finalBlend = smooth(clamp(p - 3.5));
      const factor = THREE.MathUtils.lerp(height < 740 ? 1.9 : 1.74, height < 740 ? 2.05 : 1.4, finalBlend);
      desiredCamera.sub(desiredAim).multiplyScalar(factor).add(desiredAim);
      if (capture === null && height < 740) camera.setViewOffset(width, height, 0, height * (.21 + .03 * finalBlend), width, height);
    }
    desiredCenter.set(desiredAim.x, 0, desiredAim.z);
    if (!reduceMotion) { desiredCamera.x += pointer.x * .24; desiredCamera.y += pointer.y * .15; }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; mobile = width <= 720;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75)); renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.clearViewOffset();
    if (!product && capture === null) camera.setViewOffset(width, height, mobile ? 0 : -width * .17, mobile ? height * .21 : 0, width, height);
    camera.updateProjectionMatrix(); dirty = 12; request();
  }
  function readScroll() {
    if (product || capture !== null) return;
    const top = experience.getBoundingClientRect().top + scrollY;
    targetProgress = clamp((scrollY - top) / Math.max(1, experience.offsetHeight - innerHeight)) * 4.58;
    if (reduceMotion) targetProgress = Math.min(4, Math.round(targetProgress));
    dirty = 8; request();
  }
  function request() { if (!running && !document.hidden && active) { running = true; previous = 0; frameID = requestAnimationFrame(frame); } }
  function frame(now) {
    if (document.hidden || !active) { running = false; return; }
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60; previous = now;
    if (liveMotion) time += dt;
    const blend = 1 - Math.exp(-8 * dt);
    const delta = Math.abs(targetProgress - progress);
    progress = reduceMotion || capture !== null ? targetProgress : THREE.MathUtils.lerp(progress, targetProgress, blend);
    pointer.lerp(mouse, blend);
    if (!product) {
      poseAt(progress);
      if (!frames || reduceMotion || capture !== null) { camera.position.copy(desiredCamera); actualAim.copy(desiredAim); }
      else { camera.position.lerp(desiredCamera, 1 - Math.exp(-10 * dt)); actualAim.lerp(desiredAim, 1 - Math.exp(-10 * dt)); }
      camera.lookAt(actualAim);
      groups.forEach((group, i) => { group.visible = Math.abs(i - progress) < 1.1; });
      for (const actor of actors) if (actor.group.visible && (liveMotion || !frames)) actor.update(liveMotion ? time : 0);
      // One soft shadow map follows the currently viewed island instead of
      // allocating a separate 2048px shadow map for every diorama.
      if (desiredCenter.distanceToSquared(lastShadowCenter) > .03) {
        sun.position.copy(desiredCenter).add(new THREE.Vector3(-8, 15, 10)); sun.target.position.copy(desiredCenter);
        sun.target.updateMatrixWorld(); lastShadowCenter.copy(desiredCenter); renderer.shadowMap.needsUpdate = true;
      }
      // Shadow refreshes are capped independently of the character/leaf motion.
      if (liveMotion && time - lastShadowTime >= 1 / (mobile ? 10 : 15)) {
        renderer.shadowMap.needsUpdate = true; lastShadowTime = time;
      }
      if (finale.group.visible && liveMotion) {
        finale.cup.group.rotation.y = .5 + Math.sin(time * .22) * .07;
      }
    }
    if (!frames || dirty > 0 || delta > .0001 || Math.abs(pointer.x - mouse.x) > .001 || liveMotion) {
      if (!frames) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera); frames++; dirty = Math.max(0, dirty - 1);
      canvas.dataset.ready = 'true';
      if (onProgress && Math.abs(progress - lastReportedProgress) > .0001) { onProgress(progress); lastReportedProgress = progress; }
    }
    if (dirty > 0 || delta > .0001 || liveMotion || pointer.distanceTo(mouse) > .001) frameID = requestAnimationFrame(frame);
    else running = false;
  }
  let onProgress = null;
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) { dirty = 4; request(); } }, { rootMargin: '80px' }); intersection.observe(canvas);
  const onVisibility = () => { if (!document.hidden) { dirty = 4; request(); } };
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('scroll', readScroll, { passive: true });
  const onPointer = event => { if (!reduceMotion && !mobile && !product && capture === null) { mouse.set((event.clientX / width - .5) * 2, -(event.clientY / height - .5) * 2); dirty = 4; request(); } };
  addEventListener('pointermove', onPointer, { passive: true });
  resize(); readScroll(); request();
  return {
    set onProgress(callback) { onProgress = callback; },
    setFlavor(name) { (productCup || finale.cup).setFlavor(name); dirty = 6; request(); },
    get progress() { return progress; },
    get camera() { return camera.position.toArray(); },
    get stats() { return { frames, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, meshes: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
    get motion() { return actors.filter(actor => actor.group.visible).map(actor => ({ scene: actor.index, kind: actor.object.userData.motionKind, pose: actor.object.userData.pose || null, values: actor.object.userData.motionSample() })); },
    get isReduced() { return reduceMotion; },
    chapterTop(index) { return experience.offsetTop + index / 4.58 * (experience.offsetHeight - innerHeight); },
    dispose() { cancelAnimationFrame(frameID); observer.disconnect(); intersection.disconnect(); removeEventListener('scroll', readScroll); removeEventListener('pointermove', onPointer); document.removeEventListener('visibilitychange', onVisibility); environment.dispose(); renderer.dispose(); }
  };
}
