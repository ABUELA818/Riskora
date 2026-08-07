import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, ChevronRight, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { API_BASE_URL } from '../../config/api'; 

export default function DashboardPsicopedagogia() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [casosPendientes, setCasosPendientes] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [carreras, setCarreras] = useState([]); // P3
  const [loading, setLoading] = useState(true);
  const [marcandoVisto, setMarcandoVisto] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/api/v1/psicopedagogia/casos-pendientes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCasosPendientes(data);
        setLoading(false);
      })
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/v1/institucional/indicadores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setKpis(data))
      .catch(err => console.error(err));

    // P3: carreras con datos reales (reutiliza el endpoint creado en P4)
    fetch(`${API_BASE_URL}/api/v1/carreras/resumen`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); })
      .catch(err => console.error(err));
  }, [token]);

  const marcarComoVisto = async (idIntervencion) => {
    setMarcandoVisto(idIntervencion);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/psicopedagogia/intervenciones/${idIntervencion}/marcar-visto`,
        { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('No se pudo marcar el caso como visto');
      setCasosPendientes(prev => prev.filter(c => c.id_intervencion !== idIntervencion));
    } catch (error) {
      alert('No se pudo marcar el caso como visto. Intenta de nuevo.');
    } finally {
      setMarcandoVisto(null);
    }
  };

  // P3: helper de color según % de riesgo alto (mismo criterio usado en GestionCarreras.jsx)
  const colorPunto = (pct) => {
    if (pct >= 15) return 'bg-red-500';
    if (pct >= 8) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  const colorTexto = (pct) => {
    if (pct >= 15) return 'text-red-600';
    if (pct >= 8) return 'text-yellow-600';
    return 'text-green-600';
  };

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
                    <p className="text-sm text-gray-700 italic line-clamp-3">"{caso.motivo_escalada}"</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> {caso.fecha_escalamiento}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => marcarComoVisto(caso.id_intervencion)}
                      disabled={marcandoVisto === caso.id_intervencion}
                      title="Marcar como visto"
                      className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-green-700 disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {marcandoVisto === caso.id_intervencion ? 'Marcando...' : 'Marcar visto'}
                    </button>
                    <button
                      onClick={() => navigate(`/estudiantes/${caso.id_estudiante}/expediente`)}
                      className="text-sm font-bold text-eduPurple hover:underline"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="min-w-[160px] bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="text-4xl font-black text-gray-900">{kpis ? kpis.riesgo_medio : '—'}</h3>
            <p className="text-xs text-gray-500 mt-1">Alumnos en Riesgo Medio</p>
          </div>

          <div className="min-w-[160px] bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-gray-300 mb-2" />
            <h3 className="text-2xl font-black text-gray-400 italic">Próximamente</h3>
            <p className="text-xs text-gray-500 mt-1">Retención Proyectada (requiere histórico)</p>
          </div>
        </div>
      </div>

      {/* P3: tabla de carreras con datos reales */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Indicadores por Carrera</h3>
          <Link
            to="/carreras/gestion"
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver todas
          </Link>
        </div>

        {carreras.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No hay carreras registradas.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 pl-6">Carrera</th>
                <th className="p-4">Matrícula Activa</th>
                <th className="p-4">Riesgo Alto</th>
                <th className="p-4">Director</th>
                <th className="p-4 text-right pr-6">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carreras.map(c => (
                <tr
                  key={c.id_carrera}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/carreras/${c.id_carrera}/riesgo-agregado`)}
                >
                  <td className="p-4 pl-6 font-bold text-gray-900 flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${colorPunto(c.promedio_riesgo_alto_pct)}`}></span>
                    {c.nombre}
                  </td>
                  <td className="p-4 text-sm text-gray-600">{c.total_estudiantes}</td>
                  <td className={`p-4 text-sm font-bold ${colorTexto(c.promedio_riesgo_alto_pct)}`}>
                    {c.promedio_riesgo_alto_pct}%
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {c.director_nombre || <span className="text-gray-400 italic">Sin asignar</span>}
                  </td>
                  <td className="p-4 text-right pr-6">
                    <ChevronRight className="w-5 h-5 text-gray-400 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}