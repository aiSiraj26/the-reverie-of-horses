import { useState } from 'react';
import Modal from './Modal.jsx';

// Maps the four intake questions onto the primary threshold's fields.
const FIELDS = [
  { key: 'title', label: 'Where do you want to go?', hint: 'The crossing, in your own words.', rows: 1 },
  { key: 'from_state', label: 'Where are you now?', hint: 'Your current state.', rows: 2 },
  { key: 'to_state', label: 'Where will you be?', hint: 'Your target future state.', rows: 2 },
  { key: 'resistance', label: 'What pulls you back?', hint: 'Key resistances.', rows: 2 },
];

export default function IntakeModal({ leader, base, overrides, onSave, onReset, onClose }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, overrides[f.key] ?? base[f.key]])));
  const changed = FIELDS.some((f) => draft[f.key].trim() !== base[f.key]);
  return (
    <Modal title={`Context for ${leader.identity.preferred_name}`} onClose={onClose}>
      <p className="mb-5 text-sm text-muted">Shape the crossing before you begin. The agent reads these four answers on every reply. They stay in this browser and never overwrite the saved record.</p>
      <form onSubmit={(e) => { e.preventDefault(); onSave(Object.fromEntries(FIELDS.map((f) => [f.key, draft[f.key].trim()]).filter(([k, v]) => v && v !== base[k]))); }} className="space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="font-serif text-base">{f.label}</span> <span className="text-xs text-muted">{f.hint}</span>
            <textarea value={draft[f.key]} rows={f.rows} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              className="mt-1.5 w-full resize-none rounded-lg border border-line bg-panel px-3 py-2 text-base leading-relaxed sm:text-sm outline-none focus:border-gold" />
          </label>
        ))}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={onReset} className="text-xs text-muted hover:text-ink">Reset to saved record</button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
            <button type="submit" disabled={!changed && Object.keys(overrides).length === 0} className="rounded-lg bg-ink px-5 py-2 text-sm text-paper transition hover:opacity-90 disabled:opacity-30">Save to session</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
