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

## The five screens

One screen per stage of the leader journey (`docs/user-journey.md`). The stage navigator at the top moves between them, and **Coach view** adds a panel saying which layers each screen touches.

| Stage | Screen | What the leader does |
|---|---|---|
| 1. Entry and First Naming | A quiet room with one question | Says what is on their mind. The agent reflects it back without advice. The raw words are held as the starting point. |
| 2. Threshold Crystallization | Six questions, one at a time, then a threshold card | Names the crossing, where they are, where they will be, what pulls back, what staying costs, and one small practice. |
| 3. On the Crossing | The chat, with the pinned banner | Opens with last time's practice (Did it / Partly / Not this time), talks, then ends with a two-line recap and one commitment. |
| 4. Evidence and Recalibration | Evidence, recalibration, practices, the log | Records shifts and slips in their own words. Sees the agent's proposed change to confidence and rhythm, and applies or undoes it. |
| 5. The Crossing and Next Horizon | Crossing, retrospective, next horizon | Marks the crossing, writes what carried them, then picks or writes the next crossing. |

To walk the whole journey as a new leader: press **Reset**, then follow stages 1 and 2. You become a fourth leader, and stages 3 to 5 then work for you. The three example leaders show how the same screens adapt: Tomo reads as moving, Elena as stalling, and Kofi as steady with two active tensions.

Everything the screens change is saved in this browser only. The JSON layer files are never written. Two parts are simple stand-ins: stage 1's replies are scripted even with a key, and stage 2's silent binding of dimensions and steed is a keyword guess.

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
- `npm test` checks the context loading, prompt building and the journey logic (17 tests). The live API path was verified against a mock server, not the real API, since no key was available when this was built.
