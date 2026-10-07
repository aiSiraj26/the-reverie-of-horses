import { useMemo, useState } from 'react';
import { StatusChip } from './Sidebar.jsx';
import { cadenceLabel, recalibrate } from '../../shared/journey.js';

const TYPE_STYLE = {
  breakthrough: 'text-gold border-gold/50', check_in: 'text-ink/70 border-line', session: 'text-ink/70 border-line',
  slip: 'text-warn border-warn/40', reframe: 'text-gold border-gold/50',
};
const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function Dots({ n, of = 5 }) {
  return <span className="inline-flex gap-1" role="img" aria-label={`${n} of ${of}`}>{Array.from({ length: of }, (_, i) => <span key={i} className={`h-2 w-2 rounded-full ${i < n ? 'bg-gold' : 'bg-line'}`} />)}</span>;
}

function Capture({ label, placeholder, button, onSave, tone }) {
  const [v, setV] = useState('');
  const submit = (e) => { e.preventDefault(); if (!v.trim()) return; onSave(v.trim()); setV(''); };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="text-sm text-muted" htmlFor={`cap-${label}`}>{label}</label>
      <div className="flex gap-2">
        <input id={`cap-${label}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base outline-none focus:border-gold sm:text-sm" />
        <button type="submit" disabled={!v.trim()} className={`rounded-lg border px-4 py-2 text-sm disabled:opacity-30 ${tone === 'slip' ? 'border-warn/40 text-warn' : 'border-gold text-gold'}`}>{button}</button>
      </div>
    </form>
  );
}

// Stage 4: real-world actions recorded, confidence and cadence recalibrated.
export default function EvidenceScreen({ leader, threshold, calibApplied, onEvidence, onSlip, onApply, onUndo, today = new Date() }) {
  const r = useMemo(() => recalibrate(leader, threshold, today), [leader, threshold, today]);
  const moments = [
    ...leader.log.filter((e) => e.threshold_id === threshold.threshold_id && ['breakthrough', 'check_in'].includes(e.type)).map((e) => ({ date: e.timestamp, text: e.summary })),
    ...(threshold.observed ?? []).map((o) => ({ date: o.date, text: o.text })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const slips = leader.log.filter((e) => e.threshold_id === threshold.threshold_id && e.type === 'slip');
  const timeline = leader.log.filter((e) => !e.threshold_id || e.threshold_id === threshold.threshold_id).slice(-8).reverse();
  const s = r.suggestion;
  const changes = s.confidence.score !== threshold.confidence.score || s.cadence !== threshold.cadence || s.status !== threshold.status;
  const tone = { progressing: ['Moving', 'text-gold'], steady: ['Steady', 'text-ink/70'], stalling: ['Stalling', 'text-warn'] }[r.tone];

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8 pb-28">
        <header className="rise">
          <p className="label">Evidence</p>
          <h1 className="mt-2 font-serif text-3xl leading-snug">{threshold.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted"><StatusChip status={threshold.status} /><span>Target {threshold.dates.target_cross ? fmt(threshold.dates.target_cross) : 'not set'}</span><span>·</span><span>{cadenceLabel(threshold.cadence)}</span></div>
        </header>

        <section aria-labelledby="signs" className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 id="signs" className="label mb-2">The signs we are looking for</h2>
            <ul className="flex flex-col gap-2 text-sm">{threshold.evidence.map((e, i) => <li key={i} className="rounded-lg border border-line bg-panel px-3 py-2 leading-relaxed">{e}</li>)}</ul>
          </div>
          <div className="flex flex-col gap-5">
            <Capture label="Something that changed, in your words" placeholder="Two calls shipped without my sign-off" button="Add" onSave={onEvidence} />
            <Capture label="Something that slipped. No judgment." placeholder="Stayed for the whole stand-up" button="Note it" tone="slip" onSave={onSlip} />
          </div>
        </section>

        <section aria-labelledby="moments">
          <h2 id="moments" className="label mb-3">What has happened</h2>
          {moments.length === 0 ? <p className="text-sm text-muted">Nothing recorded yet. The first small shift counts.</p> : (
            <ol className="flex flex-col gap-3 border-l border-line pl-5">
              {moments.map((m, i) => (
                <li key={i} className="relative text-sm leading-relaxed">
                  <span aria-hidden="true" className="absolute -left-[1.62rem] top-2 h-2 w-2 rounded-full bg-gold" />
                  <span className="mr-2 text-xs text-muted tabular-nums">{fmt(m.date)}</span>{m.text}
                </li>
              ))}
            </ol>
          )}
          {slips.length > 0 && <p className="mt-4 text-xs text-muted">{slips.length} slip{slips.length > 1 ? 's' : ''} noted without judgment. The pattern of when they happen is useful, so they stay in the timeline below.</p>}
        </section>

        <section aria-labelledby="recal" className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="recal" className="font-serif text-xl">Recalibration</h2>
            <span className={`text-sm ${tone[1]}`}>Reading: {tone[0]}</span>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="label mb-1">Confidence now</div>
              <div className="flex items-center gap-3"><span className="font-serif text-3xl">{threshold.confidence.score}<span className="text-lg text-muted">/5</span></span><Dots n={threshold.confidence.score} /></div>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{threshold.confidence.reason}</p>
            </div>
            <div>
              <div className="label mb-1">Signals</div>
              {r.signals.length === 0 ? <p className="text-sm text-muted">Not enough history yet.</p>
                : <ul className="flex flex-col gap-1 text-sm">{r.signals.map((x, i) => <li key={i} className={x.tone === 'up' ? 'text-gold' : 'text-warn'}><span aria-hidden="true">{x.tone === 'up' ? '▲' : '▼'}</span> <span className="text-ink/85">{x.text}</span></li>)}</ul>}
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-goldsoft p-4 text-sm">
            <div className="label mb-2 text-gold">Proposed</div>
            <ul className="flex flex-col gap-1">
              <li>Confidence: {threshold.confidence.score} → <b>{s.confidence.score}</b> <span className="text-ink/70">({s.confidence.reason})</span></li>
              <li>Rhythm: {cadenceLabel(threshold.cadence)} → <b>{cadenceLabel(s.cadence)}</b></li>
              <li className="text-ink/80">{s.note}</li>
            </ul>
            <div className="mt-3 flex items-center gap-3">
              {calibApplied
                ? <><span className="text-gold">Applied.</span><button onClick={onUndo} className="text-xs text-muted underline-offset-4 hover:underline">Undo</button></>
                : <button onClick={() => onApply({ threshold_id: threshold.threshold_id, status: s.status, cadence: s.cadence, confidence: s.confidence })} disabled={!changes}
                    className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-30">{changes ? 'Apply recalibration' : 'No change proposed'}</button>}
            </div>
          </div>
        </section>

        <section aria-labelledby="practice">
          <h2 id="practice" className="label mb-3">Practices</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {leader.practices.filter((p) => p.threshold_id === threshold.threshold_id).map((p) => (
              <div key={p.practice_id} className="rounded-xl border border-line p-4 text-sm">
                <div className="flex items-start justify-between gap-2"><span className="font-serif text-base leading-snug">{p.name}</span><span className="label">{p.status}</span></div>
                <p className="mt-1 text-muted">Done when: {p.definition_of_done}</p>
                <p className="mt-2 tabular-nums">Streak {p.streak.current}<span className="text-muted"> · best {p.streak.longest}</span></p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="timeline">
          <h2 id="timeline" className="label mb-3">The log</h2>
          <ol className="flex flex-col gap-3">
            {timeline.map((e) => (
              <li key={e.entry_id} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 text-xs text-muted tabular-nums">{fmt(e.timestamp)}</span>
                <span className={`h-fit shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-wider ${TYPE_STYLE[e.type] ?? ''}`}>{e.type.replace('_', ' ')}</span>
                <span className="min-w-0 leading-relaxed">{e.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
