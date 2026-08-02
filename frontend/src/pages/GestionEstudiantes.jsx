import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Edit, Trash2, Eye, Plus } from 'lucide-react';

export default function GestionEstudiantes() {
  const { state } = useLocation();
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtros, setFiltros] = useState({ carrera: '', grupo: '', nivel_riesgo: '' });

  const fetchEstudiantes = () => {
    const query = new URLSearchParams(
      Object.entries(filtros).filter(([_, v]) => v !== '')
    ).toString();

    fetch(`http://localhost:8000/api/v1/estudiantes?${query}`)
      .then(res => res.json())
      .then(data => setEstudiantes(data));
  };

  useEffect(() => {
    fetchEstudiantes();
  }, [filtros]);

  const handleSoftDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de dar de baja a este estudiante?')) return;
    
    await fetch(`http://localhost:8000/api/v1/estudiantes/${id}`, { method: 'DELETE' });
    // Actualizamos el estado local para reflejar el cambio inmediato
    setEstudiantes(estudiantes.filter(e => e.id_estudiante !== id));
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

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input 
            type="text" placeholder="Buscar por carrera..." 
            className="pl-9 w-full border border-gray-300 rounded-md p-2 text-sm"
            onChange={e => setFiltros({ ...filtros, carrera: e.target.value })}
          />
        </div>
        <input 
          type="text" placeholder="Filtrar por grupo..." 
          className="border border-gray-300 rounded-md p-2 text-sm"
          onChange={e => setFiltros({ ...filtros, grupo: e.target.value })}
        />
        <select disabled className="border border-gray-300 rounded-md p-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
          <option>Riesgo IA (Próxima iteración)</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-3">Matrícula</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">ID Grupo</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {estudiantes.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-500">No se encontraron estudiantes.</td></tr>
            ) : (
              estudiantes.map(est => (
                <tr key={est.id_estudiante} className="hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-gray-900">{est.matricula}</td>
                  <td className="p-3 text-sm text-gray-600">{est.nombre_completo}</td>
                  <td className="p-3 text-sm text-gray-600">{est.id_grupo || 'Sin asignar'}</td>
                  <td className="p-3 text-sm flex justify-center space-x-3">
                    <button className="text-gray-400 hover:text-eduPurple"><Eye className="w-4 h-4" /></button>
                    <button className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleSoftDelete(est.id_estudiante)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}