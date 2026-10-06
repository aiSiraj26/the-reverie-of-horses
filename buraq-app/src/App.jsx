import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar, { StatusChip } from './components/Sidebar.jsx';
import Chat from './components/Chat.jsx';
import IntakeModal from './components/IntakeModal.jsx';
import Modal from './components/Modal.jsx';
import { getJSON, streamChat } from './api.js';
import { load, save } from './storage.js';

const OVERRIDE_KEYS = ['title', 'from_state', 'to_state', 'resistance'];

export default function App() {
  const [ctx, setCtx] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [leaderId, setLeaderId] = useState(() => load('buraq.leader', null));
  const [overrides, setOverrides] = useState(() => load('buraq.overrides', {}));
  const [chats, setChats] = useState(() => load('buraq.chats', {}));
  const [busy, setBusy] = useState(false);
  const [intake, setIntake] = useState(false);
  const [brief, setBrief] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [showStance, setShowStance] = useState(false);
  const abort = useRef(null);

  useEffect(() => {
    Promise.all([getJSON('/api/context'), getJSON('/api/status')])
      .then(([c, s]) => { setCtx(c); setStatus(s); setLeaderId((id) => (c.leaders.some((l) => l.leader_id === id) ? id : c.leaders[0].leader_id)); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => { leaderId && save('buraq.leader', leaderId); }, [leaderId]);
  useEffect(() => save('buraq.overrides', overrides), [overrides]);
  useEffect(() => { if (!busy) save('buraq.chats', chats); }, [chats, busy]);

  const leader = ctx?.leaders.find((l) => l.leader_id === leaderId);
  const base = leader?.thresholds.find((t) => t.is_primary);
  const ov = overrides[leaderId] ?? {};
  const threshold = useMemo(() => (base ? { ...base, ...Object.fromEntries(OVERRIDE_KEYS.filter((k) => ov[k]).map((k) => [k, ov[k]])) } : null), [base, ov]);
  const messages = chats[leaderId] ?? [];

  const switchLeader = (id) => { abort.current?.abort(); setBusy(false); setLeaderId(id); setDrawer(false); };

  const send = useCallback(async (content) => {
    const history = [...(chats[leaderId] ?? []), { role: 'user', content }];
    const id = leaderId;
    const write = (fn) => setChats((c) => ({ ...c, [id]: fn(c[id] ?? []) }));
    write(() => [...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    abort.current = new AbortController();
    const patch = (p) => write((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, ...p } : x)));
    try {
      let acc = '';
      await streamChat(
        { leader_id: id, overrides: ov, messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) },
        { signal: abort.current.signal, onText: (t) => { acc += t; patch({ content: acc }); }, onNotice: (n) => patch({ notice: n }) },
      );
    } catch (e) {
      if (e.name !== 'AbortError') patch({ error: true, content: e.message });
    } finally { setBusy(false); }
  }, [chats, leaderId, ov]);

  const inspect = async () => {
    const r = await fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leader_id: leaderId, overrides: ov }) });
    setBrief((await r.json()).prompt);
  };

  if (error) return <div className="grid h-full place-items-center p-8 text-center"><div><p className="font-serif text-xl">The context layer could not be loaded.</p><p className="mt-2 text-sm text-muted">{error}</p><p className="mt-4 text-xs text-muted">Run from <code>buraq-app/</code> with <code>npm run dev</code>.</p></div></div>;
  if (!ctx || !leader || !threshold) return <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>;

  const starters = ['Where do I even start with this?', 'What is really in the way?', `Help me think about "${leader.identity.language[0]}".`];
  const sidebar = <Sidebar ctx={ctx} leader={leader} threshold={threshold} onSwitch={switchLeader} onEdit={() => { setIntake(true); setDrawer(false); }} onInspect={inspect} showStance={showStance} setShowStance={setShowStance} />;

  return (
    <div className="flex h-full">
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
          <div className="min-w-0 flex-1">
            <div className="label">Working on</div>
            <div className="truncate font-serif text-lg leading-tight">{threshold.title}</div>
          </div>
          {messages.length > 0 && <button onClick={() => { abort.current?.abort(); setBusy(false); setChats((c) => ({ ...c, [leaderId]: [] })); }} className="text-xs text-muted hover:text-ink">New conversation</button>}
          <StatusChip status={threshold.status} />
          <span title={status?.mode === 'live' ? `Live replies via ${status.model}` : 'No ANTHROPIC_API_KEY set: replies are scripted from the context so you can see the UI work.'}
            className={`hidden rounded-full border px-2.5 py-0.5 text-[0.7rem] sm:inline-block ${status?.mode === 'live' ? 'border-gold/40 text-gold' : 'border-line text-muted'}`}>
            {status?.mode === 'live' ? 'Live' : 'Demo mode'}
          </span>
        </div>
        <Chat leader={leader} threshold={threshold} messages={messages} busy={busy} onSend={send} starters={starters} />
      </main>
      {intake && <IntakeModal leader={leader} base={base} overrides={ov}
        onClose={() => setIntake(false)}
        onSave={(o) => { setOverrides((x) => ({ ...x, [leaderId]: o })); setIntake(false); }}
        onReset={() => { setOverrides((x) => { const { [leaderId]: _, ...rest } = x; return rest; }); setIntake(false); }} />}
      {brief && <Modal title="What the agent is given" wide onClose={() => setBrief(null)}>
        <p className="mb-3 text-sm text-muted">This is the system brief built from the five layers for the next reply.</p>
        <pre className="thin-scroll max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel p-4 text-xs leading-relaxed">{brief}</pre>
      </Modal>}
    </div>
  );
}
