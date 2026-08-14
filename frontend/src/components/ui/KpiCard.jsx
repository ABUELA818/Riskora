export default function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
  className = '',
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    low: 'bg-risk-low-bg text-risk-low-fg',
    medium: 'bg-risk-medium-bg text-risk-medium-fg',
    high: 'bg-risk-high-bg text-risk-high-fg',
    ink: 'bg-ink-900/5 text-ink-900',
  };

  return (
    <div
      className={`bg-white border border-slate-200/70 rounded-2xl shadow-card p-5 flex items-start justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="font-display text-3xl font-bold text-ink-900 leading-tight text-balance">
          {value}
        </span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {Icon && (
        <div className={`shrink-0 rounded-xl p-2.5 ${tones[tone] || tones.brand}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
