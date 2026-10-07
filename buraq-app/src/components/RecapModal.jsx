import { useState } from 'react';
import Modal from './Modal.jsx';

// End of a Stage 3 session: a two-line recap and one commitment before the next meeting.
export default function RecapModal({ recap, onSave, onClose }) {
  const [commitment, setCommitment] = useState('');
  return (
    <Modal title="Before you go" onClose={onClose}>
      <ul className="flex flex-col gap-2 font-serif text-lg leading-relaxed">{recap.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <label className="mt-6 block text-sm">
        <span className="text-muted">One thing you will do before we meet again</span>
        <input value={commitment} onChange={(e) => setCommitment(e.target.value)} placeholder="Hand one decision to my team"
          className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base outline-none focus:border-gold" />
      </label>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-ink">Not yet</button>
        <button onClick={() => onSave(commitment)} className="rounded-full bg-ink px-5 py-2 text-sm text-paper">Save to the log</button>
      </div>
    </Modal>
  );
}
