import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContext, buildSystemPrompt } from './context.js';
import {
  listenReply, bindThreshold, newLeaderBundle, recalibrate, applyCalibration, applyCrossing, applyLocal,
  prepareContext, isLeaderBundle, recapLines, cadenceLabel,
} from '../shared/journey.js';

const ctx = loadContext();
const TODAY = new Date('2026-10-07');
const draft = {
  name: 'Sam', raw: 'I keep avoiding the hard conversation with my board.', title: 'Tell the board the truth.',
  from_state: 'I avoid the conflict.', to_state: 'I say it plainly and hear their answer.',
  resistance: 'I am afraid of losing control.', stakes: 'The plan fails in public.',
  practice_name: 'Write three sentences', practice_rhythm: 'weekly', practice_done: 'The draft is saved.',
};
const primary = (l) => l.thresholds.find((t) => t.is_primary);

test('listening reflects the words and does not diagnose or advise', () => {
  const r = listenReply('I feel stuck in my role.', 'Sam');
  assert.match(r, /I feel stuck in my role/);
  assert.match(r, /won't try to fix anything yet/);
  assert.doesNotMatch(r, /you should|you need to|the problem is|diagnos/i);
  assert.match(listenReply('more', 'Sam', 1), /no rush/);
});

test('binding proposes dimensions and a steed, all marked as inference', () => {
  const b = bindThreshold(draft, ctx.vocab, TODAY);
  assert.equal(b.dimension.primary[0], 'truth_seeking');
  assert.ok(b.archetype.primary[0] in ctx.vocab.archetypes);
  assert.match(b.stance_notes, /Internal only/);
  assert.ok(b.confidence.score <= 2);
  b.tensions.forEach((t) => assert.equal(t.source.type, 'agent_inference'));
  const plain = bindThreshold({ ...draft, title: 'x', from_state: 'y', to_state: 'z', resistance: '', stakes: '' }, ctx.vocab, TODAY);
  assert.deepEqual(plain.dimension.primary, ['unknown_future']); // the default when nothing matches
});

test('a new leader bundle is complete and the brief builds without gaps', () => {
  const bundle = newLeaderBundle(draft, ctx.vocab, TODAY);
  assert.ok(isLeaderBundle(bundle));
  assert.equal(bundle.thresholds.filter((t) => t.is_primary).length, 1);
  const prompt = buildSystemPrompt({ vocab: ctx.vocab, leaders: [bundle] }, 'local_you');
  assert.doesNotMatch(prompt, /undefined|NaN|null/);
  assert.match(prompt, /ask rather than assume/);
  assert.match(prompt, /Not yet observed/);
  assert.match(prompt, /Tell the board the truth/);
});

test('recalibration reads each example leader as expected', () => {
  const tone = (id) => { const l = ctx.leaders.find((x) => x.leader_id === id); return recalibrate(l, primary(l), TODAY).tone; };
  assert.equal(tone('ldr_001'), 'progressing');
  assert.equal(tone('ldr_002'), 'stalling');
  assert.equal(tone('ldr_003'), 'steady');
  const elena = ctx.leaders[1];
  const s = recalibrate(elena, primary(elena), TODAY).suggestion;
  assert.equal(s.cadence, 'monthly_until_restarted');
  assert.equal(s.status, 'stalled');
  assert.ok(s.confidence.score >= 1);
  const tomo = ctx.leaders[0];
  assert.equal(recalibrate(tomo, primary(tomo), TODAY).suggestion.confidence.score, primary(tomo).confidence.score + 1);
});

test('applying a calibration changes only that threshold', () => {
  const kofi = ctx.leaders[2];
  const out = applyCalibration(kofi, { threshold_id: 'thr_003', status: 'stalled', cadence: 'monthly_until_restarted', confidence: { score: 1, reason: 'x' } });
  assert.equal(out.thresholds.find((t) => t.threshold_id === 'thr_003').status, 'stalled');
  assert.equal(out.thresholds.find((t) => t.threshold_id === 'thr_004').status, 'not_started');
});

test('crossing keeps exactly one primary, keeps history and retires practices', () => {
  const kofi = ctx.leaders[2];
  const crossing = { threshold_id: 'thr_003', retrospective: { carried: 'My partners.', tell_yourself: 'Start sooner.' }, next: { kind: 'existing', id: 'thr_004', title: 'Tell my partners the date.' } };
  const out = applyCrossing(kofi, crossing, ctx.vocab, TODAY);
  const crossed = out.thresholds.find((t) => t.threshold_id === 'thr_003');
  assert.equal(crossed.status, 'crossed'); assert.equal(crossed.dates.crossed, '2026-10-07'); assert.equal(crossed.is_primary, false);
  assert.ok(crossed.tensions.every((t) => t.state === 'resolved'));
  assert.equal(out.thresholds.filter((t) => t.is_primary).length, 1);
  assert.equal(primary(out).threshold_id, 'thr_004'); assert.equal(primary(out).title, 'Tell my partners the date.');
  assert.ok(out.practices.filter((p) => p.threshold_id === 'thr_003').every((p) => p.status === 'retired'));
  assert.equal(out.log.at(-1).type, 'breakthrough');
  assert.equal(out.thresholds.length, kofi.thresholds.length); // nothing deleted

  const tomo = ctx.leaders[0];
  const out2 = applyCrossing(tomo, { threshold_id: 'thr_001', next: { kind: 'new', title: 'Raise the Series B.', to_state: 'We close the round.' } }, ctx.vocab, TODAY);
  assert.equal(out2.thresholds.length, 2);
  assert.equal(out2.thresholds.filter((t) => t.is_primary).length, 1);
  assert.equal(primary(out2).from_state, tomo.thresholds[0].to_state); // the next crossing starts where the last one ended
});

test('prepareContext applies local changes server-side and rejects broken local leaders', () => {
  const bundle = newLeaderBundle(draft, ctx.vocab, TODAY);
  const prepared = prepareContext(ctx, { leader_id: 'local_you', leader: bundle, local: {} }, TODAY);
  assert.equal(prepared.leaders.length, 1);
  assert.throws(() => prepareContext(ctx, { leader_id: 'local_you', leader: { identity: {} } }), /incomplete/);
  const withEvidence = prepareContext(ctx, { leader_id: 'ldr_001', local: { evidence: [{ threshold_id: 'thr_001', text: 'Handed off the hiring plan', date: '2026-10-06' }] } }, TODAY);
  assert.match(buildSystemPrompt(withEvidence, 'ldr_001'), /Observed so far: Handed off the hiring plan/);
  assert.equal(ctx.leaders[0].thresholds[0].observed, undefined); // the files' data is not mutated
});

test('recap and cadence labels read well', () => {
  const l = ctx.leaders[2];
  const r = recapLines(l, primary(l), ['I keep going back to the firm.'], ' Walk twice ');
  assert.equal(r.lines.length, 2); assert.equal(r.commitment, 'Walk twice');
  assert.match(r.lines[1], /two pulls/);
  assert.equal(cadenceLabel('every_two_weeks'), 'Every two weeks');
  assert.equal(cadenceLabel('revisit_after_thr_003'), 'After the current crossing');
});

test('local state of a leader never changes the loaded context objects', () => {
  const before = JSON.stringify(ctx.leaders[1]);
  applyLocal(ctx.leaders[1], { calib: { threshold_id: 'thr_002', status: 'on_the_crossing', cadence: 'every_two_weeks', confidence: { score: 5, reason: 'x' } } }, ctx.vocab, TODAY);
  assert.equal(JSON.stringify(ctx.leaders[1]), before);
});

test('first replies are capitalised with or without a name', () => {
  assert.match(listenReply('hello', ''), /^Thank you/);
  assert.match(listenReply('hello', 'Sam'), /^Sam, thank you/);
  assert.match(listenReply('hello', '', 1), /^Thank you/);
});

test('a next crossing never invents a tension or a resistance', () => {
  const out = applyCrossing(ctx.leaders[0], { threshold_id: 'thr_001', next: { kind: 'new', title: 'Raise the round.', to_state: 'We close.' } }, ctx.vocab, TODAY);
  const next = primary(out);
  assert.deepEqual(next.tensions, []);
  assert.equal(next.resistance, '');
  const prompt = buildSystemPrompt({ vocab: ctx.vocab, leaders: [out] }, 'ldr_001');
  assert.doesNotMatch(prompt, /Not yet named/);
  assert.match(prompt, /not named yet; ask what pulls them back/);
});
