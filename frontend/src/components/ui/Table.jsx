export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 shadow-card bg-white">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-ink-950 text-white">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-brand-50/40 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-5 py-3.5 text-ink-900 ${className}`}>{children}</td>;
}
