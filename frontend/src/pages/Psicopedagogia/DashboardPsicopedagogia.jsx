import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DashboardPsicopedagogia() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [casosPendientes, setCasosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    
    fetch(`http://localhost:8000/api/v1/psicopedagogia/casos-pendientes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCasosPendientes(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [token]);

  if (loading) return <div className="p-8 text-gray-500">Cargando visión institucional...</div>;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Visión Institucional</h2>
          <p className="text-sm text-gray-500">Monitoreo de riesgo académico y casos escalados por departamento.</p>
        </div>
          <button 
            onClick={() => navigate('/reportes')}
            className="bg-eduPurple text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90"
          >
            Reportes Globales
          </button>
      </div>

      <div className="mb-10">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
          <h3 className="text-xl font-bold text-gray-900">Casos Escalados Pendientes (Urge Intervención)</h3>
          {casosPendientes.length > 0 && (
            <span className="ml-3 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {casosPendientes.length} Nuevos
            </span>
          )}
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4">
          {casosPendientes.length === 0 ? (
            <p className="text-gray-500 italic">No hay casos pendientes de revisión.</p>
          ) : (
            casosPendientes.slice(0, 3).map((caso) => (
              <div key={caso.id_estudiante} className="min-w-[320px] bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{caso.nombre_completo}</h4>
                      <p className="text-xs text-gray-500">Escalado por {caso.tutor_nombre}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded border border-red-100">
                      Riesgo {caso.nivel_riesgo}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                    <p className="text-sm text-gray-700 italic line-clamp-3">
                      "{caso.motivo_escalada}"
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> {caso.fecha_escalamiento}
                  </span>
                  <button 
                    onClick={() => navigate(`/estudiantes/${caso.id_estudiante}/expediente`)}
                    className="text-sm font-bold text-eduPurple hover:underline"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="min-w-[160px] bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="text-4xl font-black text-gray-900">142</h3>
            <p className="text-xs text-gray-500 mt-1">Alumnos en Riesgo Medio</p>
          </div>
          
          <div className="min-w-[160px] bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="text-4xl font-black text-gray-900">89%</h3>
            <p className="text-xs text-gray-500 mt-1">Retención Proyectada</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Indicadores por Carrera</h3>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            Filtrar
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 pl-6">Carrera</th>
              <th className="p-4">Matrícula Activa</th>
              <th className="p-4">Riesgo Alto</th>
              <th className="p-4">Riesgo Medio</th>
              <th className="p-4">Tendencia Riesgo</th>
              <th className="p-4 text-right pr-6">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Datos Mocks representativos para el layout */}
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="p-4 pl-6 font-bold text-gray-900 flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-3"></span> Ingeniería Informática
              </td>
              <td className="p-4 text-sm text-gray-600">450</td>
              <td className="p-4 text-sm font-bold text-red-600">12 (2.6%)</td>
              <td className="p-4 text-sm text-yellow-600 font-medium">34 (7.5%)</td>
              <td className="p-4 text-sm text-red-500 font-medium flex items-center">↗ +2%</td>
              <td className="p-4 text-right pr-6"><ChevronRight className="w-5 h-5 text-gray-400 inline" /></td>
            </tr>
            <tr className="hover:bg-gray-50 cursor-pointer">
              <td className="p-4 pl-6 font-bold text-gray-900 flex items-center">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-3"></span> Arquitectura
              </td>
              <td className="p-4 text-sm text-gray-600">320</td>
              <td className="p-4 text-sm font-bold text-red-600">8 (2.5%)</td>
              <td className="p-4 text-sm text-yellow-600 font-medium">28 (8.7%)</td>
              <td className="p-4 text-sm text-gray-400 font-medium flex items-center">→ Estable</td>
              <td className="p-4 text-right pr-6"><ChevronRight className="w-5 h-5 text-gray-400 inline" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}