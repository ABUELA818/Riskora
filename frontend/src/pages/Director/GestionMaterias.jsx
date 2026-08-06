import { useState, useEffect } from 'react';
import { Plus, Edit2, X, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// NOTA: materias es un catálogo institucional, no ligado a un ciclo específico;
// se muestra el periodo vigente solo como referencia visual.
function calcularPeriodoVigente(periodos) {
  const hoy = new Date().toISOString().split('T')[0];
  const vigente = periodos.find(p => p.fecha_inicio <= hoy && hoy <= p.fecha_fin);
  return vigente ? vigente.nombre_periodo : null;
}

const FORM_INICIAL = {
  nombre_materia: '',
  clave_materia: '',
  creditos: '',
  horas_semana: ''
};

export default function GestionMaterias() {
  const { token } = useAuth();

  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodoVigente, setPeriodoVigente] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:8000/api/v1/materias', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMaterias(data); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    fetch('http://localhost:8000/api/v1/periodos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPeriodoVigente(calcularPeriodoVigente(data));
      })
      .catch(err => console.error(err));
  }, [token]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setMateriaSeleccionada(null);
    setFormData(FORM_INICIAL);
    setFormError('');
    setModalOpen(true);
  };

  const abrirModalEditar = (materia) => {
    setModoEdicion(true);
    setMateriaSeleccionada(materia);
    setFormData({
      nombre_materia: materia.nombre_materia || '',
      clave_materia: materia.clave_materia || '',
      creditos: materia.creditos ?? '',
      horas_semana: materia.horas_semana ?? ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setFormError('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');

    try {
      if (modoEdicion) {
        const payload = {
          nombre_materia: formData.nombre_materia,
          clave_materia: formData.clave_materia,
          creditos: formData.creditos === '' ? null : parseInt(formData.creditos),
          horas_semana: formData.horas_semana === '' ? null : parseInt(formData.horas_semana)
        };

        const response = await fetch(`http://localhost:8000/api/v1/materias/${materiaSeleccionada.id_materia}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Error al actualizar la materia.');
        }

        const actualizada = await response.json();
        setMaterias(prev => prev.map(m => m.id_materia === actualizada.id_materia ? actualizada : m));
      } else {
        const payload = {
          nombre_materia: formData.nombre_materia,
          clave_materia: formData.clave_materia,
          creditos: formData.creditos === '' ? null : parseInt(formData.creditos),
          horas_semana: formData.horas_semana === '' ? null : parseInt(formData.horas_semana),
          estado: true
        };

        const response = await fetch('http://localhost:8000/api/v1/materias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Error al crear la materia.');
        }

        const nueva = await response.json();
        setMaterias(prev => [nueva, ...prev]);
      }

      setModalOpen(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Materias</h2>
          <p className="text-sm text-gray-500">Catálogo institucional de materias.</p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="bg-eduPurple text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-opacity-90 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Materia
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3 pl-6">ID</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Clave</th>
              <th className="p-3">Créditos</th>
              <th className="p-3">Horas por semana</th>
              <th className="p-3">Ciclo escolar</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="p-6 text-center text-gray-500">Cargando materias...</td></tr>
            ) : materias.length === 0 ? (
              <tr><td colSpan="7" className="p-6 text-center text-gray-500">No hay materias registradas.</td></tr>
            ) : (
              materias.map(materia => (
                <tr key={materia.id_materia} className="hover:bg-gray-50">
                  <td className="p-3 pl-6 text-sm text-gray-500">{materia.id_materia}</td>
                  <td className="p-3 text-sm font-bold text-gray-900">{materia.nombre_materia}</td>
                  <td className="p-3 text-sm text-gray-600">{materia.clave_materia}</td>
                  <td className="p-3 text-sm text-gray-600">{materia.creditos ?? '-'}</td>
                  <td className="p-3 text-sm text-gray-600">{materia.horas_semana ?? '-'}</td>
                  <td className="p-3 text-sm">
                    {periodoVigente ? (
                      <span className="text-gray-700">{periodoVigente}</span>
                    ) : (
                      <span className="text-gray-400 italic">Sin periodo activo</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => abrirModalEditar(materia)}
                      className="p-1.5 text-gray-400 hover:text-eduPurple rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-eduPurple" />
                {modoEdicion ? 'Editar Materia' : 'Nueva Materia'}
              </h3>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre de la Materia</label>
                <input
                  required
                  type="text"
                  value={formData.nombre_materia}
                  onChange={e => setFormData({ ...formData, nombre_materia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. Estructuras de Datos"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Clave</label>
                <input
                  required
                  type="text"
                  value={formData.clave_materia}
                  onChange={e => setFormData({ ...formData, clave_materia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. MAT-101"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Créditos</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditos}
                    onChange={e => setFormData({ ...formData, creditos: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Horas por semana</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.horas_semana}
                    onChange={e => setFormData({ ...formData, horas_semana: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={cerrarModal}
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