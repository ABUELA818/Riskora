import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Calendar, FileText, Activity, AlertTriangle, Book, FileCheck, CheckCircle, Mail, Phone, UserX } from 'lucide-react';
import SimulationBadge from '../components/SimulationBadge';
import HistorialAcademicoTab from '../components/HistorialAcademicoTab';
import CalendarioAsistencia from '../components/CalendarioAsistencia';
import ObservacionesTab from '../components/ObservacionesTab';
import FormularioSocioeconomico from '../components/FormularioSocioeconomico';
import SeccionCalificaciones from '../components/SeccionCalificaciones';
import { API_BASE_URL } from '../config/api';

export default function ExpedienteCompleto() {
  const { id } = useParams();
  const { token, user } = useAuth();
  
  const [expediente, setExpediente] = useState(null);
  const [activeTab, setActiveTab] = useState('academico');
  const [loading, setLoading] = useState(true);

  const isPsico = user?.rol === 'Psicopedagogia' || user?.rol === 'Administrador';

  useEffect(() => {
    if (!token || !id) return;
    
    const url = isPsico 
      ? `${API_BASE_URL}/api/v1/psicopedagogia/estudiantes/${id}/expediente-completo?vista=psicopedagogia`
      : `${API_BASE_URL}/api/v1/psicopedagogia/estudiantes/${id}/expediente-completo`;

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setExpediente(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id, token, isPsico]);

  if (loading || !expediente) return <div className="p-8 text-gray-500">Cargando expediente...</div>;

  const promedioGeneral = expediente.historial_calificaciones?.length > 0
    ? (expediente.historial_calificaciones.reduce((acc, c) => {
        const valor = c.promedio !== null && c.promedio !== undefined ? c.promedio : 0;
        return acc + valor;
      }, 0) / expediente.historial_calificaciones.length).toFixed(1)
    : 'N/A';

  const promedioAsistencia = expediente.historial_asistencia?.length > 0
    ? Math.round(
        (expediente.historial_asistencia.filter(a => a.asistio === true).length
          / expediente.historial_asistencia.length) * 100
      )
    : null;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      {expediente.estado === false && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl mb-6 flex items-start shadow-sm">
          <UserX className="w-5 h-5 mr-3 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm mb-1">Este estudiante está dado de baja</p>
            {expediente.fecha_baja && (
              <p className="text-xs text-red-700">
                Fecha de baja: {new Date(expediente.fecha_baja).toLocaleDateString()}
              </p>
            )}
            <p className="text-sm text-red-700 mt-1">
              Motivo: {expediente.motivo_baja || 'No se registró un motivo.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-start">
          <img 
            src={expediente.fotografia_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${expediente.nombre_completo}`} 
            alt="avatar" 
            className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-50 mr-6 object-cover" 
          />
          <div>
            <div className="flex items-center mb-1">
              <h2 className="text-3xl font-bold text-gray-900 mr-3">{expediente.nombre_completo}</h2>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full border border-orange-200">
                ID: {expediente.matricula}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{expediente.carrera} • Estudiante Activo</p>

            {expediente.correo_institucional ? (
              <a
                href={`mailto:${expediente.correo_institucional}`}
                className="inline-flex items-center text-sm text-eduPurple font-medium hover:underline mt-1 mb-4"
              >
                <Mail className="w-4 h-4 mr-1.5" /> {expediente.correo_institucional}
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic mt-1 mb-4">Sin correo institucional registrado</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setActiveTab('observaciones')}
                className="px-4 py-2 bg-indigo-50 text-eduPurple rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center"
              >
                <FileCheck className="w-4 h-4 mr-2" /> Ver historial de observaciones
              </button>
              {expediente.contacto_emergencia_telefono ? (
                <a
                  href={`tel:${expediente.contacto_emergencia_telefono}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors inline-flex items-center"
                >
                  Contactar familiar
                </a>
              ) : (
                <button
                  disabled
                  title="Sin contacto de emergencia registrado"
                  className="px-4 py-2 border border-gray-200 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                >
                  Contactar familiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full lg:w-64 shrink-0">
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mr-3 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Intervention Priority</p>
              <p className="text-sm font-bold text-gray-900">{expediente.nivel_riesgo_actual} Risk</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center">
            <Book className="w-6 h-6 text-indigo-400 mr-3 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Promedio General</p>
              <p className="text-sm font-bold text-gray-900">{promedioGeneral}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center">
            <Activity className="w-6 h-6 text-indigo-400 mr-3 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Promedio de Asistencia</p>
              <p className="text-sm font-bold text-gray-900">
                {promedioAsistencia !== null ? `${promedioAsistencia}%` : 'Sin registros'}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center">
            <Phone className="w-6 h-6 text-indigo-400 mr-3 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Contacto de emergencia</p>
              {expediente.contacto_emergencia_nombre ? (
                <>
                  <p className="text-sm font-bold text-gray-900">{expediente.contacto_emergencia_nombre}</p>
                  <p className="text-xs text-gray-500">{expediente.contacto_emergencia_telefono || 'Sin teléfono'}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No registrado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-gray-200 mb-6 flex space-x-6 overflow-x-auto">
        <button onClick={() => setActiveTab('academico')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'academico' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Book className="w-4 h-4 mr-2" /> Historial Académico
        </button>
        <button onClick={() => setActiveTab('asistencia')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'asistencia' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Calendar className="w-4 h-4 mr-2" /> Asistencia
        </button>
        <button onClick={() => setActiveTab('observaciones')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'observaciones' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <FileText className="w-4 h-4 mr-2" /> Observaciones y Conducta
        </button>
        
        <button onClick={() => setActiveTab('socioeconomico')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'socioeconomico' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <FileCheck className="w-4 h-4 mr-2" /> Datos Socioeconómicos
        </button>
        
        <button onClick={() => setActiveTab('calificaciones')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'calificaciones' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Book className="w-4 h-4 mr-2" /> Calificaciones por Parcial
        </button>
        
        {isPsico && (
          <button onClick={() => setActiveTab('ia')} className={`pb-3 text-sm font-bold flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ia' ? 'border-eduPurple text-eduPurple' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Brain className="w-4 h-4 mr-2" /> Análisis IA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {activeTab === 'ia' && isPsico && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <SimulationBadge />
              
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 flex items-center mb-4">
                  <Brain className="w-5 h-5 text-eduPurple mr-2" /> Predictive Synthesis
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  El modelo detecta una caída reciente en el rendimiento académico altamente correlacionada con un bloque de inasistencias los días lunes. El patrón es similar a casos previos de "Burnout extracurricular". Mientras el rendimiento en ciencias exactas es estable, las observaciones cualitativas indican una baja participación en los periodos matutinos.
                </p>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 flex items-center">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span> Patrón de Asistencia Detectado
                  </span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200 flex items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5"></span> Resiliencia STEM
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[300px] flex flex-col justify-center items-center text-gray-400 border-dashed">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Multi-Variable Trajectory Chart Rendered Here</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Intervenciones Recomendadas</h3>
                <div className="space-y-4">
                  <div className="p-3 border border-gray-100 rounded-lg hover:border-eduPurple transition-colors cursor-pointer">
                    <h4 className="text-sm font-bold text-gray-800 mb-1 flex justify-between">
                      Agendar Check-in Matutino <span className="text-eduPurple">+</span>
                    </h4>
                    <p className="text-xs text-gray-500">Establecer una breve reunión de 5 min los lunes por la mañana para evaluar disposición.</p>
                  </div>
                  <div className="p-3 border border-gray-100 rounded-lg hover:border-eduPurple transition-colors cursor-pointer">
                    <h4 className="text-sm font-bold text-gray-800 mb-1 flex justify-between">
                      Revisar Carga de Lectura <span className="text-eduPurple">+</span>
                    </h4>
                    <p className="text-xs text-gray-500">Analizar tareas actuales por posible saturación de fin de semana.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Análisis de Factores (Mock)</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-gray-400 border-b border-gray-100">
                    <tr><th className="pb-2">Factor</th><th className="pb-2 text-right">Impacto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expediente.analisis_ia_completo?.factores?.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2.5 text-gray-700 capitalize">{f.variable.replace('_', ' ')}</td>
                        <td className="py-2.5 text-right font-bold text-gray-900">{f.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'academico' && (
          <HistorialAcademicoTab
            historial={expediente.historial_calificaciones}
            idEstudiante={id}
            token={token}
          />
        )}

        {activeTab === 'asistencia' && (
          <CalendarioAsistencia historial={expediente.historial_asistencia} />
        )}

        {activeTab === 'observaciones' && (
          <ObservacionesTab observaciones={expediente.observaciones} idEstudiante={id} />
        )}

        {activeTab === 'socioeconomico' && (
          <div className="lg:col-span-3">
            <FormularioSocioeconomico estudianteId={id} token={token} />
          </div>
        )}

        {activeTab === 'calificaciones' && (
          <div className="lg:col-span-3">
            <SeccionCalificaciones estudianteId={id} token={token} />
          </div>
        )}

      </div>
    </div>
  );
}