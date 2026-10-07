import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar, { StatusChip } from './components/Sidebar.jsx';
import Chat from './components/Chat.jsx';
import IntakeModal from './components/IntakeModal.jsx';
import Modal from './components/Modal.jsx';
import JourneyNav from './components/JourneyNav.jsx';
import BehindScenes from './components/BehindScenes.jsx';
import EntryScreen from './components/EntryScreen.jsx';
import IntakeScreen from './components/IntakeScreen.jsx';
import EvidenceScreen from './components/EvidenceScreen.jsx';
import HorizonScreen from './components/HorizonScreen.jsx';
import RecapModal from './components/RecapModal.jsx';
import { getJSON, getPrompt, streamChat } from './api.js';
import { load, save } from './storage.js';
import { applyLocal, newLeaderBundle, recapLines, cadenceLabel } from '../shared/journey.js';

const OVERRIDE_KEYS = ['title', 'from_state', 'to_state', 'resistance'];
const isLocal = (id) => String(id).startsWith('local_');

export default function App() {
  const [ctx, setCtx] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(() => load('buraq.stage', 1));
  const [coach, setCoach] = useState(() => load('buraq.coach', false));
  const [draft, setDraftState] = useState(() => load('buraq.draft', null));
  const [locals, setLocals] = useState(() => load('buraq.locals', []));
  const [local, setLocalAll] = useState(() => load('buraq.local', {}));
  const [leaderId, setLeaderId] = useState(() => load('buraq.leader', null));
  const [overrides, setOverrides] = useState(() => load('buraq.overrides', {}));
  const [chats, setChats] = useState(() => load('buraq.chats', {}));
  const [busy, setBusy] = useState(false);
  const [intake, setIntake] = useState(false);
  const [brief, setBrief] = useState(null);
  const [recap, setRecap] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [showStance, setShowStance] = useState(false);
  const abort = useRef(null);

  useEffect(() => {
    Promise.all([getJSON('/api/context'), getJSON('/api/status')])
      .then(([c, s]) => { setCtx(c); setStatus(s); setLeaderId((id) => (c.leaders.some((l) => l.leader_id === id) || isLocal(id) ? id : c.leaders[0].leader_id)); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => save('buraq.stage', stage), [stage]);
  useEffect(() => save('buraq.coach', coach), [coach]);
  useEffect(() => save('buraq.draft', draft), [draft]);
  useEffect(() => save('buraq.locals', locals), [locals]);
  useEffect(() => save('buraq.local', local), [local]);
  useEffect(() => { leaderId && save('buraq.leader', leaderId); }, [leaderId]);
  useEffect(() => save('buraq.overrides', overrides), [overrides]);
  useEffect(() => { if (!busy) save('buraq.chats', chats); }, [chats, busy]);

  const setDraft = useCallback((d) => setDraftState((prev) => (typeof d === 'function' ? d(prev ?? {}) : d)), []);
  const patchLocal = (id, fn) => setLocalAll((all) => ({ ...all, [id]: fn(all[id] ?? {}) }));

  const leaders = useMemo(() => (ctx ? [...ctx.leaders, ...locals] : []), [ctx, locals]);
  const baseLeader = leaders.find((l) => l.leader_id === leaderId) ?? leaders[0];
  const mine = local[baseLeader?.leader_id] ?? {};
  // The leader as the screens see them: the layer files plus this browser's changes.
  const leader = useMemo(() => (baseLeader ? applyLocal(baseLeader, mine, ctx.vocab) : null), [baseLeader, mine, ctx]);
  const base = leader?.thresholds.find((t) => t.is_primary);
  const ov = overrides[leader?.leader_id] ?? {};
  const threshold = useMemo(() => (base ? { ...base, ...Object.fromEntries(OVERRIDE_KEYS.filter((k) => ov[k]).map((k) => [k, ov[k]])) } : null), [base, ov]);
  const id = leader?.leader_id;
  const messages = chats[id] ?? [];

  const request = (extra = {}) => ({
    leader_id: id, overrides: ov, local: mine,
    ...(isLocal(id) ? { leader: baseLeader } : {}), ...extra,
  });

  const switchLeader = (next) => { abort.current?.abort(); setBusy(false); setLeaderId(next); setDrawer(false); };

  const send = useCallback(async (content) => {
    const history = [...(chats[id] ?? []), { role: 'user', content }];
    const write = (fn) => setChats((c) => ({ ...c, [id]: fn(c[id] ?? []) }));
    write(() => [...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    abort.current = new AbortController();
    const patch = (p) => write((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, ...p } : x)));
    try {
      let acc = '';
      await streamChat(
        request({ messages: history.filter((m) => !m.error).map(({ role, content: c }) => ({ role, content: c })) }),
        { signal: abort.current.signal, onText: (t) => { acc += t; patch({ content: acc }); }, onNotice: (n) => patch({ notice: n }) },
      );
    } catch (e) {
      if (e.name !== 'AbortError') patch({ error: true, content: e.message });
    } finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, id, ov, mine, baseLeader]);

  const inspect = async () => { try { setBrief(await getPrompt(request())); } catch (e) { setBrief(`Could not build the brief: ${e.message}`); } };

  // Stage 2 -> a brand-new leader who then works through stages 3 to 5.
  const createLeader = (finished) => {
    const bundle = newLeaderBundle(finished, ctx.vocab);
    setLocals([bundle]);
    setLocalAll(({ local_you: _drop, ...rest }) => rest);
    setChats(({ local_you: _drop, ...rest }) => rest);
    setOverrides(({ local_you: _drop, ...rest }) => rest);
    setDraft({ ...finished, confirmed: true });
    setLeaderId('local_you');
  };

  const reset = () => {
    abort.current?.abort();
    ['stage', 'coach', 'draft', 'locals', 'local', 'overrides', 'chats', 'leader'].forEach((k) => { try { localStorage.removeItem(`buraq.${k}`); } catch { /* storage unavailable */ } });
    setStage(1); setDraftState(null); setLocals([]); setLocalAll({}); setOverrides({}); setChats({}); setBusy(false);
    setLeaderId(ctx.leaders[0].leader_id);
  };

  if (error) return <div className="grid h-full place-items-center p-8 text-center"><div><p className="font-serif text-xl">The context layer could not be loaded.</p><p className="mt-2 text-sm text-muted">{error}</p><p className="mt-4 text-xs text-muted">Run from <code>buraq-app/</code> with <code>npm run dev</code>.</p></div></div>;
  if (!ctx || !leader || !threshold) return <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>;

  const sidebar = <Sidebar ctx={ctx} leaders={leaders} leader={leader} threshold={threshold} onSwitch={switchLeader}
    onEdit={() => { setIntake(true); setDrawer(false); }} onInspect={inspect} showStance={showStance} setShowStance={setShowStance} />;
  const withSidebar = (header, body) => (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-80 shrink-0 border-r border-line bg-panel/60 lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setDrawer(false)} />
          <aside className="rise absolute inset-y-0 left-0 w-[85%] max-w-xs border-r border-line bg-paper">{sidebar}</aside>
        </div>
      )}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <button onClick={() => setDrawer(true)} className="text-muted lg:hidden" aria-label="Open leader panel">☰</button>
          {header}
        </div>
        <div className="min-h-0 flex-1">{body}</div>
      </main>
    </div>
  );

  const userMsgs = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const activePractice = leader.practices.find((p) => p.threshold_id === threshold.threshold_id && p.status === 'active');
  const tension = (threshold.tensions ?? []).filter((t) => t.state === 'active').sort((a, b) => b.intensity - a.intensity)[0];

  const crossingHeader = (
    <>
      <div className="min-w-0 flex-1">
        <div className="label whitespace-nowrap">Working on</div>
        <div className="line-clamp-2 font-serif text-base leading-tight sm:text-lg">{threshold.title}</div>
      </div>
      {userMsgs.length > 0 && <button onClick={() => setRecap(recapLines(leader, threshold, userMsgs, ''))} className="whitespace-nowrap text-xs text-gold hover:underline">End session</button>}
      {messages.length > 0 && <button onClick={() => { abort.current?.abort(); setBusy(false); setChats((c) => ({ ...c, [id]: [] })); }} className="whitespace-nowrap text-xs text-muted hover:text-ink"><span className="sm:hidden">New</span><span className="hidden sm:inline">New conversation</span></button>}
      <StatusChip status={threshold.status} />
    </>
  );

  const screen = {
    1: <EntryScreen draft={draft ?? {}} setDraft={setDraft} onContinue={() => setStage(2)} />,
    2: <IntakeScreen draft={draft} setDraft={setDraft} view={leader} onConfirm={createLeader}
        onGoEntry={() => { if (draft?.confirmed) setDraft(null); setStage(1); }} onNext={() => setStage(3)} />,
    3: withSidebar(crossingHeader,
      <Chat leader={leader} threshold={threshold} messages={messages} busy={busy} onSend={send} opener={activePractice}
        starters={['Where do I even start with this?', 'What is really in the way?', ...(leader.identity.language?.[0] ? [`Help me think about "${leader.identity.language[0]}".`] : [])]} />),
    4: withSidebar(
      <div className="min-w-0 flex-1"><div className="label">Stage 4</div><div className="font-serif text-lg leading-tight">Evidence and recalibration</div></div>,
      <EvidenceScreen leader={leader} threshold={threshold} calibApplied={Boolean(mine.calib)}
        onEvidence={(text) => patchLocal(id, (l) => ({ ...l, evidence: [...(l.evidence ?? []), { threshold_id: threshold.threshold_id, text, date: new Date().toISOString().slice(0, 10) }] }))}
        onSlip={(text) => patchLocal(id, (l) => ({ ...l, extraLog: [...(l.extraLog ?? []), {
          entry_id: `log_local_${Date.now()}`, timestamp: new Date().toISOString().slice(0, 10), leader_id: id, threshold_id: threshold.threshold_id, type: 'slip',
          summary: text, leader_state: 'Not recorded', commitments_made: [], commitments_kept: [], agent_notes: [], source: { said: [text], inferred: [] } }] }))}
        onApply={(calib) => patchLocal(id, (l) => ({ ...l, calib }))}
        onUndo={() => patchLocal(id, ({ calib: _c, ...l }) => l)} />),
    5: withSidebar(
      <div className="min-w-0 flex-1"><div className="label">Stage 5</div><div className="font-serif text-lg leading-tight">The crossing and next horizon</div></div>,
      <HorizonScreen key={`${id}-${mine.crossing ? 'done' : 'open'}`} leader={leader} current={threshold} crossing={mine.crossing}
        onCross={(c) => patchLocal(id, (l) => ({ ...l, crossing: { ...c, crossed_on: new Date().toISOString().slice(0, 10) } }))}
        onReplay={() => patchLocal(id, ({ crossing: _x, ...l }) => l)} onNext={() => setStage(3)} />),
  }[stage];

  const details = {
    1: draft?.raw ? [`Raw from_state held verbatim (${draft.raw.length} characters).`, 'No dimension, steed or tension exists yet.'] : [],
    2: [
      `Primary threshold: ${threshold.title}`,
      `Dimensions (private): ${[...threshold.dimension.primary, ...threshold.dimension.secondary].map((d) => ctx.vocab.dimensions[d]?.name ?? d).join('; ')}`,
      `Stance (private): ${[...threshold.archetype.primary, ...threshold.archetype.secondary].map((a) => ctx.vocab.archetypes[a]?.name ?? a).join(' with ')}`,
      `Tensions bound: ${(threshold.tensions ?? []).length}. Confidence ${threshold.confidence.score}/5.`,
    ],
    3: [
      `Stance in play: ${threshold.archetype.primary.map((a) => ctx.vocab.archetypes[a]?.name).join(' with ')}`,
      tension ? `Probing the strongest tension (intensity ${tension.intensity}/5): ${tension.pull_a} against ${tension.pull_b}` : 'No active tension to probe.',
      `Rhythm: ${cadenceLabel(threshold.cadence)}.`,
    ],
    4: [`Confidence ${threshold.confidence.score}/5. Status: ${threshold.status.replace(/_/g, ' ')}. Rhythm: ${cadenceLabel(threshold.cadence)}.`, mine.calib ? 'A recalibration has been applied in this browser.' : 'No recalibration applied yet.'],
    5: [mine.crossing ? 'Crossed. The record is kept and the next threshold is primary.' : 'Not crossed yet.', `Thresholds on file: ${leader.thresholds.length}.`],
  }[stage];

  return (
    <div className="flex h-full flex-col">
      <JourneyNav stage={stage} setStage={setStage} leaders={leaders} leaderId={leader.leader_id} onLeader={switchLeader} showLeader={!(stage === 1 || (stage === 2 && draft?.raw && !draft?.confirmed))}
        coach={coach} setCoach={setCoach} onReset={reset} status={status} />
      <div className="min-h-0 flex-1">{screen}</div>
      <BehindScenes stage={stage} details={details} coach={coach} />
      {recap && <RecapModal recap={recap} onClose={() => setRecap(null)}
        onSave={(commitment) => {
          const date = new Date().toISOString().slice(0, 10);
          patchLocal(id, (l) => ({ ...l, extraLog: [...(l.extraLog ?? []), {
            entry_id: `log_local_${Date.now()}`, timestamp: date, leader_id: id, threshold_id: threshold.threshold_id, type: 'session',
            summary: recap.lines.join(' '), leader_state: 'Not recorded', commitments_made: commitment.trim() ? [commitment.trim()] : [], commitments_kept: [],
            agent_notes: [], source: { said: userMsgs.slice(0, 2), inferred: [] } }] }));
          setRecap(null);
        }} />}
      {intake && <IntakeModal leader={leader} base={base} overrides={ov}
        onClose={() => setIntake(false)}
        onSave={(o) => { setOverrides((x) => ({ ...x, [id]: o })); setIntake(false); }}
        onReset={() => { setOverrides((x) => { const { [id]: _, ...rest } = x; return rest; }); setIntake(false); }} />}
      {brief && <Modal title="What the agent is given" wide onClose={() => setBrief(null)}>
        <p className="mb-3 text-sm text-muted">This is the system brief built from the five layers for the next reply.</p>
        <pre className="thin-scroll max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel p-4 text-xs leading-relaxed">{brief}</pre>
      </Modal>}
    </div>
  );
}
