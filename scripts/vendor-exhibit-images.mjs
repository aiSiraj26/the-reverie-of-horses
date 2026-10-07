// One-off tool: replaces the hot-linked Wikimedia exhibit images with copies stored
// in assets/exhibits/, so the pages (and CI) no longer depend on Wikimedia being
// reachable and willing to serve the browser.
//
//   node scripts/vendor-exhibit-images.mjs                 # index.html + reverie-of-grandmothers.html
//   node scripts/vendor-exhibit-images.mjs some-page.html  # or only the pages you name
//
// For each <article class="exhibit" id="..."> that has a Wikimedia <img>, it downloads
// the image, saves it as assets/exhibits/<id>.<ext>, rewrites the <img> to the local
// file with width and height read from the file, and drops the Wikimedia hosts from
// that page's CSP img-src (least privilege: nothing loads from there any more).
// Exhibits without an image are left alone. Safe to re-run. Fails loudly on any
// download or format problem, and writes no page until every image has been fetched
// and checked.
//
// Wikimedia asks automated clients to identify themselves and to be gentle, so this
// sends a descriptive User-Agent, goes one image at a time and honours Retry-After.
// Credits stay in the pages: each caption already links to its Commons page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'assets', 'exhibits');
const PAGES = process.argv.length > 2 ? process.argv.slice(2) : ['index.html', 'reverie-of-grandmothers.html'];
const ORIGIN = process.env.COMMONS_ORIGIN || 'https://commons.wikimedia.org'; // overridable for tests
const UA = 'ReverieOfHorsesBuild/1.0 (https://github.com/aiSiraj26/the-reverie-of-horses; one-off image vendoring)';
const MIN_BYTES = 5_000;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const WIKI_IMG = /<img [^>]*?src="(https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/[^"]+)"/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || attempt * 4000;
      console.log(`  ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = TYPES[type];
    if (!ext) throw new Error(`${url} -> unsupported content-type "${type}" (expected jpeg or png)`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES) throw new Error(`${url} -> only ${buf.length} bytes, not a real image`);
    return { buf, ext };
  }
  throw new Error(`${url} -> still throttled after 5 attempts; wait a few minutes and re-run`);
}

function dimensions(buf, ext) {
  if (ext === 'png') {
    if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('bad PNG signature');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('bad JPEG signature');
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no JPEG size marker found');
}

// Find each exhibit's own <img>. Each exhibit is searched only up to the next exhibit,
// so an exhibit with no image can never be paired with a later exhibit's picture.
function findJobs(html, page) {
  const starts = [...html.matchAll(/<article class="exhibit" id="([^"]+)"/g)];
  return starts.flatMap((m, i) => {
    const block = html.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : html.length);
    const img = block.match(WIKI_IMG);
    return img ? [{ page, id: m[1], src: img[1], url: img[1].replace('https://commons.wikimedia.org', ORIGIN) }] : [];
  });
}

const pages = PAGES.map((page) => ({ page, path: join(root, page), html: readFileSync(join(root, page), 'utf8') }));
const jobs = pages.flatMap((p) => findJobs(p.html, p.page));
const ids = jobs.map((j) => j.id);
const dupe = ids.find((id, i) => ids.indexOf(id) !== i);
if (dupe) throw new Error(`Exhibit id "${dupe}" appears on more than one page; its image file would be overwritten. Rename one.`);
if (jobs.length === 0) { console.log('No Wikimedia exhibit images left. Nothing to do.'); process.exit(0); }

mkdirSync(OUT_DIR, { recursive: true });
for (const [n, job] of jobs.entries()) {
  console.log(`[${n + 1}/${jobs.length}] ${job.page}: ${job.id}`);
  const { buf, ext } = await download(job.url);
  job.size = dimensions(buf, ext);
  job.file = `${job.id}.${ext}`;
  writeFileSync(join(OUT_DIR, job.file), buf);
  console.log(`  saved assets/exhibits/${job.file} (${job.size.width}x${job.size.height}, ${Math.round(buf.length / 1024)} KB)`);
  await sleep(1500);
}

// Everything downloaded and verified: now edit the pages.
for (const p of pages) {
  let html = p.html;
  for (const job of jobs.filter((j) => j.page === p.page)) {
    const needle = `src="${job.src}"`;
    if (html.split(needle).length !== 2) throw new Error(`${p.page}: expected exactly one ${job.id} image tag to rewrite`);
    html = html.replace(needle, `src="assets/exhibits/${job.file}" width="${job.size.width}" height="${job.size.height}"`);
  }
  if (/<img [^>]*src="https?:/.test(html)) throw new Error(`${p.page} still has an external <img>; refusing to finish.`);
  const csp = html.replace(/img-src 'self' data: https:\/\/commons\.wikimedia\.org https:\/\/upload\.wikimedia\.org/, "img-src 'self' data:");
  if (csp === html) throw new Error(`${p.page}: could not find the Wikimedia img-src in the CSP; update it by hand.`);
  html = csp
    .replace(/the Wikimedia hosts the\n  exhibit plates are hotlinked from \(same allowance index\.html uses\)\./, 'nothing else: the exhibit plates are self-hosted under assets/exhibits/.')
    .replace(/\+ the Wikimedia hosts the exhibit images load from\./, '+ nothing else: the exhibit images are self-hosted under assets/exhibits/.');
  writeFileSync(p.path, html);
}
console.log(`\nDone: ${jobs.length} images vendored across ${pages.length} page(s), CSP tightened.`);
