import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserX, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api'; 

export default function BajaEstudiante() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [matricula, setMatricula] = useState('');
  const [estudiante, setEstudiante] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [exito, setExito] = useState('');

  const buscarEstudiante = async (e) => {
    e.preventDefault();
    setError('');
    setEstudiante(null);
    setExito('');
    if (!matricula.trim()) return;

    setBuscando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/estudiantes/buscar/${matricula.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No se encontró un estudiante con esa matrícula.');
      const data = await res.json();
      if (!data.estado) {
        setError('Este estudiante ya se encuentra dado de baja.');
        return;
      }
      setEstudiante(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const confirmarBaja = async () => {
    if (!motivo.trim()) {
      setError('Debes indicar el motivo de la baja.');
      return;
    }
    setConfirmando(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/estudiantes/${estudiante.id_estudiante}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motivo_baja: motivo })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo dar de baja al estudiante.');
      }
      setExito(`${estudiante.nombre_completo} ha sido dado de baja correctamente.`);
      setEstudiante(null);
      setMatricula('');
      setMotivo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <UserX className="w-6 h-6 mr-2 text-risk-high" /> Baja de Estudiante
        </h2>
        <p className="text-sm text-gray-500">Busca al estudiante por matrícula para dar de baja su registro.</p>
      </div>

      {exito && (
        <div className="mb-6 p-4 bg-risk-low-bg border border-risk-low-border rounded-lg flex items-center text-risk-low-fg">
          <CheckCircle className="w-5 h-5 mr-2 shrink-0" />
          <span className="text-sm">{exito}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-risk-high-bg border border-risk-high-border rounded-lg flex items-center text-risk-high-fg">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={buscarEstudiante} className="flex gap-3 mb-6">
        <input
          type="text"
          value={matricula}
          onChange={e => setMatricula(e.target.value)}
          placeholder="Ej. MAT-20240012"
          className="flex-1 border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-eduPurple"
        />
        <button
          type="submit"
          disabled={buscando}
          className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-bold flex items-center hover:bg-gray-900 disabled:opacity-60"
        >
          <Search className="w-4 h-4 mr-2" /> {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {estudiante && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
          <div className="flex items-center mb-4">
            <img
              src={estudiante.fotografia_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${estudiante.nombre_completo}`}
              alt="avatar"
              className="w-14 h-14 rounded-full bg-gray-200 border border-gray-300 mr-4"
            />
            <div>
              <h3 className="font-bold text-gray-900">{estudiante.nombre_completo}</h3>
              <p className="text-sm text-gray-500">{estudiante.matricula} · {estudiante.correo_institucional}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la baja *</label>
            <textarea
              required
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-eduPurple"
              placeholder="Ej. Cambio de institución, baja voluntaria, deserción por motivos personales..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setEstudiante(null); setMatricula(''); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarBaja}
              disabled={confirmando}
              className="px-4 py-2 bg-risk-high text-white rounded-md text-sm font-bold hover:bg-risk-high-fg disabled:opacity-60"
            >
              {confirmando ? 'Procesando...' : 'Confirmar Baja'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}