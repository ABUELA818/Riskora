import { AlertCircle } from 'lucide-react';

export default function SimulationBadge() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs font-medium flex items-center shadow-sm mb-6">
      <AlertCircle className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
      <span>Datos simulados — pendiente de conectar con modelo de IA real (RF-13).</span>
    </div>
  );
}