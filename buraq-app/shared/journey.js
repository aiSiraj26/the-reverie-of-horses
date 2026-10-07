// Pure logic behind the five journey screens. No Node or browser APIs, so the dev
// server, the hosted demo and the tests all share it. Everything the screens change
// lives in a small "local" object per leader (see applyLocal); the JSON layer files
// are never written.

export const STAGES = [
  { n: 1, id: 'entry', name: 'Entry and First Naming', short: 'Arrive' },
  { n: 2, id: 'intake', name: 'Threshold Crystallization', short: 'Name it' },
  { n: 3, id: 'crossing', name: 'On the Crossing', short: 'Cross' },
  { n: 4, id: 'evidence', name: 'Evidence and Recalibration', short: 'Evidence' },
  { n: 5, id: 'horizon', name: 'The Crossing and Next Horizon', short: 'Horizon' },
];

export const cadenceLabel = (c = '') =>
  ({ every_two_weeks: 'Every two weeks', monthly_until_restarted: 'Monthly until restarted', monthly: 'Monthly' })[c]
  ?? (c.startsWith('revisit_after_') ? 'After the current crossing' : c.replace(/_/g, ' '));

const isoDay = (d) => d.toISOString().slice(0, 10);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);
const trimEnd = (s) => s.trim().replace(/[.!?]+$/, '');

// ---------- Stage 1: listening ----------
const FOLLOWUPS = [
  'What part of that feels loudest right now?',
  'If you stayed with that a moment longer, what else is there?',
  'Who else is caught up in this with you?',
];
// Reflects the leader's words back. It does not diagnose, label or advise.
export function listenReply(text, name = '', turn = 0) {
  const thanks = name ? `${name}, thank you` : 'Thank you';
  if (turn > 0) return `${thanks}. I'm holding that alongside what you said first. There is no rush. Whenever you're ready, we can put a name to the crossing you want to make.`;
  const q = FOLLOWUPS[[...text].reduce((a, c) => a + c.charCodeAt(0), 0) % FOLLOWUPS.length];
  return `${thanks} for saying it plainly. I'm hearing: “${clip(trimEnd(text), 110)}”. I won't try to fix anything yet. ${q}`;
}

// ---------- Stage 2: silent binding ----------
const DIM_WORDS = {
  unknown_future: /\b(future|unknown|next|new|grow|scale|vision|architect|leap|change|transition|bigger|expand)\b/g,
  mirror_work: /\b(myself|identity|who i am|self-image|becoming|become|role|reflect|see me)\b/g,
  truth_seeking: /\b(truth|honest|hard thing|conversation|conflict|board|avoid|admit|face|tell|say)\b/g,
  thriving_in_chaos: /\b(chaos|pressure|crisis|overwhelm|firefight|uncertain|stress|fires?)\b/g,
  soul_direction: /\b(purpose|meaning|calling|legacy|lost|why|soul|dark|matters)\b/g,
  humble_ignorance: /\b(don't know|do not know|not sure|learn|beginner|unsure|humble)\b/g,
};
const STEED_FOR = {
  unknown_future: 'buraq', mirror_work: 'rakhsh', truth_seeking: 'sleipnir',
  thriving_in_chaos: 'tulpar', soul_direction: 'enbarr', humble_ignorance: 'pegasus',
};

// A first read, from words alone. Everything it returns is the agent's inference and is
// labelled as such; the leader never sees dimension or steed names.
export function bindThreshold(draft, vocab, today = new Date()) {
  const text = [draft.title, draft.from_state, draft.to_state, draft.resistance, draft.stakes].join(' ').toLowerCase();
  const ranked = Object.entries(DIM_WORDS)
    .map(([id, re]) => [id, (text.match(re) ?? []).length])
    .sort((a, b) => b[1] - a[1]);
  const top = ranked[0][1] > 0 ? ranked[0][0] : 'unknown_future';
  const rest = ranked.filter(([id, n]) => id !== top && n > 0).slice(0, 2).map(([id]) => id);
  const steeds = [...new Set([STEED_FOR[top], ...rest.map((d) => STEED_FOR[d])])];
  const name = draft.name || 'the leader';
  const when = isoDay(today);
  const inferred = { type: 'agent_inference', date: when, note: 'First read from the intake answers. Dimension, steed and tensions are the agent\'s inference.' };
  const tensions = rest.length && draft.to_state && draft.resistance
    ? [{
      tension_id: `ten_${when.replace(/-/g, '')}`,
      between: [{ kind: 'dimension', id: top }, { kind: 'dimension', id: rest[0] }],
      description: `Moving toward the new state pulls against what holds ${name} back.`,
      pull_a: `Move toward: ${trimEnd(draft.to_state)}.`,
      pull_b: `Stay with: ${trimEnd(draft.resistance)}.`,
      state: 'active', intensity: 3, first_observed: when, source: inferred,
    }]
    : [];
  return {
    dimension: { primary: [top], secondary: rest },
    archetype: { primary: [steeds[0]], secondary: steeds.slice(1) },
    stance_notes: `${vocab.archetypes[steeds[0]].agent_stance} Internal only: never name the stance to ${name}.`,
    tensions,
    confidence: { score: 2, reason: 'A first read from one intake conversation, not yet confirmed.' },
  };
}

// Builds a complete five-layer bundle for a brand-new leader from the intake answers.
export function newLeaderBundle(draft, vocab, today = new Date()) {
  const when = isoDay(today);
  const bound = bindThreshold(draft, vocab, today);
  const said = { type: 'leader_words', date: when, note: 'Entered by the leader during intake.' };
  const name = draft.name?.trim() || 'You';
  const days = (n) => isoDay(new Date(today.getTime() + n * 864e5));
  const threshold = {
    threshold_id: 'thr_local_1', leader_id: 'local_you', is_primary: true,
    title: trimEnd(draft.title), from_state: draft.from_state.trim(), to_state: draft.to_state.trim(),
    ...bound,
    evidence: [draft.practice_done?.trim() || 'A first observable sign, agreed with the leader.'],
    resistance: draft.resistance.trim(), stakes: draft.stakes.trim(),
    status: 'on_the_crossing', dates: { named: when, target_cross: days(90), crossed: null },
    source: { ...said, note: 'Title and states are the leader\'s words. Dimension, steed and tensions are the agent\'s inference.' },
    cadence: 'every_two_weeks',
  };
  return {
    leader_id: 'local_you',
    identity: {
      leader_id: 'local_you', name, preferred_name: name,
      role: { title: '', tenure_months: 0 }, span: {}, org_context: { stage: '', size: 0, relationship: '' },
      industry: '', business_model: '', mandate: '', success_definition: trimEnd(draft.to_state),
      stakeholders: [], background: [], constraints: [], language: [], source: said, refresh_date: when,
    },
    thresholds: [threshold],
    wiring: null, // nothing observed yet; the agent asks instead of assuming
    practices: [{
      practice_id: 'prc_local_1', threshold_id: 'thr_local_1', name: draft.practice_name.trim(),
      rhythm: draft.practice_rhythm || 'weekly', definition_of_done: draft.practice_done.trim(),
      tracking: 'self_report', last_completed: null, streak: { current: 0, longest: 0 },
      friction: [], agent_role: 'prompt', status: 'active', source: said,
    }],
    log: [{
      entry_id: 'log_local_1', timestamp: when, leader_id: 'local_you', threshold_id: 'thr_local_1', type: 'session',
      summary: `First naming: "${clip(draft.raw.trim(), 120)}"`, leader_state: 'Not yet observed',
      commitments_made: [draft.practice_name.trim()], commitments_kept: [], agent_notes: [],
      source: { said: [clip(draft.raw.trim(), 200)], inferred: ['Threshold dimensions and steed.'] },
    }],
  };
}

// ---------- Stage 4: recalibration (proposed rules, not in the spec) ----------
const daysBetween = (a, b) => Math.floor((b - new Date(a)) / 864e5);

export function recalibrate(leader, threshold, today = new Date()) {
  const log = leader.log.filter((e) => !e.threshold_id || e.threshold_id === threshold.threshold_id);
  const outcomes = log.flatMap((e) => (e.commitments_kept ?? []).map((k) => k.outcome));
  const kept = outcomes.filter((o) => o === 'kept').length;
  const missed = outcomes.filter((o) => o === 'missed').length;
  const slips = log.filter((e) => e.type === 'slip').length;
  const breakthroughs = log.filter((e) => e.type === 'breakthrough').length;
  const streaks = leader.practices.filter((p) => p.threshold_id === threshold.threshold_id && p.status === 'active' && p.streak.current >= 3).length;
  const wins = kept + breakthroughs + streaks;
  const misses = missed + slips;
  const target = threshold.dates?.target_cross;
  const targetPassed = Boolean(target) && new Date(target) < today && threshold.status !== 'crossed';
  const lastEntry = log.at(-1)?.timestamp;
  const quiet = lastEntry ? daysBetween(lastEntry, today) : null;

  const signals = [];
  if (kept) signals.push({ tone: 'up', text: `${kept} commitment${kept > 1 ? 's' : ''} kept` });
  if (breakthroughs) signals.push({ tone: 'up', text: `${breakthroughs} breakthrough${breakthroughs > 1 ? 's' : ''} logged` });
  if (streaks) signals.push({ tone: 'up', text: `${streaks} practice streak${streaks > 1 ? 's' : ''} of three or more` });
  if (missed) signals.push({ tone: 'down', text: `${missed} commitment${missed > 1 ? 's' : ''} missed` });
  if (slips) signals.push({ tone: 'down', text: `${slips} slip${slips > 1 ? 's' : ''} (logged without judgment)` });
  if (targetPassed) signals.push({ tone: 'down', text: `Target date ${target} has passed` });
  if (quiet !== null && quiet > 30) signals.push({ tone: 'down', text: `${quiet} days since the last entry` });

  const c = threshold.confidence.score;
  let tone = 'steady';
  if (threshold.status === 'stalled' || targetPassed || misses > wins + 1) tone = 'stalling';
  else if (wins >= 2 && wins > misses) tone = 'progressing';

  const suggestion = {
    progressing: { status: 'on_the_crossing', cadence: threshold.cadence, confidence: { score: Math.min(5, c + 1), reason: `Evidence is accumulating: ${wins} signs of movement against ${misses} misses.` },
      note: 'Keep the rhythm. Name what is working so the leader can see it.' },
    steady: { status: threshold.status, cadence: threshold.cadence, confidence: { score: c, reason: threshold.confidence.reason },
      note: 'No change yet. Keep listening for evidence in the leader\'s own words.' },
    stalling: { status: 'stalled', cadence: 'monthly_until_restarted', confidence: { score: Math.max(1, c > 2 ? c - 1 : c), reason: 'Movement has stopped. The ask is probably too big, not the leader unwilling.' },
      note: 'Lighten the rhythm and shrink the ask: one sentence in place of the whole conversation.' },
  }[tone];
  return { tone, signals, wins, misses, targetPassed, suggestion: { ...suggestion, threshold_id: threshold.threshold_id } };
}

// ---------- applying local changes ----------
const patchThreshold = (leader, id, fn) => ({ ...leader, thresholds: leader.thresholds.map((t) => (t.threshold_id === id ? fn(t) : t)) });

export function applyCalibration(leader, calib) {
  return patchThreshold(leader, calib.threshold_id, (t) => ({
    ...t, status: calib.status, cadence: calib.cadence, confidence: calib.confidence,
  }));
}

export function applyCrossing(leader, crossing, vocab, today = new Date()) {
  const when = crossing.crossed_on ?? isoDay(today);
  const crossed = leader.thresholds.find((t) => t.threshold_id === crossing.threshold_id);
  let l = patchThreshold(leader, crossing.threshold_id, (t) => ({
    ...t, status: 'crossed', is_primary: false, dates: { ...t.dates, crossed: when },
    tensions: (t.tensions ?? []).map((x) => ({ ...x, state: 'resolved' })),
  }));
  l = { ...l, practices: l.practices.map((p) => (p.threshold_id === crossing.threshold_id ? { ...p, status: 'retired' } : p)) };
  const next = crossing.next;
  if (next?.kind === 'existing') {
    l = patchThreshold(l, next.id, (t) => ({
      ...t, is_primary: true, status: 'on_the_crossing', title: next.title?.trim() || t.title,
      source: { type: 'leader_words', date: when, note: 'Restated by the leader when choosing the next horizon.' },
    }));
  } else if (next?.kind === 'new') {
    const bound = newLeaderBundle({
      name: leader.identity.preferred_name, title: next.title, from_state: crossed.to_state, to_state: next.to_state,
      resistance: next.resistance || '', stakes: next.stakes || '', // not named yet, so no tension is invented
      practice_name: 'First step', practice_done: 'To be agreed.', raw: next.title,
    }, vocab, today).thresholds[0];
    l = { ...l, thresholds: [...l.thresholds, { ...bound, threshold_id: `thr_next_${when.replace(/-/g, '')}`, leader_id: leader.leader_id }] };
  }
  const r = crossing.retrospective ?? {};
  return {
    ...l,
    log: [...l.log, {
      entry_id: `log_cross_${when}`, timestamp: when, leader_id: leader.leader_id, threshold_id: crossing.threshold_id, type: 'breakthrough',
      summary: `Crossed: "${clip(crossed.title, 80)}". Retrospective: ${clip(r.carried || 'not yet written', 100)}`,
      leader_state: 'Reflective', commitments_made: [], commitments_kept: [], agent_notes: [],
      source: { said: [r.carried, r.tell_yourself].filter(Boolean), inferred: [] },
    }],
  };
}

// local = { extraLog, evidence, calib, crossing } for one leader.
export function applyLocal(leader, local = {}, vocab, today = new Date()) {
  let l = leader;
  if (local.extraLog?.length) l = { ...l, log: [...l.log, ...local.extraLog] };
  if (local.evidence?.length) {
    l = { ...l, thresholds: l.thresholds.map((t) => ({ ...t, observed: [...(t.observed ?? []), ...local.evidence.filter((e) => e.threshold_id === t.threshold_id)] })) };
  }
  if (local.calib) l = applyCalibration(l, local.calib);
  if (local.crossing) l = applyCrossing(l, local.crossing, vocab, today);
  return l;
}

// A scripted two-line recap of a session for the leader.
export function recapLines(leader, threshold, userMessages, commitment) {
  const first = userMessages[0] ? `You brought: “${clip(trimEnd(userMessages[0]), 100)}”.` : 'You took a quiet moment with the crossing.';
  const tension = (threshold.tensions ?? []).find((t) => t.state === 'active');
  const second = tension ? `You stayed with two pulls: ${trimEnd(tension.pull_a).toLowerCase()}, and ${trimEnd(tension.pull_b).toLowerCase()}.` : `You stayed close to: ${trimEnd(threshold.title)}.`;
  return { lines: [first, second], commitment: commitment?.trim() || '' };
}

// ---------- request preparation (server and hosted demo share this) ----------
export function isLeaderBundle(x) {
  return Boolean(x && typeof x.identity?.preferred_name === 'string' && typeof x.identity.success_definition === 'string'
    && Array.isArray(x.thresholds) && x.thresholds.some((t) => t.is_primary)
    && Array.isArray(x.practices) && Array.isArray(x.log));
}

// Takes the layers loaded from disk and the browser's local changes, and returns the
// context the brief is built from. A leader created in the browser ('local_...') has no
// files, so the browser sends the whole bundle.
export function prepareContext(ctx, { leader_id, leader, local } = {}, today = new Date()) {
  let leaders = ctx.leaders;
  if (String(leader_id).startsWith('local_')) {
    if (!isLeaderBundle(leader)) throw new Error('The new leader\'s record is incomplete.');
    leaders = [leader];
  }
  return { vocab: ctx.vocab, leaders: leaders.map((l) => (l.leader_id === leader_id ? applyLocal(l, local ?? {}, ctx.vocab, today) : l)) };
}
