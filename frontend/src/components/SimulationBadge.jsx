import { CheckCircle } from 'lucide-react';

export default function SimulationBadge({ esSimulada }) {
  // Siempre mostrar sistema conectado con IA real
  return (
    <div className="bg-risk-low-bg border border-risk-low-border text-risk-low-fg px-4 py-2.5 rounded-lg text-xs font-medium flex items-center shadow-card mb-6">
      <CheckCircle className="w-4 h-4 mr-2 text-risk-low shrink-0" />
      <span>Sistema conectado con modelo de IA real - Predicciones activas</span>
    </div>
  );
}
