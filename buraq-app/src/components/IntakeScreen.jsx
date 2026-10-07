import { useState } from 'react';
import ThresholdCard from './ThresholdCard.jsx';

const STEPS = [
  { key: 'title', q: 'Where do you want to go?', hint: 'Name the crossing in your own words. A few words is enough.', ex: 'Stop being the bottleneck.', rows: 2 },
  { key: 'from_state', q: 'Where are you now?', hint: 'Describe how it is today, as you would tell a friend.', ex: 'Every decision waits on me.', rows: 3 },
  { key: 'to_state', q: 'Where will you be?', hint: 'When the crossing has happened, what is true?', ex: 'My team moves without asking permission.', rows: 3 },
  { key: 'resistance', q: 'What pulls you back?', hint: 'The honest answer, in the first person.', ex: 'I feel guilty when I am not in the room.', rows: 3 },
  { key: 'stakes', q: 'What does staying where you are cost you?', hint: 'What do you lose if nothing changes?', ex: 'I stay the ceiling on how fast we grow.', rows: 3 },
];
const LAST = STEPS.length; // the practice step
const REVIEW = LAST + 1;

const field = 'mt-4 w-full resize-none rounded-2xl border border-line bg-panel px-4 py-3 text-base leading-relaxed outline-none placeholder:text-muted focus:border-gold';

export default function IntakeScreen({ draft, setDraft, view, onConfirm, onGoEntry, onNext }) {
  const [step, setStep] = useState(0);
  const d = draft ?? {};
  const seeded = { ...d, from_state: d.from_state ?? d.raw ?? '' }; // the first naming becomes the starting point

  // A leader created earlier, or no first naming yet: show the card instead of the wizard.
  if (d.confirmed || !d.raw) {
    const t = view.thresholds.find((x) => x.is_primary) ?? view.thresholds[0];
    const p = view.practices.find((x) => x.threshold_id === t.threshold_id && x.status !== 'retired');
    return (
      <div className="thin-scroll h-full overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
          <header className="rise">
            <p className="label">{d.confirmed ? 'Your crossing is named' : 'Threshold card'}</p>
            <h1 className="mt-3 font-serif text-3xl leading-snug">{d.confirmed ? `Thank you, ${view.identity.preferred_name}.` : `${view.identity.preferred_name}'s crossing`}</h1>
            <p className="mt-3 max-w-lg text-sm text-muted">{d.confirmed ? 'This is yours. You can change any word of it at any time.' : 'This is the card Stage 2 produces. To walk through the intake yourself, begin with the first naming.'}</p>
          </header>
          <ThresholdCard title={t.title} from={t.from_state} to={t.to_state} resistance={t.resistance} stakes={t.stakes}
            practice={p ? `${p.name}. Done when: ${p.definition_of_done}` : null} />
          <div className="flex flex-wrap gap-3">
            {d.confirmed
              ? <button onClick={onNext} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper">Begin the first session →</button>
              : <button onClick={onGoEntry} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper">Start as a new leader →</button>}
          </div>
        </div>
      </div>
    );
  }

  const set = (k, v) => setDraft({ ...d, [k]: v });
  const cur = STEPS[step];
  const value = (k) => seeded[k] ?? '';
  const ready = step === LAST
    ? Boolean(d.practice_name?.trim() && d.practice_done?.trim())
    : step < LAST ? Boolean(value(cur.key).trim()) : true;
  const next = () => { if (step === 1 && d.from_state == null) setDraft({ ...d, from_state: seeded.from_state }); setStep((s) => s + 1); };

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-6 px-6 py-10">
        <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={REVIEW + 1} aria-valuenow={step + 1} aria-label="Intake progress">
          {Array.from({ length: REVIEW + 1 }, (_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-line'}`} />)}
        </div>

        {step < LAST && (
          <section key={cur.key} className="rise">
            <p className="label">Question {step + 1} of {LAST + 1}</p>
            <h1 className="mt-3 font-serif text-3xl leading-snug">{cur.q}</h1>
            <p className="mt-2 text-sm text-muted">{cur.hint} <span className="italic">For example: {cur.ex}</span></p>
            <textarea autoFocus={window.matchMedia?.('(pointer: fine)').matches} value={value(cur.key)} rows={cur.rows} aria-label={cur.q}
              onChange={(e) => set(cur.key, e.target.value)} className={field} />
          </section>
        )}

        {step === LAST && (
          <section className="rise">
            <p className="label">Question {LAST + 1} of {LAST + 1}</p>
            <h1 className="mt-3 font-serif text-3xl leading-snug">What is one small thing you will do before we meet again?</h1>
            <p className="mt-2 text-sm text-muted">Small and checkable. <span className="italic">For example: Hand one decision to my team each week.</span></p>
            <input value={d.practice_name ?? ''} onChange={(e) => set('practice_name', e.target.value)} aria-label="The practice" placeholder="The practice"
              className={`${field} resize-none`} />
            <input value={d.practice_done ?? ''} onChange={(e) => set('practice_done', e.target.value)} aria-label="How we will know it is done" placeholder="Done when… (something anyone could check)"
              className={`${field} !mt-3`} />
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label="How often">
              {['weekly', 'daily'].map((r) => (
                <button key={r} type="button" role="radio" aria-checked={(d.practice_rhythm ?? 'weekly') === r} onClick={() => set('practice_rhythm', r)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${(d.practice_rhythm ?? 'weekly') === r ? 'border-gold bg-goldsoft' : 'border-line text-muted'}`}>{r === 'weekly' ? 'Weekly' : 'Daily'}</button>
              ))}
            </div>
          </section>
        )}

        {step === REVIEW && (
          <section className="rise flex flex-col gap-5">
            <header><p className="label">Is this your crossing?</p><h1 className="mt-3 font-serif text-3xl leading-snug">Read it back. Change any word.</h1></header>
            <ThresholdCard title={seeded.title} from={seeded.from_state} to={seeded.to_state} resistance={seeded.resistance} stakes={seeded.stakes}
              practice={`${d.practice_name}. Done when: ${d.practice_done}`} />
            <div className="flex flex-wrap gap-2 text-xs">
              {[['Crossing', 0], ['Now', 1], ['Future', 2], ['Pull back', 3], ['Cost', 4], ['Practice', LAST]].map(([l, i]) => (
                <button key={l} onClick={() => setStep(i)} className="rounded-full border border-line px-3 py-1 text-muted hover:text-ink">Edit {l.toLowerCase()}</button>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => (step === 0 ? onGoEntry() : setStep((s) => s - 1))} className="text-sm text-muted hover:text-ink">← {step === 0 ? 'First naming' : 'Back'}</button>
          {step < REVIEW
            ? <button onClick={next} disabled={!ready} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper disabled:opacity-30">Continue</button>
            : <button onClick={() => onConfirm({ ...seeded })} className="rounded-full bg-ink px-6 py-2.5 text-sm text-paper">This is my crossing</button>}
        </div>
      </div>
    </div>
  );
}
