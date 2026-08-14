import { X } from 'lucide-react';

export default function Modal({ open = true, onClose, title, children, className = '' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            {title && <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
