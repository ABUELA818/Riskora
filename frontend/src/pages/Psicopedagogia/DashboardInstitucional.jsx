import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';
import { API_BASE_URL } from '../../config/api'; 

export default function DashboardInstitucional() {
  const { token } = useAuth();
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/institucional/indicadores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setKpis(data))
      .catch(err => console.error(err));
  }, [token]);

  if (!kpis) return <div className="p-8 text-gray-500">Cargando vista institucional...</div>;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Institucional</h2>
          <p className="text-sm text-gray-500">Resumen general consolidado • Ciclo 2024-1</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <TrendingUp className="absolute top-6 right-6 w-5 h-5 text-risk-low" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Retención Institucional / Deserción</p>
          <h3 className="text-3xl font-black text-gray-400 mb-2 italic">Próximamente</h3>
          <p className="text-xs text-risk-low font-medium">Requiere histórico de bajas (V2)</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-risk-high-border border-l-4 border-l-red-500 shadow-sm relative">
          <AlertTriangle className="absolute top-6 right-6 w-5 h-5 text-risk-high" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Riesgo Institucional Alto</p>
          <h3 className="text-4xl font-black text-gray-900 mb-2">{kpis.riesgo_alto}</h3>
          <p className="text-xs text-risk-high font-medium">Requieren atención inmediata</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <Eye className="absolute top-6 right-6 w-5 h-5 text-risk-medium" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alumnos en Seguimiento</p>
          <h3 className="text-4xl font-black text-gray-900 mb-2">{kpis.riesgo_medio}</h3>
          <p className="text-xs text-gray-500">Distribuidos en toda la institución</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Métricas Institucionales (Consolidado)</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 pl-6">Métrica</th>
                <th className="p-4 text-center">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="p-4 pl-6 font-semibold text-gray-900 flex items-center">Total de Estudiantes Activos</td>
                <td className="p-4 text-center text-lg font-bold">{kpis.total_estudiantes}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="p-4 pl-6 font-semibold text-gray-900">Promedio General Institucional</td>
                <td className="p-4 text-center text-lg font-bold">{kpis.promedio_general_carrera} / 100</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="p-4 pl-6 font-semibold text-gray-900">Tasa de Reprobación Global (&lt;60)</td>
                <td className="p-4 text-center text-lg font-bold text-risk-high">{kpis.porcentaje_reprobacion}%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="p-4 pl-6 font-semibold text-gray-900">Estudiantes Sin Riesgo (Verde)</td>
                <td className="p-4 text-center text-lg font-bold text-risk-low">{kpis.riesgo_bajo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-brand-100 shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Generar Reporte Mensual</h3>
            <p className="text-sm text-gray-600 mb-4">Análisis predictivo institucional listo para descarga.</p>
            <button className="w-full bg-eduPurple text-white py-2.5 rounded-lg text-sm font-bold shadow-sm">Revisar y Descargar</button>
          </div>
        </div>
      </div>
    </div>
  );
}