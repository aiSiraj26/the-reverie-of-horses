import { useState } from 'react';
import { STAGE_COPY } from '../stageCopy.js';

// Coach view: a floating panel that says which layers the current screen touches.
export default function BehindScenes({ stage, details = [], coach }) {
  const [open, setOpen] = useState(true);
  if (!coach) return null;
  const copy = STAGE_COPY[stage];
  return (
    <aside aria-label="Behind the scenes" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end p-3 sm:p-5">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gold/50 bg-paper shadow-xl">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span><span className="label block text-gold">Coach view</span><span className="font-serif text-base">Behind the scenes</span></span>
          <span aria-hidden="true" className="text-muted">{open ? '–' : '+'}</span>
        </button>
        {open && (
          <div className="thin-scroll max-h-[46vh] overflow-y-auto border-t border-line px-4 pb-4 pt-3 text-sm">
            <p className="label mb-2">{copy.eyebrow}</p>
            <dl className="flex flex-col gap-2.5">
              {copy.behind.map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold text-gold">{k}</dt><dd className="text-ink/80">{v}</dd></div>
              ))}
            </dl>
            {details.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="label mb-2">Right now</p>
                <ul className="flex flex-col gap-1.5 text-ink/80">{details.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
