const VARIANTS = {
  primary:
    'bg-brand-500 text-ink-950 hover:bg-brand-600 focus-visible:ring-brand-500/50 shadow-sm',
  secondary:
    'bg-white text-ink-900 border border-slate-200 hover:bg-slate-50 focus-visible:ring-brand-500/40',
  danger:
    'bg-risk-high text-white hover:bg-risk-high-fg focus-visible:ring-risk-high/40',
  ghost:
    'bg-transparent text-ink-900 hover:bg-slate-100 focus-visible:ring-brand-500/40',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
