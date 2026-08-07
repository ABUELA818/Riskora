import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegistroAsistencia() {
  const { token, role } = useAuth();

  const [misClases, setMisClases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [horariosGrupo, setHorariosGrupo] = useState([]);

  const [estudiantes, setEstudiantes] = useState([]);
  const [riesgosMap, setRiesgosMap] = useState({});

  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [horarioSeleccionado, setHorarioSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [asistencia, setAsistencia] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  const esDocente = role === 'Docente';

  useEffect(() => {
    if (!token) return;

    if (esDocente) {
      fetch('http://localhost:8000/api/v1/mis-clases', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("No autorizado");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setMisClases(data);
            if (data.length > 0) {
              setHorarioSeleccionado(String(data[0].id_horario));
              setGrupoSeleccionado(String(data[0].id_grupo));
            }
          }
        })
        .catch(err => console.error("Error cargando mis clases:", err));
    } else {
      fetch('http://localhost:8000/api/v1/grupos', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("No autorizado");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setGrupos(data);
            if (data.length > 0) setGrupoSeleccionado(String(data[0].id_grupo));
          }
        })
        .catch(err => console.error("Error cargando grupos:", err));
    }
  }, [token, esDocente]);

  useEffect(() => {
    if (esDocente || !grupoSeleccionado || !token) return;

    fetch(`http://localhost:8000/api/v1/grupos/${grupoSeleccionado}/horarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHorariosGrupo(data);
          setHorarioSeleccionado(data.length > 0 ? String(data[0].id_horario) : '');
        } else {
          setHorariosGrupo([]);
          setHorarioSeleccionado('');
        }
      })
      .catch(err => console.error("Error cargando horarios del grupo:", err));
  }, [grupoSeleccionado, esDocente, token]);

  const handleSeleccionarClaseDocente = (idHorario) => {
    setHorarioSeleccionado(idHorario);
    const clase = misClases.find(c => String(c.id_horario) === String(idHorario));
    if (clase) setGrupoSeleccionado(String(clase.id_grupo));
  };

  useEffect(() => {
    if (!grupoSeleccionado || !fecha || !token) return;

    setIsLoading(true);
    setMensaje({ text: '', type: '' });
    setRiesgosMap({});

    Promise.all([
      fetch(`http://localhost:8000/api/v1/estudiantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`http://localhost:8000/api/v1/asistencia?grupo_id=${grupoSeleccionado}&fecha=${fecha}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
    ])
    .then(([estudiantesData, asistenciaData]) => {
      if (!Array.isArray(estudiantesData)) return;

      const estudiantesGrupo = estudiantesData.filter(e => e.id_grupo === parseInt(grupoSeleccionado));
      setEstudiantes(estudiantesGrupo);

      Promise.all(estudiantesGrupo.map(async est => {
        try {
          const r = await fetch(`http://localhost:8000/api/v1/estudiantes/${est.id_estudiante}/riesgo`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await r.json();
          return [est.id_estudiante, data];
        } catch (e) {
          return [est.id_estudiante, null];
        }
      })).then(entries => {
        setRiesgosMap(Object.fromEntries(entries));
      });

      const nuevoEstadoAsistencia = {};

      const registrosClase = Array.isArray(asistenciaData) && horarioSeleccionado
        ? asistenciaData.filter(r => String(r.id_horario) === String(horarioSeleccionado))
        : [];

      if (registrosClase.length > 0) {
        setIsEditing(true);
        registrosClase.forEach(reg => {
          nuevoEstadoAsistencia[reg.id_estudiante] = reg.estatus;
        });
      } else {
        setIsEditing(false);
        estudiantesGrupo.forEach(est => {
          nuevoEstadoAsistencia[est.id_estudiante] = 'Presente';
        });
      }
      setAsistencia(nuevoEstadoAsistencia);
    })
    .catch(err => setMensaje({ text: 'Error al cargar los datos.', type: 'error' }))
    .finally(() => setIsLoading(false));

  }, [grupoSeleccionado, horarioSeleccionado, fecha, token]);

  const handleStatusChange = (id_estudiante, estatus) => {
    setAsistencia(prev => ({ ...prev, [id_estudiante]: estatus }));
  };

  const marcarTodosPresentes = () => {
    const todosPresentes = {};
    estudiantes.forEach(est => {
      todosPresentes[est.id_estudiante] = 'Presente';
    });
    setAsistencia(todosPresentes);
  };

  const guardarAsistencia = async () => {
    if (!horarioSeleccionado) {
      setMensaje({ text: 'Selecciona una clase/horario válido antes de guardar.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMensaje({ text: '', type: '' });

    const payload = {
      grupo_id: parseInt(grupoSeleccionado),
      id_horario: parseInt(horarioSeleccionado),
      fecha: fecha,
      asistencias: Object.entries(asistencia).map(([id, estatus]) => ({
        id_estudiante: parseInt(id),
        estatus: estatus
      }))
    };

    try {
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch('http://localhost:8000/api/v1/asistencia', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        throw new Error('La asistencia ya fue registrada y el sistema bloqueó el duplicado.');
      }
      if (!response.ok) throw new Error('Error al guardar la asistencia.');

      setMensaje({ text: '¡Asistencia guardada correctamente!', type: 'success' });
      setIsEditing(true);
    } catch (error) {
      setMensaje({ text: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    }
  };

  const conteoPresentes = Object.values(asistencia).filter(s => s === 'Presente').length;

  const estilosRiesgo = {
    Alto: 'bg-red-100 text-red-800 border-red-200',
    Medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Bajo: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full relative">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Registro de Asistencia</h2>
          <p className="text-sm text-gray-500">Verifica y registra la asistencia para la sesión actual.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
          <div className="flex items-center px-3 sm:border-r border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent"
            />
          </div>

          {esDocente ? (
            <div className="flex items-center px-3">
              <BookOpen className="w-4 h-4 text-gray-500 mr-2" />
              <select
                value={horarioSeleccionado}
                onChange={e => handleSeleccionarClaseDocente(e.target.value)}
                className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent pr-8"
              >
                {misClases.length === 0 ? (
                  <option value="">Sin clases asignadas</option>
                ) : (
                  misClases.map(c => (
                    <option key={c.id_horario} value={c.id_horario}>
                      {c.nombre_materia} · {c.nombre_grupo} ({c.dia_semana} {c.hora_inicio}-{c.hora_fin})
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <>
              <div className="flex items-center px-3 sm:border-r border-gray-200">
                <Users className="w-4 h-4 text-gray-500 mr-2" />
                <select
                  value={grupoSeleccionado}
                  onChange={e => setGrupoSeleccionado(e.target.value)}
                  className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent pr-8"
                >
                  {grupos.map(g => (
                    <option key={g.id_grupo} value={g.id_grupo}>
                      {g.nombre_grupo} - {g.nombre_carrera || g.carrera}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center px-3">
                <BookOpen className="w-4 h-4 text-gray-500 mr-2" />
                <select
                  value={horarioSeleccionado}
                  onChange={e => setHorarioSeleccionado(e.target.value)}
                  className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent pr-8"
                >
                  {horariosGrupo.length === 0 ? (
                    <option value="">Sin horarios registrados</option>
                  ) : (
                    horariosGrupo.map(h => (
                      <option key={h.id_horario} value={h.id_horario}>
                        {h.nombre_materia} ({h.dia_semana} {h.hora_inicio}-{h.hora_fin})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {mensaje.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm flex items-center ${mensaje.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
          {mensaje.text}
        </div>
      )}

      {!horarioSeleccionado && !isLoading && (
        <div className="mx-6 mt-4 p-3 rounded-lg text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center">
          <XCircle className="w-4 h-4 mr-2" />
          {esDocente
            ? 'No tienes clases asignadas todavía. Contacta a tu Director de carrera.'
            : 'Este grupo no tiene horarios registrados; asigna uno en Gestión de Grupos antes de tomar asistencia.'}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 pt-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32 text-gray-500">Cargando lista de estudiantes...</div>
        ) : estudiantes.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-500">No hay estudiantes registrados en este grupo.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="pb-3 font-semibold">Foto</th>
                <th className="pb-3 font-semibold">Alumno</th>
                <th className="pb-3 font-semibold">Matrícula</th>
                <th className="pb-3 font-semibold w-1/4">Nivel de Riesgo</th>
                <th className="pb-3 font-semibold text-right">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estudiantes.map(est => {
                const estatus = asistencia[est.id_estudiante] || 'Presente';
                const riesgo = riesgosMap[est.id_estudiante];
                return (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${est.nombre_completo}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300"
                      />
                    </td>
                    <td className="py-3 font-medium text-gray-900">{est.nombre_completo}</td>
                    <td className="py-3 text-sm text-gray-500">{est.matricula}</td>
                    <td className="py-3">
                      {!riesgo ? (
                        <span className="text-xs text-gray-400">Calculando...</span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${estilosRiesgo[riesgo.nivel_riesgo] || estilosRiesgo.Bajo}`}>
                          Riesgo {riesgo.nivel_riesgo}
                        </span>
                      )}
                    </td>
                    <td className="py-3 flex justify-end">
                      <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => handleStatusChange(est.id_estudiante, 'Presente')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${estatus === 'Presente' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Presente
                        </button>
                        <button
                          onClick={() => handleStatusChange(est.id_estudiante, 'Retardo')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${estatus === 'Retardo' ? 'bg-yellow-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Retardo
                        </button>
                        <button
                          onClick={() => handleStatusChange(est.id_estudiante, 'Ausente')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${estatus === 'Ausente' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Faltante
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center rounded-b-lg">
        <span className="text-sm text-gray-600 font-medium mb-3 md:mb-0">
          {conteoPresentes} de {estudiantes.length} estudiantes presentes
        </span>

        <div className="flex space-x-3">
          <button
            onClick={marcarTodosPresentes}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Marcar todos presentes
          </button>
          <button
            onClick={guardarAsistencia}
            disabled={isLoading || estudiantes.length === 0 || !horarioSeleccionado}
            className="px-6 py-2 text-sm font-medium text-white bg-eduPurple border border-transparent rounded-lg hover:bg-opacity-90 disabled:bg-gray-400 transition-colors shadow-sm"
          >
            {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar Asistencia' : 'Guardar Asistencia')}
          </button>
        </div>
      </div>
    </div>
  );
}