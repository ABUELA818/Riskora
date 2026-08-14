import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api'; 
import {
  UserPlus, X, Plus, Download, Upload, Loader2, CheckCircle,
  AlertTriangle, Calendar, Trash2, X as CloseIcon, Info, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const FORM_GRUPO_INICIAL = {
  nombre_grupo: '',
  cuatrimestre: '',
  id_tutor: '',
  id_carrera: ''
};

export default function GestionGrupos() {
  const { token, role } = useAuth();
  const location = useLocation();
  const [grupos, setGrupos] = useState([]);
  const [idCarrera, setIdCarrera] = useState(null);
  const [docentesTutores, setDocentesTutores] = useState([]);
  const [carreras, setCarreras] = useState([]);

  // Modal reasignar tutor (ya existía)
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [nuevoDocenteId, setNuevoDocenteId] = useState('');

  // Modal nuevo grupo
  const [modalGrupoOpen, setModalGrupoOpen] = useState(false);
  const [formGrupo, setFormGrupo] = useState(FORM_GRUPO_INICIAL);
  const [isSavingGrupo, setIsSavingGrupo] = useState(false);
  const [formGrupoError, setFormGrupoError] = useState('');

  // Importación de alumnos
  const [importandoGrupoId, setImportandoGrupoId] = useState(null);
  const [resultadoImport, setResultadoImport] = useState(null);

  const [materias, setMaterias] = useState([]);
  const [docentesCatalogo, setDocentesCatalogo] = useState([]);

  const [modalHorarioOpen, setModalHorarioOpen] = useState(false);
  const [grupoHorario, setGrupoHorario] = useState(null);
  const [horariosActuales, setHorariosActuales] = useState([]);
  const [filasNuevas, setFilasNuevas] = useState([{ id_materia: '', id_docente: '', dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_aula: '' }]);
  const [isSavingHorarios, setIsSavingHorarios] = useState(false);
  const [erroresHorario, setErroresHorario] = useState([]);
  const [mensajeHorario, setMensajeHorario] = useState('');

  const [riesgoPorGrupo, setRiesgoPorGrupo] = useState({});
  const [grupoPanel, setGrupoPanel] = useState(null);
  const [horariosPanel, setHorariosPanel] = useState([]);
  const [filtroCuatrimestre, setFiltroCuatrimestre] = useState('');
  const [filtroTutor, setFiltroTutor] = useState('');

  const cargarGrupos = () => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/grupos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGrupos(data); });
  };

  useEffect(() => {
  if (!token || !idCarrera) return;
  fetch(`${API_BASE_URL}/api/v1/carreras/${idCarrera}/riesgo-agregado-por-grupo`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;
      const mapa = {};
      data.forEach(g => { mapa[g.id_grupo] = g; });
      setRiesgoPorGrupo(mapa);
    })
    .catch(err => console.error(err));
  }, [token, idCarrera]);

  const abrirPanelGrupo = (grupo) => {
    setGrupoPanel(grupo);
    setHorariosPanel([]);
    fetch(`${API_BASE_URL}/api/v1/grupos/${grupo.id_grupo}/horarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setHorariosPanel(data); })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!location.state?.grupoAAbrir || grupos.length === 0) return;
    const grupo = grupos.find(g => g.id_grupo === location.state.grupoAAbrir);
    if (grupo) abrirPanelGrupo(grupo);
  }, [grupos, location.state]);

  const cerrarPanelGrupo = () => setGrupoPanel(null);

  const cuatrimestresDisponibles = [...new Set(grupos.map(g => g.cuatrimestre).filter(Boolean))].sort((a, b) => a - b);
  const tutoresDisponibles = docentesTutores;

  const gruposFiltrados = grupos.filter(g => {
    const matchCuatri = !filtroCuatrimestre || g.cuatrimestre === parseInt(filtroCuatrimestre);
    const matchTutor = !filtroTutor || g.id_tutor === parseInt(filtroTutor);
    return matchCuatri && matchTutor;
  });

  useEffect(() => {
    if (!token || role === 'Director') return;
    fetch(`${API_BASE_URL}/api/v1/carreras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); })
      .catch(err => console.error(err));
  }, [token, role]);

  useEffect(() => {
  if (!token) return;
  cargarGrupos();

  fetch(`${API_BASE_URL}/api/v1/director/mi-carrera`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.ok ? res.json() : null)
    .then(data => { if (data) setIdCarrera(data.id_carrera); })
    .catch(err => console.error(err));

  fetch(`${API_BASE_URL}/api/v1/personal?rol=Tutor`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => { if (Array.isArray(data)) setDocentesTutores(data); })
    .catch(err => console.error(err));

  fetch(`${API_BASE_URL}/api/v1/materias`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => { if (Array.isArray(data)) setMaterias(data); })
    .catch(err => console.error(err));

  fetch(`${API_BASE_URL}/api/v1/docentes-catalogo`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => { if (Array.isArray(data)) setDocentesCatalogo(data); })
    .catch(err => console.error(err));
  }, [token]);

  const abrirModalHorario = (grupo) => {
  setGrupoHorario(grupo);
  setFilasNuevas([{ id_materia: '', id_docente: '', dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_aula: '' }]);
  setErroresHorario([]);
  setMensajeHorario('');
  setModalHorarioOpen(true);
  cargarHorariosDeGrupo(grupo.id_grupo);
};

const cargarHorariosDeGrupo = (idGrupo) => {
  fetch(`${API_BASE_URL}/api/v1/grupos/${idGrupo}/horarios`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => { if (Array.isArray(data)) setHorariosActuales(data); });
};

const agregarFila = () => {
  setFilasNuevas(prev => [...prev, { id_materia: '', id_docente: '', dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_aula: '' }]);
};

const quitarFila = (idx) => {
  setFilasNuevas(prev => prev.filter((_, i) => i !== idx));
};

const actualizarFila = (idx, campo, valor) => {
  setFilasNuevas(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
};

const guardarHorarios = async () => {
  setIsSavingHorarios(true);
  setErroresHorario([]);
  setMensajeHorario('');

  const filasValidas = filasNuevas.filter(f => f.id_materia && f.id_docente && f.hora_inicio && f.hora_fin);
  if (filasValidas.length === 0) {
    setErroresHorario([{ fila: '-', error: 'Completa al menos una fila con materia, docente y horario.' }]);
    setIsSavingHorarios(false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/horarios/lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        id_grupo: grupoHorario.id_grupo,
        horarios: filasValidas.map(f => ({
          id_materia: parseInt(f.id_materia),
          id_docente: parseInt(f.id_docente),
          id_aula: f.id_aula ? parseInt(f.id_aula) : null,
          dia_semana: f.dia_semana,
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setErroresHorario(data.detail?.errores || [{ fila: '-', error: data.detail?.message || 'Error al guardar.' }]);
      return;
    }

    setMensajeHorario(data.message);
    if (data.errores?.length > 0) setErroresHorario(data.errores);

    cargarHorariosDeGrupo(grupoHorario.id_grupo);
    setFilasNuevas([{ id_materia: '', id_docente: '', dia_semana: 'Lunes', hora_inicio: '', hora_fin: '', id_aula: '' }]);
  } catch (error) {
    setErroresHorario([{ fila: '-', error: 'Error de conexión con el servidor.' }]);
  } finally {
    setIsSavingHorarios(false);
  }
};

const eliminarHorarioExistente = async (idHorario) => {
  if (!window.confirm('¿Eliminar este horario del grupo?')) return;
  await fetch(`${API_BASE_URL}/api/v1/horarios/${idHorario}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  setHorariosActuales(prev => prev.filter(h => h.id_horario !== idHorario));
};

  const handleAsignarDocente = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE_URL}/api/v1/grupos/${grupoSeleccionado.id_grupo}/asignar-docente?id_docente=${nuevoDocenteId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    setGrupos(grupos.map(g =>
      g.id_grupo === grupoSeleccionado.id_grupo ? { ...g, id_tutor: parseInt(nuevoDocenteId) } : g
    ));
    setModalOpen(false);
  };

  const abrirModalGrupo = () => {
    setFormGrupo(FORM_GRUPO_INICIAL);
    setFormGrupoError('');
    setModalGrupoOpen(true);
  };

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    const idCarreraFinal = role === 'Director' ? idCarrera : formGrupo.id_carrera;
    if (!idCarreraFinal) {
      setFormGrupoError('Debes seleccionar una carrera.');
      return;
    }
    setIsSavingGrupo(true);
    setFormGrupoError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/grupos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre_grupo: formGrupo.nombre_grupo,
          cuatrimestre: parseInt(formGrupo.cuatrimestre),
          id_carrera: parseInt(idCarreraFinal),
          id_tutor: formGrupo.id_tutor ? parseInt(formGrupo.id_tutor) : null
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al crear el grupo.');
      }

      const nuevo = await response.json();
      setGrupos(prev => [nuevo, ...prev]);
      setModalGrupoOpen(false);
    } catch (error) {
      setFormGrupoError(error.message);
    } finally {
      setIsSavingGrupo(false);
    }
  };

  const descargarPlantilla = async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/grupos/plantilla-importacion`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion_alumnos.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportarArchivo = async (idGrupo, file) => {
    if (!file) return;
    setImportandoGrupoId(idGrupo);
    setResultadoImport(null);

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/grupos/${idGrupo}/importar-alumnos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al importar el archivo.');
      setResultadoImport({ idGrupo, ...data, ok: true });
    } catch (error) {
      setResultadoImport({ idGrupo, ok: false, message: error.message });
    } finally {
      setImportandoGrupoId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      <div className="mb-6 border-b border-gray-200 pb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Grupos</h2>
          <p className="text-sm text-gray-500">Administra las cohortes y asigna tutores responsables.</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filtroCuatrimestre}
            onChange={e => setFiltroCuatrimestre(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2"
          >
            <option value="">Todos los cuatrimestres</option>
            {cuatrimestresDisponibles.map(c => (
              <option key={c} value={c}>Cuatrimestre {c}</option>
            ))}
          </select>

          <select
            value={filtroTutor}
            onChange={e => setFiltroTutor(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2"
          >
            <option value="">Todos los tutores</option>
            {tutoresDisponibles.map(t => (
              <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>
            ))}
          </select>

          <button
            onClick={descargarPlantilla}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" /> Descargar plantilla
          </button>
          <button
            onClick={abrirModalGrupo}
            className="flex items-center px-4 py-2 bg-eduPurple text-white rounded-md text-sm font-bold hover:bg-opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Grupo
          </button>
        </div>
      </div>

      {resultadoImport && (
        <div className={`mb-4 p-3 rounded-lg text-sm border flex items-start ${resultadoImport.ok ? 'bg-risk-low-bg border-risk-low-border text-risk-low-fg' : 'bg-risk-high-bg border-risk-high-border text-risk-high-fg'}`}>
          {resultadoImport.ok ? <CheckCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />}
          <div>
            <p>{resultadoImport.ok ? resultadoImport.message : resultadoImport.message}</p>
            {resultadoImport.ok && resultadoImport.no_encontrados?.length > 0 && (
              <p className="mt-1 text-xs">
                No encontradas ({resultadoImport.no_encontrados.length}): {resultadoImport.no_encontrados.join(', ')}
              </p>
            )}
            {resultadoImport.ok && resultadoImport.reasignados_desde_otro_grupo?.length > 0 && (
              <p className="mt-1 text-xs">
                Reasignadas desde otro grupo: {resultadoImport.reasignados_desde_otro_grupo.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">Grupo</th>
              <th className="p-3">Carrera</th>
              <th className="p-3">Cuatrimestre</th>
              <th className="p-3">Tutor / Docente (ID)</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {gruposFiltrados.map(grupo => (
              <tr
                key={grupo.id_grupo}
                onClick={() => abrirPanelGrupo(grupo)}
                className={`hover:bg-gray-50 cursor-pointer ${grupoPanel?.id_grupo === grupo.id_grupo ? 'bg-brand-50/60' : ''}`}
              >
                <td className="p-3 text-sm font-bold text-gray-900">{grupo.nombre_grupo}</td>
                <td className="p-3 text-sm text-gray-600">{grupo.nombre_carrera || '-'}</td>
                <td className="p-3 text-sm text-gray-600">{grupo.cuatrimestre}</td>
                <td className="p-3 text-sm text-gray-600">
                  {grupo.id_tutor ? (
                    <span className="bg-risk-low-bg text-risk-low-fg px-2 py-1 rounded-full text-xs">
                      {grupo.nombre_tutor || `ID ${grupo.id_tutor}`}
                    </span>
                  ) : (
                    <span className="bg-risk-medium-bg text-risk-medium-fg px-2 py-1 rounded-full text-xs">Sin Asignar</span>
                  )}
                </td>
                <td className="p-3 text-sm">
                   <div className="flex justify-center items-center gap-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setGrupoSeleccionado(grupo); setModalOpen(true); }}
                      className="flex items-center text-eduPurple hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-md text-xs font-semibold"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Reasignar
                    </button>

                    <label className="flex items-center text-gray-700 hover:text-eduPurple bg-gray-100 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer">
                      {importandoGrupoId === grupo.id_grupo ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      Importar alumnos
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          handleImportarArchivo(grupo.id_grupo, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={() => abrirModalHorario(grupo)}
                      className="flex items-center text-gray-700 hover:text-eduPurple bg-gray-100 px-3 py-1 rounded-md text-xs font-semibold"
                    >
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Materias / Horario
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Reasignar tutor */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Asignar Docente</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAsignarDocente}>
              <p className="text-sm text-gray-600 mb-4">Grupo seleccionado: <strong>{grupoSeleccionado?.nombre_grupo}</strong></p>
              <label className="block text-sm font-medium mb-1">ID del Docente / Tutor</label>
              <input
                type="number" required
                className="w-full border border-gray-300 rounded-md p-2 mb-4"
                value={nuevoDocenteId} onChange={e => setNuevoDocenteId(e.target.value)}
              />
              <button type="submit" className="w-full bg-eduPurple text-white py-2 rounded-md">Guardar Asignación</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Grupo */}
      {modalGrupoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Grupo</h3>
              <button onClick={() => setModalGrupoOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrearGrupo} className="p-6 space-y-4">
              {formGrupoError && (
                <div className="p-3 text-sm text-risk-high bg-risk-high-bg border border-risk-high-border rounded-lg">
                  {formGrupoError}
                </div>
              )}

              {role !== 'Director' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Carrera</label>
                  <select
                    required
                    value={formGrupo.id_carrera}
                    onChange={e => setFormGrupo({ ...formGrupo, id_carrera: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                  >
                    <option value="">Selecciona una carrera...</option>
                    {carreras.map(c => (
                      <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del Grupo</label>
                <input
                  required type="text"
                  value={formGrupo.nombre_grupo}
                  onChange={e => setFormGrupo({ ...formGrupo, nombre_grupo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. Grupo 3-A"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Cuatrimestre / Grado</label>
                <input
                  required type="number" min="1" max="12"
                  value={formGrupo.cuatrimestre}
                  onChange={e => setFormGrupo({ ...formGrupo, cuatrimestre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tutor (opcional)</label>
                <select
                  value={formGrupo.id_tutor}
                  onChange={e => setFormGrupo({ ...formGrupo, id_tutor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                >
                  <option value="">Sin asignar</option>
                  {docentesTutores.map(t => (
                    <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex space-x-3">
                <button type="button" onClick={() => setModalGrupoOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isSavingGrupo} className="flex-1 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70">
                  {isSavingGrupo ? 'Guardando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalHorarioOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                Materias y Horario — {grupoHorario?.nombre_grupo}
              </h3>
              <button onClick={() => setModalHorarioOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">

              {/* Horarios ya asignados */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Horario actual</h4>
                {horariosActuales.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Este grupo aún no tiene materias asignadas.</p>
                ) : (
                  <div className="space-y-2">
                    {horariosActuales.map(h => (
                      <div key={h.id_horario} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                        <span>
                          <strong className="text-gray-900">{h.nombre_materia}</strong> — {h.nombre_docente} · {h.dia_semana} {h.hora_inicio}-{h.hora_fin}
                        </span>
                        <button onClick={() => eliminarHorarioExistente(h.id_horario)} className="text-gray-400 hover:text-risk-high">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Errores de validación */}
              {erroresHorario.length > 0 && (
                <div className="p-3 bg-risk-high-bg border border-risk-high-border rounded-lg text-sm text-risk-high-fg space-y-1">
                  {erroresHorario.map((e, i) => (
                    <p key={i}>Fila {e.fila}: {e.error}</p>
                  ))}
                </div>
              )}
              {mensajeHorario && (
                <div className="p-3 bg-risk-low-bg border border-risk-low-border rounded-lg text-sm text-risk-low-fg">
                  {mensajeHorario}
                </div>
              )}

              {/* Filas nuevas dinámicas */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agregar materias</h4>
                  <button onClick={agregarFila} className="text-xs font-bold text-eduPurple flex items-center hover:underline">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar fila
                  </button>
                </div>

                <div className="space-y-3">
                  {filasNuevas.map((fila, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <select
                        value={fila.id_materia}
                        onChange={e => actualizarFila(idx, 'id_materia', e.target.value)}
                        className="col-span-3 border border-gray-300 rounded-md p-2 text-xs bg-white"
                      >
                        <option value="">Materia...</option>
                        {materias.map(m => <option key={m.id_materia} value={m.id_materia}>{m.nombre_materia}</option>)}
                      </select>

                      <select
                        value={fila.id_docente}
                        onChange={e => actualizarFila(idx, 'id_docente', e.target.value)}
                        className="col-span-3 border border-gray-300 rounded-md p-2 text-xs bg-white"
                      >
                        <option value="">Docente...</option>
                        {docentesCatalogo.map(d => <option key={d.id_docente} value={d.id_docente}>{d.nombre_completo}</option>)}
                      </select>

                      <select
                        value={fila.dia_semana}
                        onChange={e => actualizarFila(idx, 'dia_semana', e.target.value)}
                        className="col-span-2 border border-gray-300 rounded-md p-2 text-xs bg-white"
                      >
                        {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>

                      <input
                        type="time"
                        value={fila.hora_inicio}
                        onChange={e => actualizarFila(idx, 'hora_inicio', e.target.value)}
                        className="col-span-1 border border-gray-300 rounded-md p-2 text-xs"
                      />
                      <input
                        type="time"
                        value={fila.hora_fin}
                        onChange={e => actualizarFila(idx, 'hora_fin', e.target.value)}
                        className="col-span-1 border border-gray-300 rounded-md p-2 text-xs"
                      />

                      <button
                        onClick={() => quitarFila(idx)}
                        disabled={filasNuevas.length === 1}
                        className="col-span-2 text-gray-400 hover:text-risk-high disabled:opacity-30 flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50">
              <button onClick={() => setModalHorarioOpen(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50">
                Cerrar
              </button>
              <button onClick={guardarHorarios} disabled={isSavingHorarios} className="px-5 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70">
                {isSavingHorarios ? 'Guardando...' : 'Guardar Horario'}
              </button>
            </div>
          </div>
        </div>
      )}
      {grupoPanel && (
        <aside className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{grupoPanel.nombre_grupo}</h3>
              <p className="text-sm text-gray-500">{grupoPanel.nombre_carrera || '-'} · Cuatrimestre {grupoPanel.cuatrimestre}</p>
            </div>
            <button onClick={cerrarPanelGrupo} className="text-gray-400 hover:text-gray-600">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-6">

            {/* Info general */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Info className="w-4 h-4 mr-2 text-gray-400" />
                Tutor: {grupoPanel.nombre_tutor || 'Sin asignar'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2 text-gray-400" />
                {riesgoPorGrupo[grupoPanel.id_grupo]?.total_estudiantes ?? '—'} estudiantes
              </div>
            </div>

            {/* Distribución de riesgo */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Distribución de riesgo</h4>
              {(() => {
                const r = riesgoPorGrupo[grupoPanel.id_grupo];
                if (!r) return <p className="text-sm text-gray-400 italic">Sin datos de riesgo aún.</p>;
                const total = r.total_estudiantes || 1;
                const pBajo = (r.riesgo_bajo / total) * 100;
                const pMedio = (r.riesgo_medio / total) * 100;
                const pAlto = (r.riesgo_alto / total) * 100;
                return (
                  <>
                    <div className="w-full flex h-3 rounded-full overflow-hidden mb-2">
                      <div className="bg-risk-low" style={{ width: `${pBajo}%` }} />
                      <div className="bg-risk-medium" style={{ width: `${pMedio}%` }} />
                      <div className="bg-risk-high" style={{ width: `${pAlto}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-gray-600">
                      <span className="text-risk-low-fg">{r.riesgo_bajo} Bajo</span>
                      <span className="text-risk-medium-fg">{r.riesgo_medio} Medio</span>
                      <span className="text-risk-high-fg">{r.riesgo_alto} Alto</span>
                    </div>
                    {pAlto > 20 && (
                      <div className="mt-3 flex items-start text-xs text-risk-high-fg bg-risk-high-bg border border-risk-high-border rounded-lg p-2">
                        <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                        Más del 20% del grupo está en riesgo alto.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Materias del grupo */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Materias asignadas</h4>
              {horariosPanel.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Sin materias asignadas todavía.</p>
              ) : (
                <div className="space-y-2">
                  {horariosPanel.map(h => (
                    <div key={h.id_horario} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                      <p className="font-semibold text-gray-900">{h.nombre_materia}</p>
                      <p className="text-xs text-gray-500">{h.nombre_docente} · {h.dia_semana} {h.hora_inicio}-{h.hora_fin}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex gap-2 bg-gray-50/50">
            <button
              onClick={() => { abrirModalHorario(grupoPanel); }}
              className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50"
            >
              Materias / Horario
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}