import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api'; 
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, GraduationCap, ChevronRight, Download } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function DashboardDirector() {
  const { id: idFromUrl } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [idCarrera, setIdCarrera] = useState(idFromUrl || null);
  const [nombreCarrera, setNombreCarrera] = useState('');
  const [indicadores, setIndicadores] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (idFromUrl || !token) return;
    fetch(`${API_BASE_URL}/api/v1/director/mi-carrera`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo determinar tu carrera asignada.');
        return res.json();
      })
      .then(data => {
        setIdCarrera(data.id_carrera);
        setNombreCarrera(data.nombre);
      })
      .catch(err => setError(err.message));
  }, [idFromUrl, token]);

  useEffect(() => {
    if (!token || !idCarrera) return;
    
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/carreras/${idCarrera}/indicadores`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/carreras/${idCarrera}/riesgo-agregado-por-grupo`, { headers: { 'Authorization': `Bearer ${token}` } })
    ])
    .then(async ([indRes, grupRes]) => {
      if (indRes.status === 403 || grupRes.status === 403) {
        throw new Error('No tienes permiso para ver esta carrera.');
      }
      const indData = await indRes.json();
      const grupData = await grupRes.json();
      setIndicadores(indData);
      setGrupos(grupData);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [idCarrera, token]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-eduPurple underline text-sm">Volver al inicio</button>
      </div>
    );
  }

  if (loading || !indicadores) return <div className="p-8 text-gray-500">Cargando dashboard...</div>;

  return (
     <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{nombreCarrera || 'Ingeniería en Sistemas Computacionales'}</h2>
          <p className="text-sm text-gray-500">Ciclo Académico 2024-1 • Semana 8</p>
        </div>
        <button onClick={() => navigate(`/carreras/${g.id_grupo}/riesgo-agregado`)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium flex items-center shadow-sm hover:bg-gray-50">
          <Download className="w-4 h-4 mr-2" /> Exportar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <Users className="absolute top-6 right-6 w-5 h-5 text-indigo-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total de Alumnos</p>
          <h3 className="text-4xl font-black text-gray-900 mb-2">{indicadores.total_estudiantes}</h3>
          <p className="text-xs text-green-600 font-medium">↗ +2.4% vs ciclo anterior</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <BookOpen className="absolute top-6 right-6 w-5 h-5 text-gray-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total de Grupos</p>
          <h3 className="text-4xl font-black text-gray-900 mb-2">{grupos.length}</h3>
          <p className="text-xs text-gray-500">Distribuidos en 8 semestres</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <GraduationCap className="absolute top-6 right-6 w-5 h-5 text-gray-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Promedio General</p>
          <h3 className="text-4xl font-black text-gray-900 mb-2">{indicadores.promedio_general_carrera}</h3>
          <p className="text-xs text-gray-500">Escala 0-100</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Distribución de Riesgo por Grupo</h3>
            <p className="text-sm text-gray-500">Análisis predictivo de deserción o bajo rendimiento académico.</p>
          </div>
          <div className="flex space-x-3 text-xs font-semibold">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-600 mr-1"></span>Rojo (Alto)</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>Ámbar (Medio)</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>Verde (Bajo)</span>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
              <th className="p-4 pl-6">Grupo</th>
              <th className="p-4 w-1/2">Distribución de Riesgo (Alumnos)</th>
              <th className="p-4 text-right pr-6">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.map(g => {
              const total = g.total_estudiantes || 1;
              const pBajo = (g.riesgo_bajo / total) * 100;
              const pMedio = (g.riesgo_medio / total) * 100;
              const pAlto = (g.riesgo_alto / total) * 100;

              return (
                <tr key={g.id_grupo} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-900">{g.nombre_grupo}</td>
                  <td className="p-4">
                    <div className="w-full flex h-3 rounded-full overflow-hidden mb-1">
                      <div className="bg-green-500" style={{ width: `${pBajo}%` }}></div>
                      <div className="bg-yellow-400" style={{ width: `${pMedio}%` }}></div>
                      <div className="bg-red-600" style={{ width: `${pAlto}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                      <span>{g.riesgo_bajo} Bajo</span>
                      <span className="text-center">{g.riesgo_medio} Medio</span>
                      <span className="text-right text-red-600">{g.riesgo_alto} Alto</span>
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button
                      onClick={() => navigate('/grupos', { state: { grupoAAbrir: g.id_grupo } })}
                      className="text-gray-400 hover:text-gray-900"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <Link to={`/carreras/${idCarrera}/riesgo-agregado`} className="text-sm font-semibold text-eduPurple hover:underline">
            Ver análisis gráfico detallado
          </Link>
        </div>
      </div>
    </div>
  );
}