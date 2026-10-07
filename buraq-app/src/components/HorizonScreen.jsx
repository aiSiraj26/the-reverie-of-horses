import { useState } from 'react';
import ThresholdCard from './ThresholdCard.jsx';

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
const box = 'w-full resize-none rounded-2xl border border-line bg-panel px-4 py-3 text-base leading-relaxed outline-none placeholder:text-muted focus:border-gold';

// Stage 5: the crossing, a short retrospective, and the next horizon.
export default function HorizonScreen({ leader, current, crossing, onCross, onReplay, onNext }) {
  const [step, setStep] = useState('ready');
  const [retro, setRetro] = useState({ carried: '', tell_yourself: '' });
  const [pick, setPick] = useState(null);
  const [restated, setRestated] = useState('');
  const [fresh, setFresh] = useState({ title: '', to_state: '' });

  const crossed = crossing && leader.thresholds.find((t) => t.threshold_id === crossing.threshold_id);

  // ---- done: the crossing record and the next card ----
  if (crossing && crossed) {
    const p = leader.thresholds.find((t) => t.is_primary);
    const r = crossing.retrospective ?? {};
    return (
      <div className="thin-scroll h-full overflow-y-auto"><div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 pb-28">
        <header className="rise text-center">
          <p className="label">You crossed</p>
          <h1 className="mt-3 font-serif text-3xl leading-snug sm:text-4xl">{crossed.title}</h1>
          <p className="mt-3 text-sm text-muted">{fmt(crossed.dates.named)} to {fmt(crossed.dates.crossed)} · {daysBetween(crossed.dates.named, crossed.dates.crossed)} days</p>
        </header>
        <section className="rise rounded-2xl border border-gold/50 bg-goldsoft p-6" aria-label="Crossing record">
          <div className="label text-gold">Crossing record</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <div><div className="label mb-1">From</div><p className="leading-relaxed">{crossed.from_state}</p></div>
            <div className="text-gold sm:pt-5" aria-hidden="true">→</div>
            <div><div className="label mb-1">To</div><p className="leading-relaxed">{crossed.to_state}</p></div>
          </div>
          {r.carried && <div className="mt-5 border-t border-gold/30 pt-4"><div className="label mb-1">What carried you</div><p className="font-serif text-lg leading-relaxed">{r.carried}</p></div>}
          {r.tell_yourself && <div className="mt-4"><div className="label mb-1">What you would tell yourself at the start</div><p className="font-serif text-lg leading-relaxed">{r.tell_yourself}</p></div>}
        </section>
        {p && (
          <section aria-label="Next threshold" className="rise">
            <p className="label mb-3">The next horizon</p>
            <ThresholdCard title={p.title} from={p.from_state} to={p.to_state} resistance={p.resistance} stakes={p.stakes} />
          </section>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={onNext} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper">Begin the next crossing →</button>
          <button onClick={onReplay} className="text-sm text-muted underline-offset-4 hover:underline">Replay this crossing</button>
        </div>
      </div></div>
    );
  }

  const waiting = leader.thresholds.filter((t) => !t.is_primary && t.status === 'not_started');
  const chosen = pick ?? (waiting[0]?.threshold_id ?? 'new');

  return (
    <div className="thin-scroll h-full overflow-y-auto"><div className="mx-auto flex max-w-xl flex-col gap-7 px-6 py-10 pb-28">
      {step === 'ready' && (
        <section className="rise flex flex-col gap-6">
          <header><p className="label">The crossing</p><h1 className="mt-3 font-serif text-3xl leading-snug">{current.title}</h1>
            <p className="mt-3 text-sm text-muted">When the signs you named have happened, mark the crossing. Nothing here is a test; you decide when it is true.</p></header>
          <ThresholdCard title={current.title} from={current.from_state} to={current.to_state} />
          <div>
            <div className="label mb-2">The signs you named</div>
            <ul className="flex flex-col gap-2 text-sm">{[...current.evidence, ...(current.observed ?? []).map((o) => `${o.text} (recorded)`)].map((e, i) => <li key={i} className="rounded-lg border border-line px-3 py-2 leading-relaxed">{e}</li>)}</ul>
          </div>
          <button onClick={() => setStep('reflect')} className="self-start rounded-full bg-ink px-6 py-2.5 text-sm text-paper">The evidence is met. Mark it crossed.</button>
        </section>
      )}

      {step === 'reflect' && (
        <section className="rise flex flex-col gap-6">
          <header><p className="label">Look back</p><h1 className="mt-3 font-serif text-3xl leading-snug">Look how far you have come.</h1></header>
          <div className="rounded-2xl border border-line bg-panel p-5 text-[0.95rem] leading-relaxed">
            <div className="label mb-1">You began</div><p>{current.from_state}</p>
            <div className="my-3 text-gold" aria-hidden="true">↓</div>
            <div className="label mb-1">You are now</div><p>{current.to_state}</p>
          </div>
          <label className="block"><span className="font-serif text-lg">What carried you?</span>
            <textarea rows={3} value={retro.carried} onChange={(e) => setRetro({ ...retro, carried: e.target.value })} className={`${box} mt-2`} /></label>
          <label className="block"><span className="font-serif text-lg">What would you tell yourself at the start?</span>
            <textarea rows={3} value={retro.tell_yourself} onChange={(e) => setRetro({ ...retro, tell_yourself: e.target.value })} className={`${box} mt-2`} /></label>
          <div className="flex items-center justify-between"><button onClick={() => setStep('ready')} className="text-sm text-muted hover:text-ink">← Back</button>
            <button onClick={() => setStep('next')} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper">Continue</button></div>
        </section>
      )}

      {step === 'next' && (
        <section className="rise flex flex-col gap-5">
          <header><p className="label">What is next?</p><h1 className="mt-3 font-serif text-3xl leading-snug">Choose the next horizon.</h1>
            <p className="mt-2 text-sm text-muted">{waiting.length ? 'These were waiting for you. Put the one you choose into your own words.' : 'Nothing was waiting. Name where you would like to go next.'}</p></header>
          {waiting.map((t) => (
            <label key={t.threshold_id} className={`block cursor-pointer rounded-2xl border p-4 ${chosen === t.threshold_id ? 'border-gold bg-goldsoft' : 'border-line'}`}>
              <input type="radio" name="next" className="sr-only" checked={chosen === t.threshold_id} onChange={() => { setPick(t.threshold_id); setRestated(t.title); }} />
              <div className="font-serif text-lg leading-snug">{t.title}</div>
              <p className="mt-1 text-sm text-muted">{t.from_state}</p>
              {chosen === t.threshold_id && (
                <input value={restated || t.title} onChange={(e) => setRestated(e.target.value)} aria-label="Restate it in your own words"
                  className="mt-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-gold" />
              )}
            </label>
          ))}
          <label className={`block cursor-pointer rounded-2xl border p-4 ${chosen === 'new' ? 'border-gold bg-goldsoft' : 'border-line'}`}>
            <input type="radio" name="next" className="sr-only" checked={chosen === 'new'} onChange={() => setPick('new')} />
            <div className="font-serif text-lg">Something else</div>
            {chosen === 'new' && (
              <div className="mt-3 flex flex-col gap-2">
                <input value={fresh.title} onChange={(e) => setFresh({ ...fresh, title: e.target.value })} placeholder="Where do you want to go next?" aria-label="The next crossing"
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-gold" />
                <input value={fresh.to_state} onChange={(e) => setFresh({ ...fresh, to_state: e.target.value })} placeholder="When it has happened, what is true?" aria-label="What will be true"
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-gold" />
              </div>
            )}
          </label>
          <div className="flex items-center justify-between"><button onClick={() => setStep('reflect')} className="text-sm text-muted hover:text-ink">← Back</button>
            <button disabled={chosen === 'new' ? !(fresh.title.trim() && fresh.to_state.trim()) : false}
              onClick={() => onCross({
                threshold_id: current.threshold_id, retrospective: retro,
                next: chosen === 'new' ? { kind: 'new', title: fresh.title, to_state: fresh.to_state } : { kind: 'existing', id: chosen, title: restated || waiting.find((t) => t.threshold_id === chosen)?.title },
              })}
              className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper disabled:opacity-30">Cross over</button></div>
        </section>
      )}
    </div></div>
  );
}
