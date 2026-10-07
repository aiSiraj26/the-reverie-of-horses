// Checks the five layer files against the rules in context-layer-spec.md.
// Usage: node context-layer/validate.mjs     (exit 1 if anything is wrong)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const vocab = load('vocab.json');
const L1 = load('1-identity.json').records, L2 = load('2-threshold.json').records, L3 = load('3-wiring.json').records,
      L4 = load('4-practice.json').records, L5 = load('5-relationship.json').records;

const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const TODAY = new Date('2026-10-05'); // pinned so the stale-refresh check is reproducible
const oneOf = (v, allowed, where) => allowed.includes(v) || err(`${where}: "${v}" not in [${allowed.join(', ')}]`);
const need = (rec, keys, where) => keys.forEach((k) => (rec[k] === undefined) && err(`${where}: missing "${k}"`));
const ids = (rs, k) => new Set(rs.map((r) => r[k]));
const dup = (rs, k, name) => { const s = new Set(); rs.forEach((r) => { s.has(r[k]) && err(`${name}: duplicate ${k} ${r[k]}`); s.add(r[k]); }); };
const hasSource = (r, where) => (r.source && (r.source.type || r.source.said)) || err(`${where}: missing source`);

const leaders = ids(L1, 'leader_id'), thresholds = ids(L2, 'threshold_id'), practices = ids(L4, 'practice_id');

L1.forEach((r) => { const w = `L1 ${r.leader_id}`;
  need(r, ['leader_id','name','preferred_name','role','span','org_context','industry','business_model','mandate','success_definition','stakeholders','background','constraints','language','source','refresh_date'], w);
  hasSource(r, w);
  if (r.source?.type === 'agent_inference') err(`${w}: identity must be leader-confirmed, not inferred`);
  const age = (TODAY - new Date(r.refresh_date)) / 864e5;
  if (age > 120) warn(`${w}: refresh_date ${r.refresh_date} is ${Math.round(age)} days old — due for refresh`);
});
dup(L1, 'leader_id', 'L1');

const statuses = ['not_started','on_the_crossing','crossed','stalled'];
const choice = (c, vocabKeys, where, label) => {
  if (!c || !Array.isArray(c.primary) || !Array.isArray(c.secondary)) return err(`${where}: ${label} must be {primary: [...], secondary: [...]}`);
  c.primary.length >= 1 || err(`${where}: ${label} needs at least one primary`);
  c.primary.length <= 2 || err(`${where}: ${label} has more than 2 primary (the agent would chase everything)`);
  c.secondary.length <= 3 || err(`${where}: ${label} has more than 3 secondary`);
  [...c.primary, ...c.secondary].forEach((x) => x in vocabKeys || err(`${where}: ${label} "${x}" not in vocab`));
  c.primary.filter((x) => c.secondary.includes(x)).forEach((x) => err(`${where}: ${label} "${x}" is both primary and secondary`));
};
const TENSION_STATES = ['active','easing','dormant','resolved'];
L2.forEach((r) => { const w = `L2 ${r.threshold_id}`;
  need(r, ['threshold_id','leader_id','is_primary','title','from_state','to_state','dimension','archetype','stance_notes','tensions','evidence','resistance','stakes','status','dates','confidence','source','cadence'], w);
  hasSource(r, w);
  leaders.has(r.leader_id) || err(`${w}: unknown leader ${r.leader_id}`);
  oneOf(r.status, statuses, w);
  choice(r.dimension, vocab.dimensions, w, 'dimension');
  choice(r.archetype, vocab.archetypes, w, 'archetype');
  const dimSet = new Set([...(r.dimension?.primary ?? []), ...(r.dimension?.secondary ?? [])]);
  const arcSet = new Set([...(r.archetype?.primary ?? []), ...(r.archetype?.secondary ?? [])]);
  (r.stance_notes && r.stance_notes.includes('Internal only')) || err(`${w}: stance_notes must say the stance is internal only`);
  (r.confidence?.score >= 1 && r.confidence.score <= 5 && r.confidence.reason) || err(`${w}: confidence needs score 1-5 and a reason`);
  if (r.status === 'crossed' && !r.dates?.crossed) err(`${w}: crossed but no dates.crossed`);
  if (r.status === 'crossed' && r.is_primary) err(`${w}: a crossed threshold cannot be primary`);
  // Tensions: each side must be something this threshold actually holds.
  (r.tensions ?? []).forEach((t) => { const tw = `${w} ${t.tension_id}`;
    need(t, ['tension_id','between','description','pull_a','pull_b','state','intensity','first_observed','source'], tw);
    hasSource(t, tw);
    oneOf(t.state, TENSION_STATES, tw);
    (t.intensity >= 1 && t.intensity <= 5) || err(`${tw}: intensity must be 1-5`);
    (t.between?.length === 2) || err(`${tw}: between needs exactly two sides`);
    (t.between ?? []).forEach((side) => {
      const ok = side.kind === 'dimension' ? dimSet.has(side.id) : side.kind === 'archetype' ? arcSet.has(side.id) : false;
      ok || err(`${tw}: ${side.kind} "${side.id}" is not held by this threshold`);
    });
  });
  // Affinity check: warn when a chosen steed has no link to any chosen dimension on the site.
  (r.archetype?.primary ?? []).forEach((a) => {
    const asp = vocab.archetypes[a]?.site_aspects ?? [];
    asp.some((d) => dimSet.has(d)) || warn(`${w}: stance "${a}" has no site link to this threshold's dimensions (site pairs it with: ${asp.join(', ') || 'none'})`);
  });
});
dup(L2, 'threshold_id', 'L2');
const tIds = L2.flatMap((r) => (r.tensions ?? []).map((t) => t.tension_id)); new Set(tIds).size === tIds.length || err('L2: duplicate tension_id');
leaders.forEach((id) => { const n = L2.filter((t) => t.leader_id === id && t.is_primary).length;
  n === 1 || err(`L2 ${id}: needs exactly one primary threshold, found ${n}`); });

L3.forEach((r) => { const w = `L3 ${r.wiring_id}`;
  need(r, ['wiring_id','leader_id','core_values','decision_style','risk_posture','drivers','avoidances','triggers','feedback_receptivity','motivators','energy_profile','identity_claims','shadow','source'], w);
  hasSource(r, w);
  leaders.has(r.leader_id) || err(`${w}: unknown leader ${r.leader_id}`);
  r.core_values.length <= 3 || err(`${w}: more than 3 core values`);
  oneOf(r.decision_style, ['analytical','intuitive','consensus_seeking','decisive_when_cornered'], w);
  oneOf(r.risk_posture, ['action','patience'], w);
  r.drivers.forEach((d) => oneOf(d, ['status','mastery','impact','security','freedom'], w));
  r.motivators.forEach((d) => oneOf(d, ['hard_challenge','peer_respect','visible_win','being_believed_in'], w));
  oneOf(r.feedback_receptivity?.form, ['direct_blunt','framed_as_own_insight'], w);
  (r.feedback_receptivity?.score >= 1 && r.feedback_receptivity.score <= 5) || err(`${w}: feedback score must be 1-5`);
  r.is_hypothesis === true || err(`${w}: wiring must be marked as a hypothesis`);
  r.source?.date || err(`${w}: wiring source needs a date`);
});
dup(L3, 'leader_id', 'L3 (one wiring record per leader)');
leaders.forEach((id) => L3.some((w) => w.leader_id === id) || err(`L3: no wiring for ${id}`));

L4.forEach((r) => { const w = `L4 ${r.practice_id}`;
  need(r, ['practice_id','threshold_id','name','rhythm','definition_of_done','tracking','last_completed','streak','friction','agent_role','status'], w);
  hasSource(r, w);
  thresholds.has(r.threshold_id) || err(`${w}: unknown threshold ${r.threshold_id}`);
  oneOf(r.rhythm, ['daily','weekly','per_session'], w);
  oneOf(r.tracking, ['self_report','artifact','agent_followup'], w);
  oneOf(r.agent_role, ['prompt','hold_silence','escalate_to_next_session'], w);
  oneOf(r.status, ['active','paused','retired'], w);
  r.streak.current <= r.streak.longest || err(`${w}: current streak exceeds longest`);
  const t = L2.find((x) => x.threshold_id === r.threshold_id);
  if (t?.status === 'crossed' && r.status === 'active') err(`${w}: active practice on a crossed threshold`);
});
dup(L4, 'practice_id', 'L4');

const types = ['session','check_in','breakthrough','slip','reframe'], entryIds = ids(L5, 'entry_id');
L5.forEach((r, i) => { const w = `L5 ${r.entry_id}`;
  need(r, ['entry_id','timestamp','leader_id','threshold_id','type','summary','leader_state','commitments_made','commitments_kept','agent_notes','source'], w);
  leaders.has(r.leader_id) || err(`${w}: unknown leader ${r.leader_id}`);
  r.threshold_id === null || thresholds.has(r.threshold_id) || err(`${w}: unknown threshold ${r.threshold_id}`);
  oneOf(r.type, types, w);
  (r.source?.said && r.source?.inferred) || err(`${w}: source must separate what was said from what was inferred`);
  r.agent_notes.forEach((n) => (n.date && n.note) || err(`${w}: every agent note needs a date`));
  r.commitments_kept.forEach((k) => {
    oneOf(k.outcome, ['kept','missed','pending'], w);
    if (k.resolved_in && !entryIds.has(k.resolved_in)) err(`${w}: resolved_in ${k.resolved_in} does not exist`);
    if (k.resolved_in && L5.find((e) => e.entry_id === k.resolved_in)?.timestamp < r.timestamp) err(`${w}: resolved before it was made`);
  });
  r.commitments_made.forEach((c) => { if (/^prc_/.test(c) && !practices.has(c)) err(`${w}: unknown practice ${c}`); });
});
dup(L5, 'entry_id', 'L5');
// Append-only: within each leader, entries must be in chronological order of file position.
leaders.forEach((id) => { const ts = L5.filter((e) => e.leader_id === id).map((e) => e.timestamp);
  ts.every((t, i) => i === 0 || t >= ts[i - 1]) || err(`L5 ${id}: entries not in chronological (append) order`); });

warnings.forEach((m) => console.warn('WARN ', m));
if (errors.length) { errors.forEach((m) => console.error('ERROR', m)); console.error(`\n${errors.length} problem(s).`); process.exit(1); }
console.log(`OK: ${L1.length} leaders, ${L2.length} thresholds, ${L3.length} wiring, ${L4.length} practices, ${L5.length} log entries.`);
