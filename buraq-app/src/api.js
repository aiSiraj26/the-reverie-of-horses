// The hosted demo build sets VITE_STATIC and has no server; load its backend lazily.
const HOSTED = import.meta.env.VITE_STATIC === 'true';
const hosted = () => import('./staticBackend.js');

export async function getJSON(path) {
  if (HOSTED) { const b = await hosted(); return path === '/api/context' ? b.ctx : b.status; }
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function getPrompt(leader_id, overrides) {
  if (HOSTED) return (await hosted()).prompt(leader_id, overrides);
  const r = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leader_id, overrides }) });
  return (await r.json()).prompt;
}

// POST /api/chat streams server-sent events: {text}, {notice}, {error}, {done}.
export async function streamChat(body, { onText, onNotice, signal }) {
  if (HOSTED) return (await hosted()).chat(body, { onText, signal });
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || `Request failed (${r.status})`);
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
      if (!line.startsWith('data:')) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.error) throw new Error(ev.error);
      if (ev.text) onText(ev.text);
      if (ev.notice) onNotice?.(ev.notice);
    }
  }
}
