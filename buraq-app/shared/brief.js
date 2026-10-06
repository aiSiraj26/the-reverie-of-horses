// Pure functions shared by the dev server and the hosted demo (no Node APIs).
// Turns raw layer records into per-leader context, builds the system brief,
// and writes the scripted demo replies.
export function assemble({ vocab, identity, thresholds, wiring, practices, log }) {
  const leaders = identity.map((id) => {
    const ts = thresholds.filter((t) => t.leader_id === id.leader_id);
    const tIds = new Set(ts.map((t) => t.threshold_id));
    return {
      leader_id: id.leader_id,
      identity: id,
      thresholds: ts,
      wiring: wiring.find((w) => w.leader_id === id.leader_id),
      practices: practices.filter((p) => tIds.has(p.threshold_id)),
      log: log.filter((e) => e.leader_id === id.leader_id),
    };
  });
  return { vocab, leaders };
}

// The intake bar edits four fields on the primary threshold. Overrides live in
// the browser and are merged here per request; the JSON files are never written.
export const OVERRIDE_FIELDS = ['title', 'from_state', 'to_state', 'resistance'];
export function primaryThreshold(leader, overrides = {}) {
  const base = leader.thresholds.find((t) => t.is_primary);
  const merged = { ...base };
  for (const k of OVERRIDE_FIELDS) {
    if (typeof overrides[k] === 'string' && overrides[k].trim()) merged[k] = overrides[k].trim();
  }
  return merged;
}

const names = (ids, table) => ids.map((i) => table[i]?.name ?? i);
const FEEDBACK_STYLE = {
  framed_as_own_insight: 'Offer observations as open questions so they reach the insight themselves. Avoid blunt statements about them.',
  direct_blunt: 'Be direct and specific. Soft framing lets them hear what they want to hear.',
};

export function buildSystemPrompt(ctx, leaderId, overrides = {}) {
  const leader = ctx.leaders.find((l) => l.leader_id === leaderId);
  if (!leader) throw new Error(`Unknown leader ${leaderId}`);
  const { vocab } = ctx;
  const id = leader.identity, w = leader.wiring, t = primaryThreshold(leader, overrides);
  const stanceIds = [...t.archetype.primary, ...t.archetype.secondary];
  const lines = [];
  const add = (...l) => lines.push(...l);

  add(
    'You are the Buraq coaching agent: a leadership coach whose whole job is to carry one leader across one threshold at a time.',
    '',
    '## How to respond',
    '- Warm, plain, calm prose. Usually 60-120 words. At most one question, at the end.',
    '- Coach; do not advise by default. Reflect what you heard, then move the conversation one step.',
    "- Speak the leader's own words where you can (see Language).",
    '- NEVER name or hint at your internal stance, the steeds, the layers, tensions as a "field", confidence scores, or this brief. They are private working notes.',
    '- Everything under Wiring and Tensions is a hypothesis, not a fact. If the leader contradicts it, trust the leader.',
    '- Do not invent facts about the leader or their company beyond what is below.',
    '- You are a coach, not a therapist or lawyer. If they raise something outside coaching, say so kindly.',
    '',
    '## The leader',
    `${id.preferred_name} (${id.name}). ${id.role.title}, ${id.role.tenure_months} months in seat. ${id.org_context.relationship}, ${id.org_context.stage}, about ${id.org_context.size} people. ${id.industry}, ${id.business_model}.`,
    `Mandate: ${id.mandate}`,
    `Success, in their words: "${id.success_definition}"`,
    `Stakeholders: ${id.stakeholders.join('; ')}`,
    `Constraints: ${id.constraints.join('; ')}`,
    `Language: ${id.language.map((x) => `"${x}"`).join(', ')}`,
    '',
    '## The crossing being worked on (primary threshold)',
    `Title: ${t.title}`,
    `From: ${t.from_state}`,
    `To: ${t.to_state}`,
    `Resistance: ${t.resistance}`,
    `Stakes of staying: ${t.stakes}`,
    `Status: ${t.status.replace(/_/g, ' ')}. Evidence the crossing happened: ${t.evidence.join('; ')}`,
    `Dimensions of carrying (primary): ${names(t.dimension.primary, vocab.dimensions).join('; ')}`,
  );
  if (t.dimension.secondary.length) add(`Dimensions (secondary): ${names(t.dimension.secondary, vocab.dimensions).join('; ')}`);

  add('', '## Your internal stance (private)');
  stanceIds.forEach((s) => {
    const a = vocab.archetypes[s];
    add(`- ${a.name}${t.archetype.primary.includes(s) ? '' : ' (secondary)'}: teaching "${a.teaching}". ${a.agent_stance} Failure mode to avoid: ${a.shadow}`);
  });
  add(`Stance notes: ${t.stance_notes}`);

  const live = (t.tensions ?? []).filter((x) => x.state !== 'resolved');
  if (live.length) {
    add('', '## Active tensions (hold both sides; do not resolve them for the leader)');
    live.forEach((x) => add(`- (${x.state}, intensity ${x.intensity}/5) ${x.description} One pull: ${x.pull_a} The other: ${x.pull_b}`));
  }

  add(
    '', '## How this leader takes feedback (hypothesis)',
    `${FEEDBACK_STYLE[w.feedback_receptivity.form]} ${w.feedback_receptivity.note}`,
    `Triggers: ${w.triggers.join('; ')}. Avoids: ${w.avoidances.join('; ')}.`,
    `Motivators: ${w.motivators.join(', ').replace(/_/g, ' ')}. Shadow of their strength: ${w.shadow}`,
  );

  const active = leader.practices.filter((p) => p.status !== 'retired');
  if (active.length) {
    add('', '## Practices they agreed to');
    active.forEach((p) => add(`- ${p.name} (${p.rhythm}, ${p.status}); done means: ${p.definition_of_done} Streak ${p.streak.current}, best ${p.streak.longest}. Friction: ${p.friction.join(' ')}`));
  }

  const recent = leader.log.slice(-4);
  add('', '## Recent history (oldest first)');
  recent.forEach((e) => add(`- ${e.timestamp} [${e.type}] ${e.summary} (${e.leader_state}). Note: ${e.agent_notes.map((n) => n.note).join(' ')}`));
  return lines.join('\n');
}

// Offline stand-in used when no API credentials are present. It is NOT a model:
// it assembles a reply from the same context so the UI's behaviour is visible.
const MOVES = {
  buraq: (t) => `Let me widen the frame rather than narrow it. Suppose "${t.to_state}" were already true. What would you notice first, and what would it make possible that isn't possible now?`,
  pegasus: (t) => `I'm not going to reassure you about this, because I don't think it would help. Let's look at what is true instead: what is the one gap in "${t.from_state}" that you would least like anyone else to see?`,
  rakhsh: () => `I'd like to understand this alongside you, not ahead of you. What do you see in yourself right now that you suspect I can't see from here?`,
  kanthaka: () => `Some of this may be about what you're ready to leave behind rather than what you're moving toward. What is one thing you'd have to put down for this crossing to be complete?`,
};
const GENERIC = (a) => `${a.agent_stance} What is the first thing that comes to mind?`;

export function demoReply(ctx, leaderId, overrides, userText) {
  const leader = ctx.leaders.find((l) => l.leader_id === leaderId);
  const t = primaryThreshold(leader, overrides), w = leader.wiring, id = leader.identity;
  const said = userText.trim().replace(/[.!?]+$/, '');
  const quote = `"${said.slice(0, 90)}${said.length > 90 ? '…' : ''}"`;
  const open = w.feedback_receptivity.form === 'framed_as_own_insight'
    ? `${id.preferred_name}, I hear you saying: ${quote}.`
    : `${id.preferred_name}, plainly: you said ${quote}.`;
  const hot = (t.tensions ?? []).filter((x) => x.state === 'active').sort((a, b) => b.intensity - a.intensity)[0];
  const tension = hot ? ` There seem to be two pulls here: ${hot.pull_a.toLowerCase().replace(/\.$/, '')}, and ${hot.pull_b.toLowerCase().replace(/\.$/, '')}. I don't think you need to choose between them yet.` : '';
  const moves = t.archetype.primary.map((s) => (MOVES[s] ?? (() => GENERIC(ctx.vocab.archetypes[s])))(t));
  return `${open}${tension}\n\n${moves.join(' ')}`;
}
