import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function HistorialAcademicoTab({ historial, idEstudiante, token }) {
  const [historialPrevio, setHistorialPrevio] = useState([]);

  useEffect(() => {
    if (!token || !idEstudiante) return;
    fetch(`${API_BASE_URL}/api/v1/estudiantes/${idEstudiante}/historial-previo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setHistorialPrevio(data); })
      .catch(err => console.error(err));
  }, [idEstudiante, token]);

  if (!historial || historial.length === 0) {
    return (
      <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 min-h-[300px] flex items-center justify-center">
        Sin calificaciones registradas todavía.
      </div>
    );
  }

  // Nuevo formato: directo por parcial (sin agrupar por materia/periodo)
  const promedioGeneral = (historial.reduce((acc, c) => acc + (c.promedio || 0), 0) / historial.length).toFixed(1);
  const esRiesgo = parseFloat(promedioGeneral) < 60;

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 text-eduPurple mr-2" />
            <h4 className="font-bold text-gray-900">Historial de Calificaciones</h4>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${esRiesgo ? 'bg-risk-high-bg text-risk-high-fg' : 'bg-risk-low-bg text-risk-low-fg'}`}>
            Promedio General: {promedioGeneral}
          </span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {historial
              .sort((a, b) => a.parcial - b.parcial)
              .map(c => (
                <div key={`${c.parcial}-${c.fecha_registro}`} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Parcial {c.parcial}</span>
                    {c.fecha_registro && (
                      <span className="text-xs text-gray-400">
                        {new Date(c.fecha_registro).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {c.promedio !== null && c.promedio !== undefined ? c.promedio.toFixed(1) : 'N/A'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
      {/* NUEVO — F2.3: Historial académico preuniversitario */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center">
          <GraduationCap className="w-5 h-5 text-eduPurple mr-2" />
          <h4 className="font-bold text-gray-900">Historial Académico Preuniversitario</h4>
        </div>
        <div className="p-5">
          {historialPrevio.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Sin historial preuniversitario registrado.</p>
          ) : (
            <div className="space-y-3">
              {historialPrevio.map(h => (
                <div key={h.id_historial} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{h.institucion}</p>
                    <p className="text-xs text-gray-500">{h.nivel}{h.periodo ? ` · ${h.periodo}` : ''}</p>
                  </div>
                  {h.documento_url && (
                    <a
                      href={h.documento_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-eduPurple hover:underline"
                    >
                      Ver documento <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}