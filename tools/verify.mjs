import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BRUMA_URL || 'http://127.0.0.1:3001';
const output = join(root, '.renders/qa'); await mkdir(output, { recursive: true });
const executablePath = [process.env.BROWSER_PATH, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
try {
  for (const [name, width, height] of [['escritorio', 1440, 900], ['movil', 390, 844], ['movil-pequeno', 375, 667], ['horizontal', 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 720, hasTouch: width < 720 });
    const errors = [], missing = [], external = [];
    await context.route('**/*', route => {
      const url = route.request().url();
      if (/^https?:/.test(url) && !url.startsWith(base + '/')) { external.push(url); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) missing.push(response.status() + ' ' + response.url()); });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.world === 'ready' && document.querySelector('#world-canvas').dataset.ready);
    assert.equal(await page.locator('video').count(), 0, 'El recorrido no debe utilizar video');
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    assert.equal(await page.locator('.chapter .eyebrow, .chapter-label, #scene-label, #scene-detail').count(), 0);
    assert.equal(await page.evaluate(() => document.fonts.check('400 62px WindSong')), true);
    assert.match(await page.locator('.header .brand').evaluate(element => getComputedStyle(element).fontFamily), /WindSong/);
    const positions = [];
    for (let chapter = 0; chapter < 5; chapter++) {
      await page.evaluate(index => { const section = document.querySelector('#recorrido'); scrollTo({ top: section.offsetTop + index / 4.58 * (section.offsetHeight - innerHeight), behavior: 'instant' }); }, chapter);
      await page.waitForFunction(index => Math.abs(window.__BRUMA__.progress - index) < .012, chapter);
      await page.waitForTimeout(450);
      assert.equal(await page.locator('.chapter.is-current').getAttribute('data-chapter'), String(chapter));
      const state = await page.evaluate(() => ({
        camera: window.__BRUMA__.camera, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        content: (() => { const r = document.querySelector('.chapter.is-current').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; })(), stats: window.__BRUMA__.stats
      }));
      assert.equal(state.horizontalOverflow, false, name + ': desbordamiento horizontal');
      assert.ok(state.content.left >= 0 && state.content.right <= width + 1);
      assert.ok(state.content.top >= 58, name + ': el texto invade la cabecera');
      assert.ok(state.content.bottom <= height - 40, name + ': texto fuera de la pantalla');
      assert.ok(state.stats.calls > 0); positions.push(state.camera);
      const motionBefore = await page.evaluate(index => window.__BRUMA__.motion.filter(actor => actor.scene === index), chapter);
      await page.waitForTimeout(650);
      const motionAfter = await page.evaluate(index => window.__BRUMA__.motion.filter(actor => actor.scene === index), chapter);
      assert.ok(motionBefore.length > 0, name + ': faltan actores en la escena ' + chapter);
      assert.notDeepEqual(motionAfter, motionBefore, name + ': la escena ' + chapter + ' no tiene movimiento real');
      if (chapter === 4) {
        assert.equal(motionBefore[0].kind, 'leaves');
        const drop = motionBefore[0].values[1] - motionAfter[0].values[1];
        assert.ok(drop > 0 || drop < -5, name + ': las hojas deben caer o reiniciar su caída');
      } else assert.ok(motionBefore.every(actor => actor.kind === 'character'));
      await page.screenshot({ path: join(output, name + '-capitulo-' + chapter + '.jpg'), type: 'jpeg', quality: 87 });
    }
    assert.ok(Math.hypot(...positions[4].map((value, i) => value - positions[0][i])) > 80, 'La cámara debe atravesar el mundo real');
    const before = await page.locator('#world-canvas').screenshot();
    await page.locator('[name="hero-flavor"][value="taro"]').check();
    await page.waitForTimeout(400);
    const after = await page.locator('#world-canvas').screenshot();
    assert.notDeepEqual(before, after); assert.match(await page.locator('#hero-flavor-description').textContent(), /Taro/);
    await page.locator('#coleccion').scrollIntoViewIfNeeded();
    await page.locator('[data-add="matcha"]').click(); await page.locator('[data-add="matcha"]').click(); await page.locator('[data-add="taro"]').click();
    await page.locator('#open-cart').click();
    assert.equal(await page.locator('#cart-count').textContent(), '3'); assert.match(await page.locator('#cart-total').textContent(), /13[.,]75/);
    await page.locator('[data-quantity="matcha"][data-delta="-1"]').click();
    assert.match(await page.locator('#cart-total').textContent(), /9[.,]25/);
    await page.screenshot({ path: join(output, name + '-carrito.jpg'), type: 'jpeg', quality: 87 });
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#cart-dialog').getAttribute('open'), null);
    await page.reload({ waitUntil: 'networkidle' }); assert.equal(await page.locator('#cart-count').textContent(), '2');
    await page.locator('#open-cart').click(); await page.locator('#customer-name').fill('Equipo de la exposición');
    await page.locator('[name="fulfillment"][value="Para llevar"]').check(); await page.locator('.checkout').click();
    await page.waitForSelector('#order-success:not([hidden])'); assert.match(await page.locator('#order-ticket').textContent(), /DEMO-/);
    assert.match(await page.locator('#order-ticket').textContent(), /9[.,]25/); assert.equal(await page.locator('#cart-count').textContent(), '0');
    await page.screenshot({ path: join(output, name + '-pedido.jpg'), type: 'jpeg', quality: 87 });
    await page.locator('#new-order').click(); assert.equal(await page.locator('#cart-dialog').getAttribute('open'), null);
    const broken = await page.evaluate(() => [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => image.src));
    assert.deepEqual(broken, []); assert.deepEqual(errors, [], name + ': errores del navegador'); assert.deepEqual(missing, [], name + ': faltan recursos'); assert.deepEqual(external, [], name + ': hay dependencias de Internet');
    await page.locator('.footer').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
    const pausedFrames = await page.evaluate(() => window.__BRUMA__.stats.frames);
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => window.__BRUMA__.stats.frames), pausedFrames, 'El mundo debe pausarse fuera de pantalla');
    results.push({ name, viewport: [width, height], chapters: 5, animatedScenes: 5, orderTotal: 925, errors, missing, external });
    console.log('OK ' + name + ': logo, rótulos, 5 escenas animadas, pausa y tienda sin Internet.'); await context.close();
  }
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage(); await reducedPage.goto(base + '/', { waitUntil: 'networkidle' }); await reducedPage.waitForFunction(() => !!window.__BRUMA__);
  assert.equal(await reducedPage.evaluate(() => window.__BRUMA__.reduced), true); await reducedPage.locator('[data-go="2"]').first().click();
  await reducedPage.waitForFunction(() => window.__BRUMA__.progress === 2);
  const stillMotion = await reducedPage.evaluate(() => window.__BRUMA__.motion);
  await reducedPage.waitForTimeout(600);
  assert.deepEqual(await reducedPage.evaluate(() => window.__BRUMA__.motion), stillMotion);
  await reduced.close(); console.log('OK movimiento reducido: sin vuelo, caída ni gestos repetidos.');
  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : getContext.call(this, type, ...args); };
    localStorage.setItem('bruma.cart', '{invalid');
  });
  const fallbackPage = await fallback.newPage(); await fallbackPage.goto(base + '/', { waitUntil: 'networkidle' }); await fallbackPage.waitForSelector('#world-error:not([hidden])');
  await fallbackPage.locator('[data-add="mango"]').click(); await fallbackPage.locator('#open-cart').click(); assert.equal(await fallbackPage.locator('#cart-count').textContent(), '1');
  assert.match(await fallbackPage.locator('#cart-total').textContent(), /4[.,]25/); await fallback.close(); console.log('OK sin WebGL y con almacenamiento dañado: la tienda sigue funcionando.');
  await writeFile(join(output, 'resultados.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('Verificación completada. Capturas: ' + output);
} finally { await browser.close(); }
