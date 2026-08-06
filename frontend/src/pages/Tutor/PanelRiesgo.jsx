import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Eye, FileText, ClipboardList } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function PanelRiesgo() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [riesgosMap, setRiesgosMap] = useState({});
  const [filtroRiesgo, setFiltroRiesgo] = useState('Todos');

  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:8000/api/v1/estudiantes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(async data => {
        if (!Array.isArray(data)) return;
        setEstudiantes(data);

        const mapa = {};
        await Promise.all(data.map(async est => {
          try {
            const r = await fetch(`http://localhost:8000/api/v1/estudiantes/${est.id_estudiante}/riesgo`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const riesgoData = await r.json();
            mapa[est.id_estudiante] = riesgoData;
          } catch (e) {
            console.error(e);
          }
        }));
        setRiesgosMap(mapa);
      });
  }, [token]);

  const filtrados = estudiantes.filter(est => {
    const riesgo = riesgosMap[est.id_estudiante]?.nivel_riesgo;
    if (filtroRiesgo === 'Todos') return true;
    return riesgo === filtroRiesgo;
  });

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <SimulationBadge />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Panel de Alumnos en Riesgo</h2>
          <p className="text-sm text-gray-500">Análisis predictivo impulsado por IA para cohortes activas.</p>
        </div>

        <div className="flex space-x-2 bg-white border border-gray-200 rounded-lg p-1">
          {['Todos', 'Alto', 'Medio', 'Bajo'].map(nivel => (
            <button
              key={nivel}
              onClick={() => setFiltroRiesgo(nivel)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${filtroRiesgo === nivel ? 'bg-eduPurple text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {nivel}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 pl-6">Estudiante</th>
                <th className="p-4">Matrícula</th>
                <th className="p-4">Nivel de Riesgo</th>
                <th className="p-4">Score IA</th>
                <th className="p-4 text-right pr-6">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No se encontraron registros de riesgo.</td></tr>
              ) : (
                filtrados.map(est => {
                  const r = riesgosMap[est.id_estudiante];
                  const nivel = r?.nivel_riesgo || 'Calculando...';
                  
                  let badgeColor = 'bg-green-100 text-green-800 border-green-200';
                  if (nivel === 'Alto') badgeColor = 'bg-red-100 text-red-800 border-red-200';
                  if (nivel === 'Medio') badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';

                  return (
                    <tr key={est.id_estudiante} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-gray-900">{est.nombre_completo}</td>
                      <td className="p-4 text-sm text-gray-600">{est.matricula}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                          Riesgo {nivel}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-mono font-bold text-gray-700">
                        {r ? `${Math.round(r.score * 100)} / 100` : '...'}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/estudiantes/${est.id_estudiante}/analisis`)}
                            title="Ver análisis predictivo de IA"
                            className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-eduPurple px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> Analizar
                          </button>
                          <button
                            onClick={() => navigate(`/estudiantes/${est.id_estudiante}/expediente`)}
                            title="Ver expediente completo del alumno"
                            className="inline-flex items-center text-xs font-semibold bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Expediente
                          </button>
                          <button
                            onClick={() => navigate(`/estudiantes/${est.id_estudiante}/intervenciones`)}
                            title="Ir a la bitácora de intervenciones del alumno"
                            className="inline-flex items-center text-xs font-semibold bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                          >
                            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Bitácora
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}