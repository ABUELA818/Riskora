import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="hidden lg:flex lg:w-1/2 bg-ink-950 relative flex-col justify-center px-16 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center mb-8">
            <div className="w-11 h-11 bg-brand-500 rounded-xl flex items-center justify-center mr-3">
              <ShieldCheck className="h-6 w-6 text-ink-950" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Riskora</h1>
          </div>
          <h2 className="font-display text-3xl font-semibold mb-6 leading-tight text-balance">
            Transformando datos en éxito académico
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Plataforma de análisis predictivo diseñada para instituciones educativas de excelencia. Toma decisiones informadas con el poder de la inteligencia artificial.
          </p>
          <div className="mt-10 h-px w-16 bg-brand-500" />
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-canvas">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
