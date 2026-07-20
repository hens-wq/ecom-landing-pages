/**
 * רינדור המצגת: PDF (16:9, 13.333×7.5in) ותצוגת PNG לכל שקף.
 * הרצה: node render-presentation.mjs
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

const SRC = pathToFileURL(path.join(here, 'ECOM-presentation.html')).href;
const DIST = path.join(here, 'dist');
const PREVIEWS = path.join(DIST, 'previews-presentation');
fs.mkdirSync(PREVIEWS, { recursive: true });

const browser = await chromium.launch();

// ---------- PDF: 16:9, 338.667×190.5 מ"מ (13.333×7.5 אינץ') ----------
{
  const page = await browser.newPage();
  await page.goto(SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(DIST, 'ECOM-Talent-Partnership-Presentation.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.close();
  console.log('✓ PDF מצגת נוצר');
}

// ---------- תצוגות PNG לכל שקף (רזולוציה גבוהה) ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2.5,
  });
  const page = await ctx.newPage();
  await page.goto(SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const slides = page.locator('.slide');
  const n = await slides.count();
  for (let i = 0; i < n; i++) {
    const file = path.join(PREVIEWS, `slide-${i + 1}.png`);
    await slides.nth(i).screenshot({ path: file });
    console.log(`✓ תצוגה נשמרה: previews-presentation/slide-${i + 1}.png`);
  }
  await ctx.close();
}

await browser.close();
console.log('הרינדור הושלם.');
