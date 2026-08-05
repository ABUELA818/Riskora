import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Phone, Users, Activity, FileText, CheckCircle, 
  AlertTriangle, Calendar, Plus, Brain 
} from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function BitacoraIntervenciones() {
  const { id } = useParams();
  const { token } = useAuth();
  
  const [estudiante, setEstudiante] = useState(null);
  const [intervenciones, setIntervenciones] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bitacora');
  
  const [formulario, setFormulario] = useState({
    nivel_resolucion: 'Llamada Telefónica',
    acuerdos: ''
  });

  useEffect(() => {
    if (!token || !id) return;
    
    fetch(`http://localhost:8000/api/v1/estudiantes/${id}/resumen-completo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Error al cargar estudiante");
        return res.json();
      })
      .then(data => {
        setEstudiante(data);
        setIntervenciones(data.intervenciones_recientes || []);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id, token]);

  const guardarIntervencion = async (e) => {
    e.preventDefault();
    if (!formulario.acuerdos.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/estudiantes/${id}/intervenciones`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          acuerdos: formulario.acuerdos,
          nivel_resolucion: formulario.nivel_resolucion
        })
      });

      if (!response.ok) throw new Error("Error al guardar");
      const nuevaData = await response.json();

      setIntervenciones(prev => [nuevaData, ...prev]);
      
      setFormulario({ nivel_resolucion: 'Llamada Telefónica', acuerdos: '' });
      setActiveTab('bitacora');
    } catch (error) {
      alert("No se pudo registrar la intervención.");
    } finally {
      setIsSaving(false);
    }
  };

  const getIconForType = (tipo) => {
    if (tipo.includes('Llamada')) return <Phone className="w-4 h-4 text-blue-600" />;
    if (tipo.includes('Canalización') || tipo.includes('Psicopedagogía')) return <Activity className="w-4 h-4 text-green-600" />;
    if (tipo.includes('Presencial')) return <Users className="w-4 h-4 text-purple-600" />;
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  if (loading || !estudiante) {
    return <div className="p-8 text-center text-gray-500">Cargando expediente tutorial...</div>;
  }

  const isRiesgoAlto = estudiante.riesgo.nivel_riesgo === 'Alto';

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${estudiante.nombre_completo}`} 
            alt="avatar" 
            className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 mr-4" 
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{estudiante.nombre_completo}</h2>
            <p className="text-sm text-gray-500">
              ID: {estudiante.matricula} • {estudiante.carrera}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center border ${isRiesgoAlto ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isRiesgoAlto ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
            {isRiesgoAlto ? 'Alto Riesgo Académico' : `Riesgo ${estudiante.riesgo.nivel_riesgo}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex space-x-6">
                <button 
                  onClick={() => setActiveTab('bitacora')}
                  className={`text-base font-bold pb-2 border-b-2 transition-colors ${activeTab === 'bitacora' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Bitácora de Seguimiento
                </button>
                <button 
                  onClick={() => setActiveTab('contexto')}
                  className={`text-base font-bold pb-2 border-b-2 transition-colors flex items-center ${activeTab === 'contexto' ? 'border-eduPurple text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Contexto Prevío <Brain className="w-4 h-4 ml-1.5 opacity-70"/>
                </button>
              </div>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 flex items-center text-gray-600">
                 Filtrar
              </button>
            </div>

            {activeTab === 'bitacora' && (
              <div className="p-8 flex-1">
                {intervenciones.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">No hay intervenciones registradas.</div>
                ) : (
                  <div className="relative border-l border-gray-200 ml-4 space-y-10">
                    {intervenciones.map((intv) => (
                      <div key={intv.id_intervencion} className="relative pl-8">
                        <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                          {getIconForType(intv.nivel_resolucion)}
                        </div>
                        
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {intv.nivel_resolucion}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" /> {intv.fecha}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed">
                            {intv.acuerdos}
                          </p>

                          <div className="bg-gray-50 px-3 py-2 rounded-lg inline-flex items-center text-xs font-medium text-gray-600 border border-gray-100">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${intv.nombre_tutor}`} className="w-5 h-5 rounded-full mr-2" alt="tutor" />
                            Registrado por {intv.nombre_tutor}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contexto' && (
              <div className="p-8 flex-1 bg-gray-50/30">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600"/> Observaciones de Conducta (RF-14)
                </h3>
                {estudiante.observaciones_recientes?.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-100">Sin reportes recientes.</p>
                ) : (
                  <div className="space-y-4">
                    {estudiante.observaciones_recientes.map((obs, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-eduPurple">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-bold text-gray-700">{obs.etiqueta}</span>
                          <span className="text-gray-400">{obs.fecha.split('T')[0]}</span>
                        </div>
                        <p className="text-sm text-gray-600">{obs.nota}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4">Métricas Predictivas</h3>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Asistencia Actual</p>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${estudiante.porcentaje_asistencia < 70 ? 'text-red-600' : 'text-gray-900'}`}>
                    {estudiante.porcentaje_asistencia}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Promedio General</p>
                <div className="flex items-baseline">
                  <span className={`text-3xl font-black ${estudiante.promedio_general < 70 ? 'text-red-600' : 'text-gray-900'}`}>
                    {estudiante.promedio_general}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-eduPurple" /> Registrar Intervención
            </h3>
            
            <form onSubmit={guardarIntervencion} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input 
                    type="text" 
                    value={new Date().toLocaleDateString()} 
                    disabled 
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Intervención</label>
                  <select 
                    value={formulario.nivel_resolucion}
                    onChange={(e) => setFormulario({...formulario, nivel_resolucion: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple focus:border-eduPurple outline-none bg-white"
                  >
                    <option value="Llamada Telefónica">Llamada Telefónica</option>
                    <option value="Cita Presencial">Cita Presencial</option>
                    <option value="Canalización a Psicopedagogía">Canalización a Psicología</option>
                    <option value="Seguimiento Académico">Seguimiento Académico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Detalles y Acuerdos de la Sesión</label>
                <textarea 
                  required
                  value={formulario.acuerdos}
                  onChange={(e) => setFormulario({...formulario, acuerdos: e.target.value})}
                  placeholder="Describe la situación y los compromisos acordados con el alumno..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-eduPurple focus:border-eduPurple outline-none h-32 resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-eduPurple text-white py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90 disabled:opacity-70 transition-all flex justify-center items-center"
              >
                {isSaving ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}