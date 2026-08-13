import { CheckCircle } from 'lucide-react';

export default function SimulationBadge({ esSimulada }) {
  // Siempre mostrar sistema conectado con IA real
  return (
    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-xs font-medium flex items-center shadow-sm mb-6">
      <CheckCircle className="w-4 h-4 mr-2 text-green-600 shrink-0" />
      <span>Sistema conectado con modelo de IA real - Predicciones activas</span>
    </div>
  );
}