import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Sin resultados', description, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 px-6 text-center ${className}`}>
      <div className="rounded-full bg-slate-100 p-3.5">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="font-display text-base font-semibold text-ink-900">{title}</p>
      {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
    </div>
  );
}
