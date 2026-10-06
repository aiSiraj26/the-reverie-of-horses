# Buraq — threshold coaching UI

A calm chat interface for the Buraq coaching agent. It reads the five-layer context in `../context-layer/` and uses it to steer every reply.

## Run it (one command)

From the repo root:

```bash
cd buraq-app && npm install && npm run dev
```

The first run takes about a minute (it downloads the packages). Your browser opens at <http://127.0.0.1:5173>. You need Node 20 or newer (`node -v` to check).

It starts in **Demo mode**: the whole interface works, and replies are scripted from the context so you can see the dynamics without an API key.

## Turn on live replies

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Or put `ANTHROPIC_API_KEY=sk-ant-...` in a file called `buraq-app/.env` (git ignores it). The key stays on the server; the browser never sees it. The badge in the top bar changes from **Demo mode** to **Live**.

Optional settings in the same `.env`:

| Setting | Default | What it does |
|---|---|---|
| `BURAQ_MODEL` | `claude-opus-5-5` | Which Claude model answers |
| `BURAQ_FALLBACK` | on | Set to `off` to disable the server-side refusal fallback |

## What you are looking at

- **Left sidebar**: the active leader, their current threshold (from → to), their active tensions (dots show intensity), and the agent's internal stance, collapsed and hidden by default. Open *Agent stance* to reveal it, or *Inspect full brief* to read exactly what the model is given.
- **Top banner**: the primary threshold being worked on, with its status.
- **Edit context**: four questions (where do you want to go, where are you now, where will you be, what pulls you back). They overwrite the primary threshold's `title`, `from_state`, `to_state` and `resistance` for the session. They are stored in your browser only and never change the JSON files.
- **Leader switch**: Tomo (active crossing), Elena (stalled), Kofi (two tensions at once). Each keeps its own conversation.

Try this: in Demo mode, send "I do not know where to start" as each leader.
- Tomo gets a question that widens the frame (Buraq).
- Elena gets a refusal to reassure her (Pegasus).
- Kofi gets both of his pulls named back to him (Rakhsh with Kanthaka).

## How a reply is built

1. You send a message. The browser posts it, the leader id and your intake edits to `/api/chat`.
2. The server re-reads the five JSON files in `context-layer/` (so JSON edits show up without a restart).
3. `server/context.js` assembles the brief: identity, the primary threshold with your edits, dimensions, the **stance** (the steed's stance from `vocab.json` plus the record's `stance_notes`), live tensions, how this leader takes feedback, practices, and the last four log entries.
4. The brief goes to Claude as the system prompt. It tells the model never to name its stance and to treat wiring as hypothesis.
5. The reply streams back word by word.

Nothing is written back to Layer 5 yet. The conversation lives in your browser.

## Files

```
buraq-app/
  server/context.js         loads the layers, builds the brief, offline demo replies
  server/plugin.js          /api/context, /api/status, /api/prompt, /api/chat (streaming)
  server/context.test.js    npm test
  src/App.jsx               state: leader, intake overrides, chats
  src/components/           Sidebar, Chat, IntakeModal, Modal
```

## Good to know

- This is a local dev tool, not a deployed site. The CI deploy skips `buraq-app/`.
- The example leaders are synthetic. Do not put real client data in `context-layer/`: it is committed to a public repo.
- `npm test` checks the context loading and prompt building (6 tests). The live API path was verified against a mock server, not the real API, since no key was available when this was built.
