import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, AlertTriangle, Users, ChevronRight } from 'lucide-react';

export default function GestionCarreras() {
  const { token } = useAuth();
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/carreras/resumen', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  const colorRiesgo = (pct) => {
    if (pct >= 15) return 'text-red-600 bg-red-50 border-red-200';
    if (pct >= 8) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-green-700 bg-green-50 border-green-200';
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Gestión de Carreras</h2>
        <p className="text-sm text-gray-500">Panorama de riesgo académico por carrera y director asignado.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando carreras...</div>
      ) : carreras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-500">
          No hay carreras registradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carreras.map(c => (
            <div key={c.id_carrera} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mr-3">
                      <GraduationCap className="w-5 h-5 text-eduPurple" />
                    </div>
                    <h3 className="font-bold text-gray-900">{c.nombre}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center">
                      <Users className="w-3 h-3 mr-1" /> Estudiantes
                    </p>
                    <p className="text-xl font-black text-gray-900">{c.total_estudiantes}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${colorRiesgo(c.promedio_riesgo_alto_pct)}`}>
                    <p className="text-[10px] font-bold uppercase mb-1 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Riesgo Alto
                    </p>
                    <p className="text-xl font-black">{c.promedio_riesgo_alto_pct}%</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">Director</span>
                  {c.director_nombre || <span className="text-gray-400 italic">Sin asignar</span>}
                </div>
              </div>

              <Link
                to={`/carreras/${c.id_carrera}/riesgo-agregado`}
                className="flex items-center justify-center gap-1 w-full py-2.5 bg-indigo-50 text-eduPurple rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
              >
                Ver detalle de riesgo <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}