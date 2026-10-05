# Buraq Agent — Context Layer (worked example)

Five JSON files, one per layer, implementing `context-layer-spec.md`. Everything in here is **synthetic**: three invented leaders, no client data. Each file says so in its `_meta` block. Real leader records must never be committed to this repo, because the site's deploy step publishes everything except `*.md`.

| File | Layer | Records | Shape |
|---|---|---|---|
| `1-identity.json` | Identity | 3 | one per leader |
| `2-threshold.json` | The Threshold | 5 | one per crossing |
| `3-wiring.json` | Values and Wiring | 3 | one per leader |
| `4-practice.json` | The Practice | 5 | one per commitment |
| `5-relationship.json` | The Relationship | 11 | append-only log |
| `vocab.json` | Allowed `dimension` and `archetype` values | 6 + 12 | taken from the site |
| `validate.mjs` | Checks the rules in the spec | | `node context-layer/validate.mjs` |

## The three example leaders

| Leader | What it shows |
|---|---|
| **Maya Okafor**, COO (`ldr_001`) | **In progress.** Primary threshold `on_the_crossing`, an active practice, a paused practice after a slip, and a secondary threshold the agent inferred but Maya has not confirmed. |
| **Dan Reyes**, founder-CEO (`ldr_002`) | **Stalled.** Primary threshold `stalled` and past its target date, practice paused with a broken streak (longest 3, current 0), a run of slips, and a `reframe` entry trying a smaller ask. His Layer 1 record is 146 days old, so the validator warns that it is due for refresh. |
| **Priya Raman**, VP Product (`ldr_003`) | **Crossed, then a new one.** `thr_004` is `crossed` and kept as history, with its practice `retired`. A new primary `thr_005` is `not_started`. Her wiring record shows a revision after the agent's read turned out wrong. |

## How a session reads and writes

Every record links back by id: `leader_id` is the key, thresholds point to leaders, practices point to thresholds, and log entries point to a leader and (optionally) a threshold.

**Start of session (read, in this order)**
1. Layer 1 for the leader. If `refresh_date` is old, spend the first two minutes confirming it with them.
2. Layer 2: the one record with `is_primary: true`. Read `status`, `confidence` and `resistance`. Read crossed thresholds only as proof to quote back.
3. Layer 3: the leader's wiring. Treat it as a hypothesis. Check the `source.date`, and use `feedback_receptivity.form` to choose *how* to say things.
4. Layer 4: active practices on the primary threshold. Note streaks and `agent_role` (prompt, hold silence, or escalate).
5. Layer 5: the last few entries for this leader, plus any `commitments_kept` still `pending`.

**During the session**: Speak in the leader's `language`. Use the threshold's `archetype` for voice only, never as a label for the person.

**End of session (write)**
- **Layer 5**: append one entry. Never edit an old one. Put what the leader said in `source.said` and what you concluded in `source.inferred`. Every agent note carries a date.
- **Layer 4**: update `last_completed` and `streak` for any practice that was done or missed. Agree new practices and add them with a source.
- **Layer 2**: change `status` only on evidence (e.g. `crossed` needs `dates.crossed`). If the leader restates the crossing in their own words, replace an inferred title and change the source type to `leader_words`.
- **Layer 3**: if the leader proves a read wrong, change the value, add a dated entry to `revisions`, and update the source date.
- **Layer 1**: only change what the leader confirms.

Run `node context-layer/validate.mjs` after any write. It fails (exit 1) on unknown ids, values outside the allowed lists, a missing source, two primary thresholds for one leader, more than three core values, or log entries out of order.

## Where I had to make a call on the spec

The spec is clear almost everywhere. These are the places where it was silent or contradicted itself. Please confirm or overrule each one.

1. **No field for "primary".** The rules say only one threshold is primary, but no field holds that. I added `is_primary` (boolean). The validator enforces exactly one per leader.
2. **Layer 5 is append-only, yet `commitments_kept` is "filled in later".** I made it a list of `{commitment, outcome, resolved_in}` where `outcome` is `kept`, `missed` or `pending`, and `resolved_in` points at the later entry that settled it. Strictly, that makes `commitments_kept` the one field written after the fact. If you want a pure append-only log, we'd move outcomes into the later entry instead.
3. **Link fields added.** Layer 3 and Layer 5 gain `leader_id` so they can be queried per leader. Layer 4 links through `threshold_id`, as the spec says.
4. **Layer 3 "every entry is a hypothesis".** I added `is_hypothesis: true` (validator requires it) and an optional `revisions` list, so a corrected read leaves a trail instead of being overwritten.
5. **Layer 1 "never inferred".** Validator rejects an inferred source on Layer 1. Layer 2 can be inferred, but then the source says so (see `thr_002`).
6. **Spec example vs. the vocabulary.** See below.
7. **"Do not invent client data" vs. "populate three example leaders".** I resolved this by making the leaders plainly fictional and labelling every file synthetic. If you'd rather have no named people at all, say so and I'll use role-only placeholders.

## Review: do the site's steeds and dimensions fit Layer 2?

Layer 2 asks for a `dimension` (one of "six carrying dimensions") and an `archetype` ("the steed that fits"). I read the site's page (`index.html`): the twelve exhibits, the "Twelve Transformations" table, and the six aspects of *The Pioneer Soulmate*.

### Which steeds each of the six aspects actually draws on

| Dimension (site aspect) | Steeds the site's text uses | Clean fit? |
|---|---|---|
| I. Befriending the Unknown Future | Buraq, Enbarr | Yes |
| II. Mirror Work and the Recognition of Becoming | Rakhsh, Kanthaka | Yes |
| III. Truth-Seeking and the Embrace of Difficult Dimensions | Sleipnir, Uchchaiḥśravas | Yes |
| IV. Thriving in Chaos and Finding Beauty in Difficulty | Tulpar, Tiānmǎ | Yes |
| V. Looking into the Dark and Sensing Soul Direction | Sleipnir, Buraq, Enbarr | Partly (overlaps) |
| VI. Diving into the Deep and Discovering the Beginning of Ignorance | Pegasus, Chollima | Yes |

### Where it does not fit

1. **Two steeds map to no dimension.** The Caspian Mare (Gordāfarīd) and The Kiso Steed (Tomoe Gozen) are never cited in any of the six aspects. They're valid `archetype` values (they're in the twelve), but a threshold can't be steered to them through a dimension. The agent has nothing in the site's own text to say *when* they fit. Suggestion: decide which aspect each belongs to and add a line on the site, or accept that they are archetypes without a home dimension.
2. **The spec's own example dimension doesn't exist.** Layer 2's example says `dimension: The carrying that hands over control`. None of the six aspects is about handing over control. The closest are II (Mirror Work: seeing someone's becoming) and VI (humility about who should carry). I mapped Maya's "stop being the bottleneck" to `mirror_work`, with archetype Buraq, but that's a judgment call, not a clean fit. If "handing over control" is a theme you coach often, it may deserve its own seventh dimension.
3. **Three of the six dimensions overlap.** Sleipnir appears in both III (Truth-Seeking) and V (Soul Direction). Buraq and Enbarr appear in both I and V. So the agent can't pick a steed from a dimension alone. Decide whether `archetype` is chosen independently or constrained by the dimension. (The validator currently allows any steed with any dimension.)
4. **The site calls them "aspects" and "dimensions".** The spec uses "dimension" and "six dimensions of carrying". The site mostly says "aspect" and uses "dimensions" only inside one aspect's title ("Difficult Dimensions"). Pick one word before it reaches users.
5. **Steed ids are stored in two places.** `vocab.json` and `tests/fixtures.ts` both list the twelve steeds. Today they match (same ids). If the site adds a steed, both need updating. A test asserting they agree would prevent drift; I haven't added one because you asked for data and a review, not site changes.

### Archetype fit by "Partnership Type"

For the archetype field to be useful, a steed should suggest a *kind of crossing*. The site's table already gives that, so use it as guidance:

| Steed | Partnership type | Fits a crossing about... |
|---|---|---|
| Buraq | Grace | a leap in scope, being carried further than you'd go alone |
| Pegasus | Conditional teaching | ambition checked by refusal (used for Dan's stall) |
| Sleipnir | Instrumental | going where others won't |
| Uchchaiḥśravas | Perpetual principle | holding the office, not the person |
| Kanthaka | Severance | letting go as completion (used for Priya's succession) |
| Tiānmǎ | Obsessional myth | a vision that reshapes reality |
| Chollima | Refusal | readiness as a prerequisite |
| Tulpar | Struggle | proving yourself in difficulty (used for Priya's board crossing) |
| Rakhsh | Mutual recognition | being truly seen (used for Maya's CEO conversation) |
| Enbarr | Threshold | accepting finitude |
| The Caspian Mare | Valour | acting against an assumed limit |
| The Kiso Steed | Devotion | loyalty carried to the end |

Every row has a clear crossing, so the archetype field itself works. The weak link is the dimension-to-steed route, not the steeds.
