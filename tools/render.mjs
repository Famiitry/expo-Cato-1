import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BRUMA_URL || 'http://127.0.0.1:3001';
const output = join(root, '.renders'); await mkdir(output, { recursive: true });
const executablePath = [process.env.BROWSER_PATH, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => console.error('ERROR:', error.message));
  for (const flavor of ['matcha', 'taro', 'mango']) {
    await page.goto(base + '/?producto=' + flavor, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#world-canvas').dataset.ready === 'true');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(root, 'assets', flavor + '.jpg'), type: 'jpeg', quality: 94 });
    console.log('Producto renderizado: ' + flavor);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (let chapter = 0; chapter < 5; chapter++) {
    await page.goto(base + '/?captura=' + chapter, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#world-canvas').dataset.ready === 'true');
    await page.screenshot({ path: join(output, 'escena-' + chapter + '.jpg'), type: 'jpeg', quality: 92 });
    if (chapter === 0) await page.screenshot({ path: join(root, 'assets', 'mundo.jpg'), type: 'jpeg', quality: 90 });
    console.log('Escena renderizada: ' + chapter);
  }
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.dataset.world === 'ready');
  await page.screenshot({ path: join(output, 'inicio-desktop.jpg'), type: 'jpeg', quality: 92 });
  console.log(JSON.stringify(await page.evaluate(() => window.__BRUMA__.stats)));
  await page.close();
} finally { await browser.close(); }
