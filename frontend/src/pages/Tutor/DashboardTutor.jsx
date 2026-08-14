import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, TrendingDown, Users, ArrowRight, Mail } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';
import { API_BASE_URL } from '../../config/api'; 

export default function DashboardTutor() {
  const { token } = useAuth();
  const [resumen, setResumen] = useState({ bajo: 0, medio: 0, alto: 0, total_estudiantes: 0 });
  const [alumnosAtencion, setAlumnosAtencion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [esSimulada, setEsSimulada] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/riesgo/resumen`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setResumen(data);
        setLoading(false);
      })
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/v1/riesgo/alumnos-atencion`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setAlumnosAtencion(data);
          // Verificar si alguno usa fallback para determinar estado del badge
          if (data.length > 0) {
            // Obtener estado de simulación del primer estudiante
            fetch(`${API_BASE_URL}/api/v1/estudiantes/${data[0].id_estudiante}/riesgo`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(riesgoData => {
              setEsSimulada(riesgoData.es_prediccion_simulada);
            })
            .catch(err => {
              console.error(err);
              setEsSimulada(true); // Por defecto simulado si falla
            });
          }
        }
      })
      .catch(err => console.error(err));
  }, [token]);

  const total = resumen.total_estudiantes || 1;
  const pBajo = Math.round((resumen.bajo / total) * 100);
  const pMedio = Math.round((resumen.medio / total) * 100);
  const pAlto = Math.round((resumen.alto / total) * 100);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge esSimulada={esSimulada} />

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
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
                <div className="bg-risk-low h-3 rounded-full transition-all duration-500" style={{ width: `${pBajo}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Riesgo Medio ({pMedio}%)</span>
                <span>{resumen.medio} estudiantes</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-risk-medium h-3 rounded-full transition-all duration-500" style={{ width: `${pMedio}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Riesgo Alto ({pAlto}%)</span>
                <span>{resumen.alto} estudiantes</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-risk-high h-3 rounded-full transition-all duration-500" style={{ width: `${pAlto}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-800 mb-4">Métricas Clave</h3>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-risk-high-bg rounded-xl border border-risk-high-border">
              <div className="p-2 bg-risk-high-bg rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 text-risk-high" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{resumen.alto}</h4>
                <p className="text-xs text-risk-high-fg font-medium">Alertas Críticas</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-risk-medium-bg rounded-xl border border-risk-medium-border">
              <div className="p-2 bg-risk-medium-bg rounded-lg mr-3">
                <TrendingDown className="w-5 h-5 text-risk-medium-fg" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{resumen.medio}</h4>
                <p className="text-xs text-risk-medium-fg font-medium">Rendimiento en Declive</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800">Alumnos que requieren atención</h3>
          <Link to="/panel-riesgo" className="text-sm font-semibold text-eduPurple hover:underline">Ver todos</Link>
        </div>

        {alumnosAtencion.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No hay alumnos en riesgo medio o alto en tus grupos por el momento.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 pl-6">Alumno</th>
                <th className="p-4">Matrícula</th>
                <th className="p-4">Nivel de Riesgo</th>
                <th className="p-4 text-right pr-6">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnosAtencion.map(alumno => {
                const badgeColor = alumno.nivel_riesgo === 'Alto'
                  ? 'bg-risk-high-bg text-risk-high-fg border-risk-high-border'
                  : 'bg-risk-medium-bg text-risk-medium-fg border-risk-medium-border';
                return (
                  <tr key={alumno.id_estudiante} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-gray-900">{alumno.nombre_completo}</td>
                    <td className="p-4 text-sm text-gray-600">{alumno.matricula}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                        Riesgo {alumno.nivel_riesgo}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      {alumno.correo_institucional ? (
                        
                        <a  href={`mailto:${alumno.correo_institucional}`}
                          className="inline-flex items-center text-xs font-semibold bg-brand-50 text-eduPurple px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 mr-1.5" /> Enviar correo
                        </a>
                      ) : (
                        <span
                          title="Sin correo institucional registrado"
                          className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg cursor-not-allowed"
                        >
                          <Mail className="w-3.5 h-3.5 mr-1.5" /> Sin correo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}