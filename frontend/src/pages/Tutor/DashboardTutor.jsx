import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, TrendingDown, Users, ArrowRight, Mail } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function DashboardTutor() {
  const { token } = useAuth();
  const [resumen, setResumen] = useState({ bajo: 0, medio: 0, alto: 0, total_estudiantes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/riesgo/resumen', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setResumen(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [token]);

  const total = resumen.total_estudiantes || 1;
  const pBajo = Math.round((resumen.bajo / total) * 100);
  const pMedio = Math.round((resumen.medio / total) * 100);
  const pAlto = Math.round((resumen.alto / total) * 100);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Resumen de Tutoría</h2>
          <p className="text-sm text-gray-500">Análisis predictivo de riesgo académico para el ciclo actual.</p>
        </div>
        <Link 
          to="/panel-riesgo"
          className="bg-eduPurple text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm hover:bg-opacity-90"
        >
          Panel de Predicciones <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {/* BENTO GRID DE KPIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Gráfica de Distribución */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-800">Distribución de Riesgo Estudiantil</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Sin Riesgo / Bajo ({pBajo}%)</span>
                <span>{resumen.bajo} estudiantes</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${pBajo}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Riesgo Medio ({pMedio}%)</span>
                <span>{resumen.medio} estudiantes</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-yellow-500 h-3 rounded-full transition-all duration-500" style={{ width: `${pMedio}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Riesgo Alto ({pAlto}%)</span>
                <span>{resumen.alto} estudiantes</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-red-600 h-3 rounded-full transition-all duration-500" style={{ width: `${pAlto}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 mb-4">Métricas Clave</h3>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{resumen.alto}</h4>
                <p className="text-xs text-red-700 font-medium">Alertas Críticas</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <TrendingDown className="w-5 h-5 text-yellow-700" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{resumen.medio}</h4>
                <p className="text-xs text-yellow-800 font-medium">Rendimiento en Declive</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* TABLA DE ALUMNOS QUE REQUIEREN ATENCIÓN */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800">Alumnos que requieren atención</h3>
          <Link to="/panel-riesgo" className="text-sm font-semibold text-eduPurple hover:underline">Ver todos</Link>
        </div>
        <div className="p-6 text-center text-gray-500 text-sm">
          Accede al panel de predicciones detallado para interactuar con los expedientes de riesgo.
        </div>
      </div>
    </div>
  );
}