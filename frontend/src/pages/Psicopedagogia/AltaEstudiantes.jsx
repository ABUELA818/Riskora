import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AltaEstudiantes() {
  const navigate = useNavigate();
  const { token } = useAuth(); 
  const [grupos, setGrupos] = useState([]);
  const [formData, setFormData] = useState({
    matricula: '',
    nombre_completo: '',
    id_grupo: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    datos_socioeconomicos: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargamos los grupos para el Select
   useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/grupos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setGrupos(data))
      .catch(err => console.error(err));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/estudiantes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          id_grupo: parseInt(formData.id_grupo)
        })
      });

      if (response.status === 409) {
        throw new Error('La matrícula ingresada ya se encuentra registrada en el sistema.');
      }
      if (!response.ok) {
        throw new Error('Ocurrió un error al registrar al estudiante.');
      }

      // Redirección con mensaje de éxito (RF-02)
      navigate('/estudiantes', { state: { message: 'Estudiante dado de alta exitosamente' } });
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
        <p className="text-sm text-gray-500">Alta y gestión de perfiles institucionales.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula Institucional *</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.matricula}
              onChange={e => setFormData({ ...formData, matricula: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.nombre_completo}
              onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignación de Grupo *</label>
            <select
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-eduPurple"
              value={formData.id_grupo}
              onChange={e => setFormData({ ...formData, id_grupo: e.target.value })}
            >
              <option value="">Seleccione un grupo...</option>
              {grupos.map(g => (
                <option key={g.id_grupo} value={g.id_grupo}>{g.nombre_grupo} - {g.carrera}</option>
              ))}
            </select>
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