import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SeccionCalificaciones({ estudianteId, token }) {
  const { user } = useAuth();
  const isDocente = user?.rol === 'Docente' || user?.rol === 'Administrador';
  
  const [formData, setFormData] = useState({
    parcial: 1,
    promedio: 75
  });
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Cargar historial de calificaciones
  const cargarHistorial = () => {
    if (!token || !estudianteId) return;

    fetch(`http://127.0.0.1:8000/api/v1/estudiantes/${estudianteId}/calificaciones-historial`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistorial(data.sort((a, b) => a.parcial - b.parcial));
        } else {
          setHistorial([]); // Si no es array, vaciar
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando historial:', err);
        setHistorial([]); // En caso de error, vaciar
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarHistorial();
  }, [estudianteId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/estudiantes/${estudianteId}/calificaciones-historial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Calificación registrada' });
        cargarHistorial(); // Recargar historial
      } else {
        setMessage({ type: 'error', text: 'Error al registrar calificación' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Cargando historial...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      {isDocente && (
        <>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-eduPurple" />
            Registrar Calificación por Parcial
          </h3>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="parcial" className="block text-sm font-medium text-gray-700 mb-2">
                  Parcial
                </label>
                <select
                  id="parcial"
                  value={formData.parcial}
                  onChange={(e) => setFormData({...formData, parcial: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eduPurple focus:border-transparent"
                >
                  <option value={1}>Parcial 1</option>
                  <option value={2}>Parcial 2</option>
                  <option value={3}>Parcial 3</option>
                </select>
              </div>

              <div>
                <label htmlFor="promedio" className="block text-sm font-medium text-gray-700 mb-2">
                  Promedio (0-100)
                </label>
                <input
                  type="number"
                  id="promedio"
                  min="0"
                  max="100"
                  value={formData.promedio}
                  onChange={(e) => setFormData({...formData, promedio: parseFloat(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eduPurple focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-eduPurple text-white rounded-lg font-bold hover:bg-eduPurple/90 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {saving ? 'Registrando...' : 'Registrar calificación'}
            </button>
          </form>
        </>
      )}

      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-3">Historial de Calificaciones</h4>
        {historial.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay calificaciones registradas</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gray-400 border-b border-gray-100">
              <tr>
                <th className="pb-2">Parcial</th>
                <th className="pb-2">Promedio</th>
                <th className="pb-2">Fecha de registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historial.map((calif, index) => (
                <tr key={index}>
                  <td className="py-2.5 text-gray-700 font-medium">Parcial {calif.parcial}</td>
                  <td className="py-2.5 text-gray-900 font-bold">{calif.promedio}</td>
                  <td className="py-2.5 text-gray-500">
                    {new Date(calif.fecha_registro).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
