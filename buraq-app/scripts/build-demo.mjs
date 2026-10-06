// Turns the single-file build into an HTML fragment for hosting as an artifact:
// the host wraps it in its own <html>/<head>/<body>, so we emit only title, style, root and script.
import { readFileSync, writeFileSync } from 'node:fs';

const built = readFileSync('dist-demo/index.html', 'utf8');
const style = built.match(/<style[^>]*>[\s\S]*?<\/style>/)?.[0];
const script = built.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/)?.[0];
if (!style || !script) throw new Error('Could not find inlined style/script in dist-demo/index.html');

const out = `<title>Buraq Threshold Coaching</title>
${style}
<div id="root"></div>
${script}
`;
writeFileSync('dist-demo/buraq-demo.html', out);
console.log(`Wrote dist-demo/buraq-demo.html (${(out.length / 1024).toFixed(0)} KB)`);
