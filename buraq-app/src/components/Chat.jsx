import { useEffect, useRef, useState } from 'react';

function Message({ m }) {
  if (m.role === 'user') return (
    <div className="rise flex justify-end"><div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-panel px-4 py-3 text-[0.95rem] leading-relaxed">{m.content}</div></div>
  );
  return (
    <div className="rise">
      <div className="label mb-1.5">Buraq</div>
      <div className={`whitespace-pre-wrap font-serif text-[1.08rem] leading-[1.75] ${m.error ? 'text-warn' : ''}`}>{m.content || <Dots />}</div>
      {m.notice && <div className="mt-2 text-xs text-muted">{m.notice}</div>}
    </div>
  );
}
const Dots = () => <span className="inline-flex gap-1 align-middle" aria-label="Thinking">{[0, 1, 2].map((i) => <span key={i} className="dot-breathe h-1.5 w-1.5 rounded-full bg-gold" style={{ animationDelay: `${i * 0.2}s` }} />)}</span>;

export default function Chat({ leader, threshold, messages, busy, onSend, starters }) {
  const [text, setText] = useState('');
  const end = useRef(null), box = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [messages]);
  // Only auto-focus where there is a physical keyboard; on a phone it would open the keyboard unasked.
  useEffect(() => { setText(''); if (window.matchMedia('(pointer: fine)').matches) box.current?.focus(); }, [leader.leader_id]);

  const submit = (t = text) => { const v = t.trim(); if (!v || busy) return; setText(''); onSend(v); };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="thin-scroll flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-9 px-6 py-10">
          {messages.length === 0 ? (
            <div className="rise pt-10 text-center">
              <h1 className="font-serif text-3xl leading-snug">{leader.identity.preferred_name}, what would you like to bring today?</h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">We are working on <i>{threshold.title}</i> Begin anywhere.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {starters.map((s) => <button key={s} onClick={() => submit(s)} className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-ink">{s}</button>)}
              </div>
            </div>
          ) : messages.map((m, i) => <Message key={i} m={m} />)}
          <div ref={end} />
        </div>
      </div>
      <div className="border-t border-line bg-paper/80 px-6 py-4 backdrop-blur">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mx-auto flex max-w-2xl items-end gap-3 rounded-2xl border border-line bg-panel px-4 py-3 focus-within:border-gold">
          <textarea ref={box} value={text} rows={1} disabled={busy} placeholder="Say what is on your mind…" aria-label="Message"
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            className="max-h-40 flex-1 resize-none bg-transparent text-base sm:text-[0.95rem] leading-relaxed outline-none placeholder:text-muted" />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper transition disabled:opacity-30">Send</button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[0.68rem] text-muted">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}
