import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Activity, Calendar } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function AnalisisPrediccion() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`http://localhost:8000/api/v1/estudiantes/${id}/riesgo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error(err));
  }, [id, token]);

  if (!data) return <div className="p-8 text-center text-gray-500">Cargando análisis predictivo...</div>;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Volver al panel
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Análisis Predictivo de Estudiante</h2>
        <p className="text-sm text-gray-500">Desglose detallado de los factores que influyen en el puntaje de riesgo actual.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Risk Score</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${data.nivel_riesgo === 'Alto' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {data.nivel_riesgo.toUpperCase()} RISK
              </span>
            </div>

            <div className="flex items-baseline mb-4">
              <h3 className="text-6xl font-black text-gray-900">{Math.round(data.score * 100)}</h3>
              <span className="text-xl text-gray-400 ml-2">/ 100</span>
            </div>

            <p className="text-sm text-gray-600">
              El modelo basado en reglas deterministas indica el nivel de atención prioritaria requerido para este perfil.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-6 flex items-center text-xs text-gray-500">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            Fecha de cálculo: {data.fecha_calculo}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-eduPurple" /> Variable Weight Breakdown
          </h3>

          <div className="space-y-6">
            {data.factores.map((factor, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-gray-800 capitalize">{factor.variable.replace('_', ' ')}</span>
                  <span className="font-semibold text-eduPurple">{Math.round(factor.peso * 100)}% Peso (Valor: {factor.valor})</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div 
                    className="bg-eduPurple h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${factor.peso * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}