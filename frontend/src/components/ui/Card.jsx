export function Card({ children, className = '', hoverable = false }) {
  return (
    <div
      className={`bg-white border border-slate-200/70 rounded-2xl shadow-card ${
        hoverable ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-6 pt-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`font-display font-semibold text-ink-900 text-lg ${className}`}>
      {children}
    </h3>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}

export default Card;
