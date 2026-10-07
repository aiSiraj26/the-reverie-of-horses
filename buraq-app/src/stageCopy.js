// What the coach view explains at each stage. Mirrors docs/user-journey.md in short form.
export const STAGE_COPY = {
  1: {
    eyebrow: 'Stage 1 · Entry and First Naming',
    behind: [
      ['Layer 1', 'An identity record opens. Only what the leader says is stored, stamped as their own words.'],
      ['Layer 2', 'A draft threshold holds the raw from_state, exactly as written. No dimension or steed is bound yet.'],
      ['Layer 5', 'The first session entry is appended. What they said is kept apart from anything the agent inferred.'],
      ['Agent', 'No stance yet. It reflects their words back and does not diagnose, label or advise.'],
    ],
  },
  2: {
    eyebrow: 'Stage 2 · Threshold Crystallization',
    behind: [
      ['Layer 2', 'The threshold is completed in the leader\'s own words: title, from, to, resistance, stakes. It becomes the one primary threshold.'],
      ['Silent binding', 'The agent proposes dimensions, a steed stance and any tension. All of it is stamped as the agent\'s inference. The leader never sees these names.'],
      ['Layer 3', 'Left empty. Nothing about how they take feedback has been observed yet, so the agent asks instead of assuming.'],
      ['Layer 4', 'A first practice is agreed, with a definition of done anyone could check.'],
      ['Checks', 'Exactly one primary threshold. Every record carries a source.'],
    ],
  },
  3: {
    eyebrow: 'Stage 3 · On the Crossing',
    behind: [
      ['Session load', 'Each reply re-reads Layers 1 to 5: identity, the primary threshold with its tensions, wiring, practices and recent history.'],
      ['Stance', 'The steed shapes behaviour, not vocabulary. The brief forbids naming it, the steeds or the layers.'],
      ['Tensions', 'The agent works the strongest active tension and holds both pulls. It never resolves one for the leader.'],
      ['Writes', 'Ending the session appends a Layer 5 entry with the commitment. Practice streaks update.'],
    ],
  },
  4: {
    eyebrow: 'Stage 4 · Evidence and Recalibration',
    behind: [
      ['Layer 5', 'Wins, slips and reframes are appended as they happen. Slips are logged without judgment.'],
      ['Layer 2', 'Confidence, cadence and status are re-rated with a reason. Only the leader moves target dates.'],
      ['Layer 3', 'A read proven wrong is changed and logged as a dated revision.'],
      ['Rules', 'The recalibration rules on this screen are proposals, not part of the spec. Treat them as a starting point to tune.'],
    ],
  },
  5: {
    eyebrow: 'Stage 5 · The Crossing and Next Horizon',
    behind: [
      ['Layer 2', 'The threshold becomes crossed with a date and is never deleted. It stays as proof. Its tensions are marked resolved.'],
      ['Unlock', 'A secondary threshold is promoted to primary. If the agent had inferred it, the leader\'s restated title replaces it.'],
      ['Layer 4', 'Practices tied to the crossed threshold are retired.'],
      ['Layer 5', 'A breakthrough entry stores the retrospective.'],
    ],
  },
};
