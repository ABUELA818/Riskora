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
 
  // Agrupar por materia
  const porMateria = {};
  historial.forEach(c => {
    if (!porMateria[c.id_materia]) {
      porMateria[c.id_materia] = { nombre: c.nombre_materia, registros: [] };
    }
    porMateria[c.id_materia].registros.push(c);
  });

  return (
    <div className="lg:col-span-3 space-y-4">
      {Object.entries(porMateria).map(([idMateria, data]) => {
        const promedio = (data.registros.reduce((acc, r) => acc + r.valor, 0) / data.registros.length).toFixed(1);
        const esRiesgo = parseFloat(promedio) < 60;

        // Agrupar por periodo dentro de la materia
        const porPeriodo = {};
        data.registros.forEach(r => {
          if (!porPeriodo[r.id_periodo]) porPeriodo[r.id_periodo] = { nombre: r.nombre_periodo, parciales: [] };
          porPeriodo[r.id_periodo].parciales.push(r);
        });

        return (
          <div key={idMateria} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center">
                <BookOpen className="w-5 h-5 text-eduPurple mr-2" />
                <h4 className="font-bold text-gray-900">{data.nombre}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${esRiesgo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                Promedio: {promedio}
              </span>
            </div>
            <div className="p-5 space-y-3">
              {Object.entries(porPeriodo).map(([idPeriodo, pdata]) => (
                <div key={idPeriodo} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{pdata.nombre}</span>
                  <div className="flex gap-2">
                    {pdata.parciales
                      .sort((a, b) => a.parcial - b.parcial)
                      .map(p => (
                        <span key={p.parcial} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-700">
                          P{p.parcial}: {p.valor}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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