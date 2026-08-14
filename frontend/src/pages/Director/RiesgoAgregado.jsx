import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Info, Users, Download, Loader2 } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';
import { API_BASE_URL } from '../../config/api';

function calcularPeriodoVigente(periodos) {
  const hoy = new Date().toISOString().split('T')[0];
  const vigente = periodos.find(p => p.fecha_inicio <= hoy && hoy <= p.fecha_fin);
  return vigente ? vigente.nombre_periodo : null;
}

export default function RiesgoAgregado() {
  const { id: idFromUrl } = useParams();
  const { token } = useAuth();
  const [idCarrera, setIdCarrera] = useState(idFromUrl || null);
  const [indicadores, setIndicadores] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [nombreCarrera, setNombreCarrera] = useState('');
  const [periodoVigente, setPeriodoVigente] = useState(null);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  // Nombre real de la carrera
  useEffect(() => {
    if (!token || !idCarrera) return;
    fetch(`${API_BASE_URL}/api/v1/carreras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const carrera = data.find(c => String(c.id_carrera) === String(idCarrera));
        if (carrera) setNombreCarrera(carrera.nombre);
      })
      .catch(err => console.error(err));
  }, [idCarrera, token]);

  // Periodo académico vigente real
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/periodos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPeriodoVigente(calcularPeriodoVigente(data));
      })
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    if (!token || !idCarrera) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/carreras/${idCarrera}/indicadores`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/v1/carreras/${idCarrera}/riesgo-agregado-por-grupo`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ]).then(([ind, grup]) => {
      setIndicadores(ind);
      setGrupos(Array.isArray(grup) ? grup : []);
    }).catch(err => setError('No se pudo cargar la información de riesgo.'));
  }, [idCarrera, token]);

  const handleExportarReporte = async () => {
    setExportando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reportes/academico/export?formato=pdf&carrera=${idCarrera}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al generar el reporte');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${nombreCarrera || 'Carrera'}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo generar el reporte.');
    } finally {
      setExportando(false);
    }
  };

  if (error) {
    return <div className="p-8 text-center text-risk-high">{error}</div>;
  }

  if (!indicadores) return <div className="p-8 text-gray-500">Cargando gráficas...</div>;

  // Grupos con riesgo alto real por encima del 20% de su matrícula, calculado con datos reales
  const gruposCriticos = grupos
    .map(g => {
      const total = g.total_estudiantes || 0;
      const pAlto = total > 0 ? (g.riesgo_alto / total) * 100 : 0;
      return { ...g, pAlto };
    })
    .filter(g => g.total_estudiantes > 0 && g.pAlto > 20)
    .sort((a, b) => b.pAlto - a.pAlto);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <h2 className="text-3xl font-bold text-gray-900 mb-1">{nombreCarrera || 'Cargando carrera...'}</h2>
      <p className="text-sm text-gray-500 mb-8">
        Panel de Riesgo Agregado {periodoVigente ? `• ${periodoVigente}` : ''}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-risk-high-border border-l-4 border-l-red-600 shadow-sm relative">
          <AlertTriangle className="absolute top-6 right-6 w-5 h-5 text-risk-high" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Riesgo Crítico</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.riesgo_alto}</h3><span className="text-sm text-gray-500">estudiantes</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-risk-medium-border border-l-4 border-l-yellow-500 shadow-sm relative">
          <Info className="absolute top-6 right-6 w-5 h-5 text-risk-medium" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Riesgo Moderado</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.riesgo_medio}</h3><span className="text-sm text-gray-500">estudiantes</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-brand-200 border-l-4 border-l-indigo-800 shadow-sm relative">
          <Users className="absolute top-6 right-6 w-5 h-5 text-brand-500" />
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Matrícula Total</p>
          <div className="flex items-baseline"><h3 className="text-4xl font-black text-gray-900 mr-2">{indicadores.total_estudiantes}</h3><span className="text-sm text-gray-500">activos</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-6">Distribución de Riesgo por Grupo</h3>

          {grupos.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-12 text-center">Esta carrera no tiene grupos registrados todavía.</p>
          ) : (
            <>
              <div className="flex items-end h-48 space-x-3 border-b border-gray-200 pb-2 relative overflow-x-auto">
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2 pb-2 bg-white">
                  <span>100%</span><span>50%</span><span>0%</span>
                </div>

                <div className="flex-1 flex justify-around items-end h-full pl-8 min-w-max gap-4">
                  {grupos.map(g => {
                    const total = g.total_estudiantes || 1;
                    const pBajo = (g.riesgo_bajo / total) * 100;
                    const pMedio = (g.riesgo_medio / total) * 100;
                    const pAlto = (g.riesgo_alto / total) * 100;

                    return (
                      <div key={g.id_grupo} className="w-12 h-full flex flex-col justify-end shrink-0 group">
                        <div className="w-full flex flex-col h-[88%]">
                          <div className="w-full bg-risk-high-fg transition-all hover:opacity-80" style={{ height: `${pAlto}%` }}></div>
                          <div className="w-full bg-risk-medium transition-all hover:opacity-80" style={{ height: `${pMedio}%` }}></div>
                          <div className="w-full bg-risk-low transition-all hover:opacity-80" style={{ height: `${pBajo}%` }}></div>
                        </div>
                        <span className="text-[10px] text-center text-gray-500 font-medium mt-2 truncate w-full" title={g.nombre_grupo}>{g.nombre_grupo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center mt-6 space-x-6 text-xs font-semibold text-gray-600">
                <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-risk-high-fg mr-2"></span>Crítico</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-risk-medium mr-2"></span>Moderado</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-risk-low mr-2"></span>Bajo</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-gray-900 mb-4">Áreas de Atención</h3>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
            {gruposCriticos.length === 0 ? (
              <div className="bg-risk-low-bg border border-risk-low-border p-4 rounded-xl">
                <h4 className="text-sm font-bold text-risk-low-fg flex items-center mb-1">
                  <Info className="w-4 h-4 mr-2" /> Sin focos críticos
                </h4>
                <p className="text-xs text-risk-low-fg">Ningún grupo supera el 20% de matrícula en riesgo alto.</p>
              </div>
            ) : (
              gruposCriticos.map(g => (
                <div key={g.id_grupo} className="bg-risk-high-bg border border-risk-high-border p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-risk-high-fg flex items-center mb-1">
                    <AlertTriangle className="w-4 h-4 mr-2" /> {g.nombre_grupo}
                  </h4>
                  <p className="text-xs text-risk-high">
                    {g.riesgo_alto} de {g.total_estudiantes} estudiantes en riesgo alto ({Math.round(g.pAlto)}%).
                  </p>
                </div>
              ))
            )}
          </div>
          <button
            onClick={handleExportarReporte}
            disabled={exportando}
            className="w-full bg-eduPurple text-white py-3 rounded-lg text-sm font-bold shadow-sm mt-4 flex items-center justify-center disabled:opacity-70"
          >
            {exportando ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Generar Reporte Detallado</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}