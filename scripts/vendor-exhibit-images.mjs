// One-off tool: replaces the hot-linked Wikimedia exhibit images in index.html
// with copies stored in assets/exhibits/, so the page (and CI) no longer depends
// on Wikimedia being reachable and willing to serve the browser.
//
//   node scripts/vendor-exhibit-images.mjs
//
// For each <article class="exhibit" id="..."> it downloads the image, saves it as
// assets/exhibits/<id>.<ext>, rewrites the <img> to the local file with width and
// height read from the file, and drops the Wikimedia hosts from the CSP img-src
// (least privilege: nothing loads from there any more). Safe to re-run. Fails loudly
// on any download or format problem and writes nothing to index.html until every
// image has been fetched and checked.
//
// Wikimedia asks automated clients to identify themselves and to be gentle, so this
// sends a descriptive User-Agent, goes one image at a time and honours Retry-After.
// Credits stay in the page: each caption already links to its Commons file page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(root, 'index.html');
const OUT_DIR = join(root, 'assets', 'exhibits');
const ORIGIN = process.env.COMMONS_ORIGIN || 'https://commons.wikimedia.org'; // overridable for tests
const UA = 'ReverieOfHorsesBuild/1.0 (https://github.com/aiSiraj26/the-reverie-of-horses; one-off image vendoring)';
const MIN_BYTES = 5_000;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png' };

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

let html = readFileSync(PAGE, 'utf8');
const re = /(<article class="exhibit" id="([^"]+)"[\s\S]*?<img )src="(https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/[^"]+)"/g;
const jobs = [...html.matchAll(re)].map((m) => ({ id: m[2], url: m[3].replace('https://commons.wikimedia.org', ORIGIN) }));
if (jobs.length === 0) { console.log('No Wikimedia exhibit images left in index.html. Nothing to do.'); process.exit(0); }

mkdirSync(OUT_DIR, { recursive: true });
const done = new Map();
for (const [n, job] of jobs.entries()) {
  console.log(`[${n + 1}/${jobs.length}] ${job.id}`);
  const { buf, ext } = await download(job.url);
  const size = dimensions(buf, ext);
  const file = `${job.id}.${ext}`;
  writeFileSync(join(OUT_DIR, file), buf);
  done.set(job.id, { file, ...size });
  console.log(`  saved assets/exhibits/${file} (${size.width}x${size.height}, ${Math.round(buf.length / 1024)} KB)`);
  await sleep(1500);
}

// Everything downloaded and verified: now edit the page.
html = html.replace(re, (whole, head, id) => {
  const d = done.get(id);
  return `${head}src="assets/exhibits/${d.file}" width="${d.width}" height="${d.height}"`;
});
const cspBefore = html;
html = html.replace(/img-src 'self' data: https:\/\/commons\.wikimedia\.org https:\/\/upload\.wikimedia\.org/, "img-src 'self' data:");
if (html === cspBefore) throw new Error('Could not find the Wikimedia img-src in the CSP; update it by hand.');
html = html.replace(
  /  CSS\) \+ the Wikimedia hosts the exhibit images load from\./,
  '  CSS). Exhibit images are self-hosted under assets/exhibits/, so no third-party\n  image origins are allowed.'
);
if (/<img [^>]*src="https?:/.test(html)) {
  throw new Error('index.html still has an external <img>; refusing to finish.');
}
writeFileSync(PAGE, html);
console.log(`\nDone: ${jobs.length} images vendored, index.html updated, CSP tightened.`);
