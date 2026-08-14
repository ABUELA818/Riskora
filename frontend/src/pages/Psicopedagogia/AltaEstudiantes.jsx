import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api'; 

export default function AltaEstudiantes() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [carreras, setCarreras] = useState([]);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    id_carrera: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    datos_socioeconomicos: '',
    edad: '',                     
    celular: '',                 
    fotografia_url: '',          
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/carreras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCarreras(data); })
      .catch(err => console.error(err));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_carrera) {
      setError('Debes seleccionar una carrera.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/estudiantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          id_carrera: parseInt(formData.id_carrera),
          edad: formData.edad ? parseInt(formData.edad) : null
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Ocurrió un error al registrar al estudiante.');
      }

      const nuevo = await response.json();
      navigate('/estudiantes', {
        state: { message: `Estudiante dado de alta con matrícula ${nuevo.matricula} y correo ${nuevo.correo_institucional}. Asignado automáticamente al grupo con menor cantidad de alumnos de su carrera.` }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Registro de Estudiante</h2>
        <p className="text-sm text-gray-500">
          Elige la carrera; el sistema asignará automáticamente al grupo con menos alumnos para mantener un balance parejo.
          La matrícula y el correo institucional se generan automáticamente.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-risk-high-bg border border-risk-high-border rounded-lg flex items-center text-risk-high-fg">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrera *</label>
            <select
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple bg-white"
              value={formData.id_carrera}
              onChange={e => setFormData({ ...formData, id_carrera: e.target.value })}
            >
              <option value="">Selecciona una carrera...</option>
              {carreras.map(c => (
                <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">El grupo se asigna automáticamente para mantener grupos balanceados.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text" required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.nombre_completo}
              onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
            <input
              type="number" min="14" max="99"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.edad}
              onChange={e => setFormData({ ...formData, edad: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Celular</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.celular}
              onChange={e => setFormData({ ...formData, celular: e.target.value })}
              placeholder="618 123 4567"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen de Perfil</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.fotografia_url}
              onChange={e => setFormData({ ...formData, fotografia_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md p-2"
              value={formData.fecha_ingreso}
              onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de Emergencia (Nombre)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.contacto_emergencia_nombre}
              onChange={e => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Emergencia</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.contacto_emergencia_telefono}
              onChange={e => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center bg-eduPurple text-white px-4 py-2 rounded-md hover:bg-opacity-90 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}