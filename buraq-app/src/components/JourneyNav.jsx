import { STAGES } from '../../shared/journey.js';

function Step({ s, stage, onClick }) {
  const current = s.n === stage, done = s.n < stage;
  return (
    <li className="flex items-center">
      <button onClick={onClick} aria-current={current ? 'step' : undefined} title={s.name}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition ${current ? 'bg-goldsoft text-ink' : 'text-muted hover:text-ink'}`}>
        <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${current ? 'border-gold bg-gold text-paper' : done ? 'border-gold text-gold' : 'border-line'}`}>{s.n}</span>
        <span className={current ? '' : 'hidden lg:inline'}>{s.short}</span>
      </button>
      {s.n < STAGES.length && <span aria-hidden="true" className="mx-1 hidden h-px w-4 bg-line sm:block" />}
    </li>
  );
}

export default function JourneyNav({ stage, setStage, leaders, leaderId, onLeader, showLeader = true, coach, setCoach, onReset, status }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="font-serif text-xl tracking-tight">Buraq</div>
        <ol className="order-last flex w-full items-center justify-center sm:order-none sm:w-auto sm:flex-1" aria-label="Journey stages">
          {STAGES.map((s) => <Step key={s.n} s={s} stage={stage} onClick={() => setStage(s.n)} />)}
        </ol>
        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          {showLeader && <label className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Leader</span>
            <select value={leaderId} onChange={(e) => onLeader(e.target.value)} aria-label="Leader"
              className="rounded-lg border border-line bg-panel px-2 py-1.5 text-base text-ink sm:text-sm">
              {leaders.map((l) => <option key={l.leader_id} value={l.leader_id}>{l.identity.preferred_name}</option>)}
            </select>
          </label>}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={coach} onChange={(e) => setCoach(e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
            Coach view
          </label>
          <button onClick={onReset} className="text-xs text-muted hover:text-ink" title="Clear everything saved in this browser for the prototype">Reset</button>
          <span className={`hidden rounded-full border px-2 py-0.5 text-[0.7rem] md:inline-block ${status?.mode === 'live' ? 'border-gold/40 text-gold' : 'border-line text-muted'}`}>{status?.mode === 'live' ? 'Live' : 'Demo'}</span>
        </div>
      </div>
    </header>
  );
}
