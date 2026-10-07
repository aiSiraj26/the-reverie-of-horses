import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={`rise relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-paper p-7 shadow-xl outline-none thin-scroll ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
