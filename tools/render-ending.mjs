import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), base = process.env.BRUMA_URL || 'http://127.0.0.1:3001';
const executablePath = [process.env.BROWSER_PATH, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const product of ['croissant', 'bread', 'headphones', 'controller']) {
    await page.goto(base + '/tools/ending-studio.html?product=' + product, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ART_READY__);
    if (errors.length) throw new Error(errors.join('\n'));
    await page.locator('canvas').screenshot({ path: join(root, 'assets/showcase-' + product + '.jpg'), type: 'jpeg', quality: 94 });
    console.log('Render 3D: ' + product);
  }
} finally { await browser.close(); }
