#!/usr/bin/env node
/* Demo Library checks.
   1. Data: unique ids, valid courses and chapters, https/relative URLs, one-line "what", 11-character YouTube ids.
   2. Page (needs Playwright + axe-core; set NODE_PATH to a folder that has them): loads index.html from a local
      static server at desktop (1280×900) and phone (390×844, touch) sizes, checks filters, search, the chapter menu,
      URL state, per-course links, "Show more", Play (an iframe to youtube-nocookie appears), no horizontal scroll on
      phones, no console errors, and an axe-core WCAG 2.2 AA scan with 0 violations.
   Outside requests (YouTube thumbnails, fonts, game logos) are answered with empty replies so the test runs offline.
   Usage: NODE_PATH=/path/to/node_modules node tools/check.js [--data-only] */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL:', m); } };

// ---------- 1. data ----------
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['interactives.js', 'demo-videos.js', 'lectures.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'), ctx);
const W = ctx.window, CH = W.DEMO_CHAPTERS;
const all = [].concat(W.DEMO_ITEMS, W.DEMO_VIDEOS, W.DEMO_LECTURES);
const ids = new Set();
for (const it of all) {
  ok(!ids.has(it.id), 'duplicate id ' + it.id); ids.add(it.id);
  ok(['lab', 'demo', 'lecture'].includes(it.type), it.id + ': bad type');
  ok(it.title && it.title.length < 140, it.id + ': title');
  ok(Array.isArray(it.courses) && it.courses.length && it.courses.every(c => CH[c]), it.id + ': courses');
  for (const c of it.courses) {
    const list = (it.ch || {})[c] || [];
    ok(list.length > 0, it.id + ': no chapter for ' + c);
    for (const n of list) ok(CH[c].some(r => r[0] === n), it.id + ': unknown chapter ' + c + ':' + n);
  }
  for (const c of Object.keys(it.ch || {})) ok(it.courses.includes(c), it.id + ': chapter for unlisted course ' + c);
  if (it.type === 'lab') {
    ok(/^https:\/\/itsdrdan\.github\.io\/[A-Za-z0-9]+\/|^labs\/[a-z-]+\/$/.test(it.url), it.id + ': url ' + it.url);
    ok(it.what && it.what.length <= 120 && !/\n/.test(it.what), it.id + ': what should be one short line (' + (it.what || '').length + ')');
    ok(it.src, it.id + ': src note');
    if (/^labs\//.test(it.url)) ok(fs.existsSync(path.join(ROOT, it.url, 'index.html')), it.id + ': local lab missing');
  } else {
    ok(/^[A-Za-z0-9_-]{11}$/.test(it.yt), it.id + ': yt id');
  }
  if (it.type === 'demo') { ok(it.channel && it.orig && it.from && it.slides, it.id + ': demo source fields'); ok(it.what && it.what.length <= 120, it.id + ': what length'); }
}
const ytDemo = new Set(W.DEMO_VIDEOS.map(x => x.yt));
ok(ytDemo.size === W.DEMO_VIDEOS.length, 'duplicate demo video');
for (const l of W.DEMO_LECTURES) ok(!ytDemo.has(l.yt), 'lecture also listed as demo: ' + l.yt);
console.log(`data: ${W.DEMO_ITEMS.length} interactives, ${W.DEMO_VIDEOS.length} demo videos, ${W.DEMO_LECTURES.length} lectures`);
if (process.argv.includes('--data-only')) return done();

// ---------- 2. page ----------
let chromium, axeSrc;
try { ({ chromium } = require('playwright')); axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); }
catch (e) { console.log('Playwright/axe-core not found (set NODE_PATH). Page checks skipped.'); fails++; return done(); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/plain' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, run);
async function page(browser, opts) {
  const c = await browser.newContext(opts); const p = await c.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  await c.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  return { c, p, errs };
}
async function run() {
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  try {
    for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }]]) {
      const { c, p, errs } = await page(browser, opts);
      await p.goto(base);
      const counts = await p.evaluate(() => window.DEMO_LIBRARY.count());
      ok(counts.lab === W.DEMO_ITEMS.length && counts.demo === W.DEMO_VIDEOS.length && counts.lecture === W.DEMO_LECTURES.length, name + ': counts');
      ok(await p.locator('#results .card').count() === 24 * 3, name + ': first page shows 24 of each type');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), name + ': no horizontal scroll');
      // axe on the default view
      await p.addScriptTag({ content: axeSrc });
      const ax = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes[0].target.join(' ')));
      ok(ax.length === 0, name + ': axe violations: ' + ax.join(' | '));
      // course filter → chapter menu → URL
      const tap = s => opts.hasTouch ? p.locator(s).first().tap() : p.locator(s).first().click();
      await tap('[data-course="3A"]');
      ok(await p.locator('#chRow').isVisible(), name + ': chapter menu shows after picking a course');
      ok(new URL(p.url()).searchParams.get('course') === '3A', name + ': course in URL');
      for (const c of ['3A', '1A', '1B', '3B']) { await tap(`[data-course="${c}"]`); ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), name + ': no horizontal scroll with ' + c + ' chapter menu'); }
      await tap('[data-course="3A"]');
      await p.selectOption('#ch', '8');
      const titles = await p.locator('#results .card h3').allTextContents();
      ok(titles.includes('Piston Lab') && !titles.includes('Ride Line'), name + ': 3A Ch 8 shows gas labs only');
      const href = await p.locator('#results .card.lab a.open').first().getAttribute('href');
      ok(/course=3A/.test(href), name + ': game link carries course=3A (' + href + ')');
      await tap('[data-type="lab"]');
      ok(await p.locator('#results .card.lecture').count() === 0, name + ': Interactives hides videos');
      // search
      await tap('[data-course="all"]'); await tap('[data-type="all"]');
      await p.fill('#q', 'osmosis'); await p.waitForTimeout(300);
      ok((await p.locator('#results .card h3').allTextContents()).some(t => /Cell Lab/.test(t)), name + ': search osmosis finds Cell Lab');
      await p.fill('#q', 'zzqqxx'); await p.waitForTimeout(300);
      ok(await p.locator('.empty').isVisible(), name + ': empty state');
      await tap('.empty [data-clear]');
      ok(await p.locator('#results .card').count() === 72, name + ': clear filters restores');
      // show more
      await tap('[data-more="lecture"]');
      ok(await p.locator('#results .card.lecture').count() === 48, name + ': show more lectures');
      // play a video
      await tap('[data-type="demo"]');
      await tap('#results .card.demo .playbtn');
      const src = await p.locator('#results .card.demo iframe').first().getAttribute('src');
      ok(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?autoplay=1/.test(src || ''), name + ': play makes a nocookie iframe');
      // moments on a lecture
      await tap('[data-type="lecture"]');
      await p.locator('#results .card.lecture details.moments').first().locator('summary').click();
      await tap('#results .card.lecture details.moments button[data-t]:not([data-t="0"])');
      const s2 = await p.locator('#results .card.lecture iframe').first().getAttribute('src');
      ok(/start=[1-9]/.test(s2 || ''), name + ': jump to a moment sets start');
      // deep link into the page
      await p.goto(base + '?course=3B&type=lab&q=enzyme');
      ok((await p.locator('#results .card h3').allTextContents()).every(t => /Enzyme/i.test(t)) && await p.locator('[data-course="3B"]').getAttribute('aria-pressed') === 'true', name + ': URL state restores filters');
      await p.addScriptTag({ content: axeSrc });
      const ax2 = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id));
      ok(ax2.length === 0, name + ': axe (filtered view): ' + ax2.join(','));
      ok(errs.length === 0, name + ': console errors: ' + errs.join(' | '));
      await c.close();
    }
    // the hosted effusion lab loads
    const { c, p, errs } = await page(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await p.goto(base + 'labs/effusion/');
    ok(/Effusion/i.test(await p.title()), 'effusion lab loads'); ok(errs.length === 0, 'effusion console errors: ' + errs.join(' | '));
    await c.close();
  } finally { await browser.close(); srv.close(); }
  done();
}
function done() { console.log(fails ? `FAILED ${fails} of ${checks} checks` : `OK, ${checks} checks`); process.exitCode = fails ? 1 : 0; }
