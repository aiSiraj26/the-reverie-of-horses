import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContext, buildSystemPrompt, demoReply, primaryThreshold } from './context.js';

const ctx = loadContext();

test('loads the three leaders with all five layers', () => {
  assert.equal(ctx.leaders.length, 3);
  for (const l of ctx.leaders) {
    assert.ok(l.identity && l.wiring && l.thresholds.length && l.practices.length && l.log.length, l.leader_id);
    assert.equal(l.thresholds.filter((t) => t.is_primary).length, 1);
  }
});

test('prompt carries each leader\'s stance and threshold', () => {
  const p = (id) => buildSystemPrompt(ctx, id);
  assert.match(p('ldr_001'), /Buraq/); assert.match(p('ldr_001'), /Stop being the bottleneck/);
  assert.match(p('ldr_002'), /Pegasus/); assert.match(p('ldr_002'), /Do not flatter/i);
  assert.match(p('ldr_003'), /Rakhsh/); assert.match(p('ldr_003'), /Kanthaka/);
  assert.match(p('ldr_003'), /Active tensions/);
  assert.doesNotMatch(p('ldr_001'), /Active tensions/);
});

test('prompt tells the model to keep the stance private', () => {
  assert.match(buildSystemPrompt(ctx, 'ldr_002'), /NEVER name or hint at your internal stance/);
});

test('intake overrides replace the four editable fields only', () => {
  const l = ctx.leaders[0];
  const t = primaryThreshold(l, { to_state: 'A new target', resistance: '  ', bogus: 'x' });
  assert.equal(t.to_state, 'A new target');
  assert.equal(t.resistance, l.thresholds[0].resistance); // blank ignored
  assert.equal(t.bogus, undefined);
  assert.match(buildSystemPrompt(ctx, 'ldr_001', { to_state: 'A new target' }), /To: A new target/);
});

test('unknown leader fails loudly', () => assert.throws(() => buildSystemPrompt(ctx, 'nope'), /Unknown leader/));

test('demo replies differ by leader and never name the stance', () => {
  const r = ctx.leaders.map((l) => demoReply(ctx, l.leader_id, {}, 'I do not know where to start'));
  assert.equal(new Set(r).size, 3);
  r.forEach((x) => assert.doesNotMatch(x, /Buraq|Pegasus|Rakhsh|Kanthaka|stance/i));
  assert.match(r[2], /two pulls/); // Kofi has an active tension
  assert.doesNotMatch(r[0], /two pulls/); // Tariq has none
});
