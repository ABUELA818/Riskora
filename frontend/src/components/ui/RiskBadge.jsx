const STYLES = {
  Alto: 'bg-risk-high-bg text-risk-high-fg border-risk-high-border',
  Medio: 'bg-risk-medium-bg text-risk-medium-fg border-risk-medium-border',
  Bajo: 'bg-risk-low-bg text-risk-low-fg border-risk-low-border',
};

const FALLBACK = 'bg-slate-100 text-slate-600 border-slate-200';

export default function RiskBadge({ nivel, className = '' }) {
  const style = STYLES[nivel] || FALLBACK;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {nivel || 'Sin calcular'}
    </span>
  );
}
