import { useEffect, useRef, useState } from 'react';
import { listenReply } from '../../shared/journey.js';

// Stage 1: the quiet salon. One open question, no forms, no scores.
export default function EntryScreen({ draft, setDraft, onContinue }) {
  const messages = draft?.messages ?? [];
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [messages.length, pending]);

  const say = (e) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || pending) return;
    const turn = messages.filter((m) => m.role === 'user').length;
    const user = [...messages, { role: 'user', content: v }];
    const mine = user.filter((m) => m.role === 'user').map((m) => m.content);
    setText('');
    setPending(true);
    setDraft({ ...draft, messages: user, raw: mine.join('\n') });
    setTimeout(() => { // a short pause keeps the room calm
      setDraft((d) => ({ ...d, messages: [...user, { role: 'assistant', content: listenReply(v, d.name, turn) }] }));
      setPending(false);
    }, 700);
  };

  const heard = messages.some((m) => m.role === 'assistant');
  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-8 px-6 py-12">
        {messages.length === 0 && (
          <header className="rise text-center">
            <p className="label">A quiet room</p>
            <h1 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">What would you like to bring today?</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-muted">There is no form to fill in. Say it the way it comes. I will listen first.</p>
          </header>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-7" aria-live="polite">
            {messages.map((m, i) => m.role === 'user'
              ? <p key={i} className="rise self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-panel px-4 py-3 text-[0.95rem] leading-relaxed">{m.content}</p>
              : <div key={i} className="rise"><div className="label mb-1.5">Buraq</div><p className="font-serif text-[1.08rem] leading-[1.75]">{m.content}</p></div>)}
            {pending && <div className="label dot-breathe">Listening…</div>}
            <div ref={end} />
          </div>
        )}

        <form onSubmit={say} className="flex flex-col gap-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={messages.length ? 2 : 4} disabled={pending}
            aria-label={messages.length ? 'Say more' : 'What would you like to bring today?'}
            placeholder={messages.length ? 'Say more, or stay quiet for a moment…' : 'Start anywhere…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) say(e); }}
            className="w-full resize-none rounded-2xl border border-line bg-panel px-4 py-3 text-base leading-relaxed outline-none placeholder:text-muted focus:border-gold" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">{heard ? 'Held exactly as you said it.' : 'Nothing is analysed yet.'}</p>
            <button type="submit" disabled={!text.trim() || pending} className="rounded-full bg-ink px-5 py-2 text-sm text-paper transition disabled:opacity-30">{messages.length ? 'Send' : 'Begin'}</button>
          </div>
        </form>

        {heard && (
          <section className="rise rounded-2xl border border-line bg-panel p-5" aria-label="Your first naming">
            <div className="label">Your first naming</div>
            <p className="mt-2 whitespace-pre-wrap font-serif text-lg leading-relaxed">{draft.raw}</p>
            <label className="mt-4 block text-sm">
              <span className="text-muted">What should I call you?</span>
              <input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="First name"
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-gold" />
            </label>
            <button onClick={onContinue} className="mt-4 w-full rounded-full bg-ink px-5 py-2.5 text-sm text-paper sm:w-auto">Name the crossing →</button>
          </section>
        )}
      </div>
    </div>
  );
}
