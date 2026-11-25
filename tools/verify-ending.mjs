import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), base = process.env.BRUMA_URL || 'http://127.0.0.1:3001';
const output = join(root, '.renders/ending'); await mkdir(output, { recursive: true });
const executablePath = [process.env.BROWSER_PATH, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true }), results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1100], ['large', 1920, 1300], ['tablet', 820, 1180], ['phone', 390, 844], ['small-phone', 375, 667]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 760, hasTouch: width < 760, acceptDownloads: true });
    const errors = [], external = [], missing = [];
    await context.route('**/*', route => { const url = route.request().url(); if (/^https?:/.test(url) && !url.startsWith(base + '/')) { external.push(url); return route.abort(); } return route.continue(); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) missing.push(response.status() + ' ' + response.url()); });
    await page.goto(base + '/#tu-proyecto', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.world === 'ready');
    await page.locator('#tu-proyecto').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.possibilities, .system-map').count(), 0);
    assert.equal(await page.locator('#venture-checkout').isDisabled(), true);
    const cases = [['cafe', 'bruma.', '8,75'], ['bakery', 'miga.', '7,00'], ['tech', 'nodo.', '84,00']];
    for (const [concept, brand, total] of cases) {
      const button = page.locator('[data-venture="' + concept + '"]');
      await button.focus(); await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-venture][aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator('#venture-shop-brand').textContent(), brand);
      await page.waitForFunction(() => [...document.querySelectorAll('.venture-product img')].every(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.locator('#venture-cart-count').textContent(), '0');
      await page.locator('[data-preview-add="0"]').click(); await page.locator('[data-preview-add="1"]').click();
      assert.equal(await page.locator('#venture-cart-count').textContent(), '2');
      assert.ok((await page.locator('#venture-total').textContent()).includes(total));
      await page.locator('#venture-checkout').click(); await page.waitForSelector('#venture-receipt:not([hidden])');
      assert.ok((await page.locator('#venture-receipt-total').textContent()).includes(total));
      assert.match(await page.locator('#venture-receipt-message').textContent(), /2 productos/);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'venture-receipt');
      await page.locator('#venture-restart').click();
      assert.equal(await page.locator('#venture-checkout').isDisabled(), true);
      const downloadWait = page.waitForEvent('download');
      await page.locator('#venture-download').click();
      const download = await downloadWait;
      assert.equal(download.suggestedFilename(), 'mi-proyecto-' + concept + '.txt');
      const destination = join(output, name + '-' + download.suggestedFilename()); await download.saveAs(destination);
      const text = await readFile(destination, 'utf8');
      assert.ok(text.includes('DISEÑA TU MARCA') && text.includes('PROGRAMA TU TIENDA') && text.includes('HAZ TU PRIMER PEDIDO'));
      assert.ok(text.includes('https://github.com/Famiitry/expo-cole-1-'));
      await page.locator('#venture-shop').scrollIntoViewIfNeeded();
      await page.locator('.venture-playground').screenshot({ path: join(output, name + '-' + concept + '.jpg'), type: 'jpeg', quality: 90 });
      const bounds = await page.locator('#tu-proyecto').evaluate(element => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        controls: [...element.querySelectorAll('button')].filter(button => button.offsetWidth && !button.closest('[hidden]')).map(button => ({ text: button.textContent.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height, right: button.getBoundingClientRect().right }))
      }));
      assert.equal(bounds.overflow, false, name + ': hay desbordamiento horizontal');
      for (const control of bounds.controls) { assert.ok(control.height >= 43, name + ': control demasiado pequeño: ' + control.text); assert.ok(control.right <= width + 1, name + ': control fuera de pantalla'); }
    }
    // The miniature store and the main BRUMA cart have independent state.
    assert.equal(await page.locator('#cart-count').textContent(), '0');
    await page.locator('[data-add="matcha"]').click(); await page.locator('#open-cart').click();
    assert.match(await page.locator('#cart-total').textContent(), /4[.,]50/); await page.keyboard.press('Escape');
    await page.locator('.footer').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const stopped = await page.evaluate(() => window.__BRUMA__.stats.frames);
    await page.waitForTimeout(350); assert.equal(await page.evaluate(() => window.__BRUMA__.stats.frames), stopped);
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(missing, []);
    await page.screenshot({ path: join(output, name + '-footer.jpg'), type: 'jpeg', quality: 90 });
    results.push({ viewport: [width, height], examples: 3, downloads: 3, errors, external, missing });
    console.log('OK ' + name + ': tres negocios, pedidos, guías, controles y carrito principal.');
    await context.close();
  }
  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await reduced.newPage(); await page.goto(base + '/#tu-proyecto', { waitUntil: 'networkidle' });
  await page.locator('[data-venture="bakery"]').click(); await page.locator('[data-preview-add="0"]').click();
  assert.match(await page.locator('#venture-total').textContent(), /2[.,]50/); await reduced.close();
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('Cierre verificado sin Internet, con descarga y movimiento reducido.');
} finally { await browser.close(); }
