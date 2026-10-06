import { useState } from 'react';

const initials = (n) => n.split(' ').map((p) => p[0]).join('');
const STATUS = {
  on_the_crossing: 'On the crossing', stalled: 'Stalled', not_started: 'Not started', crossed: 'Crossed',
};

export function StatusChip({ status }) {
  const tone = status === 'stalled' ? 'text-warn border-warn/40' : status === 'on_the_crossing' ? 'text-gold border-gold/40' : 'text-muted border-line';
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] ${tone}`}>{STATUS[status] ?? status}</span>;
}

function Intensity({ n }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Intensity ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= n ? 'bg-gold' : 'bg-line'}`} />)}
    </span>
  );
}

export default function Sidebar({ ctx, leader, threshold, onSwitch, onEdit, onInspect, showStance, setShowStance }) {
  const id = leader.identity;
  const tensions = (threshold.tensions ?? []).filter((t) => t.state !== 'resolved');
  const names = (ids) => ids.map((i) => ctx.vocab.archetypes[i]?.name ?? ctx.vocab.dimensions[i]?.name ?? i);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-7 overflow-y-auto thin-scroll px-6 py-7">
      <header>
        <div className="font-serif text-2xl tracking-tight">Buraq</div>
        <div className="label mt-1">Threshold coaching</div>
      </header>

      <section aria-label="Switch leader">
        <div className="label mb-2">Test leaders</div>
        <div className="grid grid-cols-3 gap-2">
          {ctx.leaders.map((l) => {
            const on = l.leader_id === leader.leader_id;
            return (
              <button key={l.leader_id} onClick={() => onSwitch(l.leader_id)} aria-pressed={on}
                className={`rounded-lg border px-2 py-2 text-center text-xs transition ${on ? 'border-gold bg-goldsoft text-ink' : 'border-line text-muted hover:border-gold/60 hover:text-ink'}`}>
                <div className="font-serif text-base leading-none">{initials(l.identity.name)}</div>
                <div className="mt-1">{l.identity.preferred_name}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section key={leader.leader_id} className="rise">
        <div className="label mb-2">Leader</div>
        <div className="font-serif text-xl">{id.name}</div>
        <div className="mt-0.5 text-sm text-muted">{id.role.title}</div>
        <div className="text-sm text-muted">{id.org_context.stage} · {id.org_context.size} people</div>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">“{id.success_definition}”</p>
      </section>

      <section key={`${leader.leader_id}-t`} className="rise">
        <div className="mb-2 flex items-center justify-between">
          <div className="label">Current threshold</div>
          <StatusChip status={threshold.status} />
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="font-serif text-lg leading-snug">{threshold.title}</div>
          <div className="mt-3 text-sm">
            <div className="label mb-0.5">From</div>
            <p className="text-ink/80">{threshold.from_state}</p>
            <div className="my-2 text-gold" aria-hidden="true">↓</div>
            <div className="label mb-0.5">To</div>
            <p className="text-ink/80">{threshold.to_state}</p>
          </div>
        </div>
        <button onClick={onEdit} className="mt-2 text-xs text-gold underline-offset-4 hover:underline">Edit context</button>
      </section>

      <section aria-label="Active tensions">
        <div className="label mb-2">Active tensions</div>
        {tensions.length === 0 ? (
          <p className="text-sm text-muted">None recorded. A clear run.</p>
        ) : tensions.map((t) => (
          <div key={t.tension_id} className="mb-3 rounded-lg border border-line p-3 text-sm">
            <div className="mb-1.5 flex items-center justify-between"><span className="text-xs text-muted">{t.state}</span><Intensity n={t.intensity} /></div>
            <p className="text-ink/80">{t.pull_a}</p>
            <p className="my-1 text-center text-xs text-gold" aria-hidden="true">versus</p>
            <p className="text-ink/80">{t.pull_b}</p>
          </div>
        ))}
      </section>

      <section aria-label="Agent stance (internal)" className="mt-auto border-t border-line pt-4">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="flex w-full items-center justify-between text-left text-xs text-muted hover:text-ink">
          <span>Agent stance <span className="opacity-60">· internal</span></span><span aria-hidden="true">{open ? '–' : '+'}</span>
        </button>
        {open && (
          <div className="rise mt-3 text-sm">
            <p className="text-ink/80">
              {showStance
                ? <>Holding <b className="font-serif font-medium">{names(threshold.archetype.primary).join(' with ')}</b>. {threshold.stance_notes.replace(/ Internal only.*$/, '')}</>
                : 'Hidden. The agent never names its stance to the leader. Reveal it here to see how it is steering.'}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <button onClick={() => setShowStance((s) => !s)} className="text-gold hover:underline">{showStance ? 'Hide stance' : 'Reveal stance'}</button>
              <button onClick={onInspect} className="text-gold hover:underline">Inspect full brief</button>
            </div>
            {showStance && <p className="mt-2 text-xs text-muted">Dimensions: {names(threshold.dimension.primary).join(', ')}{threshold.dimension.secondary.length ? ` (also ${names(threshold.dimension.secondary).join(', ')})` : ''}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
