import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, CheckCircle, XCircle, X, User, Phone, Briefcase } from 'lucide-react';

const ESTADO_STYLES = {
  Pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Aceptada: 'bg-green-50 text-green-700 border-green-200',
  Rechazada: 'bg-red-50 text-red-700 border-red-200'
};

export default function SolicitudesPersonal() {
  const { token } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('Pendiente');

  const [procesandoId, setProcesandoId] = useState(null);
  const [rechazoModal, setRechazoModal] = useState({ open: false, solicitud: null, motivo: '' });

  const cargarSolicitudes = () => {
    if (!token) return;
    setLoading(true);
    fetch('http://localhost:8000/api/v1/solicitudes-personal', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudieron cargar las solicitudes.');
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setSolicitudes(data); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [token]);

  const handleAceptar = async (solicitud) => {
    if (!window.confirm(`¿Aceptar la solicitud de ${solicitud.nombre_completo}? Se creará su cuenta de acceso y se generará una contraseña temporal.`)) return;

    setProcesandoId(solicitud.id_solicitud);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/solicitudes-personal/${solicitud.id_solicitud}/aceptar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo aceptar la solicitud.');
      }
      setSolicitudes(prev => prev.map(s =>
        s.id_solicitud === solicitud.id_solicitud ? { ...s, estado: 'Aceptada' } : s
      ));
      alert('Solicitud aceptada. Revisa la consola del backend para ver la contraseña temporal generada.');
    } catch (error) {
      alert(error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRechazo = (solicitud) => {
    setRechazoModal({ open: true, solicitud, motivo: '' });
  };

  const handleRechazar = async (e) => {
    e.preventDefault();
    const { solicitud, motivo } = rechazoModal;
    setProcesandoId(solicitud.id_solicitud);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/solicitudes-personal/${solicitud.id_solicitud}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motivo_rechazo: motivo || null })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo rechazar la solicitud.');
      }
      setSolicitudes(prev => prev.map(s =>
        s.id_solicitud === solicitud.id_solicitud ? { ...s, estado: 'Rechazada', motivo_rechazo: motivo } : s
      ));
      setRechazoModal({ open: false, solicitud: null, motivo: '' });
    } catch (error) {
      alert(error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const filtradas = solicitudes.filter(s => filtroEstado === 'Todas' || s.estado === filtroEstado);
  const pendientesCount = solicitudes.filter(s => s.estado === 'Pendiente').length;

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Solicitudes de Personal</h2>
          <p className="text-sm text-gray-500">Altas de Docentes y Tutores solicitadas por Directores de carrera.</p>
        </div>
        {pendientesCount > 0 && (
          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> {pendientesCount} pendiente{pendientesCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex space-x-2 mb-6">
        {['Pendiente', 'Aceptada', 'Rechazada', 'Todas'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filtroEstado === estado
                ? 'bg-eduPurple text-white border-eduPurple shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {estado === 'Pendiente' ? 'Pendientes' : estado === 'Aceptada' ? 'Aceptadas' : estado === 'Rechazada' ? 'Rechazadas' : 'Todas'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 pl-6">Candidato</th>
              <th className="p-4">Rol Solicitado</th>
              <th className="p-4">Carrera</th>
              <th className="p-4">Solicitado por</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right pr-6">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">Cargando solicitudes...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay solicitudes en este estado.</td></tr>
            ) : (
              filtradas.map(s => (
                <tr key={s.id_solicitud} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="p-4 pl-6">
                    <div className="flex items-start">
                      {s.imagen_url ? (
                        <img src={s.imagen_url} alt="" className="w-9 h-9 rounded-full object-cover mr-3 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mr-3 shrink-0">
                          {s.nombre_completo.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{s.nombre_completo}</p>
                        <p className="text-xs text-gray-500">{s.correo}</p>
                        {s.telefono && (
                          <p className="text-xs text-gray-400 flex items-center mt-0.5">
                            <Phone className="w-3 h-3 mr-1" /> {s.telefono}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-700 font-medium">
                    <span className="inline-flex items-center">
                      <Briefcase className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> {s.rol_solicitado}
                    </span>
                    {s.horas_semanales && (
                      <p className="text-xs text-gray-400 mt-0.5">{s.horas_semanales} hrs/semana</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {s.nombre_carrera || <span className="text-gray-400 italic">Sin carrera</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className="inline-flex items-center">
                      <User className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> {s.nombre_solicitante || '—'}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.fecha_solicitud).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${ESTADO_STYLES[s.estado] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {s.estado}
                    </span>
                    {s.estado === 'Rechazada' && s.motivo_rechazo && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[160px]">{s.motivo_rechazo}</p>
                    )}
                  </td>
                  <td className="p-4 text-right pr-6">
                    {s.estado === 'Pendiente' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirRechazo(s)}
                          disabled={procesandoId === s.id_solicitud}
                          className="inline-flex items-center text-xs font-semibold bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rechazar
                        </button>
                        <button
                          onClick={() => handleAceptar(s)}
                          disabled={procesandoId === s.id_solicitud}
                          className="inline-flex items-center text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          {procesandoId === s.id_solicitud ? 'Procesando...' : 'Aceptar'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Ya resuelta</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rechazoModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Rechazar Solicitud</h3>
              <button
                onClick={() => setRechazoModal({ open: false, solicitud: null, motivo: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRechazar} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Solicitud de <strong className="text-gray-900">{rechazoModal.solicitud?.nombre_completo}</strong> como {rechazoModal.solicitud?.rol_solicitado}.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Motivo del rechazo (opcional)</label>
                <textarea
                  value={rechazoModal.motivo}
                  onChange={e => setRechazoModal({ ...rechazoModal, motivo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-24 resize-none focus:ring-2 focus:ring-eduPurple outline-none"
                  placeholder="Ej. Ya se cubrió la vacante, falta documentación..."
                />
              </div>
              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setRechazoModal({ open: false, solicitud: null, motivo: '' })}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoId === rechazoModal.solicitud?.id_solicitud}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 disabled:opacity-70"
                >
                  {procesandoId === rechazoModal.solicitud?.id_solicitud ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}