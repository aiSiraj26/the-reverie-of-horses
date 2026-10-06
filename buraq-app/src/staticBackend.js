// Browser-only stand-in for /api/*, used by the hosted demo build (VITE_STATIC).
// Same context files and same brief builder as the dev server; replies are scripted.
import { assemble, buildSystemPrompt, demoReply } from '../shared/brief.js';
import vocab from '../../context-layer/vocab.json';
import identity from '../../context-layer/1-identity.json';
import thresholds from '../../context-layer/2-threshold.json';
import wiring from '../../context-layer/3-wiring.json';
import practices from '../../context-layer/4-practice.json';
import log from '../../context-layer/5-relationship.json';

export const ctx = assemble({
  vocab, identity: identity.records, thresholds: thresholds.records,
  wiring: wiring.records, practices: practices.records, log: log.records,
});
export const status = { mode: 'demo', hosted: true, model: null };
export const prompt = (leaderId, overrides) => buildSystemPrompt(ctx, leaderId, overrides);

export async function chat({ leader_id, overrides, messages }, { onText, signal }) {
  const text = demoReply(ctx, leader_id, overrides, messages.at(-1).content);
  for (const part of text.match(/\S+\s*/g)) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    onText(part);
    await new Promise((r) => setTimeout(r, 18));
  }
}
