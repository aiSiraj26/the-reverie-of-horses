// Loads the five context layers from ../context-layer for the dev server.
// Files are re-read on every call, so edits to the JSON show up without a restart.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assemble } from '../shared/brief.js';

export { buildSystemPrompt, demoReply, primaryThreshold, OVERRIDE_FIELDS } from '../shared/brief.js';

const LAYER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'context-layer');
const read = (f) => JSON.parse(readFileSync(join(LAYER_DIR, f), 'utf8'));

export function loadContext() {
  return assemble({
    vocab: read('vocab.json'),
    identity: read('1-identity.json').records,
    thresholds: read('2-threshold.json').records,
    wiring: read('3-wiring.json').records,
    practices: read('4-practice.json').records,
    log: read('5-relationship.json').records,
  });
}
