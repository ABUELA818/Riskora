import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Panel Izquierdo (Marca) */}
      <div className="hidden lg:flex lg:w-1/2 bg-eduPurple flex-col justify-center px-16 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <GraduationCap className="h-10 w-10 mr-3" />
            <h1 className="text-4xl font-bold tracking-tight">EduPredict AI</h1>
          </div>
          <h2 className="text-3xl font-semibold mb-6 leading-tight">
            Transformando datos en éxito académico
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Plataforma de análisis predictivo diseñada para instituciones educativas de excelencia. Toma decisiones informadas con el poder de la inteligencia artificial.
          </p>
        </div>
      </div>

      {/* Panel Derecho (Formulario dinámico) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}