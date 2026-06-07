# skills.md — Engineering Standards for Future Code

This file captures the working agreements for code generated in this project
(and a good default for any project). It exists because real brittleness
shipped here — a deploy step that silently dropped files, two `<img>`
dimension attributes that didn't match their files, and large blocks of
copy-pasted HTML. Every rule below traces back to a concrete failure.

The throughline: **state each fact once, and add a guard that fails loudly
when two things that should agree don't.**

---

## 1. Single Source of Truth (SSOT)

- A value, path, dimension, or list should be defined in exactly one place.
  Everything else derives from it.
- **Smell:** the same filename, number, or list appears in two files. If
  they can drift, they eventually will.
- **Instead of** enumerating files in a deploy script, copy by convention
  and exclude. **Instead of** hand-typing image dimensions, read them from
  the file. **Instead of** pasting a markup block N times, drive it from
  a data array + one template.
- When duplication is genuinely unavoidable, add a test that asserts the
  copies stay equal.

## 2. Fail Loudly, Never Silently

- Prefer a hard error over a silent wrong result. A missing file should
  break the build, not 404 in production.
- Every build/deploy step that assembles output gets a post-condition check
  (e.g. `test -f _site/index.html`). A pipeline that "succeeds" while
  producing broken output is worse than one that fails.
- No empty `catch`/`except` that swallows errors. Catch the specific error
  you can handle; let the rest surface.
- Validate inputs and external data at the boundary; reject early with a
  clear message.

## 3. Derive, Don't Hardcode

- Magic values (paths, sizes, URLs, counts, dates) are named constants or,
  better, computed from a source.
- Image `width`/`height`, file lists, version numbers, and dimensions should
  be generated from the artifact they describe — not transcribed by hand
  (transcription is how 2 of 17 image dims here ended up wrong).
- Config that varies by environment lives in config/env, never inline in
  logic.

## 4. Verify Against Reality Before Claiming Done

- "It should work" is not verification. Run it: render the page, hit the
  endpoint, execute the test, diff declared-vs-actual.
- When the real environment is unavailable (e.g. a blocked network),
  say so explicitly and state what was checked statically instead — don't
  imply full verification.
- Re-read a file before editing if anything may have changed it since you
  last saw it. Confirm the post-state matches intent.

## 5. Don't Repeat Structure — Template It

- More than ~2-3 near-identical blocks → extract a component/partial/loop
  driven by data.
- A change to a repeated pattern must be a one-line change, not an N-place
  find-and-replace. If it isn't, the structure is wrong.
- Keep content as data (JSON/YAML/array) separate from presentation
  (template). You can't typo-duplicate a data row the way you can a
  copy-pasted block.

## 6. Naming & Readability

- Names say what a thing *is*, not how it's built: `nightPages`, not
  `arr2`. Match the surrounding code's existing conventions exactly.
- Group related constants; comment the *why*, not the *what*.
- Consistent casing and structure across files of the same kind.

## 7. Security & Least Privilege (defaults, not afterthoughts)

- No untrusted input into a sink (HTML, SQL, shell, `eval`). Escape/parameterize.
- Grant the minimum permission that works (CI tokens, CSP directives, API
  scopes). Don't pre-open access "for later" — add it when actually needed.
  (We had analytics origins allowlisted in the CSP that the site never used;
  they were pure attack surface.)
- Treat external content (PR comments, fetched data, user input) as
  potentially adversarial.

## 8. Keep Changes Reviewable & Reversible

- Small, focused commits with messages that explain *why*. One concern per
  commit/PR.
- Never weaken a check to make something pass; fix the cause.
- Prefer changes that are easy to revert; call out anything hard to undo
  before doing it.

---

### Pre-ship checklist
- [ ] Is every fact stated once? (no drift-prone duplication)
- [ ] Does it fail loudly if an input/file is missing?
- [ ] Are magic values derived or named, not transcribed?
- [ ] Did I actually run/render/test it — and report honestly what I checked?
- [ ] Are repeated structures templated from data?
- [ ] Least privilege; no untrusted input into a sink?
- [ ] Small, well-described, reversible commit?
