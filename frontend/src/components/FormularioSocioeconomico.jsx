import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function FormularioSocioeconomico({ estudianteId, token }) {
  const [formData, setFormData] = useState({
    dificultad_economica: 0,
    trabaja_actualmente: 0,
    reporte_emocional: 0,
    solicitud_baja: 0,
    acceso_tecnologico: 'Parcial'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Cargar datos actuales del estudiante
  useEffect(() => {
    if (!token || !estudianteId) return;

    fetch(`http://127.0.0.1:8000/api/v1/estudiantes/${estudianteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setFormData({
          dificultad_economica: data.dificultad_economica || 0,
          trabaja_actualmente: data.trabaja_actualmente || 0,
          reporte_emocional: data.reporte_emocional || 0,
          solicitud_baja: data.solicitud_baja || 0,
          acceso_tecnologico: data.acceso_tecnologico || 'Parcial'
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando datos socioeconómicos:', err);
        setLoading(false);
      });
  }, [estudianteId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/estudiantes/${estudianteId}/socioeconomico`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Datos actualizados correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar datos' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Cargando datos...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Datos Socioeconómicos</h3>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-risk-low-bg text-risk-low-fg' : 'bg-risk-high-bg text-risk-high-fg'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="dificultad_economica"
            checked={formData.dificultad_economica === 1}
            onChange={(e) => setFormData({...formData, dificultad_economica: e.target.checked ? 1 : 0})}
            className="w-5 h-5 text-eduPurple rounded"
          />
          <label htmlFor="dificultad_economica" className="ml-3 text-sm text-gray-700">
            ¿Tiene dificultad económica?
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="trabaja_actualmente"
            checked={formData.trabaja_actualmente === 1}
            onChange={(e) => setFormData({...formData, trabaja_actualmente: e.target.checked ? 1 : 0})}
            className="w-5 h-5 text-eduPurple rounded"
          />
          <label htmlFor="trabaja_actualmente" className="ml-3 text-sm text-gray-700">
            ¿Trabaja actualmente?
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="reporte_emocional"
            checked={formData.reporte_emocional === 1}
            onChange={(e) => setFormData({...formData, reporte_emocional: e.target.checked ? 1 : 0})}
            className="w-5 h-5 text-eduPurple rounded"
          />
          <label htmlFor="reporte_emocional" className="ml-3 text-sm text-gray-700">
            ¿Tiene reporte emocional?
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="solicitud_baja"
            checked={formData.solicitud_baja === 1}
            onChange={(e) => setFormData({...formData, solicitud_baja: e.target.checked ? 1 : 0})}
            className="w-5 h-5 text-eduPurple rounded"
          />
          <label htmlFor="solicitud_baja" className="ml-3 text-sm text-gray-700">
            ¿Ha solicitado baja?
          </label>
        </div>

        <div>
          <label htmlFor="acceso_tecnologico" className="block text-sm font-medium text-gray-700 mb-2">
            Acceso tecnológico
          </label>
          <select
            id="acceso_tecnologico"
            value={formData.acceso_tecnologico}
            onChange={(e) => setFormData({...formData, acceso_tecnologico: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eduPurple focus:border-transparent"
          >
            <option value="Completo">Completo</option>
            <option value="Parcial">Parcial</option>
            <option value="Sin acceso">Sin acceso</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-eduPurple text-white rounded-lg font-bold hover:bg-eduPurple/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar datos socioeconómicos'}
        </button>
      </form>
    </div>
  );
}
