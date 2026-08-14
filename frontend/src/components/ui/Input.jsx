export default function Input({ label, icon: Icon, id, className = '', containerClassName = '', ...rest }) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        )}
        <input
          id={id}
          className={`w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ${
            Icon ? 'pl-10' : ''
          } ${className}`}
          {...rest}
        />
      </div>
    </div>
  );
}
