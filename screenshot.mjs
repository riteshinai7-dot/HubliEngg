import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const PUPPETEER_DIRS = [
  'C:/Users/lenovo/AppData/Local/Temp/claude/d--AI-VS-CODE-Website-builder/4cd9848f-9ec8-46a7-b03b-dc6e2db62fae/scratchpad/pptr',
  process.cwd(),
];

async function loadPuppeteer() {
  for (const dir of PUPPETEER_DIRS) {
    try {
      const require = createRequire(join(dir, 'noop.js'));
      return (await import(pathToFileURL(require.resolve('puppeteer')).href)).default;
    } catch {}
  }
  throw new Error('puppeteer not found in: ' + PUPPETEER_DIRS.join(', '));
}

const url = process.argv[2] ?? 'http://localhost:3000';
const label = process.argv[3] ?? '';
const outDir = join(process.cwd(), 'temporary screenshots');
await mkdir(outDir, { recursive: true });

const existing = await readdir(outDir);
const next =
  existing
    .map((f) => Number(/^screenshot-(\d+)/.exec(f)?.[1] ?? 0))
    .reduce((a, b) => Math.max(a, b), 0) + 1;
const file = join(outDir, `screenshot-${next}${label ? `-${label}` : ''}.png`);

const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// let entrance animations settle and force scroll-triggered reveals to run
await page.evaluate(async () => {
  // smooth scrolling would outrun the stepper below and skip IntersectionObserver reveals
  document.documentElement.style.scrollBehavior = 'auto';
  await new Promise((r) => {
    let y = 0;
    const step = () => {
      y += 300;
      window.scrollTo(0, y);
      if (y < document.documentElement.scrollHeight) setTimeout(step, 90);
      else {
        window.scrollTo(0, 0);
        setTimeout(r, 800);
      }
    };
    step();
  });
});
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log(file);
