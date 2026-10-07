// The leader-facing card: their own words only. No dimensions, steeds or scores.
export default function ThresholdCard({ title, from, to, resistance, stakes, practice, children }) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-6">
      <div className="label">Your crossing</div>
      <h2 className="mt-2 font-serif text-2xl leading-snug">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        <div><div className="label mb-1">From</div><p className="text-[0.95rem] leading-relaxed">{from}</p></div>
        <div className="text-gold sm:pt-5" aria-hidden="true"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></div>
        <div><div className="label mb-1">To</div><p className="text-[0.95rem] leading-relaxed">{to}</p></div>
      </div>
      {(resistance || stakes) && (
        <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
          {resistance && <div><dt className="label mb-1">What pulls you back</dt><dd className="leading-relaxed">{resistance}</dd></div>}
          {stakes && <div><dt className="label mb-1">What staying costs</dt><dd className="leading-relaxed">{stakes}</dd></div>}
        </dl>
      )}
      {practice && <div className="mt-5 border-t border-line pt-4 text-sm"><div className="label mb-1">First practice</div><p className="leading-relaxed">{practice}</p></div>}
      {children}
    </article>
  );
}
