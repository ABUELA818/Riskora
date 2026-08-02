import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // <-- Importamos nuestro contexto

export default function RegistroAsistencia() {
  const { token } = useAuth(); // <-- Sacamos el token de la memoria
  
  const [grupos, setGrupos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  const [asistencia, setAsistencia] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  // 1. Cargar grupos al montar el componente
  useEffect(() => {
    // Si no hay token, ni intentamos hacer la petición
    if (!token) return;

    fetch('http://localhost:8000/api/v1/grupos', {
      headers: { 'Authorization': `Bearer ${token}` } // <-- Mandamos el token
    })
      .then(res => {
        if (!res.ok) throw new Error("No autorizado");
        return res.json();
      })
      .then(data => {
        // Validamos que sí sea un arreglo para que no truene el .map()
        if (Array.isArray(data)) {
          setGrupos(data);
          if (data.length > 0) setGrupoSeleccionado(data[0].id_grupo);
        }
      })
      .catch(err => console.error("Error cargando grupos:", err));
  }, [token]);

  // 2. Cargar estudiantes y asistencia existente cuando cambia grupo o fecha
  useEffect(() => {
    if (!grupoSeleccionado || !fecha || !token) return;
    
    setIsLoading(true);
    setMensaje({ text: '', type: '' });

    // Mandamos el token en ambas peticiones concurrentes
    Promise.all([
      fetch(`http://localhost:8000/api/v1/estudiantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`http://localhost:8000/api/v1/asistencia?grupo_id=${grupoSeleccionado}&fecha=${fecha}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
    ])
    .then(([estudiantesData, asistenciaData]) => {
      // Validación extra por si el token expiró y nos devuelve un objeto de error
      if (!Array.isArray(estudiantesData)) return;

      const estudiantesGrupo = estudiantesData.filter(e => e.id_grupo === parseInt(grupoSeleccionado));
      setEstudiantes(estudiantesGrupo);

      const nuevoEstadoAsistencia = {};
      
      if (Array.isArray(asistenciaData) && asistenciaData.length > 0) {
        setIsEditing(true);
        asistenciaData.forEach(reg => {
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

  }, [grupoSeleccionado, fecha, token]);

  // Funciones de control
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
    setIsLoading(true);
    setMensaje({ text: '', type: '' });

    const payload = {
      grupo_id: parseInt(grupoSeleccionado),
      id_horario: 1, 
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
          'Authorization': `Bearer ${token}` // <-- Token al guardar
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full relative">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Registro de Asistencia</h2>
          <p className="text-sm text-gray-500">Verifica y registra la asistencia para la sesión actual.</p>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
          <div className="flex items-center px-3 border-r border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <input 
              type="date" 
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent"
            />
          </div>
          <div className="flex items-center px-3">
            <Users className="w-4 h-4 text-gray-500 mr-2" />
            <select 
              value={grupoSeleccionado}
              onChange={e => setGrupoSeleccionado(e.target.value)}
              className="border-none text-sm focus:ring-0 text-gray-700 bg-transparent pr-8"
            >
              {grupos.map(g => (
                <option key={g.id_grupo} value={g.id_grupo}>{g.nombre_grupo} - {g.carrera}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {mensaje.text && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm flex items-center ${mensaje.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
          {mensaje.text}
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
                <th className="pb-3 font-semibold w-1/4">Rendimiento Histórico</th>
                <th className="pb-3 font-semibold text-right">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estudiantes.map(est => {
                const estatus = asistencia[est.id_estudiante] || 'Presente';
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
                      <div className="w-3/4 bg-gray-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${estatus === 'Ausente' ? 'bg-yellow-400 w-1/2' : 'bg-green-600 w-4/5'}`}></div>
                      </div>
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
            disabled={isLoading || estudiantes.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-eduPurple border border-transparent rounded-lg hover:bg-opacity-90 disabled:bg-gray-400 transition-colors shadow-sm"
          >
            {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar Asistencia' : 'Guardar Asistencia')}
          </button>
        </div>
      </div>
    </div>
  );
}