# Buraq Agent — Context Layer (worked example)

Five JSON files, one per layer, implementing `context-layer-spec.md`, plus a vocabulary file and a validator. Everything here is **synthetic**: three invented leaders, no client data. Each file says so in its `_meta` block. Real leader records must never be committed to this repo, because the site's deploy step publishes everything except top-level `*.md` files.

| File | Layer | Records |
|---|---|---|
| `1-identity.json` | Identity | 3 (one per leader) |
| `2-threshold.json` | The Threshold | 4 (one per crossing) |
| `3-wiring.json` | Values and Wiring | 3 (one per leader) |
| `4-practice.json` | The Practice | 3 (one per commitment) |
| `5-relationship.json` | The Relationship | 10 (append-only log) |
| `vocab.json` | Dimensions, steeds (agent stances), tension pairs | 6 + 12 + 4 |
| `validate.mjs` | Checks the spec's rules. Run `node context-layer/validate.mjs` | |

## What changed in Layer 2

Layer 2 now lets a leader hold more than one dimension and more than one stance at once, and records the tensions between them.

```
"dimension": { "primary": ["mirror_work", "truth_seeking"], "secondary": ["humble_ignorance"] }
"archetype": { "primary": ["pegasus"],                      "secondary": [] }
"stance_notes": "How the agent behaves. Internal only: never name the stance to the leader."
"tensions": [ { tension_id, between: [side, side], description, pull_a, pull_b, state, intensity 1-5, first_observed, source } ]
```

- `primary` and `secondary` are always arrays. `primary` has 1 or 2 entries and `secondary` up to 3. The cap exists because the spec's own warning applies here too: an agent that holds everything chases everything.
- `archetype` is the agent's **internal stance**. It shapes voice and behavior and is never shown to the leader. The validator requires `stance_notes` to say so.
- A **tension** names two sides, each a dimension or an archetype that this threshold actually holds. `state` is `active`, `easing`, `dormant` or `resolved`. Tensions are never deleted, so the trajectory is kept.

## The three leaders

| Leader | Your brief | In the data |
|---|---|---|
| **Tariq Haddad** `ldr_001` | Active crossing: founder, bottleneck to architect. Dimension: Befriending the Unknown Future. Stance: Buraq. | `thr_001` is `on_the_crossing`, confidence 4, no tensions, one practice with a 3-week streak. |
| **Elena Voss** `ldr_002` | Stalled: hired CEO frozen by fear of board conflict. Dimensions: Mirror Work and Truth-Seeking. Stance: Pegasus. | `thr_002` is `stalled` and past its target date. One active tension (truth-seeking vs mirror work), intensity 4. Practice paused, streak broken (current 0, longest 2). Her identity record is 168 days old, so the validator warns it is due for refresh. |
| **Kofi Mensah** `ldr_003` | Dual state: letting go of old identity vs stepping into the dark. Dimensions: Looking into the Dark and Befriending the Future. Stances: Rakhsh with Kanthaka. | `thr_003` holds two primary dimensions and two primary stances, with **two active tensions**: Rakhsh vs Kanthaka (intensity 5) and Soul Direction vs Unknown Future (intensity 3). A second, inferred threshold `thr_004` sits behind it. |

Two additions beyond your brief, both so the data matches the site (explained below): Elena gets `humble_ignorance` and Kofi gets `mirror_work` as **secondary** dimensions.

## How a session reads and writes

Every record links by id: `leader_id` is the key, thresholds point to leaders, practices point to thresholds, and log entries point to a leader and (optionally) a threshold.

**Start of session: read**
1. **Layer 1** for the leader. If `refresh_date` is old, spend the first few minutes confirming it with them.
2. **Layer 2**: the record with `is_primary: true`. Read `status`, `confidence` and `resistance`, then the dimensions, the stance and `stance_notes`. Then read the `tensions`: an `active` one tells you the leader will pull two ways in the same session. Read `crossed` thresholds only as proof to quote back.
3. **Layer 3**: the leader's wiring. Treat it as a hypothesis and check its date. Use `feedback_receptivity.form` to choose *how* to say things.
4. **Layer 4**: practices on the primary threshold. Note streaks and `agent_role`.
5. **Layer 5**: the last few entries for this leader, plus any `commitments_kept` still `pending`.

**During the session**: speak in the leader's `language`. Use the stance for voice and behavior only, and never label the person with it.

**End of session: write**
- **Layer 5**: append one entry. Never edit an old one. Put what the leader said in `source.said` and what you concluded in `source.inferred`. Every agent note carries a date.
- **Layer 4**: update `last_completed` and `streak`. Add any new commitment with a source.
- **Layer 2**: change `status` only on evidence (`crossed` needs `dates.crossed`). Update each tension's `state` and `intensity` as you observe them. If the leader restates an inferred title in their own words, replace it and change the source type to `leader_words`.
- **Layer 3**: if the leader proves a read wrong, change it and update the source date.
- **Layer 1**: change only what the leader confirms.

Run the validator after any write. It exits 1 on unknown ids, values outside the vocabulary, a missing source, two primary thresholds for one leader, a dimension listed as both primary and secondary, a tension on something the threshold does not hold, more than three core values, or log entries out of order.

## Mapping the site's steeds and dimensions into Layer 2

Source: `index.html`, the Twelve Transformations table and the six aspects of *The Pioneer Soulmate*. In `vocab.json`, every steed carries the site's own partnership type, what-transforms and teaching, plus the aspects whose text actually cites it. The `agent_stance` and `shadow` lines are **my reading of the site's Teaching column and are marked `proposed`**. Please review them before the agent relies on them.

| Steed (stance) | Site teaching | Site aspects that cite it | Proposed stance in one line |
|---|---|---|---|
| Buraq | Receptivity as readiness | I, V | Expand scope; leap, don't ladder |
| Pegasus | Humility through refusal | VI | Decline to flatter; let the refusal teach |
| Sleipnir | Capability over affection | III, V | Go where the leader avoids |
| Uchchaiḥśravas | Principle over person | III | Hold the standard of the office |
| Kanthaka | Sacrifice as completion | II | Honor the severance |
| Tiānmǎ | Myth shapes reality | IV | Back the vision |
| Chollima | Worthiness as prerequisite | VI | Test readiness honestly |
| Tulpar | Combat as knowing | IV | Be alive in the struggle |
| Rakhsh | Knowing and being known | II | Mutual recognition |
| Enbarr | Finitude as mercy | I, V | Cross the threshold with them |
| The Caspian Mare | Courage wears no gender | none | Back valour against an assumed limit |
| The Kiso Steed | The carrier that bears her onward | none | Stay to the end |

Four proposed **tension pairs** are in `vocab.json` (for example Unknown Future vs Soul Direction, and Rakhsh vs Kanthaka). These are my suggestions, not the site's.

### Where your pairings don't match the site

The validator warns when a chosen stance has no link to any of the threshold's dimensions in the site's own text. Your three pairings produced two real mismatches:

1. **Pegasus with Mirror Work and Truth-Seeking.** The site cites Pegasus only under aspect VI (humility about ignorance). Your reading, "humility through refusal to flatter the ego", is a good one, but it is your reading. I made `humble_ignorance` a secondary dimension for Elena so the pairing is traceable to the site. Alternatively, the site could add Pegasus to Aspects II or III.
2. **Rakhsh and Kanthaka with Soul Direction and Unknown Future.** The site cites both steeds only under aspect II (Mirror Work). Kanthaka's severance is really about *letting go of an identity*, which is not one of the six. I made `mirror_work` a secondary dimension for Kofi so the pairing is traceable.
3. **Buraq with Unknown Future** is a clean match: the site cites Buraq under aspect I.

### Gaps in the site's six dimensions

- **No dimension for letting go.** Your leader 1 (bottleneck to architect), your leader 3 (releasing an old identity), and the spec's own example ("The carrying that hands over control") are all about *release*. None of the six aspects covers it. They fit loosely under Mirror Work, but this keeps recurring. It may deserve a seventh dimension.
- **The Caspian Mare and The Kiso Steed are not tied to any dimension.** They're valid stances, but the site gives the agent nothing to say when they fit.
- **Overlap.** Sleipnir appears in III and V; Buraq and Enbarr in I and V. A dimension alone cannot pick a stance, so the stance has to be chosen independently, which is how the data is built.
- **Vocabulary.** The site says "aspects"; the spec says "dimensions". Pick one.
- **Two lists of steeds.** `vocab.json` and `tests/fixtures.ts` both list the twelve (same ids). If the site adds a steed, both need updating.

## Calls I made where the spec was silent

Please confirm or overrule each.

1. **`is_primary`** is a new boolean on Layer 2. The spec says one threshold is primary but has nowhere to store it.
2. **Layer 5 `commitments_kept`** is "filled in later", but the log is append-only. I store `{commitment, outcome, resolved_in}`, where `resolved_in` points at the later entry that settled it. This is the one field written after the fact.
3. **`leader_id`** added to Layers 3 and 5 so they can be looked up per leader.
4. **Layer 3** carries `is_hypothesis: true` (validator requires it) and a dated source.
5. **Layer 1** may not have an inferred source. The validator rejects it.
6. **"Do not invent client data" vs "populate three leaders."** I made the leaders plainly fictional and marked every file synthetic. If you'd prefer role-only placeholders with no names, say so.
