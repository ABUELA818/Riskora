import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Info, Users } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function RiesgoAgregado() {
  const { id: idFromUrl } = useParams();
  const { token } = useAuth();
  const [idCarrera, setIdCarrera] = useState(idFromUrl || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`http://localhost:8000/api/v1/carreras/${id}/indicadores`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`http://localhost:8000/api/v1/carreras/${id}/riesgo-agregado-por-grupo`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([ind, grup]) => {
      setIndicadores(ind);
      setGrupos(grup);
    });
  }, [id, token]);

  if (!indicadores) return <div className="p-8 text-gray-500">Cargando gráficas...</div>;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <h2 className="text-3xl font-bold text-gray-900 mb-1">Ingeniería de Software</h2>
      <p className="text-sm text-gray-500 mb-8">Panel de Riesgo Agregado • Semestre 2024-1</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-red-200 border-l-4 border-l-red-600 shadow-sm relative">
          <AlertTriangle className="absolute top-6 right-6 w-5 h-5 text-red-500" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Riesgo Crítico</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.riesgo_alto}</h3><span className="text-sm text-gray-500">estudiantes</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-yellow-200 border-l-4 border-l-yellow-500 shadow-sm relative">
          <Info className="absolute top-6 right-6 w-5 h-5 text-yellow-500" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Riesgo Moderado</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.riesgo_medio}</h3><span className="text-sm text-gray-500">estudiantes</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 border-l-4 border-l-indigo-800 shadow-sm relative">
          <Users className="absolute top-6 right-6 w-5 h-5 text-indigo-400" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Matrícula Total</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.total_estudiantes}</h3><span className="text-sm text-gray-500">activos</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-6">Distribución de Riesgo por Grupo</h3>
          
          <div className="flex items-end h-64 space-x-4 border-b border-gray-200 pb-2 relative">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2 pb-2">
              <span>100%</span><span>50%</span><span>0%</span>
            </div>
            
            <div className="flex-1 flex justify-around items-end h-full pl-8">
              {grupos.map(g => {
                const total = g.total_estudiantes || 1;
                const pBajo = (g.riesgo_bajo / total) * 100;
                const pMedio = (g.riesgo_medio / total) * 100;
                const pAlto = (g.riesgo_alto / total) * 100;

                return (
                  <div key={g.id_grupo} className="w-16 h-full flex flex-col justify-end group">
                    <div className="w-full flex flex-col h-[90%]"> {/* 90% para dejar margen */}
                      <div className="w-full bg-red-700 transition-all hover:opacity-80" style={{ height: `${pAlto}%` }}></div>
                      <div className="w-full bg-yellow-400 transition-all hover:opacity-80" style={{ height: `${pMedio}%` }}></div>
                      <div className="w-full bg-green-300 transition-all hover:opacity-80" style={{ height: `${pBajo}%` }}></div>
                    </div>
                    <span className="text-xs text-center text-gray-500 font-medium mt-3">{g.nombre_grupo}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-center mt-6 space-x-6 text-xs font-semibold text-gray-600">
            <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-red-700 mr-2"></span>Crítico</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-yellow-400 mr-2"></span>Moderado</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-green-300 mr-2"></span>Bajo</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-gray-900 mb-4">Áreas de Atención</h3>
          <div className="space-y-4 flex-1">
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-red-800 flex items-center mb-1"><AlertTriangle className="w-4 h-4 mr-2"/> Foco Crítico</h4>
              <p className="text-xs text-red-600">Revisar los grupos con más del 20% de matrícula en riesgo alto.</p>
            </div>
          </div>
          <button className="w-full bg-eduPurple text-white py-3 rounded-lg text-sm font-bold shadow-sm mt-4">
            Generar Reporte Detallado
          </button>
        </div>
      </div>
    </div>
  );
}