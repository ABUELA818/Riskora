import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, ExternalLink } from 'lucide-react';
import SimulationBadge from '../../components/SimulationBadge';

export default function CasosEscalados() {
  const { token } = useAuth();
  const [casos, setCasos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:8000/api/v1/casos-escalados`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCasos(data);
        if (data.length > 0) setSeleccionado(data[0]);
      });
  }, [token]);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full flex flex-col h-screen">
      <SimulationBadge />

      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bandeja de Entrada: Psicopedagogía</h2>
          <p className="text-sm text-gray-500">Casos escalados para seguimiento especializado y resolución.</p>
        </div>
        <button className="bg-eduPurple text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Caso Manual
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        <div className="w-2/3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center">Casos Activos</h3>
            <select className="text-sm border border-gray-300 rounded-md p-1"><option>Todos los Riesgos</option></select>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <th className="p-4">Estudiante</th>
                  <th className="p-4">Escalado Por</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {casos.length === 0 ? (
                  <tr><td colSpan="3" className="p-6 text-center text-gray-500">No hay casos escalados.</td></tr>
                ) : (
                  casos.map(caso => (
                    <tr 
                      key={caso.id_estudiante} 
                      onClick={() => setSeleccionado(caso)}
                      className={`cursor-pointer transition-colors ${seleccionado?.id_estudiante === caso.id_estudiante ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{caso.nombre_completo}</p>
                        <p className="text-xs text-gray-500">{caso.matricula}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{caso.tutor_nombre}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded text-center">Urgente</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {seleccionado && (
          <div className="w-1/3 flex flex-col gap-6 overflow-y-auto">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{seleccionado.nombre_completo}</h3>
                  <p className="text-xs text-gray-500">ID: {seleccionado.matricula}</p>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Riesgo Alto
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Motivo de Escalada ({seleccionado.tutor_nombre})</p>
                <p className="text-sm text-gray-700 italic">"{seleccionado.ultimo_acuerdo}"</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">Notas de Seguimiento (Internas)</label>
                  <textarea className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm h-24 focus:ring-eduPurple" placeholder="Documentar análisis inicial..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Actualizar Estado</label>
                    <select className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm"><option>En Revisión</option></select>
                  </div>
                </div>
                <button className="w-full bg-eduPurple text-white py-2.5 rounded-lg text-sm font-bold shadow-sm">Guardar Registro</button>
                <Link to={`/estudiantes/${seleccionado.id_estudiante}/intervenciones`} className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center hover:bg-gray-50">
                  Ir a Bitácora Completa <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}