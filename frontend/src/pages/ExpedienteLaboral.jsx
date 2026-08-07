import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Phone, Users, Edit2, UserX, UserCheck, X,
  Plus, BookOpen, FileText, Clock, ShieldAlert, AlertTriangle
} from 'lucide-react';

export default function ExpedienteLaboral() {
  const { id } = useParams();
  const { token, role } = useAuth();

  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: '', telefono: '', telefono_familiar: '', imagen_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const puedeEditar = role === 'RRHH' || role === 'Administrador';
  const puedeCambiarRol = role === 'RRHH' || role === 'Administrador';

  const [modalRolOpen, setModalRolOpen] = useState(false);
  const [nuevoRol, setNuevoRol] = useState('');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [rolError, setRolError] = useState('');

  const cargarExpediente = () => {
    if (!token || !id) return;
    fetch(`http://localhost:8000/api/v1/personal/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar el expediente');
        return res.json();
      })
      .then(data => {
        setExpediente(data);
        setFormData({
          nombre_completo: data.nombre_completo || '',
          telefono: data.telefono || '',
          telefono_familiar: data.telefono_familiar || '',
          imagen_url: data.imagen_url || ''
        });
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    cargarExpediente();
  }, [id, token]);

  useEffect(() => {
    if (!token || !expediente || expediente.rol !== 'Docente') return;
    fetch('http://localhost:8000/api/v1/materias', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMateriasDisponibles(data); })
      .catch(err => console.error(err));
  }, [token, expediente]);

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch(`http://localhost:8000/api/v1/personal/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar los datos.');
      }
      const actualizado = await response.json();
      setExpediente(actualizado);
      setModalEditarOpen(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCambiarEstado = async () => {
    const nuevoEstado = !expediente.estado;
    const confirmMsg = nuevoEstado
      ? `¿Reactivar a ${expediente.nombre_completo}?`
      : `¿Dar de baja a ${expediente.nombre_completo}? Su sesión activa será invalidada.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/personal/${id}/estado?activo=${nuevoEstado}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo actualizar el estado.');
      setExpediente(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (error) {
      alert(error.message);
    }
  };

  const abrirModalRol = () => {
    setNuevoRol(expediente.rol);
    setRolError('');
    setModalRolOpen(true);
  };

  const handleCambiarRol = async (e) => {
    e.preventDefault();
    if (nuevoRol === expediente.rol) {
      setRolError('Selecciona un rol distinto al actual.');
      return;
    }
    setIsChangingRole(true);
    setRolError('');
    try {
      const response = await fetch(`http://localhost:8000/api/v1/usuarios/${id}/rol`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevo_rol: nuevoRol })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo cambiar el rol.');
      }
      setModalRolOpen(false);
      cargarExpediente();
    } catch (error) {
      setRolError(error.message);
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleAgregarMateria = async () => {
    if (!materiaSeleccionada) return;
    setIsAssigning(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/personal/${id}/materias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_materia: parseInt(materiaSeleccionada) })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al asignar materia.');
      }
      setMateriaSeleccionada('');
      cargarExpediente();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleQuitarMateria = async (id_materia, nombre) => {
    if (!window.confirm(`¿Quitar "${nombre}" de las materias que imparte?`)) return;
    try {
      const response = await fetch(`http://localhost:8000/api/v1/personal/${id}/materias/${id_materia}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo quitar la materia.');
      setExpediente(prev => ({
        ...prev,
        materias_impartidas: prev.materias_impartidas.filter(m => m.id_materia !== id_materia)
      }));
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading || !expediente) {
    return <div className="p-8 text-gray-500">Cargando expediente laboral...</div>;
  }

  const materiasNoAsignadasIds = new Set(expediente.materias_impartidas.map(m => m.id_materia));
  const opcionesMaterias = materiasDisponibles.filter(m => !materiasNoAsignadasIds.has(m.id_materia));

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex items-start">
          <img
            src={expediente.imagen_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${expediente.nombre_completo}`}
            alt="avatar"
            className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-50 mr-6 object-cover"
          />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{expediente.nombre_completo}</h2>
              <span className="px-3 py-1 bg-indigo-50 text-eduPurple text-xs font-bold rounded-full border border-indigo-100">
                {expediente.rol}
              </span>
              {expediente.estado ? (
                <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded">Activo</span>
              ) : (
                <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded">Inactivo</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">Antigüedad: {expediente.antiguedad_texto}</p>

            {expediente.carreras.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {expediente.carreras.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex items-center">
                    <Users className="w-3 h-3 mr-1" /> {c}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <a href={`mailto:${expediente.correo}`} className="flex items-center hover:text-eduPurple">
                <Mail className="w-4 h-4 mr-1.5" /> {expediente.correo}
              </a>
              <span className="flex items-center">
                <Phone className="w-4 h-4 mr-1.5" /> {expediente.telefono || 'No registrado'}
              </span>
              <span className="flex items-center text-gray-500">
                <Phone className="w-4 h-4 mr-1.5" /> Familiar: {expediente.telefono_familiar || 'No registrado'}
              </span>
            </div>
          </div>
        </div>

        {puedeEditar && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => { setFormError(''); setModalEditarOpen(true); }}
              className="px-4 py-2 bg-indigo-50 text-eduPurple rounded-lg text-sm font-bold hover:bg-indigo-100 flex items-center justify-center"
            >
              <Edit2 className="w-4 h-4 mr-2" /> Editar datos
            </button>
            {puedeCambiarRol && (
              <button
                onClick={abrirModalRol}
                className="px-4 py-2 bg-purple-50 text-eduPurple border border-purple-100 rounded-lg text-sm font-bold hover:bg-purple-100 flex items-center justify-center"
              >
                <ShieldAlert className="w-4 h-4 mr-2" /> Cambiar rol
              </button>
            )}
            <button
              onClick={handleCambiarEstado}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center border ${
                expediente.estado
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}
            >
              {expediente.estado ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
              {expediente.estado ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        )}
      </div>

      {expediente.rol === 'Docente' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Materias que imparte */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-eduPurple" /> Materias que imparte
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {expediente.materias_impartidas.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Sin materias asignadas.</p>
              ) : (
                expediente.materias_impartidas.map(m => (
                  <span
                    key={m.id_materia}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full flex items-center"
                  >
                    {m.nombre_materia}
                    <button
                      onClick={() => handleQuitarMateria(m.id_materia, m.nombre_materia)}
                      className="ml-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <select
                value={materiaSeleccionada}
                onChange={e => setMateriaSeleccionada(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-eduPurple bg-white"
              >
                <option value="">Selecciona una materia...</option>
                {opcionesMaterias.map(m => (
                  <option key={m.id_materia} value={m.id_materia}>{m.nombre_materia}</option>
                ))}
              </select>
              <button
                onClick={handleAgregarMateria}
                disabled={!materiaSeleccionada || isAssigning}
                className="px-4 py-2 bg-eduPurple text-white rounded-lg text-sm font-bold hover:bg-opacity-90 disabled:opacity-50 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </button>
            </div>
          </div>

          {/* Observaciones enviadas */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-eduPurple" /> Observaciones de conducta enviadas
            </h3>
            {expediente.observaciones_enviadas.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sin observaciones registradas.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expediente.observaciones_enviadas.map(o => (
                  <div key={o.id_observacion} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-gray-800">{o.nombre_estudiante}</span>
                      <span className="text-xs text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {new Date(o.fecha_registro).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded mb-1">
                      {o.etiqueta}
                    </span>
                    {o.nota && <p className="text-sm text-gray-600">{o.nota}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal editar datos */}
      {modalEditarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Editar Datos Personales</h3>
              <button onClick={() => setModalEditarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={formData.nombre_completo}
                  onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono de Familiar</label>
                <input
                  type="text"
                  value={formData.telefono_familiar}
                  onChange={e => setFormData({ ...formData, telefono_familiar: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">URL de Imagen de Perfil</label>
                <input
                  type="text"
                  value={formData.imagen_url}
                  onChange={e => setFormData({ ...formData, imagen_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setModalEditarOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal cambiar rol */}
      {modalRolOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Cambiar Rol</h3>
              <button onClick={() => setModalRolOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCambiarRol} className="p-6 space-y-4">
              {rolError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {rolError}
                </div>
              )}

              <p className="text-sm text-gray-600">
                Rol actual de <strong className="text-gray-900">{expediente.nombre_completo}</strong>:{' '}
                <span className="font-bold">{expediente.rol}</span>
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nuevo Rol</label>
                <select
                  value={nuevoRol}
                  onChange={e => setNuevoRol(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                >
                  <option value="Docente">Docente</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Director">Director de Carrera</option>
                  <option value="Psicopedagogia">Psicopedagogía</option>
                  <option value="RRHH">Recursos Humanos</option>
                </select>
              </div>

              <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">
                  Al guardar, la sesión actual de este usuario será invalidada automáticamente. Deberá iniciar sesión de nuevo para acceder con sus nuevos privilegios.
                </p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setModalRolOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingRole}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 disabled:opacity-70"
                >
                  {isChangingRole ? 'Aplicando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}