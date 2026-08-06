import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DocentesCarrera() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [docentes, setDocentes] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/v1/personal?rol=Docente', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDocentes(data); })
      .catch(err => console.error(err));
  }, [token]);

  const filtrados = docentes.filter(d => d.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Personal Académico</h2>
        <p className="text-sm text-gray-500">Directorio de docentes adscritos a la institución.</p>
      </div>

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
    </div>
  );
}