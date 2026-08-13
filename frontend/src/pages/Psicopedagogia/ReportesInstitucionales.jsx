import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Filter, FileText, Download, AlertTriangle, CheckCircle, Loader2, Info, RefreshCw } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { API_BASE_URL } from '../../config/api'; 

export default function ReportesInstitucionales() {
  const { token } = useAuth();
  
  const [filtros, setFiltros] = useState({
    carrera: '',
    nivel_riesgo: '',
    periodo: 'Semestre 2024-1'
  });
  const [carreras, setCarreras] = useState([]);

  const [previewData, setPreviewData] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);

  const [resumenRiesgo, setResumenRiesgo] = useState({ bajo: 0, medio: 0, alto: 0, total_estudiantes: 0 });

  const [riesgoPorCarrera, setRiesgoPorCarrera] = useState([]);
  const [reprobacionPorMateria, setReprobacionPorMateria] = useState([]);
  const [tendenciaRiesgo, setTendenciaRiesgo] = useState([]);
  const [generandoSnapshot, setGenerandoSnapshot] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/api/v1/reportes/riesgo-por-carrera`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { 
        console.log('Datos riesgo por carrera:', JSON.stringify(data, null, 2));
        if (Array.isArray(data)) setRiesgoPorCarrera(data); 
      })
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/v1/reportes/reprobacion-por-materia`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setReprobacionPorMateria(data); })
      .catch(err => console.error(err));

    cargarTendencia();
  }, [token]);

  const cargarTendencia = () => {
    fetch(`${API_BASE_URL}/api/v1/reportes/tendencia-riesgo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setTendenciaRiesgo(data); })
      .catch(err => console.error(err));
  };

  const handleGenerarSnapshot = async () => {
    setGenerandoSnapshot(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reportes/snapshot-riesgo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al generar snapshot');
      cargarTendencia();
    } catch (error) {
      alert('No se pudo generar el snapshot de riesgo.');
    } finally {
      setGenerandoSnapshot(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/carreras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) setCarreras(data); 
      })
      .catch(err => console.error("Error al cargar carreras:", err));
  }, [token]);

  // Cargar resumen de riesgo real, filtrado solo por carrera
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filtros.carrera) params.append('carrera', filtros.carrera);

    fetch(`${API_BASE_URL}/api/v1/riesgo/resumen?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { 
        console.log('Resumen de riesgo:', data);
        setResumenRiesgo(data);
      })
      .catch(err => console.error(err));
  }, [filtros.carrera, token]);

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const queryParams = new URLSearchParams();
      if (filtros.carrera) queryParams.append('carrera', filtros.carrera);
      if (filtros.nivel_riesgo) queryParams.append('nivel_riesgo', filtros.nivel_riesgo);
      
      const res = await fetch(`${API_BASE_URL}/api/v1/reportes/academico?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Error al cargar vista previa");
      const data = await res.json();
      setPreviewData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (token) fetchPreview();
  }, [token]);

  // Promedio de asistencia real a partir de los datos cargados en la tabla
  const asistenciaPromedio = previewData.length > 0
    ? Math.round(previewData.reduce((acc, e) => acc + e.porcentaje_asistencia, 0) / previewData.length)
    : null;

  const handleExport = async (formato) => {
    setExportingFormat(formato);
    try {
      const queryParams = new URLSearchParams({ formato });
      if (filtros.carrera) queryParams.append('carrera', filtros.carrera);
      if (filtros.nivel_riesgo) queryParams.append('nivel_riesgo', filtros.nivel_riesgo);

      const res = await fetch(`${API_BASE_URL}/api/v1/reportes/academico/export?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Error al generar el reporte");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${filtros.carrera || 'Institucional'}_${new Date().getTime()}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Hubo un problema al exportar el reporte. Inténtalo nuevamente.");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Reportes Institucionales</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 justify-between items-end">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Periodo Académico</label>
            <select 
              value={filtros.periodo}
              onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 w-40 outline-none focus:border-eduPurple"
            >
              <option>Semestre 2024-1</option>
              <option>Semestre 2023-2</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Carrera</label>
            <select 
              value={filtros.carrera}
              onChange={(e) => setFiltros({...filtros, carrera: e.target.value})}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 w-48 outline-none focus:border-eduPurple"
            >
              <option value="">Todas las Carreras</option>
              {carreras.map(c => (
                <option key={c.id_carrera} value={c.id_carrera}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">Nivel de Riesgo</label>
            <select 
              value={filtros.nivel_riesgo}
              onChange={(e) => setFiltros({...filtros, nivel_riesgo: e.target.value})}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 w-40 outline-none focus:border-eduPurple"
            >
              <option value="">Todos</option>
              <option value="Alto">Alto</option>
              <option value="Medio">Medio</option>
              <option value="Bajo">Bajo</option>
            </select>
          </div>
          
          <button 
            onClick={fetchPreview}
            disabled={isLoadingPreview}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold flex items-center shadow-sm hover:bg-gray-50 disabled:opacity-70 transition-colors"
          >
            {isLoadingPreview ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-400" /> : <Filter className="w-4 h-4 mr-2 text-gray-600" />}
            Filtrar
          </button>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={() => handleExport('pdf')}
            disabled={exportingFormat !== null}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold flex items-center shadow-sm hover:bg-gray-50 disabled:opacity-70 transition-all"
          >
            {exportingFormat === 'pdf' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2 text-gray-600" /> PDF</>
            )}
          </button>
          
          <button 
            onClick={() => handleExport('excel')}
            disabled={exportingFormat !== null}
            className="px-4 py-2 bg-eduPurple text-white border border-eduPurple rounded-lg text-sm font-semibold flex items-center shadow-sm hover:bg-opacity-90 disabled:opacity-70 transition-all"
          >
            {exportingFormat === 'excel' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Excel</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <AlertTriangle className="absolute top-6 right-6 w-6 h-6 text-red-500" />
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Estudiantes en Riesgo Alto</p>
          <div className="flex items-center mb-2">
            <h3 className="text-5xl font-black text-gray-900 mr-3">{resumenRiesgo.alto}</h3>
          </div>
          <p className="text-sm text-gray-500">Requieren intervención inmediata</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <CheckCircle className="absolute top-6 right-6 w-6 h-6 text-green-500" />
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Asistencia Promedio</p>
          <div className="flex items-center mb-2">
            <h3 className="text-5xl font-black text-gray-900 mr-3">
              {asistenciaPromedio !== null ? `${asistenciaPromedio}%` : '—'}
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            {asistenciaPromedio !== null 
              ? `Calculado sobre ${previewData.length} estudiante(s) con los filtros actuales` 
              : 'Sin datos para los filtros aplicados'}
          </p>
        </div>
        
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2 text-indigo-600" /> Acerca de este reporte
          </h3>
          <p className="text-xs text-indigo-700 leading-relaxed">
            La tabla inferior muestra una vista previa en tiempo real de los datos filtrados. Los archivos exportados (PDF/Excel) reflejarán exactamente esta información, incluyendo los cálculos del modelo predictivo (IA).
          </p>
        </div>
      </div>

      {/* NUEVO BLOQUE: Gráficas de Análisis Institucional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Riesgo por carrera */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Riesgo por Carrera</h3>
          {riesgoPorCarrera.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-12 text-center">Sin datos suficientes todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={riesgoPorCarrera} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="carrera" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="riesgo_bajo" fill="#4ade80" name="Bajo" />
                <Bar dataKey="riesgo_medio" fill="#facc15" name="Medio" />
                <Bar dataKey="riesgo_alto" fill="#dc2626" name="Alto" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Reprobación por materia */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Materias con Mayor Reprobación</h3>
          {reprobacionPorMateria.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-12 text-center">Sin calificaciones capturadas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={reprobacionPorMateria} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" unit="%" />
                <YAxis type="category" dataKey="materia" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="porcentaje_reprobacion" fill="#dc2626" name="% Reprobación" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tendencia histórica */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Tendencia de Riesgo</h3>
              <p className="text-xs text-gray-500">Basada en snapshots mensuales. Genera uno nuevo para reflejar el estado actual.</p>
            </div>
            <button
              onClick={handleGenerarSnapshot}
              disabled={generandoSnapshot}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 flex items-center disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generandoSnapshot ? 'animate-spin' : ''}`} />
              {generandoSnapshot ? 'Generando...' : 'Generar snapshot'}
            </button>
          </div>
          {tendenciaRiesgo.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-12 text-center">
              Aún no hay snapshots históricos. Genera el primero con el botón de arriba.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={tendenciaRiesgo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="riesgo_alto" stroke="#dc2626" name="Alto" strokeWidth={2} />
                <Line type="monotone" dataKey="riesgo_medio" stroke="#facc15" name="Medio" strokeWidth={2} />
                <Line type="monotone" dataKey="riesgo_bajo" stroke="#4ade80" name="Bajo" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* FIN DEL NUEVO BLOQUE */}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Vista Previa de Datos a Exportar</h3>
          <span className="text-xs font-medium text-gray-500">{previewData.length} registros encontrados</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-white">
                <th className="p-4 pl-6">Matrícula</th>
                <th className="p-4">Nombre del Estudiante</th>
                <th className="p-4 text-center">Asistencia (%)</th>
                <th className="p-4 text-center">Promedio</th>
                <th className="p-4">Nivel de Riesgo (IA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingPreview ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Cargando vista previa...
                  </td>
                </tr>
              ) : previewData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-500">
                    No se encontraron estudiantes con los filtros aplicados. El reporte se exportará vacío.
                  </td>
                </tr>
              ) : (
                previewData.map((est) => (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50">
                    <td className="p-4 pl-6 text-sm font-medium text-gray-600">{est.matricula}</td>
                    <td className="p-4 font-bold text-gray-900">{est.nombre_completo}</td>
                    <td className="p-4 text-center text-sm text-gray-700">{est.porcentaje_asistencia}%</td>
                    <td className="p-4 text-center text-sm font-bold text-gray-700">{est.promedio_general}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md border ${
                        est.nivel_riesgo === 'Alto' ? 'bg-red-50 text-red-700 border-red-200' :
                        est.nivel_riesgo === 'Medio' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {est.nivel_riesgo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}