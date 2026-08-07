import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, ClipboardList, BarChart2, CalendarX } from 'lucide-react';
import { API_BASE_URL } from '../../config/api'; 

const DIAS_JS_A_ENUM = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function claseEnCurso(clase) {
  const ahora = new Date();
  const diaHoy = DIAS_JS_A_ENUM[ahora.getDay()];
  if (clase.dia_semana.toUpperCase() !== diaHoy) return false;

  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const [hIni, mIni] = clase.hora_inicio.split(':').map(Number);
  const [hFin, mFin] = clase.hora_fin.split(':').map(Number);
  const minutosInicio = hIni * 60 + mIni;
  const minutosFin = hFin * 60 + mFin;

  return horaActual >= minutosInicio && horaActual <= minutosFin;
}

function formatearFechaHoy() {
  const hoy = new Date();
  const texto = hoy.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DashboardDocente() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('${API_BASE_URL}/api/v1/mis-clases', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClases(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  const irAAsistencia = (clase) => {
    navigate('/asistencias', { state: { grupoPreseleccionado: clase.id_grupo } });
  };

  const irACalificaciones = (clase) => {
    navigate('/calificaciones', {
      state: { grupoPreseleccionado: clase.id_grupo, materiaPreseleccionada: clase.id_materia }
    });
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Mis clases de hoy</h2>
        <p className="text-sm text-gray-500">{formatearFechaHoy()}</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando tus clases...</div>
      ) : clases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center">
          <CalendarX className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 max-w-sm">
            No tienes materias ni horarios asignados todavía. Contacta a tu Director de carrera.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clases.map(clase => {
            const enCurso = claseEnCurso(clase);
            return (
              <div
                key={clase.id_horario}
                className={`relative bg-white rounded-2xl border border-gray-200 shadow-sm p-5 ${
                  enCurso ? 'border-l-4 border-l-eduPurple ring-1 ring-eduPurple/20' : ''
                }`}
              >
                {enCurso && (
                  <span className="absolute -top-2.5 right-4 bg-eduPurple text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                    En curso ahora
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900 mb-1">{clase.nombre_materia}</h3>
                <p className="text-sm text-gray-500 mb-3">{clase.nombre_grupo}</p>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span className="font-medium">
                    {clase.dia_semana} · {clase.hora_inicio} - {clase.hora_fin}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1 text-gray-400" /> {clase.num_alumnos}
                  </span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => irAAsistencia(clase)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-50 text-eduPurple rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Tomar asistencia
                  </button>
                  <button
                    onClick={() => irACalificaciones(clase)}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Ver calificaciones
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}