/**
 * רינדור הברושור: PDF לדפוס (בלִיד 3 מ"מ), PDF דיגיטלי (A4), ותצוגת PNG לכל עמוד.
 * הרצה: node render.mjs
 * דרישות: playwright (מותקן גלובלית בסביבה זו) + Chromium.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const globalRoot = execSync('npm root -g').toString().trim();
const require = createRequire(path.join(globalRoot, 'noop.js'));
const { chromium } = require('playwright');

const SRC = pathToFileURL(path.join(here, 'ECOM-brochure.html')).href;
const DIST = path.join(here, 'dist');
const PREVIEWS = path.join(DIST, 'previews');
fs.mkdirSync(PREVIEWS, { recursive: true });

const browser = await chromium.launch();

// ---------- PDF לדפוס: 216×303 מ"מ (A4 + בלִיד 3 מ"מ מכל צד) ----------
{
  const page = await browser.newPage();
  await page.goto(SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(DIST, 'ECOM-Talent-Partnership-Print-Bleed.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.close();
  console.log('✓ PDF לדפוס (עם בלִיד) נוצר');
}

// ---------- PDF דיגיטלי: A4 מדויק, ללא בלִיד ----------
{
  const page = await browser.newPage();
  await page.goto(SRC + '?bleed=0', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ':root { --bleed: 0mm !important; } @page { size: 210mm 297mm; margin: 0; }' });
  await page.pdf({
    path: path.join(DIST, 'ECOM-Talent-Partnership.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.close();
  console.log('✓ PDF דיגיטלי (A4) נוצר');
}

// ---------- תצוגות PNG לכל עמוד (ללא בלִיד, רזולוציה גבוהה) ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 1400 },
    deviceScaleFactor: 2.5,
  });
  const page = await ctx.newPage();
  await page.goto(SRC + '?bleed=0', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pages = page.locator('.page');
  const n = await pages.count();
  for (let i = 0; i < n; i++) {
    const file = path.join(PREVIEWS, `page-${i + 1}.png`);
    await pages.nth(i).screenshot({ path: file });
    console.log(`✓ תצוגה נשמרה: previews/page-${i + 1}.png`);
  }
  await ctx.close();
}

await browser.close();
console.log('הרינדור הושלם.');
