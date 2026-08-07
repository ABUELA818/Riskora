import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, UserPlus, X, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const FORM_INICIAL = {
  nombre_completo: '',
  correo: '',
  telefono: '',
  telefono_familiar: '',
  imagen_url: '',
  horas_semanales: '',
  rol_solicitado: 'Docente'
};

export default function DocentesCarrera() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [docentes, setDocentes] = useState([]);
  const [idCarrera, setIdCarrera] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/personal?rol=Docente', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDocentes(data); })
      .catch(err => console.error(err));

    fetch('http://localhost:8000/api/v1/director/mi-carrera', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setIdCarrera(data.id_carrera); })
      .catch(err => console.error(err));
  }, [token]);

  const abrirModal = () => {
    setFormData(FORM_INICIAL);
    setFormError('');
    setModalOpen(true);
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!idCarrera) {
      setFormError('No se pudo determinar tu carrera asignada.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch('http://localhost:8000/api/v1/solicitudes-personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          horas_semanales: formData.horas_semanales === '' ? null : parseInt(formData.horas_semanales),
          id_carrera: idCarrera
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al enviar la solicitud.');
      }

      setModalOpen(false);
      setSuccessMsg(`Solicitud enviada para ${formData.nombre_completo}. Queda pendiente de aprobación de RRHH.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtrados = docentes.filter(d => d.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 border-b border-gray-200 pb-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Personal Académico</h2>
          <p className="text-sm text-gray-500">Directorio de docentes adscritos a la institución.</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-eduPurple text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-opacity-90 shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Nuevo Docente
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center">
          <Clock className="w-4 h-4 mr-2" /> {successMsg}
        </div>
      )}

      <div className="mb-6 w-full md:w-1/3 relative">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar docente por nombre..."
          className="pl-9 w-full border border-gray-300 rounded-md p-2 text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">ID</th>
              <th className="p-3">Nombre del Docente</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtrados.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No se encontraron docentes.</td></tr>
            ) : (
              filtrados.map(docente => (
                <tr key={docente.id_usuario} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">DOC-{docente.id_usuario}</td>
                  <td className="p-3 text-sm font-medium text-gray-900">{docente.nombre_completo}</td>
                  <td className="p-3 text-sm text-gray-600">{docente.correo}</td>
                  <td className="p-3 text-sm">
                    {docente.estado ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Activo</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Inactivo</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => navigate(`/personal/${docente.id_usuario}`)}
                      title="Ver expediente laboral"
                      className="p-1.5 text-gray-400 hover:text-eduPurple rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
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
              <h3 className="text-lg font-bold text-gray-900">Solicitar Alta de Docente</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSolicitar} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800 font-medium">
                  Esta solicitud quedará pendiente de aprobación de RRHH. El usuario no se crea de inmediato.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo (con apellidos)</label>
                <input
                  required type="text"
                  value={formData.nombre_completo}
                  onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. Ana García López"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Correo Institucional</label>
                <input
                  required type="email"
                  value={formData.correo}
                  onChange={e => setFormData({ ...formData, correo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="ana.garcia@institucion.edu"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono Familiar</label>
                  <input
                    type="text"
                    value={formData.telefono_familiar}
                    onChange={e => setFormData({ ...formData, telefono_familiar: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Horas semanales</label>
                  <input
                    type="number" min="0"
                    value={formData.horas_semanales}
                    onChange={e => setFormData({ ...formData, horas_semanales: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Rol</label>
                  <select
                    value={formData.rol_solicitado}
                    onChange={e => setFormData({ ...formData, rol_solicitado: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-eduPurple outline-none bg-white"
                  >
                    <option value="Docente">Docente</option>
                    <option value="Tutor">Tutor</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-eduPurple text-white font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-70">
                  {isSaving ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}