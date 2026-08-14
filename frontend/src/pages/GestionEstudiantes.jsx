import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Edit, Trash2, Eye, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api'; 

const FORM_EDIT_INICIAL = {
  nombre_completo: '',
  id_grupo: '',
  fecha_ingreso: '',
  datos_socioeconomicos: '',
  edad: '',
  celular: '',
  fotografia_url: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_telefono: ''
};

export default function GestionEstudiantes() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(true);
  const [carreras, setCarreras] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [filtros, setFiltros] = useState({ carrera: '', grupo: '', nivel_riesgo: '' });
  const [resumenRiesgo, setResumenRiesgo] = useState({ bajo: 0, medio: 0, alto: 0, total_estudiantes: 0 });

  // Edición
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [estudianteEditando, setEstudianteEditando] = useState(null);
  const [formEdit, setFormEdit] = useState(FORM_EDIT_INICIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/carreras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); });

    fetch(`${API_BASE_URL}/api/v1/grupos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGrupos(data); });
  }, [token]);

  const fetchEstudiantes = () => {
    if (!token) return;
    setLoadingEstudiantes(true); 
    const query = new URLSearchParams(
      Object.entries(filtros).filter(([_, v]) => v !== '')
    ).toString();

    fetch(`${API_BASE_URL}/api/v1/estudiantes?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setEstudiantes(data); })
      .catch(err => console.error(err))
      .finally(() => setLoadingEstudiantes(false));
  };

  useEffect(() => {
    fetchEstudiantes();
  }, [filtros, token]); 

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filtros.carrera) params.append('carrera', filtros.carrera);

    fetch(`${API_BASE_URL}/api/v1/riesgo/resumen?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setResumenRiesgo(data))
      .catch(err => console.error(err));
  }, [filtros.carrera, token]);

  const handleSoftDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este estudiante?')) return;
    
    await fetch(`${API_BASE_URL}/api/v1/estudiantes/${id}`, { method: 'DELETE' });
    setEstudiantes(estudiantes.filter(e => e.id_estudiante !== id));
  };

  const abrirModalEditar = (est) => {
    setEstudianteEditando(est);
    setFormEdit({
      nombre_completo: est.nombre_completo || '',
      id_grupo: est.id_grupo ? String(est.id_grupo) : '',
      fecha_ingreso: est.fecha_ingreso ? est.fecha_ingreso.split('T')[0] : '',
      datos_socioeconomicos: est.datos_socioeconomicos || '',
      edad: est.edad ?? '',
      celular: est.celular || '',
      fotografia_url: est.fotografia_url || '',
      contacto_emergencia_nombre: est.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: est.contacto_emergencia_telefono || ''
    });
    setEditError('');
    setModalEditOpen(true);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setEditError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/estudiantes/${estudianteEditando.id_estudiante}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formEdit,
          id_grupo: formEdit.id_grupo ? parseInt(formEdit.id_grupo) : null,
          edad: formEdit.edad === '' ? null : parseInt(formEdit.edad)
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo actualizar el estudiante.');
      }

      const actualizado = await response.json();
      setEstudiantes(prev => prev.map(e => e.id_estudiante === actualizado.id_estudiante ? { ...e, ...actualizado } : e));
      setModalEditOpen(false);
    } catch (error) {
      setEditError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const estilosRiesgo = {
    Alto: 'bg-red-100 text-red-800 border-red-200',
    Medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Bajo: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Directorio de Estudiantes</h2>
          {state?.message && <p className="text-sm text-green-600 mt-1">{state.message}</p>}
        </div>
        <Link to="/estudiantes/nuevo" className="bg-eduPurple text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-red-200 border-l-4 border-l-red-600 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Riesgo Crítico</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.alto}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-yellow-200 border-l-4 border-l-yellow-500 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Riesgo Moderado</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.medio}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total de Estudiantes</p>
          <h3 className="text-3xl font-black text-gray-900">{resumenRiesgo.total_estudiantes}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <select 
          className="border border-gray-300 rounded-md p-2 text-sm"
          value={filtros.carrera}
          onChange={e => setFiltros({ ...filtros, carrera: e.target.value })}
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>)}
        </select>
        <input 
          type="text" placeholder="Filtrar por grupo..." 
          className="border border-gray-300 rounded-md p-2 text-sm"
          onChange={e => setFiltros({ ...filtros, grupo: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-md p-2 text-sm"
          value={filtros.nivel_riesgo}
          onChange={e => setFiltros({ ...filtros, nivel_riesgo: e.target.value })}
        >
          <option value="">Todos los niveles de riesgo</option>
          <option value="Alto">Riesgo Alto</option>
          <option value="Medio">Riesgo Medio</option>
          <option value="Bajo">Riesgo Bajo</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">Matrícula</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Carrera</th>
              <th className="p-3">Grupo</th>
              <th className="p-3">Nivel de Riesgo</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loadingEstudiantes ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-400">Cargando estudiantes...</td></tr>
            ) : estudiantes.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">No se encontraron estudiantes.</td></tr>
            ) : (
              estudiantes.map(est => {
                const nivel = est.nivel_riesgo;
                return (
                  <tr key={est.id_estudiante} className="hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-gray-900">{est.matricula}</td>
                    <td className="p-3 text-sm text-gray-600">{est.nombre_completo}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {est.nombre_carrera || <span className="text-gray-400 italic">Sin carrera</span>}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {est.nombre_grupo || <span className="text-gray-400 italic">Sin asignar</span>}
                    </td>
                    <td className="p-3">
                      {!nivel ? (
                        <span className="text-xs text-gray-400">Sin datos</span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${estilosRiesgo[nivel]}`}>
                          {nivel}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm flex justify-center space-x-3">
                      <button
                        onClick={() => navigate(`/estudiantes/${est.id_estudiante}/expediente`)}
                        title="Ver expediente"
                        className="text-gray-400 hover:text-eduPurple"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirModalEditar(est)}
                        title="Editar estudiante"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <Link
                        to="/estudiantes/baja"
                        title="Dar de baja"
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Editar Estudiante</h3>
              <button onClick={() => setModalEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={guardarEdicion} className="p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                <input
                  required type="text"
                  value={formEdit.nombre_completo}
                  onChange={e => setFormEdit({ ...formEdit, nombre_completo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Grupo</label>
                <select
                  value={formEdit.id_grupo}
                  onChange={e => setFormEdit({ ...formEdit, id_grupo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                >
                  <option value="">Sin asignar</option>
                  {grupos.map(g => (
                    <option key={g.id_grupo} value={g.id_grupo}>{g.nombre_grupo} - {g.nombre_carrera}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Fecha de Ingreso</label>
                <input
                  required type="date"
                  value={formEdit.fecha_ingreso}
                  onChange={e => setFormEdit({ ...formEdit, fecha_ingreso: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Edad</label>
                  <input
                    type="number" min="14" max="99"
                    value={formEdit.edad}
                    onChange={e => setFormEdit({ ...formEdit, edad: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Celular</label>
                  <input
                    type="text"
                    value={formEdit.celular}
                    onChange={e => setFormEdit({ ...formEdit, celular: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Contacto de Emergencia (Nombre)</label>
                <input
                  type="text"
                  value={formEdit.contacto_emergencia_nombre}
                  onChange={e => setFormEdit({ ...formEdit, contacto_emergencia_nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono de Emergencia</label>
                <input
                  type="text"
                  value={formEdit.contacto_emergencia_telefono}
                  onChange={e => setFormEdit({ ...formEdit, contacto_emergencia_telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">URL de Imagen de Perfil</label>
                <input
                  type="text"
                  value={formEdit.fotografia_url}
                  onChange={e => setFormEdit({ ...formEdit, fotografia_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
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
    </div>
  );
}