// Vite dev-server plugin: serves /api/* from the same process, so one command
// (npm run dev) runs everything. Credentials stay on the server, never in the browser.
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from 'vite';
import { loadContext, buildSystemPrompt, demoReply } from './context.js';
import { prepareContext } from '../shared/journey.js';

const MODEL_DEFAULT = 'claude-opus-5-5';
const MAX_HISTORY = 20;

const readBody = (req) => new Promise((resolve, reject) => {
  let s = '';
  req.on('data', (c) => { s += c; if (s.length > 1e6) { reject(new Error('Body too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
  req.on('error', reject);
});
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

export default function buraqApi() {
  let env = {};
  return {
    name: 'buraq-api',
    configResolved(config) { env = { ...loadEnv(config.mode, config.root, ''), ...process.env }; },
    configureServer(server) {
      const live = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
      const model = env.BURAQ_MODEL || MODEL_DEFAULT;
      // The SDK reads ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN from the environment.
      if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
      const client = live ? new Anthropic() : null;

      server.middlewares.use('/api', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://x');
          if (req.method === 'GET' && url.pathname === '/status') return json(res, 200, { mode: live ? 'live' : 'demo', model: live ? model : null });
          if (req.method === 'GET' && url.pathname === '/context') return json(res, 200, loadContext());
          if (req.method === 'POST' && url.pathname === '/prompt') {
            const body = await readBody(req);
            return json(res, 200, { prompt: buildSystemPrompt(prepareContext(loadContext(), body), body.leader_id, body.overrides) });
          }
          if (req.method === 'POST' && url.pathname === '/chat') {
            const body = await readBody(req);
            const { leader_id, overrides, messages } = body;
            if (!Array.isArray(messages) || !messages.length || messages.at(-1).role !== 'user') return json(res, 400, { error: 'messages must end with a user message' });
            const history = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
            // Load the five layers fresh for this prompt and build the brief from them.
            const ctx = prepareContext(loadContext(), body);
            const system = buildSystemPrompt(ctx, leader_id, overrides);

            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
            const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
            try {
              if (!live) {
                const text = demoReply(ctx, leader_id, overrides, history.at(-1).content);
                for (const part of text.match(/\S+\s*/g)) { send({ text: part }); await new Promise((r) => setTimeout(r, 18)); }
              } else {
                const params = {
                  model, max_tokens: 1024, system, messages: history,
                  output_config: { effort: 'low' }, // short coaching turns; thinking stays adaptive
                };
                if (env.BURAQ_FALLBACK !== 'off') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
                const stream = client.beta.messages.stream(params);
                stream.on('text', (t) => send({ text: t }));
                const final = await stream.finalMessage();
                if (final.stop_reason === 'refusal') send({ notice: "I can't help with that one. Let's come back to the crossing." });
                if (final.stop_reason === 'max_tokens') send({ notice: 'Reply was cut short.' });
              }
              send({ done: true });
            } catch (err) {
              const msg = err instanceof Anthropic.AuthenticationError ? 'The API key was rejected.'
                : err instanceof Anthropic.RateLimitError ? 'Rate limited. Try again in a moment.'
                : err instanceof Anthropic.APIError ? `API error ${err.status}: ${err.message}`
                : `Server error: ${err.message}`;
              send({ error: msg });
            }
            return res.end();
          }
          json(res, 404, { error: 'Not found' });
        } catch (err) { json(res, 500, { error: err.message }); }
      });
      server.httpServer?.once('listening', () =>
        console.log(`\n  Buraq: ${live ? `live replies via ${model}` : 'DEMO mode (no ANTHROPIC_API_KEY). The UI works; replies are scripted from the context.'}\n`));
    },
  };
}
